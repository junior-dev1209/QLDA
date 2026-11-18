type RecordValue = Record<string, unknown>;
type RecordChange = { upserts: RecordValue[]; deletes: string[]; order?: string[] };

// Only used when the client's baseline is exactly the server's pre-command
// revision. A skipped revision always receives a full authoritative snapshot.
export function taskCommandChanges(
  before: RecordValue, after: RecordValue, baseRevision: number, revision: number,
  collectionNames: readonly string[], fieldNames: readonly string[],
) {
  const collections: Record<string, RecordChange> = {};
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  for (const name of collectionNames) {
    const oldRecords = (Array.isArray(before[name]) ? before[name] : []) as RecordValue[];
    const newRecords = (Array.isArray(after[name]) ? after[name] : []) as RecordValue[];
    if (same(oldRecords, newRecords)) continue;
    const oldById = new Map(oldRecords.map((record) => [String(record.id), record]));
    const newById = new Map(newRecords.map((record) => [String(record.id), record]));
    if (oldById.size !== oldRecords.length || newById.size !== newRecords.length
      || [...oldRecords, ...newRecords].some((record) => !record.id)) return null;
    const upserts = newRecords.filter((record) => !same(oldById.get(String(record.id)), record));
    const deletes = oldRecords.filter((record) => !newById.has(String(record.id))).map((record) => String(record.id));
    const change: RecordChange = { upserts, deletes };
    const defaultOrder = oldRecords.filter((record) => newById.has(String(record.id))).map((record) => String(record.id));
    defaultOrder.push(...newRecords.filter((record) => !oldById.has(String(record.id))).map((record) => String(record.id)));
    const newOrder = newRecords.map((record) => String(record.id));
    if (!same(defaultOrder, newOrder)) change.order = newOrder;
    collections[name] = change;
  }
  const fields: Record<string, unknown> = {};
  for (const name of fieldNames) {
    if (!same(before[name], after[name])) fields[name] = after[name] ?? null;
  }
  return { protocol: "task-changes-v1", baseRevision, revision, collections, fields };
}
