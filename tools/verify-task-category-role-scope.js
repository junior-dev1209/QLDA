const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Thiếu hàm ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const roles = [
  { id: "role-one", departmentId: "alpha", criteria: [["Nhiệm vụ A1", 50], ["Nhiệm vụ A2", 50]] },
  { id: "role-two", departmentId: "beta", criteria: [["Nhiệm vụ B1", 50], ["Nhiệm vụ B2", 50]] },
  { id: "legacy-role-new", departmentId: "du-an-1", criteria: [["Nhiệm vụ dự án", 100]] },
];
const people = [
  { id: "person-a", departmentId: "alpha", roleId: "ROLE-ONE" },
  { id: "person-b", departmentId: "beta", roleId: "role-two" },
  { id: "person-legacy", departmentId: "du-an-1", roleId: "legacy-role" },
  { id: "person-unknown", departmentId: "alpha", roleId: "missing-role" },
  { id: "person-mismatch", departmentId: "alpha", roleId: "role-two" },
];
const elements = {
  taskOwner: { value: "person-a" },
  taskCategory: { value: "Nhiệm vụ B1", options: [] },
  taskId: { value: "" },
  assignmentTaskOwner: { value: "person-a" },
  assignmentTaskCategory: { value: "" , options: [] },
  assignmentTaskId: { value: "" },
};
const sandbox = {
  roles,
  state: { tasks: [] },
  personById: (id) => people.find((person) => person.id === id) || null,
  taskParticipantPersonId: (id) => String(id || ""),
  normalizeTaskKind: () => "regular",
  isGpmbWorkflowTask: () => false,
  isAdmin: () => true,
  normalizeSearchText: (value) => String(value || "").toLocaleLowerCase("vi"),
  byId: (id) => elements[id] || null,
  fillSelect: (select, options, selected) => {
    select.options = options;
    select.value = String(selected ?? "");
  },
};

vm.createContext(sandbox);
[
  "taskCategoryRoleForPerson",
  "taskCategoryOptionsForPerson",
  "updateTaskCategoryOptions",
  "migrateTaskCategoriesForCatalogChange",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

assert.deepEqual(
  Array.from(sandbox.taskCategoryOptionsForPerson("person-a")),
  ["Nhiệm vụ A1", "Nhiệm vụ A2"],
  "Danh mục phải dùng đúng chức vụ trong phòng của người được giao, không lấy bộ tiêu chí cùng mã ở phòng khác.",
);
assert.deepEqual(
  Array.from(sandbox.taskCategoryOptionsForPerson("person-b")),
  ["Nhiệm vụ B1", "Nhiệm vụ B2"],
  "Hai vị trí/phòng khác nhau không được dùng lẫn danh mục.",
);
assert.deepEqual(
  Array.from(sandbox.taskCategoryOptionsForPerson("person-legacy")),
  ["Nhiệm vụ dự án"],
  "Mã chức vụ cũ chỉ được ánh xạ tới một chức vụ duy nhất trong đúng phòng.",
);
assert.deepEqual(
  Array.from(sandbox.taskCategoryOptionsForPerson("person-unknown")),
  [],
  "Không được đưa danh mục chung của vị trí khác vào khi chức vụ chưa được cấu hình.",
);
assert.deepEqual(
  Array.from(sandbox.taskCategoryOptionsForPerson("person-mismatch")),
  [],
  "Mã chức vụ đang trỏ sang phòng khác phải bị từ chối thay vì lấy nhầm danh mục.",
);

sandbox.updateTaskCategoryOptions("Nhiệm vụ B1");
assert.deepEqual(
  Array.from(elements.taskCategory.options, (option) => option.value),
  ["Nhiệm vụ A1", "Nhiệm vụ A2"],
  "Form tạo mới không được giữ danh mục thuộc người thực hiện trước đó.",
);
assert.equal(elements.taskCategory.value, "Nhiệm vụ A1", "Form tạo mới phải chọn một danh mục hợp lệ của vị trí hiện tại.");

elements.taskId.value = "existing-task";
elements.taskCategory.value = "Nhiệm vụ B1";
sandbox.updateTaskCategoryOptions("Nhiệm vụ B1");
assert.deepEqual(
  Array.from(elements.taskCategory.options, (option) => option.value),
  ["Nhiệm vụ B1", "Nhiệm vụ A1", "Nhiệm vụ A2"],
  "Biểu mẫu chỉnh sửa phải giữ giá trị cũ cần ánh xạ, thay vì âm thầm đổi danh mục.",
);
assert.equal(elements.taskCategory.value, "Nhiệm vụ B1", "Form chỉnh sửa phải giữ lại mục cũ cho đến khi có ánh xạ chính xác.");

sandbox.state.tasks = [
  { id: "renamed-category-task", ownerId: "person-a", category: "Nhiệm vụ A1" },
  { id: "other-role-category-task", ownerId: "person-a", category: "Nhiệm vụ B1" },
  { id: "current-task", ownerId: "person-a", category: "Nhiệm vụ A2" },
  { id: "unknown-role-task", ownerId: "person-unknown", category: "Danh mục cũ" },
];
const updatedRoles = roles.map((role) => role.id === "role-one"
  ? { ...role, criteria: [["Nhiệm vụ A1 mới", 50], ["Nhiệm vụ A2", 50]] }
  : role);
assert.equal(sandbox.migrateTaskCategoriesForCatalogChange(roles, updatedRoles), 1, "Đổi tên danh mục phải cập nhật công việc theo mục tương ứng cùng vị trí.");
assert.equal(sandbox.state.tasks[0].category, "Nhiệm vụ A1 mới", "Công việc chọn mục cũ phải chuyển đúng sang mục mới được chỉnh từ mục đó.");
assert.equal(sandbox.state.tasks[0].categoryCatalogUpdatedAt.length > 0, true, "Cần lưu dấu thời điểm đồng bộ danh mục.");
assert.equal(sandbox.state.tasks[1].category, "Nhiệm vụ B1", "Danh mục khác vị trí không được chuyển sang danh mục đầu tiên.");
assert.equal(sandbox.state.tasks[2].category, "Nhiệm vụ A2", "Danh mục không đổi phải được giữ nguyên.");
assert.equal(sandbox.state.tasks[3].category, "Danh mục cũ", "Không được đoán danh mục khi chức vụ chưa có cấu hình.");
sandbox.state.tasks = [{ id: "reordered-category-task", ownerId: "person-a", category: "Nhiệm vụ A1" }];
const reorderedRoles = roles.map((role) => role.id === "role-one"
  ? { ...role, criteria: [["Nhiệm vụ A2", 50], ["Nhiệm vụ A1", 50]] }
  : role);
assert.equal(sandbox.migrateTaskCategoriesForCatalogChange(roles, reorderedRoles), 0, "Chỉ sắp xếp lại thứ tự không được coi là đổi tên danh mục.");
assert.equal(sandbox.state.tasks[0].category, "Nhiệm vụ A1", "Danh mục còn tồn tại phải được giữ nguyên dù vị trí thay đổi.");
sandbox.state.tasks = [{ id: "case-change-task", ownerId: "person-a", category: "Nhiệm vụ A1" }];
const recasedRoles = roles.map((role) => role.id === "role-one"
  ? { ...role, criteria: [["nhiệm vụ A1", 50], ["Nhiệm vụ A2", 50]] }
  : role);
assert.equal(sandbox.migrateTaskCategoriesForCatalogChange(roles, recasedRoles), 1, "Đổi tên danh mục chỉ khác kiểu chữ vẫn phải đồng bộ giá trị chính xác.");
assert.equal(sandbox.state.tasks[0].category, "nhiệm vụ A1", "Giá trị danh mục phải khớp chính xác tên mới.");

console.log("task_category_role_scope=passed");
