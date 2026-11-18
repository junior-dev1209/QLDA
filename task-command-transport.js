(() => {
  async function send(request, body) {
    const options = { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), timeoutMs: 30000 };
    let failed;
    let originalError;
    try {
      const result = await request("task-command", options);
      if (![502, 503, 504].includes(result.response.status)) return result;
      failed = result;
    } catch (error) {
      if (!["AbortError", "TypeError"].includes(error?.name)) throw error;
      originalError = error;
    }
    // Recovery is read-only. Resend once only after confirming durable deduplication.
    try {
      const result = await request("task-command-result", { ...options, timeoutMs: 8000 });
      if (result.response.ok && result.payload?.available === true) {
        if (result.payload.found === true && result.payload.task) return result;
        if (result.payload.found === false) return await request("task-command", { ...options, timeoutMs: 15000 });
      }
      if ([401, 403, 409, 422].includes(result.response.status)) return result;
    } catch {
      // An uncertain outcome is not success. Keep the form's existing draft.
    }
    if (originalError) throw originalError;
    return failed;
  }
  globalThis.TaskCommandTransport = Object.freeze({ send });
})();
