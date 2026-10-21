const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const edgeSource = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((output, key) => {
      output[key] = stable(value[key]);
      return output;
    }, {});
  }
  return value;
}

const sandbox = {
  catalogText: (value) => String(value || "").trim().replace(/\s+/g, " "),
  sharedRecordId: (record) => String(record?.id || "").trim(),
  sharedValuesEqual: (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right)),
};
vm.createContext(sandbox);
[
  "kpiCatalogEntryKey",
  "kpiCatalogEntryMap",
  "kpiCatalogCriterionKey",
  "kpiCatalogCriteriaMap",
  "mergeKpiCriteriaArrayChange",
  "mergeKpiCatalogRecordChange",
  "mergeKpiCatalogArrayChange",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const base = [{
  id: "role-gpmb",
  name: "Nhân viên",
  accountRole: "employee",
  criteria: [["Điều tra", 50], ["Xác minh", 50]],
}];
const local = [{
  id: "role-gpmb",
  name: "Nhân viên",
  accountRole: "employee",
  criteria: [["Điều tra", 60], ["Xác minh", 50]],
}];
const remote = [{
  id: "role-gpmb",
  name: "Nhân viên",
  accountRole: "section_head",
  criteria: [["Điều tra", 50], ["Xác minh", 40]],
}];
const merged = sandbox.mergeKpiCatalogArrayChange("roles", base, local, remote);
assert.ok(merged, "Thay đổi độc lập trong cùng vị trí phải được hợp nhất.");
assert.equal(merged[0].accountRole, "section_head", "Phải giữ thay đổi quyền tài khoản từ máy chủ.");
assert.deepEqual(Array.from(merged[0].criteria), [["Điều tra", 60], ["Xác minh", 40]], "Phải gộp trọng số của các tiêu chí khác nhau.");

const addedLocal = [{ ...base[0], criteria: [...base[0].criteria, ["Lập hồ sơ", 10]] }];
const addedRemote = [{ ...base[0], criteria: [...base[0].criteria, ["Niêm yết", 10]] }];
const mergedAdditions = sandbox.mergeKpiCatalogArrayChange("roles", base, addedLocal, addedRemote);
assert.ok(mergedAdditions, "Hai tiêu chí mới khác nhau phải cùng được lưu.");
assert.deepEqual(
  Array.from(mergedAdditions[0].criteria).map((criterion) => criterion[0]),
  ["Điều tra", "Xác minh", "Niêm yết", "Lập hồ sơ"],
  "Phải giữ đủ tiêu chí mới từ cả máy chủ và thiết bị đang lưu.",
);

const conflictRemote = [{ ...base[0], criteria: [["Điều tra", 40], ["Xác minh", 50]] }];
assert.equal(
  sandbox.mergeKpiCatalogArrayChange("roles", base, local, conflictRemote),
  null,
  "Hai giá trị khác nhau cùng sửa một tiêu chí phải được nhận diện là xung đột thực sự.",
);

[
  "function mergeKpiCriteriaArrayChange",
  "function mergeKpiCatalogRecordChange",
  "async function refreshKpiCatalogBeforeEditing",
  "function kpiCatalogSyncNeedsRetry",
  "async function saveKpiCatalogServerCommand",
  "function sharedSyncSupportsKpiCatalogCommand",
  "synchronizePersonDetailInlineEditor",
].forEach((marker) => assert.ok(source.includes(marker), `Missing client safeguard: ${marker}`));
[
  "const deploymentVersion = \"2026.10.21.1\"",
  "function mergeKpiCriteriaArrayChange",
  "function mergeKpiCatalogRecordChange",
  "function validKpiCatalogUpdate",
  "async function updateKpiCatalogWithRetry",
  "await syncAllRecordProjections(current.state, current.revision);",
  "Unable to repair record projections.",
  "action === \"kpi-catalog\"",
].forEach((marker) => assert.ok(edgeSource.includes(marker), `Missing server safeguard: ${marker}`));

console.log("kpi_catalog_online_sync=passed");
