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
  personById: (id) => people.find((person) => person.id === id) || null,
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
assert.equal(elements.taskCategory.options[0].label, "Nhiệm vụ B1 (danh mục cũ, chưa khớp chức vụ)", "Dữ liệu lịch sử không khớp phải được đánh dấu rõ, không âm thầm đổi.");
assert.deepEqual(
  Array.from(elements.taskCategory.options.slice(1), (option) => option.value),
  ["Nhiệm vụ A1", "Nhiệm vụ A2"],
  "Danh mục mới trong màn hình sửa vẫn phải theo đúng chức vụ hiện tại.",
);

console.log("task_category_role_scope=passed");
