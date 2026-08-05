import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const serviceRoleKey = legacyServiceRoleKey || secretKeys.default || Object.values(secretKeys)[0] || "";
const bucketName = "kpi-files";
const sessionLifetimeHours = 24 * 30;
const offlineLoginProofLifetimeHours = 7 * 24;
const offlineLoginProofIterations = 60000;
const stateId = "primary";
const maxUploadBytes = 10 * 1024 * 1024;
const presenceWindowMs = 2 * 60 * 1000;
const maxPresenceLoginEvents = 10000;
const maxUsageHistoryLoginEvents = 20000;
const usageHistoryMonths = 12;
const loginEventRetentionDays = 400;
const deploymentVersion = "2026.07.31.2";

const collections = ["people", "tasks", "projectCatalog", "bulletins", "archiveRecords", "evaluations", "departmentEvaluations", "accounts", "activityLog"] as const;
const scalarFields = ["moduleSettings", "systemCustomization", "importedPeopleVersion", "canBoGpmbKpiCatalogVersion", "deletedIds"] as const;
const moduleAccessRoles = ["director", "manager", "deputy_manager", "section_head", "employee"] as const;
const configurableModules = ["dashboard", "bulletin", "archive", "people", "tasks", "department-evaluations", "evaluations", "history", "accounts", "rules"] as const;
const moduleDefaultRoleAccess: Record<string, string[]> = {
  dashboard: ["director"],
  bulletin: [...moduleAccessRoles],
  archive: [...moduleAccessRoles],
  people: ["director", "manager", "deputy_manager"],
  tasks: [...moduleAccessRoles],
  "department-evaluations": ["director", "manager", "deputy_manager"],
  evaluations: [...moduleAccessRoles],
  history: ["director", "manager", "deputy_manager"],
  accounts: [...moduleAccessRoles],
  rules: [...moduleAccessRoles],
};
const moduleSettingsVersion = 2;
type CollectionName = (typeof collections)[number];
type ScalarField = (typeof scalarFields)[number];
type JsonRecord = Record<string, unknown>;
type OnlineAccount = {
  accountId: string;
  displayName: string;
  username: string;
  role: string;
  departmentId: string;
  lastSeenAt: string;
};

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

type DeniedMutation = { scope: string; id: string; reason: string };

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

function defaultModuleRoleSettings(moduleId: string): JsonRecord {
  const allowed = new Set(moduleDefaultRoleAccess[moduleId] || moduleAccessRoles);
  return Object.fromEntries(moduleAccessRoles.map((role) => [role, allowed.has(role)]));
}

function normalizeModuleSettings(value: unknown): JsonRecord {
  const source = isRecord(value) ? value : {};
  const migrateLegacyDefaults = Number(source.schemaVersion || 0) < moduleSettingsVersion;
  const modules = Object.fromEntries(configurableModules.map((moduleId) => {
    const saved = isRecord(source[moduleId]) ? source[moduleId] : {};
    const savedRoles = isRecord(saved.roles) ? saved.roles : {};
    const roles = defaultModuleRoleSettings(moduleId);
    moduleAccessRoles.forEach((role) => {
      if (migrateLegacyDefaults && savedRoles[role] === false) roles[role] = false;
      if (!migrateLegacyDefaults && typeof savedRoles[role] === "boolean") roles[role] = savedRoles[role];
    });
    return [moduleId, { enabled: saved.enabled !== false, roles }];
  }));
  return { schemaVersion: moduleSettingsVersion, ...modules };
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
    accounts: [
      { id: "account-admin", username: "admin", password: "123456", displayName: "Admin tong hop", role: "admin", personId: "", departmentId: "" },
      { id: "account-director", username: "giamdoc", password: "123456", displayName: "Giam doc", role: "director", personId: "", departmentId: "" },
      { id: "account-deputy-1", username: "phogiamdoc1", password: "123456", displayName: "Pho giam doc 1", role: "director", personId: "", departmentId: "" },
      { id: "account-deputy-2", username: "phogiamdoc2", password: "123456", displayName: "Pho giam doc 2", role: "director", personId: "", departmentId: "" },
      { id: "account-deputy-3", username: "phogiamdoc3", password: "123456", displayName: "Pho giam doc 3", role: "director", personId: "", departmentId: "" },
    ],
    moduleSettings: {},
    systemCustomization: {},
    activityLog: [],
    importedPeopleVersion: "",
    canBoGpmbKpiCatalogVersion: "",
    deletedIds: [],
  };
}

function validState(state: unknown): state is JsonRecord {
  // projectCatalog was added after the first production snapshots. Keep older
  // central data readable; the collection is initialized on its first update.
  return isRecord(state) && collections.filter((key) => key !== "projectCatalog").every((key) => Array.isArray(state[key]));
}

function sanitizedAccount(account: JsonRecord): JsonRecord {
  return withoutKeys(account, ["password"]);
}

function sanitizedState(state: JsonRecord): JsonRecord {
  const output = clone(state);
  output.accounts = records(output, "accounts").map(sanitizedAccount);
  return output;
}

function mergeAccountPassword(previous: JsonRecord | undefined, incoming: JsonRecord): JsonRecord {
  const output = clone(incoming);
  const requested = String(output.password || "");
  output.password = requested || String(previous?.password || "123456");
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
  const current = {
    revision: Number(data.revision) || 0,
    updatedAt: String(data.updated_at || ""),
    state: validState(data.state) ? clone(data.state) : defaultState(),
  };
  if (!purgeRetiredAssignmentTasks(current.state)) return current;
  const { data: updated, error: updateError } = await admin.rpc("kpi_update_shared_state", {
    expected_revision: current.revision,
    next_state: current.state,
  });
  if (updateError) throw updateError;
  if (Array.isArray(updated) && updated.length) {
    const result = updated[0] as { next_revision: number; next_updated_at: string };
    return {
      revision: Number(result.next_revision),
      updatedAt: String(result.next_updated_at || ""),
      state: current.state,
    };
  }
  return snapshot();
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function base64FromBytes(bytes: Uint8Array): string {
  let output = "";
  bytes.forEach((value) => {
    output += String.fromCharCode(value);
  });
  return btoa(output);
}

async function createOfflineLoginProof(account: JsonRecord): Promise<JsonRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const password = new TextEncoder().encode(String(account.password || ""));
  const material = await crypto.subtle.importKey("raw", password, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: offlineLoginProofIterations, hash: "SHA-256" },
    material,
    256,
  );
  const now = new Date();
  return {
    accountId: String(account.id || ""),
    username: String(account.username || "").trim().toLowerCase(),
    salt: base64FromBytes(salt),
    verifier: base64FromBytes(new Uint8Array(bits)),
    iterations: offlineLoginProofIterations,
    verifiedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + offlineLoginProofLifetimeHours * 60 * 60 * 1000).toISOString(),
  };
}

async function adminOfflineLoginProofs(state: JsonRecord, account: JsonRecord, enabled: boolean): Promise<JsonRecord[]> {
  if (!enabled || !isAdmin(account)) return [];
  const accounts = records(state, "accounts").filter((item) => item.id && item.username && item.password && !Boolean(item.disabled));
  const proofs: JsonRecord[] = [];
  // Limit WebCrypto concurrency so an Admin sign-in remains responsive even
  // when the personnel list contains hundreds of accounts.
  for (let index = 0; index < accounts.length; index += 8) {
    proofs.push(...await Promise.all(accounts.slice(index, index + 8).map(createOfflineLoginProof)));
  }
  return proofs;
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

function vietnamDateParts(date = new Date()): { year: string; month: string; day: string } {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: values.find((item) => item.type === "year")?.value || String(date.getUTCFullYear()),
    month: values.find((item) => item.type === "month")?.value || String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: values.find((item) => item.type === "day")?.value || String(date.getUTCDate()).padStart(2, "0"),
  };
}

function vietnamDayStartIso(date = new Date()): string {
  const { year, month, day } = vietnamDateParts(date);
  return new Date(`${year}-${month}-${day}T00:00:00+07:00`).toISOString();
}

function vietnamMonthStartIso(date = new Date()): string {
  const { year, month } = vietnamDateParts(date);
  return new Date(`${year}-${month}-01T00:00:00+07:00`).toISOString();
}

function vietnamMonthKey(date = new Date()): string {
  const { year, month } = vietnamDateParts(date);
  return `${year}-${month}`;
}

function monthKeyOffset(period: string, offset: number): string {
  const [year, month] = String(period || "").split("-").map(Number);
  const date = new Date(Date.UTC(Number.isFinite(year) ? year : new Date().getUTCFullYear(), (Number.isFinite(month) ? month - 1 : 0) + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStartIsoForKey(period: string): string {
  const [year, month] = String(period || "").split("-").map(Number);
  const current = vietnamDateParts();
  const safeYear = Number.isFinite(year) ? year : Number(current.year);
  const safeMonth = Number.isFinite(month) ? month : Number(current.month);
  return new Date(`${safeYear}-${String(safeMonth).padStart(2, "0")}-01T00:00:00+07:00`).toISOString();
}

function vietnamWeekStartIso(date = new Date()): string {
  const { year, month, day } = vietnamDateParts(date);
  const localStart = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const daysSinceMonday = (calendarDate.getUTCDay() + 6) % 7;
  localStart.setUTCDate(localStart.getUTCDate() - daysSinceMonday);
  return localStart.toISOString();
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

function isAdmin(account: JsonRecord): boolean {
  return accountRole(account) === "admin";
}

function accountAccessGrants(account: JsonRecord | undefined): { bulletinPublish: boolean; archiveWrite: boolean } {
  const grants: JsonRecord = account && isRecord(account.accessGrants) ? account.accessGrants : {};
  return {
    bulletinPublish: grants.bulletinPublish === true,
    archiveWrite: grants.archiveWrite === true,
  };
}

function canUpdateOwnedRecord(actor: JsonRecord, previous: JsonRecord | undefined, next: JsonRecord, grant: "bulletinPublish" | "archiveWrite"): boolean {
  if (!accountAccessGrants(actor)[grant]) return false;
  const actorId = String(actor.id || "");
  if (!actorId || String(next.createdById || "") !== actorId) return false;
  return !previous || String(previous.createdById || "") === actorId;
}

function moduleIsAvailableToAccount(state: JsonRecord, account: JsonRecord, moduleId: string): boolean {
  if (isAdmin(account)) return true;
  const role = accountRole(account);
  if (!moduleAccessRoles.includes(role as (typeof moduleAccessRoles)[number])) return false;
  const settings = normalizeModuleSettings(state.moduleSettings);
  const setting = settings[moduleId];
  if (!isRecord(setting) || setting.enabled === false || !isRecord(setting.roles)) return false;
  return setting.roles[role] === true;
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

function completedTaskStatus(status: unknown): boolean {
  const value = String(status || "");
  return value === "Hoan thanh" || value === "Ho\u00e0n th\u00e0nh";
}

function inProgressTaskStatus(status: unknown): boolean {
  const value = String(status || "");
  return value === "Dang thuc hien" || value === "\u0110ang th\u1ef1c hi\u1ec7n";
}

function taskCompletionReviewChange(previous: JsonRecord, next: JsonRecord): boolean {
  const decision = String(next.completionReviewStatus || "");
  if (!completedTaskStatus(previous.status) || !["passed", "failed"].includes(decision)) return false;
  if (decision === "passed" && (!completedTaskStatus(next.status) || !String(next.qualityPercent ?? "").trim())) return false;
  if (decision === "failed" && (!inProgressTaskStatus(next.status) || String(next.qualityPercent ?? "").trim())) return false;
  const permitted = [
    "status",
    "completionReviewStatus",
    "completionReviewedAt",
    "completionReviewedById",
    "completionReviewedByName",
    "completionReviewNote",
    "lateCompletion",
    "qualityPercent",
    "qualityAssessedAt",
    "qualityAssessedById",
    "qualityAssessedByName",
    "completedAt",
    "completedById",
    "completedByName",
    "progressReports",
    "updatedAt",
    "updatedBy",
    "updatedById",
  ];
  if (!appendOnly(previous.progressReports || [], next.progressReports || [])) return false;
  return sameJson(withoutKeys(previous, permitted), withoutKeys(next, permitted));
}

function canReviewTaskCompletion(state: JsonRecord, account: JsonRecord, task: JsonRecord): boolean {
  if (isAdmin(account) || isDirector(account)) return true;
  return hasDepartmentManagement(account) && personIsInManagedDepartment(state, account, task.ownerId);
}

function canAssessTaskQuality(state: JsonRecord, account: JsonRecord, task: JsonRecord): boolean {
  const status = String(task.status || "");
  if (status !== "Hoan thanh" && status !== "Ho\u00e0n th\u00e0nh") return false;
  return isAdmin(account);
}

function canUpdateTask(state: JsonRecord, account: JsonRecord, previous: JsonRecord, next: JsonRecord): boolean {
  if (isAdmin(account)) return true;
  const currentPersonId = accountPersonId(account);
  if (taskParticipant(previous, currentPersonId) && taskProgressOnlyChange(previous, next)) return true;
  if (canReviewTaskCompletion(state, account, previous) && taskCompletionReviewChange(previous, next)) return true;
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
  if (isDirector(actor)) return sameJson(accountAccessGrants(previous), accountAccessGrants(next));
  if (String(actor.id || "") !== String(next.id || "") || !previous) return false;
  const auditFields = ["updatedAt", "updatedBy", "updatedById"];
  const unchangedAccountFields = sameJson(
    withoutKeys(sanitizedAccount(previous), auditFields),
    withoutKeys(sanitizedAccount(next), auditFields),
  );
  const updatedByCurrentAccount = !next.updatedById || String(next.updatedById) === String(actor.id || "");
  return unchangedAccountFields && updatedByCurrentAccount;
}

function retiredAssignmentTask(task: JsonRecord): boolean {
  const kind = String(task.kind || task.taskKind || "").trim().toLowerCase();
  return kind === "assigned" || (!kind && Boolean(task.assignedById || task.assignedAt || task.responseStatus || task.responseAt));
}

function purgeRetiredAssignmentTasks(state: JsonRecord): number {
  const tasks = records(state, "tasks");
  const removedTaskIds = new Set(tasks.filter(retiredAssignmentTask).map(recordId).filter(Boolean));
  const keptTasks = tasks.filter((task) => !retiredAssignmentTask(task));
  const removed = tasks.length - keptTasks.length;
  if (removed) {
    state.tasks = keptTasks;
    state.activityLog = records(state, "activityLog").filter(
      (entry) => !removedTaskIds.has(String(entry.targetId || "")),
    );
  }
  return removed;
}

function canUpsert(state: JsonRecord, actor: JsonRecord, collection: CollectionName, previous: JsonRecord | undefined, next: JsonRecord): boolean {
  if (isAdmin(actor)) return true;
  if (collection === "people") return moduleIsAvailableToAccount(state, actor, "people") && isDirector(actor);
  if (collection === "accounts") return moduleIsAvailableToAccount(state, actor, "accounts") && accountChangeAllowed(actor, previous, next);
  if (collection === "bulletins") {
    return moduleIsAvailableToAccount(state, actor, "bulletin") && canUpdateOwnedRecord(actor, previous, next, "bulletinPublish");
  }
  if (collection === "archiveRecords") {
    return moduleIsAvailableToAccount(state, actor, "archive") && canUpdateOwnedRecord(actor, previous, next, "archiveWrite");
  }
  if (collection === "projectCatalog") return moduleIsAvailableToAccount(state, actor, "tasks") && (hasDepartmentManagement(actor) || accountRole(actor) === "section_head");
  if (collection === "tasks") return moduleIsAvailableToAccount(state, actor, "tasks") && (previous ? canUpdateTask(state, actor, previous, next) : canCreateTask(state, actor, next));
  if (collection === "evaluations") return moduleIsAvailableToAccount(state, actor, "evaluations") && canChangeEvaluation(state, actor, next);
  if (collection === "departmentEvaluations") return moduleIsAvailableToAccount(state, actor, "department-evaluations") && canChangeDepartmentEvaluation(state, actor, next);
  if (collection === "activityLog") return !previous && String(next.actorId || "") === String(actor.id || "");
  return false;
}

function canDelete(state: JsonRecord, actor: JsonRecord, collection: CollectionName, previous: JsonRecord): boolean {
  if (isAdmin(actor)) return true;
  if (collection === "activityLog") return false;
  if (collection === "projectCatalog") return moduleIsAvailableToAccount(state, actor, "tasks") && (hasDepartmentManagement(actor) || accountRole(actor) === "section_head");
  if (collection === "people") return moduleIsAvailableToAccount(state, actor, "people") && isDirector(actor);
  if (collection === "accounts") return moduleIsAvailableToAccount(state, actor, "accounts") && isDirector(actor);
  if (collection === "bulletins" || collection === "archiveRecords") return false;
  if (collection === "tasks") return false;
  if (collection === "evaluations") return moduleIsAvailableToAccount(state, actor, "evaluations") && canChangeEvaluation(state, actor, previous);
  if (collection === "departmentEvaluations") return moduleIsAvailableToAccount(state, actor, "department-evaluations") && canChangeDepartmentEvaluation(state, actor, previous);
  return false;
}

function canChangeField(actor: JsonRecord, key: ScalarField): boolean {
  if (!isAdmin(actor)) return false;
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
  const output = clone(state);
  if (isAdmin(account) || isDirector(account)) return sanitizedState(output);

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
  output.activityLog = departmentScoped
    ? records(state, "activityLog").filter(
        (item) =>
          String(item.actorId || item.createdById || "") === String(account.id || "") ||
          String(item.departmentId || "") === departmentId ||
          String(personForId(state, String(item.personId || ""))?.departmentId || "") === departmentId,
      )
    : records(state, "activityLog").filter(
        (item) =>
          String(item.actorId || item.createdById || "") === String(account.id || "") ||
          String(item.personId || "") === personId,
      );
  return sanitizedState(output);
}

function recordReferencesFile(record: JsonRecord, field: string, key: string): boolean {
  const files = record[field];
  return Array.isArray(files) && files.some((file) => isRecord(file) && String(file.remoteKey || "") === key);
}

function canReadFile(state: JsonRecord, account: JsonRecord, key: string): boolean {
  const visible = visibleState(state, account);
  return (
    records(visible, "tasks").some((task) => recordReferencesFile(task, "attachments", key)) ||
    records(visible, "bulletins").some((post) => recordReferencesFile(post, "media", key)) ||
    records(visible, "archiveRecords").some((record) => recordReferencesFile(record, "files", key))
  );
}

function canUploadFile(state: JsonRecord, account: JsonRecord, key: string): boolean {
  if (key.startsWith("bulletin-media-")) {
    return moduleIsAvailableToAccount(state, account, "bulletin") && (isAdmin(account) || accountAccessGrants(account).bulletinPublish);
  }
  if (key.startsWith("archive-file-")) {
    return moduleIsAvailableToAccount(state, account, "archive") && (isAdmin(account) || accountAccessGrants(account).archiveWrite);
  }
  if (key.startsWith("task-file-")) {
    return moduleIsAvailableToAccount(state, account, "tasks") && Boolean(isAdmin(account) || isDirector(account) || accountPersonId(account));
  }
  return false;
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
  next.moduleSettings = normalizeModuleSettings(next.moduleSettings);
  const denied: DeniedMutation[] = [];
  let changed = purgeRetiredAssignmentTasks(next);

  collections.forEach((collection) => {
    const changes = patch.collections?.[collection];
    if (!changes) return;
    const values = recordMap(next, collection);
    (changes.upserts || []).forEach((operation) => {
      const id = String(operation?.id || "").trim();
      const value = operation?.value;
      const previous = values.get(id);
      if (!id || !isRecord(value) || recordId(value) !== id) {
        denied.push({ scope: collection, id: id || "unknown", reason: "Invalid record." });
        return;
      }
      if (previous && !sameJson(operation.baseValue, collection === "accounts" ? sanitizedAccount(previous) : previous)) {
        denied.push({ scope: collection, id, reason: "Record changed by another user." });
        return;
      }
      if (!canUpsert(next, actor, collection, previous, value)) {
        denied.push({ scope: collection, id, reason: "Permission denied." });
        return;
      }
      const saved = collection === "accounts" ? mergeAccountPassword(previous, value) : clone(value);
      values.set(id, saved);
      changed += 1;
    });
    (changes.deletes || []).forEach((operation) => {
      const id = String(operation?.id || "").trim();
      const previous = values.get(id);
      if (!id || !previous) return;
      if (!sameJson(operation.baseValue, collection === "accounts" ? sanitizedAccount(previous) : previous)) {
        denied.push({ scope: collection, id, reason: "Record changed by another user." });
        return;
      }
      if (!canDelete(next, actor, collection, previous)) {
        denied.push({ scope: collection, id, reason: "Permission denied." });
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
      denied.push({ scope: "field", id: String(key || "unknown"), reason: "Invalid field." });
      return;
    }
    if (!sameJson(next[key], field.baseValue)) {
      denied.push({ scope: "field", id: key, reason: "Field changed by another user." });
      return;
    }
    if (!canChangeField(actor, key)) {
      denied.push({ scope: "field", id: key, reason: "Permission denied." });
      return;
    }
    next[key] = key === "moduleSettings" ? normalizeModuleSettings(field.value) : clone(field.value);
    changed += 1;
  });

  addServerActivity(next, actor, changed);
  return { state: next, denied, changed };
}

async function activeAccount(request: Request, current: StateSnapshot): Promise<string | null> {
  const token = request.headers.get("x-kpi-session") || "";
  if (!token) return null;
  const tokenHash = await sha256(token);
  const { data, error } = await admin
    .from("kpi_sync_sessions")
    .select("account_id, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data || !accountForId(current.state, data.account_id)) return null;
  await admin.from("kpi_sync_sessions").update({ last_seen_at: new Date().toISOString() }).eq("token_hash", tokenHash);
  return data.account_id;
}

async function accountPresenceSummary(current: StateSnapshot): Promise<Record<string, unknown>> {
  const now = new Date();
  const nowIso = now.toISOString();
  const activeSince = new Date(now.getTime() - presenceWindowMs).toISOString();
  const [sessionsResult, loginEventsResult] = await Promise.all([
    admin
      .from("kpi_sync_sessions")
      .select("account_id, last_seen_at")
      .gt("expires_at", nowIso)
      .gte("last_seen_at", activeSince),
    admin
      .from("kpi_account_login_events")
      .select("account_id, logged_in_at")
      .gte("logged_in_at", vietnamMonthStartIso(now))
      .order("logged_in_at", { ascending: false })
      .limit(maxPresenceLoginEvents),
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (loginEventsResult.error) throw loginEventsResult.error;

  const latestSessionByAccount = new Map<string, string>();
  (sessionsResult.data || []).forEach((session) => {
    const accountId = String(session.account_id || "");
    const lastSeenAt = String(session.last_seen_at || "");
    if (!accountId || !lastSeenAt || (latestSessionByAccount.get(accountId) || "") >= lastSeenAt) return;
    latestSessionByAccount.set(accountId, lastSeenAt);
  });

  const accounts = records(current.state, "accounts");
  const onlineAccounts = [...latestSessionByAccount.entries()]
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
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));

  const dayStart = vietnamDayStartIso(now);
  const monthAccounts = new Set<string>();
  const dayAccounts = new Set<string>();
  (loginEventsResult.data || []).forEach((event) => {
    const accountId = String(event.account_id || "");
    const loggedInAt = String(event.logged_in_at || "");
    if (!accountId || !accounts.some((account) => String(account.id || "") === accountId)) return;
    monthAccounts.add(accountId);
    if (loggedInAt >= dayStart) dayAccounts.add(accountId);
  });

  return {
    generatedAt: nowIso,
    onlineWindowSeconds: Math.round(presenceWindowMs / 1000),
    onlineAccounts,
    onlineCount: onlineAccounts.length,
    todayUniqueAccounts: dayAccounts.size,
    monthUniqueAccounts: monthAccounts.size,
  };
}

async function accountUsageHistorySummary(current: StateSnapshot): Promise<Record<string, unknown>> {
  const now = new Date();
  const currentMonth = vietnamMonthKey(now);
  const historyStartMonth = monthKeyOffset(currentMonth, -(usageHistoryMonths - 1));
  const historyStart = monthStartIsoForKey(historyStartMonth);
  const loginEventsResult = await admin
    .from("kpi_account_login_events")
    .select("account_id, logged_in_at")
    .gte("logged_in_at", historyStart)
    .order("logged_in_at", { ascending: false })
    .limit(maxUsageHistoryLoginEvents);
  if (loginEventsResult.error) throw loginEventsResult.error;

  const activeAccounts = records(current.state, "accounts").filter((account) => recordId(account) && !Boolean(account.disabled));
  const accountsById = new Map(activeAccounts.map((account) => [recordId(account), account]));
  const loginEvents = (loginEventsResult.data || [])
    .map((event) => ({
      accountId: String(event.account_id || ""),
      loggedInAt: String(event.logged_in_at || ""),
    }))
    .filter((event) => Boolean(event.accountId && event.loggedInAt && accountsById.has(event.accountId)));
  const latestLoginByAccount = new Map<string, string>();
  loginEvents.forEach((event) => {
    if ((latestLoginByAccount.get(event.accountId) || "") < event.loggedInAt) latestLoginByAccount.set(event.accountId, event.loggedInAt);
  });

  const totalByDepartment = new Map<string, number>();
  activeAccounts.forEach((account) => {
    const departmentId = accountDepartmentId(current.state, account) || "unassigned";
    totalByDepartment.set(departmentId, (totalByDepartment.get(departmentId) || 0) + 1);
  });

  const groupInactiveAccounts = (loggedInSince: Set<string>) => {
    const groups = new Map<string, JsonRecord[]>();
    activeAccounts.forEach((account) => {
      const accountId = recordId(account);
      if (loggedInSince.has(accountId)) return;
      const departmentId = accountDepartmentId(current.state, account) || "unassigned";
      const accounts = groups.get(departmentId) || [];
      accounts.push({
        accountId,
        displayName: String(account.displayName || account.username || "Tài khoản"),
        username: String(account.username || ""),
        role: accountRole(account),
        lastLoginAt: latestLoginByAccount.get(accountId) || "",
      });
      groups.set(departmentId, accounts);
    });
    return [...groups.entries()]
      .map(([departmentId, accounts]) => ({
        departmentId,
        inactiveCount: accounts.length,
        totalAccounts: totalByDepartment.get(departmentId) || accounts.length,
        accounts: accounts.sort((left, right) => String(left.displayName || "").localeCompare(String(right.displayName || ""))),
      }))
      .sort((left, right) => left.departmentId.localeCompare(right.departmentId));
  };

  const weekStart = vietnamWeekStartIso(now);
  const monthStart = vietnamMonthStartIso(now);
  const weekLoggedInAccounts = new Set(loginEvents.filter((event) => event.loggedInAt >= weekStart).map((event) => event.accountId));
  const monthLoggedInAccounts = new Set(loginEvents.filter((event) => event.loggedInAt >= monthStart).map((event) => event.accountId));
  const departmentIds = [...totalByDepartment.keys()].sort((left, right) => left.localeCompare(right));
  const monthlyHistory = Array.from({ length: usageHistoryMonths }, (_, index) => monthKeyOffset(currentMonth, -index)).map((period) => {
    const periodStart = monthStartIsoForKey(period);
    const periodEnd = monthStartIsoForKey(monthKeyOffset(period, 1));
    const periodEvents = loginEvents.filter((event) => event.loggedInAt >= periodStart && event.loggedInAt < periodEnd);
    const uniqueAccounts = new Set(periodEvents.map((event) => event.accountId));
    const departments = departmentIds.map((departmentId) => {
      const departmentEvents = periodEvents.filter((event) => {
        const account = accountsById.get(event.accountId);
        return account && (accountDepartmentId(current.state, account) || "unassigned") === departmentId;
      });
      const departmentAccounts = new Set(departmentEvents.map((event) => event.accountId));
      const totalAccounts = totalByDepartment.get(departmentId) || 0;
      return {
        departmentId,
        totalAccounts,
        uniqueAccounts: departmentAccounts.size,
        inactiveAccounts: Math.max(0, totalAccounts - departmentAccounts.size),
        loginCount: departmentEvents.length,
      };
    });
    return {
      period,
      totalAccounts: activeAccounts.length,
      uniqueAccounts: uniqueAccounts.size,
      inactiveAccounts: Math.max(0, activeAccounts.length - uniqueAccounts.size),
      loginCount: periodEvents.length,
      departments,
    };
  });

  return {
    generatedAt: now.toISOString(),
    historyStart,
    historyTruncated: (loginEventsResult.data || []).length >= maxUsageHistoryLoginEvents,
    inactiveWeek: {
      periodStart: weekStart,
      inactiveCount: activeAccounts.length - weekLoggedInAccounts.size,
      totalAccounts: activeAccounts.length,
      groups: groupInactiveAccounts(weekLoggedInAccounts),
    },
    inactiveMonth: {
      periodStart: monthStart,
      inactiveCount: activeAccounts.length - monthLoggedInAccounts.size,
      totalAccounts: activeAccounts.length,
      groups: groupInactiveAccounts(monthLoggedInAccounts),
    },
    monthlyHistory,
  };
}

async function requireSession(request: Request, current: StateSnapshot): Promise<string | Response> {
  const accountId = await activeAccount(request, current);
  return accountId || json(request, { error: "Authentication required." }, 401);
}

async function updateWithRetry(actorId: string, patch: StatePatch): Promise<{ snapshot: StateSnapshot; denied: DeniedMutation[]; changed: number }> {
  let lastDenied: DeniedMutation[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
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
    if (attempt < 7) {
      const delay = Math.min(900, 60 * 2 ** attempt) + Math.round(Math.random() * 120);
      await new Promise((resolve) => setTimeout(resolve, delay));
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
      const configuredOrigins = (Deno.env.get("KPI_ALLOWED_ORIGIN") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      return json(request, {
        available: true,
        initialized: current.revision > 0,
        revision: current.revision,
        updatedAt: current.updatedAt,
        deploymentVersion,
        originRestricted: configuredOrigins.length > 0 && !configuredOrigins.includes("*"),
      });
    }

    if (action === "login" && request.method === "POST") {
      const body = await request.json();
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const includeOfflineCredentials = Boolean(body?.includeOfflineCredentials);
      const current = await snapshot();
      const account = records(current.state, "accounts").find((item) => String(item.username || "") === username && String(item.password || "") === password);
      if (!account || Boolean(account.disabled)) return json(request, { error: "Invalid username or password." }, 401);

      const token = sessionToken();
      const tokenHash = await sha256(token);
      const expiresAt = new Date(Date.now() + sessionLifetimeHours * 60 * 60 * 1000).toISOString();
      await admin.from("kpi_sync_sessions").delete().lt("expires_at", new Date().toISOString());
      await admin
        .from("kpi_account_login_events")
        .delete()
        .lt("logged_in_at", new Date(Date.now() - loginEventRetentionDays * 24 * 60 * 60 * 1000).toISOString());
      const { error } = await admin.from("kpi_sync_sessions").insert({ token_hash: tokenHash, account_id: String(account.id), expires_at: expiresAt });
      if (error) throw error;
      const { error: loginEventError } = await admin
        .from("kpi_account_login_events")
        .insert({ account_id: String(account.id), session_token_hash: tokenHash });
      if (loginEventError) {
        await admin.from("kpi_sync_sessions").delete().eq("token_hash", tokenHash);
        throw loginEventError;
      }
      const offlineCredentials = await adminOfflineLoginProofs(current.state, account, includeOfflineCredentials);
      return json(request, { revision: current.revision, updatedAt: current.updatedAt, state: visibleState(current.state, account), sessionToken: token, expiresAt, offlineCredentials });
    }

    if (action === "logout" && request.method === "POST") {
      const token = request.headers.get("x-kpi-session") || "";
      if (token) await admin.from("kpi_sync_sessions").delete().eq("token_hash", await sha256(token));
      return json(request, { ok: true });
    }

    if (action === "state" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const requestedRevision = url.searchParams.get("revision");
      if (requestedRevision !== null && Number(requestedRevision) === current.revision) {
        return json(request, { revision: current.revision, updatedAt: current.updatedAt, unchanged: true });
      }
      return json(request, { revision: current.revision, updatedAt: current.updatedAt, state: visibleState(current.state, accountForId(current.state, accountId)!) });
    }

    if (action === "presence" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const account = accountForId(current.state, accountId);
      if (!account) return json(request, { error: "Authentication required." }, 401);
      if (!isAdmin(account)) return json(request, { ok: true });
      return json(request, await accountPresenceSummary(current));
    }

    if (action === "usage-history" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const account = accountForId(current.state, accountId);
      if (!account) return json(request, { error: "Authentication required." }, 401);
      if (!isAdmin(account)) return json(request, { error: "Forbidden." }, 403);
      return json(request, await accountUsageHistorySummary(current));
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
      const account = accountForId(current.state, accountId);
      if (!account || !canUploadFile(current.state, account, key)) return json(request, { error: "File upload is not permitted." }, 403);
      const { error } = await admin.storage.from(bucketName).upload(key, file, { contentType: file.type || "application/octet-stream", upsert: true });
      if (error) throw error;
      return json(request, { key });
    }

    if (action === "file" && request.method === "GET") {
      const current = await snapshot();
      const accountId = await requireSession(request, current);
      if (accountId instanceof Response) return accountId;
      const key = safeFileKey(url.searchParams.get("key") || "");
      if (!key) return json(request, { error: "File not found." }, 404);
      const account = accountForId(current.state, accountId);
      if (!account || !canReadFile(current.state, account, key)) return json(request, { error: "File not found." }, 404);
      const { data, error } = await admin.storage.from(bucketName).download(key);
      if (error || !data) return json(request, { error: "File not found." }, 404);
      return fileResponse(request, data, url.searchParams.get("type") || "application/octet-stream");
    }

    return json(request, { error: "Unknown endpoint." }, 404);
  } catch (error) {
    console.error(error);
    return json(request, { error: "Server error." }, 500);
  }
});
