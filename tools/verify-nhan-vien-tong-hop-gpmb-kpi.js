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

const expectedCriteria = [
  ["Tổng hợp số liệu/Tiến độ dự án", 40],
  ["Nhập liệu hồ sơ dự án", 30],
  ["Hỗ trợ dự án", 30],
];
const sandbox = {
  standardNhanVienTongHopGpmbKpiCriteria: () => expectedCriteria.map(([name, weight]) => [name, weight]),
};
vm.createContext(sandbox);
vm.runInContext(extractFunction("applyNhanVienTongHopGpmbKpiCatalog"), sandbox);

const catalog = [
  {
    id: "nhan-vien-tong-hop-gpmb",
    departmentId: "gpmb",
    name: "Nhân viên tổng hợp",
    criteria: [["Tổng hợp số liệu/Tiến độ dự án", 50], ["Nhập liệu hồ sơ dự án", 50]],
  },
  { id: "can-bo-gpmb", departmentId: "gpmb", name: "Nhân viên", criteria: [["Điều tra", 100]] },
];
const migrated = sandbox.applyNhanVienTongHopGpmbKpiCatalog(catalog);
assert.deepEqual(
  Array.from(migrated[0].criteria, (criterion) => Array.from(criterion)),
  expectedCriteria,
  "Danh mục Nhân viên tổng hợp GPMB phải có đúng ba tiêu chí với trọng số 40/30/30.",
);
assert.deepEqual(
  Array.from(migrated[1].criteria, (criterion) => Array.from(criterion)),
  [["Điều tra", 100]],
  "Migration không được thay đổi danh mục KPI của vị trí khác.",
);

[
  "const NHAN_VIEN_TONG_HOP_GPMB_KPI_CATALOG_VERSION = \"2026-08-24-v1\";",
  "function migrateNhanVienTongHopGpmbKpiCatalog()",
  "sharedSyncSupportsNhanVienTongHopGpmbKpiCatalog",
  "nhanVienTongHopGpmbKpiCatalogVersion",
  "[\"Hỗ trợ dự án\", 30]",
].forEach((marker) => assert.ok(source.includes(marker), `Missing client KPI catalog safeguard: ${marker}`));

assert.ok(
  edgeSource.includes("nhanVienTongHopGpmbKpiCatalogVersion"),
  "Máy chủ phải đồng bộ mốc migration của Nhân viên tổng hợp GPMB.",
);
assert.ok(
  edgeSource.includes("const deploymentVersion = \"2026.10.21.1\""),
  "Máy chủ phải dùng phiên bản triển khai hỗ trợ migration danh mục KPI mới.",
);

console.log("nhan_vien_tong_hop_gpmb_kpi=passed");
