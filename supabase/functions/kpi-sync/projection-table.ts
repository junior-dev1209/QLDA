type ProbeResult = { error: { code?: string; message?: string } | null };
const namespaceTables: Record<string, string> = {
  evaluations: "kpi_record_evaluations",
  kpi_catalog: "kpi_record_catalog",
  activity_log: "kpi_record_activity_log",
};

// Existing hosted installations use namespaced projections; older migrations
// use legacy names. Select one physical target, never write to both.
export function createProjectionTableResolver(probe: (table: string) => Promise<ProbeResult>) {
  const targets = new Map<string, Promise<string>>();
  return (table: string): Promise<string> => {
    const namespaced = namespaceTables[table];
    if (!namespaced) return Promise.resolve(table);
    if (!targets.has(table)) {
      targets.set(table, probe(namespaced).then(({ error }) => {
        if (!error) return namespaced;
        if (["PGRST205", "42P01"].includes(String(error.code || ""))) return table;
        throw error;
      }).catch((error) => { targets.delete(table); throw error; }));
    }
    return targets.get(table)!;
  };
}
