const assert = require("assert");
const fs = require("fs");

const source = fs.readFileSync("script.js", "utf8");
const start = source.indexOf("function tokenizeKpiFormula");
const end = source.indexOf("function calculatePersonalFinalScore");
assert.ok(start >= 0 && end > start, "Không tìm thấy bộ phân tích công thức KPI giới hạn.");
assert.ok(!source.includes("new Function"), "Công thức KPI không được thực thi bằng mã JavaScript động.");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const evaluator = new Function("clamp", `${source.slice(start, end)}; return evaluateKpiFormula;`)(clamp);

assert.equal(
  evaluator("plan > 0 ? actual / plan * 100 : 0", { plan: 8, actual: 6 }, 0),
  75,
  "Công thức hoàn thành mặc định phải giữ nguyên kết quả.",
);
assert.equal(
  evaluator("clamp(completionPercent, 0, 120) / 100 * weight", { completionPercent: 130, weight: 40 }, 0),
  48,
  "Các hàm KPI được cho phép phải tính đúng.",
);
assert.equal(
  evaluator("min(actual, plan) + max(1, 2)", { plan: 8, actual: 6 }, 0),
  8,
  "Biểu thức số và hàm giới hạn phải tính đúng.",
);
assert.equal(
  evaluator("globalThis.process.exit()", { plan: 1 }, 99),
  99,
  "Công thức không được truy cập đối tượng toàn cục.",
);
assert.equal(
  evaluator("constructor.constructor('return 1')()", {}, 99),
  99,
  "Công thức không được tạo mã thực thi mới.",
);

console.log("kpi_formula_sandbox=passed");
