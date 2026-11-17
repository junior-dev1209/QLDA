const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function recurringCreator(task, owner, accounts) {
  const recurrence = String(task.recurrence || "").toLowerCase();
  const recurringValues = ["daily", "weekly", "monthly", "quarterly", "hàng ngày", "hàng tuần", "hàng tháng", "hàng quý", "hang ngay", "hang tuan", "hang thang", "hang quy"];
  if (task.kind !== "regular" || !recurringValues.includes(recurrence)) return null;
  const account = accounts.find((item) => !item.disabled && item.personId === owner.id);
  return { id: account?.id || owner.id, name: owner.name };
}

const owner = { id: "person-huong", name: "Nguyễn Thu Hương" };
const accounts = [{ id: "account-huong", personId: "person-huong", disabled: false }];
for (const recurrence of ["daily", "weekly", "monthly", "quarterly"]) {
  assert.deepEqual(
    recurringCreator({ kind: "regular", recurrence }, owner, accounts),
    { id: "account-huong", name: "Nguyễn Thu Hương" },
    `${recurrence}: Người tạo phải là người thực hiện, không phải người đang đăng nhập.`,
  );
}
assert.deepEqual(
  recurringCreator({ kind: "regular", recurrence: "Hàng tháng" }, owner, accounts),
  { id: "account-huong", name: "Nguyễn Thu Hương" },
  "Mẫu định kỳ cũ ghi theo nhãn tiếng Việt cũng phải nhận đúng người tạo.",
);
assert.equal(recurringCreator({ kind: "regular", recurrence: "none" }, owner, accounts), null, "Việc không định kỳ phải giữ nguyên quy tắc người tạo.");
assert.deepEqual(
  recurringCreator({ kind: "regular", recurrence: "weekly" }, owner, []),
  { id: "person-huong", name: "Nguyễn Thu Hương" },
  "Nhân sự chưa có tài khoản vẫn phải được ghi nhận đúng tên.",
);

assert.match(client, /function recurringTaskCreatorForOwner\(task\)/, "Khách phải nhận diện người tạo theo người thực hiện cho việc định kỳ.");
assert.match(client, /const recurringCreator = recurringTaskCreatorForOwner\(audited\);[\s\S]*?audited\.createdBy = recurringCreator\.name;/, "Công việc định kỳ mới phải được đóng dấu đúng ngay tại giao diện.");
assert.match(client, /function taskRecordedCreatorName\(task, fallback = "Chưa ghi nhận"\)/, "Bản ghi định kỳ cũ phải hiển thị đúng người thực hiện.");
assert.match(client, /<strong>Người tạo<\/strong>\$\{escapeHtml\(taskRecordedCreatorName\(task\)\)\}/, "Màn hình chi tiết phải dùng tên người tạo đã chuẩn hóa.");
assert.match(edge, /function recurringTaskCreator\(state: JsonRecord, task: JsonRecord\)/, "Máy chủ phải tự quyết định người tạo bản ghi định kỳ.");
assert.match(edge, /saved\.createdBy = recurringCreator\?\.name \|\| String\(actor\.displayName/, "Máy chủ không được tin dữ liệu người tạo do trình duyệt gửi lên.");
assert.match(edge, /else if \(recurringCreator\) \{[\s\S]*?saved\.createdBy = recurringCreator\.name;/, "Bản ghi định kỳ cũ phải được sửa đúng khi có lần cập nhật hợp lệ tiếp theo.");

console.log("recurring_task_creator=passed");
