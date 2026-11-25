(() => {
  async function sendWithRecovery(request, body, creating) {
    const action = creating ? "mutate" : "task-command";
    const recoveryAction = creating ? "task-create-result" : "task-command-result";
    const options = { method: creating ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), timeoutMs: creating ? 20000 : 30000 };
    let failed;
    let originalError;
    try {
      const result = await request(action, options);
      if (![502, 503, 504, 546].includes(result.response.status)) return result;
      failed = result;
    } catch (error) {
      if (!["AbortError", "TypeError"].includes(error?.name)) throw error;
      originalError = error;
    }
    // Recovery is read-only. Resend once only after confirming durable deduplication.
    try {
      const result = await request(recoveryAction, { ...options, method: "POST", query: { compact: "receipt-v1" }, timeoutMs: 8000 });
      if (result.response.ok && result.payload?.available === true) {
        if (result.payload.found === true && result.payload.task) return result;
        if (result.payload.found === false && failed?.response.status !== 546) return await request(action, { ...options, timeoutMs: 15000 });
      }
      if ([401, 403, 409, 422].includes(result.response.status)) return result;
    } catch {
      // An uncertain outcome is not success. Keep the form's existing draft.
    }
    if (originalError) throw originalError;
    return failed;
  }
  const send = (request, body) => sendWithRecovery(request, body, false);
  function create(request, body) {
    const patch = body?.patch, upserts = patch?.collections?.tasks?.upserts;
    if (!patch || Object.keys(patch.collections || {}).length !== 1 || (patch.fields || []).length
      || (patch.collections.tasks.deletes || []).length || !Array.isArray(upserts) || upserts.length !== 1
      || upserts[0].baseValue != null || !String(upserts[0].id || "") || String(upserts[0].id).length > 150
      || String(upserts[0].value?.id || "") !== String(upserts[0].id)) throw new Error("A single stable Task creation is required.");
    return sendWithRecovery(request, body, true);
  }
  globalThis.TaskCommandTransport = Object.freeze({ send, create });
})();
