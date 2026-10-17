const assert = require("assert");
const fs = require("fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");

assert.match(edge, /const deploymentVersion = "2026\.10\.16\.1";/, "Máy chủ phải dùng phiên bản bảo vệ đồng bộ.");
assert.match(client, /function hasTrustedSharedChangeCheckpoint/, "Trình duyệt phải xác minh ảnh gốc trước khi gửi thay đổi đang chờ.");
assert.match(client, /function sharedPatchDeletesCriticalData/, "Trình duyệt phải nhận diện bản sao có nguy cơ xóa dữ liệu.");
assert.match(client, /function initializeEmptySharedServerFromImportedBackup/, "Khởi tạo máy chủ phải là thao tác khôi phục có chủ đích.");
assert.ok(!client.includes("canBootstrapCloudFromLocalState"), "Không được tự động khởi tạo máy chủ từ dữ liệu cục bộ.");
assert.match(client, /if \(serverUninitialized\) \{[\s\S]*?khong bao gio tu dong tai len may chu/, "Máy chủ rỗng phải chặn tải tự động từ thiết bị.");
assert.match(edge, /class UnsafeBulkDeletionError/, "Máy chủ phải có lỗi chuyên biệt cho xóa hàng loạt.");
assert.match(edge, /function patchRemovesUnsafeAmountOfData/, "Máy chủ phải kiểm tra xóa hàng loạt trước khi lưu.");
assert.match(edge, /if \(current\.revision <= 0\) throw new SharedStateUninitializedError/, "Máy chủ phải từ chối mutation khi dữ liệu trung tâm chưa được khởi tạo.");
assert.match(edge, /action === "initialize" && request\.method === "POST"/, "Khởi tạo phải là endpoint riêng dành cho Admin.");
assert.match(edge, /if \(current\.revision > 0\) return json\(request, \{ error: "Central data has already been initialized\." \}, 409\);/, "Không được dùng endpoint khởi tạo để ghi đè dữ liệu đang có.");
assert.match(php, /if \(\$current\['revision'\] === 0 && !isAdminAccount\(\$actor\)\)/, "API PHP dự phòng chỉ cho Admin khởi tạo dữ liệu trung tâm.");
assert.match(php, /stateReplacementRemovesUnsafeAmountOfData/, "API PHP dự phòng phải chặn bản ghi đè làm mất dữ liệu hàng loạt.");

console.log("shared_state_protection=passed");
