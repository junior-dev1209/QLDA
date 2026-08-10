import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const serviceRoleKey = legacyServiceRoleKey || secretKeys.default || Object.values(secretKeys)[0] || "";
const bucketName = "kpi-files";
const sessionLifetimeHours = 12;
const onlineWindowMs = 2 * 60 * 1000;
const stateId = "primary";
const maxUploadBytes = 10 * 1024 * 1024;

const collections = ["people", "tasks", "projectCatalog", "bulletins", "archiveRecords", "evaluations", "departmentEvaluations", "accounts", "activityLog", "monthlyAssessmentRecords", "monthlyAssessmentImports"] as const;
const scalarFields = ["moduleSettings", "systemCustomization", "systemAccessPolicy", "importedPeopleVersion", "canBoGpmbKpiCatalogVersion", "deletedIds"] as const;
type CollectionName = (typeof collections)[number];
type ScalarField = (typeof scalarFields)[number];
type JsonRecord = Record<string, unknown>;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type StateSnapshot = {
  revision: number;
  updatedAt: string;
  state: JsonRecord;
};

type MutationEntry = {
  id: string;
  value?: JsonRecord;
  baseValue?: JsonRecord | null;
};

type StatePatch = {
  collections?: Partial<Record<CollectionName, { upserts?: MutationEntry[]; deletes?: MutationEntry[] }>>;
  fields?: Array<{ key: ScalarField; value: unknown; baseValue?: unknown }>;
};

type DeniedMutation = { scope: string; id: string; reason: string; operation?: "upsert" | "delete" | "field" };

type OnlineAccount = {
  accountId: string;
  displayName: string;
  username: string;
  role: string;
  departmentId: string;
  lastSeenAt: string;
};

function corsHeaders(request: Request): HeadersInit {
  const configuredOrigins = (Deno.env.get("KPI_ALLOWED_ORIGIN") || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get("origin") || "";
  const allowedOrigin = configuredOrigins.includes("*")
    ? "*"
    : configuredOrigins.includes(requestOrigin)
      ? requestOrigin
      : configuredOrigins[0] || "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kpi-session",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Vary: "Origin",
  };
}

function originAllowed(request: Request): boolean {
  const configuredOrigins = (Deno.env.get("KPI_ALLOWED_ORIGIN") || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get("origin") || "";
  return !requestOrigin || configuredOrigins.includes("*") || configuredOrigins.includes(requestOrigin);
}

function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recordId(value: unknown): string {
  return isRecord(value) ? String(value.id || "").trim() : "";
}

function records(state: JsonRecord, collection: CollectionName): JsonRecord[] {
  return Array.isArray(state[collection]) ? (state[collection] as JsonRecord[]).filter(isRecord) : [];
}

function recordMap(state: JsonRecord, collection: CollectionName): Map<string, JsonRecord> {
  const output = new Map<string, JsonRecord>();
  records(state, collection).forEach((record) => {
    const id = recordId(record);
    if (id) output.set(id, record);
  });
  return output;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<JsonRecord>((result, key) => {
        result[key] = canonical(value[key]);
        return result;
      }, {});
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function withoutKeys(value: JsonRecord, ignored: string[]): JsonRecord {
  const output = clone(value);
  ignored.forEach((key) => delete output[key]);
  return output;
}

function defaultState(): JsonRecord {
  return {
    activePeriod: currentPeriod(),
    people: [],
    tasks: [],
    projectCatalog: [],
    bulletins: [],
    archiveRecords: [],
    evaluations: [],
    departmentEvaluations: [],
    accounts: [],
    monthlyAssessmentRecords: [],
    monthlyAssessmentImports: [],
    moduleSettings: {},
    systemCustomization: {},
    systemAccessPolicy: { mode: "open", departmentRules: {}, accountRules: {} },
    activityLog: [],
    importedPeopleVersion: "",
    canBoGpmbKpiCatalogVersion: "",
    deletedIds: [],
  };
}

function validState(state: unknown): state is JsonRecord {
  // Older cloud snapshots predate projectCatalog and monthly assessment data.
  // Treat those collections as optional so existing shared state is preserved;
  // the next client sync will create them without replacing older data.
  const optionalCollections = new Set<CollectionName>([
    "projectCatalog",
    "monthlyAssessmentRecords",
    "monthlyAssessmentImports",
  ]);
  return isRecord(state) && collections
    .filter((key) => !optionalCollections.has(key))
    .every((key) => Array.isArray(state[key]));
}

function normalizedServerState(value: unknown): JsonRecord {
  // PostgREST already returns a parsed JSON object. A shallow copy is enough here
  // and avoids duplicating the complete shared state in Edge Function memory.
  const output: JsonRecord = validState(value) ? { ...(value as JsonRecord) } : defaultState();
  collections.forEach((collection) => {
    if (!Array.isArray(output[collection])) output[collection] = [];
  });
  if (!isRecord(output.moduleSettings)) output.moduleSettings = {};
  if (!isRecord(output.systemCustomization)) output.systemCustomization = {};
  if (!isRecord(output.systemAccessPolicy)) {
    output.systemAccessPolicy = { mode: "open", departmentRules: {}, accountRules: {} };
  } else {
    output.systemAccessPolicy = {
      ...output.systemAccessPolicy,
      mode: String(output.systemAccessPolicy.mode || "open") === "managed" ? "managed" : "open",
      departmentRules: isRecord(output.systemAccessPolicy.departmentRules) ? output.systemAccessPolicy.departmentRules : {},
      accountRules: isRecord(output.systemAccessPolicy.accountRules) ? output.systemAccessPolicy.accountRules : {},
    };
  }
  return output;
}

function sanitizedAccount(account: JsonRecord): JsonRecord {
  return withoutKeys(account, ["password"]);
}

function sanitizedState(state: JsonRecord): JsonRecord {
  // Keep large collection arrays by reference and only rebuild the account list.
  // The object is serialized immediately and is never mutated by this function.
  return {
    ...state,
    accounts: records(state, "accounts").map(sanitizedAccount),
  };
}

function mergeAccountPassword(previous: JsonRecord | undefined, incoming: JsonRecord): JsonRecord {
  const output = clone(incoming);
  const requested = String(output.password || "");
  output.password = requested || String(previous?.password || "");
  return output;
}

async function snapshot(): Promise<StateSnapshot> {
  const { data, error } = await admin
    .from("kpi_shared_state")
    .select("revision, state, updated_at")
    .eq("id", stateId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { revision: 0, updatedAt: "", state: defaultState() };
  return {
    revision: Number(data.revision) || 0,
    updatedAt: String(data.updated_at || ""),
    state: normalizedServerState(data.state),
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function sessionToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function safeFileKey(value: string): string {
  return /^[A-Za-z0-9_-]{4,180}$/.test(value) ? value : "";
}

function currentPeriod(): string {
  const date = new Date();
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = values.find((item) => item.type === "year")?.value || String(date.getUTCFullYear());
  const month = values.find((item) => item.type === "month")?.value || String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}


function accountForId(state: JsonRecord, id: string): JsonRecord | undefined {
  return records(state, "accounts").find((account) => String(account.id || "") === id);
}

function personForId(state: JsonRecord, id: string): JsonRecord | undefined {
  return records(state, "people").find((person) => String(person.id || "") === id);
}

function accountRole(account: JsonRecord): string {
  return String(account.role || "");
}

function isPersonnelAccountRole(role: string): boolean {
  return ["employee", "section_head", "manager", "deputy_manager"].includes(role);
}

function isAdmin(account: JsonRecord): boolean {
  return accountRole(account) === "admin";
}

function systemAccessMode(state: JsonRecord): "open" | "managed" {
  const policy = isRecord(state.systemAccessPolicy) ? state.systemAccessPolicy : {};
  return String(policy.mode || "open") === "managed" ? "managed" : "open";
}

function openAccessEnabled(state: JsonRecord): boolean {
  return systemAccessMode(state) === "open";
}

function isDirector(account: JsonRecord): boolean {
  return accountRole(account) === "director";
}

function hasDepartmentManagement(account: JsonRecord): boolean {
  return ["manager", "deputy_manager"].includes(accountRole(account));
}

function accountDepartmentId(state: JsonRecord, account: JsonRecord): string {
  return String(account.departmentId || personForId(state, String(account.personId || ""))?.departmentId || "");
}

function accountPersonId(account: JsonRecord): string {
  return String(account.personId || "");
}

function isCurrentPeriod(value: unknown): boolean {
  return String(value || "") === currentPeriod();
}

function personIsInManagedDepartment(state: JsonRecord, account: JsonRecord, personId: unknown): boolean {
  const person = personForId(state, String(personId || ""));
  return Boolean(person && String(person.departmentId || "") === accountDepartmentId(state, account));
}

function taskParticipant(task: JsonRecord, personId: string): boolean {
  if (!personId) return false;
  const collaborators = Array.isArray(task.collaboratorIds)
    ? task.collaboratorIds.map((value) => String(value || ""))
    : String(task.collaboratorIds || "").split(",").map((value) => value.trim());
  return String(task.ownerId || "") === personId || collaborators.includes(personId) || String(task.collaboratorId || "") === personId;
}

function taskAssigner(task: JsonRecord, account: JsonRecord): boolean {
  const accountId = String(account.id || "");
  return Boolean(accountId && (String(task.assignedById || "") === accountId || String(task.createdById || "") === accountId));
}

function assignedTask(task: JsonRecord): boolean {
  const kind = String(task.kind || task.taskKind || "");
  return kind === "assigned" || kind === "Giao viec" || Boolean(task.assignedById || task.assignedAt || task.responseStatus || task.responseAt);
}

function canCreateTask(state: JsonRecord, account: JsonRecord, next: JsonRecord): boolean {
  if (isAdmin(account) || isDirector(account)) return true;
  const ownerId = String(next.ownerId || "");
  if (!ownerId) return false;
  if (assignedTask(next)) return hasDepartmentManagement(account) && personIsInManagedDepartment(state, account, ownerId);
  if (hasDepartmentManagement(account)) return personIsInManagedDepartment(state, account, ownerId);
  return ownerId === accountPersonId(account);
}

function appendOnly(previous: unknown, next: unknown): boolean {
  if (!Array.isArray(previous) || !Array.isArray(next) || next.length < previous.length) return false;
  return previous.every((item, index) => sameJson(item, next[index]));
}

function taskProgressOnlyChange(previous: JsonRecord, next: JsonRecord): boolean {
  const permitted = [
    "status",
    "progress",
    "attachments",
    "progressReports",
    "responseStatus",
    "responseNote",
    "responseAt",
    "responseById",
    "responseByName",
    "completedAt",
    "completedById",
    "completedByName",
    "updatedAt",
    "updatedBy",
    "updatedById",
  ];
  if (!appendOnly(previous.progressReports || [], next.progressReports || [])) return false;
  return sameJson(withoutKeys(previous, permitted), withoutKeys(next, permitted));
}

function taskQualityOnlyChange(previous: JsonRecord, next: JsonRecord): boolean {
  const permitted = ["qualityPercent", "qualityAssessedAt", "qualityAssessedById", "qualityAssessedByName", "updatedAt", "updatedBy", "updatedById"];
  return sameJson(withoutKeys(previous, permitted), withoutKeys(next, permitted));
}

function canAssessTaskQuality(state: JsonRecord, account: JsonRecord, task: JsonRecord): boolean {
  const status = String(task.status || "");
  if (status !== "Hoan thanh" && status !== "Ho\u00e0n th\u00e0nh") return false;
  return isAdmin(account) || isDirector(account) || (hasDepartmentManagement(account) && personIsInManagedDepartment(state, account, task.ownerId));
}

function canUpdateTask(state: JsonRecord, account: JsonRecord, previous: JsonRecord, next: JsonRecord): boolean {
  if (isAdmin(account)) return true;
  const currentPersonId = accountPersonId(account);
  if (taskParticipant(previous, currentPersonId) && taskProgressOnlyChange(previous, next)) return true;
  if (canAssessTaskQuality(state, account, previous) && taskQualityOnlyChange(previous, next)) return true;
  if (assignedTask(previous) && taskAssigner(previous, account) && (isDirector(account) || hasDepartmentManagement(account))) {
    if (isDirector(account)) return true;
    return personIsInManagedDepartment(state, account, next.ownerId);
  }
  return false;
}

function canChangeEvaluation(state: JsonRecord, account: JsonRecord, value: JsonRecord): boolean {
  if (!isCurrentPeriod(value.period)) return isAdmin(account) || isDirector(account);
  if (isAdmin(account) || isDirector(account)) return true;
  const personId = String(value.personId || "");
  return (hasDepartmentManagement(account) && personIsInManagedDepartment(state, account, personId)) || personId === accountPersonId(account);
}

function canChangeDepartmentEvaluation(state: JsonRecord, account: JsonRecord, value: JsonRecord): boolean {
  if (!isCurrentPeriod(value.period)) return isAdmin(account) || isDirector(account);
  if (isAdmin(account) || isDirector(account)) return true;
  return hasDepartmentManagement(account) && String(value.departmentId || "") === accountDepartmentId(state, account);
}

function accountChangeAllowed(actor: JsonRecord, previous: JsonRecord | undefined, next: JsonRecord): boolean {
  if (isAdmin(actor)) return true;
  if (String(actor.id || "") !== String(next.id || "") || !previous) return false;
  const auditFields = ["updatedAt", "updatedBy", "updatedById"];
  const unchangedAccountFields = sameJson(
    withoutKeys(sanitizedAccount(previous), auditFields),
    withoutKeys(sanitizedAccount(next), auditFields),
  );
  const updatedByCurrentAccount = !next.updatedById || String(next.updatedById) === String(actor.id || "");
  return unchangedAccountFields && updatedByCurrentAccount;
}

function canUpsert(state: JsonRecord, actor: JsonRecord, collection: CollectionName, previous: JsonRecord | undefined, next: JsonRecord): boolean {
  if (openAccessEnabled(state) || isAdmin(actor)) return true;
  if (collection === "people") return isDirector(actor);
  if (collection === "projectCatalog") return isDirector(actor);
  if (collection === "accounts") return accountChangeAllowed(actor, previous, next);
  if (collection === "bulletins" || collection === "archiveRecords") return false;
  if (collection === "tasks") return previous ? canUpdateTask(state, actor, previous, next) : canCreateTask(state, actor, next);
  if (collection === "evaluations") return canChangeEvaluation(state, actor, next);
  if (collection === "departmentEvaluations") return canChangeDepartmentEvaluation(state, actor, next);
  if (collection === "monthlyAssessmentRecords" || collection === "monthlyAssessmentImports") return isDirector(actor);
  if (collection === "activityLog") return !previous && String(next.actorId || "") === String(actor.id || "");
  return false;
}

function canDelete(state: JsonRecord, actor: JsonRecord, collection: CollectionName, previous: JsonRecord): boolean {
  if (openAccessEnabled(state) || isAdmin(actor)) return true;
  if (collection === "activityLog") return false;
  if (collection === "accounts") return isAdmin(actor);
  if (collection === "people" || collection === "projectCatalog" || collection === "bulletins" || collection === "archiveRecords") return isDirector(actor) && collection !== "bulletins" && collection !== "archiveRecords";
  if (collection === "tasks") return false;
  if (collection === "evaluations") return canChangeEvaluation(state, actor, previous);
  if (collection === "departmentEvaluations") return canChangeDepartmentEvaluation(state, actor, previous);
  if (collection === "monthlyAssessmentRecords" || collection === "monthlyAssessmentImports") return isDirector(actor);
  return false;
}

function canChangeField(state: JsonRecord, actor: JsonRecord, key: ScalarField): boolean {
  if (key === "systemAccessPolicy") return isAdmin(actor);
  if (!openAccessEnabled(state) && !isAdmin(actor)) return false;
  return scalarFields.includes(key);
}

function taskHasParticipantInDepartment(state: JsonRecord, task: JsonRecord, departmentId: string): boolean {
  const participantIds = [String(task.ownerId || "")];
  const collaborators = Array.isArray(task.collaboratorIds)
    ? task.collaboratorIds.map((value) => String(value || ""))
    : String(task.collaboratorIds || "").split(",").map((value) => value.trim());
  participantIds.push(...collaborators, String(task.collaboratorId || ""));
  return participantIds.some((personId) => String(personForId(state, personId)?.departmentId || "") === departmentId);
}

function visibleState(state: JsonRecord, account: JsonRecord): JsonRecord {
  if (openAccessEnabled(state) || isAdmin(account)) return sanitizedState(state);
  const output: JsonRecord = { ...state };
  if (isDirector(account)) {
    output.accounts = records(state, "accounts").filter((item) => String(item.id || "") === String(account.id || ""));
    return sanitizedState(output);
  }

  const personId = accountPersonId(account);
  const departmentId = accountDepartmentId(state, account);
  const departmentScoped = hasDepartmentManagement(account) || accountRole(account) === "section_head";
  output.accounts = records(state, "accounts").filter((item) => String(item.id || "") === String(account.id || ""));
  output.people = departmentScoped
    ? records(state, "people").filter((person) => String(person.departmentId || "") === departmentId)
    : records(state, "people").filter((person) => String(person.id || "") === personId);
  output.tasks = records(state, "tasks").filter((task) =>
    departmentScoped ? taskHasParticipantInDepartment(state, task, departmentId) : taskParticipant(task, personId) || taskAssigner(task, account),
  );
  output.evaluations = records(state, "evaluations").filter((evaluation) =>
    departmentScoped
      ? String(personForId(state, String(evaluation.personId || ""))?.departmentId || "") === departmentId
      : String(evaluation.personId || "") === personId,
  );
  output.departmentEvaluations = records(state, "departmentEvaluations").filter(
    (evaluation) => String(evaluation.departmentId || "") === departmentId,
  );
  output.monthlyAssessmentRecords = records(state, "monthlyAssessmentRecords").filter((assessment) =>
    departmentScoped
      ? String(assessment.departmentId || "") === departmentId
      : String(assessment.personId || "") === personId,
  );
  const visibleAssessmentPeriods = new Set(
    records(output, "monthlyAssessmentRecords")
      .map((assessment) => String(assessment.period || ""))
      .filter(Boolean),
  );
  output.monthlyAssessmentImports = records(state, "monthlyAssessmentImports").filter((item) =>
    visibleAssessmentPeriods.has(String(item.period || "")),
  );
  output.activityLog = departmentScoped
    ? records(state, "activityLog").filter(
        (item) =>
          String(item.actorId || item.createdById || "") === String(account.id || "") ||
          String(item.departmentId || "") === departmentId ||
          String(personForId(state, String(item.personId || ""))?.departmentId || "") === departmentId,
      )
    : [];
  return sanitizedState(output);
}

function validPatch(value: unknown): value is StatePatch {
  if (!isRecord(value)) return false;
  if (value.collections !== undefined) {
    if (!isRecord(value.collections)) return false;
    for (const [collection, change] of Object.entries(value.collections)) {
      if (!collections.includes(collection as CollectionName) || !isRecord(change)) return false;
      for (const group of [change.upserts, change.deletes]) {
        if (group !== undefined && !Array.isArray(group)) return false;
        if (Array.isArray(group) && group.some((entry) => !isRecord(entry) || !String(entry.id || "").trim())) return false;
      }
    }
  }
  if (value.fields !== undefined) {
    if (!Array.isArray(value.fields)) return false;
    if (value.fields.some((field) => !isRecord(field) || !scalarFields.includes(String(field.key || "") as ScalarField))) return false;
  }
  return true;
}

function addServerActivity(state: JsonRecord, actor: JsonRecord, changed: number): void {
  if (!changed) return;
  const activityLog = records(state, "activityLog");
  activityLog.push({
    id: `server-sync-${crypto.randomUUID()}`,
    action: "Dong bo",
    module: "He thong",
    targetType: "sync",
    targetId: "shared-state",
    title: "Cap nhat du lieu truc tuyen",
    details: `${changed} thay doi da duoc may chu ghi nhan.`,
    createdAt: new Date().toISOString(),
    createdBy: String(actor.displayName || actor.username || "Tai khoan"),
    createdById: String(actor.id || ""),
  });
  state.activityLog = activityLog.slice(-5000);
}

function applyPatch(current: JsonRecord, actor: JsonRecord, patch: StatePatch): { state: JsonRecord; denied: DeniedMutation[]; changed: number } {
  const next = clone(current);
  const denied: DeniedMutation[] = [];
  let changed = 0;

  collections.forEach((collection) => {
    const changes = patch.collections?.[collection];
    if (!changes) return;
    const values = recordMap(next, collection);
    (changes.upserts || []).forEach((operation) => {
      const id = String(operation?.id || "").trim();
      const value = operation?.value;
      const previous = values.get(id);
      if (!id || !isRecord(value) || recordId(value) !== id) {
        denied.push({ scope: collection, id: id || "unknown", reason: "Invalid record.", operation: "upsert" });
        return;
      }
      const previousComparable = previous && collection === "accounts" ? sanitizedAccount(previous) : previous;
      const incomingComparable = collection === "accounts" ? sanitizedAccount(value) : value;
      if (previous && !sameJson(operation.baseValue, previousComparable)) {
        // Một yêu cầu bị gửi lại sau khi máy chủ đã ghi đúng giá trị mong muốn
        // là thao tác idempotent, không phải xung đột thật.
        if (sameJson(incomingComparable, previousComparable)) return;
        denied.push({ scope: collection, id, reason: "Record changed by another user.", operation: "upsert" });
        return;
      }
      if (!canUpsert(next, actor, collection, previous, value)) {
        denied.push({ scope: collection, id, reason: "Permission denied.", operation: "upsert" });
        return;
      }
      const saved = collection === "accounts" ? mergeAccountPassword(previous, value) : clone(value);
      if (previous && sameJson(collection === "accounts" ? sanitizedAccount(saved) : saved, previousComparable)) return;
      values.set(id, saved);
      changed += 1;
    });
    (changes.deletes || []).forEach((operation) => {
      const id = String(operation?.id || "").trim();
      const previous = values.get(id);
      if (!id || !previous) return;
      if (!sameJson(operation.baseValue, collection === "accounts" ? sanitizedAccount(previous) : previous)) {
        denied.push({ scope: collection, id, reason: "Record changed by another user.", operation: "delete" });
        return;
      }
      if (!canDelete(next, actor, collection, previous)) {
        denied.push({ scope: collection, id, reason: "Permission denied.", operation: "delete" });
        return;
      }
      values.delete(id);
      changed += 1;
    });
    const oldOrder = records(next, collection).map(recordId).filter(Boolean);
    next[collection] = [...oldOrder.filter((id) => values.has(id)), ...Array.from(values.keys()).filter((id) => !oldOrder.includes(id))].map((id) => values.get(id)!);
  });

  (patch.fields || []).forEach((field) => {
    const key = field?.key;
    if (!key || !scalarFields.includes(key)) {
      denied.push({ scope: "field", id: String(key || "unknown"), reason: "Invalid field.", operation: "field" });
      return;
    }

    // V68: cấu hình HIỂN THỊ do Admin quyết định cuối cùng.
    // V67 lưu 16 thẻ vào systemAccessPolicy.moduleVisibility.
    // Không dùng baseValue của toàn bộ systemAccessPolicy để chặn thao tác này,
    // vì các máy khác có thể đã cập nhật một phần policy và làm baseValue cũ.
    // Chỉ merge đúng moduleVisibility, giữ nguyên departmentRules/accountRules
    // và các thuộc tính policy khác đang có trên máy chủ.
    if (
      key === "systemAccessPolicy" &&
      isAdmin(actor) &&
      isRecord(field.value) &&
      isRecord(field.value.moduleVisibility)
    ) {
      const currentPolicy = isRecord(next.systemAccessPolicy)
        ? next.systemAccessPolicy
        : { mode: "managed", departmentRules: {}, accountRules: {} };
      const incomingPolicy = field.value;
      const mergedPolicy: JsonRecord = {
        ...currentPolicy,
        moduleVisibility: clone(incomingPolicy.moduleVisibility),
        updatedAt: String(incomingPolicy.updatedAt || new Date().toISOString()),
        updatedById: String(incomingPolicy.updatedById || actor.id || ""),
        updatedByName: String(incomingPolicy.updatedByName || actor.displayName || actor.username || "Admin"),
      };

      if (sameJson(currentPolicy, mergedPolicy)) return;
      next.systemAccessPolicy = mergedPolicy;
      changed += 1;
      return;
    }

    if (!sameJson(next[key], field.baseValue)) {
      if (sameJson(next[key], field.value)) return;
      denied.push({ scope: "field", id: key, reason: "Field changed by another user.", operation: "field" });
      return;
    }
    if (!canChangeField(next, actor, key)) {
      denied.push({ scope: "field", id: key, reason: "Permission denied.", operation: "field" });
      return;
    }
    if (sameJson(next[key], field.value)) return;
    next[key] = clone(field.value);
    changed += 1;
  });

  addServerActivity(next, actor, changed);
  return { state: next, denied, changed };
}

async function activeSessionAccountId(request: Request): Promise<string | null> {
  const token = request.headers.get("x-kpi-session") || "";
  if (!token) return null;
  const tokenHash = await sha256(token);
  const { data, error } = await admin
    .from("kpi_sync_sessions")
    .select("account_id")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return String(data.account_id);
}

async function activeAccount(request: Request, current: StateSnapshot): Promise<string | null> {
  const accountId = await activeSessionAccountId(request);
  return accountId && accountForId(current.state, accountId) ? accountId : null;
}

async function requireSession(request: Request, current: StateSnapshot): Promise<string | Response> {
  const accountId = await activeAccount(request, current);
  return accountId || json(request, { error: "Authentication required." }, 401);
}

async function requireSessionWithoutState(request: Request): Promise<string | Response> {
  const accountId = await activeSessionAccountId(request);
  return accountId || json(request, { error: "Authentication required." }, 401);
}

function missingLastSeenColumn(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return code === "42703" || message.includes("last_seen_at");
}

function missingAccessLogsTable(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("access_logs");
}

function normalizedAccessType(value: unknown): string {
  const requested = String(value || "active_session").trim().toLowerCase();
  return ["active_session", "login", "logout"].includes(requested) ? requested : "active_session";
}

async function insertAccessLog(current: StateSnapshot, accountId: string, accessType: unknown): Promise<void> {
  const account = accountForId(current.state, accountId);
  if (!account) throw new Error("Authentication required.");
  const { error } = await admin.from("access_logs").insert({
    account_id: accountId,
    username: String(account.username || ""),
    display_name: String(account.displayName || account.username || ""),
    role: accountRole(account),
    department_id: accountDepartmentId(current.state, account),
    access_type: normalizedAccessType(accessType),
    accessed_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function permittedAccessLogAccountIds(state: JsonRecord, actor: JsonRecord): string[] | null {
  if (openAccessEnabled(state) || isAdmin(actor) || isDirector(actor)) return null;
  if (hasDepartmentManagement(actor) || accountRole(actor) === "section_head") {
    const departmentId = accountDepartmentId(state, actor);
    return records(state, "accounts")
      .filter((account) => !Boolean(account.disabled) && accountDepartmentId(state, account) === departmentId)
      .map((account) => String(account.id || ""))
      .filter(Boolean);
  }
  return [String(actor.id || "")].filter(Boolean);
}

async function accessLogRows(current: StateSnapshot, actorId: string, url: URL): Promise<JsonRecord[]> {
  const actor = accountForId(current.state, actorId);
  if (!actor) throw new Error("Authentication required.");

  const rawLimit = Number(url.searchParams.get("limit") || 20000);
  const limit = Math.max(1, Math.min(20000, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 20000));
  const requestedAccountId = String(url.searchParams.get("accountId") || "").trim();
  const sinceRaw = String(url.searchParams.get("since") || "").trim();
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const since = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate.toISOString() : "";
  const permittedIds = permittedAccessLogAccountIds(current.state, actor);

  if (requestedAccountId && permittedIds && !permittedIds.includes(requestedAccountId)) return [];
  if (permittedIds && !permittedIds.length) return [];

  let query = admin
    .from("access_logs")
    .select("id, account_id, username, display_name, role, department_id, access_type, accessed_at")
    .order("accessed_at", { ascending: false })
    .limit(limit);

  if (since) query = query.gte("accessed_at", since);
  if (requestedAccountId) {
    query = query.eq("account_id", requestedAccountId);
  } else if (permittedIds) {
    query = query.in("account_id", permittedIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? (data as JsonRecord[]) : [];
}

async function onlineStatusSummary(current: StateSnapshot): Promise<JsonRecord> {
  const now = new Date();
  const nowIso = now.toISOString();
  const activeSince = new Date(now.getTime() - onlineWindowMs).toISOString();
  const { data, error } = await admin
    .from("kpi_sync_sessions")
    .select("account_id, last_seen_at")
    .gt("expires_at", nowIso)
    .gte("last_seen_at", activeSince);

  if (error) {
    if (missingLastSeenColumn(error)) {
      return {
        available: false,
        migrationRequired: true,
        generatedAt: nowIso,
        onlineWindowSeconds: Math.round(onlineWindowMs / 1000),
        onlineCount: 0,
        onlineAccounts: [],
      };
    }
    throw error;
  }

  const latestByAccount = new Map<string, string>();
  (data || []).forEach((session) => {
    const accountId = String(session.account_id || "");
    const lastSeenAt = String(session.last_seen_at || "");
    if (!accountId || !lastSeenAt) return;
    const previous = latestByAccount.get(accountId) || "";
    if (lastSeenAt > previous) latestByAccount.set(accountId, lastSeenAt);
  });

  const onlineAccounts = [...latestByAccount.entries()]
    .map<OnlineAccount | null>(([accountId, lastSeenAt]) => {
      const account = accountForId(current.state, accountId);
      if (!account || Boolean(account.disabled)) return null;
      return {
        accountId,
        displayName: String(account.displayName || account.username || "Tài khoản"),
        username: String(account.username || ""),
        role: accountRole(account),
        departmentId: accountDepartmentId(current.state, account),
        lastSeenAt,
      };
    })
    .filter((account): account is OnlineAccount => account !== null)
    .sort((left, right) => String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")));

  return {
    available: true,
    migrationRequired: false,
    generatedAt: nowIso,
    onlineWindowSeconds: Math.round(onlineWindowMs / 1000),
    onlineCount: onlineAccounts.length,
    onlineAccounts,
  };
}

async function updateWithRetry(actorId: string, patch: StatePatch): Promise<{ snapshot: StateSnapshot; denied: DeniedMutation[]; changed: number }> {
  let lastDenied: DeniedMutation[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await snapshot();
    const actor = accountForId(current.state, actorId);
    if (!actor) throw new Error("Authentication required.");
    const result = applyPatch(current.state, actor, patch);
    lastDenied = result.denied;
    if (!result.changed) return { snapshot: current, denied: lastDenied, changed: 0 };
    const { data, error } = await admin.rpc("kpi_update_shared_state", {
      expected_revision: current.revision,
      next_state: result.state,
    });
    if (error) throw error;
    if (Array.isArray(data) && data.length) {
      const updated = data[0] as { next_revision: number; next_updated_at: string };
      return {
        snapshot: { revision: Number(updated.next_revision), updatedAt: String(updated.next_updated_at || ""), state: result.state },
        denied: lastDenied,
        changed: result.changed,
      };
    }
  }
  throw new Error("Concurrent update limit reached.");
}

function fileResponse(request: Request, blob: Blob, type: string): Response {
  return new Response(blob, {
    headers: {
      ...corsHeaders(request),
      "Content-Type": /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(type) ? type : "application/octet-stream",
      "Content-Length": String(blob.size),
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (!originAllowed(request)) return json(request, { error: "Origin is not allowed." }, 403);

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";

    if (action === "status") {
      const current = await snapshot();
      return json(request, { available: true, initialized: current.revision > 0, revision: current.revision, updatedAt: current.updatedAt });
    }

    if (action === "login" && request.method === "POST") {
      const body = await request.json();
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const current = await snapshot();
      const loginCandidates = records(current.state, "accounts").filter(
        (item) =>
          String(item.username || "").trim().toLowerCase() === username.toLowerCase() &&
          String(item.password || "") === password &&
          !Boolean(item.disabled),
      );
      const account =
        loginCandidates.find((item) => !Boolean(item.autoCreated) && !isPersonnelAccountRole(String(item.role || ""))) ||
        loginCandidates.find((item) => !Boolean(item.autoCreated)) ||
        loginCandidates[0];
      if (!account) return json(request, { error: "Invalid username or password." }, 401);

      const token = sessionToken();
      const tokenHash = await sha256(token);
      const expiresAt = new Date(Date.now() + sessionLifetimeHours * 60 * 60 * 1000).toISOString();
      await admin.from("kpi_sync_sessions").delete().lt("expires_at", new Date().toISOString());
      const { error } = await admin.from("kpi_sync_sessions").insert({ token_hash: tokenHash, account_id: String(account.id), expires_at: expiresAt, last_seen_at: new Date().toISOString() });
      if (error) throw error;
      return json(request, { revision: current.revision, updatedAt: current.updatedAt, state: visibleState(current.state, account), sessionToken: token, expiresAt });
    }

    if (action === "logout" && request.method === "POST") {
      const token = request.headers.get("x-kpi-session") || "";
      if (token) await admin.from("kpi_sync_sessions").delete().eq("token_hash", await sha256(token));
      return json(request, { ok: true });
    }

    if (action === "heartbeat" && request.method === "POST") {
      // Heartbeat must stay lightweight: authenticate from the session table only.
      // It no longer downloads the potentially large shared-state JSON document.
      const accountId = await requireSessionWithoutState(request);
      if (accountId instanceof Response) return accountId;
      const token = request.headers.get("x-kpi-session") || "";
      const lastSeenAt = new Date().toISOString();
      const { data, error } = await admin
        .from("kpi_sync_sessions")
        .update({ last_seen_at: lastSeenAt })
        .eq("token_hash", await sha256(token))
        .gt("expires_at", lastSeenAt)
        .select("account_id")
        .maybeSingle();
      if (error) {
        if (missingLastSeenColumn(error)) {
          return json(request, {
            ok: false,
            available: false,
            migrationRequired: true,
            error: "Online trực tiếp chưa được kích hoạt trong cơ sở dữ liệu.",
          });
        }
        throw error;
      }
      if (!data?.account_id) return json(request, { error: "Authentication required." }, 401);
      return json(request, { ok: true, available: true, accountId, lastSeenAt });
    }

    if (action === "online-status" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      return json(request, await onlineStatusSummary(current));
    }

    if (action === "access-log" && request.method === "POST") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const body = await request.json().catch(() => ({}));
      try {
        await insertAccessLog(current, accountId, isRecord(body) ? body.accessType : "active_session");
        return json(request, { ok: true });
      } catch (error) {
        if (missingAccessLogsTable(error)) {
          return json(request, {
            ok: false,
            migrationRequired: true,
            code: "ACCESS_LOGS_MIGRATION_REQUIRED",
            error: "Bảng lịch sử truy cập chưa được khởi tạo.",
          }, 503);
        }
        throw error;
      }
    }

    if (action === "access-logs" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      try {
        return json(request, { ok: true, logs: await accessLogRows(current, accountId, url) });
      } catch (error) {
        if (missingAccessLogsTable(error)) {
          return json(request, {
            ok: false,
            migrationRequired: true,
            code: "ACCESS_LOGS_MIGRATION_REQUIRED",
            error: "Bảng lịch sử truy cập chưa được khởi tạo.",
            logs: [],
          }, 503);
        }
        throw error;
      }
    }

    if (action === "state" && request.method === "GET") {
      // Validate the small session row before reading the large shared state.
      const accountId = await requireSessionWithoutState(request);
      if (accountId instanceof Response) return accountId;
      const current = await snapshot();
      const account = accountForId(current.state, accountId);
      if (!account) return json(request, { error: "Authentication required." }, 401);
      return json(request, {
        revision: current.revision,
        updatedAt: current.updatedAt,
        state: visibleState(current.state, account),
      });
    }


    if (action === "mutate" && ["PUT", "POST"].includes(request.method)) {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const body = await request.json();
      if (!validPatch(body?.patch)) return json(request, { error: "Invalid mutation payload." }, 422);
      const result = await updateWithRetry(accountId, body.patch);
      const responseAccount = accountForId(result.snapshot.state, accountId) || accountForId(current.state, accountId);
      if (!responseAccount) return json(request, { error: "Authentication required." }, 401);
      return json(request, {
        revision: result.snapshot.revision,
        updatedAt: result.snapshot.updatedAt,
        state: visibleState(result.snapshot.state, responseAccount),
        denied: result.denied,
      });
    }

    if (action === "file" && request.method === "POST") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const form = await request.formData();
      const key = safeFileKey(String(form.get("key") || ""));
      const file = form.get("file");
      if (!key || !(file instanceof File)) return json(request, { error: "Invalid file upload." }, 422);
      if (file.size > maxUploadBytes) return json(request, { error: "File exceeds the 10 MB server limit." }, 413);
      const { error } = await admin.storage.from(bucketName).upload(key, file, { contentType: file.type || "application/octet-stream", upsert: true });
      if (error) throw error;
      return json(request, { key });
    }

    if (action === "file-upload-token" && request.method === "POST") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const body = await request.json().catch(() => ({}));
      const key = safeFileKey(String(body?.key || ""));
      if (!key) return json(request, { error: "Invalid file upload key." }, 422);
      const { data, error } = await admin.storage.from(bucketName).createSignedUploadUrl(key, { upsert: true });
      if (error || !data?.token) throw error || new Error("Signed upload token was not created.");
      return json(request, { key, token: data.token });
    }

    if (action === "file" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const key = safeFileKey(url.searchParams.get("key") || "");
      if (!key) return json(request, { error: "File not found." }, 404);
      const { data, error } = await admin.storage.from(bucketName).download(key);
      if (error || !data) return json(request, { error: "File not found." }, 404);
      return fileResponse(request, data, url.searchParams.get("type") || "application/octet-stream");
    }

    return json(request, { error: "Unknown endpoint." }, 404);
  } catch (error) {
    console.error(error);
    const code = isRecord(error) ? String(error.code || "EDGE_SERVER_ERROR") : "EDGE_SERVER_ERROR";
    const details = error instanceof Error ? error.message : String(error || "Unknown server error");
    return json(request, { error: "Server error.", code, details: details.slice(0, 500) }, 500);
  }
});
