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
    available = !error && record?.schema_version === 1 && record?.source_mode === "snapshot";
    expiresAt = Date.now() + 30_000;
    return available;
  };
}
