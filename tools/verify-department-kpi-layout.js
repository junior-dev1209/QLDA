const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

assert.ok(
  html.includes('id="departmentCriteriaInputs" class="criteria-grid"'),
  "Khu vực tiêu chí KPI phòng phải được giữ riêng để áp dụng bố cục chuyên biệt.",
);
assert.ok(
  styles.includes("#departmentCriteriaInputs {\n  grid-template-columns: minmax(0, 1fr);"),
  "Tiêu chí KPI phòng phải sử dụng toàn bộ chiều ngang khung thay vì lưới bốn cột chung.",
);
assert.ok(
  styles.includes("#departmentCriteriaInputs .department-criteria-item {\n  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);"),
  "Thẻ tiêu chí KPI phòng phải có không gian riêng cho số liệu và kết quả.",
);
assert.ok(
  styles.includes("#departmentCriteriaInputs .criteria-input-grid {\n  grid-column: 1;"),
  "Kế hoạch và thực hiện phải nằm trong vùng số liệu dễ đọc.",
);
assert.ok(
  styles.includes("#departmentCriteriaInputs .criteria-calculated {\n  grid-column: 2;"),
  "Kết quả hoàn thành và điểm phải được đặt cạnh số liệu nguồn.",
);
assert.ok(
  styles.includes("@media (max-width: 720px) {\n  #departmentCriteriaInputs .department-criteria-item {\n    grid-template-columns: 1fr;"),
  "Bố cục KPI phòng phải thu về một cột trên màn hình hẹp.",
);

console.log("department_kpi_layout=passed");
