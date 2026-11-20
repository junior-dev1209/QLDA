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

// Cache protocol availability only. Mode, permissions and records are always
// read fresh; a rollout/schema failure cannot downgrade record-primary reads.
export function createTaskRecordGateway(database: TaskStoreCallbacks) {
  let protocolReady = false;
  let deltaProtocolReady = false;
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
  async function commitTaskCommand(params: Record<string, unknown>, before?: Record<string, unknown>) {
    if (protocolReady && before) {
      const after = params.p_next_state as Record<string, unknown>;
      const previous = before.tasks as Record<string, unknown>[];
      const tasks = after.tasks as Record<string, unknown>[];
      if (!Array.isArray(previous) || !Array.isArray(tasks)) throw new Error("Complete task baseline is required for a delta command.");
      const oldById = new Map(previous.map((task) => [String(task.id), task]));
      const nextIds = new Set(tasks.map((task) => String(task.id)));
      if (oldById.size !== previous.length || nextIds.size !== tasks.length
        || [...previous, ...tasks].some((task) => !task.id)) throw new Error("Invalid task delta baseline.");
      const { tasks: _tasks, ...shared } = after;
      const delta = await database.rpc("kpi_commit_task_delta_command", { ...params, p_next_state: shared,
        p_task_upserts: tasks.filter((task) => JSON.stringify(oldById.get(String(task.id))) !== JSON.stringify(task)),
        p_task_deletes: previous.filter((task) => !nextIds.has(String(task.id))).map((task) => String(task.id)),
        p_task_order: tasks.map((task) => String(task.id)),
      });
      if (!delta.error) deltaProtocolReady = true;
      if (!delta.error || deltaProtocolReady || !["42883", "PGRST202"].includes(String(delta.error.code))) {
        return delta as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
      }
    }
    const result = await database.rpc(protocolReady ? "kpi_commit_record_task_command" : "kpi_commit_task_command", params);
    return result as { data: Record<string, unknown>[] | null; error: TaskStoreResult["error"] };
  }
  return { readSnapshot, commitState, commitTaskCommand };
}
