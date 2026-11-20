type IdentityRecord = Record<string, unknown>;

// Cache identity indexes only, not permissions. Replacing an array invalidates
// the index; mutations to a record's role/disabled fields stay immediately visible.
export function createIdentityLookup() {
  const indexes = new WeakMap<object, { length: number; byId: Map<string, { record: IdentityRecord; position: number }> }>();
  return (values: unknown, id: string): IdentityRecord | undefined => {
    if (!Array.isArray(values)) return undefined;
    let index = indexes.get(values);
    if (!index || index.length !== values.length) {
      const byId = new Map<string, { record: IdentityRecord; position: number }>();
      for (let position = 0; position < values.length; position++) {
        const value = values[position];
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const key = String(value.id || "");
        if (!byId.has(key)) byId.set(key, { record: value, position });
      }
      index = { length: values.length, byId };
      indexes.set(values, index);
    }
    const entry = index.byId.get(id);
    if (entry && values[entry.position] === entry.record && String(entry.record.id || "") === id) return entry.record;
    const found = values.find((value) => value && typeof value === "object" && !Array.isArray(value) && String(value.id || "") === id);
    if (found || entry) indexes.delete(values);
    return found;
  };
}
