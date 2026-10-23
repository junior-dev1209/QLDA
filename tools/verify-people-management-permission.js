const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const syncFunction = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

assert.ok(html.includes('id="accountCanManagePeople"'), "Thiếu lựa chọn cấp quyền quản lý Nhân sự cho tài khoản.");
assert.ok(html.includes('id="peopleDepartmentFilter"'), "Mục Nhân sự phải có bộ lọc phòng.");
assert.ok(html.includes("Quản lý Nhân sự (thêm, sửa, xóa)"), "Nhãn quyền Nhân sự phải nêu rõ phạm vi CRUD.");
assert.match(client, /peopleWrite: grants\.peopleWrite === true/, "Client phải chuẩn hóa quyền peopleWrite.");
assert.match(client, /function canEditPeople\(\)[\s\S]*?accountAccessGrants\(\)\.peopleWrite/, "Quyền peopleWrite phải cho phép chỉnh sửa Nhân sự.");
assert.match(client, /viewId === "people" && accountAccessGrants\(account\)\.peopleWrite/, "Quyền peopleWrite phải mở được mục Nhân sự khi vai trò mặc định không có quyền xem.");
assert.match(client, /peopleWrite: byId\("accountCanManagePeople"\)\.checked/, "Admin phải lưu được quyền peopleWrite cùng tài khoản.");
assert.match(client, /byId\("peopleDepartmentFilter"\)\.addEventListener\("change", renderPeopleTable\)/, "Thay đổi phòng phải lọc lại danh sách nhân sự.");
assert.match(client, /const basePeople = visiblePeopleForPeopleView\(\);[\s\S]*?renderPeopleDepartmentFilterOptions\(basePeople\)/, "Danh sách phòng lọc phải dựa trên nhân sự đã được giới hạn quyền xem.");
assert.match(client, /if \(selectedDepartment && personDepartment !== selectedDepartment\) return false;/, "Bộ lọc phòng phải áp dụng trước khi kết xuất từng nhân sự.");

const permissionSandbox = {
  currentAccount: () => ({ role: "employee", accessGrants: { peopleWrite: true } }),
  canViewAllData: () => false,
};
vm.createContext(permissionSandbox);
vm.runInContext(extractFunction(client, "accountAccessGrants"), permissionSandbox);
vm.runInContext(extractFunction(client, "canEditPeople"), permissionSandbox);
assert.equal(permissionSandbox.accountAccessGrants().peopleWrite, true, "Quyền peopleWrite phải được đọc từ tài khoản.");
assert.equal(permissionSandbox.canEditPeople(), true, "Tài khoản được cấp peopleWrite phải có quyền thêm, sửa và xóa Nhân sự.");

const filterSelect = { value: "g" };
const filterSandbox = {
  departments: [
    { id: "g", name: "Phòng GPMB" },
    { id: "k", name: "Phòng KHTH" },
  ],
  byId: () => filterSelect,
  departmentById: (id) => filterSandbox.departments.find((department) => department.id === id),
  fillSelect: (select, options, selected) => {
    select.options = options;
    select.value = options.some((option) => option.value === selected) ? selected : options[0]?.value || "";
  },
};
vm.createContext(filterSandbox);
vm.runInContext(extractFunction(client, "renderPeopleDepartmentFilterOptions"), filterSandbox);
assert.equal(filterSandbox.renderPeopleDepartmentFilterOptions([
  { departmentId: "g" },
  { departmentId: "legacy" },
]).valueOf(), "g", "Bộ lọc phải giữ lựa chọn hợp lệ và chỉ liệt kê phòng trong dữ liệu được phép xem.");
assert.deepEqual(JSON.parse(JSON.stringify(filterSelect.options)), [
  { value: "", label: "Tất cả phòng" },
  { value: "g", label: "Phòng GPMB" },
  { value: "__unassigned__", label: "Chưa cập nhật phòng" },
]);

assert.match(syncFunction, /peopleWrite: grants\.peopleWrite === true/, "Máy chủ phải chuẩn hóa quyền peopleWrite.");
assert.match(syncFunction, /function canManagePeople\(state: JsonRecord, actor: JsonRecord\)/, "Máy chủ phải có kiểm tra quyền quản lý Nhân sự riêng.");
assert.match(syncFunction, /if \(collection === "people"\) return canManagePeople\(state, actor\);/, "Máy chủ phải dùng quyền peopleWrite khi thêm hoặc sửa Nhân sự.");
assert.match(syncFunction, /if \(collection === "people"\) return canManagePeople\(state, actor\) && !personHasRetainedReferences\(state, recordId\(previous\)\);/, "Máy chủ chỉ được xóa vĩnh viễn hồ sơ nhân sự không còn dữ liệu nghiệp vụ cần lưu.");

console.log("people_management_permission=passed");
