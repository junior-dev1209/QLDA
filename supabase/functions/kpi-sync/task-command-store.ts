export type TaskCommandReceipt = { task_id: string; command_name: string; request_hash: string };
export type TaskCommandCommit = {
  taskId: string; commandId: string; command: string; requestHash: string; sessionHash: string;
};
export class TaskCommandConflictError extends Error {}

// Only a missing additive table means an older schema. Connectivity/ACL errors
// must never silently downgrade a command to the legacy path.
export function taskCommandReceiptResult(result: {
  data: unknown; error: { code?: string; message?: string } | null;
}): { available: boolean; receipt: TaskCommandReceipt | null } {
  if (result.error) {
    if (["42P01", "PGRST205"].includes(String(result.error.code))) return { available: false, receipt: null };
    throw new Error(`Task command receipt lookup failed: ${result.error.message || result.error.code}`);
  }
  return { available: true, receipt: result.data as TaskCommandReceipt | null };
}

export function assertTaskCommandReceipt(receipt: TaskCommandReceipt, command: TaskCommandCommit): void {
  if (receipt.task_id !== command.taskId || receipt.command_name !== command.command || receipt.request_hash !== command.requestHash) {
    throw new TaskCommandConflictError("Command id was already used for a different request.");
  }
}
