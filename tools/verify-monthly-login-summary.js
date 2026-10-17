const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

assert.match(client, /function monthlyWorkReportLoginMetrics/, "Ứng dụng phải tổng hợp lượt đăng nhập theo nhân sự và phòng.");
assert.match(client, /sharedJsonRequest\("monthly-login-summary"/, "Ứng dụng phải tải số liệu theo đúng kỳ báo cáo.");
assert.match(client, /Lượt đăng nhập/, "Mẫu PDF phải có chỉ số lượt đăng nhập.");
assert.match(edge, /const deploymentVersion = "2026\.10\.16\.1";/, "Máy chủ phải công bố bản có thống kê đăng nhập báo cáo tháng.");
assert.match(edge, /async function monthlyLoginReportSummary/, "Máy chủ phải tổng hợp đăng nhập theo tháng.");
assert.match(edge, /function monthlyWorkReportAccountIsIncluded/, "Máy chủ phải loại Ban giám đốc từ dữ liệu đăng nhập của báo cáo.");
assert.match(edge, /action === "monthly-login-summary" && request\.method === "GET"/, "Máy chủ phải có điểm đọc thống kê tháng.");
assert.match(edge, /canViewMonthlyWorkReport\(account\)/, "Điểm đọc phải giới hạn cho Admin và Ban giám đốc.");
assert.match(edge, /!Boolean\(account\.disabled\)/, "Không được tính tài khoản đã vô hiệu hóa.");

console.log("monthly_login_summary=passed");
