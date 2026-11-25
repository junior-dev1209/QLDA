import { taskDependencyEnvelopes, taskColdFields, guardTaskColdMetadata, unwrapTaskColdMetadata, TaskMetadataRequired, type TaskFieldReads } from "./task-command-dependencies.ts";

type ProbeResult = { data: unknown; error: { code?: string; message?: string } | null };

// Cache only deployment capability, never permissions or business data.
export function createTaskStorageProbe(query: () => PromiseLike<ProbeResult>) {
  let expiresAt = 0;
  let available = false;
  return async (): Promise<boolean> => {
    if (Date.now() < expiresAt) return available;
    const { data, error } = await query();
    if (error && !["42P01", "PGRST205"].includes(String(error.code))) {
      throw new Error(`Task storage capability check failed: ${error.message || error.code}`);
    }
    const record = data as Record<string, unknown> | null;
    available = !error && [1, 2].includes(Number(record?.schema_version))
      && ["snapshot", "record-primary"].includes(String(record?.source_mode));
    expiresAt = Date.now() + 30_000;
    return available;
  };
}

type TaskStoreResult = { data: unknown; error: { code?: string; message?: string } | null };
type TaskStoreCallbacks = {
  rpc: (name: string, params?: Record<string, unknown>) => PromiseLike<TaskStoreResult>;
  legacyRead: () => PromiseLike<TaskStoreResult>;
  modeRead: () => PromiseLike<TaskStoreResult>;
};

export function taskCommandRetryDelay(attempt: number, random = Math.random): number {
  const ceiling = Math.min(900, 60 * 2 ** Math.max(0, Math.min(7, attempt)));
  return 60 + Math.floor(random() * ceiling);
}

// Preserve missing versus JSON null while removing repeated descriptor labels.
export function compactTaskFieldReads(reads: TaskFieldReads) {
  return Object.fromEntries(Object.entries(reads).map(([id, fields]) => [id,
    Object.fromEntries(Object.entries(fields).map(([key, field]) => {
      if (!field || typeof field.present !== "boolean" || (field.present
        && (!Object.hasOwn(field, "value") || field.value === undefined))) {
        throw new TaskMetadataRequired("Complete Task field evidence is required.");
      }
      return [key, field.present ? [true, field.value] : [false]];
    })),
  ]));
}

// Dictionary transport only. SQL reconstructs the original evidence and row
// versions before running the same membership, field, session and receipt guards.
export function dictionaryTaskEvidence(reads: TaskFieldReads, versions: Record<string, number>, order: string[], target: string) {
  const ids=new Set(order),compact=compactTaskFieldReads(reads);
  if (ids.size!==order.length || !ids.has(target) || Object.keys(reads).length!==order.length-1
    || Object.hasOwn(reads,target) || Object.keys(versions).length!==order.length) {
    throw new TaskMetadataRequired("Complete Task dictionary evidence is required.");
  }
  const templates: { fields: Record<string, unknown>; identity: boolean }[]=[];
  const indexes=new Map<string,number>(),counts=new Map<number,number>();
  const rows=order.map(id=>{
    const version=versions[id];
    if (!Object.hasOwn(versions,id) || !Number.isSafeInteger(version) || version<1) {
      throw new TaskMetadataRequired("Complete Task dictionary versions are required.");
    }
    counts.set(version,(counts.get(version)||0)+1);
    if (id===target) return -1;
    if (!Object.hasOwn(compact,id)) throw new TaskMetadataRequired("Missing Task dictionary row.");
    const fields: Record<string, unknown>=Object.fromEntries(Object.entries(compact[id]).sort(([a],[b])=>a<b?-1:a>b?1:0));
    const identity=Array.isArray(fields.id) && fields.id[0]===true && fields.id[1]===id;
    if (identity) delete fields.id;
    const template={fields,identity},key=JSON.stringify(template);
    let index=indexes.get(key);
    if (index===undefined) { index=templates.length;templates.push(template);indexes.set(key,index); }
    return index;
  });
  let common=versions[order[0]];
  for (const [version,count] of counts) if (count>(counts.get(common)||0)) common=version;
  const overrides=Object.fromEntries(order.filter(id=>versions[id]!==common).map(id=>[id,versions[id]]));
  return {fieldReads:{templates,rows},versions:{default:common,overrides}};
}

export function taskRootArrayWire(before: Record<string, unknown>, after: Record<string, unknown>, hashes?: Record<string, string>) {
  const state = { ...after }, patches: Record<string, unknown> = {};
  for (const key of ["notifications", "activityLog"]) {
    const old = before[key], next = after[key], hash = hashes?.[key];
    if (!Array.isArray(old) || !Array.isArray(next) || old.length > 10_000 || next.length > 10_000 || !/^[a-f0-9]{64}$/.test(hash || "")) continue;
    if (new TextEncoder().encode(JSON.stringify(next)).length > 1_900_000) continue;
    const indexes = new Map<string, number>();
    old.forEach((value, index) => { const text = JSON.stringify(value) ?? "null"; if (!indexes.has(text)) indexes.set(text, index); });
    const parts: (number[] | { value: unknown })[] = [];
    for (const value of next) {
      const text = JSON.stringify(value) ?? "null", index = indexes.get(text), last = parts.at(-1);
      if (index === undefined) parts.push({ value: JSON.parse(text) });
      else if (Array.isArray(last) && last[0] + last[1] === index) last[1]++;
      else parts.push([index, 1]);
    }
    patches[key] = { base_hash: hash, parts }; delete state[key];
  }
  const packed = { state, patches };
  if (!Object.keys(patches).length || new TextEncoder().encode(JSON.stringify(packed)).length > 1_500_000
    || JSON.stringify(packed).length >= JSON.stringify(after).length * 0.8) return null;
  return packed;
}

// SQL already serializes these commits. Avoid sending competing large proofs
// from the same worker; this queue grants no authority and retains no result.
export function createTaskCommitLane(maxPending = 16, maxWaitMs = 20_000, concurrency = 1) {
  if (!Number.isSafeInteger(maxPending) || maxPending < 1 || maxPending > 32
    || !Number.isSafeInteger(maxWaitMs) || maxWaitMs < 1 || maxWaitMs > 20_000
    || !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Invalid Task commit lane limits.");
  let active = 0, exclusiveActive = false;
  const waiting: Array<{ exclusive: boolean; start: () => void }> = [];
  const drain = () => {
    while (!exclusiveActive && active < concurrency && waiting.length) {
      if (waiting[0].exclusive && active) return;
      waiting.shift()!.start();
    }
  };
  const lease = (exclusive: boolean) => {
    active++;
    if (exclusive) exclusiveActive = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      if (exclusive) exclusiveActive = false;
      drain();
    };
  };
  return async (exclusive = false): Promise<(() => void) | null> => {
    if (!waiting.length && !exclusiveActive && active < concurrency && (!exclusive || active === 0)) return lease(exclusive);
    if (waiting.length >= maxPending) return null;
    return await new Promise<(() => void) | null>((resolve) => {
      const entry = { exclusive, start: () => { clearTimeout(timer); resolve(lease(exclusive)); } };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(entry);
        if (index >= 0) waiting.splice(index, 1);
        resolve(null); drain();
      }, maxWaitMs);
      waiting.push(entry);
    });
  };
}

type TaskRetryBaseline = { revision: number; sourceMode?: string; state: Record<string, unknown>; taskVersions?: Record<string, number>; checkpointEpoch?: number; metadataEpoch?: number };
type TaskInitialReuseOptions = { now: () => number; ttlMs: number; maxCharacters: number; maxTasks: number; checkpoint?: boolean; metadata?: boolean; cold?: boolean; wire?: boolean };
type TaskInitialMetadata = { revision: number; sourceMode: string; versions: Record<string, number>; rows: string[]; startedAt: number; expiresAt: number; checkpointEpoch?: number; metadataEpoch?: number; append?: boolean };

// Reuse is advisory: every hit still reads SQL mode/order/versions and all current
// non-Task state. No cached account, permission, target body or write decision.
export function createTaskRecordGateway(database: TaskStoreCallbacks, initialReuse?: TaskInitialReuseOptions) {
  // A completed SQL transaction can still be waiting on its HTTP response.
  // Bound transport overlap to two; SQL remains the atomic serialization guard.
  const acquireCommit = createTaskCommitLane();
  if (initialReuse && (typeof initialReuse.now !== "function" || !Number.isSafeInteger(initialReuse.ttlMs) || initialReuse.ttlMs < 1 || initialReuse.ttlMs > 15_000
    || !Number.isSafeInteger(initialReuse.maxCharacters) || initialReuse.maxCharacters < 1 || initialReuse.maxCharacters > 1_000_000
    || !Number.isSafeInteger(initialReuse.maxTasks) || initialReuse.maxTasks < 1 || initialReuse.maxTasks > 2_000)) throw new Error("Invalid initial metadata reuse limits.");
  let initialMetadata: TaskInitialMetadata | undefined;
  let protocolReady = false;
  let deltaProtocolReady = false;
  let commandReadProtocolReady = false;
  let retryReadProtocolReady = false;
  let dependencyProtocolReady = false;
  let recordDependencyProtocolReady = false;
  let checkpointProtocolReady = false;
  let checkpointUnavailableUntil = 0;
  let metadataProtocolReady = false;
  let metadataUnavailableUntil = 0;
  let coldProtocolReady = false;
  let coldUnavailableUntil = 0;
  let appendProtocolReady = false;
  let appendUnavailableUntil = 0;
  let appendCheckpointReady = false;
  let appendCheckpointUnavailableUntil = 0;
  let metadataWireReady = false, metadataWireUnavailableUntil = 0, deltaWireReady = false;
  async function readColdSnapshot(taskId: string, append = false): Promise<TaskStoreResult | null> {
    if (!initialReuse?.cold || (!coldProtocolReady && initialReuse.now() < coldUnavailableUntil)) return null;
    if (append && !appendProtocolReady && initialReuse.now() < appendUnavailableUntil) return readColdSnapshot(taskId);
    const result = await database.rpc(append ? "kpi_task_append_context" : "kpi_task_cold_context", { p_task_id: taskId });
    if (result.error) {
      if (append && !appendProtocolReady && ["42883", "PGRST202"].includes(String(result.error.code))) {
        appendUnavailableUntil = initialReuse.now() + initialReuse.ttlMs; return readColdSnapshot(taskId);
      }
      if (!append && !coldProtocolReady && ["42883", "PGRST202"].includes(String(result.error.code))) {
        coldUnavailableUntil = initialReuse.now() + initialReuse.ttlMs; return null;
      }
      return result;
    }
    const row = Array.isArray(result.data) && result.data.length === 1 ? result.data[0] as Record<string, unknown> : null;
    const integer = (value: unknown) => (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))
      && Number.isSafeInteger(Number(value)) && Number(value) >= 1;
    if (!row || row.cold_version !== 1 || typeof row.eligible !== "boolean"
      || !integer(row.revision)
      || !["snapshot", "record-primary"].includes(String(row.source_mode))
      || typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))
      || JSON.stringify(row.cold_fields) !== JSON.stringify(taskColdFields)) throw new Error("Invalid cold Task context.");
    if (!row.eligible) {
      if (row.state !== null || row.task_versions !== null || row.full_task_ids !== null) throw new Error("Invalid ineligible cold context.");
      if (append) { appendProtocolReady = true; return readColdSnapshot(taskId); }
      coldProtocolReady = true; return null;
    }
    const state = row.state as Record<string, unknown> | null, versions = row.task_versions as Record<string, unknown> | null;
    const tasks = state?.tasks as Record<string, unknown>[] | null;
    if (!["snapshot", "record-primary"].includes(String(row.source_mode)) || !state || typeof state !== "object" || Array.isArray(state)
      || !Array.isArray(tasks) || !versions || typeof versions !== "object" || Array.isArray(versions)
      || JSON.stringify(row.full_task_ids) !== JSON.stringify([taskId]) || Object.keys(versions).length !== tasks.length
      || tasks.some((task) => !task || typeof task !== "object" || Array.isArray(task) || typeof task.id !== "string" || !task.id
        || !integer(versions[task.id])
        || (task.id !== taskId && Object.keys(task).some((key) => !(taskColdFields as readonly string[]).includes(key))))
      || new Set(tasks.map((task) => task.id)).size !== tasks.length || !tasks.some((task) => task.id === taskId)) {
      throw new Error("Incomplete cold Task context.");
    }
    if (append && (row.root_projection !== "task-appends-v1" || row.source_mode !== "record-primary"
      || !Array.isArray(state.activityLog) || state.activityLog.some(entry => !entry || typeof entry !== "object"
        || (entry as Record<string,unknown>).action !== "Tự tạo định kỳ")
      || !Array.isArray(state.notifications) || state.notifications.length)) throw new Error("Invalid append-only Task context.");
    if (append) appendProtocolReady = true; else coldProtocolReady = true;
    protocolReady = true;
    return { data: { ...row, cold_projected: true, ...(append ? { append_projected: true } : {}) }, error: null };
  }
  function rememberInitialMetadata(row: Record<string, unknown>, startedAt: number, expiresAt: number, previous?: TaskInitialMetadata): void {
    if (!initialReuse) return;
    const revision = Number(row.revision), sourceMode = String(row.source_mode);
    if (initialMetadata && (initialMetadata.revision > revision
      || (initialMetadata.revision === revision && initialMetadata.sourceMode !== sourceMode && initialMetadata !== previous))) return;
    const now = initialReuse.now(), tasks = (row.state as Record<string, unknown>).tasks as Record<string, unknown>[];
    const versions = row.task_versions as Record<string, unknown>;
    if (!Number.isFinite(now) || !Number.isFinite(startedAt) || now < startedAt || now >= expiresAt
      || tasks.length > initialReuse.maxTasks || Object.keys(versions).length !== tasks.length) { initialMetadata = undefined; return; }
    try {
      const rows: string[] = [], metadataVersions: Record<string, number> = Object.create(null);
      let characters = 0;
      for (const task of tasks) {
        if (typeof task.id !== "string" || !task.id) { initialMetadata = undefined; return; }
        const { progressReports: _reports, attachments: _files, ...header } = task;
        const metadata = row.append_projected === true
          ? Object.fromEntries(Object.entries(header).filter(([key]) => (taskColdFields as readonly string[]).includes(key))) : header;
        const serialized = JSON.stringify(metadata), id = String(task.id);
        characters += serialized.length + JSON.stringify(id).length + 24;
        if (characters > initialReuse.maxCharacters) { initialMetadata = undefined; return; }
        rows.push(serialized); metadataVersions[id] = Number(versions[id]);
      }
      initialMetadata = { revision, sourceMode, versions: metadataVersions, rows, startedAt, expiresAt, append: row.append_projected === true,
        ...(Number.isSafeInteger(row.checkpoint_epoch) && Number(row.checkpoint_epoch) >= 0 ? { checkpointEpoch: Number(row.checkpoint_epoch) } : {}),
        ...(Number.isSafeInteger(row.metadata_epoch) && Number(row.metadata_epoch) >= 0 ? { metadataEpoch: Number(row.metadata_epoch) } : {}) };
    } catch { initialMetadata = undefined; } // Optional retention cannot turn a valid SQL read into a failed save.
  }
  async function readCheckpointSnapshot(taskId: string, before?: TaskRetryBaseline, append = false): Promise<TaskStoreResult | null> {
    if (!initialReuse?.checkpoint || (!append && !checkpointProtocolReady && initialReuse.now() < checkpointUnavailableUntil)) return null;
    let baseline = before?.checkpointEpoch === undefined ? undefined : before;
    let result: TaskStoreResult | undefined;
    let metadataProtocol = false;
    let metadataWire = false;
    if (append) {
      if (!appendCheckpointReady && initialReuse.now() < appendCheckpointUnavailableUntil) return null;
      const retained = baseline?.metadataEpoch === undefined ? undefined : baseline;
      const candidate = await database.rpc("kpi_task_append_metadata_context", { p_task_id: taskId,
        p_after_revision: retained?.revision ?? null, p_source_mode: retained?.sourceMode ?? null,
        p_directory_epoch: retained?.checkpointEpoch ?? null, p_metadata_epoch: retained?.metadataEpoch ?? null });
      if (candidate.error && !appendCheckpointReady && ["42883", "PGRST202"].includes(String(candidate.error.code))) {
        appendCheckpointUnavailableUntil = initialReuse.now() + initialReuse.ttlMs; return null;
      }
      result = candidate; baseline = retained; metadataProtocol = true;
    } else if (initialReuse.metadata && (metadataProtocolReady || initialReuse.now() >= metadataUnavailableUntil)) {
      const retained = baseline?.metadataEpoch === undefined ? undefined : baseline;
      const params = { p_task_id: taskId,
        p_after_revision: retained?.revision ?? null, p_source_mode: retained?.sourceMode ?? null,
        p_directory_epoch: retained?.checkpointEpoch ?? null, p_metadata_epoch: retained?.metadataEpoch ?? null };
      let candidate: TaskStoreResult | undefined;
      if (initialReuse.wire && (metadataWireReady || initialReuse.now() >= metadataWireUnavailableUntil)) {
        candidate = await database.rpc("kpi_task_metadata_wire_context", params);
        if (candidate.error && !metadataWireReady && ["42883", "PGRST202"].includes(String(candidate.error.code))) {
          metadataWireUnavailableUntil = initialReuse.now() + initialReuse.ttlMs; candidate = undefined;
        } else metadataWire = true;
      }
      if (!candidate) candidate = await database.rpc("kpi_task_metadata_context", params);
      if (candidate.error && !metadataProtocolReady && ["42883", "PGRST202"].includes(String(candidate.error.code))) {
        metadataUnavailableUntil = initialReuse.now() + initialReuse.ttlMs;
      } else { result = candidate; baseline = retained; metadataProtocol = true; }
    }
    if (!result) result = await database.rpc("kpi_task_checkpoint_context", { p_task_id: taskId,
      p_after_revision: baseline?.revision ?? null, p_source_mode: baseline?.sourceMode ?? null,
      p_directory_epoch: baseline?.checkpointEpoch ?? null });
    if (result.error) {
      if (!metadataProtocol && !checkpointProtocolReady && ["42883", "PGRST202"].includes(String(result.error.code))) {
        checkpointUnavailableUntil = initialReuse.now() + initialReuse.ttlMs; return null;
      }
      return result;
    }
    const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const integer = (value: unknown, minimum: number) => (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))
      && Number.isSafeInteger(Number(value)) && Number(value) >= minimum;
    const row = Array.isArray(result.data) && result.data.length === 1 ? result.data[0] as Record<string, unknown> : null;
    if (metadataWire && (!row || !object(row.array_base_hashes)
      || Object.entries(row.array_base_hashes).some(([key, value]) => !["notifications", "activityLog"].includes(key)
        || typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)))) throw new Error("Invalid Task array baseline hashes.");
    if (append) {
      if (!row || typeof row.eligible !== "boolean" || row.root_projection !== "task-appends-v2" || row.cold_version !== 1
        || row.checkpoint_version !== 2 || !integer(row.revision,1) || !integer(row.directory_epoch,0) || !integer(row.metadata_epoch,0)
        || !["snapshot","record-primary"].includes(String(row.source_mode))
        || typeof row.directory_complete !== "boolean" || typeof row.metadata_complete !== "boolean"
        || JSON.stringify(row.cold_fields) !== JSON.stringify(taskColdFields)) throw new Error("Invalid append checkpoint capability.");
      if (!row.eligible) {
        if (row.state !== null || row.directory !== null || row.changed_tasks !== null) throw new Error("Invalid ineligible append checkpoint.");
        appendCheckpointReady = true; return null;
      }
      if (row.source_mode !== "record-primary" || !object(row.state) || !Array.isArray(row.state.notifications) || row.state.notifications.length
        || !Array.isArray(row.state.activityLog) || row.state.activityLog.some(e=>!object(e)||e.action!=="Tự tạo định kỳ")
        || !Array.isArray(row.changed_tasks) || row.changed_tasks.some(t=>!object(t)||(t.id!==taskId
          && Object.keys(t).some(key=>!(taskColdFields as readonly string[]).includes(key))))) throw new Error("Invalid append checkpoint projection.");
    }
    if (!row || row.checkpoint_version !== (metadataProtocol ? 2 : 1) || !integer(row.revision, baseline?.revision || 1)
      || !integer(row.directory_epoch, 0) || typeof row.directory_complete !== "boolean"
      || !["snapshot", "record-primary"].includes(String(row.source_mode)) || !object(row.state) || Object.hasOwn(row.state, "tasks")
      || !Array.isArray(row.directory) || !Array.isArray(row.changed_tasks)) throw new Error("Invalid task directory checkpoint.");
    const complete = row.directory_complete;
    const metadataComplete = metadataProtocol ? row.metadata_complete : complete;
    if (metadataProtocol && (!integer(row.metadata_epoch, 0) || typeof metadataComplete !== "boolean" || (metadataComplete && !complete))) {
      throw new Error("Invalid task metadata checkpoint.");
    }
    if (!metadataComplete && (!baseline || row.source_mode !== baseline.sourceMode
      || (metadataProtocol && Number(row.metadata_epoch) !== baseline.metadataEpoch))) throw new Error("Unproven metadata reuse.");
    if (!complete && (!baseline || row.source_mode !== baseline.sourceMode || Number(row.directory_epoch) !== baseline.checkpointEpoch)) {
      throw new Error("Unproven task directory reuse.");
    }
    const previous = baseline?.state.tasks as Record<string, unknown>[] | undefined;
    if (!metadataComplete && (!Array.isArray(previous) || !baseline?.taskVersions)) throw new Error("Missing checkpoint baseline.");
    const old = new Map((previous || []).map((task) => [String(task.id), task]));
    const versions: Record<string, number> = complete ? Object.create(null) : Object.assign(Object.create(null), baseline!.taskVersions);
    if (!metadataComplete && (old.size !== previous!.length || Object.keys(baseline!.taskVersions!).length !== old.size)) throw new Error("Invalid checkpoint baseline directory.");
    if (!metadataComplete && [...old.keys()].some((id) => !Number.isSafeInteger(Number(baseline!.taskVersions![id])) || Number(baseline!.taskVersions![id]) < 1)) throw new Error("Incomplete checkpoint baseline versions.");
    const patch = new Map<string, number>();
    for (const entry of row.directory) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || !entry[0]
        || !integer(entry[1], 1) || patch.has(entry[0])
        || (!complete && (!old.has(entry[0]) || Number(entry[1]) < Number(versions[entry[0]])))) throw new Error("Invalid checkpoint directory patch.");
      patch.set(entry[0], Number(entry[1])); versions[entry[0]] = Number(entry[1]);
    }
    const changed = new Map<string, Record<string, unknown>>();
    for (const task of row.changed_tasks) {
      if (!object(task) || !task.id || !patch.has(String(task.id)) || changed.has(String(task.id))
        || (String(task.id) !== taskId && (Object.hasOwn(task, "progressReports") || Object.hasOwn(task, "attachments")))) throw new Error("Invalid checkpoint task metadata.");
      changed.set(String(task.id), task);
    }
    if (((metadataComplete || !complete) && changed.size !== patch.size)
      || (metadataComplete && row.changed_tasks.some((task, index) => String((task as Record<string, unknown>).id) !== (row.directory as unknown[][])[index]?.[0]))) {
      throw new Error("Incomplete checkpoint metadata.");
    }
    const ids = complete ? [...patch.keys()] : [...old.keys()];
    if (ids.includes(taskId) && !changed.has(taskId)) throw new Error("Checkpoint target body is missing.");
    const tasks = ids.map((id) => {
      if (changed.has(id)) return changed.get(id)!;
      if (!old.has(id) || Number(baseline?.taskVersions?.[id]) !== Number(versions[id])
        || !Number.isSafeInteger(Number(versions[id])) || Number(versions[id]) < 1) throw new Error("Missing checkpoint row metadata/version.");
      const { progressReports: _reports, attachments: _files, ...metadata } = old.get(id)!;
      return metadata;
    });
    if (!append) checkpointProtocolReady = true;
    protocolReady = true;
    if (append) appendCheckpointReady = true;
    else if (metadataProtocol) metadataProtocolReady = true;
    if (metadataWire) metadataWireReady = true;
    return { data: { revision: Number(row.revision), updated_at: row.updated_at, source_mode: row.source_mode,
      state: { ...row.state, tasks }, task_versions: versions, full_task_ids: ids.includes(taskId) ? [taskId] : [],
      checkpoint_epoch: Number(row.directory_epoch), checkpoint_complete: complete,
      ...(metadataProtocol ? { metadata_epoch: Number(row.metadata_epoch), metadata_complete: metadataComplete } : {}),
      ...(metadataWire ? { array_base_hashes: row.array_base_hashes } : {}),
      ...(append ? { cold_projected: true, append_projected: true } : {}) }, error: null };
  }
  async function readRetrySnapshot(taskId: string, before: TaskRetryBaseline): Promise<TaskStoreResult> {
    if (before.checkpointEpoch !== undefined) {
      const checkpoint = await readCheckpointSnapshot(taskId, before);
      if (checkpoint) return checkpoint;
    }
    const result = await database.rpc("kpi_task_retry_context", {
      p_task_id: taskId, p_after_revision: before.revision, p_source_mode: before.sourceMode,
    });
    if (result.error) {
      if (!retryReadProtocolReady && ["42883", "PGRST202"].includes(String(result.error.code))) return { data: null, error: null };
      return result;
    }
    const row = Array.isArray(result.data) && result.data.length === 1 ? result.data[0] as Record<string, unknown> : null;
    const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    if (!row || !Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < before.revision
      || !["snapshot", "record-primary"].includes(String(row.source_mode)) || typeof row.reset_required !== "boolean") {
      throw new Error("Invalid task retry context.");
    }
    retryReadProtocolReady = true;
    if (row.reset_required) {
      if (row.source_mode === before.sourceMode) throw new Error("Unexpected task retry reset.");
      return { data: null, error: null };
    }
    if (row.source_mode !== before.sourceMode || !object(row.state) || Object.hasOwn(row.state, "tasks")
      || !object(row.task_versions) || !Array.isArray(row.task_order) || !Array.isArray(row.changed_tasks)) {
      throw new Error("Incomplete task retry context.");
    }
    const ids = row.task_order as unknown[], versions = row.task_versions;
    const idSet = new Set(ids);
    if (ids.some((id) => typeof id !== "string" || !id) || idSet.size !== ids.length
      || Object.keys(versions).length !== ids.length || ids.some((id) => !Number.isSafeInteger(Number(versions[String(id)])) || Number(versions[String(id)]) < 1)) {
      throw new Error("Invalid task retry order/versions.");
    }
    const previous = before.state.tasks as Record<string, unknown>[];
    if (!Array.isArray(previous) || !before.taskVersions) throw new Error("Missing task retry baseline.");
    const old = new Map(previous.map((task) => [String(task.id), task]));
    const changed = new Map<string, Record<string, unknown>>();
    for (const task of row.changed_tasks) {
      if (!object(task) || typeof task.id !== "string" || !idSet.has(task.id) || changed.has(task.id)
        || (task.id !== taskId && (Object.hasOwn(task, "progressReports") || Object.hasOwn(task, "attachments")))) {
        throw new Error("Invalid changed task metadata.");
      }
      changed.set(task.id, task);
    }
    const tasks = (ids as string[]).map((id) => {
      if (changed.has(id)) return changed.get(id)!;
      if (id === taskId || !old.has(id) || Number(before.taskVersions![id]) !== Number(versions[id])) {
        throw new Error("Missing changed task metadata.");
      }
      const { progressReports: _reports, attachments: _files, ...metadata } = old.get(id)!;
      return metadata;
    });
    protocolReady = true;
    return { data: { ...row, state: { ...row.state, tasks }, full_task_ids: ids.includes(taskId) ? [taskId] : [] }, error: null };
  }
  async function readCommandSnapshot(taskId: string, reuseInitial = true, allowCold = false, allowAppend = false): Promise<TaskStoreResult> {
    const startedAt = initialReuse?.now() ?? 0;
    const remembered = initialMetadata;
    const retained = reuseInitial && remembered && Boolean(remembered.append) === allowAppend
      && Number.isFinite(startedAt) && startedAt >= remembered.startedAt && startedAt < remembered.expiresAt;
    if (allowCold && allowAppend && initialReuse?.metadata) try {
      const baseline = retained ? { revision: remembered.revision, sourceMode: remembered.sourceMode,
        checkpointEpoch: remembered.checkpointEpoch, metadataEpoch: remembered.metadataEpoch,
        taskVersions: { ...remembered.versions }, state: { tasks: remembered.rows.map(row=>JSON.parse(row)) } } : undefined;
      const checkpoint = await readCheckpointSnapshot(taskId,baseline,true);
      if (checkpoint) {
        if (checkpoint.error) { if(initialMetadata===remembered)initialMetadata=undefined;return checkpoint; }
        const row=checkpoint.data as Record<string,unknown>;
        const delta=(row.metadata_complete===false || row.checkpoint_complete===false) && retained;
        rememberInitialMetadata(row,delta?remembered.startedAt:startedAt,
          delta?remembered.expiresAt:startedAt+initialReuse.ttlMs,remembered);
        return checkpoint;
      }
    } catch(error) { if(initialMetadata===remembered)initialMetadata=undefined;throw error; }
    // A cold-field baseline must never enter the complete-metadata fallback.
    const metadataRetained = retained && remembered.append !== true;
    if (allowCold && (allowAppend || !retained)) {
      const cold = await readColdSnapshot(taskId, allowAppend);
      if (cold) return cold;
    }
    if (initialReuse?.checkpoint && (checkpointProtocolReady || startedAt >= checkpointUnavailableUntil)) try {
      const baseline = metadataRetained ? { revision: remembered.revision, sourceMode: remembered.sourceMode, checkpointEpoch: remembered.checkpointEpoch, metadataEpoch: remembered.metadataEpoch,
        taskVersions: { ...remembered.versions }, state: { tasks: remembered.rows.map((row) => JSON.parse(row)) } } : undefined;
      const checkpoint = await readCheckpointSnapshot(taskId, baseline);
      if (checkpoint) {
        if (checkpoint.error) { if (initialMetadata === remembered) initialMetadata = undefined; return checkpoint; }
        const row = checkpoint.data as Record<string, unknown>;
        const delta = (row.metadata_complete === false || row.checkpoint_complete === false) && metadataRetained;
        rememberInitialMetadata(row, delta ? remembered.startedAt : startedAt,
          delta ? remembered.expiresAt : startedAt + (initialReuse?.ttlMs || 0), remembered);
        return checkpoint;
      }
    } catch (error) { if (initialMetadata === remembered) initialMetadata = undefined; throw error; }
    if (metadataRetained) {
      try {
        const result = await readRetrySnapshot(taskId, { revision: remembered.revision, sourceMode: remembered.sourceMode,
          taskVersions: { ...remembered.versions }, state: { tasks: remembered.rows.map((row) => JSON.parse(row)) } });
        if (result.error) { if (initialMetadata === remembered) initialMetadata = undefined; return result; }
        if (result.data) {
          rememberInitialMetadata(result.data as Record<string, unknown>, remembered.startedAt, remembered.expiresAt, remembered);
          return result;
        }
      } catch (error) { if (initialMetadata === remembered) initialMetadata = undefined; throw error; }
    }
    if (initialMetadata === remembered) initialMetadata = undefined;
    const result = await database.rpc("kpi_task_write_context", { p_task_id: taskId });
    if (result.error) {
      if (!commandReadProtocolReady && ["42883", "PGRST202"].includes(String(result.error.code))) return { data: null, error: null };
      return result;
    }
    const row = Array.isArray(result.data) && result.data.length === 1 ? result.data[0] as Record<string, unknown> : null;
    const state = row?.state as Record<string, unknown> | null;
    const tasks = state?.tasks as Record<string, unknown>[] | null;
    const fullIds = row?.full_task_ids;
    const versions = row?.task_versions as Record<string, unknown> | null;
    if (!row || !Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 1
      || !["snapshot", "record-primary"].includes(String(row.source_mode)) || !state || !Array.isArray(tasks)
      || !Array.isArray(fullIds) || fullIds.length > 1 || !versions || typeof versions !== "object" || Array.isArray(versions)
      || tasks.some((task) => !task || typeof task !== "object" || Array.isArray(task))
      || new Set(tasks.map((task) => String(task.id))).size !== tasks.length
      || tasks.some((task) => !task.id || !Number.isSafeInteger(Number(versions[String(task.id)])) || Number(versions[String(task.id)]) < 1)
      || fullIds.some((id) => id !== taskId || !tasks.some((task) => String(task.id) === id))
      || (tasks.some((task) => String(task.id) === taskId) && !fullIds.includes(taskId))) {
      throw new Error("Invalid task write context; incomplete fallback is blocked.");
    }
    commandReadProtocolReady = true;
    protocolReady = true;
    rememberInitialMetadata(row, startedAt, startedAt + (initialReuse?.ttlMs || 0), remembered);
    return { data: row, error: null };
  }
  async function readSnapshot(): Promise<TaskStoreResult> {
    const result = await database.rpc("kpi_read_task_state");
    if (!result.error) {
      protocolReady = true;
      if (!Array.isArray(result.data) || result.data.length !== 1) throw new Error("Missing or invalid canonical task state; empty fallback is blocked.");
      const row = result.data[0] as Record<string, unknown>;
      const state = row.state as Record<string, unknown> | null;
      if (!Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 1
        || !["snapshot", "record-primary"].includes(String(row.source_mode)) || !state || !Array.isArray(state.tasks)) {
        throw new Error("Invalid canonical task state; empty fallback is blocked.");
      }
      return { data: row, error: null };
    }
    if (protocolReady || !["42883", "PGRST202"].includes(String(result.error.code))) return result;
    const mode = await database.modeRead();
    if (mode.error && !["42P01", "PGRST205"].includes(String(mode.error.code))) return mode;
    const marker = mode.data as Record<string, unknown> | null;
    if (Number(marker?.schema_version) >= 2 || marker?.source_mode === "record-primary") {
      return { data: null, error: { code: "KPT01", message: "Record-primary protocol is unavailable; legacy fallback is blocked." } };
    }
    return database.legacyRead();
  }
  async function commitState(params: Record<string, unknown>, actorId = "", sessionHash = "") {
    const result = await database.rpc(protocolReady ? "kpi_commit_record_state" : "kpi_update_shared_state",
      { ...params, ...(protocolReady ? { p_actor_id: actorId, p_session_hash: sessionHash } : {}) });
    return result as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
  }
  async function commitTaskCommand(params: Record<string, unknown>, before?: Record<string, unknown>, partialTaskIds?: ReadonlySet<string>, dependency?: { versions?: Record<string, number>; sourceMode?: string; reads?: TaskFieldReads; cold?: boolean; append?: boolean }, arrayBaseHashes?: Record<string, string>) {
    // A busy lock has not evaluated or written this command. Reuse its exact
    // envelope; SQL rechecks authentication, versions and dependencies on retry.
    async function commitRpc(name: string, body: Record<string, unknown>): Promise<TaskStoreResult> {
      const release = await acquireCommit();
      if (!release) return { data: null, error: { code: "KPB02", message: "Task command queue is busy; command was not executed." } };
      try {
        for (let attempt = 0; ; attempt++) {
          const result = await database.rpc(name, body);
          if (result.error?.code !== "KPB01" || attempt >= 7) return result;
          await new Promise((resolve) => setTimeout(resolve, taskCommandRetryDelay(attempt)));
        }
      } finally {
        release();
      }
    }
    if (protocolReady && before) {
      const after = params.p_next_state as Record<string, unknown>;
      const previous = before.tasks as Record<string, unknown>[];
      const tasks = after.tasks as Record<string, unknown>[];
      if (!Array.isArray(previous) || !Array.isArray(tasks)) throw new Error("Complete task baseline is required for a delta command.");
      const oldById = new Map<string, Record<string, unknown>>();
      const nextIds = new Set<string>(), taskOrder: string[] = [], upserts: Record<string, unknown>[] = [];
      let sameOrder = previous.length === tasks.length;
      let versionsValid = Boolean(dependency?.versions && Object.keys(dependency.versions).length === previous.length);
      for (const task of previous) {
        const rawId = task?.id;
        if (!rawId) throw new Error("Invalid task delta baseline.");
        const id = String(rawId);
        if (oldById.has(id)) throw new Error("Invalid task delta baseline.");
        oldById.set(id, task);
        if (versionsValid && (!Number.isSafeInteger(dependency!.versions![id]) || dependency!.versions![id] < 1)) versionsValid = false;
      }
      for (let index = 0; index < tasks.length; index++) {
        const task = tasks[index];
        const rawId = task?.id;
        if (!rawId) throw new Error("Invalid task delta baseline.");
        const id = String(rawId);
        if (nextIds.has(id)) throw new Error("Invalid task delta baseline.");
        nextIds.add(id); taskOrder.push(id);
        if (sameOrder && rawId !== previous[index].id) sameOrder = false;
        if (oldById.get(id) === task || JSON.stringify(oldById.get(id)) === JSON.stringify(task)) continue;
        if (partialTaskIds && (partialTaskIds.has(id)
          || (!oldById.has(id) && (!Object.hasOwn(task, "progressReports") || !Object.hasOwn(task, "attachments"))))) {
          throw new Error("Partial task body cannot be committed.");
        }
        upserts.push(task);
      }
      const deletes = sameOrder ? [] : [...oldById.keys()].filter((id) => !nextIds.has(id));
      const { tasks: _tasks, ...shared } = after;
      const evidenceBefore = dependency?.cold ? guardTaskColdMetadata(before, String(params.p_task_id)) : before;
      const evidenceAfter = dependency?.cold ? guardTaskColdMetadata(after, String(params.p_task_id)) : after;
      const { envelope, recordEnvelope } = versionsValid && partialTaskIds && params.p_command_name === "update-progress"
        && upserts.length === 1 && upserts[0].id === params.p_task_id
        && sameOrder && ["snapshot", "record-primary"].includes(String(dependency?.sourceMode))
        ? taskDependencyEnvelopes(evidenceBefore, evidenceAfter, String(params.p_task_id), dependency?.reads) : { envelope: null, recordEnvelope: null };
      if (dependency?.cold) { unwrapTaskColdMetadata(evidenceBefore, true); unwrapTaskColdMetadata(evidenceAfter, true); }
      if (dependency?.append && !recordEnvelope) throw new TaskMetadataRequired("Complete context is required for non-isolated Task effects.");
      const compactReads=dependency?.append ? compactTaskFieldReads(recordEnvelope!.fieldReads) : null;
      const packed=dependency?.append && taskOrder.length>=32
        ? dictionaryTaskEvidence(recordEnvelope!.fieldReads,dependency!.versions!,taskOrder,String(params.p_task_id)) : null;
      const dictionary=packed && JSON.stringify(packed).length<JSON.stringify({fieldReads:compactReads,versions:dependency!.versions}).length*0.8
        ? packed : null;
      for (const recordScoped of [true, false]) {
        const evidence = recordScoped ? recordEnvelope : envelope;
        if (!evidence || !["snapshot", "record-primary"].includes(String(dependency?.sourceMode))
          || JSON.stringify([evidence, dependency!.versions]).length > 2_000_000) continue;
        const scoped = await commitRpc(recordScoped ? "kpi_commit_independent_task_command" : "kpi_commit_task_dependency_command", { ...params, p_next_state: shared,
          p_task_upserts: upserts, p_task_deletes: [], p_task_order: taskOrder,
          p_dependency_contract: dictionary ? "task-record-appends-v3" : dependency?.append ? "task-record-appends-v2" : evidence.contract, p_dependency_state: evidence.state,
          p_read_task_versions: dictionary?.versions || dependency!.versions, p_source_mode: dependency!.sourceMode,
          p_generation_reads: evidence.generationReads, p_activities: evidence.activities,
          ...(recordScoped ? { p_task_field_reads: dictionary?.fieldReads || compactReads || recordEnvelope!.fieldReads,
            p_notifications: recordEnvelope!.notifications } : {}) });
        if (!scoped.error) {
          if (!Array.isArray(scoped.data) || scoped.data.length > 1 || scoped.data.some((value) => {
            const row = value as Record<string, unknown>;
            return !row || typeof row.rebased !== "boolean" || typeof row.replayed !== "boolean"
              || !Number.isSafeInteger(Number(row.next_revision)) || Number(row.next_revision) < Number(params.p_expected_revision)
              || !Number.isSafeInteger(Number(row.task_version)) || Number(row.task_version) < 1
              || typeof row.next_updated_at !== "string" || !Number.isFinite(Date.parse(row.next_updated_at))
              || (!row.replayed && (Number(row.task_version) <= Number(params.p_expected_task_version)
                || (row.rebased ? Number(row.next_revision) <= Number(params.p_expected_revision) + 1
                  : Number(row.next_revision) !== Number(params.p_expected_revision) + 1)));
          })) throw new Error("Invalid dependency commit result; authoritative refresh required.");
          if (recordScoped) recordDependencyProtocolReady = true;
          else dependencyProtocolReady = true;
          deltaProtocolReady = true;
        }
        if (dependency?.append || !scoped.error || (recordScoped ? recordDependencyProtocolReady : dependencyProtocolReady) || !["42883", "PGRST202"].includes(String(scoped.error.code))) {
          return scoped as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
        }
      }
      const deltaParams = { ...params, p_next_state: shared,
        p_task_upserts: upserts,
        p_task_deletes: deletes,
        p_task_order: taskOrder,
      };
      const wire = taskRootArrayWire(before, shared, arrayBaseHashes);
      let delta: TaskStoreResult | undefined;
      if (wire) {
        delta = await commitRpc("kpi_commit_task_delta_wire", { ...deltaParams, p_next_state: wire.state, p_array_patches: wire.patches });
        if (delta.error && !deltaWireReady && ["42883", "PGRST202"].includes(String(delta.error.code))) delta = undefined;
        else if (!delta.error) deltaWireReady = true;
      }
      if (!delta) delta = await commitRpc("kpi_commit_task_delta_command", deltaParams);
      if (!delta.error) deltaProtocolReady = true;
      if (!delta.error || deltaProtocolReady || partialTaskIds || !["42883", "PGRST202"].includes(String(delta.error.code))) {
        return delta as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
      }
    }
    const result = await database.rpc(protocolReady ? "kpi_commit_record_task_command" : "kpi_commit_task_command", params);
    return result as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
  }
  return { readSnapshot, readCommandSnapshot, readRetrySnapshot, commitState, commitTaskCommand };
}
