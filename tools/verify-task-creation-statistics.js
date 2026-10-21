const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const state = {
  people: [
    { id: "person-a", departmentId: "dept-a" },
    { id: "person-b", departmentId: "dept-b" },
  ],
  accounts: [
    { id: "account-a", displayName: "Nguyễn Văn A", username: "nguyenvana", personId: "person-a", departmentId: "dept-a" },
    { id: "account-b", displayName: "Trần Văn B", username: "tranvanb", personId: "person-b", departmentId: "dept-b" },
    { id: "account-c", displayName: "Tài khoản đã khóa", username: "locked", personId: "", departmentId: "dept-b", disabled: true },
  ],
  tasks: [
    { id: "task-a-id", createdById: "account-a", ownerId: "person-b", createdAt: "2026-08-20T01:00:00Z" },
    { id: "task-a-person", createdById: "person-a", ownerId: "person-a", createdAt: "2026-08-21T01:00:00Z" },
    { id: "task-b-name", createdBy: "tranvanb", ownerId: "person-b", createdAt: "2026-08-19T01:00:00Z" },
    { id: "task-c-locked", createdById: "account-c", createdAt: "2026-08-18T01:00:00Z" },
    { id: "task-unknown", createdBy: "Hệ thống cũ", ownerId: "person-a", createdAt: "2026-08-17T01:00:00Z" },
  ],
};

const sandbox = {
  state,
  personById: (id) => state.people.find((person) => person.id === id),
  taskParticipantIds: (task) => task.ownerId ? [task.ownerId] : [],
  normalizeSearchText: (value) => String(value || "").toLocaleLowerCase("vi").trim(),
};
vm.createContext(sandbox);
[
  "accountDepartmentIdForStatistics",
  "taskCreatorAccountLookup",
  "taskCreatorAccount",
  "accountTaskCreationStatistics",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const all = sandbox.accountTaskCreationStatistics();
assert.equal(all.totalCreated, 4, "Phải thống kê công việc của cả tài khoản đang dùng và đã khóa.");
assert.equal(all.totalRelated, 6, "Công việc được tạo hoặc có người thực hiện/phối hợp phải được tính là liên quan.");
assert.equal(all.unidentifiedCount, 1, "Công việc cũ không nhận diện được người tạo phải được tách riêng.");
assert.equal(all.rows.find((row) => row.account.id === "account-a").createdCount, 2, "Mã tài khoản và mã nhân sự cũ phải cùng nhận diện đúng người tạo.");
assert.equal(all.rows.find((row) => row.account.id === "account-a").relatedCount, 3, "Người tạo và người thực hiện phải được tính công việc liên quan theo bản ghi duy nhất.");
assert.equal(all.rows.find((row) => row.account.id === "account-b").createdCount, 1, "Tên đăng nhập cũ phải nhận diện đúng người tạo.");
assert.equal(all.rows.find((row) => row.account.id === "account-b").relatedCount, 2, "Người thực hiện phải có đủ công việc được giao từ tài khoản khác.");
assert.equal(all.rows.find((row) => row.account.id === "account-c").createdCount, 1, "Tài khoản đã khóa vẫn phải có số liệu lịch sử.");

const departmentA = sandbox.accountTaskCreationStatistics("dept-a");
assert.equal(departmentA.totalCreated, 2, "Lọc phòng phải chỉ tính các tài khoản thuộc phòng được chọn.");
assert.equal(departmentA.totalRelated, 3, "Lọc phòng phải tính cả công việc người thực hiện hoặc phối hợp thuộc phòng được chọn.");
assert.equal(departmentA.unidentifiedCount, 0, "Không đưa dữ liệu chưa xác định vào phòng bất kỳ.");

[
  "function accountTaskCreationStatistics(departmentId = \"\")",
  "function renderAccountTaskCreationStatistics()",
].forEach((marker) => assert.ok(source.includes(marker), `Missing task-creation statistic safeguard: ${marker}`));
assert.ok(html.includes('id="accountTaskCreationList"'), "Missing task-creation statistic panel.");

console.log("task_creation_statistics=passed");
