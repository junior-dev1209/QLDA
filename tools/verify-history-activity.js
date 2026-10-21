const assert = require("assert");
const fs = require("fs");

const source = fs.readFileSync("script.js", "utf8");
const historyStart = source.indexOf("function renderHistory() {");
const historyEnd = source.indexOf("\nfunction dashboardDepartmentSituationRows", historyStart);
const history = source.slice(historyStart, historyEnd);

assert.ok(historyStart >= 0 && historyEnd > historyStart, "Thiếu luồng dựng Lịch sử.");
assert.ok(!history.includes("peopleIds.includes(task.ownerId)"), "Lịch sử phòng không được dùng biến peopleIds không tồn tại.");
assert.match(history, /taskHasParticipantInDepartment\(task, targetId\)/, "Lịch sử phòng phải gồm cả người thực hiện và người phối hợp.");
assert.match(history, /taskParticipantIds\(task\)\.includes\(targetId\)/, "Lịch sử nhân viên phải gồm cả công việc phối hợp.");
assert.match(source, /const relatedTask = activity\.targetType === "task"/, "Nhật ký công việc phải được đối chiếu lại với công việc thực tế.");
assert.match(source, /taskParticipantIds\(relatedTask\)\.includes\(targetId\)/, "Hoạt động của người phối hợp phải hiện trong lịch sử cá nhân.");
assert.match(source, /activity\.actorName \|\| activity\.createdBy \|\| activity\.updatedBy/, "Dòng thời gian phải hiển thị người thực hiện cho cả nhật ký máy chủ.");

console.log("history_activity=passed");
