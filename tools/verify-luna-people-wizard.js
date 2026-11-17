const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("script.js", "utf8");

assert.match(html, /id="personForm"[\s\S]*?id="personName"[\s\S]*?id="personDepartment"[\s\S]*?id="personRole"/, "Luồng Luna phải dùng biểu mẫu Nhân sự chuẩn của hệ thống.");
assert.match(assistant, /function isPeopleCreationIntent\(text\)[\s\S]*?\bnhan su\b[\s\S]*?startPeopleWizard\(\)/, "Lệnh tạo hoặc thêm nhân sự phải mở luồng đồng hành trước khi xử lý các lệnh khác.");
assert.match(assistant, /function startPeopleWizard\(\)[\s\S]*?canEditPeople\(\)[\s\S]*?openPersonForm[\s\S]*?buildPersonWizardSteps\(\)[\s\S]*?Cùng thêm nhân sự/, "Luna phải kiểm tra quyền, mở biểu mẫu thật và khởi tạo các bước thêm nhân sự.");
assert.match(assistant, /function taskWizardCanSave\(\)[\s\S]*?mode === "people"\) return typeof canEditPeople === "function" && canEditPeople\(\)/, "Quyền thêm nhân sự phải được kiểm tra lại trước mỗi bước và trước khi lưu.");
assert.match(assistant, /function buildPersonWizardSteps\(\)[\s\S]*?key: "name"[\s\S]*?key: "department"[\s\S]*?key: "role"[\s\S]*?key: "contract"[\s\S]*?key: "note"/, "Wizard Nhân sự phải hỏi lần lượt các trường chính của biểu mẫu.");
assert.match(assistant, /function applyPeopleWizardAnswer\(step, transcript\)[\s\S]*?dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/, "Câu trả lời của người dùng phải kích hoạt các listener sẵn có của biểu mẫu Nhân sự.");
assert.match(assistant, /if \(taskWizard\.mode === "people"\) return applyPeopleWizardAnswer\(step, transcript\)/, "Câu trả lời từ micro và bàn phím phải đi qua cùng bộ điền Nhân sự.");
assert.match(assistant, /window\.virtualAssistantPersonWizardSaved = \(personId\)[\s\S]*?mode !== "people"[\s\S]*?thông tin nhân sự đã được lưu/, "Luna chỉ báo thành công khi luồng lưu Nhân sự chuẩn đã hoàn tất.");
assert.match(assistant, /document\.addEventListener\("person-record-saved"[\s\S]*?virtualAssistantPersonWizardSaved/, "Sự kiện lưu Nhân sự hiện có phải được dùng để kết thúc wizard đúng thời điểm.");
assert.match(app, /document\.dispatchEvent\(new CustomEvent\("person-record-saved", \{ detail: \{ personId: id \} \}\)\)/, "Luồng lưu Nhân sự chuẩn phải phát tín hiệu hoàn tất sau khi đã lưu dữ liệu.");

const extract = (startName, endName) => {
  const start = assistant.indexOf(`function ${startName}(`);
  const end = assistant.indexOf(`function ${endName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `Không tìm thấy ranh giới ${startName}.`);
  return assistant.slice(start, end);
};

const option = (value, textContent) => ({ value, textContent, disabled: false });
const makeField = (value = "", options = []) => ({
  value,
  options,
  disabled: false,
  dispatchEvent() {},
});
const fields = {
  personName: makeField(),
  personGender: makeField("", [option("Nam", "Nam"), option("Nữ", "Nữ")]),
  personDepartment: makeField("", [option("gpmB", "Phòng GPMB"), option("ktht", "Phòng Kế hoạch")]),
  personRole: makeField("", [option("employee", "Nhân viên"), option("manager", "Trưởng phòng")]),
  personSectionHead: makeField("", [option("head-1", "Nguyễn Văn Huy")]),
  personContract: makeField("Biên chế", [option("Biên chế", "Biên chế"), option("Hợp đồng chuyên môn", "Hợp đồng chuyên môn"), option("Hợp đồng khoán/thời vụ", "Hợp đồng khoán/thời vụ")]),
  personQualification: makeField(),
  personContractTerm: makeField(),
  personContractSignedDate: makeField(),
  personPhone: makeField(),
  personBirthDate: makeField(),
  personSalaryCoefficient: makeField(),
  personSalaryGrade: makeField(),
  personSalaryReviewDate: makeField(),
  personAddress: makeField(),
  personNote: makeField(),
};
const runtime = {
  Date,
  Event: class Event {},
  taskWizard: { mode: "people" },
  document: {
    getElementById: (id) => fields[id],
  },
};
vm.createContext(runtime);
vm.runInContext([
  `function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\\s+/g, " ").trim();
  }`,
  extract("draftDate", "taskWizardAddress"),
  extract("taskWizardField", "buildTaskWizardSteps"),
  extract("uniqueDraftMatch", "takeTaskClause"),
  extract("taskWizardSelectOption", "applyTaskWizardAnswer"),
  extract("applyTaskWizardAnswer", "handleTaskWizardTranscript"),
].join("\n"), runtime);

assert.equal(runtime.applyTaskWizardAnswer({ key: "name" }, "Nguyễn Minh Anh"), true);
assert.equal(fields.personName.value, "Nguyễn Minh Anh");
assert.equal(runtime.applyTaskWizardAnswer({ key: "gender", optional: true }, "Nữ"), true);
assert.equal(fields.personGender.value, "Nữ");
assert.equal(runtime.applyTaskWizardAnswer({ key: "department" }, "Phòng GPMB"), true);
assert.equal(fields.personDepartment.value, "gpmB");
assert.equal(runtime.applyTaskWizardAnswer({ key: "role" }, "Nhân viên"), true);
assert.equal(fields.personRole.value, "employee");
assert.equal(runtime.applyTaskWizardAnswer({ key: "contract" }, "Hợp đồng chuyên môn"), true);
assert.equal(fields.personContract.value, "Hợp đồng chuyên môn");
assert.equal(runtime.applyTaskWizardAnswer({ key: "birthDate", optional: true }, "ngày 15 tháng 8 năm 1994"), true);
assert.equal(fields.personBirthDate.value, "1994-08-15");
assert.equal(runtime.applyTaskWizardAnswer({ key: "salaryCoefficient", optional: true }, "2,34"), true);
assert.equal(fields.personSalaryCoefficient.value, "2.34");

console.log("luna_people_wizard=passed");
