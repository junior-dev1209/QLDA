const STORAGE_KEY = "phuc-thinh-workforce-kpi-v1";
const SESSION_KEY = "phuc-thinh-current-account-v1";
const APP_VERSION = "3.0.35";
const LOGIN_GUARD_KEY = "phuc-thinh-login-guard-v1";
const ACTIVE_VIEW_KEY_PREFIX = "phuc-thinh-active-view-v1";
const SIDEBAR_COLLAPSED_KEY = "phuc-thinh-sidebar-collapsed-v1";
const CUSTOMIZE_MODE_KEY = "phuc-thinh-customize-mode-v1";
const CUSTOMIZATION_LAYOUT_RESTORE_KEY = "phuc-thinh-custom-layout-restore-v159";
const BINARY_STORAGE_DB = "phuc-thinh-kpi-binary-v1";
const BINARY_STORAGE_VERSION = 2;
const BINARY_STORAGE_STORE = "files";
const BINARY_STORAGE_META_STORE = "sync-meta";
const DURABLE_APP_STATE_ID = "app-state";
const SHARED_SYNC_CHECKPOINT_ID = "shared-sync-checkpoint";
const SHARED_SYNC_ENDPOINT = "api/sync.php";
const SHARED_SYNC_CONFLICT_KEY = "phuc-thinh-shared-sync-conflict-v1";
const SHARED_SYNC_REQUIRED_KEY = "phuc-thinh-shared-sync-required-v1";
const SHARED_SYNC_SESSION_TOKEN_KEY = "phuc-thinh-shared-sync-session-v1";
const SHARED_SYNC_DIRTY_KEY = "phuc-thinh-shared-sync-dirty-v1";
const OFFLINE_LOGIN_PROOFS_KEY = "phuc-thinh-offline-login-proofs-v1";
const OFFLINE_ACCOUNT_DIRECTORY_KEY = "phuc-thinh-offline-account-directory-v1";
const OFFLINE_ADMIN_STATE_SNAPSHOT_ID = "offline-admin-state";
const STATE_SAVED_AT_KEY = "phuc-thinh-state-saved-at-v1";
// Poll less often while a tab is idle. Focus/online events still refresh at
// once, and the server returns only a revision check when nothing changed.
const SHARED_SYNC_REFRESH_MS = 20000;
const SHARED_SYNC_REFRESH_JITTER_MS = 5000;
const SHARED_SYNC_RETRY_INITIAL_MS = 2500;
const SHARED_SYNC_RETRY_MAX_MS = 60000;
const SHARED_SYNC_REQUEST_TIMEOUT_MS = 20000;
const ACCOUNT_USAGE_REQUEST_TIMEOUT_MS = 45000;
const ACCOUNT_USAGE_AUTO_REFRESH_MS = 60000;
const OFFLINE_LOGIN_PROOF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OFFLINE_ADMIN_STATE_MAX_AGE_MS = OFFLINE_LOGIN_PROOF_MAX_AGE_MS;
const OFFLINE_LOGIN_PBKDF2_ITERATIONS = 120000;
const OFFLINE_LOGIN_PROOF_MAX_ENTRIES = 500;
const MAX_DELETED_ID_HISTORY = 2000;
const ACCOUNT_PRESENCE_HEARTBEAT_MS = 60000;
const SHARED_SYNC_COLLECTIONS = ["people", "tasks", "projectCatalog", "bulletins", "archiveRecords", "evaluations", "departmentEvaluations", "accounts", "supportRequests", "activityLog"];
const SHARED_SYNC_SCALAR_FIELDS = [
  "moduleSettings",
  "systemCustomization",
  "departments",
  "roles",
  "behaviorRules",
  "importedPeopleVersion",
  "canBoGpmbKpiCatalogVersion",
  "sectionHeadKpiCatalogVersion",
  "personalKpiClassificationVersion",
  "deletedIds",
];
function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const IMPORTED_PEOPLE_VERSION = "excel-2026-05-07-v1";
const CAN_BO_GPMB_KPI_CATALOG_VERSION = "2026-08-12-v2";
const SECTION_HEAD_KPI_CATALOG_VERSION = "2026-08-21-v2";
const PERSONAL_KPI_CLASSIFICATION_VERSION = "2026-08-21-v5";
const SECTION_HEAD_PERSONAL_CRITERION = "Hoàn thành kế hoạch công việc";
const SECTION_HEAD_TEAM_CRITERION = "Kiểm soát và đảm bảo tiến độ công việc nhóm";
const sectionHeadKpiCriteria = [
  [SECTION_HEAD_PERSONAL_CRITERION, 50],
  [SECTION_HEAD_TEAM_CRITERION, 50],
];

function standardSectionHeadKpiCriteria() {
  return sectionHeadKpiCriteria.map(([name, weight]) => [name, weight]);
}
// ... Toàn bộ logic hệ thống phía dưới giữ nguyên vẹn ...
const legacyCanBoGpmbTaskCategories = {
  "Kiểm đếm đất đai": "Điều tra, kiểm đếm đất đai / Trích đo, quy chủ",
  "Xác minh nguồn gốc đất": "Xác minh nguồn gốc / Thông báo thu hồi đất",
  "Lập phương án bồi thường": "Lập / Thẩm định / Phê duyệt phương án bồi thường",
  "Niêm yết công khai": "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  "Chi trả tiền đền bù": "Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư",
  "Bàn giao mặt bằng": "Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư",
  "Xử lý đơn thư": "Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư",
};
const importedPeopleFromExcel = Array.isArray(window.PHUC_THINH_IMPORTED_PEOPLE) ? window.PHUC_THINH_IMPORTED_PEOPLE : [];

const defaultDepartments = [
  {
    id: "ke-hoach",
    name: "phòng KHTH",
    criteria: [
      ["Tỷ lệ kế hoạch lập đúng hạn", 20],
      ["Độ chính xác kế hoạch", 15],
      ["Tổng hợp báo cáo đúng hạn", 15],
      ["Điều phối tiến độ dự án", 20],
      ["Tham mưu UBND xã", 10],
      ["Chuyển đổi số hồ sơ điện tử", 10],
      ["Phối hợp nội bộ", 10],
    ],
  },
  {
    id: "du-an-1",
    name: "Phòng Dự án 1",
    criteria: [
      ["Tiến độ tổng thể dự án", 20],
      ["Giải ngân vốn đầu tư", 15],
      ["Chất lượng nghiệm thu", 15],
      ["Kiểm soát phát sinh", 10],
      ["Kiểm soát chi phí", 10],
      ["Hồ sơ pháp lý", 10],
      ["Quản lý nhà thầu", 10],
      ["An toàn lao động", 5],
      ["Điều phối liên phòng", 5],
    ],
  },
  {
    id: "du-an-2",
    name: "Phòng Dự án 2",
    criteria: [
      ["Tỷ lệ dự án hoàn thành đúng hạn", 25],
      ["Khối lượng hồ sơ xử lý", 15],
      ["Chất lượng nghiệm thu", 15],
      ["Kiểm soát chi phí", 10],
      ["Hồ sơ pháp lý", 10],
      ["Quản lý nhà thầu", 10],
      ["Báo cáo tiến độ", 10],
      ["Phối hợp nội bộ", 5],
    ],
  },
  {
    id: "gpmb",
    name: "phòng GPMB",
    criteria: [
      ["Tỷ lệ bàn giao mặt bằng", 30],
      ["Tiến độ GPMB", 20],
      ["Hồ sơ bồi thường", 15],
      ["Khiếu nại người dân", 10],
      ["Chi trả bồi thường", 10],
      ["Phối hợp địa phương", 10],
      ["Báo cáo", 5],
    ],
  },
  {
    id: "ha-tang",
    name: "phòng QLHT",
    criteria: [
      ["Tỷ lệ công trình vận hành tốt", 25],
      ["Bảo trì đúng kế hoạch", 20],
      ["Xử lý sự cố", 15],
      ["Kiểm tra định kỳ", 10],
      ["Tiết kiệm chi phí", 10],
      ["Hồ sơ quản lý tài sản", 10],
      ["Phối hợp", 10],
    ],
  },
  {
    id: "ban-giam-doc",
    name: "Ban giám đốc",
    leadershipOnly: true,
    kpiExempt: true,
    criteria: [],
  },
];

const defaultRoles = [
  {
    id: "truong-phong-ke-hoach",
    departmentId: "ke-hoach",
    name: "Trưởng phòng KHTH",
    criteria: [
      ["Ban hành kế hoạch đúng hạn", 20],
      ["Báo cáo tổng hợp đúng hạn", 15],
      ["Theo dõi tiến độ toàn Ban", 15],
      ["Tỷ lệ hoàn thành chỉ đạo lãnh đạo", 20],
      ["Điều phối liên phòng", 10],
      ["Tham mưu lãnh đạo", 10],
      ["Chủ động cảnh báo rủi ro", 10],
    ],
  },
  {
    id: "chuyen-vien-ke-hoach",
    departmentId: "ke-hoach",
    name: "Chuyên viên Tổng hợp",
    criteria: [
      ["Báo cáo đúng hạn", 30],
      ["Tổng hợp dữ liệu chính xác", 20],
      ["Cập nhật tiến độ", 10],
      ["Soạn thảo văn bản", 10],
      ["Chủ động công việc", 10],
      ["Phối hợp nội bộ", 10],
      ["Tinh thần trách nhiệm", 10],
    ],
  },
  {
    id: "truong-bo-phan-quy-hoach",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Quy hoạch",
    criteria: [
      ["Tiến độ lập hồ sơ quy hoạch", 20],
      ["Hồ sơ được phê duyệt lần 1", 15],
      ["Tỷ lệ điều chỉnh quy hoạch", 10],
      ["Theo dõi tiến độ đơn vị tư vấn", 10],
      ["Tham mưu quy hoạch được chấp thuận", 10],
      ["Tỷ lệ hồ sơ số hóa", 5],
      ["Điều phối liên phòng", 10],
      ["Chủ động xử lý vướng mắc", 10],
      ["Năng lực quản lý nhân sự", 10],
    ],
  },
  {
    id: "chuyen-vien-quy-hoach",
    departmentId: "ke-hoach",
    name: "Chuyên viên Quy hoạch",
    criteria: [
      ["Hồ sơ lập đúng hạn", 25],
      ["Sai sót hồ sơ", 15],
      ["Hồ sơ trình duyệt đạt lần 1", 15],
      ["Cập nhật dữ liệu quy hoạch", 10],
      ["Hồ sơ bản vẽ chính xác", 5],
      ["Chủ động công việc", 10],
      ["Phối hợp nội bộ", 10],
      ["Tinh thần trách nhiệm", 10],
    ],
  },
  {
    id: "truong-bo-phan-dau-thau",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Đấu thầu",
    criteria: [
      ["Gói thầu đúng tiến độ", 20],
      ["Hồ sơ mời thầu chính xác", 15],
      ["Tiết kiệm qua đấu thầu", 10],
      ["Không phát sinh kiến nghị", 10],
      ["Báo cáo đúng hạn", 10],
      ["Tỷ lệ hồ sơ hợp lệ", 5],
      ["Minh bạch đấu thầu", 10],
      ["Điều phối tổ chuyên gia", 10],
      ["Xử lý tình huống", 10],
    ],
  },
  {
    id: "chuyen-vien-dau-thau",
    departmentId: "ke-hoach",
    name: "Chuyên viên Đấu thầu",
    criteria: [
      ["Hồ sơ hoàn thành đúng hạn", 25],
      ["Đăng tải đúng quy định", 15],
      ["Sai sót hồ sơ", 15],
      ["Đánh giá nhà thầu đúng quy định", 10],
      ["Cập nhật dữ liệu đấu thầu", 5],
      ["Tuân thủ pháp luật", 10],
      ["Phối hợp nội bộ", 10],
      ["Chủ động xử lý hồ sơ", 10],
    ],
  },
  {
    id: "truong-bo-phan-phap-che",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Pháp chế",
    criteria: [
      ["Hồ sơ pháp lý đúng quy định", 25],
      ["Xử lý vướng mắc pháp lý đúng hạn", 15],
      ["Không phát sinh sai phạm", 10],
      ["Văn bản tham mưu được áp dụng", 10],
      ["Báo cáo pháp lý đúng hạn", 10],
      ["Cảnh báo rủi ro pháp lý", 10],
      ["Hỗ trợ phòng ban", 10],
      ["Điều hành bộ phận", 10],
    ],
  },
  {
    id: "chuyen-vien-phap-che",
    departmentId: "ke-hoach",
    name: "Chuyên viên Pháp chế",
    criteria: [
      ["Thẩm tra hồ sơ đúng hạn", 30],
      ["Sai sót pháp lý", 20],
      ["Cập nhật văn bản pháp luật", 10],
      ["Hỗ trợ xử lý tranh chấp", 10],
      ["Tư duy pháp lý", 10],
      ["Phối hợp phòng ban", 10],
      ["Trách nhiệm công việc", 10],
    ],
  },
  {
    id: "truong-bo-phan-luu-tru",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Lưu trữ",
    criteria: [
      ["Hồ sơ lưu trữ đầy đủ", 25],
      ["Tỷ lệ số hóa hồ sơ", 20],
      ["Không thất lạc hồ sơ", 15],
      ["Kiểm tra kho định kỳ", 10],
      ["Điều phối nhân sự", 10],
      ["Kỷ luật bảo mật", 10],
      ["Chủ động cải tiến lưu trữ", 10],
    ],
  },
  {
    id: "nhan-vien-luu-tru",
    departmentId: "ke-hoach",
    name: "Nhân viên Lưu trữ",
    criteria: [
      ["Hồ sơ cập nhật đúng hạn", 30],
      ["Phân loại chính xác", 20],
      ["Số hóa tài liệu", 10],
      ["Hỗ trợ tra cứu", 10],
      ["Cẩn thận", 10],
      ["Kỷ luật bảo mật", 10],
      ["Phối hợp công việc", 10],
    ],
  },
  {
    id: "truong-bo-phan-tham-dinh",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Thẩm định",
    criteria: [
      ["Hồ sơ thẩm định đúng hạn", 30],
      ["Hồ sơ đạt lần 1", 20],
      ["Kiểm soát chi phí", 10],
      ["Báo cáo đúng hạn", 10],
      ["Kiểm soát rủi ro", 10],
      ["Phối hợp nội bộ", 10],
      ["Điều hành bộ phận", 10],
    ],
  },
  {
    id: "chuyen-vien-tham-dinh",
    departmentId: "ke-hoach",
    name: "Chuyên viên Thẩm định",
    criteria: [
      ["Hồ sơ xử lý đúng hạn", 35],
      ["Sai sót thẩm định", 20],
      ["Độ chính xác đơn giá", 10],
      ["Tuân thủ pháp luật", 5],
      ["Tư duy phân tích", 10],
      ["Chủ động công việc", 10],
      ["Trách nhiệm", 10],
    ],
  },
  {
    id: "truong-bo-phan-hcns",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận HCNS",
    criteria: [
      ["Tuyển dụng đúng kế hoạch", 20],
      ["Hồ sơ nhân sự đầy đủ", 20],
      ["Quản lý kỷ luật lao động", 10],
      ["Đào tạo nhân sự", 10],
      ["Chấm công - lương chính xác", 10],
      ["Điều hành nội bộ", 10],
      ["Phối hợp phòng ban", 10],
      ["Văn hóa cơ quan", 10],
    ],
  },
  {
    id: "chuyen-vien-hcns",
    departmentId: "ke-hoach",
    name: "Chuyên viên HCNS",
    criteria: [
      ["Hồ sơ nhân sự đúng hạn", 25],
      ["Chấm công chính xác", 20],
      ["Tuyển dụng đúng tiến độ", 10],
      ["Văn bản hành chính đúng chuẩn", 15],
      ["Tác phong phục vụ", 10],
      ["Phối hợp nội bộ", 10],
      ["Kỷ luật công việc", 10],
    ],
  },
  {
    id: "ke-toan-truong",
    departmentId: "ke-hoach",
    name: "Kế toán trưởng",
    criteria: [
      ["Báo cáo tài chính đúng hạn", 25],
      ["Kiểm soát giải ngân", 20],
      ["Hồ sơ quyết toán đạt", 15],
      ["Quản lý ngân sách", 10],
      ["Điều hành bộ phận", 10],
      ["Phối hợp kiểm toán", 10],
      ["Kiểm soát rủi ro tài chính", 10],
    ],
  },
  {
    id: "ke-toan-vien",
    departmentId: "ke-hoach",
    name: "Kế toán viên",
    criteria: [
      ["Hạch toán đúng hạn", 30],
      ["Sai sót chứng từ", 20],
      ["Thanh toán đúng hạn", 10],
      ["Lưu trữ chứng từ", 10],
      ["Cẩn thận", 10],
      ["Trách nhiệm công việc", 10],
      ["Phối hợp nội bộ", 10],
    ],
  },
  {
    id: "truong-bo-phan-tong-hop",
    departmentId: "ke-hoach",
    name: "Trưởng bộ phận Tổng hợp",
    criteria: [
      ["Báo cáo tổng hợp đúng hạn", 30],
      ["Độ chính xác số liệu", 20],
      ["Theo dõi tiến độ các phòng", 10],
      ["Tham mưu lãnh đạo", 10],
      ["Điều phối liên phòng", 10],
      ["Chủ động công việc", 10],
      ["Điều hành nhân sự", 10],
    ],
  },
  {
    id: "truong-phong-du-an-1",
    departmentId: "du-an-1",
    name: "Trưởng phòng Dự án 1",
    criteria: [
      ["Tiến độ dự án", 30],
      ["Chất lượng nghiệm thu", 20],
      ["Kiểm soát chi phí", 10],
      ["Tỷ lệ xử lý phát sinh đúng hạn", 10],
      ["Điều hành hiện trường", 10],
      ["Phối hợp nhà thầu", 10],
      ["Xử lý sự cố", 10],
    ],
  },
  {
    id: "ky-su-giam-sat-du-an-1",
    departmentId: "du-an-1",
    name: "Kỹ sư giám sát / Cán bộ dự án 1",
    criteria: [
      ["Khối lượng nghiệm thu đạt lần 1", 20],
      ["Nhật ký công trình đầy đủ", 15],
      ["Phát hiện lỗi kỹ thuật", 15],
      ["Tiến độ phụ trách", 20],
      ["Tinh thần bám hiện trường", 10],
      ["Phối hợp nhà thầu", 10],
      ["Trách nhiệm công việc", 10],
    ],
  },
  {
    id: "truong-phong-du-an-2",
    departmentId: "du-an-2",
    name: "Trưởng phòng Dự án 2",
    criteria: [
      ["Tiến độ dự án", 30],
      ["Chất lượng nghiệm thu", 20],
      ["Kiểm soát chi phí", 10],
      ["Tỷ lệ xử lý phát sinh đúng hạn", 10],
      ["Điều hành hiện trường", 10],
      ["Phối hợp nhà thầu", 10],
      ["Xử lý sự cố", 10],
    ],
  },
  {
    id: "ky-su-giam-sat-du-an-2",
    departmentId: "du-an-2",
    name: "Kỹ sư giám sát / Cán bộ dự án 2",
    criteria: [
      ["Khối lượng nghiệm thu đạt lần 1", 20],
      ["Nhật ký công trình đầy đủ", 15],
      ["Phát hiện lỗi kỹ thuật", 15],
      ["Tiến độ phụ trách", 20],
      ["Tinh thần bám hiện trường", 10],
      ["Phối hợp nhà thầu", 10],
      ["Trách nhiệm công việc", 10],
    ],
  },
  {
    id: "truong-phong-gpmb",
    departmentId: "gpmb",
    name: "Trưởng phòng GPMB",
    criteria: [
      ["Tỷ lệ bàn giao mặt bằng", 30],
      ["Hồ sơ GPMB hoàn thành", 15],
      ["Giảm tồn đọng khiếu nại", 15],
      ["Đúng tiến độ chi trả", 10],
      ["Ổn định tình hình dân cư", 10],
      ["Xử lý tình huống khó", 10],
      ["Điều phối tổ công tác", 10],
    ],
  },
  {
    id: "can-bo-gpmb",
    departmentId: "gpmb",
    name: "Nhân viên",
    criteria: [
      ["Điều tra, kiểm đếm đất đai / Trích đo, quy chủ", 20],
      ["Xác minh nguồn gốc / Thông báo thu hồi đất", 30],
      ["Lập / Thẩm định / Phê duyệt phương án bồi thường", 30],
      ["Niêm yết công khai / Đối thoại / Lấy ý kiến", 10],
      ["Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư", 10],
    ],
  },
  {
    id: "nhan-vien-tong-hop-gpmb",
    departmentId: "gpmb",
    name: "Nhân viên tổng hợp",
    criteria: [
      ["Tổng hợp số liệu/Tiến độ dự án", 50],
      ["Nhập liệu hồ sơ dự án", 50],
    ],
  },
  {
    id: "truong-phong-ha-tang",
    departmentId: "ha-tang",
    name: "Trưởng phòng QLHT",
    criteria: [
      ["Tiến độ bảo trì", 25],
      ["Xử lý sự cố đúng hạn", 25],
      ["Giảm số sự cố phát sinh", 10],
      ["Kiểm tra định kỳ", 10],
      ["Điều phối xử lý nhanh", 10],
      ["Chủ động phòng ngừa", 10],
      ["Điều hành trực vận hành", 10],
    ],
  },
  {
    id: "can-bo-ha-tang",
    departmentId: "ha-tang",
    name: "Cán bộ QLHT / Kỹ thuật",
    criteria: [
      ["Sự cố xử lý đúng hạn", 25],
      ["Kiểm tra hiện trường", 20],
      ["Báo cáo kỹ thuật đúng hạn", 15],
      ["Giảm tái phát sự cố", 10],
      ["Tinh thần trực", 10],
      ["Chủ động xử lý", 10],
      ["Phối hợp công việc", 10],
    ],
  },
  {
    id: "giam-doc-ban-giam-doc",
    departmentId: "ban-giam-doc",
    name: "Giám đốc",
    criteria: [],
  },
  {
    id: "pho-giam-doc-ban-giam-doc",
    departmentId: "ban-giam-doc",
    name: "Phó giám đốc",
    criteria: [],
  },
];

defaultDepartments.filter((department) => !department.leadershipOnly).forEach((department) => {
  defaultRoles.push(
    {
      id: `pho-phong-${department.id}`,
      departmentId: department.id,
      name: "Phó phòng",
      criteria: [
        ["Thực hiện nhiệm vụ được phân công", 25],
        ["Theo dõi tiến độ, chất lượng công việc", 20],
        ["Tham mưu và báo cáo lãnh đạo phòng", 15],
        ["Phối hợp liên phòng, phối hợp địa phương", 15],
        ["Chủ động xử lý phát sinh", 15],
        ["Tinh thần trách nhiệm, kỷ luật công vụ", 10],
      ],
    },
    {
      id: `truong-bo-phan-${department.id}`,
      departmentId: department.id,
      name: "Trưởng bộ phận/Trưởng nhóm",
      criteria: standardSectionHeadKpiCriteria(),
    },
  );
});

defaultRoles.forEach((role) => {
  if (String(role?.id || "").startsWith("truong-bo-phan-")) {
    role.criteria = standardSectionHeadKpiCriteria();
  }
});

const defaultBehaviorRules = [
  ["Đi làm muộn", -1],
  ["Không báo cáo đúng hạn", -2],
  ["Vi phạm quy trình", -5],
  ["Chậm thời hạn hoàn thành", -3],
  ["Sai hồ sơ nghiêm trọng", -5],
  ["Bị phản ánh thái độ", -3],
  ["Sáng kiến cải tiến trong công việc (mức 5 điểm)", 5],
  ["Làm vượt tiến độ", 2],
  ["Hỗ trợ nhiệm vụ đột xuất", 1],
  ["Được khen bằng văn bản/đạt thi khen thưởng phong trào thi đua", 2],
  ["Sáng kiến cải tiến trong công việc (mức 2 điểm)", 2],
];

const departmentCompletionCriterion = ["Hoàn thành kế hoạch", 100];

function standardDepartmentCriteria(isKpiExempt = false) {
  return isKpiExempt ? [] : [[...departmentCompletionCriterion]];
}

function cloneKpiCatalog(value) {
  return JSON.parse(JSON.stringify(value));
}

function catalogText(value, maxLength = 180) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function catalogNumber(value, fallback = 0, min = 0, max = 120) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeKpiCriteria(value) {
  if (!Array.isArray(value)) return [];
  const names = new Set();
  return value
    .slice(0, 60)
    .map((criterion) => {
      const name = catalogText(Array.isArray(criterion) ? criterion[0] : criterion?.name);
      const weight = catalogNumber(Array.isArray(criterion) ? criterion[1] : criterion?.weight);
      if (!name || names.has(name.toLocaleLowerCase("vi"))) return null;
      names.add(name.toLocaleLowerCase("vi"));
      return [name, weight];
    })
    .filter(Boolean);
}

function normalizeDepartmentsCatalog(value) {
  const source = Array.isArray(value) && value.length ? value : defaultDepartments;
  const ids = new Set();
  return source
    .slice(0, 40)
    .map((department, index) => {
      const id = catalogText(department?.id, 96) || `department-${index + 1}`;
      const name = catalogText(department?.name);
      if (!name || ids.has(id)) return null;
      ids.add(id);
      return {
        id,
        name,
        // KPI phòng dùng một tiêu chí chung, được tổng hợp tự động từ công việc.
        criteria: standardDepartmentCriteria(department?.kpiExempt === true),
        leadershipOnly: department?.leadershipOnly === true,
        kpiExempt: department?.kpiExempt === true,
      };
    })
    .filter(Boolean);
}

const configurablePersonnelAccountRoles = ["employee", "section_head", "manager", "deputy_manager", "director"];

function defaultAccountRoleForCatalogRole(role) {
  const configured = String(role?.accountRole || "");
  if (configurablePersonnelAccountRoles.includes(configured)) return configured;
  const roleId = String(role?.id || "");
  if (roleId.startsWith("giam-doc-") || roleId.startsWith("pho-giam-doc-") || role?.departmentId === "ban-giam-doc") return "director";
  if (roleId.startsWith("truong-phong-")) return "manager";
  if (roleId.startsWith("pho-phong-")) return "deputy_manager";
  if (roleId.startsWith("truong-bo-phan-")) return "section_head";
  return "employee";
}

function normalizeRolesCatalog(value) {
  const source = Array.isArray(value) && value.length ? value : defaultRoles;
  const ids = new Set();
  return source
    .slice(0, 160)
    .map((role, index) => {
      const id = catalogText(role?.id, 96) || `role-${index + 1}`;
      const departmentId = catalogText(role?.departmentId, 96);
      const name = catalogText(role?.name);
      if (!name || !departmentId || ids.has(id)) return null;
      ids.add(id);
      return {
        id,
        departmentId,
        name,
        accountRole: defaultAccountRoleForCatalogRole(role),
        criteria: normalizeKpiCriteria(role?.criteria),
      };
    })
    .filter(Boolean);
}

function isSectionHeadCatalogRole(role) {
  return defaultAccountRoleForCatalogRole(role) === "section_head";
}

function applySectionHeadKpiCatalog(rolesCatalog) {
  return (rolesCatalog || []).map((role) => (
    isSectionHeadCatalogRole(role)
      ? { ...role, criteria: standardSectionHeadKpiCriteria() }
      : role
  ));
}

function normalizeBehaviorRulesCatalog(value) {
  const source = Array.isArray(value) && value.length ? value : defaultBehaviorRules;
  const names = new Set();
  return source
    .slice(0, 80)
    .map((rule) => {
      const name = catalogText(Array.isArray(rule) ? rule[0] : rule?.name);
      const points = catalogNumber(Array.isArray(rule) ? rule[1] : rule?.points, 0, -120, 120);
      if (!name || names.has(name.toLocaleLowerCase("vi"))) return null;
      names.add(name.toLocaleLowerCase("vi"));
      return [name, points];
    })
    .filter(Boolean);
}

let departments = normalizeDepartmentsCatalog(defaultDepartments);
let roles = normalizeRolesCatalog(defaultRoles);
let behaviorRules = normalizeBehaviorRulesCatalog(defaultBehaviorRules);

function applyRuntimeKpiCatalogs(payload) {
  departments = normalizeDepartmentsCatalog(payload?.departments);
  const normalizedRoles = normalizeRolesCatalog(payload?.roles);
  // Before an Admin saves the migration, every device still uses the new
  // two-criterion calculation without silently writing catalog changes from
  // a lower-permission account.
  roles = payload?.sectionHeadKpiCatalogVersion === SECTION_HEAD_KPI_CATALOG_VERSION
    ? normalizedRoles
    : applySectionHeadKpiCatalog(normalizedRoles);
  behaviorRules = normalizeBehaviorRulesCatalog(payload?.behaviorRules);
}

const accountRoleLabels = {
  admin: "Admin",
  employee: "Nhân viên",
  section_head: "Trưởng bộ phận/Trưởng nhóm",
  manager: "Trưởng phòng",
  deputy_manager: "Phó phòng",
  director: "Ban giám đốc",
};

const moduleAccessRoles = ["director", "manager", "deputy_manager", "section_head", "employee"];

const systemThemeOptions = [
  {
    id: "default",
    label: "Tiêu chuẩn",
    palette: {
      "--bg": "#f4f7fb",
      "--bg-top": "#f7fbfc",
      "--surface": "#ffffff",
      "--surface-2": "#fafbfd",
      "--surface-3": "#eef7f8",
      "--line": "#dfe7ef",
      "--line-strong": "#bdccd8",
      "--text": "#152033",
      "--muted": "#64748b",
      "--primary": "#176b87",
      "--primary-dark": "#0b4a61",
      "--accent": "#b7791f",
      "--focus": "rgba(23, 107, 135, 0.22)",
      "--login-start": "#0f2d3a",
      "--login-end": "#176b87",
    },
  },
  {
    id: "tet",
    label: "Tết Nguyên Đán",
    palette: {
      "--bg": "#fff7eb",
      "--bg-top": "#fffdf8",
      "--surface": "#fffefd",
      "--surface-2": "#fffaf3",
      "--surface-3": "#fff0d8",
      "--line": "#ecd5b9",
      "--line-strong": "#d8b990",
      "--text": "#3c2020",
      "--muted": "#806058",
      "--primary": "#a22d25",
      "--primary-dark": "#751f1b",
      "--accent": "#b7791f",
      "--focus": "rgba(162, 45, 37, 0.2)",
      "--login-start": "#6d211b",
      "--login-end": "#a22d25",
    },
  },
  {
    id: "national-day",
    label: "Quốc khánh 2/9",
    palette: {
      "--bg": "#f7f8f4",
      "--bg-top": "#ffffff",
      "--surface": "#ffffff",
      "--surface-2": "#fbfbf8",
      "--surface-3": "#f3f0df",
      "--line": "#dddccf",
      "--line-strong": "#c5c1a8",
      "--text": "#1f2937",
      "--muted": "#657082",
      "--primary": "#a62424",
      "--primary-dark": "#751818",
      "--accent": "#b48a25",
      "--focus": "rgba(166, 36, 36, 0.2)",
      "--login-start": "#791d1b",
      "--login-end": "#a62424",
    },
  },
  {
    id: "anniversary",
    label: "Kỷ niệm thành lập",
    palette: {
      "--bg": "#f3f8f7",
      "--bg-top": "#fbfdfc",
      "--surface": "#ffffff",
      "--surface-2": "#f8fcfb",
      "--surface-3": "#e4f2ee",
      "--line": "#d0e0da",
      "--line-strong": "#aac7bd",
      "--text": "#17352f",
      "--muted": "#5d7770",
      "--primary": "#1c7666",
      "--primary-dark": "#135449",
      "--accent": "#ad7e22",
      "--focus": "rgba(28, 118, 102, 0.2)",
      "--login-start": "#143f38",
      "--login-end": "#1c7666",
    },
  },
  {
    id: "women-day",
    label: "Ngày Quốc tế Phụ nữ 8/3",
    palette: {
      "--bg": "#fff7f8",
      "--bg-top": "#fffdfd",
      "--surface": "#ffffff",
      "--surface-2": "#fffafb",
      "--surface-3": "#fdecef",
      "--line": "#efd4da",
      "--line-strong": "#ddb5c1",
      "--text": "#3a2330",
      "--muted": "#80616d",
      "--primary": "#a84262",
      "--primary-dark": "#7d2e47",
      "--accent": "#b07926",
      "--focus": "rgba(168, 66, 98, 0.2)",
      "--login-start": "#68283e",
      "--login-end": "#a84262",
    },
  },
  { id: "custom", label: "Dịp kỷ niệm tùy chỉnh" },
];

const printableSections = [
  { id: "dashboard", label: "Tổng quan" },
  { id: "bulletin", label: "Bảng tin" },
  { id: "archive", label: "Lưu Trữ" },
  { id: "people", label: "Nhân sự" },
  { id: "tasks", label: "Công việc" },
  { id: "department-evaluations", label: "KPI phòng" },
  { id: "evaluations", label: "KPI cá nhân" },
  { id: "history", label: "Lịch sử" },
  { id: "rules", label: "Quy chế" },
  { id: "accounts", label: "Tài khoản" },
];

const systemModules = [
  { id: "dashboard", label: "Tổng quan", note: "Chỉ số, biểu đồ, xếp hạng và cảnh báo xử lý." },
  { id: "bulletin", label: "Bảng tin", note: "Tin tức chung, thông báo nội bộ và chương trình bình chọn." },
  { id: "archive", label: "Lưu Trữ", note: "Kho hồ sơ dự án, nhân sự, văn bản và công văn." },
  { id: "people", label: "Nhân sự", note: "Hồ sơ nhân sự toàn Ban và thông tin hợp đồng, lương." },
  { id: "tasks", label: "Công việc", note: "Danh mục công việc, hồ sơ và tiến độ." },
  { id: "department-evaluations", label: "KPI phòng", note: "Dữ liệu hoạt động và chấm điểm KPI cấp phòng." },
  { id: "evaluations", label: "KPI cá nhân", note: "Chấm điểm KPI cá nhân và kết quả thi đua tháng." },
  { id: "history", label: "Lịch sử", note: "Dòng thời gian hoạt động của phòng ban và nhân viên." },
  { id: "accounts", label: "Tài khoản", note: "Quản lý tài khoản sử dụng hệ thống." },
  { id: "rules", label: "Quy chế", note: "Quy chế thi đua, khen thưởng và cách tính KPI." },
  { id: "help", label: "Trợ giúp", note: "Hướng dẫn sử dụng, yêu cầu hỗ trợ và phản hồi từ Admin." },
];

// These defaults preserve the existing business permissions. Admin can still
// explicitly enable an additional module for a role in System Settings.
const moduleDefaultRoleAccess = {
  dashboard: ["director"],
  bulletin: [...moduleAccessRoles],
  archive: [...moduleAccessRoles],
  people: ["director", "manager", "deputy_manager"],
  tasks: [...moduleAccessRoles],
  "department-evaluations": ["director", "manager", "deputy_manager"],
  evaluations: [...moduleAccessRoles],
  history: ["director", "manager", "deputy_manager"],
  accounts: [...moduleAccessRoles],
  rules: [...moduleAccessRoles],
  help: [...moduleAccessRoles],
};
const MODULE_SETTINGS_VERSION = 3;

const customFieldScopes = [
  { id: "people", label: "Nhân sự", formId: "personForm" },
  { id: "tasks", label: "Công việc", formId: "taskForm" },
  { id: "department-evaluations", label: "KPI phòng", formId: "departmentEvaluationForm" },
  { id: "evaluations", label: "KPI cá nhân", formId: "evaluationForm" },
  { id: "bulletin", label: "Bảng tin", formId: "bulletinForm" },
  { id: "archive", label: "Lưu Trữ", formId: "archiveForm" },
  { id: "accounts", label: "Tài khoản", formId: "accountForm" },
];

const customFieldTypes = [
  { id: "text", label: "Văn bản" },
  { id: "number", label: "Số" },
  { id: "date", label: "Ngày" },
  { id: "textarea", label: "Ghi chú dài" },
];

const defaultKpiFormulas = {
  completionPercent: "plan > 0 ? actual / plan * 100 : 0",
  criterionPoints: "clamp(completionPercent, 0, 120) / 100 * weight",
  departmentFinal: "criteriaScore + adjustmentScore",
  personalFinal: "personalScore * 0.8 + departmentScore * 0.2 + behaviorScore",
};

const defaultKpiParameters = {
  completionMax: 120,
  criterionScale: 1,
  departmentCriteriaWeight: 1,
  departmentAdjustmentWeight: 1,
  personalWeight: 0.8,
  departmentWeight: 0.2,
  behaviorWeight: 1,
};

function defaultAccounts() {
  // Credentials are never embedded in the browser bundle. A new offline
  // browser profile must be initialized from an authenticated data backup.
  return [];
}

function ensureDefaultAccounts(accounts, { bootstrap = false } = {}) {
  const merged = Array.isArray(accounts) ? [...accounts] : [];
  // Default accounts are only for a brand-new local state. Never recreate
  // accounts that an administrator has edited or removed from shared data.
  return bootstrap && !merged.length ? defaultAccounts() : merged;
}

function accountRoleForPerson(person) {
  const roleId = person?.roleId || "";
  const configuredRole = roleById(roleId)?.accountRole;
  if (configurablePersonnelAccountRoles.includes(configuredRole)) return configuredRole;
  if (roleId.startsWith("giam-doc-") || roleId.startsWith("pho-giam-doc-")) return "director";
  if (roleId.startsWith("truong-phong-")) return "manager";
  if (roleId.startsWith("pho-phong-")) return "deputy_manager";
  if (roleId.startsWith("truong-bo-phan-")) return "section_head";
  if (roleId === "nhan-vien-tong-hop-gpmb") return "employee";
  return "employee";
}

function isPersonnelAccountRole(role) {
  return ["employee", "section_head", "manager", "deputy_manager"].includes(role);
}

function usernameBaseForPerson(person) {
  const byName = normalizeSearchText(person?.name || "").replace(/[^a-z0-9]+/g, "");
  const byId = normalizeSearchText(person?.id || "").replace(/[^a-z0-9]+/g, "");
  return byName || byId || "nhansu";
}

function uniqueUsernameForPerson(person, accounts) {
  const used = new Set((accounts || []).map((account) => String(account.username || "").toLowerCase()).filter(Boolean));
  const base = usernameBaseForPerson(person);
  let username = base;
  let suffix = 2;
  while (used.has(username.toLowerCase())) {
    username = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(username.toLowerCase());
  return username;
}

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return `Pht!${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`;
}

function isStrongAccountPassword(password) {
  const value = String(password || "");
  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  return value.length >= 10 && value.length <= 128 && groups >= 3;
}

function createPersonnelAccount(person, accounts) {
  const timestamp = new Date().toISOString();
  return {
    id: `account-person-${person.id}`,
    username: uniqueUsernameForPerson(person, accounts),
    password: createTemporaryPassword(),
    // Existing and newly created accounts keep their password until the
    // account owner or an authorized administrator changes it voluntarily.
    passwordChangeRequired: false,
    displayName: person.name,
    role: accountRoleForPerson(person),
    personId: person.id,
    departmentId: person.departmentId || "",
    autoCreated: true,
    createdAt: timestamp,
    createdBy: "Hệ thống",
    createdById: "",
    updatedAt: timestamp,
    updatedBy: "Hệ thống",
    updatedById: "",
  };
}

function syncPersonnelAccounts() {
  if (!Array.isArray(state.people) || !state.people.length) return false;
  if (!Array.isArray(state.accounts)) state.accounts = [];
  let changed = false;

  state.people.forEach((person) => {
    if (!person?.id || !person.name) return;
    const expectedUsername = usernameBaseForPerson(person).toLowerCase();
    const personNameNorm = normalizeSearchText(person.name);
    const expectedRole = accountRoleForPerson(person);

    // 1. Tìm tài khoản hiện có khớp Tên đăng nhập hoặc Tên hiển thị
    let matchingAccount = state.accounts.find((account) => account.personId === person.id);
    if (!matchingAccount) {
      matchingAccount = state.accounts.find((account) => {
        const accountUsername = String(account.username || "").toLowerCase();
        const accountName = normalizeSearchText(account.displayName);
        return (accountUsername === expectedUsername || accountName === personNameNorm) && !account.personId;
      });
    }

    if (matchingAccount) {
      // Nếu đã có tài khoản -> Cập nhật nối personId và departmentId
      const shouldSyncRole = isPersonnelAccountRole(matchingAccount.role) || matchingAccount.autoCreated || !matchingAccount.role;
      const needsUpdate =
        matchingAccount.personId !== person.id ||
        matchingAccount.departmentId !== (person.departmentId || "") ||
        (shouldSyncRole && matchingAccount.role !== expectedRole);
      if (needsUpdate) {
        matchingAccount.personId = person.id;
        matchingAccount.departmentId = person.departmentId || "";
        if (shouldSyncRole) matchingAccount.role = expectedRole;
        matchingAccount.updatedAt = new Date().toISOString();
        changed = true;
      }
    } else {
      // 2. Nếu chưa có -> Tạo tài khoản mới
      const newAcc = createPersonnelAccount(person, state.accounts);
      state.accounts.push(newAcc);
      changed = true;
    }
  });

  return changed;
}

function defaultModuleRoleSettings(moduleId = "") {
  const allowedRoles = new Set(moduleDefaultRoleAccess[moduleId] || moduleAccessRoles);
  return Object.fromEntries(moduleAccessRoles.map((role) => [role, allowedRoles.has(role)]));
}

function defaultModuleSettings() {
  return Object.assign(
    { schemaVersion: MODULE_SETTINGS_VERSION },
    Object.fromEntries(systemModules.map((module) => [module.id, { enabled: true, roles: defaultModuleRoleSettings(module.id) }])),
  );
}

function normalizeModuleSettings(settings = {}) {
  const defaults = defaultModuleSettings();
  const migrateLegacyDefaults = Number(settings?.schemaVersion || 0) < MODULE_SETTINGS_VERSION;
  systemModules.forEach((module) => {
    const saved = settings?.[module.id] || {};
    const roles = defaultModuleRoleSettings(module.id);
    moduleAccessRoles.forEach((role) => {
      if (migrateLegacyDefaults && saved?.roles?.[role] === false) roles[role] = false;
      if (!migrateLegacyDefaults && typeof saved?.roles?.[role] === "boolean") roles[role] = saved.roles[role];
    });
    defaults[module.id] = { enabled: module.locked ? true : saved.enabled !== false, roles };
  });
  return defaults;
}

function moduleIsEnabled(viewId) {
  const module = systemModules.find((item) => item.id === viewId);
  if (!module || module.locked) return true;
  return state?.moduleSettings?.[viewId]?.enabled !== false;
}

function moduleIsAvailableToAccount(viewId, account = currentAccount()) {
  const module = systemModules.find((item) => item.id === viewId);
  if (!module || module.locked || account?.role === "admin") return true;
  if (!moduleIsEnabled(viewId)) return false;
  if (!moduleAccessRoles.includes(account?.role)) return false;
  return state?.moduleSettings?.[viewId]?.roles?.[account.role] === true;
}

function themeOptionById(themeId) {
  return systemThemeOptions.find((theme) => theme.id === themeId) || systemThemeOptions[0];
}

function normalizeThemeColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function defaultSystemTheme() {
  return {
    preset: "default",
    customName: "",
    primary: "#176B87",
    primaryDark: "#0B4A61",
    accent: "#B7791F",
    background: "#F4F7FB",
  };
}

function normalizeSystemTheme(theme = {}) {
  const defaults = defaultSystemTheme();
  const preset = systemThemeOptions.some((option) => option.id === theme?.preset) ? theme.preset : defaults.preset;
  return {
    preset,
    customName: String(theme?.customName || "").trim().slice(0, 80),
    primary: normalizeThemeColor(theme?.primary, defaults.primary),
    primaryDark: normalizeThemeColor(theme?.primaryDark, defaults.primaryDark),
    accent: normalizeThemeColor(theme?.accent, defaults.accent),
    background: normalizeThemeColor(theme?.background, defaults.background),
  };
}

function themePalette(theme) {
  const normalized = normalizeSystemTheme(theme);
  if (normalized.preset !== "custom") return { ...themeOptionById(normalized.preset).palette };
  return {
    ...themeOptionById("default").palette,
    "--bg": normalized.background,
    "--bg-top": "#FFFFFF",
    "--surface-3": normalized.background,
    "--primary": normalized.primary,
    "--primary-dark": normalized.primaryDark,
    "--accent": normalized.accent,
    "--focus": "rgba(23, 107, 135, 0.22)",
    "--login-start": normalized.primaryDark,
    "--login-end": normalized.primary,
  };
}

function numberWithin(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function defaultSystemCustomization() {
  return {
    layout: {
      inputHeight: 36,
      fieldGap: 12,
      fieldMinWidth: 150,
      popupWidth: 560,
      widePopupWidth: 1320,
    },
    kpiFormulas: { ...defaultKpiFormulas },
    kpiParameters: { ...defaultKpiParameters },
    fieldOverrides: {},
    popupSizes: {},
    customFields: [],
    theme: defaultSystemTheme(),
  };
}

function normalizeSystemCustomization(customization = {}) {
  const defaults = defaultSystemCustomization();
  const layout = customization.layout || {};
  const formulas = customization.kpiFormulas || {};
  const params = customization.kpiParameters || {};
  const validScopes = new Set(customFieldScopes.map((item) => item.id));
  const validTypes = new Set(customFieldTypes.map((item) => item.id));
  const fieldOverrides = {};
  Object.entries(customization.fieldOverrides || {}).forEach(([key, value]) => {
    const hasOverrideOrder = value?.order || value?.order === 0;
    fieldOverrides[key] = {
      label: String(value?.label || "").trim(),
      width: value?.width ? numberWithin(value.width, 1, 4, 1) : "",
      height: value?.height ? numberWithin(value.height, 28, 220, "") : "",
      order: hasOverrideOrder ? numberWithin(value.order, -99, 99, "") : "",
      hidden: value?.hidden === true,
      deleted: value?.deleted === true,
      pixelWidth: value?.pixelWidth ? numberWithin(value.pixelWidth, 40, 2400, "") : "",
      pixelHeight: value?.pixelHeight ? numberWithin(value.pixelHeight, 24, 1800, "") : "",
    };
  });
  const popupSizes = {};
  Object.entries(customization.popupSizes || {}).forEach(([key, value]) => {
    popupSizes[key] = {
      width: numberWithin(value?.width, 420, 1800, ""),
    };
  });
  const customFields = Array.isArray(customization.customFields)
    ? customization.customFields
        .map((field) => {
          const hasFieldOrder = field.order || field.order === 0;
          return {
            id: field.id || uid("custom-field"),
            scope: validScopes.has(field.scope) ? field.scope : "people",
            label: String(field.label || "").trim(),
            type: validTypes.has(field.type) ? field.type : "text",
            width: numberWithin(field.width, 1, 4, 1),
            order: hasFieldOrder ? numberWithin(field.order, -99, 99, "") : "",
            enabled: field.enabled !== false,
          };
        })
        .filter((field) => field.label)
    : [];
  return {
    layout: {
      inputHeight: numberWithin(layout.inputHeight, 28, 72, defaults.layout.inputHeight),
      fieldGap: numberWithin(layout.fieldGap, 6, 24, defaults.layout.fieldGap),
      fieldMinWidth: numberWithin(layout.fieldMinWidth, 120, 260, defaults.layout.fieldMinWidth),
      popupWidth: numberWithin(layout.popupWidth, 420, 900, defaults.layout.popupWidth),
      widePopupWidth: numberWithin(layout.widePopupWidth, 800, 1800, defaults.layout.widePopupWidth),
    },
    kpiFormulas: {
      completionPercent: String(formulas.completionPercent || defaults.kpiFormulas.completionPercent),
      criterionPoints: String(formulas.criterionPoints || defaults.kpiFormulas.criterionPoints),
      departmentFinal: String(formulas.departmentFinal || defaults.kpiFormulas.departmentFinal),
      personalFinal: String(formulas.personalFinal || defaults.kpiFormulas.personalFinal),
    },
    kpiParameters: {
      completionMax: numberWithin(params.completionMax, 1, 300, defaults.kpiParameters.completionMax),
      criterionScale: numberWithin(params.criterionScale, 0, 10, defaults.kpiParameters.criterionScale),
      departmentCriteriaWeight: numberWithin(params.departmentCriteriaWeight, 0, 10, defaults.kpiParameters.departmentCriteriaWeight),
      departmentAdjustmentWeight: numberWithin(params.departmentAdjustmentWeight, 0, 10, defaults.kpiParameters.departmentAdjustmentWeight),
      personalWeight: numberWithin(params.personalWeight, 0, 10, defaults.kpiParameters.personalWeight),
      departmentWeight: numberWithin(params.departmentWeight, 0, 10, defaults.kpiParameters.departmentWeight),
      behaviorWeight: numberWithin(params.behaviorWeight, 0, 10, defaults.kpiParameters.behaviorWeight),
    },
    fieldOverrides,
    popupSizes,
    customFields,
    theme: normalizeSystemTheme(customization.theme),
  };
}

const state = loadState();
applyRuntimeKpiCatalogs(state);
restoreCustomizationLayoutDefaults(state);
if (localStorage.getItem(SESSION_KEY)) {
  const hideLoginNow = () => {
    document.body?.classList.add("is-authenticated");
    const loginElem = document.getElementById("loginScreen");
    if (loginElem) loginElem.style.display = "none";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideLoginNow);
  } else {
    hideLoginNow();
  }
}
let customizeMode = localStorage.getItem(CUSTOMIZE_MODE_KEY) === "1";
let customizationDragElement = null;
let customizationResizeState = null;
let customizationResizeFrame = 0;
let customizationHoverElement = null;
let customizationHoverClearTimer = 0;
let customizationDropState = { target: null, container: null };
let customizationElementIndexCache = new WeakMap();
let evaluationGradeFilter = "";
let peoplePendingEvaluationOnly = false;
let bulletinMediaDraft = [];
let archiveFileDraft = [];
let bulletinResizeRefreshQueued = false;
let taskAttachmentDraft = [];
let assignmentAttachmentDraft = [];
let taskBulkImportState = { rows: [], errors: [], fileName: "" };
let taskDetailInlineEditor = null;
let personDetailInlineEditor = null;
let dashboardRefreshQueued = false;
let dashboardChartAnimationFrame = 0;

function runWhenDocumentReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }
  callback();
}

let activeViewRenderFrame = 0;
let activeViewRenderToken = 0;
let accessControlAccountId = "";
const visibleViewWorkTimers = new Map();
let binaryStorageOpenPromise = null;
let durableStorageRequestPromise = null;
let durableStateWritePromise = Promise.resolve();
let durableStateRestorePromise = null;
let durableStateRestoreComplete = false;
let offlineLoginProofCacheTimer = 0;
let offlineLoginProofCacheInFlight = false;
const storedFileDataCache = new Map();
const storedFileObjectUrlCache = new Map();
const taskSearchTextCache = new WeakMap();
const archiveSearchTextCache = new WeakMap();
let searchIndexGeneration = 0;
const DASHBOARD_CHART_ANIMATION_MS = 720;
const sharedSync = {
  available: null,
  initialized: null,
  session: false,
  sessionToken: localStorage.getItem(SHARED_SYNC_SESSION_TOKEN_KEY) || "",
  revision: null,
  timer: 0,
  pending: false,
  inFlight: false,
  retryTimer: 0,
  retryAttempt: 0,
  refreshTimer: 0,
  conflict: false,
  conflictNotified: false,
  baseState: null,
  serverBaseState: null,
  deploymentVersion: "",
  accountId: "",
  dirtyAccountId: "",
  localChangeVersion: 0,
  dirty: localStorage.getItem(SHARED_SYNC_DIRTY_KEY) === "1",
  checkpointRestorePromise: null,
  checkpointWritePromise: Promise.resolve(),
  fileWarnings: [],
};
const accountPresence = {
  heartbeatTimer: 0,
  inFlight: false,
  payload: null,
  error: "",
  usageInFlight: false,
  usagePayload: null,
  usageError: "",
  usageLastLoadedAt: 0,
  usageDepartmentId: "",
  usageRetryTimer: 0,
  usageRetryAttempts: 0,
};
let pwaRegistrationPromise = null;

const TASK_STATUS_PREPARING = "Chuẩn bị thực hiện";
const TASK_STATUS_OLD_PREPARING = "Chưa bắt đầu";
const TASK_STATUS_COMPLETED = "Hoàn thành";
const TASK_STATUS_CLOSED = "Đã kết thúc";
const TASK_STATUS_PENDING_REVIEW = "Chờ đánh giá";
const taskStatuses = [TASK_STATUS_PREPARING, "Đang thực hiện", "Hoàn thành", "Quá hạn"];
const TASK_KIND_ASSIGNED = "assigned";
const TASK_KIND_REGULAR = "regular";
const taskKindLabels = {
  [TASK_KIND_REGULAR]: "Danh mục KPI cá nhân",
};
const TASK_WORK_TYPE_ROUTINE = "routine";
const TASK_WORK_TYPE_ARISING = "arising";
const taskWorkTypeLabels = {
  [TASK_WORK_TYPE_ROUTINE]: "Công việc thường xuyên",
  [TASK_WORK_TYPE_ARISING]: "Công việc phát sinh",
};
const TASK_RECURRENCE_NONE = "none";
const TASK_RECURRENCE_DAILY = "daily";
const TASK_RECURRENCE_WEEKLY = "weekly";
const TASK_RECURRENCE_MONTHLY = "monthly";
const TASK_RECURRENCE_QUARTERLY = "quarterly";
const taskRecurrenceLabels = {
  [TASK_RECURRENCE_NONE]: "Không định kỳ",
  [TASK_RECURRENCE_DAILY]: "Hàng ngày",
  [TASK_RECURRENCE_WEEKLY]: "Hàng tuần",
  [TASK_RECURRENCE_MONTHLY]: "Hàng tháng",
  [TASK_RECURRENCE_QUARTERLY]: "Hàng quý",
};
const BULLETIN_VOTE_CATEGORY = "Chương trình bình chọn";
const bulletinCategories = ["Tin tức chung", "Thông báo nội bộ", "Hoạt động phong trào", BULLETIN_VOTE_CATEGORY, "Khác"];
const bulletinStatusLabels = {
  published: "Đăng hiển thị",
  draft: "Lưu nháp",
};
const archiveCategories = ["Hồ sơ dự án", "Hồ sơ nhân sự", "Văn bản/Công văn", "Văn bản pháp luật", "Hồ sơ khác"];
const archiveStatuses = ["Đang thực hiện", "Đã hoàn thành", "Còn hiệu lực", "Hết hiệu lực", "Lưu tham khảo"];
const MAX_TASK_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_TASK_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_SHARED_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BULLETIN_MEDIA_BYTES = MAX_SHARED_FILE_BYTES;
const MAX_BULLETIN_MEDIA_TOTAL_BYTES = 120 * 1024 * 1024;
const MAX_ARCHIVE_FILE_BYTES = MAX_SHARED_FILE_BYTES;
const MAX_ARCHIVE_FILE_TOTAL_BYTES = 300 * 1024 * 1024;
const TASK_BULK_IMPORT_MAX_ROWS = 500;
const TASK_BULK_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

const taskBulkImportHeaders = {
  title: ["tên công việc", "công việc", "nội dung công việc", "title"],
  project: ["danh mục dự án", "tên dự án", "dự án", "project"],
  owner: ["người thực hiện", "người phụ trách", "nhân sự thực hiện", "owner"],
  collaborators: ["người phối hợp", "phối hợp", "collaborators"],
  category: ["danh mục kpi cá nhân", "kpi cá nhân", "tiêu chí kpi", "danh mục kpi", "kpi"],
  workType: ["loại công việc", "loại"],
  recurrence: ["định kỳ", "lặp lại"],
  startDate: ["ngày bắt đầu", "start date"],
  due: ["ngày hoàn thành", "hạn hoàn thành", "deadline", "due date"],
  status: ["trạng thái", "status"],
  progress: ["tiến độ", "tiến độ (%)", "phần trăm tiến độ", "progress"],
  note: ["nội dung công việc / báo cáo tiến độ", "nội dung", "báo cáo tiến độ", "ghi chú", "note"],
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${padDatePart(value.getDate())}/${padDatePart(value.getMonth() + 1)}/${value.getFullYear()}`;
  }
  const text = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (dateMatch) {
    return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text
    : `${padDatePart(parsed.getDate())}/${padDatePart(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

function formatPeriod(value) {
  if (!value) return "";
  const text = String(value).trim();
  const periodMatch = text.match(/^(\d{4})-(\d{2})$/);
  return periodMatch ? `01/${periodMatch[2]}/${periodMatch[1]}` : formatDate(text);
}

function formatMonthPeriod(value) {
  if (!value) return "";
  const text = String(value).trim();
  const periodMatch = text.match(/^(\d{4})-(\d{2})$/);
  return periodMatch ? `${periodMatch[2]}/${periodMatch[1]}` : formatDate(text);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function normalizeTaskStatus(status) {
  return status === TASK_STATUS_OLD_PREPARING ? TASK_STATUS_PREPARING : status || TASK_STATUS_PREPARING;
}

function isTaskFinishedStatus(status) {
  const normalized = normalizeTaskStatus(status);
  return normalized === TASK_STATUS_COMPLETED || normalized === TASK_STATUS_CLOSED;
}

function normalizeTaskQualityInput(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return clamp(normalizeNumberInput(text), 0, 120);
}

function taskCompletionReviewStatus(task) {
  const status = String(task?.completionReviewStatus || "").trim();
  if (["pending", "passed", "failed"].includes(status)) return status;
  if (taskHasQualityPercent(task)) return "passed";
  return normalizeTaskStatus(task?.status) === TASK_STATUS_COMPLETED ? "pending" : "";
}

function taskCompletionIsApproved(task) {
  return taskCompletionReviewStatus(task) === "passed";
}

function taskCompletionNeedsReview(task) {
  return normalizeTaskStatus(task?.status) === TASK_STATUS_COMPLETED && !taskCompletionIsApproved(task);
}

function taskCompletionReviewLabel(task) {
  const status = taskCompletionReviewStatus(task);
  if (status === "passed") return "Đạt";
  if (status === "failed") return "Không đạt";
  if (status === "pending") return "Chờ đánh giá";
  return "Chưa yêu cầu";
}

function taskIsLateCompletion(task) {
  if (task?.lateCompletion) return true;
  if (!taskCompletionIsApproved(task)) return false;
  const completedAt = task?.completedAt || task?.completionReviewedAt || "";
  return !!completedAt && !isTimestampBeforeDeadline(completedAt, task);
}

function taskCompletionTimingStatus(task, confirmedAt = "") {
  if (!taskCompletionIsApproved(task) || !task?.due) return "";
  if (taskIsLateCompletion(task)) return "late";
  const timestamp = task?.completedAt || confirmedAt || task?.completionReviewedAt || "";
  const completedAt = timestamp ? new Date(timestamp) : null;
  const plannedDate = new Date(`${task.due}T00:00:00`);
  if (!completedAt || Number.isNaN(completedAt.getTime()) || Number.isNaN(plannedDate.getTime())) return "";
  return completedAt < plannedDate ? "ahead" : "";
}

function taskCompletionTimingLabel(task, confirmedAt = "") {
  const status = taskCompletionTimingStatus(task, confirmedAt);
  if (status === "ahead") return "Vượt tiến độ";
  if (status === "late") return "Chậm tiến độ";
  return "";
}

function taskCompletionTimingBadgeHtml(task) {
  const status = taskCompletionTimingStatus(task);
  const label = taskCompletionTimingLabel(task);
  return label ? `<span class="task-completion-timing is-${status}">${label}</span>` : "";
}

function taskCompletionReviewValueHtml(task) {
  const status = taskCompletionReviewStatus(task);
  if (status === "passed") {
    return `<span class="task-completion-review-value is-passed">Đạt${taskCompletionTimingBadgeHtml(task)}</span>`;
  }
  if (status === "failed") return "Không đạt · Yêu cầu tiếp tục thực hiện";
  if (status === "pending") return '<strong class="task-completion-review-pending">Chờ đánh giá Đạt/Không đạt</strong>';
  return "Chưa yêu cầu";
}

function taskHasQualityPercent(task) {
  return normalizeTaskQualityInput(task?.qualityPercent) !== "";
}

function taskQualityPercentValue(task) {
  const value = normalizeTaskQualityInput(task?.qualityPercent);
  return value === "" ? 0 : value;
}

function taskKpiActualScore(task) {
  if (normalizeTaskStatus(task?.status) !== TASK_STATUS_COMPLETED || !taskCompletionIsApproved(task)) return 0;
  return taskQualityPercentValue(task) / 100;
}

function taskQualityLabel(task) {
  if (!taskCompletionIsApproved(task)) {
    if (taskCompletionNeedsReview(task)) return "Chờ đánh giá Đạt";
    if (taskCompletionReviewStatus(task) === "failed") return "Chưa đạt";
    return "Chưa đủ điều kiện";
  }
  return taskHasQualityPercent(task) ? `${formatScore(taskQualityPercentValue(task))}%` : "Chưa đánh giá";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function openBinaryStorage() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("Trình duyệt không hỗ trợ IndexedDB."));
  if (binaryStorageOpenPromise) return binaryStorageOpenPromise;
  binaryStorageOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(BINARY_STORAGE_DB, BINARY_STORAGE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BINARY_STORAGE_STORE)) {
        db.createObjectStore(BINARY_STORAGE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BINARY_STORAGE_META_STORE)) {
        db.createObjectStore(BINARY_STORAGE_META_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => reject(new Error("Không thể mở kho dữ liệu media vì trình duyệt đang khóa phiên cũ.")));
  });
  return binaryStorageOpenPromise;
}

async function writeBinaryMetadata(id, value) {
  await requestDurableBrowserStorage();
  const db = await openBinaryStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BINARY_STORAGE_META_STORE, "readwrite");
    transaction.objectStore(BINARY_STORAGE_META_STORE).put({
      id,
      value,
      updatedAt: new Date().toISOString(),
    });
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

async function readBinaryMetadata(id) {
  const db = await openBinaryStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BINARY_STORAGE_META_STORE, "readonly");
    const request = transaction.objectStore(BINARY_STORAGE_META_STORE).get(id);
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error));
  });
}

function storedFileKey(file) {
  return file?.storageKey || file?.id || "";
}

function requestDurableBrowserStorage() {
  if (durableStorageRequestPromise) return durableStorageRequestPromise;
  durableStorageRequestPromise = Promise.resolve()
    .then(async () => {
      if (navigator.storage?.persist) {
        try {
          await navigator.storage.persist();
        } catch {
          // Storage persistence is browser-controlled; the app can still use IndexedDB without it.
        }
      }
    })
    .catch(() => {});
  return durableStorageRequestPromise;
}

async function writeStoredFile(file, dataUrl) {
  const id = storedFileKey(file);
  if (!id || !dataUrl) throw new Error("Thiếu dữ liệu media cần lưu.");
  await requestDurableBrowserStorage();
  const db = await openBinaryStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BINARY_STORAGE_STORE, "readwrite");
    const store = transaction.objectStore(BINARY_STORAGE_STORE);
    store.put({
      id,
      dataUrl,
      name: file.name || "",
      type: file.type || "application/octet-stream",
      size: Number(file.size) || 0,
      updatedAt: new Date().toISOString(),
    });
    transaction.addEventListener("complete", () => {
      storedFileDataCache.set(id, dataUrl);
      resolve();
    });
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

async function readSharedBinaryFile(file) {
  const remoteKey = file?.remoteKey || "";
  if (!remoteKey || !sharedSync.session || !sharedSync.available) return "";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SHARED_SYNC_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(sharedEndpoint("file", { key: remoteKey, type: file?.type || "application/octet-stream" }), {
      credentials: usingSupabaseSync() ? "omit" : "same-origin",
      cache: "no-store",
      headers: sharedRequestHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) expireSharedSession();
      return "";
    }
    const blob = await response.blob();
    return normalizeStoredMediaDataUrl(await readFileAsDataUrl(blob), file?.type || blob.type);
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readStoredFileDataUrl(file) {
  const key = storedFileKey(file);
  if (file?.dataUrl) return file.dataUrl;
  if (!key) return "";
  if (storedFileDataCache.has(key)) return storedFileDataCache.get(key);
  try {
    const db = await openBinaryStorage();
    const localDataUrl = await new Promise((resolve, reject) => {
      const transaction = db.transaction(BINARY_STORAGE_STORE, "readonly");
      const request = transaction.objectStore(BINARY_STORAGE_STORE).get(key);
      request.addEventListener("success", () => resolve(request.result?.dataUrl || ""));
      request.addEventListener("error", () => reject(request.error));
    });
    if (localDataUrl) {
      storedFileDataCache.set(key, localDataUrl);
      return localDataUrl;
    }
  } catch {
    // Fall through to the central file store when the local browser cache is unavailable.
  }
  const remoteDataUrl = await readSharedBinaryFile(file);
  if (!remoteDataUrl) return "";
  storedFileDataCache.set(key, remoteDataUrl);
  try {
    await writeStoredFile(file, remoteDataUrl);
  } catch {
    // A loaded remote file remains usable for this session even if local caching fails.
  }
  return remoteDataUrl;
}

function dataUrlToBlob(dataUrl, fallbackType = "application/octet-stream") {
  const match = String(dataUrl || "").match(/^data:([^;,]*)(;base64)?,(.*)$/);
  if (!match) return new Blob([], { type: fallbackType });
  const mime = match[1] || fallbackType;
  const encoded = match[3] || "";
  if (!match[2]) {
    return new Blob([decodeURIComponent(encoded)], { type: mime });
  }
  const binary = atob(encoded);
  const chunks = [];
  const chunkSize = 8192;
  for (let index = 0; index < binary.length; index += chunkSize) {
    const chunk = binary.slice(index, index + chunkSize);
    const bytes = new Uint8Array(chunk.length);
    for (let offset = 0; offset < chunk.length; offset += 1) {
      bytes[offset] = chunk.charCodeAt(offset);
    }
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mime });
}

function storedFileDisplayUrl(file, dataUrl) {
  const key = storedFileKey(file);
  const kind = file?.kind || mediaKindFromType(file?.type) || mediaKindFromFile(file);
  if (kind !== "pdf") return dataUrl;
  if (key && storedFileObjectUrlCache.has(key)) return storedFileObjectUrlCache.get(key);
  const type = file?.type || "application/pdf";
  const normalizedDataUrl = normalizeStoredMediaDataUrl(dataUrl, type);
  const objectUrl = URL.createObjectURL(dataUrlToBlob(normalizedDataUrl, type));
  if (key) storedFileObjectUrlCache.set(key, objectUrl);
  return objectUrl;
}

function taskAttachmentByKey(key) {
  const normalizedKey = String(key || "");
  if (!normalizedKey) return null;
  const draft = [...taskAttachmentDraft, ...assignmentAttachmentDraft].find((file) => storedFileKey(file) === normalizedKey);
  if (draft) return draft;
  for (const task of state.tasks || []) {
    const found = (task.attachments || []).find((file) => storedFileKey(file) === normalizedKey);
    if (found) return found;
  }
  return null;
}

function taskAttachmentLinkHtml(file, className = "attachment-link") {
  const key = escapeHtml(storedFileKey(file));
  const source = escapeHtml(file?.dataUrl || "");
  const name = escapeHtml(file?.name || "Tệp đính kèm");
  return `<a class="${className}" href="${source || "#"}" data-task-attachment-key="${key}" download="${name}" target="_blank" rel="noopener">${name}</a>`;
}

async function hydrateTaskAttachmentLinks(root = document) {
  if (!root) return;
  const elements = Array.from(root.querySelectorAll("[data-task-attachment-key]"));
  await Promise.all(
    elements.map(async (element) => {
      if (element.dataset.fileReady === "true") return;
      const file = taskAttachmentByKey(element.dataset.taskAttachmentKey);
      if (!file) return;
      try {
        const dataUrl = await readStoredFileDataUrl(file);
        if (!dataUrl) return;
        element.href = storedFileDisplayUrl(file, dataUrl);
        element.dataset.fileReady = "true";
      } catch {
        element.dataset.fileReady = "error";
      }
    }),
  );
}

async function deleteStoredFile(file) {
  const key = storedFileKey(file);
  if (key) {
    storedFileDataCache.delete(key);
    const objectUrl = storedFileObjectUrlCache.get(key);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      storedFileObjectUrlCache.delete(key);
    }
  }
  if (!key || file?.dataUrl) return;
  try {
    const db = await openBinaryStorage();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(BINARY_STORAGE_STORE, "readwrite");
      transaction.objectStore(BINARY_STORAGE_STORE).delete(key);
      transaction.addEventListener("complete", resolve);
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  } catch {
    // Leaving an orphaned media record is preferable to interrupting the user's workflow.
  }
}

async function readTaskAttachmentFiles(files) {
  const selected = Array.from(files || []);
  const oversized = selected.find((file) => file.size > MAX_TASK_ATTACHMENT_BYTES);
  if (oversized) {
    throw new Error(`Tệp "${oversized.name}" vượt quá 2MB. Vui lòng chọn tệp nhỏ hơn để lưu trực tiếp trong dữ liệu ứng dụng.`);
  }
  return Promise.all(
    selected.map(async (file) => {
      const id = uid("task-file");
      const type = archiveFileTypeFromFile(file);
      const record = {
        id,
        storageKey: id,
        name: file.name,
        type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      await writeStoredFile(record, normalizeStoredMediaDataUrl(await readFileAsDataUrl(file), type));
      return record;
    }),
  );
}

function mediaKindFromType(type) {
  if (String(type || "").startsWith("image/")) return "image";
  if (String(type || "").startsWith("video/")) return "video";
  if (String(type || "").startsWith("audio/")) return "audio";
  if (String(type || "").toLowerCase() === "application/pdf") return "pdf";
  return "";
}

function mediaKindFromFile(file) {
  const byType = mediaKindFromType(file?.type);
  if (byType) return byType;
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension)) return "image";
  if (["mp4", "webm", "mov", "m4v", "avi"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a", "aac", "ogg", "oga"].includes(extension)) return "audio";
  if (extension === "pdf") return "pdf";
  return "";
}

function mediaTypeFromFile(file) {
  const kind = mediaKindFromFile(file);
  if (file?.type) return file.type;
  if (kind === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function normalizeStoredMediaDataUrl(dataUrl, type) {
  if (!dataUrl || !type) return dataUrl;
  return String(dataUrl).replace(/^data:(?:application\/octet-stream)?(;base64,)/, `data:${type}$1`);
}

async function readBulletinMediaFiles(files) {
  const selected = Array.from(files || []);
  const unsupported = selected.find((file) => !mediaKindFromFile(file));
  if (unsupported) {
    throw new Error(`Tệp "${unsupported.name}" không phải hình ảnh, video, âm thanh hoặc PDF.`);
  }
  const oversized = selected.find((file) => file.size > MAX_BULLETIN_MEDIA_BYTES);
  if (oversized) {
    throw new Error(`Tệp "${oversized.name}" vượt quá 10MB. Vui lòng chọn file media nhỏ hơn để đồng bộ ổn định trên các thiết bị.`);
  }
  return Promise.all(
    selected.map(async (file) => {
      const id = uid("bulletin-media");
      const kind = mediaKindFromFile(file);
      const type = mediaTypeFromFile(file);
      const record = {
        id,
        storageKey: id,
        name: file.name,
        type,
        kind,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      const dataUrl = normalizeStoredMediaDataUrl(await readFileAsDataUrl(file), type);
      await writeStoredFile(record, dataUrl);
      return record;
    }),
  );
}

function archiveFileKindFromFile(file) {
  const mediaKind = mediaKindFromFile(file);
  if (mediaKind) return mediaKind;
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  if (["doc", "docx"].includes(extension)) return "word";
  if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
  if (["ppt", "pptx"].includes(extension)) return "presentation";
  if (["txt", "rtf"].includes(extension)) return "text";
  if (["zip", "rar", "7z"].includes(extension)) return "archive";
  return "file";
}

function archiveFileTypeFromFile(file) {
  if (file?.type) return file.type;
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  const byExtension = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    rar: "application/vnd.rar",
  };
  return byExtension[extension] || "application/octet-stream";
}

function archiveFileKindLabel(file) {
  const kind = file?.kind || archiveFileKindFromFile(file);
  const labels = {
    image: "Ảnh",
    video: "Video",
    audio: "Âm thanh",
    pdf: "PDF",
    word: "Word",
    spreadsheet: "Excel",
    presentation: "PowerPoint",
    text: "Văn bản",
    archive: "Tệp nén",
    file: "Tệp",
  };
  return labels[kind] || "Tệp";
}

async function readArchiveFiles(files) {
  const selected = Array.from(files || []);
  const oversized = selected.find((file) => file.size > MAX_ARCHIVE_FILE_BYTES);
  if (oversized) {
    throw new Error(`Tệp "${oversized.name}" vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn để đồng bộ ổn định trong kho dữ liệu.`);
  }
  return Promise.all(
    selected.map(async (file) => {
      const id = uid("archive-file");
      const type = archiveFileTypeFromFile(file);
      const record = {
        id,
        storageKey: id,
        name: file.name,
        type,
        kind: archiveFileKindFromFile(file),
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      const dataUrl = normalizeStoredMediaDataUrl(await readFileAsDataUrl(file), type);
      await writeStoredFile(record, dataUrl);
      return record;
    }),
  );
}

function defaultStatePayload() {
  return {
    activePeriod: currentMonth(),
    people: [],
    tasks: [],
    projectCatalog: [],
    bulletins: [],
    archiveRecords: [],
    evaluations: [],
    departmentEvaluations: [],
    accounts: defaultAccounts(),
    supportRequests: [],
    moduleSettings: defaultModuleSettings(),
    systemCustomization: defaultSystemCustomization(),
    departments: normalizeDepartmentsCatalog(defaultDepartments),
    roles: normalizeRolesCatalog(defaultRoles),
    behaviorRules: normalizeBehaviorRulesCatalog(defaultBehaviorRules),
    activityLog: [],
    importedPeopleVersion: "",
    canBoGpmbKpiCatalogVersion: "",
    sectionHeadKpiCatalogVersion: "",
    personalKpiClassificationVersion: "",
    deletedIds: [], // 🌟 KHÓA CHỐNG HỒI SINH: Lưu danh sách ID đã bị xóa
  };
}

// 🌟 Hàm ghi nhận ID vừa xóa để đồng bộ lệnh xóa sang tất cả máy trạm khác
function normalizedProjectCatalogName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function projectCatalogNameKey(value) {
  return normalizedProjectCatalogName(value).toLocaleLowerCase("vi");
}

function normalizeProjectCatalog(catalog = [], tasks = []) {
  const projects = [];
  const names = new Set();
  const ids = new Set();
  const addProject = (record, fallbackName = "") => {
    const name = normalizedProjectCatalogName(record?.name || fallbackName);
    if (!name) return;
    const nameKey = projectCatalogNameKey(name);
    if (names.has(nameKey)) return;
    let id = String(record?.id || "").trim() || uid("project");
    while (ids.has(id)) id = uid("project");
    ids.add(id);
    names.add(nameKey);
    projects.push({
      id,
      name,
      createdAt: record?.createdAt || "",
      createdById: record?.createdById || "",
      createdByName: record?.createdByName || "",
      updatedAt: record?.updatedAt || "",
      updatedById: record?.updatedById || "",
      updatedByName: record?.updatedByName || "",
    });
  };
  (Array.isArray(catalog) ? catalog : []).forEach((record) => addProject(record));
  (Array.isArray(tasks) ? tasks : []).forEach((task) => addProject(null, task?.projectName));
  return projects;
}

function normalizeTaskProjectLinks(tasks = [], projectCatalog = []) {
  const projectsById = new Map(projectCatalog.map((project) => [project.id, project]));
  const projectsByName = new Map(projectCatalog.map((project) => [projectCatalogNameKey(project.name), project]));
  return (Array.isArray(tasks) ? tasks : []).map((task) => {
    if (!task || typeof task !== "object") return task;
    const projectId = String(task.projectId || "").trim();
    const linkedProject = projectsById.get(projectId) || projectsByName.get(projectCatalogNameKey(task.projectName));
    if (!linkedProject) {
      return { ...task, projectId: "", projectName: normalizedProjectCatalogName(task.projectName) };
    }
    return { ...task, projectId: linkedProject.id, projectName: linkedProject.name };
  });
}

function projectById(projectId) {
  const id = String(projectId || "").trim();
  return (state.projectCatalog || []).find((project) => project.id === id) || null;
}

function projectIdForTask(task) {
  const directProject = projectById(task?.projectId);
  if (directProject) return directProject.id;
  const nameKey = projectCatalogNameKey(task?.projectName);
  return (state.projectCatalog || []).find((project) => projectCatalogNameKey(project.name) === nameKey)?.id || "";
}

function projectNameForTask(task) {
  return projectById(task?.projectId)?.name || normalizedProjectCatalogName(task?.projectName);
}

function isRetiredAssignmentTaskRecord(task) {
  if (!task || typeof task !== "object") return false;
  const kind = String(task.kind || task.taskKind || "").trim().toLowerCase();
  return kind === "assigned" || (!kind && Boolean(task.assignedById || task.assignedAt || task.responseStatus || task.responseAt));
}

function registerDeletedId(id) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return;
  if (!Array.isArray(state.deletedIds)) state.deletedIds = [];
  state.deletedIds = [...new Set([...state.deletedIds, normalizedId])].slice(-MAX_DELETED_ID_HISTORY);
}

function normalizeStatePayload(parsed) {
  const fallback = defaultStatePayload();
  if (!parsed || typeof parsed !== "object") return fallback;
  const sourceTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const retiredAssignmentTaskIds = new Set(
    sourceTasks.filter((task) => isRetiredAssignmentTaskRecord(task)).map((task) => String(task?.id || "")).filter(Boolean),
  );
  const tasks = sourceTasks.filter((task) => !isRetiredAssignmentTaskRecord(task));
  const projectCatalog = normalizeProjectCatalog(parsed.projectCatalog, tasks);
  return {
    activePeriod: parsed.activePeriod || fallback.activePeriod,
    people: Array.isArray(parsed.people) ? parsed.people : [],
    tasks: normalizeTaskProjectLinks(tasks, projectCatalog),
    projectCatalog,
    bulletins: Array.isArray(parsed.bulletins) ? parsed.bulletins : [],
    archiveRecords: Array.isArray(parsed.archiveRecords) ? parsed.archiveRecords : [],
    evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
    departmentEvaluations: Array.isArray(parsed.departmentEvaluations) ? parsed.departmentEvaluations : [],
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : fallback.accounts,
    supportRequests: Array.isArray(parsed.supportRequests) ? parsed.supportRequests : [],
    moduleSettings: normalizeModuleSettings(parsed.moduleSettings),
    systemCustomization: normalizeSystemCustomization(parsed.systemCustomization),
    departments: normalizeDepartmentsCatalog(parsed.departments),
    roles: normalizeRolesCatalog(parsed.roles),
    behaviorRules: normalizeBehaviorRulesCatalog(parsed.behaviorRules),
    activityLog: Array.isArray(parsed.activityLog)
      ? parsed.activityLog.filter((entry) => !retiredAssignmentTaskIds.has(String(entry?.targetId || "")))
      : [],
    importedPeopleVersion: parsed.importedPeopleVersion || "",
    canBoGpmbKpiCatalogVersion: parsed.canBoGpmbKpiCatalogVersion || "",
    sectionHeadKpiCatalogVersion: parsed.sectionHeadKpiCatalogVersion || "",
    personalKpiClassificationVersion: parsed.personalKpiClassificationVersion || "",
    deletedIds: Array.isArray(parsed.deletedIds)
      ? [...new Set(parsed.deletedIds.map((id) => String(id || "").trim()).filter(Boolean))].slice(-MAX_DELETED_ID_HISTORY)
      : [],
  };
}

function loadState() {
  const fallback = defaultStatePayload();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return normalizeStatePayload(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function persistState() {
  const serialized = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    if (durableStateRestoreComplete) localStorage.setItem(STATE_SAVED_AT_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Local state cache is full; using durable browser storage:", error);
  }
  if (durableStateRestoreComplete) {
    durableStateWritePromise = durableStateWritePromise
      .catch(() => {})
      .then(() => writeBinaryMetadata(DURABLE_APP_STATE_ID, { serialized }))
      .catch((error) => {
        console.warn("Durable state save failed:", error);
      });
  }
  return durableStateWritePromise;
}

function saveState() {
  persistState();
  if (sharedSync.session && !isOfflineFileRuntime()) {
    sharedSync.localChangeVersion += 1;
    markSharedStateDirty();
  }
  scheduleDashboardRefresh();
  if (!isOfflineFileRuntime()) queueSharedStateSync();
}

async function restoreDurableState() {
  try {
    const record = await readBinaryMetadata(DURABLE_APP_STATE_ID);
    const serialized = String(record?.value?.serialized || "");
    if (!serialized) return false;
    const durableSavedAt = new Date(record.updatedAt || 0).getTime() || 0;
    const localSavedAt = Number(localStorage.getItem(STATE_SAVED_AT_KEY) || 0);
    const localSerialized = localStorage.getItem(STORAGE_KEY) || "";
    // A normal reload already has the same serialized snapshot in
    // localStorage. Skipping the duplicate restore avoids reprocessing all
    // attachment migrations before the interface is usable.
    if (localSerialized === serialized) return false;
    if (localSavedAt > durableSavedAt) return false;
    Object.assign(state, normalizeStatePayload(JSON.parse(serialized)));
    applyRuntimeKpiCatalogs(state);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // IndexedDB is the durable fallback when localStorage is full or unavailable.
    }
    return true;
  } catch (error) {
    console.warn("Durable state restore failed:", error);
    return false;
  }
}

function ensureDurableStateRestored() {
  if (durableStateRestorePromise) return durableStateRestorePromise;
  durableStateRestorePromise = restoreDurableState()
    .catch(() => false)
    .then((restored) => {
      durableStateRestoreComplete = true;
      persistState();
      return restored;
    });
  return durableStateRestorePromise;
}

function sharedSyncCheckpointPayload() {
  return {
    dirty: Boolean(sharedSync.dirty),
    dirtyAccountId: sharedSync.dirtyAccountId || "",
    revision: sharedSync.revision,
    baseState: sharedSync.baseState ? cloneStatePayload(sharedSync.baseState) : null,
    serverBaseState: sharedSync.serverBaseState ? cloneStatePayload(sharedSync.serverBaseState) : null,
  };
}

function persistSharedSyncCheckpoint() {
  sharedSync.checkpointWritePromise = sharedSync.checkpointWritePromise
    .catch(() => {})
    .then(() => writeBinaryMetadata(SHARED_SYNC_CHECKPOINT_ID, sharedSyncCheckpointPayload()))
    .catch((error) => {
      console.warn("Shared sync checkpoint save failed:", error);
    });
  return sharedSync.checkpointWritePromise;
}

async function restoreSharedSyncCheckpoint() {
  if (sharedSync.checkpointRestorePromise) return sharedSync.checkpointRestorePromise;
  sharedSync.checkpointRestorePromise = readBinaryMetadata(SHARED_SYNC_CHECKPOINT_ID)
    .then((record) => {
      const checkpoint = record?.value;
      if (!checkpoint || typeof checkpoint !== "object") return false;
      sharedSync.dirty = Boolean(checkpoint.dirty) || localStorage.getItem(SHARED_SYNC_DIRTY_KEY) === "1";
      sharedSync.dirtyAccountId = String(checkpoint.dirtyAccountId || "");
      sharedSync.revision = Number.isFinite(Number(checkpoint.revision)) ? Number(checkpoint.revision) : sharedSync.revision;
      sharedSync.baseState = checkpoint.baseState ? cloneStatePayload(normalizeStatePayload(checkpoint.baseState)) : sharedSync.baseState;
      sharedSync.serverBaseState = checkpoint.serverBaseState ? sharedServerBasePayload(checkpoint.serverBaseState) : sharedSync.serverBaseState;
      return true;
    })
    .catch((error) => {
      console.warn("Shared sync checkpoint restore failed:", error);
      return false;
    });
  return sharedSync.checkpointRestorePromise;
}

function markSharedStateDirty() {
  sharedSync.dirty = true;
  sharedSync.dirtyAccountId = sharedSync.accountId || currentAccount()?.id || sharedSync.dirtyAccountId || "";
  try {
    localStorage.setItem(SHARED_SYNC_DIRTY_KEY, "1");
  } catch {
    // The IndexedDB checkpoint below remains available when localStorage is full.
  }
  return persistSharedSyncCheckpoint();
}

function clearSharedStateDirty() {
  sharedSync.dirty = false;
  sharedSync.dirtyAccountId = "";
  try {
    localStorage.removeItem(SHARED_SYNC_DIRTY_KEY);
  } catch {
    // Ignore a disabled localStorage implementation.
  }
  return persistSharedSyncCheckpoint();
}

function cloneStatePayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function sharedServerBasePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const base = cloneStatePayload(payload);
  SHARED_SYNC_COLLECTIONS.forEach((collection) => {
    if (!Array.isArray(base[collection])) base[collection] = [];
  });
  return base;
}

function normalizedLoginUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function readOfflineLoginProofs() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_LOGIN_PROOFS_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeOfflineLoginProofs(proofs) {
  try {
    const entries = Object.entries(proofs || {})
      .filter(([, proof]) => proof && typeof proof === "object")
      .sort(([, left], [, right]) => String(right?.verifiedAt || "").localeCompare(String(left?.verifiedAt || "")))
      .slice(0, OFFLINE_LOGIN_PROOF_MAX_ENTRIES);
    localStorage.setItem(OFFLINE_LOGIN_PROOFS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Offline sign-in remains unavailable if this browser blocks local storage.
  }
}

function offlineAccountDirectoryRecord(account) {
  if (!account?.id || !account?.username) return null;
  return {
    id: String(account.id),
    username: String(account.username),
    displayName: String(account.displayName || account.username),
    role: String(account.role || "employee"),
    personId: String(account.personId || ""),
    disabled: Boolean(account.disabled),
    accessGrants: account.accessGrants && typeof account.accessGrants === "object" ? { ...account.accessGrants } : {},
    updatedAt: String(account.updatedAt || ""),
  };
}

function readOfflineAccountDirectory() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_ACCOUNT_DIRECTORY_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function cacheOfflineAccountDirectory(accounts) {
  const directory = readOfflineAccountDirectory();
  let changed = false;
  (Array.isArray(accounts) ? accounts : []).forEach((account) => {
    const record = offlineAccountDirectoryRecord(account);
    if (!record) return;
    directory[normalizedLoginUsername(record.username)] = record;
    changed = true;
  });
  if (!changed) return;
  try {
    const entries = Object.entries(directory)
      .sort(([, left], [, right]) => String(right?.updatedAt || "").localeCompare(String(left?.updatedAt || "")))
      .slice(0, OFFLINE_LOGIN_PROOF_MAX_ENTRIES);
    localStorage.setItem(OFFLINE_ACCOUNT_DIRECTORY_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // The current browser state can still serve accounts already cached in state.accounts.
  }
}

function offlineAccountByUsername(username) {
  const normalizedUsername = normalizedLoginUsername(username);
  if (!normalizedUsername) return null;
  const localAccount = (state.accounts || []).find((item) => normalizedLoginUsername(item?.username) === normalizedUsername);
  return localAccount || readOfflineAccountDirectory()[normalizedUsername] || null;
}

async function cacheOfflineAdminState(account, payload = state) {
  if (account?.role !== "admin" || !account?.id) return;
  try {
    const snapshot = normalizeStatePayload(payload);
    const sanitizedAccounts = (snapshot.accounts || []).map(offlineAccountDirectoryRecord).filter(Boolean);
    await writeBinaryMetadata(OFFLINE_ADMIN_STATE_SNAPSHOT_ID, {
      accountId: String(account.id),
      savedAt: new Date().toISOString(),
      state: { ...snapshot, accounts: sanitizedAccounts },
    });
  } catch (error) {
    console.warn("Offline Admin state cache failed:", error);
  }
}

async function restoreOfflineAdminState(account) {
  if (account?.role !== "admin" || !account?.id) return false;
  try {
    const record = await readBinaryMetadata(OFFLINE_ADMIN_STATE_SNAPSHOT_ID);
    const payload = record?.value;
    const savedAt = new Date(payload?.savedAt || record?.updatedAt || "").getTime();
    if (
      !payload?.state ||
      String(payload.accountId || "") !== String(account.id) ||
      Number.isNaN(savedAt) ||
      savedAt + OFFLINE_ADMIN_STATE_MAX_AGE_MS < Date.now()
    ) {
      return false;
    }
    Object.assign(state, normalizeStatePayload(payload.state));
    applyRuntimeKpiCatalogs(state);
    persistState();
    cacheOfflineAccountDirectory(state.accounts);
    return true;
  } catch {
    return false;
  }
}

function bytesToBase64(bytes) {
  let output = "";
  Array.from(bytes || []).forEach((value) => {
    output += String.fromCharCode(value);
  });
  return btoa(output);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function secureTextEquals(left, right) {
  const first = String(left || "");
  const second = String(right || "");
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  return difference === 0;
}

async function offlineCredentialDigest(password, salt, iterations = OFFLINE_LOGIN_PBKDF2_ITERATIONS) {
  if (!window.crypto?.subtle || !password || !salt?.length) return "";
  const workFactor = Math.max(50000, Math.min(OFFLINE_LOGIN_PBKDF2_ITERATIONS, Number(iterations) || OFFLINE_LOGIN_PBKDF2_ITERATIONS));
  const material = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: workFactor, hash: "SHA-256" },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

async function rememberOfflineLogin(account, password) {
  const username = normalizedLoginUsername(account?.username);
  if (!username || !account?.id || !password || !window.crypto?.getRandomValues) return;
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const verifier = await offlineCredentialDigest(password, salt);
    if (!verifier) return;
    const proofs = readOfflineLoginProofs();
    proofs[username] = {
      accountId: String(account.id),
      username,
      salt: bytesToBase64(salt),
      verifier,
      iterations: OFFLINE_LOGIN_PBKDF2_ITERATIONS,
      verifiedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + OFFLINE_LOGIN_PROOF_MAX_AGE_MS).toISOString(),
    };
    writeOfflineLoginProofs(proofs);
  } catch {
    // A successful online sign-in must not fail just because offline caching is unavailable.
  }
}

function cacheServerOfflineLoginProofs(proofs) {
  if (!Array.isArray(proofs) || !proofs.length) return;
  const storedProofs = readOfflineLoginProofs();
  let changed = false;
  proofs.forEach((proof) => {
    const username = normalizedLoginUsername(proof?.username);
    const expiresAt = new Date(proof?.expiresAt || "").getTime();
    if (!username || !proof?.accountId || !proof?.salt || !proof?.verifier || Number.isNaN(expiresAt) || expiresAt <= Date.now()) return;
    storedProofs[username] = {
      accountId: String(proof.accountId),
      username,
      salt: String(proof.salt),
      verifier: String(proof.verifier),
      iterations: Math.max(50000, Math.min(OFFLINE_LOGIN_PBKDF2_ITERATIONS, Number(proof.iterations) || OFFLINE_LOGIN_PBKDF2_ITERATIONS)),
      verifiedAt: proof.verifiedAt || new Date().toISOString(),
      expiresAt: proof.expiresAt,
    };
    changed = true;
  });
  if (changed) writeOfflineLoginProofs(storedProofs);
}

function offlineLoginProofNeedsRefresh(account, proof) {
  const proofExpiresAt = new Date(proof?.expiresAt || "").getTime();
  const accountUpdatedAt = new Date(account?.updatedAt || 0).getTime();
  const proofVerifiedAt = new Date(proof?.verifiedAt || 0).getTime();
  return (
    !proof ||
    String(proof.accountId || "") !== String(account?.id || "") ||
    Number.isNaN(proofExpiresAt) ||
    proofExpiresAt <= Date.now() ||
    (accountUpdatedAt > 0 && accountUpdatedAt > proofVerifiedAt)
  );
}

function shouldRequestAdminOfflineCredentials(username) {
  const normalizedUsername = normalizedLoginUsername(username);
  const signedInAccount = (state.accounts || []).find((account) => normalizedLoginUsername(account?.username) === normalizedUsername);
  if (signedInAccount?.role !== "admin") {
    // A non-Admin view receives only its own account, so it cannot know
    // whether the next online sign-in is the Admin account. The server still
    // enforces the Admin role before returning any verifier.
    return !(state.accounts || []).some((account) => account?.role === "admin");
  }
  const proofs = readOfflineLoginProofs();
  return (state.accounts || [])
    .filter((account) => account?.id && account?.username && !account?.disabled)
    .some((account) => offlineLoginProofNeedsRefresh(account, proofs[normalizedLoginUsername(account.username)]));
}

function scheduleLocalOfflineLoginProofCache(accounts) {
  const candidates = (Array.isArray(accounts) ? accounts : [])
    .filter((account) => account?.id && account?.username && account?.password && !account?.disabled)
    .map((account) => ({ id: String(account.id), username: String(account.username), password: String(account.password) }));
  if (!candidates.length || offlineLoginProofCacheTimer || offlineLoginProofCacheInFlight) return;

  const cacheProofs = async () => {
    offlineLoginProofCacheTimer = 0;
    offlineLoginProofCacheInFlight = true;
    try {
      const existing = readOfflineLoginProofs();
      for (const account of candidates) {
        const username = normalizedLoginUsername(account.username);
        const proof = existing[username];
        const isCurrent = proof && String(proof.accountId || "") === account.id && new Date(proof.expiresAt || "").getTime() > Date.now();
        if (!isCurrent) await rememberOfflineLogin(account, account.password);
        // Yield between credentials so importing a full personnel file does not stall the interface.
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    } finally {
      offlineLoginProofCacheInFlight = false;
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    offlineLoginProofCacheTimer = window.requestIdleCallback(() => cacheProofs(), { timeout: 1500 });
  } else {
    offlineLoginProofCacheTimer = window.setTimeout(cacheProofs, 120);
  }
}

async function verifyOfflineLogin(username, password) {
  const normalizedUsername = normalizedLoginUsername(username);
  if (!normalizedUsername || !password) return null;
  const localAccount = offlineAccountByUsername(normalizedUsername);
  if (!localAccount || localAccount.disabled) return null;
  const proof = readOfflineLoginProofs()[normalizedUsername];
  const proofIsValid = proof && String(proof.accountId || "") === String(localAccount.id || "") && !Number.isNaN(new Date(proof.expiresAt || "").getTime()) && new Date(proof.expiresAt).getTime() >= Date.now();
  if (!proofIsValid) {
    // This preserves offline access for a local JSON backup while gradually
    // replacing plaintext passwords with the one-way offline verifier.
    if (localAccount.password && secureTextEquals(localAccount.password, password)) {
      void rememberOfflineLogin(localAccount, password);
      return localAccount;
    }
    return null;
  }
  try {
    const verifier = await offlineCredentialDigest(password, base64ToBytes(proof.salt), proof.iterations);
    return verifier && secureTextEquals(verifier, proof.verifier) ? localAccount : null;
  } catch {
    return null;
  }
}

function localStateHasBusinessData(payload = state) {
  const source = normalizeStatePayload(payload);
  return [source.people, source.tasks, source.bulletins, source.archiveRecords, source.evaluations, source.departmentEvaluations].some(
    (records) => Array.isArray(records) && records.length > 0,
  );
}

function canBootstrapCloudFromLocalState(payload = state) {
  const source = normalizeStatePayload(payload);
  const accounts = Array.isArray(source.accounts) ? source.accounts : [];
  return (
    localStateHasBusinessData(source) &&
    accounts.length >= defaultAccounts().length &&
    accounts.every((account) => String(account?.password || "").trim())
  );
}

function isOfflineFileRuntime() {
  return window.location.protocol === "file:";
}

function sharedSyncSupported() {
  // A file:// copy is an intentionally isolated local test environment.
  // It must never wait for, or overwrite its data from, the cloud service.
  return !isOfflineFileRuntime() && (Boolean(supabaseSyncConfig()) || window.location.protocol === "https:" || window.location.protocol === "http:");
}

function supabaseSyncConfig() {
  const rawConfig = window.PHUC_THINH_SUPABASE || {};
  const projectUrl = String(rawConfig.projectUrl || "").trim().replace(/\/$/, "");
  const publishableKey = String(rawConfig.publishableKey || rawConfig.anonKey || "").trim();
  if (!projectUrl || !publishableKey) return null;
  try {
    const parsed = new URL(projectUrl);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return { projectUrl, publishableKey };
  } catch {
    return null;
  }
}

function usingSupabaseSync() {
  return !isOfflineFileRuntime() && Boolean(supabaseSyncConfig());
}

function sharedEndpoint(action, query = {}) {
  const params = new URLSearchParams({ action, ...query });
  const supabaseConfig = supabaseSyncConfig();
  if (supabaseConfig) return `${supabaseConfig.projectUrl}/functions/v1/kpi-sync?${params.toString()}`;
  return `${SHARED_SYNC_ENDPOINT}?${params.toString()}`;
}

function sharedRequestHeaders(headers = {}, sessionToken = sharedSync.sessionToken) {
  const output = { ...headers };
  const supabaseConfig = supabaseSyncConfig();
  if (supabaseConfig) {
    output.apikey = supabaseConfig.publishableKey;
  }
  if (sessionToken) output["x-kpi-session"] = sessionToken;
  return output;
}

async function sharedJsonRequest(action, options = {}) {
  const { query = {}, timeoutMs = SHARED_SYNC_REQUEST_TIMEOUT_MS, ...requestOptions } = options;
  requestOptions.credentials = usingSupabaseSync() ? "omit" : "same-origin";
  requestOptions.cache = "no-store";
  requestOptions.headers = sharedRequestHeaders(options.headers || {});
  const controller = options.signal ? null : new AbortController();
  const normalizedTimeoutMs = Number.isFinite(Number(timeoutMs)) ? Math.max(1000, Number(timeoutMs)) : SHARED_SYNC_REQUEST_TIMEOUT_MS;
  const timeout = controller ? window.setTimeout(() => controller.abort(), normalizedTimeoutMs) : 0;
  try {
    const response = await fetch(sharedEndpoint(action, query), {
      ...requestOptions,
      signal: options.signal || controller?.signal,
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // A static host can return HTML for a missing API route.
    }
    return { response, payload };
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

function accountPresenceAvailable() {
  return usingSupabaseSync() && sharedSync.session && sharedSync.available === true;
}

function accountPresenceRelativeTime(timestamp) {
  const value = new Date(timestamp || "");
  if (Number.isNaN(value.getTime())) return "Chưa xác định";
  const seconds = Math.max(0, Math.round((Date.now() - value.getTime()) / 1000));
  if (seconds < 20) return "Vừa hoạt động";
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} phút trước`;
}

function accountUsageDepartmentName(departmentId) {
  if (!departmentId || departmentId === "unassigned") return "Chưa phân phòng";
  return departmentById(departmentId)?.name || "Phòng chưa xác định";
}

function accountUsageSelectedDepartmentId() {
  return String(byId("accountUsageDepartmentFilter")?.value || accountPresence.usageDepartmentId || "");
}

function renderAccountUsageDepartmentFilter() {
  const select = byId("accountUsageDepartmentFilter");
  if (!select) return;
  const options = [
    { id: "", name: "Tất cả phòng" },
    ...departments.map((department) => ({ id: department.id, name: department.name })),
    { id: "unassigned", name: "Chưa phân phòng" },
  ];
  const signature = options.map((option) => `${option.id}:${option.name}`).join("|");
  const selected = accountPresence.usageDepartmentId || select.value || "";
  if (select.dataset.optionsSignature !== signature) {
    select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.name)}</option>`).join("");
    select.dataset.optionsSignature = signature;
  }
  select.value = options.some((option) => option.id === selected) ? selected : "";
  accountPresence.usageDepartmentId = select.value;
}

function accountUsageGroupsForDepartment(groups, departmentId) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  return departmentId ? safeGroups.filter((group) => String(group.departmentId || "unassigned") === departmentId) : safeGroups;
}

function accountUsageDepartmentTotal(departmentId) {
  return state.accounts.filter((account) => {
    if (account.disabled) return false;
    const accountDepartmentId = accountDepartmentIdForStatistics(account);
    return accountDepartmentId === departmentId;
  }).length;
}

function accountDepartmentIdForStatistics(account) {
  return String(account?.departmentId || personById(account?.personId)?.departmentId || "unassigned");
}

function taskCreatorAccountLookup() {
  const byId = new Map();
  const byPersonId = new Map();
  const byLegacyName = new Map();
  const addLegacyName = (value, account) => {
    const key = normalizeSearchText(value || "");
    if (!key) return;
    const matches = byLegacyName.get(key) || [];
    if (!matches.some((item) => item.id === account.id)) matches.push(account);
    byLegacyName.set(key, matches);
  };
  state.accounts.forEach((account) => {
    if (!account?.id) return;
    byId.set(String(account.id), account);
    if (account.personId) {
      const personId = String(account.personId);
      const matches = byPersonId.get(personId) || [];
      matches.push(account);
      byPersonId.set(personId, matches);
    }
    addLegacyName(account.displayName, account);
    addLegacyName(account.username, account);
  });
  return { byId, byPersonId, byLegacyName };
}

function taskCreatorAccount(task, lookup = taskCreatorAccountLookup()) {
  const creatorId = String(task?.createdById || "").trim();
  if (creatorId && lookup.byId.has(creatorId)) return lookup.byId.get(creatorId);
  const personMatches = creatorId ? lookup.byPersonId.get(creatorId) || [] : [];
  if (personMatches.length === 1) return personMatches[0];
  const creatorName = normalizeSearchText(task?.createdBy || task?.createdByName || creatorId);
  const matches = creatorName ? lookup.byLegacyName.get(creatorName) || [] : [];
  return matches.length === 1 ? matches[0] : null;
}

function accountTaskCreationStatistics(departmentId = "") {
  const accounts = state.accounts
    .filter((account) => !departmentId || accountDepartmentIdForStatistics(account) === departmentId)
    .map((account) => ({ account, createdCount: 0, relatedCount: 0 }));
  const rowsByAccountId = new Map(accounts.map((row) => [String(row.account.id), row]));
  const lookup = taskCreatorAccountLookup();
  let unidentifiedCount = 0;
  (state.tasks || []).forEach((task) => {
    const creator = taskCreatorAccount(task, lookup);
    const participantIds = new Set(taskParticipantIds(task));
    if (!creator && !departmentId) unidentifiedCount += 1;
    accounts.forEach((row) => {
      const createdByAccount = creator?.id === row.account.id;
      const participatesInTask = Boolean(row.account.personId) && participantIds.has(String(row.account.personId));
      if (createdByAccount) row.createdCount += 1;
      if (createdByAccount || participatesInTask) row.relatedCount += 1;
    });
  });
  const totalCreated = accounts.reduce((total, row) => total + row.createdCount, 0);
  const totalRelated = accounts.reduce((total, row) => total + row.relatedCount, 0);
  return {
    totalCreated,
    totalRelated,
    unidentifiedCount,
    rows: accounts.sort((a, b) => b.relatedCount - a.relatedCount || b.createdCount - a.createdCount || String(a.account.displayName || a.account.username).localeCompare(String(b.account.displayName || b.account.username), "vi")),
  };
}

function renderAccountTaskCreationStatistics() {
  const total = byId("accountTaskCreationTotal");
  const list = byId("accountTaskCreationList");
  if (!total || !list) return;
  const departmentId = accountUsageSelectedDepartmentId();
  const statistics = accountTaskCreationStatistics(departmentId);
  total.textContent = `${statistics.totalRelated} liên quan`;
  total.title = `${statistics.totalCreated} công việc được tạo · ${statistics.totalRelated} lượt công việc liên quan`;
  const rows = statistics.rows.map(({ account, createdCount, relatedCount }) => {
    const department = accountUsageDepartmentName(accountDepartmentIdForStatistics(account));
    const role = accountRoleLabels[account.role] || account.role || "Tài khoản";
    const status = account.disabled ? " · Đã khóa" : "";
    return `
      <article class="account-task-creation-row">
        <div>
          <strong>${escapeHtml(account.displayName || account.username || "Tài khoản")}</strong>
          <span>${escapeHtml(`${role} · ${department}${status}`)}</span>
        </div>
        <div class="account-task-creation-metric">
          <strong>${relatedCount}</strong>
          <span>Công việc liên quan</span>
          <span>Đã tạo: ${createdCount}</span>
        </div>
      </article>
    `;
  });
  if (!rows.length) {
    list.innerHTML = `<p class="muted">${escapeHtml(departmentId ? "Không có tài khoản thuộc phòng đã chọn." : "Chưa có tài khoản để thống kê.")}</p>`;
    return;
  }
  if (statistics.unidentifiedCount) {
    rows.push(`
      <article class="account-task-creation-row is-unidentified">
        <div>
          <strong>Chưa xác định tài khoản</strong>
          <span>Dữ liệu công việc cũ không có thông tin người tạo hợp lệ</span>
        </div>
        <div class="account-task-creation-metric">
          <strong>${statistics.unidentifiedCount}</strong>
          <span>công việc</span>
        </div>
      </article>
    `);
  }
  list.innerHTML = rows.join("");
}

function accountUsageCounts(period, departmentId) {
  if (!departmentId) {
    return {
      inactiveCount: Number(period?.inactiveCount) || 0,
      totalAccounts: Number(period?.totalAccounts) || 0,
    };
  }
  const groups = accountUsageGroupsForDepartment(period?.groups, departmentId);
  return {
    inactiveCount: groups.reduce((total, group) => total + (Number(group.inactiveCount) || 0), 0),
    totalAccounts: accountUsageDepartmentTotal(departmentId),
  };
}

function accountUsageMonthlyEntryForDepartment(entry, departmentId) {
  if (!departmentId) return entry;
  const department = (Array.isArray(entry?.departments) ? entry.departments : []).find(
    (item) => String(item.departmentId || "unassigned") === departmentId,
  );
  const totalAccounts = accountUsageDepartmentTotal(departmentId);
  return {
    ...entry,
    totalAccounts,
    uniqueAccounts: Number(department?.uniqueAccounts) || 0,
    inactiveAccounts: Math.max(0, totalAccounts - (Number(department?.uniqueAccounts) || 0)),
    loginCount: Number(department?.loginCount) || 0,
    departments: department ? [department] : [],
  };
}

function accountUsageVisitEntryForDepartment(entry, departmentId) {
  if (!departmentId) return entry || {};
  const department = (Array.isArray(entry?.departments) ? entry.departments : []).find(
    (item) => String(item.departmentId || "unassigned") === departmentId,
  );
  return {
    ...entry,
    uniqueAccounts: Number(department?.uniqueAccounts) || 0,
    visitCount: Number(department?.visitCount) || 0,
  };
}

function renderAccountVisitHistory(entries, departmentId, emptyText) {
  const rows = (Array.isArray(entries) ? entries : []).map((source) => accountUsageVisitEntryForDepartment(source, departmentId));
  if (!rows.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return rows
    .map((entry) => `
      <article class="account-usage-visit-row">
        <time datetime="${escapeHtml(entry.period || "")}">${escapeHtml(formatDate(entry.period) || entry.period || "-")}</time>
        <span><strong>${Number(entry.visitCount) || 0}</strong> lượt truy cập</span>
        <span><strong>${Number(entry.uniqueAccounts) || 0}</strong> tài khoản</span>
      </article>
    `)
    .join("");
}

function renderAccountInactiveUsageGroups(groups, emptyText) {
  if (!Array.isArray(groups) || !groups.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return groups
    .map((group) => {
      const accounts = Array.isArray(group.accounts) ? group.accounts : [];
      const inactiveCount = Number(group.inactiveCount) || accounts.length;
      const totalAccounts = Number(group.totalAccounts) || inactiveCount;
      return `
        <section class="account-usage-department">
          <div class="account-usage-department-head">
            <strong>${escapeHtml(accountUsageDepartmentName(group.departmentId))}</strong>
            <span>${inactiveCount}/${totalAccounts} chưa đăng nhập</span>
          </div>
          <div class="account-usage-people">
            ${accounts
              .map((account) => {
                const role = accountRoleLabels[account.role] || account.role || "Tài khoản";
                const lastLogin = account.lastLoginAt ? `Hoạt động gần nhất: ${formatDateTime(account.lastLoginAt)}` : "Chưa có hoạt động trong 12 tháng gần đây";
                return `
                  <article class="account-usage-person">
                    <div>
                      <strong>${escapeHtml(account.displayName || account.username || "Tài khoản")}</strong>
                      <span>${escapeHtml(role)}</span>
                    </div>
                    <time datetime="${escapeHtml(account.lastLoginAt || "")}">${escapeHtml(lastLogin)}</time>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderAccountUsageDetails() {
  const dayCount = byId("accountInactiveDayCount");
  const weekCount = byId("accountInactiveWeekCount");
  const monthCount = byId("accountInactiveMonthCount");
  const dayList = byId("accountInactiveDayList");
  const weekList = byId("accountInactiveWeekList");
  const monthList = byId("accountInactiveMonthList");
  const historyStatus = byId("accountUsageHistoryStatus");
  const historyList = byId("accountUsageMonthlyHistory");
  const dailyVisitList = byId("accountUsageDailyVisitHistory");
  const todayVisitCount = byId("accountVisitTodayCount");
  const monthVisitCount = byId("accountVisitMonthCount");
  if (!dayCount || !weekCount || !monthCount || !dayList || !weekList || !monthList || !historyStatus || !historyList || !dailyVisitList || !todayVisitCount || !monthVisitCount) return;

  renderAccountUsageDepartmentFilter();
  const departmentId = accountUsageSelectedDepartmentId();
  const connectionMessage = "Kết nối máy chủ để xem thống kê sử dụng.";

  if (!accountPresenceAvailable()) {
    dayCount.textContent = "-";
    weekCount.textContent = "-";
    monthCount.textContent = "-";
    dayList.innerHTML = `<p class="muted">${connectionMessage}</p>`;
    weekList.innerHTML = `<p class="muted">${connectionMessage}</p>`;
    monthList.innerHTML = `<p class="muted">${connectionMessage}</p>`;
    historyStatus.textContent = "Chưa có kết nối";
    historyList.innerHTML = '<p class="muted">Lịch sử hoạt động được tổng hợp từ máy chủ.</p>';
    dailyVisitList.innerHTML = '<p class="muted">Kết nối máy chủ để xem lượt truy cập theo ngày.</p>';
    todayVisitCount.textContent = "-";
    monthVisitCount.textContent = "-";
    return;
  }

  const payload = accountPresence.usagePayload;
  if (!payload) {
    const message = accountPresence.usageError || "Đang tải thống kê sử dụng...";
    dayCount.textContent = "...";
    weekCount.textContent = "...";
    monthCount.textContent = "...";
    dayList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
    weekList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
    monthList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
    historyStatus.textContent = accountPresence.usageError ? "Không thể tải dữ liệu" : "Đang tải";
    historyList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
    dailyVisitList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
    todayVisitCount.textContent = "...";
    monthVisitCount.textContent = "...";
    return;
  }

  const inactiveDay = payload.inactiveDay || {};
  const inactiveWeek = payload.inactiveWeek || {};
  const inactiveMonth = payload.inactiveMonth || {};
  const dayCounts = accountUsageCounts(inactiveDay, departmentId);
  const weekCounts = accountUsageCounts(inactiveWeek, departmentId);
  const monthCounts = accountUsageCounts(inactiveMonth, departmentId);
  const filteredDayGroups = accountUsageGroupsForDepartment(inactiveDay.groups, departmentId);
  const filteredWeekGroups = accountUsageGroupsForDepartment(inactiveWeek.groups, departmentId);
  const filteredMonthGroups = accountUsageGroupsForDepartment(inactiveMonth.groups, departmentId);
  const emptyPrefix = departmentId ? "Phòng đã chọn không có tài khoản chưa đăng nhập trong " : "Tất cả tài khoản đang hoạt động đã đăng nhập trong ";
  dayCount.textContent = `${dayCounts.inactiveCount}/${dayCounts.totalAccounts}`;
  weekCount.textContent = `${weekCounts.inactiveCount}/${weekCounts.totalAccounts}`;
  monthCount.textContent = `${monthCounts.inactiveCount}/${monthCounts.totalAccounts}`;
  dayList.innerHTML = renderAccountInactiveUsageGroups(filteredDayGroups, `${emptyPrefix}ngày hôm nay.`);
  weekList.innerHTML = renderAccountInactiveUsageGroups(filteredWeekGroups, `${emptyPrefix}tuần này.`);
  monthList.innerHTML = renderAccountInactiveUsageGroups(filteredMonthGroups, `${emptyPrefix}tháng này.`);

  const monthlyHistory = Array.isArray(payload.monthlyHistory) ? payload.monthlyHistory : [];
  const dailyVisitHistory = Array.isArray(payload.dailyVisitHistory) ? payload.dailyVisitHistory : [];
  const dailyVisitsAvailable = payload.dailyVisitAvailable !== false;
  const todayVisits = accountUsageVisitEntryForDepartment(
    dailyVisitHistory.find((entry) => entry.period === payload.todayVisitPeriod) || {},
    departmentId,
  );
  const monthVisits = accountUsageMonthlyEntryForDepartment(
    monthlyHistory.find((entry) => entry.period === payload.monthVisitPeriod) || {},
    departmentId,
  );
  todayVisitCount.textContent = dailyVisitsAvailable ? String(Number(todayVisits.visitCount) || 0) : "-";
  monthVisitCount.textContent = String(Number(monthVisits.loginCount) || 0);
  dailyVisitList.innerHTML = dailyVisitsAvailable
    ? renderAccountVisitHistory(
        dailyVisitHistory,
        departmentId,
        departmentId ? "Phòng đã chọn chưa có lượt truy cập trong 30 ngày gần nhất." : "Chưa có lượt truy cập được ghi nhận trong 30 ngày gần nhất.",
      )
    : '<p class="muted">Máy chủ chưa cập nhật bảng tổng hợp lượt truy cập theo ngày. Hãy chạy migration và triển khai lại kpi-sync.</p>';
  historyStatus.textContent = `Cập nhật: ${formatDateTime(payload.generatedAt)}`;
  historyList.innerHTML = monthlyHistory.length
    ? monthlyHistory
        .map((sourceEntry) => {
          const entry = accountUsageMonthlyEntryForDepartment(sourceEntry, departmentId);
          const departmentSummary = (Array.isArray(entry.departments) ? entry.departments : [])
            .map((department) => `${accountUsageDepartmentName(department.departmentId)}: ${Number(department.uniqueAccounts) || 0}/${Number(department.totalAccounts) || 0}`)
            .join(" · ");
          return `
            <article class="account-usage-month-row">
              <div class="account-usage-month-period">
                <strong>${escapeHtml(formatMonthPeriod(entry.period))}</strong>
                <span>${escapeHtml(departmentSummary || "Chưa có phòng ban")}</span>
              </div>
              <div class="account-usage-month-metrics">
                <span><strong>${Number(entry.uniqueAccounts) || 0}/${Number(entry.totalAccounts) || 0}</strong> tài khoản truy cập</span>
                <span><strong>${Number(entry.loginCount) || 0}</strong> lượt truy cập</span>
                <span><strong>${Number(entry.inactiveAccounts) || 0}</strong> chưa đăng nhập</span>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="muted">Chưa có dữ liệu hoạt động hàng tháng.</p>';
}

function renderAccountPresence() {
  const panel = byId("accountPresencePanel");
  if (!panel) return;
  const canMonitor = isAdmin();
  panel.classList.toggle("is-hidden", !canMonitor);
  if (!canMonitor) return;

  renderAccountUsageDepartmentFilter();
  renderAccountTaskCreationStatistics();

  const status = byId("accountPresenceStatus");
  const onlineCount = byId("accountPresenceOnlineCount");
  const todayCount = byId("accountPresenceTodayCount");
  const monthCount = byId("accountPresenceMonthCount");
  const list = byId("accountPresenceList");
  if (!status || !onlineCount || !todayCount || !monthCount || !list) return;

  renderAccountUsageDetails();

  if (!accountPresenceAvailable()) {
    onlineCount.textContent = "-";
    todayCount.textContent = "-";
    monthCount.textContent = "-";
    status.textContent = usingSupabaseSync()
      ? "Đang kết nối máy chủ để cập nhật trạng thái trực tuyến."
      : "Giám sát trực tuyến yêu cầu cấu hình Supabase Cloud.";
    list.innerHTML = '<p class="muted">Chưa có dữ liệu giám sát trực tuyến.</p>';
    return;
  }

  const payload = accountPresence.payload;
  if (!payload) {
    onlineCount.textContent = "...";
    todayCount.textContent = "...";
    monthCount.textContent = "...";
    status.textContent = accountPresence.error || "Đang cập nhật trạng thái trực tuyến...";
    list.innerHTML = '<p class="muted">Đang tải danh sách tài khoản trực tuyến...</p>';
    return;
  }

  onlineCount.textContent = String(payload.onlineCount || 0);
  todayCount.textContent = String(payload.todayUniqueAccounts || 0);
  monthCount.textContent = String(payload.monthUniqueAccounts || 0);
  status.textContent = `Cập nhật lúc ${formatDateTime(payload.generatedAt)} · Hoạt động trong ${Math.round(Number(payload.onlineWindowSeconds || 120) / 60)} phút gần nhất.`;
  const onlineAccounts = Array.isArray(payload.onlineAccounts) ? payload.onlineAccounts : [];
  list.innerHTML = onlineAccounts.length
    ? onlineAccounts
        .map((account) => {
          const department = departmentById(account.departmentId)?.name || "Không phân phòng";
          return `
            <article class="account-presence-row">
              <span class="account-presence-dot" aria-hidden="true"></span>
              <div class="account-presence-person">
                <strong>${escapeHtml(account.displayName || account.username || "Tài khoản")}</strong>
                <span>${escapeHtml(accountRoleLabels[account.role] || account.role || "Tài khoản")} · ${escapeHtml(department)}</span>
              </div>
              <time datetime="${escapeHtml(account.lastSeenAt || "")}">${escapeHtml(accountPresenceRelativeTime(account.lastSeenAt))}</time>
            </article>
          `;
        })
        .join("")
    : '<p class="muted">Không có tài khoản nào đang hoạt động trong thời gian giám sát.</p>';
}

async function requestAccountPresence() {
  if (!accountPresenceAvailable() || document.visibilityState === "hidden" || accountPresence.inFlight) return;
  accountPresence.inFlight = true;
  try {
    const { response, payload } = await sharedJsonRequest("presence");
    if (response.status === 401) {
      expireSharedSession();
      return;
    }
    if (!response.ok) throw new Error(payload?.error || "Presence request failed.");
    if (isAdmin()) {
      accountPresence.payload = payload;
      accountPresence.error = "";
      renderAccountPresence();
      if (activeViewId() === "accounts") requestAccountUsageHistory();
    }
  } catch {
    if (isAdmin()) {
      accountPresence.error = "Không thể cập nhật trạng thái trực tuyến. Hệ thống sẽ tự thử lại.";
      renderAccountPresence();
    }
  } finally {
    accountPresence.inFlight = false;
  }
}

function scheduleAccountUsageRetry() {
  if (accountPresence.usageRetryTimer || accountPresence.usageRetryAttempts >= 3 || document.visibilityState === "hidden") return;
  const delay = Math.min(30000, 3000 * 2 ** accountPresence.usageRetryAttempts);
  accountPresence.usageRetryAttempts += 1;
  accountPresence.usageRetryTimer = window.setTimeout(() => {
    accountPresence.usageRetryTimer = 0;
    requestAccountUsageHistory();
  }, delay);
}

async function requestAccountUsageHistory({ force = false } = {}) {
  if (!isAdmin() || !accountPresenceAvailable() || document.visibilityState === "hidden" || accountPresence.usageInFlight) return;
  const usageIsFresh = accountPresence.usagePayload && Date.now() - accountPresence.usageLastLoadedAt < ACCOUNT_USAGE_AUTO_REFRESH_MS;
  if (!force && usageIsFresh) return;
  if (force) {
    if (accountPresence.usageRetryTimer) window.clearTimeout(accountPresence.usageRetryTimer);
    accountPresence.usageRetryTimer = 0;
    accountPresence.usageRetryAttempts = 0;
  }
  accountPresence.usageInFlight = true;
  accountPresence.usageError = "";
  renderAccountUsageDetails();
  try {
    const { response, payload } = await sharedJsonRequest("usage-history", { timeoutMs: ACCOUNT_USAGE_REQUEST_TIMEOUT_MS });
    if (response.status === 401) {
      expireSharedSession();
      return;
    }
    if (!response.ok) throw new Error(payload?.error || "Usage history request failed.");
    if (isAdmin()) {
      accountPresence.usagePayload = payload;
      accountPresence.usageError = "";
      accountPresence.usageLastLoadedAt = Date.now();
      accountPresence.usageRetryAttempts = 0;
      renderAccountUsageDetails();
    }
  } catch (error) {
    if (isAdmin()) {
      const timeout = error?.name === "AbortError";
      const requiresMigration = String(error?.message || "").includes("Usage monitoring is unavailable");
      accountPresence.usageError = requiresMigration
        ? "Máy chủ chưa hoàn tất nâng cấp thống kê. Cần chạy migration và deploy lại kpi-sync."
        : timeout
          ? "Máy chủ phản hồi chậm. Hệ thống sẽ tự thử lại."
          : "Không thể tải thống kê sử dụng. Hệ thống sẽ tự thử lại.";
      renderAccountUsageDetails();
      if (!requiresMigration) scheduleAccountUsageRetry();
    }
  } finally {
    accountPresence.usageInFlight = false;
  }
}

function startAccountPresenceMonitoring() {
  if (!accountPresenceAvailable()) return;
  if (!accountPresence.heartbeatTimer) {
    accountPresence.heartbeatTimer = window.setInterval(() => {
      requestAccountPresence();
    }, ACCOUNT_PRESENCE_HEARTBEAT_MS);
  }
  requestAccountPresence();
}

function stopAccountPresenceMonitoring() {
  if (accountPresence.heartbeatTimer) window.clearInterval(accountPresence.heartbeatTimer);
  if (accountPresence.usageRetryTimer) window.clearTimeout(accountPresence.usageRetryTimer);
  accountPresence.heartbeatTimer = 0;
  accountPresence.inFlight = false;
  accountPresence.payload = null;
  accountPresence.error = "";
  accountPresence.usageInFlight = false;
  accountPresence.usagePayload = null;
  accountPresence.usageError = "";
  accountPresence.usageLastLoadedAt = 0;
  accountPresence.usageDepartmentId = "";
  accountPresence.usageRetryTimer = 0;
  accountPresence.usageRetryAttempts = 0;
}

async function probeSharedSync({ force = false } = {}) {
  if (!sharedSyncSupported()) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    sharedSync.available = null;
    sharedSync.initialized = null;
    return false;
  }
  if (!force && sharedSync.available === true) return true;
  try {
    const { response, payload } = await sharedJsonRequest("status");
    sharedSync.available = response.ok && payload?.available === true;
    sharedSync.initialized = sharedSync.available ? Boolean(payload?.initialized) : null;
    sharedSync.deploymentVersion = sharedSync.available ? String(payload?.deploymentVersion || "") : "";
  } catch {
    // Do not cache a transient connection failure. The next online/focus/poll
    // event must be able to reconnect without forcing the user to reload.
    sharedSync.available = null;
    sharedSync.initialized = null;
  }
  return sharedSync.available === true;
}

function deploymentVersionAtLeast(actual, required) {
  const parse = (value) => String(value || "").match(/\d+/g)?.map(Number) || [];
  const current = parse(actual);
  const minimum = parse(required);
  if (!current.length || !minimum.length) return false;
  const length = Math.max(current.length, minimum.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] || 0;
    const minimumPart = minimum[index] || 0;
    if (currentPart !== minimumPart) return currentPart > minimumPart;
  }
  return true;
}

function sharedSyncSupportsTaskProgressLifecycle() {
  if (!usingSupabaseSync()) return true;
  return deploymentVersionAtLeast(sharedSync.deploymentVersion, "2026.08.21.1");
}

function sharedSyncSupportsSectionHeadKpiCatalog() {
  if (!usingSupabaseSync()) return true;
  return deploymentVersionAtLeast(sharedSync.deploymentVersion, "2026.08.21.2");
}

async function adoptSharedState(payload, { render = true } = {}) {
  const localActivePeriod = state.activePeriod;
  const normalized = normalizeStatePayload(payload);
  normalized.activePeriod = localActivePeriod || normalized.activePeriod;
  Object.assign(state, normalized);
  applyRuntimeKpiCatalogs(state);
  sharedSync.baseState = cloneStatePayload(normalized);
  sharedSync.serverBaseState = sharedServerBasePayload(payload);
  persistState();
  const migrationResults = await Promise.all([
    migrateBulletinMediaToIndexedDb(),
    migrateArchiveFilesToIndexedDb(),
    migrateTaskAttachmentsToIndexedDb(),
  ]);
  if (migrationResults.some(Boolean)) {
    sharedSync.localChangeVersion += 1;
    sharedSync.pending = true;
    await markSharedStateDirty();
    queueSharedStateSync();
  } else {
    await clearSharedStateDirty();
  }
  if (render) renderAll();
}

async function retainUnsyncedLocalChanges(remotePayload, { render = true } = {}) {
  const remote = normalizeStatePayload(remotePayload);
  const local = cloneStatePayload(state);
  const base = sharedSync.baseState ? cloneStatePayload(sharedSync.baseState) : cloneStatePayload(remote);
  const merged = mergeRemoteStateWithUnsyncedChanges(base, local, remote);
  Object.assign(state, merged);
  applyRuntimeKpiCatalogs(state);
  sharedSync.baseState = cloneStatePayload(remote);
  sharedSync.serverBaseState = sharedServerBasePayload(remotePayload);
  sharedSync.pending = true;
  persistState();
  await markSharedStateDirty();
  if (render) renderAll();
  queueSharedStateSync();
}

async function bootstrapOfflineFileLogin(username, password) {
  const config = supabaseSyncConfig();
  if (!config || navigator.onLine === false) return { error: "" };
  try {
    const result = await sharedJsonRequest("login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, includeOfflineCredentials: true }),
      timeoutMs: 12000,
    });
    if (!result.response.ok || !result.payload?.state) {
      return { error: result.payload?.error || "Không thể xác thực tài khoản từ máy chủ." };
    }
    const remoteState = normalizeStatePayload(result.payload.state);
    const account = (remoteState.accounts || []).find(
      (item) => normalizedLoginUsername(item?.username) === normalizedLoginUsername(username),
    );
    if (!account || account.disabled) return { error: "Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa." };
    Object.assign(state, remoteState);
    applyRuntimeKpiCatalogs(state);
    persistState();
    cacheOfflineAccountDirectory(remoteState.accounts);
    cacheServerOfflineLoginProofs(result.payload.offlineCredentials);
    await cacheOfflineAdminState(account, remoteState);
    return { account };
  } catch {
    return {
      error: "Không thể xác thực ngoại tuyến trên thiết bị này. Hãy mở hệ thống khi có mạng một lần để lưu dữ liệu và mã xác thực cho thiết bị này.",
    };
  }
}

async function loginSharedSession(username, password) {
  await ensureDurableStateRestored();
  await restoreSharedSyncCheckpoint();
  if (isOfflineFileRuntime()) {
    const offlineAccount = await verifyOfflineLogin(username, password);
    if (offlineAccount) {
      const accountPresent = (state.accounts || []).some((account) => String(account?.id || "") === String(offlineAccount.id));
      if (!accountPresent && offlineAccount.role === "admin" && !(await restoreOfflineAdminState(offlineAccount))) {
        return {
          mode: "offline",
          error: "Thiết bị này chưa có bản dữ liệu Admin đã xác thực để làm việc ngoại tuyến. Hãy đăng nhập Admin khi có mạng một lần.",
        };
      }
      sharedSync.session = true;
      sharedSync.accountId = String(offlineAccount.id);
      sharedSync.available = null;
      sharedSync.initialized = null;
      return { mode: "offline", offlineAccountId: String(offlineAccount.id) };
    }
    const bootstrap = await bootstrapOfflineFileLogin(username, password);
    if (bootstrap.account) {
      sharedSync.session = true;
      sharedSync.accountId = String(bootstrap.account.id);
      sharedSync.available = null;
      sharedSync.initialized = null;
      return {
        mode: "offline",
        offlineAccountId: String(bootstrap.account.id),
        warning: "Đã xác thực và lưu bản làm việc ngoại tuyến trên thiết bị này. Khi mất mạng, tài khoản vẫn có thể đăng nhập trong thời hạn cho phép.",
      };
    }
    return {
      mode: "offline",
      error: bootstrap.error || "Không thể đăng nhập ngoại tuyến trên thiết bị này. Hãy đăng nhập khi có mạng một lần để khởi tạo quyền offline.",
    };
  }
  if (!(await probeSharedSync())) {
    const offlineAccount = await verifyOfflineLogin(username, password);
    if (offlineAccount) {
      sharedSync.session = true;
      sharedSync.accountId = String(offlineAccount.id);
      sharedSync.available = null;
      sharedSync.initialized = null;
      scheduleSharedStateRefresh({ immediate: true });
      return {
        mode: "offline",
        offlineAccountId: String(offlineAccount.id),
        warning: "Đang làm việc ngoại tuyến. Thay đổi được lưu trên thiết bị này và sẽ chờ đồng bộ khi đăng nhập lại lúc có mạng.",
      };
    }
    return usingSupabaseSync() || localStorage.getItem(SHARED_SYNC_REQUIRED_KEY) === "1"
      ? { mode: "remote", error: "Không thể xác thực ngoại tuyến trên thiết bị này. Hãy đăng nhập online một lần trên chính thiết bị này trước." }
      : { mode: "local" };
  }
  let result;
  try {
    const includeOfflineCredentials = shouldRequestAdminOfflineCredentials(username);
    result = await sharedJsonRequest("login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, includeOfflineCredentials }),
    });
  } catch {
    return { mode: "remote", error: "Khong the ket noi may chu du lieu." };
  }
  if (!result.response.ok || !result.payload?.state) {
    return { mode: "remote", error: result.payload?.error || "Khong the dang nhap may chu du lieu." };
  }
  cacheServerOfflineLoginProofs(result.payload.offlineCredentials);
  const remoteAccounts = Array.isArray(result.payload.state?.accounts) ? result.payload.state.accounts : [];
  cacheOfflineAccountDirectory(remoteAccounts);
  const remoteAccount = remoteAccounts.find((account) => String(account?.username || "").toLowerCase() === String(username || "").toLowerCase());
  const remoteAccountId = String(remoteAccount?.id || "");
  if (sharedSync.dirty && sharedSync.dirtyAccountId && remoteAccountId && sharedSync.dirtyAccountId !== remoteAccountId) {
    persistSharedConflictBackup(cloneStatePayload(state), {
      download: false,
      reason: "Thay doi chua dong bo thuoc tai khoan truoc do.",
    });
    sharedSync.baseState = null;
    sharedSync.serverBaseState = null;
    await clearSharedStateDirty();
  }
  sharedSync.session = true;
  sharedSync.accountId = remoteAccountId;
  sharedSync.sessionToken = result.payload.sessionToken || "";
  if (usingSupabaseSync() && !sharedSync.sessionToken) {
    sharedSync.session = false;
    sharedSync.accountId = "";
    return { mode: "remote", error: "May chu Supabase khong tra ve phien dang nhap hop le." };
  }
  if (sharedSync.sessionToken) localStorage.setItem(SHARED_SYNC_SESSION_TOKEN_KEY, sharedSync.sessionToken);
  else localStorage.removeItem(SHARED_SYNC_SESSION_TOKEN_KEY);
  sharedSync.revision = Number(result.payload.revision) || 0;
  sharedSync.conflict = false;
  sharedSync.conflictNotified = false;
  localStorage.setItem(SHARED_SYNC_REQUIRED_KEY, "1");
  const serverUninitialized = sharedSync.revision === 0;
  if (serverUninitialized && remoteAccount?.role === "admin" && canBootstrapCloudFromLocalState()) {
    sharedSync.baseState = cloneStatePayload(normalizeStatePayload(result.payload.state));
    sharedSync.serverBaseState = sharedServerBasePayload(result.payload.state);
    sharedSync.localChangeVersion += 1;
    sharedSync.pending = true;
    await markSharedStateDirty();
    queueSharedStateSync();
    scheduleSharedStateRefresh({ immediate: true });
    return {
      mode: "remote",
      warning: "May chu trung tam dang rong. He thong dang khoi tao tu ban du lieu Admin hien co; giu ket noi mang den khi dong bo hoan tat.",
    };
  }
  if (serverUninitialized && localStateHasBusinessData()) {
    persistSharedConflictBackup(cloneStatePayload(state), {
      download: false,
      reason: "May chu trung tam chua duoc khoi tao; can Nhap JSON day du bang tai khoan Admin.",
    });
  }
  if (sharedSync.dirty) {
    await retainUnsyncedLocalChanges(result.payload.state, { render: false });
  } else {
    await adoptSharedState(result.payload.state, { render: false });
  }
  if (remoteAccount?.role === "admin") void cacheOfflineAdminState(remoteAccount, result.payload.state);
  scheduleSharedStateRefresh({ immediate: true });
  return { mode: "remote" };
}

function persistSharedConflictBackup(snapshot, { download = true, reason = "" } = {}) {
  const backup = { createdAt: new Date().toISOString(), revision: sharedSync.revision, reason, state: snapshot };
  try {
    localStorage.setItem(SHARED_SYNC_CONFLICT_KEY, JSON.stringify(backup));
  } catch {
    // The current in-memory state remains available if the local backup cannot be stored.
  }
  if (!download) return;
  try {
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `du-lieu-xung-dot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch {
    // Local storage still retains the conflict snapshot when a download is blocked.
  }
}

async function uploadSharedBinaryFile(file) {
  const key = storedFileKey(file);
  if (!key || file?.remoteKey) return file?.remoteKey || "";
  const dataUrl = file?.dataUrl || (await readStoredFileDataUrl(file));
  if (!dataUrl) throw new Error(`Khong tim thay du lieu tep ${file?.name || key}.`);
  const formData = new FormData();
  formData.append("key", key);
  formData.append("file", dataUrlToBlob(dataUrl, file?.type || "application/octet-stream"), file?.name || key);
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SHARED_SYNC_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(sharedEndpoint("file"), {
        method: "POST",
        body: formData,
        credentials: usingSupabaseSync() ? "omit" : "same-origin",
        cache: "no-store",
        headers: sharedRequestHeaders(),
        signal: controller.signal,
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        // The status check below supplies a useful fallback error.
      }
      if (!response.ok || !payload?.key) {
        const error = new Error(payload?.error || "Khong the tai tep len may chu.");
        error.status = response.status;
        throw error;
      }
      return payload.key;
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Tai tep len may chu qua thoi gian cho.");
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  }
}

async function processWithConcurrency(items, worker, limit = 3) {
  const queue = Array.isArray(items) ? items : [];
  let nextIndex = 0;
  const runner = async () => {
    while (nextIndex < queue.length) {
      const item = queue[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), queue.length) }, runner));
}

async function attachSharedFileKeys(sourceRecords, snapshotRecords, fieldName) {
  const sourceById = new Map((sourceRecords || []).map((record) => [record.id, record]));
  const uploads = [];
  for (const snapshotRecord of snapshotRecords || []) {
    const sourceRecord = sourceById.get(snapshotRecord.id);
    if (!sourceRecord || !Array.isArray(snapshotRecord[fieldName])) continue;
    for (const snapshotFile of snapshotRecord[fieldName]) {
      const key = storedFileKey(snapshotFile);
      if (!key || snapshotFile.remoteKey) continue;
      const sourceFile = (sourceRecord[fieldName] || []).find((file) => storedFileKey(file) === key);
      if (!sourceFile) continue;
      uploads.push({ sourceFile, snapshotFile });
    }
  }
  await processWithConcurrency(uploads, async ({ sourceFile, snapshotFile }) => {
    try {
      const remoteKey = await uploadSharedBinaryFile(sourceFile);
      if (!remoteKey) return;
      sourceFile.remoteKey = remoteKey;
      snapshotFile.remoteKey = remoteKey;
      delete sourceFile.remoteUploadError;
      delete snapshotFile.remoteUploadError;
    } catch (error) {
      if (Number(error?.status) !== 413) throw error;
      const message = String(error?.message || "Tep vuot qua gioi han may chu.");
      sourceFile.remoteUploadError = message;
      snapshotFile.remoteUploadError = message;
      sharedSync.fileWarnings.push(`${sourceFile.name || storedFileKey(sourceFile)}: ${message}`);
    }
  }, 3);
}

async function createSharedStateSnapshot() {
  const snapshot = cloneStatePayload(state);
  sharedSync.fileWarnings = [];
  await attachSharedFileKeys(state.tasks, snapshot.tasks, "attachments");
  await attachSharedFileKeys(state.bulletins, snapshot.bulletins, "media");
  await attachSharedFileKeys(state.archiveRecords, snapshot.archiveRecords, "files");
  return snapshot;
}

function sharedSyncRetryDelay() {
  const exponent = Math.min(sharedSync.retryAttempt, 5);
  const baseDelay = Math.min(SHARED_SYNC_RETRY_MAX_MS, SHARED_SYNC_RETRY_INITIAL_MS * 2 ** exponent);
  return baseDelay + Math.round(Math.random() * 1200);
}

function scheduleSharedStateRetry() {
  if (isOfflineFileRuntime() || !sharedSync.session || !sharedSync.dirty || sharedSync.retryTimer || (usingSupabaseSync() && !sharedSync.sessionToken)) return;
  const delay = sharedSyncRetryDelay();
  sharedSync.retryTimer = window.setTimeout(async () => {
    sharedSync.retryTimer = 0;
    if (!sharedSync.session || !sharedSync.dirty) return;
    if (await probeSharedSync({ force: true })) {
      sharedSync.pending = true;
      flushSharedStateSync();
      return;
    }
    sharedSync.retryAttempt += 1;
    scheduleSharedStateRetry();
  }, delay);
}

function scheduleSharedStateRefresh({ immediate = false } = {}) {
  if (isOfflineFileRuntime() || sharedSync.refreshTimer || !sharedSync.session || (usingSupabaseSync() && !sharedSync.sessionToken)) return;
  const delay = immediate ? Math.round(Math.random() * 1200) : SHARED_SYNC_REFRESH_MS + Math.round(Math.random() * SHARED_SYNC_REFRESH_JITTER_MS);
  sharedSync.refreshTimer = window.setTimeout(async () => {
    sharedSync.refreshTimer = 0;
    await refreshSharedState();
    scheduleSharedStateRefresh();
  }, delay);
}

function stopSharedStateRefresh() {
  if (sharedSync.timer) window.clearTimeout(sharedSync.timer);
  if (sharedSync.refreshTimer) window.clearTimeout(sharedSync.refreshTimer);
  if (sharedSync.retryTimer) window.clearTimeout(sharedSync.retryTimer);
  sharedSync.timer = 0;
  sharedSync.refreshTimer = 0;
  sharedSync.retryTimer = 0;
  sharedSync.retryAttempt = 0;
}

function queueSharedStateSync() {
  if (isOfflineFileRuntime() || !sharedSync.session || (usingSupabaseSync() && !sharedSync.sessionToken)) return;
  sharedSync.pending = true;
  if (sharedSync.available !== true) {
    scheduleSharedStateRetry();
    return;
  }
  if (sharedSync.timer) return;
  sharedSync.timer = window.setTimeout(() => {
    sharedSync.timer = 0;
    flushSharedStateSync();
  }, 500);
}

function stableSharedValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableSharedValue(item));
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((output, key) => {
        output[key] = stableSharedValue(value[key]);
        return output;
      }, {});
  }
  return value;
}

function sharedValuesEqual(left, right) {
  return JSON.stringify(stableSharedValue(left)) === JSON.stringify(stableSharedValue(right));
}

function sharedRecordId(record) {
  return record && typeof record === "object" ? String(record.id || "").trim() : "";
}

function sharedRecordMap(records) {
  const map = new Map();
  (records || []).forEach((record) => {
    const id = sharedRecordId(record);
    if (id) map.set(id, record);
  });
  return map;
}

function kpiCatalogEntryKey(field, entry) {
  if (field === "behaviorRules") {
    const name = Array.isArray(entry) ? entry[0] : entry?.name;
    return catalogText(name).toLocaleLowerCase("vi");
  }
  return sharedRecordId(entry);
}

function kpiCatalogEntryMap(field, entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return null;
  for (const entry of entries) {
    const key = kpiCatalogEntryKey(field, entry);
    if (!key || map.has(key)) return null;
    map.set(key, entry);
  }
  return map;
}

function mergeKpiCatalogArrayChange(field, baseValue, localValue, remoteValue) {
  if (!["departments", "roles", "behaviorRules"].includes(field)) return null;
  const base = kpiCatalogEntryMap(field, baseValue);
  const local = kpiCatalogEntryMap(field, localValue);
  const remote = kpiCatalogEntryMap(field, remoteValue);
  if (!base || !local || !remote) return null;

  const output = new Map(remote);
  const changedKeys = new Set([...base.keys(), ...local.keys()]);
  for (const key of changedKeys) {
    const before = base.get(key);
    const requested = local.get(key);
    const onServer = remote.get(key);
    if (sharedValuesEqual(before, requested)) continue;

    if (!before) {
      if (!onServer) output.set(key, requested);
      else if (!sharedValuesEqual(onServer, requested)) return null;
      continue;
    }
    if (!requested) {
      if (!onServer) continue;
      if (!sharedValuesEqual(onServer, before)) return null;
      output.delete(key);
      continue;
    }
    if (!onServer) return null;
    if (sharedValuesEqual(onServer, before) || sharedValuesEqual(onServer, requested)) {
      output.set(key, requested);
      continue;
    }
    return null;
  }

  const orderedKeys = [
    ...remote.keys(),
    ...local.keys(),
  ].filter((key, index, values) => output.has(key) && values.indexOf(key) === index);
  return orderedKeys.map((key) => output.get(key));
}

function mergeKpiParameterObject(baseValue, localValue, remoteValue) {
  if (!baseValue || typeof baseValue !== "object" || Array.isArray(baseValue)
    || !localValue || typeof localValue !== "object" || Array.isArray(localValue)
    || !remoteValue || typeof remoteValue !== "object" || Array.isArray(remoteValue)) return null;
  const output = { ...remoteValue };
  const keys = new Set([...Object.keys(baseValue), ...Object.keys(localValue)]);
  for (const key of keys) {
    const before = baseValue[key];
    const requested = localValue[key];
    const onServer = remoteValue[key];
    if (sharedValuesEqual(before, requested)) continue;
    if (!sharedValuesEqual(onServer, before) && !sharedValuesEqual(onServer, requested)) return null;
    if (Object.prototype.hasOwnProperty.call(localValue, key)) output[key] = requested;
    else delete output[key];
  }
  return output;
}

function mergeKpiSystemCustomizationChange(baseValue, localValue, remoteValue) {
  if (!baseValue || typeof baseValue !== "object" || Array.isArray(baseValue)
    || !localValue || typeof localValue !== "object" || Array.isArray(localValue)
    || !remoteValue || typeof remoteValue !== "object" || Array.isArray(remoteValue)) return null;
  const output = { ...remoteValue };
  const keys = new Set([...Object.keys(baseValue), ...Object.keys(localValue)]);
  for (const key of keys) {
    const before = baseValue[key];
    const requested = localValue[key];
    const onServer = remoteValue[key];
    if (sharedValuesEqual(before, requested)) continue;
    if (key === "kpiParameters") {
      const mergedParameters = mergeKpiParameterObject(before, requested, onServer);
      if (!mergedParameters) return null;
      output[key] = mergedParameters;
      continue;
    }
    if (!sharedValuesEqual(onServer, before) && !sharedValuesEqual(onServer, requested)) return null;
    if (Object.prototype.hasOwnProperty.call(localValue, key)) output[key] = requested;
    else delete output[key];
  }
  return output;
}

function mergeSharedScalarFieldChange(key, baseValue, localValue, remoteValue) {
  if (sharedValuesEqual(remoteValue, baseValue) || sharedValuesEqual(remoteValue, localValue)) return localValue;
  if (["departments", "roles", "behaviorRules"].includes(key)) {
    return mergeKpiCatalogArrayChange(key, baseValue, localValue, remoteValue);
  }
  if (key === "systemCustomization") {
    return mergeKpiSystemCustomizationChange(baseValue, localValue, remoteValue);
  }
  return null;
}

function sharedPatchOperationCount(patch) {
  const collectionCount = Object.values(patch?.collections || {}).reduce(
    (total, change) => total + (change?.upserts?.length || 0) + (change?.deletes?.length || 0),
    0,
  );
  return collectionCount + (patch?.fields?.length || 0);
}

function sharedDeniedChangeMessage(deniedChanges, snapshot) {
  const labels = {
    people: "Nhân sự",
    tasks: "Công việc",
    projectCatalog: "Danh mục dự án",
    bulletins: "Bảng tin",
    archiveRecords: "Lưu trữ",
    evaluations: "KPI cá nhân",
    departmentEvaluations: "KPI phòng",
    accounts: "Tài khoản",
    supportRequests: "Yêu cầu hỗ trợ",
    activityLog: "Lịch sử hoạt động",
    field: "Cấu hình hệ thống",
  };
  const changes = Array.isArray(deniedChanges) ? deniedChanges : [];
  const conflictOnly = changes.length > 0 && changes.every((change) => change.reason === "Record changed by another user." || change.reason === "Field changed by another user.");
  const targets = [...new Set(changes.map((change) => labels[change.scope] || "Dữ liệu hệ thống"))].slice(0, 3);
  const targetText = targets.length ? targets.join(", ") : "một số dữ liệu";
  if (conflictOnly) {
    return `${targetText} đã được cập nhật từ thiết bị khác trước khi lưu. Hệ thống đã tải lại kết quả mới nhất từ máy chủ.`;
  }
  const currentState = snapshot || state;
  const rejectedIds = changes
    .filter((change) => change.scope === "tasks")
    .map((change) => (currentState.tasks || []).find((task) => task.id === change.id)?.title || "")
    .filter(Boolean)
    .slice(0, 2);
  const taskDetail = rejectedIds.length ? ` (${rejectedIds.join(", ")})` : "";
  return `Máy chủ không chấp nhận thay đổi ở ${targetText}${taskDetail} theo quyền hiện tại. Dữ liệu đã được khôi phục theo phiên bản hợp lệ trên máy chủ.`;
}

function restoreDeniedSharedChanges(currentPayload, remotePayload, deniedChanges) {
  const current = cloneStatePayload(normalizeStatePayload(currentPayload));
  const remote = cloneStatePayload(normalizeStatePayload(remotePayload));
  const denied = Array.isArray(deniedChanges) ? deniedChanges : [];

  denied.forEach((change) => {
    const scope = String(change?.scope || "");
    const id = String(change?.id || "");
    if (!id) return;

    if (SHARED_SYNC_COLLECTIONS.includes(scope)) {
      const records = Array.isArray(current[scope]) ? [...current[scope]] : [];
      const index = records.findIndex((record) => sharedRecordId(record) === id);
      const accepted = sharedRecordMap(remote[scope]).get(id);
      if (accepted) {
        if (index >= 0) records[index] = accepted;
        else records.push(accepted);
      } else if (index >= 0) {
        records.splice(index, 1);
      }
      current[scope] = records;
      return;
    }

    if (scope === "field" && SHARED_SYNC_SCALAR_FIELDS.includes(id)) {
      current[id] = remote[id];
    }
  });

  return normalizeStatePayload(current);
}

function showSystemToast(title, message, { tone = "warning", duration = 7000 } = {}) {
  const container = byId("phucThinhToastContainer");
  if (!container) return;

  container.querySelectorAll(".phuc-thinh-toast.sync-notice").forEach((toast) => toast.remove());
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = `phuc-thinh-toast sync-notice ${tone}`;
  const heading = document.createElement("h4");
  const details = document.createElement("p");
  heading.textContent = title;
  details.textContent = message;
  toast.append(heading, details);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 260);
  };
  toast.addEventListener("click", dismiss);
  container.append(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(dismiss, Math.max(3500, Number(duration) || 7000));
}

function buildSharedStatePatch(basePayload, nextPayload, serverBasePayload = basePayload) {
  const base = normalizeStatePayload(basePayload);
  const next = normalizeStatePayload(nextPayload);
  const serverBase = sharedServerBasePayload(serverBasePayload) || cloneStatePayload(base);
  const collections = {};

  SHARED_SYNC_COLLECTIONS.forEach((collection) => {
    const baseRecords = sharedRecordMap(base[collection]);
    const serverBaseRecords = sharedRecordMap(serverBase[collection]);
    const nextRecords = sharedRecordMap(next[collection]);
    const upserts = [];
    const deletes = [];
    const recordIds = new Set([...baseRecords.keys(), ...nextRecords.keys()]);
    recordIds.forEach((id) => {
      const before = baseRecords.get(id);
      const after = nextRecords.get(id);
      const serverBefore = serverBaseRecords.get(id);
      if (after && !sharedValuesEqual(before, after)) {
        upserts.push({ id, value: after, baseValue: serverBefore || before || null });
      } else if (before && !after) {
        deletes.push({ id, baseValue: serverBefore || before });
      }
    });
    if (upserts.length || deletes.length) collections[collection] = { upserts, deletes };
  });

  const fields = SHARED_SYNC_SCALAR_FIELDS
    .filter((key) => !sharedValuesEqual(base[key], next[key]))
    .map((key) => ({
      key,
      value: next[key],
      baseValue: Object.prototype.hasOwnProperty.call(serverBase, key) ? serverBase[key] : base[key],
    }));
  return { collections, fields };
}

function mergeRemoteStateWithUnsyncedChanges(sentPayload, currentPayload, remotePayload) {
  const sent = normalizeStatePayload(sentPayload);
  const current = normalizeStatePayload(currentPayload);
  const merged = cloneStatePayload(normalizeStatePayload(remotePayload));

  SHARED_SYNC_COLLECTIONS.forEach((collection) => {
    const sentRecords = sharedRecordMap(sent[collection]);
    const currentRecords = sharedRecordMap(current[collection]);
    const remoteRecords = sharedRecordMap(merged[collection]);
    const orderedIds = (merged[collection] || []).map(sharedRecordId).filter(Boolean);
    const localOnlyIds = [];
    const recordIds = new Set([...sentRecords.keys(), ...currentRecords.keys()]);
    recordIds.forEach((id) => {
      const before = sentRecords.get(id);
      const after = currentRecords.get(id);
      if (sharedValuesEqual(before, after)) return;
      if (after) {
        remoteRecords.set(id, after);
        if (!orderedIds.includes(id)) localOnlyIds.push(id);
      } else {
        remoteRecords.delete(id);
      }
    });
    merged[collection] = [...orderedIds, ...localOnlyIds]
      .filter((id) => remoteRecords.has(id))
      .map((id) => remoteRecords.get(id));
  });

  SHARED_SYNC_SCALAR_FIELDS.forEach((key) => {
    if (sharedValuesEqual(sent[key], current[key])) return;
    const rebased = mergeSharedScalarFieldChange(key, sent[key], current[key], merged[key]);
    merged[key] = rebased === null ? current[key] : rebased;
  });
  merged.activePeriod = current.activePeriod || merged.activePeriod;
  return normalizeStatePayload(merged);
}

async function flushSharedStateSync() {
  if (!sharedSync.session) {
    return { ok: false, pending: sharedSync.dirty, reason: "offline" };
  }
  if (usingSupabaseSync() && !sharedSync.sessionToken) {
    return { ok: false, pending: sharedSync.dirty, reason: "offline-session" };
  }
  if (sharedSync.available !== true) {
    if (sharedSync.dirty) scheduleSharedStateRetry();
    return { ok: false, pending: sharedSync.dirty, reason: "offline" };
  }
  if (!sharedSync.pending) return { ok: !sharedSync.dirty, pending: sharedSync.dirty };
  if (sharedSync.inFlight) return { ok: false, pending: true, reason: "in-flight" };
  sharedSync.pending = false;
  sharedSync.inFlight = true;
  try {
    const snapshot = await createSharedStateSnapshot();
    const baseSnapshot = sharedSync.baseState ? cloneStatePayload(sharedSync.baseState) : cloneStatePayload(snapshot);
    const serverBaseSnapshot = sharedSync.serverBaseState
      ? cloneStatePayload(sharedSync.serverBaseState)
      : cloneStatePayload(baseSnapshot);
    const patch = buildSharedStatePatch(baseSnapshot, snapshot, serverBaseSnapshot);
    const requestedChangeVersion = sharedSync.localChangeVersion;
    if (!sharedPatchOperationCount(patch)) {
      persistState();
      await clearSharedStateDirty();
      return { ok: true, synced: false };
    }
    const useRecordMutations = usingSupabaseSync();
    const { response, payload } = await sharedJsonRequest(useRecordMutations ? "mutate" : "state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: useRecordMutations
        ? JSON.stringify({ baseRevision: sharedSync.revision, patch })
        : JSON.stringify({ revision: sharedSync.revision, state: snapshot }),
    });
    if (response.status === 409) {
      sharedSync.retryAttempt = 0;
      persistSharedConflictBackup(snapshot);
      if (!sharedSync.conflictNotified) {
        sharedSync.conflictNotified = true;
        showSystemToast(
          "Dữ liệu đã được cập nhật",
          "Một thiết bị khác đã lưu thay đổi trước. Hệ thống đang tải lại phiên bản mới nhất từ máy chủ.",
          { tone: "warning", duration: 8500 },
        );
      }
      const latest = await sharedJsonRequest("state");
      if (latest.response.ok && latest.payload?.state) {
        await adoptSharedState(latest.payload.state);
        sharedSync.revision = Number(latest.payload.revision) || sharedSync.revision;
      }
      return { ok: false, conflict: true, reason: "conflict" };
    }
    if (response.status === 401) {
      persistSharedConflictBackup(snapshot, { download: false, reason: "Phiên đồng bộ đã hết hạn trước khi thay đổi được gửi." });
      expireSharedSession();
      return { ok: false, pending: true, reason: "session-expired" };
    }
    if (!response.ok) throw new Error(payload?.error || "Khong the dong bo du lieu.");
    sharedSync.retryAttempt = 0;
    sharedSync.revision = Number(payload.revision) || sharedSync.revision;
    sharedSync.initialized = sharedSync.revision > 0;
    if (payload?.state) {
      const denied = Array.isArray(payload?.denied) ? payload.denied : [];
      const currentForMerge = denied.length
        ? restoreDeniedSharedChanges(state, payload.state, denied)
        : state;
      const merged = mergeRemoteStateWithUnsyncedChanges(snapshot, currentForMerge, payload.state);
      Object.assign(state, merged);
      applyRuntimeKpiCatalogs(state);
      sharedSync.baseState = cloneStatePayload(normalizeStatePayload(payload.state));
      sharedSync.serverBaseState = sharedServerBasePayload(payload.state);
    } else {
      sharedSync.baseState = cloneStatePayload(snapshot);
      sharedSync.serverBaseState = cloneStatePayload(serverBaseSnapshot);
    }
    const hasNewerLocalChange = sharedSync.localChangeVersion !== requestedChangeVersion;
    if (Array.isArray(payload?.denied) && payload.denied.length) {
      const message = sharedDeniedChangeMessage(payload.denied, snapshot);
      persistSharedConflictBackup(snapshot, { download: false, reason: message });
      console.warn("Shared state changes were rejected:", payload.denied);
      showSystemToast("Thay đổi chưa được lưu", message, { tone: "warning", duration: 9000 });
    }
    persistState();
    if (hasNewerLocalChange) {
      sharedSync.pending = true;
      await markSharedStateDirty();
    } else {
      await clearSharedStateDirty();
    }
    return {
      ok: !Array.isArray(payload?.denied) || payload.denied.length === 0,
      synced: true,
      denied: Array.isArray(payload?.denied) ? payload.denied : [],
      fileWarnings: [...sharedSync.fileWarnings],
    };
  } catch (error) {
    if (Number(error?.status) === 401) {
      persistSharedConflictBackup(snapshot, { download: false, reason: "Phien dong bo da het han truoc khi tep duoc gui." });
      expireSharedSession();
      return { ok: false, pending: true, reason: "session-expired" };
    }
    sharedSync.pending = true;
    console.warn("Shared state sync failed:", error);
    sharedSync.available = null;
    await markSharedStateDirty();
    sharedSync.retryAttempt += 1;
    scheduleSharedStateRetry();
    return { ok: false, pending: true, error: error instanceof Error ? error.message : "sync-failed" };
  } finally {
    sharedSync.inFlight = false;
    if (sharedSync.pending && !sharedSync.retryTimer) queueSharedStateSync();
  }
}

async function refreshSharedState() {
  if (isOfflineFileRuntime() || !sharedSync.session || sharedSync.inFlight || document.visibilityState === "hidden" || (usingSupabaseSync() && !sharedSync.sessionToken)) return;
  if (sharedSync.pending || sharedSync.dirty) {
    if (await probeSharedSync({ force: true })) {
      sharedSync.pending = true;
      flushSharedStateSync();
    } else if (sharedSync.dirty) {
      scheduleSharedStateRetry();
    }
    return;
  }
  if (sharedSync.available !== true && !(await probeSharedSync({ force: true }))) return;
  if (document.activeElement?.matches("input, textarea, select") || document.querySelector(".modal-backdrop:not(.is-hidden)")) return;
  try {
    const { response, payload } = await sharedJsonRequest("state", {
      query: sharedSync.revision === null ? {} : { revision: String(sharedSync.revision) },
    });
    if (response.status === 401) {
      expireSharedSession();
      return;
    }
    if (!response.ok || !payload?.state || Number(payload.revision) === sharedSync.revision) return;
    sharedSync.revision = Number(payload.revision) || 0;
    sharedSync.initialized = sharedSync.revision > 0;
    await adoptSharedState(payload.state);
  } catch {
    // Keep the last successful local view while the network is temporarily unavailable.
  }
}

function expireSharedSession() {
  stopAccountPresenceMonitoring();
  stopSharedStateRefresh();
  sharedSync.session = false;
  sharedSync.sessionToken = "";
  sharedSync.revision = null;
  sharedSync.accountId = "";
  sharedSync.available = null;
  localStorage.removeItem(SHARED_SYNC_SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  renderAll();
}

function logoutSharedSession() {
  stopAccountPresenceMonitoring();
  if (!sharedSync.session) return;
  const headers = sharedRequestHeaders();
  const canNotifyServer = sharedSync.available === true;
  sharedSync.session = false;
  sharedSync.sessionToken = "";
  sharedSync.revision = null;
  sharedSync.accountId = "";
  stopSharedStateRefresh();
  localStorage.removeItem(SHARED_SYNC_SESSION_TOKEN_KEY);
  if (!canNotifyServer) return;
  fetch(sharedEndpoint("logout"), {
    method: "POST",
    credentials: usingSupabaseSync() ? "omit" : "same-origin",
    cache: "no-store",
    headers,
  }).catch(() => {});
}

async function restoreSharedSession() {
  const restoredDurableState = await ensureDurableStateRestored();
  await restoreSharedSyncCheckpoint();
  if (restoredDurableState) {
    await Promise.all([
      migrateBulletinMediaToIndexedDb({ persist: false, render: false }),
      migrateArchiveFilesToIndexedDb({ persist: false, render: false }),
      migrateTaskAttachmentsToIndexedDb({ persist: false }),
    ]);
    await persistState();
    renderAll();
  }
  if (!localStorage.getItem(SESSION_KEY) || !sharedSyncSupported()) return;
  if (usingSupabaseSync() && !sharedSync.sessionToken) {
    const savedAccountId = String(localStorage.getItem(SESSION_KEY) || "");
    const savedAccount = (state.accounts || []).find((account) => String(account?.id || "") === savedAccountId);
    if (!savedAccount || savedAccount.disabled) {
      localStorage.removeItem(SESSION_KEY);
      renderAll();
      return;
    }
    // A browser can retain its durable data but lose a session token (for
    // example after cache cleanup). Keep the local session usable offline;
    // a new online sign-in will re-establish cloud synchronization.
    sharedSync.session = true;
    sharedSync.accountId = savedAccountId;
    sharedSync.available = null;
    return;
  }
  sharedSync.session = true;
  sharedSync.accountId = String(localStorage.getItem(SESSION_KEY) || "");
  if (!(await probeSharedSync())) {
    // Preserve the authenticated local session and durable snapshot while the
    // connection is unavailable. A transient outage must not look like data loss.
    if (sharedSync.dirty) scheduleSharedStateRetry();
    scheduleSharedStateRefresh();
    return;
  }
  try {
    const { response, payload } = await sharedJsonRequest("state");
    if (response.status === 401) throw new Error("Session expired.");
    if (!response.ok || !payload?.state) throw new Error("Shared state is unavailable.");
    sharedSync.revision = Number(payload.revision) || 0;
    if (sharedSync.dirty) {
      await retainUnsyncedLocalChanges(payload.state);
    } else {
      await adoptSharedState(payload.state);
    }
    const sectionHeadCatalogMigrated = migrateSectionHeadKpiCatalog();
    const personalKpiMigrated = migratePersonalKpiClassification();
    if (sectionHeadCatalogMigrated || personalKpiMigrated) {
      saveState();
      await flushSharedStateSync();
    }
    startAccountPresenceMonitoring();
    scheduleSharedStateRefresh({ immediate: true });
  } catch (error) {
    if (String(error?.message || "") !== "Session expired.") {
      // Keep the last locally persisted state when a request fails midway.
      sharedSync.available = null;
      return;
    }
    expireSharedSession();
  }
}

function restoreCustomizationLayoutDefaults(stateObject) {
  if (localStorage.getItem(CUSTOMIZATION_LAYOUT_RESTORE_KEY) === "1") return;
  const customization = stateObject.systemCustomization;
  let changed = false;
  Object.values(customization?.fieldOverrides || {}).forEach((override) => {
    if (override && Object.prototype.hasOwnProperty.call(override, "order")) {
      delete override.order;
      changed = true;
    }
    if (override && Object.prototype.hasOwnProperty.call(override, "parentKey")) {
      delete override.parentKey;
      changed = true;
    }
  });
  (customization?.customFields || []).forEach((field) => {
    if (field && Object.prototype.hasOwnProperty.call(field, "order")) {
      delete field.order;
      changed = true;
    }
  });
  localStorage.setItem(CUSTOMIZATION_LAYOUT_RESTORE_KEY, "1");
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObject));
}

function dashboardElementsReady() {
  return ["metricPeople", "metricOverdue", "metricAvg", "metricReward", "rankingList", "alertList", "departmentSummary", "departmentChartSummary"].every((id) => byId(id));
}

function refreshDashboardLiveData() {
  if (activeViewId() !== "dashboard" || !dashboardElementsReady()) return;
  renderDashboard();
}

function scheduleDashboardRefresh() {
  if (dashboardRefreshQueued) return;
  dashboardRefreshQueued = true;
  const run = () => {
    dashboardRefreshQueued = false;
    refreshDashboardLiveData();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
  } else {
    setTimeout(run, 0);
  }
}

function scheduleVisibleViewWork(viewId, callback, delay = 80) {
  const existingTimer = visibleViewWorkTimers.get(viewId);
  if (existingTimer) window.clearTimeout(existingTimer);
  const timer = window.setTimeout(() => {
    visibleViewWorkTimers.delete(viewId);
    if (activeViewId() !== viewId) return;
    const run = () => {
      if (activeViewId() === viewId) callback();
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 500 });
    } else {
      window.setTimeout(run, 0);
    }
  }, delay);
  visibleViewWorkTimers.set(viewId, timer);
}

function reloadStateFromStorage() {
  Object.assign(state, loadState());
  applyRuntimeKpiCatalogs(state);
  if (byId("activePeriod")) byId("activePeriod").value = state.activePeriod;
  scheduleDashboardRefresh();
}

function projectDepartmentFromPerson(person) {
  if (person?.departmentId !== "du-an") return person?.departmentId || "";
  const note = normalizeSearchText(person?.note || "");
  if (note.includes("phong da2") || note.includes("du an 2")) return "du-an-2";
  if (note.includes("phong da1") || note.includes("du an 1")) return "du-an-1";
  return "du-an-1";
}

function projectRoleForPerson(person, departmentId) {
  if (!["du-an-1", "du-an-2"].includes(departmentId)) return person?.roleId || "";
  const note = normalizeSearchText(person?.note || "");
  if (note.includes("pho truong phong")) return `pho-phong-${departmentId}`;
  if (note.includes("truong phong")) return `truong-phong-${departmentId}`;
  if (["truong-phong-du-an", "truong-phong-du-an-1", "truong-phong-du-an-2"].includes(person?.roleId)) return `truong-phong-${departmentId}`;
  if (["ky-su-giam-sat", "ky-su-giam-sat-du-an-1", "ky-su-giam-sat-du-an-2"].includes(person?.roleId)) return `ky-su-giam-sat-${departmentId}`;
  if (person?.roleId === "pho-phong-du-an") return `pho-phong-${departmentId}`;
  if (person?.roleId === "truong-bo-phan-du-an") return `truong-bo-phan-${departmentId}`;
  return person?.roleId || `ky-su-giam-sat-${departmentId}`;
}

function normalizeProjectPerson(person) {
  const departmentId = projectDepartmentFromPerson(person);
  const roleId = projectRoleForPerson(person, departmentId);
  return { ...person, departmentId, roleId };
}

function normalizeDepartmentTermText(value) {
  return String(value ?? "")
    .replace(/[Pp]hòng\s+(?:[Kk]ế\s*)?hoạch\s*-?\s*[Tt]ổng\s*hợp/g, "phòng KHTH")
    .replace(/[Pp]hòng\s+[Gg]iải\s*phóng\s*mặt\s*bằng/g, "phòng GPMB")
    .replace(/[Pp]hòng\s*[Qq]uản\s*lý\s*[Hh]ạ\s*tầng/g, "phòng QLHT")
    .replace(/[Pp]hòng\s+[Hh]ạ\s*tầng/g, "phòng QLHT")
    .replace(/[Cc]án bộ\s+[Hh]ạ\s*tầng/g, "Cán bộ QLHT");
}

function migrateDepartmentTermLabels(options = {}) {
  const persist = options.persist !== false;
  let changed = false;
  const normalizeValue = (value) => {
    if (typeof value === "string") {
      const normalized = normalizeDepartmentTermText(value);
      if (normalized !== value) changed = true;
      return normalized;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const normalized = normalizeValue(item);
        if (normalized !== item) value[index] = normalized;
      });
      return value;
    }
    if (value && typeof value === "object") {
      Object.keys(value).forEach((key) => {
        const normalized = normalizeValue(value[key]);
        if (normalized !== value[key]) value[key] = normalized;
      });
    }
    return value;
  };
  normalizeValue(state);
  if (changed && persist) saveState();
  return changed;
}

function migrateLegacyProjectDepartments() {
  let changed = false;
  state.people = state.people.map((person) => {
    const normalized = normalizeProjectPerson(person);
    if (normalized.departmentId !== person.departmentId || normalized.roleId !== person.roleId) changed = true;
    return normalized;
  });
  state.accounts = state.accounts.map((account) => {
    const linkedPerson = personById(account.personId);
    const departmentId =
      account.departmentId === "du-an" || (isPersonnelAccountRole(account.role) && linkedPerson?.departmentId)
        ? linkedPerson?.departmentId || "du-an-1"
        : account.departmentId;
    if (departmentId !== account.departmentId) changed = true;
    return { ...account, departmentId };
  });
  state.departmentEvaluations = state.departmentEvaluations.map((evaluation) => {
    if (evaluation.departmentId !== "du-an") return evaluation;
    changed = true;
    return { ...evaluation, departmentId: "du-an-1" };
  });
  if (changed) saveState();
}

function personImportKey(person) {
  return `${String(person.name || "").trim().toLowerCase()}|${person.birthDate || ""}`;
}

/* =========================================================================
   🔧 FIX LỖI ĐỒNG BỘ PHÓ PHÒNG HÀNG LOẠT VÀ TỰ ĐỘNG CHUẨN HÓA VỊ TRÍ GPMB
   ========================================================================= */

function fixGpmbDuplicateRoles() {
  if (!Array.isArray(state.people)) return;
  let changed = false;

  state.people.forEach((person) => {
    // Nếu thuộc phòng GPMB và bị dính role "pho-phong-gpmb" hoặc "pho-phong"
    if (person.departmentId === "gpmb" && (person.roleId === "pho-phong-gpmb" || person.roleId === "pho-phong")) {
      const normName = normalizeSearchText(person.name);
      // Giữ lại Phó phòng chuẩn (chị Vũ Thị Hằng Nga), các cán bộ khác trả về "can-bo-gpmb"
      if (!normName.includes("vu thi hang nga")) { 
        person.roleId = "can-bo-gpmb";
        person.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
  });

  if (changed) {
    syncPersonnelAccounts();
    persistState();
  }
}

function mergeImportedPeopleIntoState() {
  const localPeople = Array.isArray(state.people) ? state.people : [];

  // The Excel source is bootstrap data only. Shared deployments always use
  // the server state and must never overwrite personnel edited by users.
  if (!importedPeopleFromExcel.length || usingSupabaseSync()) return false;

  // A populated local state, including one where every source person was
  // later removed, has already completed its initial seed.
  if (state.importedPeopleVersion || localPeople.length) {
    if (!state.importedPeopleVersion && localPeople.length) {
      state.importedPeopleVersion = IMPORTED_PEOPLE_VERSION;
      persistState();
    }
    return false;
  }

  const timestamp = new Date().toISOString();
  state.people = importedPeopleFromExcel
    .filter((person) => person?.id && person?.name)
    .map((excelPerson) => {
      const normalized = normalizeProjectPerson(excelPerson);
      const roleId = normalized.departmentId === "gpmb" && normalized.roleId === "pho-phong-gpmb" ? "can-bo-gpmb" : normalized.roleId;
      return {
        ...normalized,
        roleId,
        customFields: normalized.customFields || {},
        createdAt: normalized.createdAt || timestamp,
        createdBy: normalized.createdBy || "Hệ thống (Excel)",
        updatedAt: normalized.updatedAt || timestamp,
        updatedBy: normalized.updatedBy || "Hệ thống (Excel)",
      };
    });
  state.importedPeopleVersion = IMPORTED_PEOPLE_VERSION;
  syncPersonnelAccounts();
  persistState();
  return Boolean(state.people.length);
}

function migrateCanBoGpmbKpiCatalog() {
  if (state.canBoGpmbKpiCatalogVersion === CAN_BO_GPMB_KPI_CATALOG_VERSION) return false;

  const gpmbOfficerIds = new Set(state.people.filter((person) => person.roleId === "can-bo-gpmb").map((person) => person.id));
  let changed = false;
  state.tasks = state.tasks.map((task) => {
    const isGpmbOfficerTask = taskParticipantIds(task).some((personId) => gpmbOfficerIds.has(personId));
    const category = isGpmbOfficerTask ? legacyCanBoGpmbTaskCategories[task.category] : "";
    if (!category || category === task.category) return task;
    changed = true;
    return { ...task, category };
  });

  state.evaluations.forEach((evaluation) => {
    if (evaluation.period !== state.activePeriod || !gpmbOfficerIds.has(evaluation.personId)) return;
    const recalculated = personalCriteriaScoresFromTasks(evaluation.personId, evaluation.period);
    const personalScore = recalculated.personalScore;
    const finalScore = calculatePersonalFinalScore(personalScore, evaluation.departmentScore, evaluation.behaviorScore);
    if (
      evaluation.personalScore === personalScore &&
      evaluation.finalScore === finalScore &&
      JSON.stringify(evaluation.criteriaScores || {}) === JSON.stringify(recalculated.criteriaScores)
    ) {
      return;
    }
    changed = true;
    Object.assign(evaluation, {
      criteriaScores: recalculated.criteriaScores,
      personalScore,
      finalScore,
      grade: gradePersonal(finalScore),
    });
  });

  state.canBoGpmbKpiCatalogVersion = CAN_BO_GPMB_KPI_CATALOG_VERSION;
  saveState();
  return changed;
}

function migrateSectionHeadKpiCatalog() {
  const normalizedRoles = normalizeRolesCatalog(state.roles);
  const nextRoles = applySectionHeadKpiCatalog(normalizedRoles);
  const catalogChanged = JSON.stringify(normalizedRoles) !== JSON.stringify(nextRoles);
  const needsVersionUpdate = state.sectionHeadKpiCatalogVersion !== SECTION_HEAD_KPI_CATALOG_VERSION;
  if (!catalogChanged && !needsVersionUpdate) return false;
  // Only Admin persists the shared catalog change. Other accounts still use
  // the current two-criterion calculation until the migration is saved.
  if (!isAdmin()) return false;
  const canPersistVersion = !usingSupabaseSync()
    || isOfflineFileRuntime()
    || sharedSyncSupportsSectionHeadKpiCatalog();
  if (catalogChanged) {
    state.roles = nextRoles;
    applyRuntimeKpiCatalogs(state);
  }
  if (catalogChanged || (needsVersionUpdate && canPersistVersion)) {
    recalculateSavedPersonalEvaluationScores();
  }
  // Older deployed Functions can already accept the roles field, so persist
  // the catalog immediately. The version marker itself waits for v2026.08.21.2.
  if (canPersistVersion) {
    state.sectionHeadKpiCatalogVersion = SECTION_HEAD_KPI_CATALOG_VERSION;
    return true;
  }
  return catalogChanged;
}

function clearMandatoryPasswordChangeFlags() {
  if (!Array.isArray(state.accounts)) return false;
  let changed = false;
  state.accounts = state.accounts.map((account) => {
    if (!account || account.passwordChangeRequired !== true) return account;
    changed = true;
    return { ...account, passwordChangeRequired: false };
  });
  return changed;
}

migrateDepartmentTermLabels();
migrateLegacyProjectDepartments();
mergeImportedPeopleIntoState();
if (isOfflineFileRuntime()) {
  // The bundled personnel source creates a complete, independent test set
  // when this application is opened directly from disk.
  scheduleLocalOfflineLoginProofCache(state.accounts);
}
migrateCanBoGpmbKpiCatalog();
const sectionHeadKpiCatalogUpdated = migrateSectionHeadKpiCatalog();
const passwordPolicyUpdated = clearMandatoryPasswordChangeFlags();
const sectionHeadManagementUpdated = normalizeSectionHeadManagementLinks();
if (syncPersonnelAccounts() || sectionHeadKpiCatalogUpdated || passwordPolicyUpdated || sectionHeadManagementUpdated) saveState();

function departmentById(id) {
  return departments.find((item) => item.id === id);
}

function roleById(id) {
  return roles.find((item) => item.id === id);
}

function isKpiExemptDepartment(departmentId) {
  return departmentById(departmentId)?.kpiExempt === true;
}

function isKpiEligiblePerson(person) {
  return Boolean(person) && !isKpiExemptDepartment(person.departmentId);
}

function isSectionHeadPerson(person) {
  return Boolean(person) && accountRoleForPerson(person) === "section_head";
}

function sectionHeadForPerson(person) {
  const sectionHeadId = String(person?.sectionHeadId || "").trim();
  const sectionHead = personById(sectionHeadId);
  return sectionHead && isSectionHeadPerson(sectionHead) && sectionHead.departmentId === person?.departmentId && sectionHead.id !== person?.id
    ? sectionHead
    : null;
}

function managedTeamMembers(sectionHeadId) {
  const leader = personById(sectionHeadId);
  if (!leader || !isSectionHeadPerson(leader)) return [];
  return state.people.filter((person) => sectionHeadForPerson(person)?.id === leader.id);
}

function normalizeSectionHeadIdForPerson(person, sectionHeadId) {
  const leader = personById(String(sectionHeadId || "").trim());
  if (!person || isSectionHeadPerson(person) || !leader || leader.id === person.id) return "";
  return isSectionHeadPerson(leader) && leader.departmentId === person.departmentId ? leader.id : "";
}

function normalizeSectionHeadManagementLinks() {
  let changed = false;
  state.people = state.people.map((person) => {
    const normalizedSectionHeadId = normalizeSectionHeadIdForPerson(person, person.sectionHeadId);
    if (normalizedSectionHeadId === String(person.sectionHeadId || "")) return person;
    changed = true;
    return { ...person, sectionHeadId: normalizedSectionHeadId };
  });
  return changed;
}

function kpiEligibleDepartments() {
  return departments.filter((department) => !department.kpiExempt);
}

function personById(id) {
  return state.people.find((item) => item.id === id);
}

function accountById(id) {
  if (!id) return null;
  const normKey = String(id).trim().toLowerCase();
  // 🌟 Nhận diện cả ID lẫn Username để F5 là khớp tài khoản ngay lập tức
  return (state.accounts || []).find(
    (item) => item.id === id || String(item.username || "").trim().toLowerCase() === normKey
  ) || null;
}

function currentAccount() {
  const sessionVal = localStorage.getItem(SESSION_KEY);
  if (!sessionVal) return null;
  return accountById(sessionVal);
}

function activeViewStorageKey(account = currentAccount()) {
  return account?.id ? `${ACTIVE_VIEW_KEY_PREFIX}:${account.id}` : ACTIVE_VIEW_KEY_PREFIX;
}

function currentPerson() {
  const account = currentAccount();
  return account?.personId ? personById(account.personId) : null;
}

let birthdayCelebrationCloseTimer = 0;
let birthdayDateRefreshTimer = 0;
let birthdayCelebrationDisplayKey = "";
let birthdayBannerCollapsed = false;
const birthdayAssetFiles = Object.freeze({
  cake: "birthday-cake.png",
  bouquet: "birthday-bouquet.png",
});

function birthdayAssetUrls(assetName) {
  const fileName = birthdayAssetFiles[assetName];
  if (!fileName) return [];
  const bases = [
    document.querySelector("base")?.href,
    window.PHUC_THINH_STATIC_APP_BASE,
    window.location.href,
  ].filter(Boolean);
  return [...new Set(bases.map((base) => {
    try {
      return new URL(`assets/${fileName}`, base).href;
    } catch {
      return "";
    }
  }).filter(Boolean))];
}

function ensureBirthdayAssetSources() {
  const images = [
    ...document.querySelectorAll("[data-birthday-asset], .birthday-cake-image, .birthday-bouquet-image, .birthday-day-banner-image"),
  ];
  [...new Set(images)].forEach((image) => {
    const assetName =
      image.dataset.birthdayAsset || (image.classList.contains("birthday-cake-image") ? "cake" : "bouquet");
    const urls = birthdayAssetUrls(assetName);
    if (!urls.length) return;
    const signature = urls.join("|");
    const load = (index) => {
      image.dataset.birthdayAssetIndex = String(index);
      image.dataset.birthdayAssetFailed = "";
      image.src = urls[index];
    };
    image.onerror = () => {
      const nextIndex = Number(image.dataset.birthdayAssetIndex || 0) + 1;
      if (nextIndex < urls.length) {
        load(nextIndex);
        return;
      }
      image.dataset.birthdayAssetFailed = "1";
    };
    image.onload = () => {
      image.dataset.birthdayAssetFailed = "";
    };
    if (image.dataset.birthdayAssetSignature !== signature || image.dataset.birthdayAssetFailed === "1") {
      image.dataset.birthdayAssetSignature = signature;
      load(0);
    }
  });
}

function vietnamDateParts(date = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => values.find((item) => item.type === type)?.value || "";
  return { year: part("year"), month: part("month"), day: part("day") };
}

function birthdayMonthDay(value) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
  const vietnameseMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/);
  return vietnameseMatch ? `${padDatePart(vietnameseMatch[2])}-${padDatePart(vietnameseMatch[1])}` : "";
}

function birthdayPersonForToday() {
  const person = currentPerson();
  if (!person?.birthDate) return null;
  const today = vietnamDateParts();
  return birthdayMonthDay(person.birthDate) === `${today.month}-${today.day}` ? person : null;
}

function birthdayDisplayKey(account, dateParts) {
  return `${account.id}:${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function closeBirthdayCelebration() {
  const dialog = byId("birthdayCelebration");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
  if (birthdayCelebrationCloseTimer) window.clearTimeout(birthdayCelebrationCloseTimer);
  birthdayCelebrationCloseTimer = 0;
}

function birthdayBannerCanCollapse() {
  return window.matchMedia?.("(max-width: 820px)").matches;
}

function setBirthdayBannerCollapsed(collapsed) {
  const banner = byId("birthdayDayBanner");
  if (!banner) return;
  birthdayBannerCollapsed = Boolean(collapsed) && birthdayBannerCanCollapse();
  banner.classList.toggle("is-collapsed", birthdayBannerCollapsed);
  banner.setAttribute("aria-expanded", String(!birthdayBannerCollapsed));
  banner.setAttribute("aria-label", birthdayBannerCollapsed ? "Mở lời chúc sinh nhật" : "Thu gọn lời chúc sinh nhật");
}

function scheduleBirthdayDateRefresh() {
  if (birthdayDateRefreshTimer) window.clearTimeout(birthdayDateRefreshTimer);
  const today = vietnamDateParts();
  const nextVietnamMidnight = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) + 1) - 7 * 60 * 60 * 1000;
  const delay = Math.max(1000, nextVietnamMidnight - Date.now() + 1200);
  birthdayDateRefreshTimer = window.setTimeout(() => {
    birthdayDateRefreshTimer = 0;
    renderBirthdayCelebration();
  }, delay);
}

function renderBirthdayCelebration() {
  const banner = byId("birthdayDayBanner");
  const dialog = byId("birthdayCelebration");
  const account = currentAccount();
  const person = birthdayPersonForToday();
  ensureBirthdayAssetSources();
  if (!banner || !dialog || !account || !person) {
    banner?.classList.add("is-hidden");
    closeBirthdayCelebration();
    if (birthdayDateRefreshTimer) window.clearTimeout(birthdayDateRefreshTimer);
    birthdayDateRefreshTimer = 0;
    return;
  }

  const today = vietnamDateParts();
  const name = person.name || account.displayName || "bạn";
  byId("birthdayDayBannerName").textContent = `Chúc mừng sinh nhật ${name}`;
  byId("birthdayCelebrationTitle").textContent = `Chúc mừng sinh nhật ${name}`;
  byId("birthdayCelebrationMessage").textContent = "Chúc bạn luôn mạnh khỏe, hạnh phúc và gặt hái nhiều thành công trong công việc.";
  banner.classList.remove("is-hidden");
  setBirthdayBannerCollapsed(birthdayBannerCollapsed);
  scheduleBirthdayDateRefresh();

  const displayKey = birthdayDisplayKey(account, today);
  if (birthdayCelebrationDisplayKey === displayKey || !dialog.classList.contains("is-hidden")) return;
  birthdayCelebrationDisplayKey = displayKey;
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  if (birthdayCelebrationCloseTimer) window.clearTimeout(birthdayCelebrationCloseTimer);
  birthdayCelebrationCloseTimer = window.setTimeout(closeBirthdayCelebration, 12000);
}

function currentDepartmentId() {
  const account = currentAccount();
  return departmentById(account?.departmentId) ? account.departmentId : currentPerson()?.departmentId || "";
}

function isDirector() {
  return currentAccount()?.role === "director";
}

function isAdmin() {
  return currentAccount()?.role === "admin";
}

function canViewAllData() {
  return isDirector() || isAdmin();
}

function canViewSystemContent(account = currentAccount()) {
  return canViewAllData() || accountAccessGrants(account).viewSystemContent;
}

function currentPersonRoleId() {
  return currentPerson()?.roleId || "";
}

function isManager() {
  return currentAccount()?.role === "manager" || currentPersonRoleId().startsWith("truong-phong-");
}

function isDeputyManager() {
  return currentAccount()?.role === "deputy_manager" || currentPersonRoleId().startsWith("pho-phong-");
}

function isSectionHead() {
  return currentAccount()?.role === "section_head" || currentPersonRoleId().startsWith("truong-bo-phan-");
}

function hasDepartmentManagementAccess() {
  return isManager() || isDeputyManager();
}

function hasDepartmentTaskAccess() {
  return hasDepartmentManagementAccess() || isSectionHead();
}

function isEmployee() {
  return ["employee", "section_head"].includes(currentAccount()?.role);
}

function isCurrentPeriod(period) {
  return (period || state.activePeriod) === currentMonth();
}

function canEditPeriod(period) {
  return isDirector() || isAdmin() || isCurrentPeriod(period);
}

function canManageAccounts() {
  return isDirector() || isAdmin();
}

function canEditOwnAccount() {
  return hasDepartmentManagementAccess() || isEmployee();
}

function canViewPeople() {
  return canViewSystemContent() || hasDepartmentManagementAccess();
}

function canEditPeople() {
  return canViewAllData();
}

function canViewTasks() {
  return canViewSystemContent() || hasDepartmentTaskAccess() || !!currentPerson();
}

function canViewDepartmentEvaluations() {
  return canViewSystemContent() || hasDepartmentManagementAccess();
}

function accountAccessGrants(account = currentAccount()) {
  const grants = account?.accessGrants && typeof account.accessGrants === "object" ? account.accessGrants : {};
  return {
    bulletinPublish: grants.bulletinPublish === true,
    archiveWrite: grants.archiveWrite === true,
    viewSystemContent: grants.viewSystemContent === true,
  };
}

function canPublishBulletins() {
  return isAdmin() || accountAccessGrants().bulletinPublish;
}

function canEditBulletin(post) {
  const account = currentAccount();
  return Boolean(isAdmin() || (canPublishBulletins() && post?.createdById && post.createdById === account?.id));
}

function canDeleteBulletin() {
  return isAdmin();
}

function canSaveArchive() {
  return isAdmin() || accountAccessGrants().archiveWrite;
}

function canEditArchive(record) {
  const account = currentAccount();
  return Boolean(isAdmin() || (canSaveArchive() && record?.createdById && record.createdById === account?.id));
}

function canDeleteArchive() {
  return isAdmin();
}

function canAccessView(viewId) {
  if (!currentAccount()) return false;
  if (!moduleIsAvailableToAccount(viewId)) return false;
  if (viewId === "system-settings") return isAdmin();
  return systemModules.some((module) => module.id === viewId);
}

function firstAccessibleView() {
  const preferred = canViewAllData()
    ? systemModules.map((module) => module.id)
    : ["evaluations", "tasks", "bulletin", "archive", "people", "department-evaluations", "history", "accounts", "rules", "help", "dashboard"];
  return preferred.find((viewId) => canAccessView(viewId)) || "accounts";
}

function canEvaluatePerson(personId) {
  const account = currentAccount();
  const person = personById(personId);
  if (!account || !isKpiEligiblePerson(person)) return false;
  if (isDirector() || isAdmin()) return true;
  if (isManager()) return person.departmentId === currentDepartmentId();
  return person.id === account.personId;
}

function canEditEvaluation(personId, period) {
  return canEvaluatePerson(personId) && canEditPeriod(period);
}

function canEditEvaluationBehavior(personId, period) {
  const person = personById(personId);
  if (!isKpiEligiblePerson(person) || !canEditPeriod(period)) return false;
  if (isDirector() || isAdmin()) return true;
  return isManager() && person.departmentId === currentDepartmentId();
}

function canReportDepartmentEvaluation(departmentId, period) {
  if (!departmentId || isKpiExemptDepartment(departmentId) || !canEditPeriod(period)) return false;
  if (isAdmin()) return true;
  return hasDepartmentManagementAccess() && departmentId === currentDepartmentId();
}

function canConfirmDepartmentEvaluation(departmentId, period) {
  if (!departmentId || isKpiExemptDepartment(departmentId) || !canEditPeriod(period)) return false;
  return isDirector() || isAdmin();
}

function canEditDepartmentEvaluation(departmentId, period) {
  return canReportDepartmentEvaluation(departmentId, period) || canConfirmDepartmentEvaluation(departmentId, period);
}

function visiblePeopleForEvaluation() {
  if (canViewSystemContent()) return state.people.filter(isKpiEligiblePerson);
  if (isManager()) return state.people.filter((person) => person.departmentId === currentDepartmentId() && isKpiEligiblePerson(person));
  const person = currentPerson();
  return isKpiEligiblePerson(person) ? [person] : [];
}

function visiblePeopleForPeopleView() {
  if (canViewSystemContent()) return state.people;
  if (hasDepartmentTaskAccess()) return state.people.filter((person) => person.departmentId === currentDepartmentId());
  const person = currentPerson();
  return person ? [person] : [];
}

function visiblePeopleForTasks() {
  if (canViewSystemContent()) return state.people;
  if (hasDepartmentTaskAccess()) return state.people.filter((person) => person.departmentId === currentDepartmentId());
  const person = currentPerson();
  return person ? [person] : [];
}

function visiblePeopleForHistory() {
  if (canViewSystemContent()) return state.people;
  const person = currentPerson();
  return person ? [person] : [];
}

function visibleDepartmentsForHistory() {
  if (canViewSystemContent()) return departments;
  const departmentId = currentDepartmentId();
  return departments.filter((department) => department.id === departmentId);
}

function visibleDepartmentsForDepartmentEvaluations() {
  if (canViewSystemContent()) return kpiEligibleDepartments();
  const departmentId = currentDepartmentId();
  return departmentId ? kpiEligibleDepartments().filter((department) => department.id === departmentId) : [];
}

function canAssignTasks() {
  return canViewAllData() || hasDepartmentManagementAccess();
}

function canManageProjectCatalog() {
  return isAdmin() || isManager() || isDeputyManager() || isSectionHead();
}

function isAssignableByDepartmentLeader(person) {
  if (!person) return false;
  const roleId = person.roleId || "";
  return roleId.startsWith("truong-bo-phan-") || (!roleId.startsWith("truong-phong-") && !roleId.startsWith("pho-phong-"));
}

function canAssignTaskToPerson(personId) {
  const person = personById(personId);
  if (!person || !canAssignTasks()) return false;
  if (canViewAllData()) return true;
  return hasDepartmentManagementAccess() && person.departmentId === currentDepartmentId() && isAssignableByDepartmentLeader(person);
}

function assignablePeopleForTasks() {
  if (canViewAllData()) return state.people;
  if (hasDepartmentManagementAccess()) {
    return state.people.filter((person) => person.departmentId === currentDepartmentId() && isAssignableByDepartmentLeader(person));
  }
  return [];
}

function canEditTaskAssignment(task) {
  return !!task && isAssignedTask(task) && (isAdmin() || isTaskAssigner(task));
}

function isCompletedOrOverdueTask(task) {
  const status = getDueStatus(task);
  return status === TASK_STATUS_COMPLETED || status === "Quá hạn";
}

function canAdminEditCompletedOrOverdueTask(task) {
  return !!task && isAdmin() && isCompletedOrOverdueTask(task);
}

function canCreateRegularTaskForPerson(personId) {
  const person = personById(personId);
  if (!person) return false;
  if (canViewAllData()) return true;
  if (hasDepartmentManagementAccess() && person.departmentId === currentDepartmentId()) return true;
  return person.id === currentAccount()?.personId;
}

function canCreateRegularTasks() {
  return canViewAllData() || hasDepartmentManagementAccess() || isSectionHead() || !!currentPerson();
}

function canEditRegularTask(task) {
  return !!task && !isAssignedTask(task) && canCreateRegularTaskForPerson(task.ownerId);
}

function canEditTaskDetails(task) {
  return !!task && isAdmin();
}

function canDeleteTask(task) {
  return !!task && isAdmin();
}

function canCopyTask(task) {
  if (!task) return false;
  return isAssignedTask(task) ? canAssignTaskToPerson(task.ownerId) : canCreateRegularTaskForPerson(task.ownerId);
}

function canReportTask(task) {
  const person = currentPerson();
  return !!task && !!person && taskParticipantPersonId(task.ownerId) === person.id;
}

function canReviewTaskCompletionForPerson(personId) {
  if (isAdmin() || isDirector()) return true;
  const person = personById(personId);
  return (isManager() || isDeputyManager()) && person?.departmentId === currentDepartmentId();
}

function canReviewTaskCompletion(task) {
  if (!task || normalizeTaskStatus(task.status) !== TASK_STATUS_COMPLETED) return false;
  const needsCompletionDecision = taskCompletionNeedsReview(task);
  const needsQualityCompletion = taskCompletionIsApproved(task) && !taskHasQualityPercent(task);
  return (needsCompletionDecision || needsQualityCompletion) && canReviewTaskCompletionForPerson(task.ownerId);
}

function canAssessTaskQualityForPerson(personId, status, task = null) {
  if (normalizeTaskStatus(status) !== TASK_STATUS_COMPLETED) return false;
  if (task && !taskCompletionIsApproved(task)) return false;
  if (isDirector() || isAdmin()) return true;
  const person = personById(personId);
  return (isManager() || isDeputyManager()) && person?.departmentId === currentDepartmentId();
}

function canAssessTaskQuality(task, statusOverride = "") {
  if (!task) return false;
  return canAssessTaskQualityForPerson(task.ownerId, statusOverride || task.status, task);
}

function canCollaborateTask(task) {
  const person = currentPerson();
  return !!task && !!person && taskCollaboratorIds(task).includes(person.id);
}

function canManageDepartmentTaskProgress(task) {
  return !!task && (
    canViewAllData() ||
    (hasDepartmentTaskAccess() && taskHasParticipantInDepartment(task, currentDepartmentId()))
  );
}

function canUpdateTaskCollaborators(task) {
  return canManageDepartmentTaskProgress(task);
}

function taskProgressLockedAfterApproval(task) {
  return !!task && taskCompletionIsApproved(task);
}

function canUpdateTaskProgress(task) {
  if (!task || (!isAdmin() && taskProgressLockedAfterApproval(task))) return false;
  return canReportTask(task) || canCollaborateTask(task) || canManageDepartmentTaskProgress(task);
}

function preserveLegacyTaskProgressLifecycle(record, existing) {
  const fields = [
    "completionReviewStatus",
    "completionReviewedAt",
    "completionReviewedById",
    "completionReviewedByName",
    "completionReviewNote",
    "lateCompletion",
    "qualityPercent",
    "qualityAssessedAt",
    "qualityAssessedById",
    "qualityAssessedByName",
  ];
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(existing || {}, field)) record[field] = existing[field];
    else delete record[field];
  });
}

function isTaskAssigner(task) {
  const account = currentAccount();
  if (!task || !account) return false;
  if (task.assignedById && task.assignedById === account.id) return true;
  if (!task.assignedById && task.createdById && task.createdById === account.id) return true;
  if (!task.assignedById && !task.createdById) {
    const displayName = account.displayName || "";
    return !!displayName && (task.assignedByName === displayName || task.createdBy === displayName);
  }
  return false;
}

function canViewAssignedTask(task) {
  return !!task && isAssignedTask(task) && (canViewSystemContent() || isTaskAssigner(task) || canReportTask(task) || canCollaborateTask(task) || (hasDepartmentTaskAccess() && taskHasParticipantInDepartment(task, currentDepartmentId())));
}

function canEndTaskAssignment(task) {
  return !!task && isAssignedTask(task) && (isAdmin() || isTaskAssigner(task)) && !isTaskFinishedStatus(getDueStatus(task));
}

function canOpenTask(task) {
  return canViewTaskRecord(task) || canEditTaskDetails(task) || canDeleteTask(task) || canUpdateTaskProgress(task) || canReviewTaskCompletion(task);
}

function canViewTaskRecord(task) {
  if (!task) return false;
  if (isAssignedTask(task)) return canViewAssignedTask(task);
  if (canViewSystemContent()) return true;
  if (hasDepartmentTaskAccess() && taskHasParticipantInDepartment(task, currentDepartmentId())) return true;
  if (canCollaborateTask(task)) return true;
  return canReportTask(task);
}

function canEditTask(task) {
  return canEditTaskDetails(task);
}

function personIsVisible(personId) {
  return visiblePeopleForEvaluation().some((person) => person.id === personId);
}

function recordUpdatedTime(record, index) {
  const timestamp = Date.parse(record?.updatedAt || record?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : index;
}

function latestRecordsForPeriod(records, entityKey, period, isEligible) {
  const latestByEntity = new Map();
  (records || []).forEach((record, index) => {
    const entityId = String(record?.[entityKey] || "").trim();
    if (!entityId || record?.period !== period || !isEligible(entityId, record)) return;
    const existing = latestByEntity.get(entityId);
    if (!existing || recordUpdatedTime(record, index) >= existing.updatedTime) {
      latestByEntity.set(entityId, { record, updatedTime: recordUpdatedTime(record, index) });
    }
  });
  return [...latestByEntity.values()].map((item) => item.record);
}

function evaluationsForPeriod(period = state.activePeriod) {
  return latestRecordsForPeriod(state.evaluations, "personId", period, (personId) => isKpiEligiblePerson(personById(personId)));
}

function latestEvaluation(personId, period = state.activePeriod) {
  if (!isKpiEligiblePerson(personById(personId))) return undefined;
  return evaluationsForPeriod(period).find((item) => item.personId === personId);
}

function departmentEvaluationsForPeriod(period = state.activePeriod) {
  return latestRecordsForPeriod(state.departmentEvaluations, "departmentId", period, (departmentId) => !isKpiExemptDepartment(departmentId));
}

function latestDepartmentEvaluation(departmentId, period = state.activePeriod) {
  if (isKpiExemptDepartment(departmentId)) return undefined;
  return departmentEvaluationsForPeriod(period).find((item) => item.departmentId === departmentId);
}

function currentActorInfo() {
  const account = currentAccount();
  return {
    id: account?.id || "",
    name: account?.displayName || "Chưa đăng nhập",
    role: accountRoleLabels[account?.role] || account?.role || "",
  };
}

function currentAdjustmentActor() {
  const account = currentAccount();
  if (!account?.id) return { id: "", label: "" };
  const name = String(account.displayName || account.username || "Tài khoản hệ thống").trim();
  const username = String(account.username || "").trim();
  return {
    id: String(account.id),
    label: username ? `${name} (${username})` : name,
  };
}

function renderAdjustmentActorInput(inputId, existing = null) {
  const input = byId(inputId);
  if (!input) return;
  const actor = currentAdjustmentActor();
  input.value = String(existing?.reviewer || "").trim() || "Hệ thống tự ghi nhận theo tài khoản đăng nhập";
  input.title = actor.label
    ? `Tài khoản được phép điều chỉnh hiện tại: ${actor.label}. Hệ thống sẽ ghi nhận khi lưu.`
    : "Hệ thống tự ghi nhận tài khoản được phân quyền khi lưu.";
}

function periodFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

function applyRecordAudit(record, existing) {
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  return {
    ...record,
    createdAt: existing?.createdAt || timestamp,
    createdBy: existing?.createdBy || actor.name,
    createdById: existing?.createdById || actor.id,
    updatedAt: timestamp,
    updatedBy: actor.name,
    updatedById: actor.id,
  };
}

function logActivity(entry) {
  const timestamp = entry.timestamp || new Date().toISOString();
  const actor = currentActorInfo();
  const activity = {
    id: uid("activity"),
    timestamp,
    period: entry.period || periodFromTimestamp(timestamp),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    ...entry,
  };
  state.activityLog = [activity, ...(state.activityLog || [])].slice(0, 5000);
  return activity;
}

function ensureRecurringTasksForPeriod(targetPeriod = recurrenceTargetPeriod()) {
  const targetIndex = periodIndex(targetPeriod);
  if (targetIndex < 0) return false;
  const targetEnd = `${targetPeriod}-${padDatePart(daysInMonth(Number(targetPeriod.slice(0, 4)), Number(targetPeriod.slice(5, 7)) - 1))}`;
  const existingKeys = new Set(
    (state.tasks || []).map((task) => `${task.recurrenceSeriesId || task.recurrenceSourceId || task.id}|${task.due || ""}`),
  );
  const additions = [];
  (state.tasks || [])
    .filter((task) => normalizeTaskKind(task) === TASK_KIND_REGULAR)
    .filter((task) => !task.recurrenceSourceId)
    .forEach((sourceTask) => {
      const recurrence = normalizeTaskRecurrence(sourceTask);
      if (recurrence === TASK_RECURRENCE_NONE || !sourceTask.due) return;
      const sourcePeriod = taskPeriod(sourceTask);
      const sourceIndex = periodIndex(sourcePeriod);
      if (sourceIndex < 0 || sourceIndex > targetIndex) return;
      const seriesId = sourceTask.recurrenceSeriesId || sourceTask.id;
      const anchorDay = Number(sourceTask.recurrenceAnchorDay) || Number(sourceTask.due.slice(8, 10));
      const appendRepeatedTask = (due, startDate) => {
        if (!due) return;
        const key = `${seriesId}|${due}`;
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        const repeatedTask = applyRecordAudit(
          {
            ...sourceTask,
            id: uid("task"),
            startDate: startDate || due,
            due,
            dueTime: sourceTask.dueTime || "",
            status: TASK_STATUS_PREPARING,
            progress: 0,
            qualityPercent: "",
            qualityAssessedAt: "",
            qualityAssessedById: "",
            qualityAssessedByName: "",
            attachments: [],
            progressReports: [],
            completedAt: "",
            completedById: "",
            completedByName: "",
            recurrence,
            recurrenceSourceId: sourceTask.id,
            recurrenceSeriesId: seriesId,
            recurrenceAnchorDay: anchorDay,
            recurrenceAnchorDue: sourceTask.recurrenceAnchorDue || sourceTask.due,
          },
          null,
        );
        additions.push(repeatedTask);
        const owner = personById(repeatedTask.ownerId);
        logActivity({
          action: "Tự tạo định kỳ",
          module: "Công việc",
          targetType: "task",
          targetId: repeatedTask.id,
          personId: repeatedTask.ownerId,
          departmentId: owner?.departmentId || "",
          period: taskPeriod(repeatedTask),
          title: repeatedTask.title,
          details: `${taskRecurrenceLabels[recurrence]} · từ công việc gốc ${sourceTask.title} · hoàn thành ${formatTaskDeadline(repeatedTask)}`,
          score: "0%",
        });
      };

      const recurringDayStep = recurrence === TASK_RECURRENCE_DAILY ? 1 : recurrence === TASK_RECURRENCE_WEEKLY ? 7 : 0;
      if (recurringDayStep) {
        const anchorDue = sourceTask.recurrenceAnchorDue || sourceTask.due;
        const daysToTargetStart = Math.max(0, daysBetweenIsoDates(anchorDue, `${targetPeriod}-01`));
        const firstOffset = Math.max(recurringDayStep, Math.ceil(daysToTargetStart / recurringDayStep) * recurringDayStep);
        for (let offset = firstOffset; ; offset += recurringDayStep) {
          const due = addDaysToIsoDate(anchorDue, offset);
          if (!due || due > targetEnd) break;
          appendRepeatedTask(due, sourceTask.startDate ? addDaysToIsoDate(sourceTask.startDate, offset) : due);
        }
        return;
      }

      const step = recurrenceStepMonths(recurrence);
      if (!step || sourceIndex >= targetIndex) return;
      for (let offset = step; sourceIndex + offset <= targetIndex && offset <= 60; offset += step) {
        const due = addMonthsToIsoDate(sourceTask.due, offset, anchorDay);
        appendRepeatedTask(due, sourceTask.startDate ? addMonthsToIsoDate(sourceTask.startDate, offset, Number(sourceTask.startDate.slice(8, 10))) : due);
      }
    });
  if (!additions.length) return false;
  state.tasks = [...state.tasks, ...additions];
  persistState();
  return true;
}

function activityTargetKey(item) {
  return item?.targetType && item?.targetId ? `${item.targetType}:${item.targetId}` : "";
}

function gradePersonal(score) {
  if (score >= 90) return "Loại 1";
  if (score >= 88) return "Loại 2";
  if (score >= 85) return "Loại 3";
  if (score >= 80) return "Loại 4";
  if (score >= 75) return "Loại 5";
  if (score >= 70) return "Loại 6";
  return "Loại 7";
}

const personalGradeOrder = ["Loại 1", "Loại 2", "Loại 3", "Loại 4", "Loại 5", "Loại 6", "Loại 7", "Chưa chấm"];
const personalGradeColors = {
  "Loại 1": "#0f8a5f",
  "Loại 2": "#2f9e7e",
  "Loại 3": "#176b87",
  "Loại 4": "#4f7ea8",
  "Loại 5": "#b7791f",
  "Loại 6": "#c05621",
  "Loại 7": "#b42318",
  "Chưa chấm": "#94a3b8",
};

const departmentChartColors = ["#176b87", "#0f8a5f", "#b7791f", "#4f7ea8", "#2f9e7e", "#c05621", "#475569", "#0e7490"];

const departmentAdjustmentLabels = {
  reward: "Khen thưởng",
  discipline: "Kỷ luật",
};

function gradeDepartment(score) {
  if (score >= 90) return "Xuất sắc";
  if (score >= 80) return "Tốt";
  if (score >= 65) return "Khá";
  if (score >= 50) return "Trung bình";
  return "Yếu";
}

function badgeClass(score) {
  if (score >= 85) return "good";
  if (score >= 70) return "warn";
  return "bad";
}

function formatScore(value) {
  return Number(value || 0).toFixed(1).replace(".0", "");
}

function normalizeDepartmentAdjustmentType(type) {
  return type === "discipline" ? "discipline" : "reward";
}

function departmentAdjustmentSignedScore(type, points) {
  const score = Math.max(0, Number(points || 0));
  return normalizeDepartmentAdjustmentType(type) === "discipline" ? -score : score;
}

function departmentAdjustmentSummary(evaluation) {
  const note = String(evaluation?.rewardDisciplineNote || "").trim();
  const points = Math.max(0, Number(evaluation?.adjustmentPoints || 0));
  if (!note && !points) return "";
  const type = normalizeDepartmentAdjustmentType(evaluation?.adjustmentType);
  const signedScore = departmentAdjustmentSignedScore(type, points);
  const scoreText = points ? ` ${signedScore >= 0 ? "+" : "-"}${formatScore(points)} điểm` : "";
  return `${departmentAdjustmentLabels[type]}${scoreText}${note ? `: ${note}` : ""}`;
}

function formatSalary(person) {
  const coefficient = person.salaryCoefficient ? `HS ${person.salaryCoefficient}` : "";
  const grade = person.salaryGrade || "";
  return [coefficient, grade].filter(Boolean).join(" · ");
}

function normalizeTaskKind(task) {
  const kind = typeof task === "string" ? task : task?.kind || task?.taskKind || "";
  if (kind === TASK_KIND_REGULAR || kind === "regular") return TASK_KIND_REGULAR;
  if (kind === TASK_KIND_ASSIGNED || kind === "assigned") return TASK_KIND_ASSIGNED;
  return task?.assignedById || task?.assignedAt || task?.responseStatus || task?.responseAt ? TASK_KIND_ASSIGNED : TASK_KIND_REGULAR;
}

function normalizeTaskWorkType(task) {
  const value = typeof task === "string" ? task : task?.workType || task?.taskType || "";
  const normalized = normalizeSearchText(value);
  if (value === TASK_WORK_TYPE_ARISING || normalized.includes("phat sinh")) return TASK_WORK_TYPE_ARISING;
  return TASK_WORK_TYPE_ROUTINE;
}

function normalizeTaskRecurrence(task) {
  const value = typeof task === "string" ? task : task?.recurrence || task?.periodicity || "";
  const normalized = normalizeSearchText(value);
  if (value === TASK_RECURRENCE_DAILY || normalized.includes("hang ngay")) return TASK_RECURRENCE_DAILY;
  if (value === TASK_RECURRENCE_WEEKLY || normalized.includes("hang tuan")) return TASK_RECURRENCE_WEEKLY;
  if (value === TASK_RECURRENCE_MONTHLY || normalized.includes("hang thang")) return TASK_RECURRENCE_MONTHLY;
  if (value === TASK_RECURRENCE_QUARTERLY || normalized.includes("hang quy")) return TASK_RECURRENCE_QUARTERLY;
  return TASK_RECURRENCE_NONE;
}

function taskWorkMeta(task) {
  const workType = taskWorkTypeLabels[normalizeTaskWorkType(task)] || taskWorkTypeLabels[TASK_WORK_TYPE_ROUTINE];
  const recurrence = taskRecurrenceLabels[normalizeTaskRecurrence(task)] || taskRecurrenceLabels[TASK_RECURRENCE_NONE];
  return `${workType} · ${recurrence}`;
}

function isAssignedTask(task) {
  return normalizeTaskKind(task) === TASK_KIND_ASSIGNED;
}

function uniquePersonIds(ids = []) {
  const seen = new Set();
  return ids
    .map((id) => String(id || "").trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function taskCollaboratorIds(task) {
  const ids = Array.isArray(task?.collaboratorIds)
    ? task.collaboratorIds
    : String(task?.collaboratorIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  return uniquePersonIds([...ids, task?.collaboratorId].map(taskParticipantPersonId));
}

function taskParticipantPersonId(value) {
  const id = String(value || "").trim();
  if (!id || personById(id)) return id;
  const linkedPersonId = String(accountById(id)?.personId || "").trim();
  if (linkedPersonId && personById(linkedPersonId)) return linkedPersonId;

  // Older task records may contain a username or display name instead of a
  // personnel ID. Resolve it only when it identifies one person exactly.
  const identity = normalizeSearchText(id);
  const matches = identity
    ? state.people.filter((person) => normalizeSearchText(person.name) === identity)
    : [];
  return matches.length === 1 ? matches[0].id : id;
}

function ensureTaskOwnerOption(task) {
  const select = byId("taskOwner");
  const ownerId = String(task?.ownerId || "").trim();
  if (!select || !ownerId || Array.from(select.options).some((option) => option.value === ownerId)) return;
  const person = personById(ownerId) || personById(taskParticipantPersonId(ownerId));
  const label = person
    ? `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`
    : String(task?.ownerName || "Người thực hiện hiện tại");
  const option = document.createElement("option");
  option.value = ownerId;
  option.textContent = label;
  select.append(option);
}

function taskParticipantIds(task) {
  return uniquePersonIds([taskParticipantPersonId(task?.ownerId), ...taskCollaboratorIds(task)]);
}

function taskHasParticipantInDepartment(task, departmentId) {
  return !!departmentId && taskParticipantIds(task).some((personId) => personById(personId)?.departmentId === departmentId);
}

function taskOwnerName(task, fallback = "Chưa rõ") {
  return personById(taskParticipantPersonId(task?.ownerId))?.name || String(task?.ownerName || "").trim() || fallback;
}

function taskCollaboratorNames(task) {
  const savedNames = Array.isArray(task?.collaboratorNames)
    ? task.collaboratorNames.map((name) => String(name || "").trim())
    : String(task?.collaboratorNames || task?.collaboratorName || "")
      .split(",")
      .map((name) => name.trim());
  return taskCollaboratorIds(task)
    .map((id, index) => personById(id)?.name || savedNames[index] || "")
    .filter(Boolean);
}

function selectedTaskCollaboratorIds() {
  return uniquePersonIds(
    Array.from(byId("taskCollaborators")?.querySelectorAll('input[type="checkbox"]:checked') || []).map((input) => input.value),
  ).filter((id) => id !== byId("taskOwner").value);
}

function updateTaskCollaboratorSummary() {
  const summary = byId("taskCollaboratorSummary");
  const container = byId("taskCollaborators");
  if (!summary || !container) return;
  const selectedIds = selectedTaskCollaboratorIds();
  const optionCount = container.querySelectorAll('input[type="checkbox"]').length;
  if (!optionCount) {
    summary.textContent = "Không có người phối hợp phù hợp";
    return;
  }
  summary.textContent = selectedIds.length ? `Đã chọn ${selectedIds.length} người phối hợp` : "Chọn người phối hợp";
}

function updateTaskOwnerSummary() {
  const select = byId("taskOwner");
  const summary = byId("taskOwnerSummary");
  if (!select || !summary) return;
  const option = Array.from(select.options).find((item) => item.value === select.value);
  summary.textContent = option?.value ? option.textContent || "Chọn người thực hiện" : "Chọn người thực hiện";
}

function filterTaskOwnerOptions() {
  const container = byId("taskOwnerOptions");
  const searchInput = byId("taskOwnerSearch");
  const emptyState = byId("taskOwnerSearchEmpty");
  if (!container || !searchInput) return;
  const query = normalizeSearchText(searchInput.value);
  let visibleCount = 0;
  container.querySelectorAll(".task-owner-option").forEach((option) => {
    const visible = !query || normalizeSearchText(option.textContent).includes(query);
    option.classList.toggle("is-hidden", !visible);
    if (visible) visibleCount += 1;
  });
  emptyState?.classList.toggle("is-hidden", !query || visibleCount > 0);
}

function resetTaskOwnerSearch() {
  const input = byId("taskOwnerSearch");
  if (input) input.value = "";
  filterTaskOwnerOptions();
}

function isTaskOwnerPickerOpen() {
  const panel = byId("taskOwnerPanel");
  return !!panel && !panel.classList.contains("is-hidden");
}

function setTaskOwnerPickerOpen(open) {
  const picker = byId("taskOwnerPicker");
  const panel = byId("taskOwnerPanel");
  const toggle = byId("taskOwnerToggle");
  if (!picker || !panel || !toggle) return;
  const shouldOpen = Boolean(open) && !picker.classList.contains("is-disabled");
  picker.classList.toggle("is-open", shouldOpen);
  panel.classList.toggle("is-hidden", !shouldOpen);
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  if (!shouldOpen) {
    resetTaskOwnerSearch();
    return;
  }
  setTaskCollaboratorPickerOpen(false);
  requestAnimationFrame(() => byId("taskOwnerSearch")?.focus());
}

function updateTaskOwnerOptions() {
  const select = byId("taskOwner");
  const container = byId("taskOwnerOptions");
  if (!select || !container) return;
  const selectedId = String(select.value || "");
  const options = Array.from(select.options)
    .filter((option) => option.value)
    .map((option) => ({ value: option.value, label: option.textContent || "Nhân sự" }));
  container.classList.toggle("is-empty", !options.length);
  container.innerHTML = options.length
    ? options.map((option) => `
        <label class="checkbox-option task-owner-option">
          <input type="radio" name="taskOwnerChoice" value="${escapeHtml(option.value)}" ${option.value === selectedId ? "checked" : ""}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `).join("")
    : "<span>Không có nhân sự phù hợp.</span>";
  updateTaskOwnerSummary();
  filterTaskOwnerOptions();
}

function filterTaskCollaboratorOptions() {
  const container = byId("taskCollaborators");
  const searchInput = byId("taskCollaboratorSearch");
  const emptyState = byId("taskCollaboratorSearchEmpty");
  if (!container || !searchInput) return;
  const query = normalizeSearchText(searchInput.value);
  let visibleCount = 0;
  container.querySelectorAll(".checkbox-option").forEach((option) => {
    const visible = !query || normalizeSearchText(option.textContent).includes(query);
    option.classList.toggle("is-hidden", !visible);
    if (visible) visibleCount += 1;
  });
  emptyState?.classList.toggle("is-hidden", !query || visibleCount > 0);
}

function resetTaskCollaboratorSearch() {
  const input = byId("taskCollaboratorSearch");
  if (input) input.value = "";
  filterTaskCollaboratorOptions();
}

function isTaskCollaboratorPickerOpen() {
  const panel = byId("taskCollaboratorPanel");
  return !!panel && !panel.classList.contains("is-hidden");
}

function setTaskCollaboratorPickerOpen(open) {
  const picker = byId("taskCollaboratorPicker");
  const panel = byId("taskCollaboratorPanel");
  const toggle = byId("taskCollaboratorToggle");
  if (!picker || !panel || !toggle) return;
  const shouldOpen = Boolean(open) && !picker.classList.contains("is-disabled");
  picker.classList.toggle("is-open", shouldOpen);
  panel.classList.toggle("is-hidden", !shouldOpen);
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  if (!shouldOpen) {
    resetTaskCollaboratorSearch();
    return;
  }
  requestAnimationFrame(() => byId("taskCollaboratorSearch")?.focus());
}

function samePersonIdList(first = [], second = []) {
  const a = uniquePersonIds(first);
  const b = uniquePersonIds(second);
  return a.length === b.length && a.every((id) => b.includes(id));
}

function taskAttachmentSignature(attachments = []) {
  return (attachments || [])
    .map((file) => [storedFileKey(file), file?.name || "", Number(file?.size) || 0, file?.type || ""].join("|"))
    .sort()
    .join("||");
}

function taskCustomFieldsSignature(customFields = {}) {
  return Object.entries(customFields || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join("|");
}

function taskUpdateChangeLabels(previousTask, nextTask) {
  const changes = [];
  if ((previousTask.title || "") !== (nextTask.title || "")) changes.push("Tên công việc");
  if (projectIdForTask(previousTask) !== projectIdForTask(nextTask)) changes.push("Dự án liên quan");
  if ((previousTask.ownerId || "") !== (nextTask.ownerId || "")) changes.push("Người thực hiện");
  if (!samePersonIdList(taskCollaboratorIds(previousTask), taskCollaboratorIds(nextTask))) changes.push("Người phối hợp");
  if ((previousTask.category || "") !== (nextTask.category || "")) changes.push("Danh mục KPI cá nhân");
  if (normalizeTaskWorkType(previousTask) !== normalizeTaskWorkType(nextTask)) changes.push("Loại công việc");
  if (normalizeTaskRecurrence(previousTask) !== normalizeTaskRecurrence(nextTask)) changes.push("Định kỳ");
  if ((previousTask.startDate || "") !== (nextTask.startDate || "")) changes.push("Ngày bắt đầu");
  if ((previousTask.due || "") !== (nextTask.due || "")) changes.push("Ngày hoàn thành");
  if ((previousTask.dueTime || "") !== (nextTask.dueTime || "")) changes.push("Giờ hoàn thành");
  if (normalizeTaskStatus(previousTask.status) !== normalizeTaskStatus(nextTask.status)) changes.push("Trạng thái");
  if (Number(previousTask.progress || 0) !== Number(nextTask.progress || 0)) changes.push("Tiến độ");
  if (String(normalizeTaskQualityInput(previousTask.qualityPercent)) !== String(normalizeTaskQualityInput(nextTask.qualityPercent))) changes.push("Đánh giá chất lượng");
  if ((previousTask.note || "") !== (nextTask.note || "")) changes.push("Nội dung công việc/Báo cáo tiến độ");
  if (taskAttachmentSignature(previousTask.attachments) !== taskAttachmentSignature(nextTask.attachments)) changes.push("Hồ sơ liên quan");
  if (taskCustomFieldsSignature(previousTask.customFields) !== taskCustomFieldsSignature(nextTask.customFields)) changes.push("Thông tin tùy biến");
  return changes;
}

function getDueStatus(task) {
  const status = normalizeTaskStatus(task.status);
  if (status === TASK_STATUS_CLOSED) return status;
  if (status === TASK_STATUS_COMPLETED) return status;
  if (!task.due) return status;
  const due = taskDeadlineDate(task);
  return due && due < new Date() ? "Quá hạn" : status;
}

function taskPeriod(task) {
  return task.due ? task.due.slice(0, 7) : "";
}

function taskDeadlineDate(task) {
  if (!task?.due) return null;
  const time = task.dueTime || "23:59";
  const date = new Date(`${task.due}T${time}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatTaskDeadline(task) {
  const date = formatDate(task?.due);
  if (!date) return "";
  return task?.dueTime ? `${date} ${task.dueTime}` : date;
}

function formatTaskStartDate(task) {
  return formatDate(task?.startDate);
}

function periodIndex(period) {
  const match = String(period || "").match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : -1;
}

function latestPeriod(periodA, periodB) {
  return periodIndex(periodA) >= periodIndex(periodB) ? periodA : periodB;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsToIsoDate(dateText, monthOffset, preferredDay) {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const baseYear = Number(match[1]);
  const baseMonthIndex = Number(match[2]) - 1;
  const targetMonthIndex = baseMonthIndex + monthOffset;
  const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(Number(preferredDay) || Number(match[3]), daysInMonth(targetYear, normalizedMonthIndex));
  return `${targetYear}-${padDatePart(normalizedMonthIndex + 1)}-${padDatePart(day)}`;
}

function addDaysToIsoDate(dateText, dayOffset) {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(dayOffset || 0)));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function daysBetweenIsoDates(startDateText, endDateText) {
  const start = String(startDateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = String(endDateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!start || !end) return 0;
  const startTime = Date.UTC(Number(start[1]), Number(start[2]) - 1, Number(start[3]));
  const endTime = Date.UTC(Number(end[1]), Number(end[2]) - 1, Number(end[3]));
  return Math.floor((endTime - startTime) / 86400000);
}

function recurrenceStepMonths(recurrence) {
  if (recurrence === TASK_RECURRENCE_MONTHLY) return 1;
  if (recurrence === TASK_RECURRENCE_QUARTERLY) return 3;
  return 0;
}

function recurrenceTargetPeriod() {
  return latestPeriod(state.activePeriod || currentMonth(), currentMonth());
}

function isTimestampBeforeDeadline(timestamp, task) {
  const due = taskDeadlineDate(task);
  const value = timestamp ? new Date(timestamp) : null;
  return !!due && !!value && !Number.isNaN(value.getTime()) && value <= due;
}

function taskHasTimelyResponse(task) {
  return !!task?.responseStatus && isTimestampBeforeDeadline(task.responseAt || task.updatedAt || task.createdAt, task);
}

function taskHasTimelyProgressReport(task) {
  return (task?.progressReports || []).some((report) => isTimestampBeforeDeadline(report.createdAt, task));
}

function taskIsPastDeadline(task) {
  const due = taskDeadlineDate(task);
  return !!due && due < new Date();
}

function taskCompletedBeforeDeadline(task) {
  if (normalizeTaskStatus(task?.status) !== "Hoàn thành" || !taskCompletionIsApproved(task)) return false;
  if (!task.completedAt) return true;
  return isTimestampBeforeDeadline(task.completedAt, task);
}

function taskViolationReasons(task) {
  if (normalizeTaskStatus(task.status) === TASK_STATUS_CLOSED) return [];
  const overdue = getDueStatus(task) === "Quá hạn" || taskIsLateCompletion(task);
  if (!overdue) return [];
  const reasons = [];
  if (isAssignedTask(task) && !taskHasTimelyResponse(task)) reasons.push("Chưa phản hồi nhận việc trước thời hạn hoàn thành");
  if (isAssignedTask(task) && !taskHasTimelyProgressReport(task)) reasons.push("Chưa báo cáo tiến độ trước thời hạn hoàn thành");
  reasons.push("Chậm thời hạn hoàn thành");
  return reasons;
}

function taskBehaviorRuleIndexes() {
  return {
    deadline: behaviorRules.findIndex((rule) => rule[0] === "Chậm thời hạn hoàn thành"),
    ahead: behaviorRules.findIndex((rule) => rule[0] === "Làm vượt tiến độ"),
  };
}

function automaticTaskBehaviorRuleIndexes() {
  return new Set(Object.values(taskBehaviorRuleIndexes()).filter((index) => Number.isInteger(index) && index >= 0));
}

function taskIsApprovedAheadOfSchedule(task) {
  return taskCompletionIsApproved(task) && taskCompletionTimingStatus(task) === "ahead";
}

function personalCriterionForTask(task, personId) {
  const person = personById(personId);
  const criteria = roleById(person?.roleId)?.criteria || [];
  const category = String(task?.category || "").trim();
  if (!criteria.length) return "Chưa gắn tiêu chí KPI";

  // The selected category is authoritative. A legacy shortened category is
  // accepted only when it identifies exactly one criterion.
  if (category) {
    const categoryKey = kpiCriterionKey(category);
    const exactCriterion = criteria.find(([criterionName]) => kpiCriterionKey(criterionName) === categoryKey);
    if (exactCriterion) return exactCriterion[0];

    const compatibleCriteria = criteria.filter(([criterionName]) => {
      const criterionKey = kpiCriterionKey(criterionName);
      return categoryKey && criterionKey && (categoryKey.includes(criterionKey) || criterionKey.includes(categoryKey));
    });
    return compatibleCriteria.length === 1 ? compatibleCriteria[0][0] : "Chưa gắn tiêu chí KPI";
  }

  // Older records without a selected category are counted only when their
  // content can be matched to one criterion without ambiguity.
  const legacyMatches = criteria.filter(([criterionName]) => taskMatchesKpiCriterion(task, criterionName));
  return legacyMatches.length === 1 ? legacyMatches[0][0] : "Chưa gắn tiêu chí KPI";
}

function taskBehaviorViolationCount(links, criterionName) {
  return links
    .filter((item) => item.type !== "reward" && item.criterionName === criterionName)
    .reduce((sum, item) => sum + (item.reasons?.length || 0), 0);
}

function taskBehaviorReasonsForRule(reasons = [], ruleName = "") {
  const list = Array.isArray(reasons) ? reasons : [];
  if (ruleName === "Chậm thời hạn hoàn thành") {
    return list.filter((reason) => reason.includes("Chậm thời hạn hoàn thành"));
  }
  if (ruleName === "Làm vượt tiến độ") {
    return list.filter((reason) => reason.includes("Làm vượt tiến độ"));
  }
  return [];
}

function automaticTaskBehaviorForPerson(personId, period, preparedTasks = null) {
  const indexes = taskBehaviorRuleIndexes();
  const counts = {};
  const links = [];
  const tasks = Array.isArray(preparedTasks)
    ? preparedTasks
    : state.tasks.filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period);
  tasks
    .forEach((task) => {
      const criterionName = personalCriterionForTask(task, personId);
      const completedAhead = taskIsApprovedAheadOfSchedule(task);
      if (completedAhead && indexes.ahead >= 0) {
        counts[indexes.ahead] = (counts[indexes.ahead] || 0) + 1;
        links.push({
          taskId: task.id,
          title: task.title,
          due: task.due,
          dueTime: task.dueTime || "",
          criterionName,
          reasons: ["Làm vượt tiến độ"],
          type: "reward",
        });
      }

      // The deadline discipline remains assigned only to the primary person
      // in charge. The ahead-of-schedule reward above is credited to every
      // participant because the task is counted in each participant's KPI.
      if (taskParticipantPersonId(task.ownerId) !== personId) return;
      const reasons = taskViolationReasons(task);
      const missedDeadline = reasons.some((reason) => reason.includes("hoàn thành"));
      if (!missedDeadline || indexes.deadline < 0) return;
      counts[indexes.deadline] = (counts[indexes.deadline] || 0) + 1;
      links.push({
        taskId: task.id,
        title: task.title,
        due: task.due,
        dueTime: task.dueTime || "",
        criterionName,
        reasons: ["Chậm thời hạn hoàn thành"],
        type: "discipline",
      });
    });
  return { counts, links };
}

function calculatedTaskBehaviorForPerson(personId, period, existing = {}, preparedTasks = null) {
  const savedManualValues = behaviorManualValues(existing);
  const automaticIndexes = automaticTaskBehaviorRuleIndexes();
  const manualValues = {};
  const automatic = automaticTaskBehaviorForPerson(personId, period, preparedTasks);
  const behavior = {};
  let behaviorScore = 0;
  behaviorRules.forEach((rule, index) => {
    const manualCount = automaticIndexes.has(index) ? 0 : clamp(savedManualValues[index], 0, 99);
    const count = manualCount + Number(automatic.counts[index] || 0);
    manualValues[index] = manualCount;
    behavior[index] = count;
    behaviorScore += count * Number(rule[1] || 0);
  });
  return {
    behavior,
    behaviorManual: manualValues,
    behaviorAutomatic: automatic.counts,
    taskBehaviorLinks: automatic.links,
    behaviorScore,
  };
}

function isPeriodInRange(period, from, to) {
  if (!period) return !from && !to;
  if (from && period < from) return false;
  if (to && period > to) return false;
  return true;
}

function averageScore(items, key = "finalScore") {
  return items.length ? items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length : 0;
}

function syncIndividualScoresForDepartment(period, departmentId, departmentScore) {
  const peopleIds = state.people.filter((person) => person.departmentId === departmentId && isKpiEligiblePerson(person)).map((person) => person.id);
  state.evaluations
    .filter((evaluation) => evaluation.period === period && peopleIds.includes(evaluation.personId))
    .forEach((evaluation) => {
      evaluation.departmentScore = departmentScore;
      evaluation.finalScore = calculatePersonalFinalScore(evaluation.personalScore, departmentScore, evaluation.behaviorScore);
      evaluation.grade = gradePersonal(evaluation.finalScore);
    });
}

function calculateEvaluationFromForm() {
  const person = personById(byId("evalPerson").value);
  const role = person ? roleById(person.roleId) : null;
  const period = byId("evalPeriod").value || state.activePeriod;
  const criteriaScores = {};
  const criteriaResults = [];
  let personalScore = 0;
  const calculated = person ? personalCriteriaScoresFromTasks(person.id, period) : null;
  if (role) {
    role.criteria.forEach((criterion, index) => {
      const score = calculated?.criteriaScores?.[index] || { plan: 0, actual: 0 };
      const plan = score.plan;
      const actual = score.actual;
      const planInput = byId(`criterion-plan-${index}`);
      const actualInput = byId(`criterion-actual-${index}`);
      if (planInput) planInput.value = plan;
      if (actualInput) actualInput.value = formatScore(actual);
      const result = calculated?.criteriaResults?.[index] || calculateCriterionResult(plan, actual, criterion[1]);
      criteriaScores[index] = {
        plan,
        actual,
        completionPercent: result.completionPercent,
        points: result.points,
      };
      criteriaResults[index] = result;
      personalScore += result.points;
    });
  }

  const behavior = {};
  const behaviorManual = {};
  const automaticBehavior = automaticTaskBehaviorForPerson(person?.id || "", byId("evalPeriod").value || state.activePeriod);
  const automaticIndexes = automaticTaskBehaviorRuleIndexes();
  let behaviorScore = 0;
  behaviorRules.forEach((rule, index) => {
    const manualCount = automaticIndexes.has(index) ? 0 : clamp(byId(`behavior-${index}`)?.value, 0, 99);
    const autoCount = automaticBehavior.counts[index] || 0;
    const count = manualCount + autoCount;
    behaviorManual[index] = manualCount;
    behavior[index] = count;
    behaviorScore += count * rule[1];
  });

  const departmentScore = clamp(byId("evalDepartmentScore").value, 0, 120);
  const finalScore = calculatePersonalFinalScore(personalScore, departmentScore, behaviorScore);
  return {
    criteriaScores,
    criteriaResults,
    behavior,
    behaviorManual,
    behaviorAutomatic: automaticBehavior.counts,
    taskBehaviorLinks: automaticBehavior.links,
    personalScore,
    behaviorScore,
    departmentScore,
    finalScore,
  };
}

function calculateDepartmentEvaluationFromForm() {
  const department = departmentById(byId("deptEvalDepartment").value);
  const period = byId("deptEvalPeriod").value || state.activePeriod;
  const calculated = department
    ? departmentCriteriaScoresFromTasks(department.id, period)
    : { criteriaScores: {}, criteriaResults: [], criteriaScore: 0 };
  const adjustmentType = normalizeDepartmentAdjustmentType(byId("deptEvalAdjustmentType")?.value);
  const adjustmentPoints = Math.max(0, normalizeNumberInput(byId("deptEvalAdjustmentPoints")?.value));
  const adjustmentScore = departmentAdjustmentSignedScore(adjustmentType, adjustmentPoints);
  const rewardDisciplineNote = byId("deptEvalRewardDiscipline")?.value.trim() || "";
  const finalScore = calculateDepartmentFinalScore(calculated.criteriaScore, adjustmentScore);
  return {
    criteriaScores: calculated.criteriaScores,
    criteriaResults: calculated.criteriaResults,
    criteriaScore: calculated.criteriaScore,
    adjustmentType,
    adjustmentPoints,
    adjustmentScore,
    rewardDisciplineNote,
    finalScore: clamp(finalScore, 0, 120),
  };
}

function normalizeNumberInput(value) {
  const normalized = String(value ?? "").replace(",", ".");
  return Number.isFinite(Number(normalized)) ? Number(normalized) : 0;
}

function currentKpiFormulas() {
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  return state.systemCustomization.kpiFormulas;
}

function currentKpiParameters() {
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  return state.systemCustomization.kpiParameters;
}

function evaluateKpiFormula(expression, variables, fallback) {
  const source = String(expression || "").trim();
  if (!source) return fallback;
  const helpers = {
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    clamp,
  };
  const allowedNames = new Set([...Object.keys(variables), ...Object.keys(helpers)]);
  const identifiers = source.match(/[A-Za-z_]\w*/g) || [];
  if (identifiers.some((name) => !allowedNames.has(name))) return fallback;
  if (/[^0-9A-Za-z_\s+\-*/%().,?:<>=!&|]/.test(source)) return fallback;
  try {
    const keys = Object.keys(variables);
    const helperKeys = Object.keys(helpers);
    const fn = new Function(...keys, ...helperKeys, `"use strict"; return (${source});`);
    const value = fn(...keys.map((key) => Number(variables[key]) || 0), ...helperKeys.map((key) => helpers[key]));
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  } catch {
    return fallback;
  }
}

function calculatePersonalFinalScore(personalScore, departmentScore, behaviorScore) {
  const params = currentKpiParameters();
  return clamp(personalScore * params.personalWeight + departmentScore * params.departmentWeight + behaviorScore * params.behaviorWeight, 0, 120);
}

function calculateDepartmentFinalScore(criteriaScore, adjustmentScore) {
  const params = currentKpiParameters();
  return clamp(criteriaScore * params.departmentCriteriaWeight + adjustmentScore * params.departmentAdjustmentWeight, 0, 120);
}

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function calculateCriterionResult(plan, actual, weight) {
  const params = currentKpiParameters();
  const rawPercent = plan > 0 ? (actual / plan) * 100 : 0;
  const completionPercent = clamp(rawPercent, 0, params.completionMax);
  const points = (completionPercent / 100) * weight * params.criterionScale;
  return { completionPercent, points };
}

function criterionInputValues(existing = {}, index) {
  const raw = existing?.[index];
  if (raw == null) return { plan: "", actual: "" };
  if (raw && typeof raw === "object") {
    const fallbackActual = raw.completionPercent ?? raw.score;
    return {
      plan: hasOwnValue(raw, "plan") ? raw.plan : fallbackActual != null ? 100 : "",
      actual: hasOwnValue(raw, "actual") ? raw.actual : fallbackActual ?? "",
    };
  }
  const score = raw;
  return { plan: 100, actual: score };
}

function fillSelect(select, options, selectedValue) {
  const selectedValues = Array.isArray(selectedValue) ? selectedValue.map(String) : [String(selectedValue ?? "")];
  select.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.value)}" ${selectedValues.includes(String(item.value)) ? "selected" : ""}>${escapeHtml(item.label)}</option>`)
    .join("");
}

function renderDepartmentAndRoleOptions() {
  fillSelect(
    byId("personDepartment"),
    departments.map((item) => ({ value: item.id, label: item.name })),
  );
  updateRoleOptions();
  updatePersonSectionHeadOptions();
}

function renderDepartmentEvaluationOptions(selectedValue) {
  const visibleDepartments = visibleDepartmentsForDepartmentEvaluations();
  const fallbackSelected = selectedValue || byId("deptEvalDepartment").value || currentDepartmentId();
  const selected = visibleDepartments.some((item) => item.id === fallbackSelected) ? fallbackSelected : visibleDepartments[0]?.id || "";
  fillSelect(
    byId("deptEvalDepartment"),
    visibleDepartments.map((item) => ({ value: item.id, label: item.name })),
    selected,
  );
}

function updateRoleOptions(selectedValue) {
  const departmentId = byId("personDepartment").value;
  const filtered = roles.filter((item) => item.departmentId === departmentId);
  fillSelect(
    byId("personRole"),
    filtered.map((item) => ({ value: item.id, label: item.name })),
    selectedValue,
  );
}

function updatePersonSectionHeadOptions(selectedValue) {
  const field = byId("personSectionHeadField");
  const select = byId("personSectionHead");
  if (!field || !select) return;
  const personId = byId("personId").value;
  const departmentId = byId("personDepartment").value;
  const roleId = byId("personRole").value;
  const personDraft = { id: personId, departmentId, roleId };
  const isSectionHead = isSectionHeadPerson(personDraft);
  const leaders = state.people.filter((person) => person.id !== personId && person.departmentId === departmentId && isSectionHeadPerson(person));
  const requested = selectedValue ?? select.value;
  const selected = normalizeSectionHeadIdForPerson(personDraft, requested);
  fillSelect(
    select,
    [{ value: "", label: "Không phân nhóm quản lý" }].concat(
      leaders.map((person) => ({ value: person.id, label: `${person.name} - ${roleById(person.roleId)?.name || "Trưởng bộ phận/Trưởng nhóm"}` })),
    ),
    selected,
  );
  select.disabled = isSectionHead || !leaders.length;
  field.classList.toggle("is-hidden", isSectionHead);
}

function taskCategoryOptionsForPerson(personId) {
  const person = personById(personId);
  const role = person ? roleById(person.roleId) : null;
  const roleCriteria = role?.criteria?.map((criterion) => criterion[0]).filter(Boolean) || [];
  const fallback = [
    "Hoàn thành kế hoạch dự án",
    "Tiến độ - chất lượng - chi phí",
    "Cải cách hành chính",
    "Chuyển đổi số",
    "Tiết kiệm, chống lãng phí",
  ];
  return [...new Set(roleCriteria.length ? roleCriteria : fallback)];
}

function updateTaskCategoryOptions(selectedValue, ownerSelectId = "taskOwner", categorySelectId = "taskCategory") {
  const select = byId(categorySelectId);
  const options = taskCategoryOptionsForPerson(byId(ownerSelectId).value);
  const selectedCandidates = [selectedValue, select.value].filter((value) => value && !String(value).startsWith("Chọn người được giao"));
  const selected = selectedCandidates[0] || "";
  const merged = selected && !options.includes(selected) ? [selected, ...options] : options;
  fillSelect(
    select,
    merged.map((category) => ({ value: category, label: category })),
    selected && merged.includes(selected) ? selected : merged[0] || "",
  );
}

function updateTaskCollaboratorOptions(selectedValues = []) {
  const container = byId("taskCollaborators");
  updateTaskOwnerOptions();
  const ownerId = byId("taskOwner").value;
  const selectedIds = uniquePersonIds(selectedValues.length ? selectedValues : selectedTaskCollaboratorIds()).filter((id) => id !== ownerId);
  const taskPeople = visiblePeopleForTasks();
  const peopleWithSelected = [...taskPeople];
  selectedIds.forEach((personId) => {
    const person = personById(personId);
    if (person && !peopleWithSelected.some((item) => item.id === person.id)) {
      peopleWithSelected.unshift(person);
    }
  });
  const options = peopleWithSelected
    .filter((person) => person.id !== ownerId)
    .map((person) => ({
      value: person.id,
      label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
    }));
  container.classList.toggle("is-empty", !options.length);
  container.innerHTML = options.length
    ? options
        .map(
          (option) => `
            <label class="checkbox-option">
              <input type="checkbox" value="${escapeHtml(option.value)}" ${selectedIds.includes(String(option.value)) ? "checked" : ""}>
              <span>${escapeHtml(option.label)}</span>
            </label>
          `,
        )
        .join("")
    : '<span>Không có nhân sự phối hợp phù hợp.</span>';
  updateTaskCollaboratorSummary();
  filterTaskCollaboratorOptions();
}

function renderPersonOptions() {
  const currentTaskOwner = byId("taskOwner").value;
  const currentTaskCollaborators = selectedTaskCollaboratorIds();
  const editingTask = state.tasks.find((task) => task.id === byId("taskId").value);
  const taskPeople = visiblePeopleForTasks();
  const taskPeopleWithSelected =
    currentTaskOwner && !taskPeople.some((person) => person.id === currentTaskOwner)
      ? [personById(currentTaskOwner), ...taskPeople].filter(Boolean)
      : taskPeople;
  const taskSelectOptions = taskPeopleWithSelected.map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const evaluationOptions = visiblePeopleForEvaluation().map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const personPlaceholder = [{ value: "", label: taskSelectOptions.length ? "Chọn nhân sự" : "Chưa có nhân sự" }];
  const evaluationPlaceholder = [{ value: "", label: evaluationOptions.length ? "Chọn nhân sự" : "Không có nhân sự thuộc diện đánh giá KPI" }];
  const currentEvalPerson = byId("evalPerson").value;
  const selectedEvalPerson = evaluationOptions.some((option) => option.value === currentEvalPerson)
    ? currentEvalPerson
    : isEmployee() && currentPerson()
      ? currentPerson().id
      : !canViewAllData() && evaluationOptions.length === 1
      ? evaluationOptions[0].value
      : "";
  const currentTaskPerson = currentPerson();
  const selectedTaskOwner =
    isEmployee() && currentTaskPerson && taskSelectOptions.some((option) => option.value === currentTaskPerson.id)
      ? currentTaskPerson.id
      : taskSelectOptions.some((option) => option.value === currentTaskOwner)
        ? currentTaskOwner
        : taskSelectOptions.length === 1
          ? taskSelectOptions[0].value
          : "";
  fillSelect(
    byId("taskOwner"),
    personPlaceholder.concat(taskSelectOptions),
    selectedTaskOwner,
  );
  if (editingTask) {
    // Online data for a collaborator can omit the owner's personnel record.
    // Keep the original owner in the disabled edit form so progress updates remain valid.
    ensureTaskOwnerOption(editingTask);
    byId("taskOwner").value = String(editingTask.ownerId || "");
  }
  updateTaskCollaboratorOptions(currentTaskCollaborators);
  updateTaskCategoryOptions(byId("taskCategory").value);
  fillSelect(byId("evalPerson"), evaluationPlaceholder.concat(evaluationOptions), selectedEvalPerson);
  byId("evalPerson").disabled = isEmployee();
  return;

  const currentAssignmentOwner = byId("assignmentTaskOwner").value;
  const currentAssignmentCollaborator = byId("assignmentTaskCollaborator").value;
  const assignmentPeople = canAssignTasks() ? assignablePeopleForTasks() : [];
  const assignmentCollaboratorPeople = hasDepartmentTaskAccess() ? visiblePeopleForTasks() : assignmentPeople;
  const assignmentPeopleWithSelected = [...assignmentPeople];
  const assignmentCollaboratorPeopleWithSelected = [...assignmentCollaboratorPeople];
  [currentAssignmentOwner].forEach((personId) => {
    const person = personById(personId);
    if (person && !assignmentPeopleWithSelected.some((item) => item.id === person.id)) {
      assignmentPeopleWithSelected.unshift(person);
    }
  });
  [currentAssignmentCollaborator].forEach((personId) => {
    const person = personById(personId);
    if (person && !assignmentCollaboratorPeopleWithSelected.some((item) => item.id === person.id)) {
      assignmentCollaboratorPeopleWithSelected.unshift(person);
    }
  });
  const assignmentOptions = assignmentPeopleWithSelected.map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const assignmentCollaboratorOptions = assignmentCollaboratorPeopleWithSelected.map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const selectedAssignmentOwner = assignmentOptions.some((option) => option.value === currentAssignmentOwner)
    ? currentAssignmentOwner
    : assignmentOptions.length === 1
      ? assignmentOptions[0].value
      : "";
  const selectedAssignmentCollaborator = assignmentCollaboratorOptions.some((option) => option.value === currentAssignmentCollaborator) ? currentAssignmentCollaborator : "";
  fillSelect(byId("assignmentTaskOwner"), personPlaceholder.concat(assignmentOptions), selectedAssignmentOwner);
  fillSelect(byId("assignmentTaskCollaborator"), [{ value: "", label: "Không chọn người phối hợp" }].concat(assignmentCollaboratorOptions), selectedAssignmentCollaborator);
  updateTaskCategoryOptions(byId("assignmentTaskCategory").value, "assignmentTaskOwner", "assignmentTaskCategory");
  fillSelect(byId("evalPerson"), evaluationPlaceholder.concat(evaluationOptions), selectedEvalPerson);
  byId("evalPerson").disabled = isEmployee();
}

function renderAccountOptions() {
  fillSelect(
    byId("accountPerson"),
    [{ value: "", label: "Không liên kết" }].concat(
      state.people.map((person) => ({ value: person.id, label: `${person.name} - ${departmentById(person.departmentId)?.name || "Chưa rõ phòng"}` })),
    ),
  );
  fillSelect(
    byId("accountDepartment"),
    [{ value: "", label: "Tự lấy theo nhân sự" }].concat(departments.map((department) => ({ value: department.id, label: department.name }))),
  );
}

function renderPeopleTable() {
  const tbody = byId("peopleTable");
  const basePeople = visiblePeopleForPeopleView();
  if (!basePeople.length) {
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"11\"");
    return;
  }
  const search = normalizeSearchText(byId("personSearch").value.trim());
  const evaluatedPeople = new Set(evaluationsForPeriod(state.activePeriod).map((evaluation) => evaluation.personId));
  const people = basePeople.filter((person) => {
    if (peoplePendingEvaluationOnly && (!isKpiEligiblePerson(person) || evaluatedPeople.has(person.id))) return false;
    if (!search) return true;
    const department = departmentById(person.departmentId)?.name || "";
    const role = roleById(person.roleId)?.name || "";
    const sectionHead = sectionHeadForPerson(person);
    const managedNames = isSectionHeadPerson(person)
      ? managedTeamMembers(person.id).map((member) => member.name)
      : [];
    return normalizeSearchText(
      [
        person.name,
        person.gender,
        department,
        role,
        person.qualification,
        person.phone,
        person.birthDate,
        person.address,
        person.contract,
        person.contractTerm,
        person.contractSignedDate,
        person.salaryCoefficient,
        person.salaryGrade,
        person.salaryReviewDate,
        person.note,
        sectionHead?.name,
        ...managedNames,
      ].join(" "),
    ).includes(search);
  });
  updatePeopleFilterNote(people.length);
  if (!people.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">Không tìm thấy nhân sự phù hợp.</td></tr>';
    return;
  }
  tbody.innerHTML = people
    .map((person) => {
      const evaluation = personalEvaluationSnapshot(person.id, state.activePeriod);
      const department = departmentById(person.departmentId)?.name || "";
      const role = roleById(person.roleId)?.name || "";
      const sectionHead = sectionHeadForPerson(person);
      const managedMembers = isSectionHeadPerson(person) ? managedTeamMembers(person.id) : [];
      const contractDetails = [
        person.contractTerm,
        person.contractSignedDate ? `Ký HĐ: ${formatDate(person.contractSignedDate)}` : "",
      ].filter(Boolean);
      const salaryDetails = [
        formatSalary(person),
        person.salaryReviewDate ? `Xét nâng lương: ${formatDate(person.salaryReviewDate)}` : "",
      ].filter(Boolean);
      const contractHtml = [
        `<strong>${escapeHtml(person.contract || "Chưa cập nhật")}</strong>`,
        ...contractDetails.map((detail) => `<span>${escapeHtml(detail)}</span>`),
      ].join("");
      const salaryHtml = salaryDetails.length
        ? salaryDetails.map((detail, index) => (index ? `<span>${escapeHtml(detail)}</span>` : `<strong>${escapeHtml(detail)}</strong>`)).join("")
        : '<span class="muted">Chưa cập nhật</span>';
      const kpiHtml = evaluation
        ? `<span class="badge ${badgeClass(evaluation.finalScore)}">${formatScore(evaluation.finalScore)} - ${escapeHtml(evaluation.grade)}</span>`
        : '<span class="muted">Chưa chấm</span>';
      return `
        <tr class="people-row" data-person-id="${escapeHtml(person.id)}">
          <td class="people-name-cell">
            <div class="people-person-card">
              <strong>${escapeHtml(person.name)}</strong>
              <span class="people-contact">${escapeHtml(person.phone || "Chưa cập nhật SĐT")}</span>
            </div>
          </td>
          <td class="people-gender"><span class="people-tag">${escapeHtml(person.gender || "-")}</span></td>
          <td class="people-department-cell"><span class="people-department">${escapeHtml(department || "Chưa cập nhật")}</span></td>
          <td class="people-role-cell"><span class="people-role">${escapeHtml(role || "Chưa cập nhật")}</span>${sectionHead ? `<span class="people-contact">Nhóm: ${escapeHtml(sectionHead.name)}</span>` : managedMembers.length ? `<span class="people-contact">Quản lý ${managedMembers.length} nhân sự</span>` : ""}</td>
          <td><span class="people-detail-text">${escapeHtml(person.qualification || "Chưa cập nhật")}</span></td>
          <td class="people-birth-date"><span class="people-date">${escapeHtml(formatDate(person.birthDate) || "-")}</span></td>
          <td><span class="people-address">${escapeHtml(person.address || "Chưa cập nhật")}</span></td>
          <td><div class="people-info-stack">${contractHtml}</div></td>
          <td><div class="people-info-stack">${salaryHtml}</div></td>
          <td class="people-kpi-cell">${kpiHtml}</td>
          <td>
            <span class="row-actions">
              ${canEditPeople() ? `<button class="ghost" data-edit-person="${person.id}" type="button">Sửa</button><button class="ghost" data-delete-person="${person.id}" type="button">Xóa</button>` : "<span class=\"muted\">Chỉ xem</span>"}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function updatePeopleFilterNote(resultCount) {
  const note = byId("peopleFilterNote");
  if (!peoplePendingEvaluationOnly) {
    note.classList.add("is-hidden");
    byId("peopleFilterText").textContent = "";
    return;
  }
  byId("peopleFilterText").textContent = `Đang lọc ${resultCount} nhân sự chưa chấm KPI cá nhân trong kỳ ${formatPeriod(state.activePeriod)}.`;
  note.classList.remove("is-hidden");
}

function assignedTasksForInbox() {
  return state.tasks
    .map((task) => ({ ...task, status: normalizeTaskStatus(task.status), computedStatus: getDueStatus(task) }))
    .filter((task) => canViewTaskRecord(task) && isAssignedTask(task))
    .sort((a, b) => {
      const aDone = isTaskFinishedStatus(a.computedStatus) ? 1 : 0;
      const bDone = isTaskFinishedStatus(b.computedStatus) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = taskDeadlineDate(a)?.toISOString() || "9999-12-31";
      const bDue = taskDeadlineDate(b)?.toISOString() || "9999-12-31";
      return aDue.localeCompare(bDue) || (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
    });
}

function renderTaskInbox() {
  const assignedTasks = assignedTasksForInbox();
  const pendingCount = assignedTasks.filter((task) => !isTaskFinishedStatus(task.computedStatus)).length;
  byId("taskInboxBadge").textContent = String(pendingCount);
  byId("taskInboxBadge").classList.toggle("is-hidden", pendingCount === 0);
  byId("taskInboxSummary").textContent = assignedTasks.length
    ? `${pendingCount} việc đang cần xử lý, ${assignedTasks.length} việc được giao trong phạm vi tài khoản.`
    : "Chưa có công việc được giao.";
  if (!byId("taskInboxDialog").classList.contains("is-hidden")) {
    renderTaskInboxDialog();
  }
}

function renderTaskInboxDialog() {
  const assignedTasks = assignedTasksForInbox();
  const pendingCount = assignedTasks.filter((task) => !isTaskFinishedStatus(task.computedStatus)).length;
  byId("taskInboxDialogSummary").textContent = assignedTasks.length
    ? `${pendingCount} việc đang cần xử lý, ${assignedTasks.length} việc được giao.`
    : "Chưa có công việc được giao.";
  byId("taskInboxList").innerHTML = assignedTasks.length
    ? assignedTasks
        .map((task) => {
          const collaboratorNames = taskCollaboratorNames(task);
          const latestReport = latestTaskProgressReport(task);
          const violations = taskViolationReasons(task);
          return `
            <article class="task-inbox-item">
              <div class="section-head">
                <div>
                  <span class="badge ${task.computedStatus === "Quá hạn" ? "bad" : isTaskFinishedStatus(task.computedStatus) ? "good" : "warn"}">${escapeHtml(task.computedStatus)}</span>
                  <h3>${escapeHtml(task.title)}</h3>
                </div>
                <button class="ghost" data-open-inbox-task="${escapeHtml(task.id)}" type="button">Mở công việc</button>
              </div>
              <div class="task-inbox-meta">
                <span><strong>Loại công việc:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
                <span><strong>Tên dự án:</strong> ${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
                <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
                <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
                <span><strong>Thời hạn hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
                <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
                <span><strong>Đánh giá chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))}</span>
                <span><strong>Điểm thực hiện KPI:</strong> ${formatScore(taskKpiActualScore(task))}</span>
                <span><strong>Người giao:</strong> ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</span>
                <span><strong>Người được giao:</strong> ${escapeHtml(taskOwnerName(task))}</span>
                <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
                <span><strong>Phản hồi:</strong> ${escapeHtml(task.responseStatus || "Chưa phản hồi")}</span>
                <span><strong>Báo cáo gần nhất:</strong> ${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% - ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
              </div>
              ${task.note ? `<p class="task-inbox-note"><strong>Nội dung:</strong> ${escapeHtml(task.note)}</p>` : ""}
              ${task.responseNote ? `<p class="task-inbox-note"><strong>Phản hồi/Báo cáo:</strong> ${escapeHtml(task.responseNote)}</p>` : ""}
              ${latestReport?.note && latestReport.note !== task.responseNote ? `<p class="task-inbox-note"><strong>Cập nhật tiến độ gần nhất:</strong> ${escapeHtml(latestReport.note)}</p>` : ""}
              ${taskProgressReportListHtml(task)}
              ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
            </article>
          `;
        })
        .join("")
    : '<div class="empty-state">Chưa có công việc được giao.</div>';
}

function openTaskInboxDialog() {
  resetAssignmentTaskForm();
  renderTaskInboxDialog();
  byId("taskInboxDialog").classList.remove("is-hidden");
  byId("taskInboxDialog").setAttribute("aria-hidden", "false");
}

function closeTaskInboxDialog() {
  byId("taskInboxDialog").classList.add("is-hidden");
  byId("taskInboxDialog").setAttribute("aria-hidden", "true");
}

function taskBoardSearchText(task) {
  const owner = taskOwnerName(task, "");
  const collaborators = taskCollaboratorNames(task).join(" ");
  const assigner = task.assignedByName || task.createdBy || "";
  const attachments = (task.attachments || []).map((file) => file.name).join(" ");
  const reports = (task.progressReports || []).map((report) => report.note).join(" ");
  const taskKind = taskKindLabels[normalizeTaskKind(task)] || "";
  const regularMeta = isAssignedTask(task) ? "" : taskWorkMeta(task);
  return `${task.title} ${projectNameForTask(task)} ${taskKind} ${owner} ${collaborators} ${assigner} ${task.category} ${regularMeta} ${task.note || ""} ${task.responseNote || ""} ${reports} ${attachments}`.toLowerCase();
}

function indexedTaskBoardSearchText(task) {
  const cached = taskSearchTextCache.get(task);
  if (cached?.generation === searchIndexGeneration) return cached.text;
  const text = taskBoardSearchText(task);
  taskSearchTextCache.set(task, { generation: searchIndexGeneration, text });
  return text;
}

function currentTaskTimeFilter() {
  return {
    from: byId("taskDateFrom")?.value || "",
    to: byId("taskDateTo")?.value || "",
  };
}

function currentTaskProjectFilter() {
  return byId("taskProjectFilter")?.value.trim() || "";
}

function taskProjectOptions() {
  return (state.projectCatalog || [])
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "vi"))
    .map((project) => ({ value: project.id, label: project.name }));
}

function renderTaskProjectOptions() {
  const options = [{ value: "", label: "Chưa chọn danh mục dự án" }, ...taskProjectOptions()];
  ["taskProjectId"].forEach((selectId) => {
    const select = byId(selectId);
    if (!select) return;
    const selected = select.value;
    fillSelect(select, options, selected);
  });
}

function resetTaskProjectCatalogForm() {
  const form = byId("taskProjectCatalogForm");
  if (!form) return;
  form.reset();
  byId("taskProjectCatalogId").value = "";
}

function renderTaskProjectCatalog() {
  renderTaskProjectOptions();
  const panel = byId("taskProjectCatalogPanel");
  if (!panel) return;
  const canManage = canManageProjectCatalog();
  panel.classList.toggle("is-hidden", !canManage);
  if (!canManage) return;
  const projects = taskProjectOptions();
  const search = normalizeSearchText(byId("taskProjectCatalogSearch")?.value || "");
  const visibleProjects = search
    ? projects.filter((project) => normalizeSearchText(project.label).includes(search))
    : projects;
  byId("taskProjectCatalogNote").textContent = projects.length
    ? `${projects.length} dự án đang được dùng làm tên chuẩn cho công việc.`
    : "Chưa có dự án. Thêm dự án để liên kết khi tạo công việc.";
  byId("taskProjectCatalogList").innerHTML = visibleProjects.length
    ? visibleProjects
        .map(
          (project) => `
            <div class="project-catalog-item">
              <button class="project-catalog-project-link" type="button" data-open-project-tasks="${escapeHtml(project.value)}" title="Xem công việc thuộc dự án ${escapeHtml(project.label)}">${escapeHtml(project.label)}</button>
              <div class="project-catalog-actions">
                <button class="ghost" type="button" data-edit-task-project="${escapeHtml(project.value)}">Sửa</button>
                <button class="ghost project-catalog-delete" type="button" data-delete-task-project="${escapeHtml(project.value)}" title="Xóa dự án" aria-label="Xóa dự án ${escapeHtml(project.label)}">X</button>
              </div>
            </div>
          `,
        )
        .join("")
    : search
      ? '<p class="muted">Không tìm thấy dự án phù hợp.</p>'
      : '<p class="muted">Chưa có tên dự án trong danh mục.</p>';
}

function openTaskProjectCatalogDialog() {
  if (!canManageProjectCatalog()) return;
  byId("taskProjectCatalogSearch").value = "";
  renderTaskProjectCatalog();
  const dialog = byId("taskProjectCatalogDialog");
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  byId("taskProjectCatalogName").focus();
}

function closeTaskProjectCatalogDialog() {
  const dialog = byId("taskProjectCatalogDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
  resetTaskProjectCatalogForm();
}

function openProjectTaskList(projectId) {
  const project = projectById(projectId);
  if (!project || !canAccessView("tasks")) return;
  closeTaskProjectCatalogDialog();
  switchView("tasks");
  byId("taskSearch").value = "";
  byId("taskStatusFilter").value = "";
  clearTaskTimeFilter();
  renderTaskProjectFilterOptions();
  byId("taskProjectFilter").value = project.name;
  renderTaskBoard();
  byId("taskBoard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function editTaskProjectCatalog(projectId) {
  if (!canManageProjectCatalog()) return;
  const project = projectById(projectId);
  if (!project) return;
  byId("taskProjectCatalogId").value = project.id;
  byId("taskProjectCatalogName").value = project.name;
  byId("taskProjectCatalogName").focus();
  byId("taskProjectCatalogName").scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTaskProjectCatalog(projectId) {
  if (!canManageProjectCatalog()) {
    alert("Tài khoản hiện tại không có quyền xóa dự án trong danh mục.");
    return;
  }
  const project = projectById(projectId);
  if (!project) return;
  const linkedTaskCount = state.tasks.filter((task) => projectIdForTask(task) === project.id).length;
  const linkedTaskNote = linkedTaskCount
    ? ` ${linkedTaskCount} công việc đã liên kết vẫn được giữ nguyên để tra cứu lịch sử.`
    : "";
  if (!confirm(`Xóa dự án "${project.name}" khỏi danh mục?${linkedTaskNote}`)) return;
  registerDeletedId(project.id);
  state.projectCatalog = state.projectCatalog.filter((item) => item.id !== project.id);
  logActivity({
    action: "Xóa dự án khỏi danh mục",
    module: "Công việc",
    targetType: "project-catalog",
    targetId: project.id,
    title: project.name,
    details: linkedTaskCount
      ? `Xóa khỏi danh mục; giữ lại ${linkedTaskCount} công việc đã liên kết để tra cứu.`
      : "Xóa khỏi danh mục dự án.",
  });
  saveState();
  resetTaskProjectCatalogForm();
  renderAll();
}

function saveTaskProjectCatalog(event) {
  event.preventDefault();
  if (!canManageProjectCatalog()) {
    alert("Tài khoản hiện tại không có quyền cập nhật danh mục dự án.");
    return;
  }
  const projectId = String(byId("taskProjectCatalogId").value || "").trim();
  const name = normalizedProjectCatalogName(byId("taskProjectCatalogName").value);
  if (!name) return;
  const duplicate = (state.projectCatalog || []).find(
    (project) => project.id !== projectId && projectCatalogNameKey(project.name) === projectCatalogNameKey(name),
  );
  if (duplicate) {
    alert("Tên dự án này đã có trong danh mục.");
    return;
  }
  const actor = currentActorInfo();
  const timestamp = new Date().toISOString();
  const existing = projectId ? projectById(projectId) : null;
  const savedProject = existing
    ? {
        ...existing,
        name,
        updatedAt: timestamp,
        updatedById: actor.id,
        updatedByName: actor.name,
      }
    : {
        id: uid("project"),
        name,
        createdAt: timestamp,
        createdById: actor.id,
        createdByName: actor.name,
        updatedAt: timestamp,
        updatedById: actor.id,
        updatedByName: actor.name,
      };
  state.projectCatalog = existing
    ? state.projectCatalog.map((project) => (project.id === existing.id ? savedProject : project))
    : [...state.projectCatalog, savedProject];
  logActivity({
    action: existing ? "Cập nhật danh mục dự án" : "Thêm dự án vào danh mục",
    module: "Công việc",
    targetType: "project-catalog",
    targetId: savedProject.id,
    title: savedProject.name,
    details: existing ? `Đổi tên dự án thành ${savedProject.name}.` : `Thêm dự án ${savedProject.name}.`,
  });
  saveState();
  resetTaskProjectCatalogForm();
  renderAll();
}

function renderTaskProjectFilterOptions() {
  const select = byId("taskProjectFilter");
  if (!select) return;
  const selected = select.value;
  const projects = [...new Set(
    [
      ...state.tasks
        .filter((task) => canViewTaskRecord(task))
        .map((task) => projectNameForTask(task))
        .filter(Boolean),
      ...taskProjectOptions().map((project) => project.label),
    ],
  )].sort((left, right) => left.localeCompare(right, "vi"));
  select.innerHTML = [
    '<option value="">Tất cả dự án</option>',
    ...projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`),
  ].join("");
  select.value = projects.includes(selected) ? selected : "";
}

function resetTaskBulkImport() {
  taskBulkImportState = { rows: [], errors: [], fileName: "" };
  const input = byId("taskBulkImportFile");
  if (input) input.value = "";
  byId("taskBulkImportSummary").textContent = "Chưa chọn tệp để kiểm tra.";
  byId("taskBulkImportErrors").classList.add("is-hidden");
  byId("taskBulkImportErrors").innerHTML = "";
  byId("taskBulkImportPreview").innerHTML = '<tr><td colspan="7" class="empty-cell">Chưa có dữ liệu xem trước.</td></tr>';
  byId("confirmTaskBulkImport").disabled = true;
}

function openTaskBulkImportDialog() {
  if (!isAdmin()) return;
  resetTaskBulkImport();
  const dialog = byId("taskBulkImportDialog");
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
}

function closeTaskBulkImportDialog() {
  const dialog = byId("taskBulkImportDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
  resetTaskBulkImport();
}

function normalizeTaskBulkImportKey(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function taskBulkImportColumnMap(headers) {
  const normalizedHeaders = headers.map((header) => normalizeTaskBulkImportKey(header));
  return Object.fromEntries(
    Object.entries(taskBulkImportHeaders).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex((header) => aliases.some((alias) => header === normalizeTaskBulkImportKey(alias))),
    ]),
  );
}

function taskBulkImportCell(row, columns, field) {
  const index = Number(columns[field]);
  return index >= 0 ? String(row[index] ?? "").trim() : "";
}

function parseTaskBulkImportCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = [";", ",", "\t"].reduce(
    (selected, candidate) => (firstLine.split(candidate).length > firstLine.split(selected).length ? candidate : selected),
    ";",
  );
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  if (quoted) throw new Error("Tệp CSV có dấu nháy kép chưa được đóng.");
  return rows;
}

function readTaskBulkImportZipEntries(buffer) {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endOffset = -1;
  for (let offset = Math.max(0, data.length - 65557); offset <= data.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) endOffset = offset;
  }
  if (endOffset < 0) throw new Error("Tệp Excel không có cấu trúc ZIP hợp lệ.");
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Tệp Excel có danh mục ZIP không hợp lệ.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(data.slice(offset + 46, offset + 46 + nameLength));
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { data, view, entries };
}

async function readTaskBulkImportZipText(archive, name) {
  const entry = archive.entries.get(name);
  if (!entry) return "";
  const { data, view } = archive;
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error("Tệp Excel có dữ liệu ZIP không hợp lệ.");
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = data.slice(start, start + entry.compressedSize);
  let output;
  if (entry.method === 0) {
    output = compressed;
  } else if (entry.method === 8 && typeof DecompressionStream === "function") {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    output = new Uint8Array(await new Response(stream).arrayBuffer());
  } else {
    throw new Error("Trình duyệt không hỗ trợ đọc định dạng nén của tệp Excel này. Hãy lưu lại dưới dạng .xlsx hoặc .csv.");
  }
  return new TextDecoder().decode(output);
}

function taskBulkImportColumnIndex(cellReference) {
  const letters = String(cellReference || "").match(/[A-Z]+/i)?.[0] || "A";
  return [...letters.toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function taskBulkImportExcelDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 90000) return "";
  const date = new Date((Math.floor(serial) - 25569) * 86400000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function parseTaskBulkImportXlsx(buffer) {
  const archive = readTaskBulkImportZipEntries(buffer);
  const sharedStringsXml = await readTaskBulkImportZipText(archive, "xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? Array.from(new DOMParser().parseFromString(sharedStringsXml, "application/xml").getElementsByTagName("si")).map((item) =>
        Array.from(item.getElementsByTagName("t")).map((text) => text.textContent || "").join(""),
      )
    : [];
  const sheetName = [...archive.entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))[0];
  if (!sheetName) throw new Error("Không tìm thấy trang dữ liệu trong tệp Excel.");
  const sheetXml = await readTaskBulkImportZipText(archive, sheetName);
  const documentXml = new DOMParser().parseFromString(sheetXml, "application/xml");
  if (documentXml.getElementsByTagName("parsererror").length) throw new Error("Không đọc được nội dung XML của tệp Excel.");
  return Array.from(documentXml.getElementsByTagName("row")).map((row) => {
    const values = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const index = taskBulkImportColumnIndex(cell.getAttribute("r"));
      const type = cell.getAttribute("t") || "";
      const valueNode = cell.getElementsByTagName("v")[0];
      const inlineText = Array.from(cell.getElementsByTagName("t")).map((item) => item.textContent || "").join("");
      const raw = valueNode?.textContent || inlineText || "";
      values[index] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "inlineStr" ? inlineText : raw;
    });
    return values.map((value) => String(value ?? "").trim());
  }).filter((row) => row.some((value) => value));
}

function normalizeTaskBulkImportDate(value) {
  const text = String(value ?? "").trim();
  const excelDate = taskBulkImportExcelDate(text);
  if (excelDate) return excelDate;
  const iso = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  const vietnam = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : vietnam ? [vietnam[3], vietnam[2], vietnam[1]] : null;
  if (!parts) return "";
  const result = `${parts[0]}-${padDatePart(parts[1])}-${padDatePart(parts[2])}`;
  const date = new Date(`${result}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === result ? result : "";
}

function taskBulkImportPerson(reference) {
  const raw = String(reference || "").trim();
  if (!raw) return null;
  const byId = personById(raw);
  if (byId) return byId;
  const normalized = normalizeSearchText(raw);
  const directMatches = state.people.filter((person) => normalizeSearchText(person.name) === normalized);
  if (directMatches.length === 1) return directMatches[0];
  const accountMatches = state.accounts
    .filter((account) => normalizeSearchText(account.username) === normalized || normalizeSearchText(account.displayName) === normalized)
    .map((account) => personById(account.personId))
    .filter(Boolean);
  return accountMatches.length === 1 ? accountMatches[0] : null;
}

function taskBulkImportWorkType(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized === "routine" || normalized.includes("thuong xuyen")) return TASK_WORK_TYPE_ROUTINE;
  if (normalized === "arising" || normalized.includes("phat sinh")) return TASK_WORK_TYPE_ARISING;
  return "";
}

function taskBulkImportRecurrence(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized === "none" || normalized.includes("khong dinh ky")) return TASK_RECURRENCE_NONE;
  if (normalized === "daily" || normalized.includes("hang ngay")) return TASK_RECURRENCE_DAILY;
  if (normalized === "weekly" || normalized.includes("hang tuan")) return TASK_RECURRENCE_WEEKLY;
  if (normalized === "monthly" || normalized.includes("hang thang")) return TASK_RECURRENCE_MONTHLY;
  if (normalized === "quarterly" || normalized.includes("hang quy")) return TASK_RECURRENCE_QUARTERLY;
  return "";
}

function taskBulkImportStatus(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized.includes("chuan bi") || normalized.includes("chua bat dau")) return TASK_STATUS_PREPARING;
  if (normalized.includes("dang thuc hien")) return "Đang thực hiện";
  if (normalized.includes("hoan thanh")) return TASK_STATUS_COMPLETED;
  if (normalized.includes("qua han")) return "Quá hạn";
  return "";
}

function taskBulkImportSignature(row) {
  return [normalizeSearchText(row.title), row.ownerId, projectCatalogNameKey(row.projectName), row.startDate, row.due].join("|");
}

function validateTaskBulkImportRows(rows) {
  if (!rows.length) throw new Error("Tệp chưa có dòng dữ liệu.");
  const [headers, ...dataRows] = rows;
  const columns = taskBulkImportColumnMap(headers);
  const missingHeaders = ["title", "project", "owner", "category", "startDate", "due"].filter((field) => columns[field] < 0);
  if (missingHeaders.length) {
    const labels = {
      title: "Tên công việc",
      project: "Danh mục dự án",
      owner: "Người thực hiện",
      category: "Danh mục KPI cá nhân",
      startDate: "Ngày bắt đầu",
      due: "Ngày hoàn thành",
    };
    throw new Error(`Thiếu cột bắt buộc: ${missingHeaders.map((field) => labels[field]).join(", ")}.`);
  }
  if (dataRows.length > TASK_BULK_IMPORT_MAX_ROWS) throw new Error(`Mỗi lần chỉ nhập tối đa ${TASK_BULK_IMPORT_MAX_ROWS} công việc.`);

  const existingSignatures = new Set(
    state.tasks.map((task) => taskBulkImportSignature({
      title: task.title,
      ownerId: task.ownerId,
      projectName: projectNameForTask(task),
      startDate: task.startDate || "",
      due: task.due || "",
    })),
  );
  const importedSignatures = new Set();
  const validatedRows = [];
  const errors = [];

  dataRows.forEach((source, index) => {
    const line = index + 2;
    const messages = [];
    const title = taskBulkImportCell(source, columns, "title");
    const projectName = normalizedProjectCatalogName(taskBulkImportCell(source, columns, "project"));
    const ownerReference = taskBulkImportCell(source, columns, "owner");
    const owner = taskBulkImportPerson(ownerReference);
    const categorySource = taskBulkImportCell(source, columns, "category");
    const startDate = normalizeTaskBulkImportDate(taskBulkImportCell(source, columns, "startDate"));
    const due = normalizeTaskBulkImportDate(taskBulkImportCell(source, columns, "due"));
    if (!title) messages.push("Thiếu tên công việc");
    if (!projectName) messages.push("Thiếu danh mục dự án");
    if (!owner) messages.push(`Không tìm thấy hoặc trùng người thực hiện: ${ownerReference || "trống"}`);
    if (!startDate) messages.push("Ngày bắt đầu không hợp lệ");
    if (!due) messages.push("Ngày hoàn thành không hợp lệ");
    if (startDate && due && startDate > due) messages.push("Ngày bắt đầu phải trước hoặc bằng ngày hoàn thành");
    const category = owner
      ? taskCategoryOptionsForPerson(owner.id).find((option) => normalizeSearchText(option) === normalizeSearchText(categorySource)) || ""
      : "";
    if (!category) messages.push(`Tiêu chí KPI không đúng với người thực hiện: ${categorySource || "trống"}`);
    const workType = taskBulkImportWorkType(taskBulkImportCell(source, columns, "workType"));
    if (!workType) messages.push("Loại công việc không hợp lệ");
    const recurrence = taskBulkImportRecurrence(taskBulkImportCell(source, columns, "recurrence"));
    if (!recurrence) messages.push("Định kỳ không hợp lệ");
    const status = taskBulkImportStatus(taskBulkImportCell(source, columns, "status"));
    if (!status) messages.push("Trạng thái không hợp lệ");
    const progressText = taskBulkImportCell(source, columns, "progress");
    const progress = progressText === "" ? (status === TASK_STATUS_COMPLETED ? 100 : 0) : Number(String(progressText).replace(",", "."));
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) messages.push("Tiến độ phải từ 0 đến 100");
    if (status === TASK_STATUS_COMPLETED && Number(progress) < 100) messages.push("Công việc Hoàn thành cần tiến độ 100%");

    const collaboratorIds = [];
    const collaboratorSource = taskBulkImportCell(source, columns, "collaborators");
    collaboratorSource
      .split(/[;|,\n]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((reference) => {
        const collaborator = taskBulkImportPerson(reference);
        if (!collaborator) {
          messages.push(`Không tìm thấy hoặc trùng người phối hợp: ${reference}`);
        } else if (collaborator.id !== owner?.id && !collaboratorIds.includes(collaborator.id)) {
          collaboratorIds.push(collaborator.id);
        }
      });

    const record = {
      line,
      title,
      projectName,
      ownerId: owner?.id || "",
      ownerName: owner?.name || ownerReference,
      collaboratorIds,
      category,
      workType,
      recurrence,
      startDate,
      due,
      status,
      progress: Number.isFinite(progress) ? progress : 0,
      note: taskBulkImportCell(source, columns, "note"),
      errors: messages,
    };
    const signature = taskBulkImportSignature(record);
    if (!messages.length && (existingSignatures.has(signature) || importedSignatures.has(signature))) {
      record.errors.push("Trùng công việc đã có hoặc trùng một dòng khác trong tệp");
    }
    if (!record.errors.length) importedSignatures.add(signature);
    if (record.errors.length) errors.push({ line, messages: record.errors });
    validatedRows.push(record);
  });
  return { rows: validatedRows, errors };
}

function renderTaskBulkImportPreview() {
  const rows = taskBulkImportState.rows;
  const errors = taskBulkImportState.errors;
  const validCount = rows.filter((row) => !row.errors.length).length;
  const existingProjectKeys = new Set((state.projectCatalog || []).map((project) => projectCatalogNameKey(project.name)));
  const safeNewProjectCount = new Set(
    rows.filter((row) => !row.errors.length).map((row) => projectCatalogNameKey(row.projectName)).filter((key) => !existingProjectKeys.has(key)),
  ).size;
  byId("taskBulkImportSummary").textContent = taskBulkImportState.fileName
    ? `${taskBulkImportState.fileName}: ${rows.length} dòng dữ liệu · ${validCount} hợp lệ · ${errors.length} lỗi · ${safeNewProjectCount} dự án mới sẽ được thêm.`
    : "Chưa chọn tệp để kiểm tra.";
  byId("confirmTaskBulkImport").disabled = !validCount || Boolean(errors.length);
  byId("taskBulkImportPreview").innerHTML = rows.length
    ? rows.slice(0, 50).map((row) => `
        <tr>
          <td>${row.line}</td>
          <td>${escapeHtml(row.title || "-")}</td>
          <td>${escapeHtml(row.projectName || "-")}</td>
          <td>${escapeHtml(row.ownerName || "-")}</td>
          <td>${escapeHtml(row.category || "-")}</td>
          <td>${escapeHtml(row.startDate ? `${formatDate(row.startDate)} - ${formatDate(row.due)}` : "-")}</td>
          <td>${row.errors.length ? `<span class="badge bad">${escapeHtml(row.errors.join("; "))}</span>` : '<span class="badge good">Hợp lệ</span>'}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="7" class="empty-cell">Chưa có dữ liệu xem trước.</td></tr>';
  const errorBox = byId("taskBulkImportErrors");
  errorBox.classList.toggle("is-hidden", !errors.length);
  errorBox.innerHTML = errors.length
    ? `<strong>Cần sửa ${errors.length} dòng trước khi nhập:</strong><ul>${errors.slice(0, 12).map((error) => `<li>Dòng ${error.line}: ${escapeHtml(error.messages.join("; "))}</li>`).join("")}${errors.length > 12 ? `<li>... và ${errors.length - 12} dòng khác.</li>` : ""}</ul>`
    : "";
}

async function parseTaskBulkImportFile(file) {
  if (!file) return [];
  if (Number(file.size) > TASK_BULK_IMPORT_MAX_FILE_BYTES) {
    throw new Error("Tệp nhập công việc không được vượt quá 10 MB.");
  }
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".csv")) return parseTaskBulkImportCsv(await file.text());
  if (name.endsWith(".xlsx")) return parseTaskBulkImportXlsx(await file.arrayBuffer());
  throw new Error("Chỉ hỗ trợ tệp .xlsx hoặc .csv.");
}

async function handleTaskBulkImportFile(file) {
  if (!isAdmin() || !file) return;
  resetTaskBulkImport();
  byId("taskBulkImportSummary").textContent = "Đang đọc và kiểm tra tệp Excel...";
  try {
    const rows = await parseTaskBulkImportFile(file);
    const validated = validateTaskBulkImportRows(rows);
    taskBulkImportState = { ...validated, fileName: file.name || "Tệp Excel" };
    renderTaskBulkImportPreview();
  } catch (error) {
    taskBulkImportState = { rows: [], errors: [], fileName: "" };
    byId("taskBulkImportSummary").textContent = error?.message || "Không thể đọc tệp Excel.";
    byId("taskBulkImportPreview").innerHTML = '<tr><td colspan="7" class="empty-cell">Không có dữ liệu hợp lệ để xem trước.</td></tr>';
  }
}

function downloadTaskBulkImportTemplate() {
  const headers = ["Tên công việc", "Danh mục dự án", "Người thực hiện", "Người phối hợp", "Danh mục KPI cá nhân", "Loại công việc", "Định kỳ", "Ngày bắt đầu", "Ngày hoàn thành", "Trạng thái", "Tiến độ (%)", "Nội dung công việc / Báo cáo tiến độ"];
  const content = `\uFEFF${headers.join(";")}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau-nhap-cong-viec.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function importTaskBulkRows() {
  if (!isAdmin()) return;
  const rows = taskBulkImportState.rows.filter((row) => !row.errors.length);
  if (!rows.length || taskBulkImportState.errors.length) return;
  if (!confirm(`Nhập ${rows.length} công việc mới vào hệ thống? Dữ liệu sẽ được đồng bộ với các tài khoản khác.`)) return;
  const previous = {
    tasks: state.tasks,
    projectCatalog: state.projectCatalog,
    evaluations: state.evaluations,
    activityLog: state.activityLog,
  };
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const projectsByName = new Map((state.projectCatalog || []).map((project) => [projectCatalogNameKey(project.name), project]));
  const newProjects = [];
  rows.forEach((row) => {
    const key = projectCatalogNameKey(row.projectName);
    if (projectsByName.has(key)) return;
    const project = applyRecordAudit({ id: uid("project"), name: row.projectName }, null);
    projectsByName.set(key, project);
    newProjects.push(project);
  });
  const importedTasks = rows.map((row) => {
    const project = projectsByName.get(projectCatalogNameKey(row.projectName));
    const completed = row.status === TASK_STATUS_COMPLETED;
    return applyRecordAudit({
      id: uid("task"),
      kind: TASK_KIND_REGULAR,
      title: row.title,
      projectId: project?.id || "",
      projectName: project?.name || row.projectName,
      ownerId: row.ownerId,
      collaboratorIds: row.collaboratorIds,
      collaboratorId: "",
      category: row.category,
      workType: row.workType,
      recurrence: row.recurrence,
      startDate: row.startDate,
      due: row.due,
      dueTime: "",
      status: row.status,
      progress: row.progress,
      qualityPercent: "",
      attachments: [],
      note: row.note,
      customFields: {},
      completionReviewStatus: completed ? "pending" : "",
      completionReviewedAt: "",
      completionReviewedById: "",
      completionReviewedByName: "",
      completionReviewNote: "",
      completedAt: completed ? timestamp : "",
      completedById: completed ? actor.id : "",
      completedByName: completed ? actor.name : "",
      progressReports: row.note ? [{
        id: uid("task-report"),
        progress: row.progress,
        status: row.status,
        previousStatus: "",
        action: "Nhập hàng loạt từ Excel",
        note: row.note,
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      }] : [],
    }, null);
  });
  try {
    state.projectCatalog = [...(state.projectCatalog || []), ...newProjects];
    state.tasks = [...(state.tasks || []), ...importedTasks];
    importedTasks.forEach((task) => {
      syncPersonalEvaluationTaskScoresForTask(task);
      const owner = personById(task.ownerId);
      logActivity({
        action: "Nhập hàng loạt từ Excel",
        module: "Công việc",
        targetType: "task",
        targetId: task.id,
        personId: task.ownerId,
        departmentId: owner?.departmentId || "",
        period: taskPeriod(task),
        title: task.title,
        details: `${task.projectName} · ${taskOwnerName(task, "Chưa rõ người thực hiện")} · ${task.category} · ${normalizeTaskStatus(task.status)}`,
        score: `${formatScore(task.progress)}%`,
      });
    });
    newProjects.forEach((project) => logActivity({
      action: "Thêm dự án từ Excel",
      module: "Công việc",
      targetType: "project-catalog",
      targetId: project.id,
      title: project.name,
      details: "Tự tạo khi nhập hàng loạt công việc.",
    }));
    saveState();
    closeTaskBulkImportDialog();
    renderAll();
    alert(`Đã nhập ${importedTasks.length} công việc${newProjects.length ? ` và thêm ${newProjects.length} dự án mới` : ""}.`);
  } catch (error) {
    state.tasks = previous.tasks;
    state.projectCatalog = previous.projectCatalog;
    state.evaluations = previous.evaluations;
    state.activityLog = previous.activityLog;
    alert(error?.message || "Không thể lưu dữ liệu nhập từ Excel.");
  }
}

function taskFilterDate(task) {
  return String(task.due || "");
}

function taskMatchesTimeFilter(task, timeFilter = currentTaskTimeFilter()) {
  const date = taskFilterDate(task);
  if (!date) return !timeFilter.from && !timeFilter.to;
  if (timeFilter.from && date < timeFilter.from) return false;
  if (timeFilter.to && date > timeFilter.to) return false;
  return true;
}

function taskMatchesProjectFilter(task, projectFilter = currentTaskProjectFilter()) {
  if (!projectFilter) return true;
  return normalizeSearchText(projectNameForTask(task)) === normalizeSearchText(projectFilter);
}

function taskMatchesStatusFilter(task, status = "") {
  if (!status) return true;
  if (status === TASK_STATUS_PENDING_REVIEW) return taskCompletionNeedsReview(task);
  return task.computedStatus === status;
}

function clearTaskTimeFilter() {
  byId("taskDateFrom").value = "";
  byId("taskDateTo").value = "";
}

function visibleTaskRecords(search = "", status = "", timeFilter = currentTaskTimeFilter(), projectFilter = currentTaskProjectFilter()) {
  const keyword = (search || "").trim().toLowerCase();
  return state.tasks
    .map((task) => ({ ...task, status: normalizeTaskStatus(task.status), computedStatus: getDueStatus(task) }))
    .filter((task) => canViewTaskRecord(task))
    .filter((task) => taskMatchesStatusFilter(task, status))
    .filter((task) => taskMatchesTimeFilter(task, timeFilter))
    .filter((task) => taskMatchesProjectFilter(task, projectFilter))
    .filter((task) => !keyword || indexedTaskBoardSearchText(task).includes(keyword));
}

function visibleRegularTaskRecords(search = "", status = "", timeFilter = currentTaskTimeFilter()) {
  return visibleTaskRecords(search, status, timeFilter).filter((task) => normalizeTaskKind(task) === TASK_KIND_REGULAR);
}

function compareTaskRecords(a, b) {
  const aDue = taskDeadlineDate(a)?.toISOString() || "9999-12-31";
  const bDue = taskDeadlineDate(b)?.toISOString() || "9999-12-31";
  if (aDue !== bDue) return aDue.localeCompare(bDue);
  return (a.title || "").localeCompare(b.title || "", "vi");
}

function renderTaskBoard(options = {}) {
  byId("openTaskForm")?.classList.toggle("is-hidden", !canCreateRegularTasks());
  byId("openTaskBulkImport")?.classList.toggle("is-hidden", !isAdmin());
  renderTaskProjectFilterOptions();
  const search = byId("taskSearch").value.trim().toLowerCase();
  const filter = byId("taskStatusFilter").value;
  const timeFilter = currentTaskTimeFilter();
  const projectFilter = currentTaskProjectFilter();
  const tasks = visibleTaskRecords(search, filter, timeFilter, projectFilter);

  const renderTaskColumns = () => {
    const boardStatuses = filter === TASK_STATUS_PENDING_REVIEW ? [TASK_STATUS_PENDING_REVIEW] : taskStatuses;
    return boardStatuses
      .map((status) => {
        const cards = tasks
          .filter((task) => taskMatchesStatusFilter(task, status))
          .map((task) => {
            const collaboratorNames = taskCollaboratorNames(task);
            const assigned = isAssignedTask(task);
            const taskKind = normalizeTaskKind(task);
            const editable = canEditTaskDetails(task);
            const deletable = canDeleteTask(task);
            const copyable = canCopyTask(task);
            const reportable = canUpdateTaskProgress(task);
            const reviewable = canReviewTaskCompletion(task);
            const attachments = task.attachments || [];
            const latestReport = latestTaskProgressReport(task);
            const violations = taskViolationReasons(task);
            const responseText = task.responseStatus
              ? `${task.responseStatus}${task.responseAt ? ` · ${formatDateTime(task.responseAt)}` : ""}`
              : "Chưa phản hồi";
            const reportText = latestReport
              ? `${formatScore(latestReport.progress)}% · ${formatDateTime(latestReport.createdAt)}`
              : assigned
                ? "Chưa có báo cáo tiến độ"
                : "Chưa có cập nhật tiến độ";
            const attachmentList = attachments.length
              ? `<div class="task-attachments">${attachments
                  .map((file) => taskAttachmentLinkHtml(file))
                  .join("")}</div>`
              : "";
            return `
              <article class="task-card task-card-clickable" data-open-task-detail="${escapeHtml(task.id)}">
                <h4>${escapeHtml(task.title)}</h4>
                ${projectNameForTask(task) ? `<div class="task-meta">Dự án: ${escapeHtml(projectNameForTask(task))}</div>` : ""}
                <div class="task-meta">${assigned ? "Giao cho" : "Người thực hiện"} ${escapeHtml(taskOwnerName(task))} · bắt đầu ${escapeHtml(formatTaskStartDate(task) || "chưa có")} · hoàn thành ${escapeHtml(formatTaskDeadline(task) || "chưa có")}</div>
                ${collaboratorNames.length ? `<div class="task-meta">Người phối hợp: ${escapeHtml(collaboratorNames.join(", "))}</div>` : ""}
                ${!assigned ? `<div class="task-meta">${escapeHtml(taskWorkMeta(task))}</div>` : ""}
                ${assigned ? `<div class="task-meta">Người giao: ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</div>` : ""}
                <span class="badge ${status === "Quá hạn" ? "bad" : status === "Hoàn thành" ? "good" : "warn"}">${escapeHtml(taskKindLabels[taskKind] || "Công việc")}: ${escapeHtml(task.category)}</span>
                <div class="task-status-grid">
                  ${assigned ? `<span><strong>Phản hồi:</strong> ${escapeHtml(responseText)}</span>` : ""}
                  <span><strong>${assigned ? "Báo cáo" : "Cập nhật"}:</strong> ${escapeHtml(reportText)}</span>
                  ${taskCompletionReviewStatus(task) ? `<span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>` : ""}
                  <span><strong>Chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))} · Thực hiện KPI ${formatScore(taskKpiActualScore(task))}</span>
                </div>
                <div class="progress" aria-label="Tiến độ ${task.progress}%"><span style="width:${clamp(task.progress, 0, 100)}%"></span></div>
                ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
                ${attachmentList}
                <div class="row-actions task-card-actions">
                  ${editable ? `<button class="ghost task-icon-button" data-edit-task="${task.id}" type="button" title="Sửa công việc" aria-label="Sửa công việc"><span aria-hidden="true">&#9998;</span></button>` : ""}
                  ${copyable ? `<button class="ghost task-icon-button" data-copy-task="${task.id}" type="button" title="Sao chép công việc" aria-label="Sao chép công việc"><span aria-hidden="true">&#9112;</span></button>` : ""}
                  ${reportable ? `<button class="ghost task-icon-button" data-respond-task="${task.id}" type="button" title="${assigned ? "Phản hồi và báo cáo tiến độ" : "Cập nhật tiến độ"}" aria-label="${assigned ? "Phản hồi và báo cáo tiến độ" : "Cập nhật tiến độ"}"><span aria-hidden="true">&#8635;</span></button>` : ""}
                  ${reviewable ? `<button class="ghost task-icon-button task-icon-approve" data-review-task="${task.id}" type="button" title="Duyệt hoàn thành" aria-label="Duyệt hoàn thành"><span aria-hidden="true">&#10003;</span></button>` : ""}
                  ${deletable ? `<button class="ghost task-icon-button task-icon-delete" data-delete-task="${task.id}" type="button" title="Xóa công việc" aria-label="Xóa công việc"><span aria-hidden="true">&times;</span></button>` : ""}
                  ${editable || copyable || deletable || reportable || reviewable ? "" : "<span class=\"muted\">Chỉ xem</span>"}
                </div>
              </article>
            `;
          })
          .join("");
        const count = tasks.filter((task) => taskMatchesStatusFilter(task, status)).length;
        return `
          <section class="task-column">
            <button class="task-column-head" data-open-task-status="${escapeHtml(status)}" type="button" aria-label="Xem tất cả công việc trạng thái ${escapeHtml(status)}">
              <span>${escapeHtml(status)}</span>
              <strong>${count}</strong>
            </button>
            ${cards || "<div class=\"empty-state\">Không có công việc.</div>"}
          </section>
        `;
      })
      .join("");
  };

  byId("taskBoard").innerHTML = `<div class="task-columns">${renderTaskColumns()}</div>`;
  scheduleVisibleViewWork("tasks", () => hydrateTaskAttachmentLinks(byId("taskBoard")));
  if (options.applyCustomization !== false) applyFieldCustomizations();
}

function renderTaskStatusDetailItem(task) {
  const collaboratorNames = taskCollaboratorNames(task);
  const status = task.computedStatus || getDueStatus(task);
  const latestReport = latestTaskProgressReport(task);
  const violations = taskViolationReasons(task);
  const attachments = task.attachments || [];
  const canOpen = canOpenTask(task);
  return `
    <article class="kpi-task-detail-item">
      <div class="section-head">
        <div>
          <span class="badge ${taskStatusBadgeClass(status)}">${escapeHtml(status)}</span>
          <h3>${escapeHtml(task.title)}</h3>
        </div>
        ${canOpen ? `<button class="ghost" data-open-status-task="${escapeHtml(task.id)}" type="button">Mở công việc</button>` : "<span class=\"muted\">Chỉ xem</span>"}
      </div>
      <div class="kpi-task-detail-meta">
        <span><strong>${isAssignedTask(task) ? "Người được giao" : "Người thực hiện"}:</strong> ${escapeHtml(taskOwnerName(task))}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Tên dự án:</strong> ${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
        ${isAssignedTask(task) ? `<span><strong>Người giao:</strong> ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</span>` : ""}
        <span><strong>Nhóm công việc:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
        <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
        ${!isAssignedTask(task) ? `<span><strong>Loại công việc:</strong> ${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)])}</span>` : ""}
        ${!isAssignedTask(task) ? `<span><strong>Định kỳ:</strong> ${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)])}</span>` : ""}
        <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
        <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
        <span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>
        <span><strong>Đánh giá chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))}</span>
        <span><strong>Điểm thực hiện KPI:</strong> ${formatScore(taskKpiActualScore(task))}</span>
        <span><strong>Cập nhật gần nhất:</strong> ${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% - ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
        <span><strong>Hồ sơ:</strong> ${attachments.length ? `${attachments.length} tệp` : "Chưa có"}</span>
      </div>
      ${task.note ? `<p class="kpi-task-detail-note"><strong>Nội dung/Báo cáo:</strong> ${escapeHtml(task.note)}</p>` : ""}
      ${latestReport?.note && latestReport.note !== task.note ? `<p class="kpi-task-detail-note"><strong>Báo cáo gần nhất:</strong> ${escapeHtml(latestReport.note)}</p>` : ""}
      ${taskProgressReportListHtml(task)}
      ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
    </article>
  `;
}

function openTaskStatusDetailDialog(status) {
  const search = byId("taskSearch").value.trim();
  const timeFilter = currentTaskTimeFilter();
  const tasks = visibleTaskRecords(search, status, timeFilter).sort(compareTaskRecords);
  const averageProgress = tasks.length ? tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length : 0;
  const nextDeadlineTask = tasks.find((task) => taskDeadlineDate(task));
  const rangeLabel = [
    timeFilter.from && `từ ${formatDate(timeFilter.from)}`,
    timeFilter.to && `đến ${formatDate(timeFilter.to)}`,
  ].filter(Boolean).join(" ");
  byId("taskStatusDetailTitle").textContent = `${status || "Tất cả trạng thái"} (${tasks.length})`;
  byId("taskStatusDetailSubtitle").textContent = [
    "Danh sách công việc",
    search && `đang lọc theo "${search}"`,
    rangeLabel && `ngày hoàn thành ${rangeLabel}`,
  ].filter(Boolean).join(" · ");
  byId("taskStatusDetailContext").innerHTML = `
    <span><strong>${tasks.length}</strong> công việc</span>
    <span><strong>${formatScore(averageProgress)}%</strong> tiến độ bình quân</span>
    <span><strong>${nextDeadlineTask ? formatTaskDeadline(nextDeadlineTask) : "Chưa có"}</strong> mốc hoàn thành gần nhất</span>
  `;
  byId("taskStatusDetailList").innerHTML = tasks.length
    ? tasks.map(renderTaskStatusDetailItem).join("")
    : `<div class="empty-state">Không có công việc thuộc trạng thái này.</div>`;
  byId("taskStatusDetailDialog").classList.remove("is-hidden");
  byId("taskStatusDetailDialog").setAttribute("aria-hidden", "false");
}

function closeTaskStatusDetailDialog() {
  byId("taskStatusDetailDialog").classList.add("is-hidden");
  byId("taskStatusDetailDialog").setAttribute("aria-hidden", "true");
}

function closeTaskCompletionReviewDialog() {
  byId("taskCompletionReviewDialog").classList.add("is-hidden");
  byId("taskCompletionReviewDialog").setAttribute("aria-hidden", "true");
  byId("taskCompletionReviewForm").reset();
  updateTaskCompletionReviewQualityField();
}

function updateTaskCompletionReviewQualityField() {
  const decision = byId("taskCompletionReviewStatus").value;
  const field = byId("taskCompletionReviewQualityField");
  const input = byId("taskCompletionReviewQualityPercent");
  const form = byId("taskCompletionReviewForm");
  const timing = byId("taskCompletionReviewTiming");
  const taskId = byId("taskCompletionReviewTaskId").value;
  const task = state.tasks.find((item) => item.id === taskId);
  const passed = decision === "passed";
  field.classList.toggle("is-hidden", !passed);
  form.classList.toggle("has-quality-input", passed);
  input.required = passed;
  input.disabled = !passed;
  if (!passed) input.value = "";

  const previewTask = task && passed
    ? { ...task, completionReviewStatus: "passed", completionReviewedAt: new Date().toISOString(), lateCompletion: false }
    : null;
  const previewStatus = previewTask ? taskCompletionTimingStatus(previewTask) : "";
  const previewLabel = previewTask ? taskCompletionTimingLabel(previewTask) : "";
  timing.classList.toggle("is-hidden", !previewLabel);
  timing.classList.toggle("is-ahead", previewStatus === "ahead");
  timing.classList.toggle("is-late", previewStatus === "late");
  timing.textContent = previewLabel ? `Kết quả Đạt sẽ được ghi nhận: ${previewLabel}` : "";
}

function openTaskCompletionReviewDialog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canReviewTaskCompletion(task)) return;
  const currentStatus = getDueStatus(task);
  byId("taskCompletionReviewTaskId").value = task.id;
  byId("taskCompletionReviewStatus").value = taskCompletionIsApproved(task) ? "passed" : "";
  byId("taskCompletionReviewQualityPercent").value = normalizeTaskQualityInput(task.qualityPercent);
  byId("taskCompletionReviewNote").value = "";
  updateTaskCompletionReviewQualityField();
  byId("taskCompletionReviewTitle").textContent = `Duyệt hoàn thành: ${task.title}`;
  byId("taskCompletionReviewSummary").textContent = `${taskOwnerName(task, "Chưa rõ người thực hiện")} · Trạng thái hiện tại: ${currentStatus} · Ngày hoàn thành: ${formatTaskDeadline(task) || "chưa cập nhật"}`;
  byId("taskCompletionReviewDialog").classList.remove("is-hidden");
  byId("taskCompletionReviewDialog").setAttribute("aria-hidden", "false");
  byId("taskCompletionReviewStatus").focus();
}

function reviewTaskCompletion(taskId, decision, note = "", qualityPercent = "") {
  const taskIndex = state.tasks.findIndex((item) => item.id === taskId);
  const task = taskIndex >= 0 ? state.tasks[taskIndex] : null;
  if (!task || !canReviewTaskCompletion(task) || !["passed", "failed"].includes(decision)) return false;

  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const previousStatus = getDueStatus(task);
  const previousWorkflowStatus = normalizeTaskStatus(task.status);
  const approved = decision === "passed";
  const assessedQuality = approved ? normalizeTaskQualityInput(qualityPercent) : "";
  if (approved && assessedQuality === "") {
    alert("Nhập Đánh giá chất lượng trước khi lưu kết quả Đạt.");
    return false;
  }
  const wasApproved = taskCompletionIsApproved(task);
  const completionReviewedAt = approved && wasApproved && task.completionReviewedAt ? task.completionReviewedAt : timestamp;
  const returnedStatus = previousStatus === "Quá hạn" || taskIsPastDeadline(task) ? "Quá hạn" : "Đang thực hiện";
  const completedAtForReview = task.completedAt || timestamp;
  const lateCompletion = approved
    ? task?.due
      ? !isTimestampBeforeDeadline(completedAtForReview, task)
      : false
    : false;
  const nextTask = {
    ...task,
    status: approved ? TASK_STATUS_COMPLETED : returnedStatus,
    completionReviewStatus: decision,
    completionReviewedAt,
    completionReviewedById: actor.id,
    completionReviewedByName: actor.name,
    completionReviewNote: String(note || "").trim(),
    lateCompletion,
    qualityPercent: assessedQuality,
    qualityAssessedAt: approved ? timestamp : "",
    qualityAssessedById: approved ? actor.id : "",
    qualityAssessedByName: approved ? actor.name : "",
  };
  if (approved) {
    nextTask.completedAt = completedAtForReview;
    nextTask.completedById = task.completedById || task.ownerId || "";
    nextTask.completedByName = task.completedByName || personById(task.ownerId)?.name || "";
  } else {
    nextTask.completedAt = "";
    nextTask.completedById = "";
    nextTask.completedByName = "";
  }
  const nextStatus = getDueStatus(nextTask);
  const completionTimingStatus = approved ? taskCompletionTimingStatus(nextTask) : "";
  const completionTimingLabel = approved ? taskCompletionTimingLabel(nextTask) : "";
  nextTask.progressReports = [
    ...(task.progressReports || []),
    {
      id: uid("task-report"),
      type: "completion-review",
      decision,
      action: approved
        ? `${wasApproved ? "Cập nhật đánh giá chất lượng" : "Đánh giá hoàn thành: Đạt"}${completionTimingLabel ? ` · ${completionTimingLabel}` : ""} · Chất lượng: ${formatScore(assessedQuality)}%`
        : `Đánh giá hoàn thành: Không đạt · Chuyển về ${returnedStatus}`,
      previousStatus: previousWorkflowStatus,
      status: normalizeTaskStatus(nextTask.status),
      progress: Number(nextTask.progress || 0),
      qualityPercent: assessedQuality,
      completionTiming: completionTimingStatus,
      note: String(note || "").trim(),
      createdAt: timestamp,
      createdById: actor.id,
      createdBy: actor.name,
    },
  ];
  const auditedTask = applyRecordAudit(nextTask, task);
  state.tasks = state.tasks.map((item, index) => (index === taskIndex ? auditedTask : item));
  syncPersonalEvaluationTaskScoresForTask(auditedTask, task);
  const owner = personById(auditedTask.ownerId);
  logActivity({
    action: approved
      ? wasApproved
        ? "Cập nhật đánh giá chất lượng"
        : `Đánh giá công việc Đạt${completionTimingLabel ? ` · ${completionTimingLabel}` : ""}`
      : `Đánh giá công việc Không đạt · Chuyển về ${returnedStatus}`,
    module: "Công việc",
    targetType: "task",
    targetId: auditedTask.id,
    personId: auditedTask.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(auditedTask),
    detail: `${auditedTask.title} · ${previousWorkflowStatus} -> ${normalizeTaskStatus(auditedTask.status)}${approved && completionTimingLabel ? ` · ${completionTimingLabel}` : ""}${approved ? ` · chất lượng ${formatScore(assessedQuality)}%` : ""}${note ? ` · ${String(note).trim()}` : ""}`,
  });
  saveState();
  renderAll();
  return true;
}

function restoreTaskDetailInlineEditor({ reset = false } = {}) {
  if (!taskDetailInlineEditor) return;
  const { form, anchor, kind } = taskDetailInlineEditor;
  if (anchor?.parentNode) {
    anchor.parentNode.insertBefore(form, anchor.nextSibling);
    anchor.remove();
  }
  form.classList.remove("task-detail-inline-form");
  taskDetailInlineEditor = null;
  if (reset) {
    if (kind === TASK_KIND_ASSIGNED) resetAssignmentTaskForm();
    else resetTaskForm();
  }
}

function taskDetailActionMarkup(task) {
  const actions = [];
  const assigned = isAssignedTask(task);
  const editable = canEditTaskDetails(task);
  const copyable = canCopyTask(task);
  const reportable = canUpdateTaskProgress(task);
  const reviewable = canReviewTaskCompletion(task);
  const endable = canEndTaskAssignment(task);
  const deletable = canDeleteTask(task);
  if (editable) actions.push('<button class="ghost task-icon-button" type="button" data-task-detail-action="edit" title="Sửa công việc" aria-label="Sửa công việc"><span aria-hidden="true">&#9998;</span></button>');
  if (copyable) actions.push('<button class="ghost task-icon-button" type="button" data-task-detail-action="copy" title="Sao chép công việc" aria-label="Sao chép công việc"><span aria-hidden="true">&#9112;</span></button>');
  if (reportable) actions.push(`<button class="ghost task-icon-button" type="button" data-task-detail-action="report" title="${assigned && canReportTask(task) ? "Phản hồi và báo cáo tiến độ" : "Cập nhật tiến độ"}" aria-label="${assigned && canReportTask(task) ? "Phản hồi và báo cáo tiến độ" : "Cập nhật tiến độ"}"><span aria-hidden="true">&#8635;</span></button>`);
  if (reviewable) actions.push('<button class="ghost task-icon-button task-icon-approve" type="button" data-task-detail-action="review" title="Duyệt hoàn thành" aria-label="Duyệt hoàn thành"><span aria-hidden="true">&#10003;</span></button>');
  if (endable) actions.push('<button class="ghost task-icon-button" type="button" data-task-detail-action="end" title="Kết thúc công việc" aria-label="Kết thúc công việc"><span aria-hidden="true">&#9632;</span></button>');
  if (deletable) actions.push('<button class="ghost task-icon-button task-icon-delete" type="button" data-task-detail-action="delete" title="Xóa công việc" aria-label="Xóa công việc"><span aria-hidden="true">&times;</span></button>');
  return actions.length ? actions.join("") : '<span class="muted">Chỉ xem chi tiết công việc.</span>';
}

function openTaskDetailInlineEditor(taskId, focusId = "") {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const assigned = isAssignedTask(task);
  const form = byId(assigned ? "assignmentTaskForm" : "taskForm");
  if (!form) return;
  restoreTaskDetailInlineEditor({ reset: true });
  const anchor = document.createElement("span");
  anchor.className = "task-detail-form-anchor";
  form.parentNode.insertBefore(anchor, form);
  taskDetailInlineEditor = {
    taskId: task.id,
    kind: assigned ? TASK_KIND_ASSIGNED : TASK_KIND_REGULAR,
    form,
    anchor,
  };

  byId("taskDetailSubtitle").textContent = "Chỉnh sửa trực tiếp";
  byId("taskDetailTitle").textContent = task.title || "Công việc";
  byId("taskDetailMeta").classList.add("is-hidden");
  byId("taskDetailActions").innerHTML = '<button class="ghost" type="button" data-task-detail-action="cancel-edit">Hủy chỉnh sửa</button>';
  byId("taskDetailContent").innerHTML = `
    <section class="task-detail-editor">
      <h3>${assigned ? "Cập nhật công việc được giao" : "Cập nhật công việc"}</h3>
      <div id="taskDetailEditorSlot"></div>
    </section>
  `;
  byId("taskDetailEditorSlot").append(form);
  form.classList.add("task-detail-inline-form");
  if (assigned) populateAssignmentTaskForm(task);
  else populateTaskForm(task);

  const target = byId(focusId) || byId(assigned ? "assignmentTaskTitle" : "taskTitle");
  if (target && !target.disabled) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  }
}

function deleteTaskRecord(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canDeleteTask(task)) return false;
  if (!confirm("Xóa vĩnh viễn công việc này? Dữ liệu công việc sẽ bị loại khỏi danh mục và đồng bộ xóa trên các thiết bị khác.")) return false;
  registerDeletedId(taskId);
  const owner = personById(task.ownerId);
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  syncPersonalEvaluationTaskScoresForTask(null, task);
  logActivity({
    action: "Xóa",
    module: "Công việc",
    targetType: "task",
    targetId: taskId,
    personId: task.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(task),
    title: task.title,
    details: `${taskOwnerName(task, "Chưa rõ người nhận")} · ${normalizeTaskStatus(task.status)}`,
    score: `${formatScore(task.progress)}%`,
  });
  saveState();
  renderAll();
  return true;
}

function openTaskDetailDialog(taskId) {
  restoreTaskDetailInlineEditor({ reset: true });
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canViewTaskRecord(task)) return;
  const collaborators = taskCollaboratorNames(task);
  const status = task.computedStatus || getDueStatus(task);
  const assigned = isAssignedTask(task);
  const latestReport = latestTaskProgressReport(task);
  const attachments = task.attachments || [];
  const violations = taskViolationReasons(task);
  const attachmentList = attachments.length
    ? `<div class="task-detail-attachments">${attachments
        .map((file) => taskAttachmentLinkHtml(file))
        .join("")}</div>`
    : `<p class="muted">Chưa có hồ sơ liên quan.</p>`;

  byId("taskDetailSubtitle").textContent = taskKindLabels[normalizeTaskKind(task)] || "Công việc";
  byId("taskDetailTitle").textContent = task.title || "Công việc";
  byId("taskDetailActions").innerHTML = taskDetailActionMarkup(task);
  byId("taskDetailMeta").classList.remove("is-hidden");
  byId("taskDetailMeta").innerHTML = `
    <span><strong>Trạng thái</strong><b class="badge ${taskStatusBadgeClass(status)}">${escapeHtml(status)}</b></span>
    <span><strong>Tiến độ</strong><b>${formatScore(task.progress)}%</b></span>
    <span><strong>Chất lượng</strong><b>${escapeHtml(taskQualityLabel(task))}</b></span>
    <span><strong>Điểm thực hiện KPI</strong><b>${formatScore(taskKpiActualScore(task))}</b></span>
  `;
  byId("taskDetailContent").innerHTML = `
    <section class="task-detail-section task-detail-information">
      <h3>Thông tin công việc</h3>
      <div class="task-detail-info-grid">
        <span><strong>${assigned ? "Người được giao" : "Người thực hiện"}</strong>${escapeHtml(taskOwnerName(task, "Chưa cập nhật"))}</span>
        <span><strong>Người phối hợp</strong>${escapeHtml(collaborators.length ? collaborators.join(", ") : "Chưa chọn")}</span>
        ${assigned ? `<span><strong>Người giao</strong>${escapeHtml(task.assignedByName || task.createdBy || "Chưa cập nhật")}</span>` : ""}
        <span><strong>Tên dự án</strong>${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
        <span><strong>Danh mục KPI cá nhân</strong>${escapeHtml(task.category || "Chưa phân loại")}</span>
        ${!assigned ? `<span><strong>Loại công việc</strong>${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)] || "Chưa cập nhật")}</span>` : ""}
        ${!assigned ? `<span><strong>Định kỳ</strong>${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)] || "Không định kỳ")}</span>` : ""}
        <span><strong>Ngày tạo</strong>${escapeHtml(formatDateTime(task.createdAt) || "Chưa ghi nhận")}</span>
        <span><strong>Người tạo</strong>${escapeHtml(task.createdBy || "Chưa ghi nhận")}</span>
        <span><strong>Ngày bắt đầu</strong>${escapeHtml(formatTaskStartDate(task) || "Chưa cập nhật")}</span>
        <span><strong>Ngày hoàn thành</strong>${escapeHtml(formatTaskDeadline(task) || "Chưa cập nhật")}</span>
        <span><strong>Đánh giá hoàn thành</strong>${taskCompletionReviewValueHtml(task)}</span>
        <span><strong>Cập nhật gần nhất</strong>${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% · ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
      </div>
    </section>
    <section class="task-detail-section">
      <h3>${assigned ? "Nội dung giao việc" : "Nội dung công việc"}</h3>
      <p class="task-detail-note">${escapeHtml(task.note || "Chưa cập nhật.")}</p>
    </section>
    ${assigned ? `
      <section class="task-detail-section">
        <h3>Phản hồi nhận việc</h3>
        <div class="task-detail-info-grid">
          <span><strong>Trạng thái phản hồi</strong>${escapeHtml(task.responseStatus || "Chưa phản hồi")}</span>
          <span><strong>Thời điểm phản hồi</strong>${escapeHtml(formatDateTime(task.responseAt) || "Chưa cập nhật")}</span>
        </div>
        <p class="task-detail-note">${escapeHtml(task.responseNote || "Chưa có nội dung phản hồi.")}</p>
      </section>
    ` : ""}
    <section class="task-detail-section">
      <h3>Lịch sử báo cáo tiến độ</h3>
      ${taskProgressReportListHtml(task) || `<p class="muted">Chưa có báo cáo tiến độ.</p>`}
    </section>
    <section class="task-detail-section">
      <h3>Hồ sơ liên quan</h3>
      ${attachmentList}
    </section>
    ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
  `;
  byId("taskDetailDialog").dataset.taskId = task.id;
  byId("taskDetailDialog").classList.remove("is-hidden");
  byId("taskDetailDialog").setAttribute("aria-hidden", "false");
  hydrateTaskAttachmentLinks(byId("taskDetailDialog"));
}

function closeTaskDetailDialog() {
  restoreTaskDetailInlineEditor({ reset: true });
  byId("taskDetailDialog").classList.add("is-hidden");
  byId("taskDetailDialog").setAttribute("aria-hidden", "true");
  delete byId("taskDetailDialog").dataset.taskId;
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${formatScore(size / (1024 * 1024))} MB`;
  if (size >= 1024) return `${formatScore(size / 1024)} KB`;
  return `${size} B`;
}

function renderTaskAttachmentDraft() {
  const list = byId("taskAttachmentList");
  if (!taskAttachmentDraft.length) {
    list.innerHTML = '<span class="muted">Chưa có hồ sơ đính kèm.</span>';
    return;
  }
  list.innerHTML = taskAttachmentDraft
    .map(
      (file) => `
        <div class="attachment-item">
          ${taskAttachmentLinkHtml(file)}
          <span class="muted">${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-task-attachment="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
  hydrateTaskAttachmentLinks(list);
}

function renderAssignmentTaskAttachmentDraft() {
  const list = byId("assignmentTaskAttachmentList");
  if (!assignmentAttachmentDraft.length) {
    list.innerHTML = '<span class="muted">Chưa có hồ sơ đính kèm.</span>';
    return;
  }
  list.innerHTML = assignmentAttachmentDraft
    .map(
      (file) => `
        <div class="attachment-item">
          ${taskAttachmentLinkHtml(file)}
          <span class="muted">${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-assignment-attachment="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
  hydrateTaskAttachmentLinks(list);
}

function renderCriteriaInputs(existing = {}) {
  const person = personById(byId("evalPerson").value);
  const role = person ? roleById(person.roleId) : null;
  const period = byId("evalPeriod").value || state.activePeriod;
  const automaticBehaviorLinks = person ? automaticTaskBehaviorForPerson(person.id, period).links : [];
  const calculated = person ? personalCriteriaScoresFromTasks(person.id, period) : null;
  byId("criteriaInputs").innerHTML = role
    ? role.criteria
        .map((criterion, index) => {
          const criterionScore = calculated?.criteriaScores?.[index] || { plan: 0, actual: 0 };
          const calculationSource = calculated?.criterionScopes?.[index]?.label
            || "Tự động tổng hợp từ công việc cá nhân theo danh mục KPI trong kỳ đánh giá.";
          const plan = criterionScore.plan;
          const actual = criterionScore.actual;
          const result = calculateCriterionResult(plan, actual, criterion[1]);
          const violationCount = taskBehaviorViolationCount(automaticBehaviorLinks, criterion[0]);
          return `
            <article class="criteria-item">
              <div class="criteria-top">
                <span class="criteria-actions">
                  <span class="badge">Trọng số ${criterion[1]}</span>
                  ${violationCount ? `<button class="ghost criteria-detail-button criteria-violation-button" data-kpi-behavior-criterion="${escapeHtml(criterion[0])}" type="button" title="Xem lỗi tự động từ công việc liên quan">${violationCount} lỗi</button>` : ""}
                  <button class="ghost criteria-detail-button" data-kpi-detail="personal" data-kpi-criterion="${escapeHtml(criterion[0])}" type="button">Chi tiết</button>
                </span>
                <strong class="criteria-title">${escapeHtml(criterion[0])}</strong>
              </div>
              <div class="criteria-input-grid">
                <label>Kế hoạch
                  <input id="criterion-plan-${index}" class="auto-plan-input" type="number" min="0" step="1" value="${escapeHtml(plan)}" readonly aria-readonly="true" title="${escapeHtml(calculationSource)}">
                </label>
                <label>Thực hiện
                  <input id="criterion-actual-${index}" class="auto-actual-input" type="number" min="0" step="0.01" value="${escapeHtml(formatScore(actual))}" readonly aria-readonly="true" title="${escapeHtml(calculationSource)}">
                </label>
              </div>
              <div class="criteria-calculated">
                <span>Hoàn thành <strong id="criterion-percent-${index}">${formatScore(result.completionPercent)}</strong>%</span>
                <span>Điểm <strong id="criterion-points-${index}">${formatScore(result.points)}</strong></span>
              </div>
            </article>
          `;
        })
        .join("")
    : "";
  document.querySelectorAll("[data-score-input]").forEach((input) => input.addEventListener("input", updateScorePreview));
  updateScorePreview();
}

function behaviorManualValues(existing = {}) {
  if (existing?.behaviorManual && typeof existing.behaviorManual === "object") return existing.behaviorManual;
  if (existing?.behavior && typeof existing.behavior === "object") return existing.behavior;
  return existing || {};
}

function renderTaskBehaviorLinks(links = []) {
  const container = byId("taskBehaviorLinks");
  if (!container) return;
  container.classList.add("is-hidden");
  container.innerHTML = "";
}

function renderBehaviorInputs(existing = {}) {
  const manualValues = behaviorManualValues(existing);
  const automatic = automaticTaskBehaviorForPerson(byId("evalPerson").value, byId("evalPeriod").value || state.activePeriod);
  const automaticIndexes = automaticTaskBehaviorRuleIndexes();
  renderTaskBehaviorLinks(automatic.links);
  byId("behaviorInputs").innerHTML = behaviorRules
    .map(
      (rule, index) => {
        const automaticCount = automatic.counts[index] || 0;
        const isAutomatic = automaticIndexes.has(index);
        const manualValue = hasOwnValue(manualValues, index) ? manualValues[index] : "";
        const value = isAutomatic ? automaticCount : manualValue;
        const inputAttributes = isAutomatic
          ? 'readonly aria-readonly="true" title="Hệ thống tự tổng hợp từ công việc trong kỳ đánh giá."'
          : 'data-score-input placeholder="Nhập số lượng"';
        return `
        <article class="behavior-item">
          <div class="behavior-top">
            <span class="behavior-actions">
              <span class="badge ${rule[1] > 0 ? "good" : "bad"}">${rule[1] > 0 ? "+" : ""}${rule[1]}/lần</span>
              <button class="ghost criteria-detail-button" data-task-behavior-rule="${index}" type="button">Chi tiết</button>
            </span>
            <strong class="behavior-title">${rule[0]}</strong>
          </div>
          <div class="behavior-count-field">
            <input id="behavior-${index}" type="number" min="0" value="${escapeHtml(value)}" ${inputAttributes} aria-label="Số lượng áp dụng cho ${escapeHtml(rule[0])}">
          </div>
          ${isAutomatic ? `<span class="field-note">Hệ thống tự ghi nhận từ công việc: ${automaticCount} lần</span>` : ""}
        </article>
      `;
      },
    )
    .join("");
  document.querySelectorAll("[data-score-input]").forEach((input) => input.addEventListener("input", updateScorePreview));
  updateScorePreview();
}

function renderDepartmentCriteriaInputs(existing = {}) {
  const department = departmentById(byId("deptEvalDepartment").value);
  const period = byId("deptEvalPeriod").value || state.activePeriod;
  const calculated = department ? departmentCriteriaScoresFromTasks(department.id, period) : null;
  byId("departmentCriteriaInputs").innerHTML = department
    ? department.criteria
        .map((criterion, index) => {
          const values = calculated?.criteriaScores?.[index] || criterionInputValues(existing, index);
          const result = calculateCriterionResult(values.plan, values.actual, criterion[1]);
          return `
            <article class="criteria-item department-criteria-item">
              <div class="criteria-top">
                <span class="criteria-actions">
                  <span class="badge">Trọng số ${criterion[1]}</span>
                  <button class="ghost criteria-detail-button" data-kpi-detail="department" data-kpi-criterion="${escapeHtml(criterion[0])}" type="button">Chi tiết</button>
                </span>
                <strong class="criteria-title">${escapeHtml(criterion[0])}</strong>
              </div>
              <div class="criteria-input-grid">
                <label>Kế hoạch
                  <input id="dept-criterion-plan-${index}" class="auto-plan-input" type="number" min="0" step="1" value="${escapeHtml(values.plan)}" readonly aria-readonly="true" title="Tự động tổng hợp toàn bộ công việc của phòng trong kỳ đánh giá.">
                </label>
                <label>Thực hiện
                  <input id="dept-criterion-actual-${index}" class="auto-actual-input" type="number" min="0" step="1" value="${escapeHtml(values.actual)}" readonly aria-readonly="true" title="Tự động tổng hợp các công việc Hoàn thành đã được đánh giá Đạt trong kỳ đánh giá.">
                </label>
              </div>
              <div class="criteria-calculated">
                <span>Hoàn thành <strong id="dept-criterion-percent-${index}">${formatScore(result.completionPercent)}</strong>%</span>
                <span>Điểm <strong id="dept-criterion-points-${index}">${formatScore(result.points)}</strong></span>
              </div>
            </article>
          `;
        })
        .join("")
    : "";
  updateDepartmentScorePreview();
}

function kpiCriterionKeywords(text) {
  const stopWords = new Set([
    "cac",
    "cho",
    "cong",
    "cua",
    "du",
    "duoc",
    "han",
    "hoan",
    "kpi",
    "la",
    "le",
    "muc",
    "nhan",
    "phong",
    "so",
    "theo",
    "thuc",
    "tieu",
    "trong",
    "ty",
    "va",
    "viec",
    "voi",
  ]);
  return normalizeSearchText(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function kpiTaskSearchText(task) {
  const reports = (task?.progressReports || []).map((report) => report.note).join(" ");
  return normalizeSearchText([task?.category, task?.title, task?.note, task?.responseNote, reports].filter(Boolean).join(" "));
}

function kpiCriterionKey(value) {
  return normalizeSearchText(String(value || "")).replace(/\s+/g, " ").trim();
}

function taskMatchesKpiCriterion(task, criterionName) {
  const criterion = normalizeSearchText(criterionName);
  if (!criterion) return false;
  const category = normalizeSearchText(task?.category || "");
  if (category && (category === criterion || category.includes(criterion) || criterion.includes(category))) return true;
  const haystack = kpiTaskSearchText(task);
  if (haystack.includes(criterion)) return true;
  const keywords = kpiCriterionKeywords(criterionName);
  if (!keywords.length) return false;
  const hits = keywords.filter((keyword) => haystack.includes(keyword)).length;
  return hits >= Math.min(2, keywords.length);
}

function taskBelongsToPersonForKpi(task, personId) {
  return !!task && !!personId && taskParticipantIds(task).includes(personId);
}

function taskCountsForPersonalCriterion(task, personId, criterionName) {
  const assignedCriterion = personalCriterionForTask(task, personId);
  const assignedKey = kpiCriterionKey(assignedCriterion);
  const criterionKey = kpiCriterionKey(criterionName);
  return Boolean(assignedKey && criterionKey && assignedKey === criterionKey);
}

function plannedTaskCountForPersonalCriterion(personId, period, criterionName, preparedTasks = null) {
  if (!personId || !period || !criterionName) return 0;
  const tasks = Array.isArray(preparedTasks)
    ? preparedTasks
    : state.tasks.filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period);
  return tasks
    .filter((task) => taskCountsForPersonalCriterion(task, personId, criterionName))
    .length;
}

function actualTaskScoreForPersonalCriterion(personId, period, criterionName, preparedTasks = null) {
  if (!personId || !period || !criterionName) return 0;
  const tasks = Array.isArray(preparedTasks)
    ? preparedTasks
    : state.tasks.filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period);
  return tasks
    .filter((task) => taskCountsForPersonalCriterion(task, personId, criterionName))
    .reduce((sum, task) => sum + taskKpiActualScore(task), 0);
}

function uniqueTaskRecords(...collections) {
  const seen = new Set();
  return collections
    .flat()
    .filter((task) => {
      const id = String(task?.id || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function approvedCompletedTaskCount(tasks) {
  return (tasks || []).filter(
    (task) => normalizeTaskStatus(task?.status) === TASK_STATUS_COMPLETED && taskCompletionIsApproved(task),
  ).length;
}

function approvedTaskKpiActualScore(tasks) {
  return (tasks || []).reduce((sum, task) => sum + taskKpiActualScore(task), 0);
}

function sectionHeadKpiScopes(personId, period, preparedTasks = null) {
  const person = personById(personId);
  const teamMembers = isSectionHeadPerson(person) ? managedTeamMembers(personId) : [];
  const teamMemberIds = teamMembers.map((member) => member.id);
  const sourceTasks = Array.isArray(preparedTasks) ? preparedTasks : state.tasks;
  const periodTasks = sourceTasks.filter((task) => taskPeriod(task) === period);
  return {
    teamMembers,
    teamMemberIds,
    ownTasks: periodTasks.filter((task) => taskBelongsToPersonForKpi(task, personId)),
    teamTasks: periodTasks.filter((task) => teamMemberIds.some((memberId) => taskBelongsToPersonForKpi(task, memberId))),
  };
}

function sectionHeadCriterionScope(sectionHeadScopes, criterionName) {
  const criterionKey = kpiCriterionKey(criterionName);
  if (criterionKey === kpiCriterionKey(SECTION_HEAD_PERSONAL_CRITERION)) {
    return {
      type: "own",
      tasks: sectionHeadScopes.ownTasks,
      label: "Tự động tổng hợp các công việc có Trưởng bộ phận/Trưởng nhóm tham gia trong kỳ đánh giá.",
      emptyText: "Chưa có công việc của Trưởng bộ phận/Trưởng nhóm trong kỳ đã chọn.",
    };
  }
  if (criterionKey === kpiCriterionKey(SECTION_HEAD_TEAM_CRITERION)) {
    const teamNames = sectionHeadScopes.teamMembers.map((member) => member.name).filter(Boolean);
    return {
      type: "team",
      tasks: sectionHeadScopes.teamTasks,
      teamMembers: sectionHeadScopes.teamMembers,
      label: teamNames.length
        ? `Tự động tổng hợp các công việc của ${teamNames.length} nhân sự trong nhóm quản lý: ${teamNames.join(", ")}.`
        : "Chưa phân nhóm nhân sự quản lý nên chưa có công việc để tổng hợp.",
      emptyText: "Chưa có công việc của nhóm nhân sự quản lý trong kỳ đã chọn.",
    };
  }
  return null;
}

function personalKpiTaskScope(personId, period, preparedTasks = null) {
  const person = personById(personId);
  const sourceTasks = Array.isArray(preparedTasks) ? preparedTasks : state.tasks;
  const tasks = sourceTasks.filter((task) => {
    if (taskPeriod(task) !== period) return false;
    return taskBelongsToPersonForKpi(task, personId);
  });
  return { tasks, groupManaged: false, teamMembers: [], teamMemberIds: [], person };
}

function departmentTasksForKpi(departmentId, period, preparedTasks = null) {
  if (!departmentId || !period) return [];
  const tasks = Array.isArray(preparedTasks) ? preparedTasks : state.tasks;
  return tasks.filter(
    (task) => taskHasParticipantInDepartment(task, departmentId) && taskPeriod(task) === period,
  );
}

function departmentCriteriaScoresFromTasks(departmentId, period, preparedTasks = null) {
  const tasks = Array.isArray(preparedTasks) ? preparedTasks : departmentTasksForKpi(departmentId, period);
  const plan = tasks.length;
  const actual = tasks.filter(
    (task) => normalizeTaskStatus(task.status) === TASK_STATUS_COMPLETED && taskCompletionIsApproved(task),
  ).length;
  const result = calculateCriterionResult(plan, actual, departmentCompletionCriterion[1]);
  return {
    tasks,
    criteriaScores: {
      0: {
        plan,
        actual,
        completionPercent: result.completionPercent,
        points: result.points,
      },
    },
    criteriaResults: [result],
    criteriaScore: clamp(result.points, 0, 120),
  };
}

function departmentEvaluationSnapshot(departmentId, period = state.activePeriod, context = null) {
  if (!departmentId || !period || isKpiExemptDepartment(departmentId)) return undefined;
  const existing = context?.departmentRecordsById?.has(departmentId)
    ? context.departmentRecordsById.get(departmentId)
    : latestDepartmentEvaluation(departmentId, period);
  const calculated = context?.departmentCalculatedById?.get(departmentId)
    || departmentCriteriaScoresFromTasks(departmentId, period, context?.tasksByDepartmentId?.get(departmentId));
  if (!existing && !calculated.tasks.length) return undefined;
  const adjustmentType = normalizeDepartmentAdjustmentType(existing?.adjustmentType);
  const adjustmentPoints = Math.max(0, Number(existing?.adjustmentPoints || 0));
  const adjustmentScore = departmentAdjustmentSignedScore(adjustmentType, adjustmentPoints);
  const finalScore = calculateDepartmentFinalScore(calculated.criteriaScore, adjustmentScore);
  return {
    ...(existing || {}),
    id: existing?.id || `auto-department-evaluation:${departmentId}:${period}`,
    period,
    departmentId,
    criteriaScores: calculated.criteriaScores,
    criteriaResults: calculated.criteriaResults,
    criteriaScore: calculated.criteriaScore,
    adjustmentType,
    adjustmentPoints,
    adjustmentScore,
    rewardDisciplineNote: existing?.rewardDisciplineNote || "",
    finalScore,
    grade: gradeDepartment(finalScore),
    autoCalculated: !existing,
  };
}

function personalEvaluationSnapshot(personId, period = state.activePeriod, context = null) {
  const person = personById(personId);
  if (!isKpiEligiblePerson(person) || !period) return undefined;
  const existing = context?.personalRecordsById?.has(personId)
    ? context.personalRecordsById.get(personId)
    : latestEvaluation(personId, period);
  const preparedTasks = context
    ? isSectionHeadPerson(person)
      ? uniqueTaskRecords(
        context.tasksByPersonId.get(personId) || [],
        context.tasksBySectionHeadId.get(personId) || [],
      )
      : context.tasksByPersonId.get(personId) || []
    : null;
  const calculated = personalCriteriaScoresFromTasks(personId, period, preparedTasks);
  const hasTasks = Object.values(calculated.criteriaScores).some((score) => Number(score?.plan || 0) > 0);
  if (!existing && !hasTasks) return undefined;
  const taskBehavior = calculatedTaskBehaviorForPerson(
    personId,
    period,
    existing || {},
    context ? context.behaviorTasksByPersonId.get(personId) || [] : null,
  );
  const departmentEvaluation = context?.departmentEvaluationsById?.has(person.departmentId)
    ? context.departmentEvaluationsById.get(person.departmentId)
    : departmentEvaluationSnapshot(person.departmentId, period);
  const departmentScore = Number(departmentEvaluation?.finalScore || 0);
  const finalScore = calculatePersonalFinalScore(calculated.personalScore, departmentScore, taskBehavior.behaviorScore);
  return {
    ...(existing || {}),
    id: existing?.id || `auto-personal-evaluation:${personId}:${period}`,
    period,
    personId,
    criteriaScores: calculated.criteriaScores,
    criteriaResults: calculated.criteriaResults,
    personalScore: calculated.personalScore,
    departmentScore,
    ...taskBehavior,
    finalScore,
    grade: gradePersonal(finalScore),
    autoCalculated: !existing,
  };
}

function personalEvaluationsForDashboard(period = state.activePeriod, context = null) {
  return state.people
    .filter(isKpiEligiblePerson)
    .map((person) => personalEvaluationSnapshot(person.id, period, context))
    .filter(Boolean);
}

function buildDashboardKpiContext(period = state.activePeriod) {
  const tasksByPersonId = new Map();
  const tasksBySectionHeadId = new Map();
  const behaviorTasksByPersonId = new Map();
  const tasksByDepartmentId = new Map();
  const addTask = (map, key, task) => {
    if (!key) return;
    const items = map.get(key) || [];
    items.push(task);
    map.set(key, items);
  };

  state.tasks
    .filter((task) => taskPeriod(task) === period)
    .forEach((task) => {
      const participantIds = taskParticipantIds(task);
      const departmentIds = new Set();
      const sectionHeadIds = new Set();
      participantIds.forEach((personId) => {
        addTask(tasksByPersonId, personId, task);
        addTask(behaviorTasksByPersonId, personId, task);
        const participant = personById(personId);
        const departmentId = participant?.departmentId;
        if (departmentId) departmentIds.add(departmentId);
        const sectionHead = sectionHeadForPerson(participant);
        if (sectionHead) sectionHeadIds.add(sectionHead.id);
      });
      sectionHeadIds.forEach((sectionHeadId) => addTask(tasksBySectionHeadId, sectionHeadId, task));
      departmentIds.forEach((departmentId) => addTask(tasksByDepartmentId, departmentId, task));
    });

  const personalRecordsById = new Map(
    evaluationsForPeriod(period).map((evaluation) => [String(evaluation.personId), evaluation]),
  );
  const departmentRecordsById = new Map(
    departmentEvaluationsForPeriod(period).map((evaluation) => [String(evaluation.departmentId), evaluation]),
  );
  const context = {
    tasksByPersonId,
    tasksBySectionHeadId,
    behaviorTasksByPersonId,
    tasksByDepartmentId,
    personalRecordsById,
    departmentRecordsById,
    departmentCalculatedById: new Map(),
    departmentEvaluationsById: new Map(),
  };
  kpiEligibleDepartments().forEach((department) => {
    const calculated = departmentCriteriaScoresFromTasks(
      department.id,
      period,
      tasksByDepartmentId.get(department.id) || [],
    );
    context.departmentCalculatedById.set(department.id, calculated);
    context.departmentEvaluationsById.set(
      department.id,
      departmentEvaluationSnapshot(department.id, period, context),
    );
  });
  return context;
}

function personalCriteriaScoresFromTasks(personId, period, preparedTasks = null) {
  const person = personById(personId);
  const role = person ? roleById(person.roleId) : null;
  const criteriaScores = {};
  const criteriaResults = [];
  const criterionScopes = {};
  let personalScore = 0;
  if (!role) return { criteriaScores, criteriaResults, criterionScopes, personalScore, groupManaged: false, teamMembers: [], tasks: [] };
  const taskScope = personalKpiTaskScope(personId, period, preparedTasks);
  const sectionHeadScopes = isSectionHeadPerson(person)
    ? sectionHeadKpiScopes(personId, period, preparedTasks)
    : null;
  role.criteria.forEach((criterion, index) => {
    const sectionHeadScope = sectionHeadScopes ? sectionHeadCriterionScope(sectionHeadScopes, criterion[0]) : null;
    const plan = sectionHeadScope
      ? sectionHeadScope.tasks.length
      : plannedTaskCountForPersonalCriterion(person.id, period, criterion[0], taskScope.tasks);
    const actual = sectionHeadScope
      ? approvedTaskKpiActualScore(sectionHeadScope.tasks)
      : actualTaskScoreForPersonalCriterion(person.id, period, criterion[0], taskScope.tasks);
    const result = calculateCriterionResult(plan, actual, criterion[1]);
    criteriaScores[index] = {
      plan,
      actual,
      completionPercent: result.completionPercent,
      points: result.points,
    };
    criteriaResults[index] = result;
    if (sectionHeadScope) criterionScopes[index] = sectionHeadScope;
    personalScore += result.points;
  });
  return {
    ...taskScope,
    criteriaScores,
    criteriaResults,
    criterionScopes,
    personalScore,
    groupManaged: Boolean(sectionHeadScopes?.teamMembers.length),
    teamMembers: sectionHeadScopes?.teamMembers || [],
  };
}

function syncPersonalEvaluationTaskScores(personId, period) {
  if (!personId || !period) return;
  const index = state.evaluations.findIndex((item) => item.personId === personId && item.period === period);
  if (index < 0) return;
  const evaluation = state.evaluations[index];
  const recalculated = personalCriteriaScoresFromTasks(personId, period);
  const taskBehavior = calculatedTaskBehaviorForPerson(personId, period, evaluation);
  const nextEvaluation = {
    ...evaluation,
    criteriaScores: recalculated.criteriaScores,
    personalScore: recalculated.personalScore,
    ...taskBehavior,
  };
  nextEvaluation.finalScore = calculatePersonalFinalScore(
    nextEvaluation.personalScore,
    Number(nextEvaluation.departmentScore || 0),
    taskBehavior.behaviorScore,
  );
  nextEvaluation.grade = gradePersonal(nextEvaluation.finalScore);
  state.evaluations = state.evaluations.map((item, itemIndex) => (itemIndex === index ? nextEvaluation : item));
}

function recalculateSavedPersonalEvaluationScores() {
  const tasksByPersonPeriod = new Map();
  const tasksBySectionHeadPeriod = new Map();
  const addTask = (map, personId, period, task) => {
    if (!personId || !period) return;
    const key = `${personId}|${period}`;
    const tasks = map.get(key) || [];
    tasks.push(task);
    map.set(key, tasks);
  };
  state.tasks.forEach((task) => {
    const period = taskPeriod(task);
    const sectionHeadIds = new Set();
    taskParticipantIds(task).forEach((personId) => {
      addTask(tasksByPersonPeriod, personId, period, task);
      const sectionHead = sectionHeadForPerson(personById(personId));
      if (sectionHead) sectionHeadIds.add(sectionHead.id);
    });
    sectionHeadIds.forEach((sectionHeadId) => addTask(tasksBySectionHeadPeriod, sectionHeadId, period, task));
  });

  let changed = false;
  state.evaluations = state.evaluations.map((evaluation) => {
    const person = personById(evaluation.personId);
    if (!isKpiEligiblePerson(person) || !evaluation.period) return evaluation;
    const personPeriodKey = `${evaluation.personId}|${evaluation.period}`;
    const criteriaTasks = isSectionHeadPerson(person)
      ? uniqueTaskRecords(
        tasksByPersonPeriod.get(personPeriodKey) || [],
        tasksBySectionHeadPeriod.get(personPeriodKey) || [],
      )
      : tasksByPersonPeriod.get(personPeriodKey) || [];
    const calculated = personalCriteriaScoresFromTasks(
      evaluation.personId,
      evaluation.period,
      criteriaTasks,
    );
    const taskBehavior = calculatedTaskBehaviorForPerson(
      evaluation.personId,
      evaluation.period,
      evaluation,
      tasksByPersonPeriod.get(personPeriodKey) || [],
    );
    const finalScore = calculatePersonalFinalScore(
      calculated.personalScore,
      Number(evaluation.departmentScore || 0),
      taskBehavior.behaviorScore,
    );
    const grade = gradePersonal(finalScore);
    const criteriaChanged = JSON.stringify(evaluation.criteriaScores || {}) !== JSON.stringify(calculated.criteriaScores);
    const behaviorChanged = JSON.stringify(evaluation.behavior || {}) !== JSON.stringify(taskBehavior.behavior)
      || JSON.stringify(evaluation.behaviorAutomatic || {}) !== JSON.stringify(taskBehavior.behaviorAutomatic)
      || JSON.stringify(evaluation.taskBehaviorLinks || []) !== JSON.stringify(taskBehavior.taskBehaviorLinks)
      || Number(evaluation.behaviorScore || 0) !== taskBehavior.behaviorScore;
    if (
      !criteriaChanged
      && !behaviorChanged
      && Number(evaluation.personalScore || 0) === calculated.personalScore
      && Number(evaluation.finalScore || 0) === finalScore
      && evaluation.grade === grade
    ) {
      return evaluation;
    }
    changed = true;
    return {
      ...evaluation,
      criteriaScores: calculated.criteriaScores,
      personalScore: calculated.personalScore,
      ...taskBehavior,
      finalScore,
      grade,
    };
  });
  return changed;
}

function migratePersonalKpiClassification() {
  if (state.personalKpiClassificationVersion === PERSONAL_KPI_CLASSIFICATION_VERSION) return false;
  // The migration writes shared KPI records and the catalog version. Only the
  // Admin account may perform that central update; all other accounts still
  // receive the live, correctly calculated KPI snapshot for viewing.
  if (!isAdmin()) return false;
  recalculateSavedPersonalEvaluationScores();
  state.personalKpiClassificationVersion = PERSONAL_KPI_CLASSIFICATION_VERSION;
  return true;
}

function syncPersonalEvaluationTaskScoresForTask(task, previousTask = null) {
  const targets = [];
  const addTarget = (personId, period) => {
    if (!personId || !period) return;
    if (!targets.some((item) => item.personId === personId && item.period === period)) {
      targets.push({ personId, period });
    }
  };
  [task, previousTask].filter(Boolean).forEach((item) => {
    const period = taskPeriod(item);
    taskParticipantIds(item).forEach((personId) => {
      addTarget(personId, period);
      const sectionHead = sectionHeadForPerson(personById(personId));
      if (sectionHead) addTarget(sectionHead.id, period);
    });
  });
  targets
    .filter((item) => {
      if (isAdmin() || isDirector()) return true;
      if (item.period !== currentMonth()) return false;
      const person = personById(item.personId);
      if ((isManager() || isDeputyManager()) && person?.departmentId === currentDepartmentId()) return true;
      return item.personId === currentPerson()?.id;
    })
    .forEach((item) => syncPersonalEvaluationTaskScores(item.personId, item.period));
}

function sortKpiDetailTasks(a, b) {
  const aDue = taskDeadlineDate(a)?.toISOString() || "9999-12-31";
  const bDue = taskDeadlineDate(b)?.toISOString() || "9999-12-31";
  return aDue.localeCompare(bDue) || (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
}

function kpiTasksForCriterion(scope, criterionName) {
  const period = scope === "department" ? byId("deptEvalPeriod").value || state.activePeriod : byId("evalPeriod").value || state.activePeriod;
  if (scope === "department") {
    const departmentId = byId("deptEvalDepartment").value;
    const department = departmentById(departmentId);
    const isCompletionCriterion = criterionName === departmentCompletionCriterion[0];
    const tasks = departmentTasksForKpi(departmentId, period)
      .filter((task) => canViewTaskRecord(task))
      .filter((task) => isCompletionCriterion || taskMatchesKpiCriterion(task, criterionName))
      .sort(sortKpiDetailTasks);
    return {
      period,
      tasks,
      subject: department?.name || "Phòng chưa rõ",
      scopeLabel: "KPI phòng",
      emptyText: isCompletionCriterion
        ? "Chưa có công việc của phòng trong kỳ đã chọn."
        : "Chưa có công việc trong phòng khớp với tiêu chí này ở kỳ đã chọn.",
    };
  }

  const personId = byId("evalPerson").value;
  const person = personById(personId);
  const sectionHeadScope = isSectionHeadPerson(person)
    ? sectionHeadCriterionScope(sectionHeadKpiScopes(personId, period), criterionName)
    : null;
  if (sectionHeadScope) {
    const teamNames = sectionHeadScope.teamMembers?.map((member) => member.name).filter(Boolean) || [];
    return {
      period,
      tasks: sectionHeadScope.tasks.filter((task) => canViewTaskRecord(task)).sort(sortKpiDetailTasks),
      subject: sectionHeadScope.type === "team"
        ? `${person?.name || "Trưởng bộ phận/Trưởng nhóm"} · Nhóm quản lý (${teamNames.length} nhân sự)`
        : `${person?.name || "Trưởng bộ phận/Trưởng nhóm"} · Công việc phụ trách`,
      scopeLabel: "KPI cá nhân",
      emptyText: sectionHeadScope.emptyText,
    };
  }
  const taskScope = personalKpiTaskScope(personId, period);
  const tasks = taskScope.tasks
    .filter((task) => canViewTaskRecord(task))
    .filter((task) => taskCountsForPersonalCriterion(task, personId, criterionName))
    .sort(sortKpiDetailTasks);
  return {
    period,
    tasks,
    subject: person?.name || "Chưa chọn nhân sự",
    scopeLabel: "KPI cá nhân",
    emptyText: "Chưa có công việc của nhân sự khớp với tiêu chí này ở kỳ đã chọn.",
  };
}

function renderKpiTaskDetailItem(task) {
  const collaboratorNames = taskCollaboratorNames(task);
  const status = getDueStatus(task);
  const latestReport = latestTaskProgressReport(task);
  const violations = taskViolationReasons(task);
  const badge = status === "Quá hạn" ? "bad" : status === "Hoàn thành" ? "good" : "warn";
  return `
    <article class="kpi-task-detail-item">
      <div class="section-head">
        <div>
          <span class="badge ${badge}">${escapeHtml(status)}</span>
          <h3>${escapeHtml(task.title)}</h3>
        </div>
        <button class="ghost" data-open-kpi-task="${escapeHtml(task.id)}" type="button">Mở công việc</button>
      </div>
      <div class="kpi-task-detail-meta">
        <span><strong>Người thực hiện:</strong> ${escapeHtml(taskOwnerName(task))}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Tên dự án:</strong> ${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
        <span><strong>Loại:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
        ${!isAssignedTask(task) ? `<span><strong>Loại công việc:</strong> ${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)])}</span>` : ""}
        ${!isAssignedTask(task) ? `<span><strong>Định kỳ:</strong> ${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)])}</span>` : ""}
        <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
        <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
        <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
        <span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>
        <span><strong>Đánh giá chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))}</span>
        <span><strong>Điểm thực hiện KPI:</strong> ${formatScore(taskKpiActualScore(task))}</span>
        <span><strong>Cập nhật gần nhất:</strong> ${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% - ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
      </div>
      ${task.note ? `<p class="kpi-task-detail-note"><strong>Nội dung:</strong> ${escapeHtml(task.note)}</p>` : ""}
      ${task.responseNote ? `<p class="kpi-task-detail-note"><strong>Phản hồi/Báo cáo:</strong> ${escapeHtml(task.responseNote)}</p>` : ""}
      ${latestReport?.note && latestReport.note !== task.responseNote ? `<p class="kpi-task-detail-note"><strong>Báo cáo gần nhất:</strong> ${escapeHtml(latestReport.note)}</p>` : ""}
      ${taskProgressReportListHtml(task)}
      ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
    </article>
  `;
}

function taskBehaviorDetailsForCurrentEvaluation(criterionName = "", behaviorRuleIndex = null) {
  const personId = byId("evalPerson").value;
  const period = byId("evalPeriod").value || state.activePeriod;
  const person = personById(personId);
  const behaviorRuleName = Number.isInteger(behaviorRuleIndex) ? behaviorRules[behaviorRuleIndex]?.[0] || "" : "";
  const links = automaticTaskBehaviorForPerson(personId, period).links
    .filter((item) => !criterionName || item.criterionName === criterionName)
    .map((item) => ({
      ...item,
      reasons: behaviorRuleName ? taskBehaviorReasonsForRule(item.reasons, behaviorRuleName) : item.reasons,
    }))
    .filter((item) => item.reasons.length)
    .map((item) => ({ ...item, task: state.tasks.find((task) => task.id === item.taskId) }))
    .filter((item) => item.task && canViewTaskRecord(item.task))
    .sort((a, b) => sortKpiDetailTasks(a.task, b.task));
  return {
    person,
    period,
    criterionName,
    behaviorRuleName,
    links,
  };
}

function renderTaskBehaviorDetailItem(item) {
  const task = item.task;
  const collaboratorNames = taskCollaboratorNames(task);
  const isReward = item.type === "reward";
  return `
    <article class="kpi-task-detail-item task-behavior-detail-item">
      <div class="section-head">
        <div>
          <span class="badge ${isReward ? "good" : "bad"}">${isReward ? "Ghi nhận tự động" : "Lỗi tự động"}</span>
          <h3>${escapeHtml(item.title || task.title || "Công việc")}</h3>
        </div>
        <button class="ghost criteria-detail-button" data-open-kpi-criterion="${escapeHtml(item.criterionName)}" type="button">Mở tiêu chí</button>
      </div>
      <div class="kpi-task-detail-meta">
        <span><strong>Tiêu chí KPI theo vị trí:</strong> ${escapeHtml(item.criterionName || "Chưa gắn tiêu chí KPI")}</span>
        <span><strong>Trạng thái:</strong> ${escapeHtml(getDueStatus(task))}</span>
        ${isReward ? `<span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>` : ""}
        <span><strong>Người thực hiện:</strong> ${escapeHtml(taskOwnerName(task))}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa cập nhật")}</span>
        <span><strong>Danh mục công việc:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
      </div>
      <div class="task-violation"><strong>${isReward ? "Ghi nhận:": "Lỗi ghi nhận:"}</strong> ${escapeHtml(item.reasons.join("; "))}</div>
      <div class="task-behavior-detail-actions">
        <button class="ghost criteria-detail-button" data-open-kpi-task="${escapeHtml(task.id)}" type="button">Mở công việc</button>
      </div>
    </article>
  `;
}

function openTaskBehaviorDetailDialog(criterionName = "", behaviorRuleIndex = null) {
  const detail = taskBehaviorDetailsForCurrentEvaluation(criterionName, behaviorRuleIndex);
  const recordCount = detail.links.reduce((sum, item) => sum + (item.reasons?.length || 0), 0);
  const criteriaCount = new Set(detail.links.map((item) => item.criterionName).filter(Boolean)).size;
  const isReward = Number.isInteger(behaviorRuleIndex) && Number(behaviorRules[behaviorRuleIndex]?.[1] || 0) > 0;
  const title = detail.behaviorRuleName || criterionName || "Ghi nhận tự động từ công việc";
  byId("kpiTaskDetailTitle").textContent = title;
  byId("kpiTaskDetailSubtitle").textContent = `KPI cá nhân · ${detail.person?.name || "Chưa chọn nhân sự"} · kỳ ${formatPeriod(detail.period)}`;
  byId("kpiTaskDetailContext").innerHTML = `
    <span><strong>${detail.links.length}</strong> công việc được ghi nhận</span>
    <span><strong>${recordCount}</strong> ${isReward ? "ghi nhận tự động" : "lỗi tự động"}</span>
    <span><strong>${criteriaCount}</strong> tiêu chí KPI liên quan</span>
  `;
  byId("kpiTaskDetailList").innerHTML = detail.links.length
    ? detail.links.map(renderTaskBehaviorDetailItem).join("")
    : `<div class="empty-state">Chưa có ghi nhận tự động từ công việc thuộc ${escapeHtml(detail.behaviorRuleName || criterionName || "tiêu chí này")} trong kỳ đã chọn.</div>`;
  byId("kpiTaskDetailDialog").classList.remove("is-hidden");
  byId("kpiTaskDetailDialog").setAttribute("aria-hidden", "false");
}

function openKpiTaskDetailDialog(scope, criterionName) {
  const detail = kpiTasksForCriterion(scope, criterionName);
  const completed = detail.tasks.filter((task) => getDueStatus(task) === "Hoàn thành").length;
  const overdue = detail.tasks.filter((task) => getDueStatus(task) === "Quá hạn").length;
  const actualScore = detail.tasks.reduce((sum, task) => sum + taskKpiActualScore(task), 0);
  byId("kpiTaskDetailTitle").textContent = criterionName || "Công việc liên quan";
  byId("kpiTaskDetailSubtitle").textContent = `${detail.scopeLabel} · ${detail.subject} · kỳ ${formatPeriod(detail.period)}`;
  byId("kpiTaskDetailContext").innerHTML = `
    <span><strong>${detail.tasks.length}</strong> công việc liên quan</span>
    <span><strong>${completed}</strong> hoàn thành</span>
    <span><strong>${formatScore(actualScore)}</strong> điểm thực hiện KPI</span>
    <span><strong>${overdue}</strong> quá hạn</span>
  `;
  byId("kpiTaskDetailList").innerHTML = detail.tasks.length
    ? detail.tasks.map(renderKpiTaskDetailItem).join("")
    : `<div class="empty-state">${escapeHtml(detail.emptyText)}</div>`;
  byId("kpiTaskDetailDialog").classList.remove("is-hidden");
  byId("kpiTaskDetailDialog").setAttribute("aria-hidden", "false");
}

function closeKpiTaskDetailDialog() {
  byId("kpiTaskDetailDialog").classList.add("is-hidden");
  byId("kpiTaskDetailDialog").setAttribute("aria-hidden", "true");
}

function loadDepartmentEvaluationForSelection() {
  const period = byId("deptEvalPeriod").value || state.activePeriod;
  const departmentId = byId("deptEvalDepartment").value;
  const existing = latestDepartmentEvaluation(departmentId, period);
  renderAdjustmentActorInput("deptEvalReviewer", existing);
  byId("deptEvalRewardDiscipline").value = existing?.rewardDisciplineNote || "";
  byId("deptEvalAdjustmentType").value = normalizeDepartmentAdjustmentType(existing?.adjustmentType);
  byId("deptEvalAdjustmentPoints").value = hasOwnValue(existing, "adjustmentPoints") ? existing.adjustmentPoints : "";
  byId("deptEvalComment").value = existing?.comment || "";
  renderDepartmentCriteriaInputs(existing?.criteriaScores || {});
  renderCustomFieldsForScope("department-evaluations");
  applyFieldCustomizations();
}

function syncDepartmentScoreFromSelectedPerson() {
  const person = personById(byId("evalPerson").value);
  const period = byId("evalPeriod").value || state.activePeriod;
  const scoreInput = byId("evalDepartmentScore");
  const hint = byId("evalDepartmentLinkHint");
  if (!person) {
    scoreInput.value = "";
    scoreInput.dataset.sourceId = "";
    scoreInput.title = "Chọn nhân sự để liên kết KPI phòng.";
    hint.textContent = "Chọn nhân sự để liên kết KPI phòng.";
    hint.className = "field-note";
    updateScorePreview();
    return;
  }
  const department = departmentById(person.departmentId);
  const departmentEvaluation = person ? departmentEvaluationSnapshot(person.departmentId, period) : null;
  scoreInput.value = departmentEvaluation ? formatScore(departmentEvaluation.finalScore) : "0";
  scoreInput.dataset.sourceId = departmentEvaluation?.id || "";
  scoreInput.title = departmentEvaluation
    ? `Tự tổng hợp từ công việc phòng: ${departmentEvaluation.grade}`
    : "Chưa có công việc của phòng trong kỳ; KPI phòng tạm tính 0 điểm.";
  hint.textContent = departmentEvaluation
    ? `Đã tự tổng hợp ${department?.name || "phòng"} kỳ ${formatPeriod(period)}: ${formatScore(departmentEvaluation.finalScore)} điểm - ${departmentEvaluation.grade}. Không cần xác nhận.`
    : `Chưa có công việc ${department?.name || ""} kỳ ${formatPeriod(period)}. Không cần xác nhận để lưu KPI cá nhân.`;
  hint.className = departmentEvaluation ? "field-note is-linked" : "field-note is-warning";
  updateScorePreview();
}

function updateEvaluationFormLock() {
  const personId = byId("evalPerson").value;
  const period = byId("evalPeriod").value || state.activePeriod;
  const canEditBase = canEditEvaluation(personId, period);
  const canEditBehavior = canEditEvaluationBehavior(personId, period);
  const existing = latestEvaluation(personId, period);
  byId("evaluationForm").querySelectorAll("#criteriaInputs [data-score-input], #evalComment").forEach((input) => {
    input.disabled = !canEditBase;
  });
  byId("evaluationForm").querySelectorAll("#behaviorInputs [data-score-input]").forEach((input) => {
    input.disabled = !canEditBehavior;
  });
  byId("evaluationForm").querySelector("button[type='submit']").disabled = !canEditBase && (!canEditBehavior || !existing);
  const hint = byId("evalDepartmentLinkHint");
  if (!canEditBase && personId) {
    hint.textContent = canEditBehavior
      ? "Tài khoản hiện tại chỉ được sửa phần khen thưởng, kỷ luật, tác phong trên phiếu KPI cá nhân đã có."
      : canEvaluatePerson(personId)
      ? "Kỳ này đã khóa với tài khoản hiện tại. Nhân viên/trưởng phòng chỉ được sửa tháng hiện tại."
      : "Tài khoản hiện tại không có quyền chấm nhân sự này.";
    hint.className = "field-note is-warning";
  }
  const behaviorHint = byId("behaviorPermissionHint");
  if (!personId) {
    behaviorHint.textContent = "Áp dụng điểm cộng/trừ theo quy chế toàn Ban.";
  } else if (canEditBehavior) {
    behaviorHint.textContent = "Trưởng phòng, Ban giám đốc hoặc admin nhập điểm cộng/trừ theo quy chế.";
  } else {
    behaviorHint.textContent = "Chỉ trưởng phòng, Ban giám đốc hoặc admin được nhập phần này.";
  }
}

function updateDepartmentFormLock() {
  const departmentId = byId("deptEvalDepartment").value;
  const period = byId("deptEvalPeriod").value || state.activePeriod;
  const canReportData = canReportDepartmentEvaluation(departmentId, period);
  const canConfirm = canConfirmDepartmentEvaluation(departmentId, period);
  byId("departmentEvaluationForm").querySelectorAll("#deptEvalComment, #deptEvalRewardDiscipline, #deptEvalAdjustmentType, #deptEvalAdjustmentPoints").forEach((input) => {
    input.disabled = !canConfirm;
  });
  byId("departmentEvaluationForm").querySelector("button[type='submit']").disabled = !canReportData && !canConfirm;
}

function updateScorePreview() {
  const result = calculateEvaluationFromForm();
  result.criteriaResults.forEach((item, index) => {
    const percent = byId(`criterion-percent-${index}`);
    const points = byId(`criterion-points-${index}`);
    if (percent) percent.textContent = formatScore(item.completionPercent);
    if (points) points.textContent = formatScore(item.points);
  });
  byId("personalScorePreview").textContent = formatScore(result.personalScore);
  byId("behaviorScorePreview").textContent = formatScore(result.behaviorScore);
  byId("finalScorePreview").textContent = formatScore(result.finalScore);
  byId("gradePreview").textContent = gradePersonal(result.finalScore);
  updateEvaluationFormLock();
}

function updateDepartmentScorePreview() {
  const result = calculateDepartmentEvaluationFromForm();
  result.criteriaResults.forEach((item, index) => {
    const percent = byId(`dept-criterion-percent-${index}`);
    const points = byId(`dept-criterion-points-${index}`);
    if (percent) percent.textContent = formatScore(item.completionPercent);
    if (points) points.textContent = formatScore(item.points);
  });
  byId("departmentAdjustmentPreview").textContent =
    result.adjustmentScore > 0 ? `+${formatScore(result.adjustmentScore)}` : formatScore(result.adjustmentScore);
  byId("departmentScorePreview").textContent = formatScore(result.finalScore);
  byId("departmentGradePreview").textContent = gradeDepartment(result.finalScore);
  updateDepartmentFormLock();
}

function livePersonalEvaluationRecord(evaluation, contextsByPeriod) {
  if (!evaluation?.personId || !evaluation?.period) return evaluation;
  let context = contextsByPeriod.get(evaluation.period);
  if (!context) {
    context = buildDashboardKpiContext(evaluation.period);
    contextsByPeriod.set(evaluation.period, context);
  }
  return personalEvaluationSnapshot(evaluation.personId, evaluation.period, context) || evaluation;
}

function renderEvaluationTable() {
  const tbody = byId("evaluationTable");
  const contextsByPeriod = new Map();
  const evaluations = [...state.evaluations]
    .filter((evaluation) => personIsVisible(evaluation.personId))
    .map((evaluation) => livePersonalEvaluationRecord(evaluation, contextsByPeriod))
    .filter((evaluation) => {
      if (!evaluationGradeFilter) return true;
      return evaluation.period === state.activePeriod && (evaluation.grade || gradePersonal(evaluation.finalScore)) === evaluationGradeFilter;
    })
    .sort((a, b) => b.period.localeCompare(a.period) || b.finalScore - a.finalScore);
  updateEvaluationFilterNote(evaluations.length);
  if (!evaluations.length) {
    tbody.innerHTML = evaluationGradeFilter
      ? `<tr><td colspan="8" class="empty-cell">Không có phiếu KPI cá nhân thuộc ${escapeHtml(evaluationGradeFilter)} trong kỳ ${escapeHtml(formatPeriod(state.activePeriod))}.</td></tr>`
      : byId("emptyRowTemplate").innerHTML;
    return;
  }
  tbody.innerHTML = evaluations
    .map((evaluation) => {
      const person = personById(evaluation.personId);
      const canEdit = canEditEvaluation(evaluation.personId, evaluation.period);
      const canEditBehavior = canEditEvaluationBehavior(evaluation.personId, evaluation.period);
      return `
        <tr>
          <td>${escapeHtml(formatPeriod(evaluation.period))}</td>
          <td><strong>${escapeHtml(person?.name || "Nhân sự đã xóa")}</strong></td>
          <td>${formatScore(evaluation.personalScore)}</td>
          <td>${formatScore(evaluation.departmentScore)}</td>
          <td>${formatScore(evaluation.behaviorScore)}</td>
          <td><span class="badge ${badgeClass(evaluation.finalScore)}">${formatScore(evaluation.finalScore)}</span></td>
          <td>${evaluation.grade}</td>
          <td>
            <span class="row-actions">
              ${canEdit || canEditBehavior ? `<button class="ghost" data-edit-eval="${evaluation.id}" type="button">Sửa</button>` : ""}
              ${canEdit ? `<button class="ghost" data-delete-eval="${evaluation.id}" type="button">Xóa</button>` : ""}
              ${canEdit || canEditBehavior ? "" : "<span class=\"muted\">Đã khóa</span>"}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function updateEvaluationFilterNote(resultCount) {
  const note = byId("evaluationFilterNote");
  if (!evaluationGradeFilter) {
    note.classList.add("is-hidden");
    byId("evaluationFilterText").textContent = "";
    return;
  }
  byId("evaluationFilterText").textContent = `Đang lọc ${resultCount} phiếu KPI cá nhân thuộc ${evaluationGradeFilter} trong kỳ ${formatPeriod(state.activePeriod)}.`;
  note.classList.remove("is-hidden");
}

function renderDepartmentEvaluationTable() {
  const tbody = byId("departmentEvaluationTable");
  const visibleDepartmentIds = new Set(visibleDepartmentsForDepartmentEvaluations().map((department) => department.id));
  const evaluations = state.departmentEvaluations
    .filter((evaluation) => visibleDepartmentIds.has(evaluation.departmentId))
    .sort((a, b) => b.period.localeCompare(a.period) || b.finalScore - a.finalScore);
  if (!evaluations.length) {
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"6\"");
    return;
  }
  tbody.innerHTML = evaluations
    .map((evaluation) => {
      const department = departmentById(evaluation.departmentId);
      const canEdit = canEditDepartmentEvaluation(evaluation.departmentId, evaluation.period);
      return `
        <tr>
          <td>${escapeHtml(formatPeriod(evaluation.period))}</td>
          <td><strong>${escapeHtml(department?.name || "Phòng đã xóa")}</strong></td>
          <td><span class="badge ${badgeClass(evaluation.finalScore)}">${formatScore(evaluation.finalScore)}</span>${departmentAdjustmentSummary(evaluation) ? `<br><span class="muted">${escapeHtml(departmentAdjustmentSummary(evaluation))}</span>` : ""}</td>
          <td>${escapeHtml(evaluation.grade)}</td>
          <td>${escapeHtml(evaluation.reviewer || "")}</td>
          <td>
            <span class="row-actions">
              ${canEdit ? `<button class="ghost" data-edit-dept-eval="${evaluation.id}" type="button">Sửa</button><button class="ghost" data-delete-dept-eval="${evaluation.id}" type="button">Xóa</button>` : "<span class=\"muted\">Đã khóa</span>"}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function conicGradient(items) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return "#e5edf3 0% 100%";
  let cursor = 0;
  return items
    .filter((item) => Number(item.value || 0) > 0)
    .map((item, index, visibleItems) => {
      const start = cursor;
      cursor += (Number(item.value || 0) / total) * 100;
      const end = index === visibleItems.length - 1 ? 100 : cursor;
      return `${item.color} ${formatScore(start)}% ${formatScore(end)}%`;
    })
    .join(", ");
}

function conicGradientAtProgress(items, progress) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return "#e5edf3 0% 100%";
  const reveal = clamp(progress, 0, 1);
  let cursor = 0;
  const segments = items
    .filter((item) => Number(item.value || 0) > 0)
    .map((item) => {
      const length = (Number(item.value || 0) / total) * 100 * reveal;
      const start = cursor;
      cursor += length;
      return length > 0 ? `${item.color} ${formatScore(start)}% ${formatScore(cursor)}%` : "";
    })
    .filter(Boolean);
  if (cursor < 100) segments.push(`#e5edf3 ${formatScore(cursor)}% 100%`);
  return segments.join(", ");
}

function dashboardChartAnimationAllowed() {
  if (document.body.classList.contains("is-printing-selection")) return false;
  if (typeof window.matchMedia !== "function") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readDashboardDonutItems(element) {
  try {
    return JSON.parse(element?.dataset.chartItems || "[]");
  } catch {
    return [];
  }
}

function setDashboardChartsToProgress(progress) {
  document.querySelectorAll("[data-dashboard-donut]").forEach((chart) => {
    const items = readDashboardDonutItems(chart);
    chart.style.setProperty("--donut-bg", `conic-gradient(${conicGradientAtProgress(items, progress)})`);
  });
  document.querySelectorAll("[data-dashboard-department-donut]").forEach((chart) => {
    const target = clamp(chart.dataset.departmentProgress, 0, 100);
    chart.style.setProperty("--department-progress", `${formatScore(target * clamp(progress, 0, 1))}%`);
  });
}

function finishDashboardChartAnimations() {
  if (dashboardChartAnimationFrame) {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(dashboardChartAnimationFrame);
    dashboardChartAnimationFrame = 0;
  }
  setDashboardChartsToProgress(1);
}

function animateDashboardCharts() {
  finishDashboardChartAnimations();
  if (!dashboardChartAnimationAllowed() || typeof requestAnimationFrame !== "function") return;
  setDashboardChartsToProgress(0);
  const nowValue = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());
  const startedAt = nowValue();
  const step = (now) => {
    const elapsed = (typeof now === "number" ? now : nowValue()) - startedAt;
    const rawProgress = clamp(elapsed / DASHBOARD_CHART_ANIMATION_MS, 0, 1);
    const eased = 1 - Math.pow(1 - rawProgress, 3);
    setDashboardChartsToProgress(eased);
    if (rawProgress < 1) {
      dashboardChartAnimationFrame = requestAnimationFrame(step);
    } else {
      dashboardChartAnimationFrame = 0;
      setDashboardChartsToProgress(1);
    }
  };
  dashboardChartAnimationFrame = requestAnimationFrame(step);
}

function hasRecordedKpiResult(evaluation) {
  const value = evaluation?.finalScore;
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function kpiResultScore(evaluation) {
  return Number(evaluation?.finalScore || 0);
}

function renderGradeDistribution(periodEvaluations, eligiblePeople = state.people.filter(isKpiEligiblePerson)) {
  const counts = Object.fromEntries(personalGradeOrder.map((grade) => [grade, 0]));
  periodEvaluations.forEach((evaluation) => {
    const grade = gradePersonal(kpiResultScore(evaluation));
    counts[grade] = (counts[grade] || 0) + 1;
  });
  const evaluatedPeople = new Set(periodEvaluations.map((evaluation) => evaluation.personId));
  const notEvaluated = eligiblePeople.filter((person) => !evaluatedPeople.has(person.id)).length;
  counts["Chưa chấm"] = notEvaluated;
  const total = eligiblePeople.length;
  const chart = byId("gradeDistributionChart");
  byId("gradeChartSummary").textContent = total
    ? `${periodEvaluations.length}/${total} nhân viên đã có kết quả KPI trong kỳ ${formatMonthPeriod(state.activePeriod)}.`
    : "Chưa có hồ sơ nhân sự.";
  if (!total) {
    chart.innerHTML = "Chưa có dữ liệu nhân sự.";
    return;
  }

  const items = personalGradeOrder.map((grade) => ({
    label: grade,
    value: counts[grade],
    color: personalGradeColors[grade],
  }));
  const legend = personalGradeOrder
    .map((grade, index) => {
      const percent = total ? (counts[grade] / total) * 100 : 0;
      return `
        <button class="chart-legend-item dashboard-link" data-dashboard-grade="${escapeHtml(grade)}" type="button">
          <span class="grade-dot" style="background:${personalGradeColors[grade]}"></span>
          <span>${grade}</span>
          <strong>${counts[grade]}</strong>
          <em>${formatScore(percent)}%</em>
        </button>
      `;
    })
    .join("");

  chart.innerHTML = `
    <div class="dashboard-pie-layout">
      <div class="donut-chart" data-dashboard-donut data-chart-items="${escapeHtml(JSON.stringify(items))}" style="--donut-bg: conic-gradient(${conicGradient(items)});" aria-label="Phân loại xếp hạng nhân viên">
        <div class="donut-center">
          <strong>${periodEvaluations.length}/${total}</strong>
          <span>đã chấm</span>
        </div>
      </div>
      <div class="dashboard-pie-legend">${legend}</div>
    </div>
  `;
}

function renderDepartmentEffectivenessChart(context = null) {
  const eligibleDepartments = visibleDepartmentsForDepartmentEvaluations();
  const items = eligibleDepartments.map((department, index) => {
    const people = state.people.filter((person) => person.departmentId === department.id);
    const calculatedEvaluation = context?.departmentEvaluationsById?.has(department.id)
      ? context.departmentEvaluationsById.get(department.id)
      : departmentEvaluationSnapshot(department.id, state.activePeriod);
    const evaluation = hasRecordedKpiResult(calculatedEvaluation) ? calculatedEvaluation : undefined;
    const score = evaluation ? kpiResultScore(evaluation) : 0;
    return {
      department,
      people,
      evaluation,
      score,
      grade: evaluation ? gradeDepartment(score) : "Chưa chấm",
      color: departmentChartColors[index % departmentChartColors.length],
    };
  });
  const scored = items.filter((item) => item.evaluation);
  byId("departmentChartSummary").textContent = scored.length
    ? `${scored.length}/${eligibleDepartments.length} phòng đã có KPI phòng được tự tổng hợp trong kỳ ${formatMonthPeriod(state.activePeriod)}.`
    : "Chưa có dữ liệu KPI phòng trong kỳ này.";

  byId("departmentSummary").innerHTML = items
    .map(
      (item, index) => `
        <button class="department-donut-card dashboard-link" data-dashboard-department-detail="${escapeHtml(item.department.id)}" type="button">
          <span class="department-donut-title">${escapeHtml(item.department.name)}</span>
          <span class="department-donut-chart" data-dashboard-department-donut data-department-progress="${clamp(item.score, 0, 100)}" style="--department-color: ${item.evaluation ? item.color : "#94a3b8"}; --department-progress: ${clamp(item.score, 0, 100)}%;">
            <span class="department-donut-center">
              <strong>${item.evaluation ? formatScore(item.score) : "-"}</strong>
              <small>điểm</small>
            </span>
          </span>
          <span class="department-donut-meta">
            <strong>${escapeHtml(item.grade)}</strong>
            <small>${item.people.length} nhân sự</small>
          </span>
        </button>
      `,
    )
    .join("");
}

function renderHistoryTargetOptions() {
  const type = byId("historyType").value || "department";
  const current = byId("historyTarget").value;
  const options =
    type === "department"
      ? visibleDepartmentsForHistory().map((department) => ({ value: department.id, label: department.name }))
      : visiblePeopleForHistory().map((person) => ({
          value: person.id,
          label: `${person.name} - ${departmentById(person.departmentId)?.name || "Chưa rõ phòng"}`,
        }));
  const selected = options.some((option) => option.value === current) ? current : options[0]?.value;
  fillSelect(byId("historyTarget"), options.length ? options : [{ value: "", label: "Chưa có dữ liệu" }], selected);
}

function renderHistorySummary(cards) {
  byId("historySummary").innerHTML = cards
    .map(
      (card) => `
        <article class="history-card">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.note || "")}</p>
        </article>
      `,
    )
    .join("");
}

function historyItemSortValue(item) {
  return item.timestamp || item.updatedAt || item.createdAt || `${item.period || "0000-00"}-01T00:00:00`;
}

function activityMatchesHistory(activity, type, targetId) {
  if (!activity || !targetId) return false;
  if (type === "department") {
    if (activity.targetType === "bulletin") return true;
    if (activity.departmentId === targetId) return true;
    if (activity.personId && personById(activity.personId)?.departmentId === targetId) return true;
    if (activity.targetType === "department" && activity.targetId === targetId) return true;
    return false;
  }
  const person = personById(targetId);
  return (
    activity.personId === targetId ||
    (activity.targetType === "person" && activity.targetId === targetId) ||
    (activity.targetType === "departmentEvaluation" && activity.departmentId && activity.departmentId === person?.departmentId)
  );
}

function activityToTimelineItem(activity) {
  const action = activity.action || "Hoạt động";
  const module = activity.module || "Dữ liệu";
  const linkableTypes = ["person", "task", "departmentEvaluation", "evaluation", "account", "bulletin", "archive"];
  const targetType = linkableTypes.includes(activity.targetType) ? activity.targetType : "";
  const details = [
    `Thời gian: ${formatDateTime(activity.timestamp)}`,
    `Người chỉnh sửa: ${activity.actorName || "Chưa rõ"}${activity.actorRole ? ` (${activity.actorRole})` : ""}`,
    activity.details || "",
  ].filter(Boolean);
  return {
    period: activity.period,
    timestamp: activity.timestamp,
    type: `${action} ${module}`,
    title: activity.title || module,
    actorName: activity.actorName || "",
    actorRole: activity.actorRole || "",
    meta: details.join(" · "),
    score: activity.score || "",
    badgeClass: action === "Xóa" ? "bad" : action === "Tạo" ? "good" : "warn",
    targetType,
    targetId: targetType ? activity.targetId : "",
    personId: activity.personId || "",
    departmentId: activity.departmentId || "",
  };
}

function recordAuditMeta(record, fallback = "") {
  const details = [fallback];
  if (record.createdAt) {
    details.push(`Tạo: ${formatDateTime(record.createdAt)}${record.createdBy ? ` bởi ${record.createdBy}` : ""}`);
  }
  if (record.updatedAt && record.updatedAt !== record.createdAt) {
    details.push(`Sửa: ${formatDateTime(record.updatedAt)}${record.updatedBy ? ` bởi ${record.updatedBy}` : ""}`);
  }
  return details.filter(Boolean).join(" · ");
}

function activitiesForHistory(type, targetId, from, to) {
  return (state.activityLog || [])
    .filter((activity) => isPeriodInRange(activity.period || periodFromTimestamp(activity.timestamp), from, to))
    .filter((activity) => activityMatchesHistory(activity, type, targetId))
    .map(activityToTimelineItem);
}

function timelineItemInRange(item, from, to) {
  const periods = [item.period, periodFromTimestamp(item.timestamp)].filter(Boolean);
  if (!periods.length) return isPeriodInRange("", from, to);
  return periods.some((period) => isPeriodInRange(period, from, to));
}

function uniqueTimelineItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.type, item.targetType, item.targetId, item.timestamp || "", item.period || "", item.title || ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function timelineRecordMeta(record, fallback = "") {
  const details = [fallback];
  const creator = record.createdBy || "";
  const updater = record.updatedBy || "";
  if (creator) details.push(`Người tạo: ${creator}`);
  if (updater && updater !== creator) details.push(`Người sửa: ${updater}`);
  return details.filter(Boolean).join(" · ");
}

function evaluationTimelineItems(evaluation) {
  const person = personById(evaluation.personId);
  const base = {
    period: evaluation.period,
    targetType: "evaluation",
    targetId: evaluation.id,
    personId: evaluation.personId,
    departmentId: person?.departmentId || "",
    actorName: evaluation.updatedBy || evaluation.createdBy || "",
    title: person?.name || "Nhân sự đã xóa",
    score: `${formatScore(evaluation.finalScore)} điểm - ${evaluation.grade}`,
    badgeClass: badgeClass(evaluation.finalScore),
  };
  return [
    evaluation.createdAt
      ? {
          ...base,
          type: "Tạo KPI cá nhân",
          timestamp: evaluation.createdAt,
          actorName: evaluation.createdBy || base.actorName,
          meta: timelineRecordMeta(evaluation, evaluation.comment || evaluation.reviewer || ""),
        }
      : null,
    evaluation.updatedAt && evaluation.updatedAt !== evaluation.createdAt
      ? {
          ...base,
          type: "Sửa KPI cá nhân",
          timestamp: evaluation.updatedAt,
          actorName: evaluation.updatedBy || base.actorName,
          meta: timelineRecordMeta(evaluation, evaluation.comment || evaluation.reviewer || ""),
        }
      : null,
    !evaluation.createdAt && !evaluation.updatedAt
      ? {
          ...base,
          type: "KPI cá nhân",
          meta: evaluation.comment || evaluation.reviewer || "",
        }
      : null,
  ].filter(Boolean);
}

function departmentEvaluationTimelineItems(evaluation) {
  const department = departmentById(evaluation.departmentId);
  const details = [
    evaluation.reviewer ? `Điều chỉnh điểm: ${evaluation.reviewer}` : "",
    departmentAdjustmentSummary(evaluation),
    evaluation.comment || "",
  ]
    .filter(Boolean)
    .join(" · ");
  const base = {
    period: evaluation.period,
    targetType: "departmentEvaluation",
    targetId: evaluation.id,
    departmentId: evaluation.departmentId,
    actorName: evaluation.updatedBy || evaluation.createdBy || "",
    title: department?.name || "Phòng đã xóa",
    score: `${formatScore(evaluation.finalScore)} điểm - ${evaluation.grade}`,
    badgeClass: badgeClass(evaluation.finalScore),
  };
  return [
    evaluation.createdAt
      ? {
          ...base,
          type: "Tạo KPI phòng",
          timestamp: evaluation.createdAt,
          actorName: evaluation.createdBy || base.actorName,
          meta: timelineRecordMeta(evaluation, details),
        }
      : null,
    evaluation.updatedAt && evaluation.updatedAt !== evaluation.createdAt
      ? {
          ...base,
          type: "Sửa KPI phòng",
          timestamp: evaluation.updatedAt,
          actorName: evaluation.updatedBy || base.actorName,
          meta: timelineRecordMeta(evaluation, details),
        }
      : null,
    !evaluation.createdAt && !evaluation.updatedAt
      ? {
          ...base,
          type: "KPI phòng",
          meta: details,
        }
      : null,
  ].filter(Boolean);
}

function taskDeadlineTimestamp(task) {
  const due = taskDeadlineDate(task);
  return due ? due.toISOString() : "";
}

function taskStatusBadgeClass(status) {
  if (status === "Quá hạn") return "bad";
  if (isTaskFinishedStatus(status)) return "good";
  return "warn";
}

function taskTimelineItems(task) {
  const owner = personById(task.ownerId);
  const collaboratorNames = taskCollaboratorNames(task);
  const status = getDueStatus(task);
  const collaboratorMeta = collaboratorNames.length ? ` · phối hợp ${collaboratorNames.join(", ")}` : "";
  const regularMeta = isAssignedTask(task) ? "" : ` · ${taskWorkMeta(task)}`;
  const projectName = projectNameForTask(task);
  const projectMeta = projectName ? ` · dự án ${projectName}` : "";
  const qualityMeta = taskHasQualityPercent(task) ? ` · chất lượng ${formatScore(taskQualityPercentValue(task))}%` : "";
  const startMeta = task.startDate ? ` · bắt đầu ${formatTaskStartDate(task)}` : "";
  const baseMeta = `${taskKindLabels[normalizeTaskKind(task)]}${regularMeta}${projectMeta} · ${taskOwnerName(task)}${collaboratorMeta} · ${status}${startMeta} · hoàn thành ${formatTaskDeadline(task) || "chưa có"}${qualityMeta}`;
  const base = {
    period: taskPeriod(task),
    targetType: "task",
    targetId: task.id,
    personId: task.ownerId,
    departmentId: owner?.departmentId || "",
    title: task.title,
    actorName: task.updatedBy || task.createdBy || "",
    score: taskHasQualityPercent(task)
      ? `Tiến độ ${formatScore(task.progress)}% · Chất lượng ${formatScore(taskQualityPercentValue(task))}%`
      : `${formatScore(task.progress)}%`,
  };
  const items = [];
  if (task.createdAt) {
    items.push({
      ...base,
      type: "Tạo Công việc",
      timestamp: task.createdAt,
      actorName: task.createdBy || base.actorName,
      meta: timelineRecordMeta(task, baseMeta),
      badgeClass: "good",
    });
  }
  if (task.assignedAt) {
    items.push({
      ...base,
      type: "Giao việc",
      timestamp: task.assignedAt,
      actorName: task.assignedByName || task.createdBy || base.actorName,
      meta: `Người giao: ${task.assignedByName || task.createdBy || "Chưa rõ"} · Người nhận: ${taskOwnerName(task)} · ${task.category || "Chưa phân loại"}${projectMeta}`,
      badgeClass: "warn",
    });
  }
  if (task.responseAt) {
    items.push({
      ...base,
      type: "Phản hồi giao việc",
      timestamp: task.responseAt,
      actorName: task.responseByName || base.actorName,
      meta: `${task.responseStatus || "Phản hồi"} · ${task.responseByName || "Người được giao"}${task.responseNote ? ` · ${task.responseNote}` : ""}`,
      badgeClass: "warn",
    });
  }
  const qualityIncludedInCompletionReview = (task.progressReports || []).some(
    (report) => report.type === "completion-review" && report.decision === "passed" && normalizeTaskQualityInput(report.qualityPercent) !== "",
  );
  (task.progressReports || []).forEach((report) => {
    const isCompletionReview = report.type === "completion-review";
    const reviewedQuality = normalizeTaskQualityInput(report.qualityPercent);
    const reviewedTiming = isCompletionReview && report.decision === "passed"
      ? report.completionTiming || taskCompletionTimingStatus(task)
      : "";
    const reviewedTimingLabel = reviewedTiming === "ahead" ? "Vượt tiến độ" : reviewedTiming === "late" ? "Chậm tiến độ" : "";
    const reportStatus = report.status || status;
    const transition = report.previousStatus && report.previousStatus !== reportStatus
      ? `${report.previousStatus} -> ${reportStatus}`
      : reportStatus;
    items.push({
      ...base,
      type: isCompletionReview ? "Đánh giá hoàn thành" : "Báo cáo tiến độ",
      timestamp: report.createdAt,
      actorName: report.createdBy || base.actorName,
      meta: `${report.createdBy || "Người cập nhật"} · ${report.action || transition}${report.note ? ` · ${report.note}` : ""}`,
      score: isCompletionReview
        ? report.decision === "passed"
          ? reviewedQuality === ""
            ? `Đạt${reviewedTimingLabel ? ` · ${reviewedTimingLabel}` : ""}`
            : `Đạt${reviewedTimingLabel ? ` · ${reviewedTimingLabel}` : ""} · ${formatScore(reviewedQuality)}%`
          : "Không đạt"
        : `${formatScore(report.progress)}%`,
      badgeClass: isCompletionReview ? (report.decision === "passed" ? (reviewedTiming === "ahead" ? "ahead" : reviewedTiming === "late" ? "bad" : "good") : "bad") : taskStatusBadgeClass(reportStatus),
    });
  });
  if (task.qualityAssessedAt && taskHasQualityPercent(task) && !qualityIncludedInCompletionReview) {
    items.push({
      ...base,
      type: "Đánh giá chất lượng",
      timestamp: task.qualityAssessedAt,
      actorName: task.qualityAssessedByName || base.actorName,
      meta: `${task.qualityAssessedByName || "Người đánh giá"} · ${formatScore(taskQualityPercentValue(task))}% · điểm thực hiện KPI ${formatScore(taskKpiActualScore(task))}`,
      score: `${formatScore(taskQualityPercentValue(task))}%`,
      badgeClass: "good",
    });
  }
  if (
    task.updatedAt &&
    task.updatedAt !== task.createdAt &&
    task.updatedAt !== task.assignedAt &&
    task.updatedAt !== task.responseAt &&
    task.updatedAt !== task.completionReviewedAt &&
    task.updatedAt !== task.qualityAssessedAt
  ) {
    items.push({
      ...base,
      type: "Sửa Công việc",
      timestamp: task.updatedAt,
      actorName: task.updatedBy || base.actorName,
      meta: timelineRecordMeta(task, baseMeta),
      badgeClass: taskStatusBadgeClass(status),
    });
  }
  if (!isTaskFinishedStatus(status) && status !== "Quá hạn") {
    items.push({
      ...base,
      type: "Đang xử lý Công việc",
      timestamp: task.updatedAt || task.createdAt || taskDeadlineTimestamp(task),
      meta: baseMeta,
      badgeClass: "warn",
    });
  }
  if (task.due) {
    items.push({
      ...base,
      type: status === "Quá hạn" ? "Quá hạn Công việc" : isTaskFinishedStatus(status) ? "Mốc hoàn thành Công việc" : "Sắp đến hạn Công việc",
      timestamp: taskDeadlineTimestamp(task),
      meta: baseMeta,
      badgeClass: taskStatusBadgeClass(status),
    });
  }
  if (task.completedAt) {
    items.push({
      ...base,
      type: "Hoàn thành Công việc",
      timestamp: task.completedAt,
      actorName: task.completedByName || task.updatedBy || base.actorName,
      meta: `Hoàn thành bởi ${task.completedByName || "Chưa rõ"} · ${baseMeta}`,
      badgeClass: "good",
    });
  }
  if (task.closedAt) {
    items.push({
      ...base,
      type: "Kết thúc Công việc",
      timestamp: task.closedAt,
      actorName: task.closedBy || task.updatedBy || base.actorName,
      meta: `Kết thúc bởi ${task.closedBy || "Chưa rõ"} · Không còn tính quá hạn`,
      badgeClass: "good",
    });
  }
  if (!items.length) {
    items.push({
      ...base,
      type: "Công việc",
      meta: baseMeta,
      badgeClass: taskStatusBadgeClass(status),
    });
  }
  return items;
}

function historyTimelineItemsForRecords(records, from, to) {
  return uniqueTimelineItems(records.flatMap((items) => items).filter((item) => timelineItemInRange(item, from, to)));
}

function historyItemActorLabel(item) {
  const actorName = String(item.actorName || item.updatedBy || item.createdBy || "").trim();
  const actorRole = String(item.actorRole || "").trim();
  if (!actorName) return "Tài khoản: Chưa xác định";
  return `Tài khoản: ${actorName}${actorRole ? ` (${actorRole})` : ""}`;
}

function renderHistoryTimeline(items) {
  const sorted = [...items].sort((a, b) => historyItemSortValue(b).localeCompare(historyItemSortValue(a)));
  byId("historyTimeline").innerHTML = sorted.length
    ? sorted
        .map(
          (item) => {
            const targetAttrs =
              item.targetType && item.targetId
                ? ` data-history-target-type="${escapeHtml(item.targetType)}" data-history-target-id="${escapeHtml(item.targetId)}" data-history-person-id="${escapeHtml(item.personId || "")}" data-history-department-id="${escapeHtml(item.departmentId || "")}" data-history-title="${escapeHtml(item.title || "")}"`
                : "";
            return `
            <article class="history-item${targetAttrs ? " history-link" : ""}"${targetAttrs} ${targetAttrs ? 'role="button" tabindex="0"' : ""}>
              <div class="history-item-head">
                <span class="badge ${item.badgeClass || ""}">${escapeHtml(item.type)}</span>
                <div class="history-item-audit">
                  <time>${escapeHtml(item.timestamp ? formatDateTime(item.timestamp) : formatPeriod(item.period) || "Không có kỳ")}</time>
                  <span class="history-item-account">${escapeHtml(historyItemActorLabel(item))}</span>
                </div>
              </div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.meta || "")}</p>
              ${item.period ? `<p>Kỳ: ${escapeHtml(formatPeriod(item.period))}</p>` : ""}
              <strong>${escapeHtml(item.score || "")}</strong>
            </article>
          `;
          },
        )
        .join("")
    : "Chưa có dữ liệu lịch sử.";
}

function renderHistory() {
  renderHistoryTargetOptions();
  const type = byId("historyType").value || "department";
  const targetId = byId("historyTarget").value;
  const from = byId("historyFrom").value;
  const to = byId("historyTo").value;
  if (!targetId) {
    renderHistorySummary([
      { label: "KPI", value: "0", note: "Chưa có đối tượng" },
      { label: "Công việc", value: "0", note: "Chưa có dữ liệu" },
      { label: "Quá hạn", value: "0", note: "Chưa có dữ liệu" },
      { label: "Khoảng kỳ", value: "Tất cả", note: "" },
    ]);
    renderHistoryTimeline([]);
    return;
  }

  if (type === "department") {
    const department = departmentById(targetId);
    const people = state.people.filter((person) => person.departmentId === targetId);
    const eligiblePeopleIds = people.filter(isKpiEligiblePerson).map((person) => person.id);
    const departmentEvals = isKpiExemptDepartment(targetId)
      ? []
      : state.departmentEvaluations.filter((item) => item.departmentId === targetId && isPeriodInRange(item.period, from, to));
    const personalEvals = state.evaluations.filter((item) => eligiblePeopleIds.includes(item.personId) && isPeriodInRange(item.period, from, to));
    const tasks = state.tasks.filter((task) => peopleIds.includes(task.ownerId) && isPeriodInRange(taskPeriod(task), from, to));
    const overdue = tasks.filter((task) => getDueStatus(task) === "Quá hạn").length;
    const activityItems = activitiesForHistory(type, targetId, from, to);
    const recordItems = historyTimelineItemsForRecords(
      [
        departmentEvals.flatMap(departmentEvaluationTimelineItems),
        personalEvals.flatMap(evaluationTimelineItems),
        tasks.flatMap(taskTimelineItems),
      ],
      from,
      to,
    );
    renderHistorySummary([
      { label: "KPI phòng TB", value: formatScore(averageScore(departmentEvals)), note: departmentEvals.length ? `${departmentEvals.length} kỳ đã chấm` : "Chưa có KPI phòng" },
      { label: "KPI cá nhân TB", value: formatScore(averageScore(personalEvals)), note: `${personalEvals.length} phiếu cá nhân` },
      { label: "Công việc", value: String(tasks.length), note: `${overdue} quá hạn` },
      { label: "Nhân sự", value: String(people.length), note: department?.name || "" },
    ]);
    renderHistoryTimeline(uniqueTimelineItems([...activityItems, ...recordItems]));
    return;
  }

  const person = personById(targetId);
  const evaluations = isKpiEligiblePerson(person)
    ? state.evaluations.filter((item) => item.personId === targetId && isPeriodInRange(item.period, from, to))
    : [];
  const departmentEvals = isKpiEligiblePerson(person)
    ? state.departmentEvaluations.filter((item) => item.departmentId === person.departmentId && isPeriodInRange(item.period, from, to))
    : [];
  const tasks = state.tasks.filter((task) => task.ownerId === targetId && isPeriodInRange(taskPeriod(task), from, to));
  const overdue = tasks.filter((task) => getDueStatus(task) === "Quá hạn").length;
  const latest = [...evaluations].sort((a, b) => b.period.localeCompare(a.period))[0];
  const activityItems = activitiesForHistory(type, targetId, from, to);
  const recordItems = historyTimelineItemsForRecords(
    [
      evaluations.flatMap(evaluationTimelineItems),
      departmentEvals.flatMap(departmentEvaluationTimelineItems),
      tasks.flatMap(taskTimelineItems),
    ],
    from,
    to,
  );
  renderHistorySummary([
    { label: "KPI cá nhân TB", value: formatScore(averageScore(evaluations)), note: evaluations.length ? `${evaluations.length} kỳ đã chấm` : "Chưa có KPI cá nhân" },
    { label: "KPI mới nhất", value: latest ? formatScore(latest.finalScore) : "0", note: latest?.grade || "Chưa có" },
    { label: "KPI phòng TB", value: formatScore(averageScore(departmentEvals)), note: departmentById(person?.departmentId)?.name || "" },
    { label: "Công việc", value: String(tasks.length), note: `${overdue} quá hạn` },
  ]);
  renderHistoryTimeline(uniqueTimelineItems([...activityItems, ...recordItems]));
}

function renderDashboard(options = {}) {
  byId("dashboardPeriodLabel").textContent = formatMonthPeriod(state.activePeriod || currentMonth());
  const kpiContext = buildDashboardKpiContext(state.activePeriod);
  const visiblePeople = visiblePeopleForEvaluation();
  const visiblePersonIds = new Set(visiblePeople.map((person) => person.id));
  const periodEvaluations = personalEvaluationsForDashboard(state.activePeriod, kpiContext).filter(
    (evaluation) => visiblePersonIds.has(evaluation.personId) && hasRecordedKpiResult(evaluation),
  );
  const avg = averageScore(periodEvaluations);
  const visibleTasks = state.tasks.filter((task) => personById(task.ownerId) && canViewTaskRecord(task));
  const overdue = visibleTasks.filter((task) => getDueStatus(task) === "Quá hạn").length;
  const reward = periodEvaluations.filter((item) => kpiResultScore(item) >= 90 || Number(item.behaviorScore || 0) >= 5).length;
  byId("metricPeople").textContent = visiblePeople.length;
  byId("metricOverdue").textContent = overdue;
  byId("metricAvg").textContent = formatScore(avg);
  byId("metricReward").textContent = reward;
  renderGradeDistribution(periodEvaluations, visiblePeople);

  const ranking = [...periodEvaluations].sort((a, b) => kpiResultScore(b) - kpiResultScore(a)).slice(0, 10);
  byId("rankingList").classList.toggle("empty-state", !ranking.length);
  byId("rankingList").innerHTML = ranking.length
    ? ranking
        .map((evaluation, index) => {
          const person = personById(evaluation.personId);
          if (!person) return "";
          return `<div class="rank-item dashboard-link" data-dashboard-evaluation-detail="${escapeHtml(evaluation.id)}"><span class="rank-no">${index + 1}</span><div><strong>${escapeHtml(person.name)}</strong><br><span class="muted">${escapeHtml(roleById(person.roleId)?.name || "")}</span></div><span class="score">${formatScore(kpiResultScore(evaluation))}</span></div>`;
        })
        .join("")
    : "Chưa có dữ liệu đánh giá.";

  const alerts = [];
  visibleTasks
    .filter((task) => getDueStatus(task) === "Quá hạn")
    .forEach((task) => alerts.push({ text: `Quá hạn: ${task.title} (${personById(task.ownerId)?.name || "chưa rõ"})`, taskId: task.id }));
  visibleTasks
    .filter((task) => taskViolationReasons(task).length)
    .forEach((task) =>
      alerts.push({
        text: `Lỗi công việc: ${task.title} (${personById(task.ownerId)?.name || "chưa rõ"}) - ${taskViolationReasons(task).join("; ")}`,
        taskId: task.id,
      }),
    );
  periodEvaluations
    .filter((item) => kpiResultScore(item) < 70)
    .forEach((item) => alerts.push({ text: `KPI dưới 70: ${personById(item.personId)?.name || "nhân sự đã xóa"} - ${formatScore(kpiResultScore(item))}`, personId: item.personId }));
  visibleDepartmentsForDepartmentEvaluations()
    .map((department) => kpiContext.departmentEvaluationsById.get(department.id))
    .filter((item) => hasRecordedKpiResult(item) && kpiResultScore(item) < 65)
    .forEach((item) => alerts.push({ text: `KPI phòng dưới mức khá: ${departmentById(item.departmentId)?.name || "phòng đã xóa"} - ${formatScore(kpiResultScore(item))}`, departmentId: item.departmentId }));
  byId("alertList").classList.toggle("empty-state", !alerts.length);
  byId("alertList").innerHTML = alerts.length
    ? alerts
        .map((alert) => {
          const attrs = alert.taskId
            ? `data-dashboard-task-detail="${escapeHtml(alert.taskId)}"`
            : alert.personId
              ? `data-dashboard-person-history="${escapeHtml(alert.personId)}"`
              : alert.departmentId
                ? `data-dashboard-department-history="${escapeHtml(alert.departmentId)}"`
                : `data-dashboard-action="${escapeHtml(alert.action || "evaluations")}"`;
          return `<div class="alert-item dashboard-link" ${attrs}><span class="badge bad">Cần xử lý</span><p>${escapeHtml(alert.text)}</p></div>`;
        })
        .join("")
    : "Chưa có cảnh báo.";

  renderDepartmentEffectivenessChart(kpiContext);
  if (options.animate) animateDashboardCharts();
  else finishDashboardChartAnimations();
}

function rolesForRules() {
  const seen = new Set();
  return roles.filter((role) => !isKpiExemptDepartment(role.departmentId)).filter((role) => {
    const criteriaKey = (role.criteria || []).map((criterion) => `${criterion[0]}:${criterion[1]}`).join("|");
    const key = `${role.name}|${criteriaKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderRules() {
  byId("openKpiCatalogManager")?.classList.toggle("is-hidden", !isAdmin());
  byId("rulesCriteria").innerHTML = rolesForRules()
    .map(
      (role) => `
        <article class="rule-role">
          <h4>${role.name}</h4>
          <ul>${role.criteria.map((criterion) => `<li>${criterion[0]}: ${criterion[1]} điểm</li>`).join("")}</ul>
        </article>
      `,
    )
    .join("");
}

let kpiCatalogDraft = null;

function kpiCatalogCriteriaTotal(criteria = []) {
  return (criteria || []).reduce((sum, criterion) => sum + Number(criterion?.[1] || 0), 0);
}

function kpiCatalogCriteriaMarkup(scope, recordId, criteria = []) {
  const rows = criteria.length
    ? criteria.map((criterion, index) => `
      <div class="kpi-catalog-criterion">
        <label>Tên tiêu chí
          <input data-kpi-catalog-criterion-name data-kpi-catalog-scope="${scope}" data-kpi-catalog-record="${escapeHtml(recordId)}" data-kpi-catalog-criterion-index="${index}" value="${escapeHtml(criterion[0])}" maxlength="180">
        </label>
        <label>Trọng số / điểm
          <input data-kpi-catalog-criterion-weight data-kpi-catalog-scope="${scope}" data-kpi-catalog-record="${escapeHtml(recordId)}" data-kpi-catalog-criterion-index="${index}" type="number" min="0" max="120" step="0.01" value="${escapeHtml(criterion[1])}">
        </label>
        <button class="ghost kpi-catalog-delete" data-kpi-catalog-action="remove-criterion" data-kpi-catalog-scope="${scope}" data-kpi-catalog-record="${escapeHtml(recordId)}" data-kpi-catalog-criterion-index="${index}" type="button">Xóa</button>
      </div>
    `).join("")
    : '<p class="kpi-catalog-record-empty">Chưa có tiêu chí.</p>';
  const total = kpiCatalogCriteriaTotal(criteria);
  return `
    <div class="kpi-catalog-criteria">
      <div class="kpi-catalog-criteria-head">
        <span>Tổng trọng số: <strong class="kpi-catalog-total ${total !== 100 && criteria.length ? "is-warning" : ""}" data-kpi-catalog-total="${scope}:${escapeHtml(recordId)}">${formatScore(total)}</strong></span>
        <button class="ghost" data-kpi-catalog-action="add-criterion" data-kpi-catalog-scope="${scope}" data-kpi-catalog-record="${escapeHtml(recordId)}" type="button">Thêm tiêu chí</button>
      </div>
      ${rows}
    </div>
  `;
}

function catalogDepartmentSetting(department) {
  if (department?.leadershipOnly) return "leadership";
  if (department?.kpiExempt) return "kpi-exempt";
  return "standard";
}

function kpiCatalogDepartmentMarkup(department) {
  return `
    <article class="kpi-catalog-record" data-kpi-catalog-card="department:${escapeHtml(department.id)}">
      <div class="kpi-catalog-record-main">
        <label>Tên phòng
          <input data-kpi-catalog-department-name data-kpi-catalog-department-id="${escapeHtml(department.id)}" value="${escapeHtml(department.name)}" maxlength="180">
        </label>
        <label>Thiết lập KPI
          <select data-kpi-catalog-department-setting data-kpi-catalog-department-id="${escapeHtml(department.id)}">
            <option value="standard" ${catalogDepartmentSetting(department) === "standard" ? "selected" : ""}>Áp dụng KPI</option>
            <option value="kpi-exempt" ${catalogDepartmentSetting(department) === "kpi-exempt" ? "selected" : ""}>Miễn đánh giá KPI</option>
            <option value="leadership" ${catalogDepartmentSetting(department) === "leadership" ? "selected" : ""}>Khối lãnh đạo, miễn KPI</option>
          </select>
        </label>
        <button class="ghost kpi-catalog-delete" data-kpi-catalog-action="remove-department" data-kpi-catalog-record="${escapeHtml(department.id)}" type="button">Xóa phòng</button>
      </div>
      <div class="kpi-catalog-criteria kpi-catalog-criteria-locked">
        <div class="kpi-catalog-criteria-head">
          <span>Tiêu chí KPI phòng tự động</span>
          <span>Tổng trọng số: <strong class="kpi-catalog-total">${department.kpiExempt ? "0" : "100"}</strong></span>
        </div>
        <div class="kpi-catalog-criterion">
          <strong>${department.kpiExempt ? "Miễn đánh giá KPI" : departmentCompletionCriterion[0]}</strong>
          <span>${department.kpiExempt ? "" : "Trọng số 100 · Kế hoạch và thực hiện tự tổng hợp từ công việc"}</span>
        </div>
      </div>
    </article>
  `;
}

function kpiCatalogRoleMarkup(role) {
  const departmentOptions = (kpiCatalogDraft?.departments || [])
    .map((department) => `<option value="${escapeHtml(department.id)}" ${role.departmentId === department.id ? "selected" : ""}>${escapeHtml(department.name)}</option>`)
    .join("");
  const accountRoleOptions = [
    ["employee", "Nhân viên"],
    ["section_head", "Trưởng bộ phận/Trưởng nhóm"],
    ["manager", "Trưởng phòng"],
    ["deputy_manager", "Phó phòng"],
    ["director", "Ban giám đốc"],
  ]
    .map(([value, label]) => `<option value="${value}" ${role.accountRole === value ? "selected" : ""}>${label}</option>`)
    .join("");
  return `
    <article class="kpi-catalog-record" data-kpi-catalog-card="role:${escapeHtml(role.id)}">
      <div class="kpi-catalog-record-main">
        <label>Vị trí
          <input data-kpi-catalog-role-name data-kpi-catalog-role-id="${escapeHtml(role.id)}" value="${escapeHtml(role.name)}" maxlength="180">
        </label>
        <label>Thuộc phòng
          <select data-kpi-catalog-role-department data-kpi-catalog-role-id="${escapeHtml(role.id)}">${departmentOptions}</select>
        </label>
        <label>Quyền tài khoản
          <select data-kpi-catalog-role-access data-kpi-catalog-role-id="${escapeHtml(role.id)}">${accountRoleOptions}</select>
        </label>
        <button class="ghost kpi-catalog-delete" data-kpi-catalog-action="remove-role" data-kpi-catalog-record="${escapeHtml(role.id)}" type="button">Xóa vị trí</button>
      </div>
      ${kpiCatalogCriteriaMarkup("role", role.id, role.criteria)}
    </article>
  `;
}

const kpiParameterDefinitions = {
  shared: [
    { key: "completionMax", label: "Giới hạn % hoàn thành", min: 1, max: 300, step: 1 },
    { key: "criterionScale", label: "Hệ số điểm tiêu chí", min: 0, max: 10, step: 0.01 },
  ],
  department: [
    { key: "departmentCriteriaWeight", label: "Hệ số điểm tiêu chí phòng", min: 0, max: 10, step: 0.01 },
    { key: "departmentAdjustmentWeight", label: "Hệ số cộng/trừ thi đua", min: 0, max: 10, step: 0.01 },
  ],
  personal: [
    { key: "personalWeight", label: "Hệ số KPI cá nhân", min: 0, max: 10, step: 0.01 },
    { key: "departmentWeight", label: "Hệ số KPI phòng", min: 0, max: 10, step: 0.01 },
    { key: "behaviorWeight", label: "Hệ số khen thưởng/kỷ luật", min: 0, max: 10, step: 0.01 },
  ],
};

function kpiCatalogParameterFieldMarkup(definition) {
  return `
    <label class="kpi-catalog-parameter-field">${escapeHtml(definition.label)}
      <input data-kpi-catalog-parameter="${definition.key}" type="number" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${escapeHtml(kpiCatalogDraft?.kpiParameters?.[definition.key])}">
    </label>
  `;
}

function kpiCatalogParameterSectionMarkup(title, description, parameterDefinitions = []) {
  return `
    <section class="kpi-catalog-section kpi-catalog-parameter-section">
      <div class="kpi-catalog-section-head">
        <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>
      </div>
      <div class="kpi-catalog-parameter-grid">${parameterDefinitions.map(kpiCatalogParameterFieldMarkup).join("")}</div>
    </section>
  `;
}

function renderKpiCatalogManager() {
  const container = byId("kpiCatalogManagerContent");
  if (!container || !kpiCatalogDraft) return;
  const departmentRecords = kpiCatalogDraft.departments.map(kpiCatalogDepartmentMarkup).join("") || '<p class="kpi-catalog-record-empty">Chưa có phòng.</p>';
  const roleRecords = kpiCatalogDraft.roles.map(kpiCatalogRoleMarkup).join("") || '<p class="kpi-catalog-record-empty">Chưa có vị trí.</p>';
  const behaviorRows = kpiCatalogDraft.behaviorRules.length
    ? kpiCatalogDraft.behaviorRules.map((rule, index) => `
      <div class="kpi-catalog-behavior-row">
        <label>Danh mục
          <input data-kpi-catalog-behavior-name data-kpi-catalog-behavior-index="${index}" value="${escapeHtml(rule[0])}" maxlength="180">
        </label>
        <label>Điểm mỗi lần (+/-)
          <input data-kpi-catalog-behavior-points data-kpi-catalog-behavior-index="${index}" type="number" min="-120" max="120" step="0.01" value="${escapeHtml(rule[1])}">
        </label>
        <button class="ghost kpi-catalog-delete" data-kpi-catalog-action="remove-behavior" data-kpi-catalog-behavior-index="${index}" type="button">Xóa</button>
      </div>
    `).join("")
    : '<p class="kpi-catalog-record-empty">Chưa có danh mục khen thưởng, kỷ luật hoặc tác phong.</p>';
  const departmentFormulaSection = kpiCatalogParameterSectionMarkup(
    "Công thức KPI phòng",
    "Điều chỉnh trực quan các hệ số đang áp dụng để tính KPI phòng.",
    [...kpiParameterDefinitions.shared, ...kpiParameterDefinitions.department],
  );
  const personalFormulaSection = kpiCatalogParameterSectionMarkup(
    "Công thức KPI cá nhân",
    "Điều chỉnh trực quan các hệ số đang áp dụng để tính KPI cá nhân.",
    [...kpiParameterDefinitions.personal, kpiParameterDefinitions.shared[0]],
  );
  container.innerHTML = `
    ${departmentFormulaSection}
    ${personalFormulaSection}
    <section class="kpi-catalog-section">
      <div class="kpi-catalog-section-head">
        <div><h3>Phòng và tiêu chí KPI phòng</h3><p>Quản lý phòng, mức áp dụng KPI và chỉ tiêu chấm điểm của từng phòng.</p></div>
        <button data-kpi-catalog-action="add-department" type="button">Thêm phòng</button>
      </div>
      <div class="kpi-catalog-records">${departmentRecords}</div>
    </section>
    <section class="kpi-catalog-section">
      <div class="kpi-catalog-section-head">
        <div><h3>Vị trí và Danh mục KPI cá nhân</h3><p>Mỗi vị trí có bộ tiêu chí và trọng số riêng.</p></div>
        <button data-kpi-catalog-action="add-role" type="button">Thêm vị trí</button>
      </div>
      <div class="kpi-catalog-records">${roleRecords}</div>
    </section>
    <section class="kpi-catalog-section">
      <div class="kpi-catalog-section-head">
        <div><h3>Khen thưởng, kỷ luật, tác phong</h3><p>Dùng số dương để cộng điểm và số âm để trừ điểm cho mỗi lần ghi nhận.</p></div>
        <button data-kpi-catalog-action="add-behavior" type="button">Thêm danh mục</button>
      </div>
      <div class="kpi-catalog-records">${behaviorRows}</div>
    </section>
  `;
}

function setKpiCatalogNotice(message = "", isError = false) {
  const notice = byId("kpiCatalogManagerNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.classList.toggle("is-visible", Boolean(message));
  notice.classList.toggle("is-error", Boolean(message) && isError);
}

function kpiCatalogDraftRecord(scope, recordId) {
  if (scope === "department") return kpiCatalogDraft?.departments.find((item) => item.id === recordId) || null;
  if (scope === "role") return kpiCatalogDraft?.roles.find((item) => item.id === recordId) || null;
  return null;
}

function updateKpiCatalogDraftInput(input) {
  if (!kpiCatalogDraft || !input) return;
  const departmentId = input.dataset.kpiCatalogDepartmentId;
  const roleId = input.dataset.kpiCatalogRoleId;
  const criterionScope = input.dataset.kpiCatalogScope;
  const criterionRecordId = input.dataset.kpiCatalogRecord;
  const criterionIndex = Number(input.dataset.kpiCatalogCriterionIndex);
  const behaviorIndex = Number(input.dataset.kpiCatalogBehaviorIndex);
  const parameterKey = input.dataset.kpiCatalogParameter;
  if (input.matches("[data-kpi-catalog-parameter]") && hasOwnValue(kpiCatalogDraft.kpiParameters, parameterKey)) {
    const parameter = [...kpiParameterDefinitions.shared, ...kpiParameterDefinitions.department, ...kpiParameterDefinitions.personal]
      .find((definition) => definition.key === parameterKey);
    if (parameter) {
      kpiCatalogDraft.kpiParameters[parameterKey] = numberWithin(input.value, parameter.min, parameter.max, defaultKpiParameters[parameterKey]);
    }
  } else if (input.matches("[data-kpi-catalog-department-name]")) {
    const department = kpiCatalogDraft.departments.find((item) => item.id === departmentId);
    if (department) department.name = input.value;
  } else if (input.matches("[data-kpi-catalog-department-setting]")) {
    const department = kpiCatalogDraft.departments.find((item) => item.id === departmentId);
    if (department) {
      department.leadershipOnly = input.value === "leadership";
      department.kpiExempt = input.value !== "standard";
    }
  } else if (input.matches("[data-kpi-catalog-role-name]")) {
    const role = kpiCatalogDraft.roles.find((item) => item.id === roleId);
    if (role) role.name = input.value;
  } else if (input.matches("[data-kpi-catalog-role-department]")) {
    const role = kpiCatalogDraft.roles.find((item) => item.id === roleId);
    if (role) role.departmentId = input.value;
  } else if (input.matches("[data-kpi-catalog-role-access]")) {
    const role = kpiCatalogDraft.roles.find((item) => item.id === roleId);
    if (role) role.accountRole = input.value;
  } else if (input.matches("[data-kpi-catalog-criterion-name], [data-kpi-catalog-criterion-weight]")) {
    const record = kpiCatalogDraftRecord(criterionScope, criterionRecordId);
    if (record?.criteria?.[criterionIndex]) {
      if (input.matches("[data-kpi-catalog-criterion-name]")) record.criteria[criterionIndex][0] = input.value;
      else record.criteria[criterionIndex][1] = input.value;
    }
  } else if (input.matches("[data-kpi-catalog-behavior-name]") && kpiCatalogDraft.behaviorRules[behaviorIndex]) {
    kpiCatalogDraft.behaviorRules[behaviorIndex][0] = input.value;
  } else if (input.matches("[data-kpi-catalog-behavior-points]") && kpiCatalogDraft.behaviorRules[behaviorIndex]) {
    kpiCatalogDraft.behaviorRules[behaviorIndex][1] = input.value;
  } else {
    return;
  }
  refreshKpiCatalogTotals();
}

function refreshKpiCatalogTotals() {
  if (!kpiCatalogDraft) return;
  document.querySelectorAll("[data-kpi-catalog-total]").forEach((element) => {
    const [scope, recordId] = String(element.dataset.kpiCatalogTotal || "").split(":");
    const record = kpiCatalogDraftRecord(scope, recordId);
    const total = kpiCatalogCriteriaTotal(record?.criteria || []);
    element.textContent = formatScore(total);
    element.classList.toggle("is-warning", Boolean(record?.criteria?.length) && total !== 100);
  });
}

function kpiCatalogReferenceError(nextDepartments, nextRoles) {
  const departmentIds = new Set(nextDepartments.map((department) => department.id));
  const roleByIdMap = new Map(nextRoles.map((role) => [role.id, role]));
  const missingPersonDepartment = state.people.find((person) => !departmentIds.has(person.departmentId));
  if (missingPersonDepartment) return `Không thể xóa phòng đang gắn với nhân sự ${missingPersonDepartment.name}. Hãy chuyển nhân sự sang phòng khác trước.`;
  const missingPersonRole = state.people.find((person) => !roleByIdMap.has(person.roleId));
  if (missingPersonRole) return `Không thể xóa vị trí đang gắn với nhân sự ${missingPersonRole.name}. Hãy cập nhật vị trí nhân sự trước.`;
  const missingDepartmentEvaluation = state.departmentEvaluations.find((evaluation) => !departmentIds.has(evaluation.departmentId));
  if (missingDepartmentEvaluation) return "Không thể xóa phòng đã có dữ liệu KPI phòng. Dữ liệu lịch sử cần được giữ nguyên.";
  const invalidRole = nextRoles.find((role) => !departmentIds.has(role.departmentId));
  if (invalidRole) return `Vị trí "${invalidRole.name}" chưa được gán phòng hợp lệ.`;
  return "";
}

function kpiCatalogValidationError(draft) {
  if (!draft?.departments?.length) return "Cần có ít nhất một phòng trong danh mục.";
  if (!draft?.roles?.length) return "Cần có ít nhất một vị trí trong danh mục.";
  const duplicate = (items, valueFor) => {
    const values = new Set();
    return items.some((item) => {
      const value = catalogText(valueFor(item)).toLocaleLowerCase("vi");
      if (!value || values.has(value)) return true;
      values.add(value);
      return false;
    });
  };
  if (duplicate(draft.departments, (department) => department.name)) return "Tên phòng không được để trống hoặc trùng lặp.";
  if (duplicate(draft.roles, (role) => `${role.departmentId}|${role.name}`)) return "Tên vị trí trong cùng một phòng không được để trống hoặc trùng lặp.";
  if (duplicate(draft.behaviorRules, (rule) => rule?.[0])) return "Danh mục khen thưởng, kỷ luật, tác phong không được để trống hoặc trùng lặp.";
  for (const record of [...draft.departments, ...draft.roles]) {
    if (duplicate(record.criteria || [], (criterion) => criterion?.[0])) return `Tiêu chí của "${catalogText(record.name)}" không được để trống hoặc trùng lặp.`;
  }
  return "";
}

function remapKpiIndexedValues(values, previousCriteria = [], nextCriteria = []) {
  if (!values || typeof values !== "object") return values;
  const nextIndexesByName = new Map(nextCriteria.map((criterion, index) => [String(criterion?.[0] || ""), index]));
  const output = {};
  const matched = new Set();
  Object.entries(values).forEach(([index, value]) => {
    const oldIndex = Number(index);
    const name = String(previousCriteria[oldIndex]?.[0] || "");
    const nextIndex = nextIndexesByName.get(name);
    if (Number.isInteger(nextIndex)) {
      output[nextIndex] = value;
      matched.add(oldIndex);
    }
  });
  if (previousCriteria.length === nextCriteria.length) {
    Object.entries(values).forEach(([index, value]) => {
      const oldIndex = Number(index);
      if (!matched.has(oldIndex) && Number.isInteger(oldIndex) && nextCriteria[oldIndex]) output[oldIndex] = value;
    });
  }
  return output;
}

function remapKpiIndexedArray(values, previousCriteria = [], nextCriteria = []) {
  if (!Array.isArray(values)) return values;
  const mapped = remapKpiIndexedValues(Object.fromEntries(values.map((value, index) => [index, value])), previousCriteria, nextCriteria);
  return Object.keys(mapped).sort((left, right) => Number(left) - Number(right)).map((key) => mapped[key]);
}

function migrateKpiCatalogHistory(previousConfig, nextConfig) {
  const previousRoles = new Map(previousConfig.roles.map((role) => [role.id, role]));
  const nextRoles = new Map(nextConfig.roles.map((role) => [role.id, role]));
  const previousDepartments = new Map(previousConfig.departments.map((department) => [department.id, department]));
  const nextDepartments = new Map(nextConfig.departments.map((department) => [department.id, department]));
  state.evaluations = state.evaluations.map((evaluation) => {
    const roleId = personById(evaluation.personId)?.roleId;
    const previousRole = previousRoles.get(roleId);
    const nextRole = nextRoles.get(roleId);
    const remap = (value) => remapKpiIndexedValues(value, previousRole?.criteria, nextRole?.criteria);
    return {
      ...evaluation,
      criteriaScores: remap(evaluation.criteriaScores),
      criteriaResults: remapKpiIndexedArray(evaluation.criteriaResults, previousRole?.criteria, nextRole?.criteria),
      behavior: remapKpiIndexedValues(evaluation.behavior, previousConfig.behaviorRules, nextConfig.behaviorRules),
      behaviorManual: remapKpiIndexedValues(evaluation.behaviorManual, previousConfig.behaviorRules, nextConfig.behaviorRules),
      behaviorAutomatic: remapKpiIndexedValues(evaluation.behaviorAutomatic, previousConfig.behaviorRules, nextConfig.behaviorRules),
    };
  });
  state.departmentEvaluations = state.departmentEvaluations.map((evaluation) => {
    const previousDepartment = previousDepartments.get(evaluation.departmentId);
    const nextDepartment = nextDepartments.get(evaluation.departmentId);
    return {
      ...evaluation,
      criteriaScores: remapKpiIndexedValues(evaluation.criteriaScores, previousDepartment?.criteria, nextDepartment?.criteria),
      criteriaResults: remapKpiIndexedArray(evaluation.criteriaResults, previousDepartment?.criteria, nextDepartment?.criteria),
    };
  });
}

function createKpiCatalogDraft() {
  const customization = normalizeSystemCustomization(state.systemCustomization);
  return {
    departments: cloneKpiCatalog(state.departments),
    // Use the effective runtime catalog so the Admin always sees the current
    // Trưởng bộ phận/Trưởng nhóm criteria, including before the server marker
    // has been upgraded.
    roles: cloneKpiCatalog(roles),
    behaviorRules: cloneKpiCatalog(state.behaviorRules),
    kpiParameters: cloneKpiCatalog(customization.kpiParameters),
  };
}

async function openKpiCatalogManager() {
  if (!isAdmin()) return;
  if (sharedSync.session && sharedSync.available === true && !sharedSync.dirty && !sharedSync.inFlight) {
    try {
      const { response, payload } = await sharedJsonRequest("state", {
        query: sharedSync.revision === null ? {} : { revision: String(sharedSync.revision) },
      });
      if (response.ok && payload?.state && Number(payload.revision) !== sharedSync.revision) {
        sharedSync.revision = Number(payload.revision) || sharedSync.revision;
        sharedSync.initialized = sharedSync.revision > 0;
        await adoptSharedState(payload.state, { render: false });
      }
    } catch {
      // The current local catalog remains usable while the connection is unavailable.
    }
  }
  kpiCatalogDraft = createKpiCatalogDraft();
  setKpiCatalogNotice();
  renderKpiCatalogManager();
  openModal("kpiCatalogManagerDialog");
}

function resetKpiCatalogManager() {
  if (!isAdmin()) return;
  kpiCatalogDraft = createKpiCatalogDraft();
  setKpiCatalogNotice("Đã khôi phục bản danh mục đang áp dụng.");
  renderKpiCatalogManager();
}

async function saveKpiCatalogManager() {
  if (!isAdmin() || !kpiCatalogDraft) return;
  const validationError = kpiCatalogValidationError(kpiCatalogDraft);
  if (validationError) {
    setKpiCatalogNotice(validationError, true);
    return;
  }
  const nextConfig = {
    departments: normalizeDepartmentsCatalog(kpiCatalogDraft.departments),
    roles: normalizeRolesCatalog(kpiCatalogDraft.roles),
    behaviorRules: normalizeBehaviorRulesCatalog(kpiCatalogDraft.behaviorRules),
  };
  const referenceError = kpiCatalogReferenceError(nextConfig.departments, nextConfig.roles);
  if (referenceError) {
    setKpiCatalogNotice(referenceError, true);
    return;
  }
  const previousConfig = {
    departments: cloneKpiCatalog(state.departments),
    roles: cloneKpiCatalog(state.roles),
    behaviorRules: cloneKpiCatalog(state.behaviorRules),
  };
  migrateKpiCatalogHistory(previousConfig, nextConfig);
  state.departments = nextConfig.departments;
  state.roles = nextConfig.roles;
  state.behaviorRules = nextConfig.behaviorRules;
  state.systemCustomization = normalizeSystemCustomization({
    ...state.systemCustomization,
    kpiParameters: kpiCatalogDraft.kpiParameters,
  });
  applyRuntimeKpiCatalogs(state);
  recalculateSavedPersonalEvaluationScores();
  logActivity({
    action: "Cập nhật",
    module: "Quy chế",
    targetType: "kpi-catalog",
    targetId: "kpi-catalog",
    title: "Danh mục KPI và Nhân sự",
    details: `Phòng: ${state.departments.length}; vị trí: ${state.roles.length}; danh mục khen thưởng/kỷ luật: ${state.behaviorRules.length}; đã cập nhật các hệ số công thức KPI.`,
  });
  saveState();
  const saveButton = byId("saveKpiCatalogManager");
  if (saveButton) saveButton.disabled = true;
  setKpiCatalogNotice("Đang lưu danh mục và kiểm tra dữ liệu đồng bộ...");
  try {
    if (sharedSync.session && !isOfflineFileRuntime()) {
      const syncResult = await flushSharedStateSync();
      if (syncResult?.denied?.length || syncResult?.conflict) {
        kpiCatalogDraft = createKpiCatalogDraft();
        renderAll();
        renderKpiCatalogManager();
        setKpiCatalogNotice("Một số mục vừa được thay đổi đồng thời trên thiết bị khác. Hệ thống đã giữ dữ liệu hợp lệ mới nhất; hãy kiểm tra lại mục đang chỉnh sửa trước khi lưu.", true);
        return;
      }
      if (!syncResult?.ok && syncResult?.reason === "offline") {
        kpiCatalogDraft = createKpiCatalogDraft();
        setKpiCatalogNotice("Đã lưu danh mục trên thiết bị này. Hệ thống sẽ tự đồng bộ khi kết nối máy chủ được khôi phục.");
        renderAll();
        renderKpiCatalogManager();
        return;
      }
      if (!syncResult?.ok) {
        kpiCatalogDraft = createKpiCatalogDraft();
        renderAll();
        renderKpiCatalogManager();
        setKpiCatalogNotice("Chưa thể xác nhận lưu trên máy chủ. Danh mục được giữ trên thiết bị này và sẽ tự đồng bộ khi có kết nối.", true);
        return;
      }
    }
    kpiCatalogDraft = createKpiCatalogDraft();
    setKpiCatalogNotice("Đã lưu danh mục. Dữ liệu mới sẽ được đồng bộ tới các tài khoản theo phân quyền.");
    renderAll();
    renderKpiCatalogManager();
  } finally {
    const currentSaveButton = byId("saveKpiCatalogManager");
    if (currentSaveButton) currentSaveButton.disabled = false;
  }
}

const supportRequestStatusLabels = {
  "Mới": "Mới",
  "Đang xử lý": "Đang xử lý",
  "Đã hỗ trợ": "Đã hỗ trợ",
  "Đã đóng": "Đã đóng",
};

function supportRequestMessages(request) {
  return Array.isArray(request?.messages)
    ? request.messages.filter((message) => message && typeof message === "object")
    : [];
}

function supportRequestStatusClass(status) {
  if (status === "Đã hỗ trợ") return "good";
  if (status === "Đã đóng") return "";
  if (status === "Đang xử lý") return "warn";
  return "bad";
}

function supportRequestPriorityClass(priority) {
  if (priority === "Khẩn cấp") return "bad";
  if (priority === "Cần hỗ trợ sớm") return "warn";
  return "";
}

function visibleSupportRequests() {
  const account = currentAccount();
  if (!account) return [];
  const ownId = String(account.id || "");
  return [...(state.supportRequests || [])]
    .filter((request) => isAdmin() || String(request?.createdById || "") === ownId)
    .sort((left, right) => {
      const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime() || 0;
      const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime() || 0;
      return rightTime - leftTime;
    });
}

function supportMessagePayload(text, kind) {
  const actor = currentActorInfo();
  return {
    id: uid("support-message"),
    text: String(text || "").trim(),
    kind,
    createdAt: new Date().toISOString(),
    createdBy: actor.name,
    createdById: actor.id,
    createdByRole: actor.role,
  };
}

function renderHelpSupportBadge() {
  const badge = byId("helpSupportBadge");
  const mobileBadge = byId("mobileHelpSupportBadge");
  const pendingCount = isAdmin()
    ? (state.supportRequests || []).filter((request) => String(request?.status || "Mới") === "Mới").length
    : 0;
  [badge, mobileBadge].forEach((element) => {
    if (!element) return;
    element.textContent = pendingCount > 99 ? "99+" : String(pendingCount);
    element.classList.toggle("is-hidden", pendingCount === 0);
  });
}

function renderHelpRequestMessages(request) {
  const messages = supportRequestMessages(request);
  if (!messages.length) return '<p class="muted">Chưa có nội dung trao đổi.</p>';
  return messages
    .map((message) => {
      const isAdminMessage = String(message.kind || "") === "admin" || String(message.createdByRole || "") === "admin";
      return `
        <div class="support-message ${isAdminMessage ? "is-admin" : ""}">
          <div class="support-message-meta">
            <strong>${escapeHtml(message.createdBy || "Tài khoản")}</strong>
            <span>${escapeHtml(formatDateTime(message.createdAt))}</span>
          </div>
          <p>${escapeHtml(message.text || message.content || "").replace(/\n/g, "<br>")}</p>
        </div>
      `;
    })
    .join("");
}

function renderSupportRequestCard(request) {
  const status = supportRequestStatusLabels[request.status] || request.status || "Mới";
  const messages = renderHelpRequestMessages(request);
  const canReply = isAdmin() || (String(request.createdById || "") === String(currentAccount()?.id || "") && status !== "Đã đóng");
  const adminControls = isAdmin()
    ? `
      <form class="support-admin-form" data-support-admin-form="${escapeHtml(request.id)}">
        <label>Trạng thái
          <select name="status">
            ${Object.keys(supportRequestStatusLabels)
              .map((option) => `<option value="${escapeHtml(option)}" ${option === status ? "selected" : ""}>${escapeHtml(option)}</option>`)
              .join("")}
          </select>
        </label>
        <label>Phản hồi của Admin
          <textarea name="message" rows="3" maxlength="4000" placeholder="Nhập hướng dẫn hoặc kết quả xử lý..."></textarea>
        </label>
        <div class="support-admin-actions">
          <button type="submit">Cập nhật hỗ trợ</button>
          <button class="ghost danger-action" data-delete-support-request="${escapeHtml(request.id)}" type="button">Xóa yêu cầu</button>
        </div>
      </form>
    `
    : canReply
      ? `
        <form class="support-user-form" data-support-user-form="${escapeHtml(request.id)}">
          <label>Bổ sung thông tin
            <textarea name="message" rows="3" maxlength="4000" required placeholder="Bổ sung thông tin hoặc phản hồi kết quả hỗ trợ..."></textarea>
          </label>
          <button class="ghost" type="submit">Gửi bổ sung</button>
        </form>
      `
      : '<p class="support-closed-note">Yêu cầu đã được đóng. Liên hệ Admin để mở lại khi cần.</p>';
  return `
    <article class="support-request-card" data-support-request-id="${escapeHtml(request.id)}">
      <header class="support-request-header">
        <div>
          <div class="support-request-tags">
            <span class="badge ${supportRequestStatusClass(status)}">${escapeHtml(status)}</span>
            <span class="badge ${supportRequestPriorityClass(request.priority)}">${escapeHtml(request.priority || "Bình thường")}</span>
            <span class="support-request-category">${escapeHtml(request.category || "Khác")}</span>
          </div>
          <h4>${escapeHtml(request.title || "Yêu cầu hỗ trợ")}</h4>
        </div>
        <div class="support-request-owner">
          <strong>${escapeHtml(request.createdBy || "Tài khoản")}</strong>
          <span>${escapeHtml(formatDateTime(request.createdAt))}</span>
        </div>
      </header>
      <div class="support-message-list">${messages}</div>
      ${adminControls}
    </article>
  `;
}

function renderSupportRequestLine(request) {
  const status = supportRequestStatusLabels[request.status] || request.status || "Mới";
  const updatedAt = request.updatedAt || request.createdAt;
  return `
    <button class="support-request-line" type="button" data-open-support-request="${escapeHtml(request.id)}">
      <span class="support-request-line-status badge ${supportRequestStatusClass(status)}">${escapeHtml(status)}</span>
      <span class="support-request-line-main">
        <strong>${escapeHtml(request.title || "Yêu cầu hỗ trợ")}</strong>
        <span>${escapeHtml(request.category || "Khác")} · Cập nhật ${escapeHtml(formatDateTime(updatedAt))}</span>
      </span>
      <span class="support-request-line-meta">
        <span class="badge ${supportRequestPriorityClass(request.priority)}">${escapeHtml(request.priority || "Bình thường")}</span>
        <span class="support-request-line-open" aria-hidden="true">›</span>
      </span>
    </button>
  `;
}

let openSupportRequestId = "";

function renderSupportRequestDialog(requestId = openSupportRequestId) {
  const request = visibleSupportRequests().find((item) => item.id === requestId);
  if (!request) {
    closeSupportRequestDialog();
    return;
  }
  openSupportRequestId = request.id;
  byId("supportRequestDetailTitle").textContent = request.title || "Yêu cầu hỗ trợ";
  byId("supportRequestDetailContent").innerHTML = renderSupportRequestCard(request);
}

function openSupportRequestDialog(requestId) {
  const request = visibleSupportRequests().find((item) => item.id === requestId);
  if (!request) return;
  openSupportRequestId = request.id;
  renderSupportRequestDialog(request.id);
  openModal("supportRequestDialog");
}

function closeSupportRequestDialog() {
  openSupportRequestId = "";
  closeModal("supportRequestDialog");
}

function renderHelpView() {
  const requests = visibleSupportRequests();
  const admin = isAdmin();
  byId("supportRequestSummary").textContent = admin
    ? `${requests.filter((request) => String(request.status || "Mới") === "Mới").length} yêu cầu mới`
    : `${requests.length} yêu cầu`;
  byId("supportRequestListTitle").textContent = admin ? "Yêu cầu hỗ trợ" : "Yêu cầu của bạn";
  byId("supportRequestList").innerHTML = requests.length
    ? requests.map(renderSupportRequestLine).join("")
    : '<div class="empty-state">Chưa có yêu cầu hỗ trợ. Khi gặp vấn đề, hãy gửi yêu cầu để Admin theo dõi và phản hồi.</div>';
  renderHelpSupportBadge();
}

function resetSupportRequestForm() {
  byId("supportRequestForm")?.reset();
}

function createSupportRequest() {
  const title = String(byId("supportRequestTitle")?.value || "").trim();
  const messageText = String(byId("supportRequestMessage")?.value || "").trim();
  if (!title || !messageText) {
    alert("Vui lòng nhập tiêu đề và nội dung cần hỗ trợ.");
    return;
  }
  const record = applyRecordAudit(
    {
      id: uid("support-request"),
      title,
      category: String(byId("supportRequestCategory")?.value || "Khác"),
      priority: String(byId("supportRequestPriority")?.value || "Bình thường"),
      status: "Mới",
      messages: [supportMessagePayload(messageText, "request")],
    },
    null,
  );
  state.supportRequests = [record, ...(state.supportRequests || [])];
  logActivity({
    action: "Gửi yêu cầu hỗ trợ",
    module: "Trợ giúp",
    targetType: "support-request",
    targetId: record.id,
    title,
    details: `Nhóm vấn đề: ${record.category}. Mức độ: ${record.priority}.`,
  });
  resetSupportRequestForm();
  saveState();
  renderAll();
  if (openSupportRequestId === requestId && !byId("supportRequestDialog").classList.contains("is-hidden")) {
    renderSupportRequestDialog(requestId);
  }
}

function updateSupportRequest(requestId, messageText, nextStatus = "") {
  const index = (state.supportRequests || []).findIndex((request) => request.id === requestId);
  if (index < 0) return;
  const request = state.supportRequests[index];
  const isOwner = String(request.createdById || "") === String(currentAccount()?.id || "");
  if (!isAdmin() && (!isOwner || request.status === "Đã đóng")) {
    alert("Bạn không còn quyền cập nhật yêu cầu hỗ trợ này.");
    return;
  }
  const text = String(messageText || "").trim();
  const status = isAdmin() ? (supportRequestStatusLabels[nextStatus] ? nextStatus : request.status || "Mới") : request.status || "Mới";
  if (!text && status === (request.status || "Mới")) {
    alert("Vui lòng nhập phản hồi hoặc thay đổi trạng thái yêu cầu.");
    return;
  }
  const messages = [...supportRequestMessages(request)];
  if (text) messages.push(supportMessagePayload(text, isAdmin() ? "admin" : "reporter"));
  const updated = applyRecordAudit({ ...request, status, messages }, request);
  state.supportRequests = state.supportRequests.map((item) => (item.id === requestId ? updated : item));
  logActivity({
    action: isAdmin() ? "Cập nhật hỗ trợ" : "Bổ sung yêu cầu hỗ trợ",
    module: "Trợ giúp",
    targetType: "support-request",
    targetId: requestId,
    title: updated.title || "Yêu cầu hỗ trợ",
    details: isAdmin() ? `Trạng thái: ${status}.` : "Đã bổ sung thông tin cho yêu cầu hỗ trợ.",
  });
  saveState();
  renderAll();
}

function deleteSupportRequest(requestId) {
  if (!isAdmin()) return;
  const request = (state.supportRequests || []).find((item) => item.id === requestId);
  if (!request) return;
  if (!confirm(`Xóa yêu cầu hỗ trợ "${request.title || "Chưa có tiêu đề"}"? Toàn bộ nội dung trao đổi sẽ bị xóa trên hệ thống.`)) return;
  registerDeletedId(requestId);
  state.supportRequests = state.supportRequests.filter((item) => item.id !== requestId);
  logActivity({
    action: "Xóa",
    module: "Trợ giúp",
    targetType: "support-request",
    targetId: requestId,
    title: request.title || "Yêu cầu hỗ trợ",
    details: `Xóa yêu cầu hỗ trợ của ${request.createdBy || "tài khoản"}.`,
  });
  closeSupportRequestDialog();
  saveState();
  renderAll();
}

function todayInputDate() {
  const date = new Date();
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function bulletinStatusLabel(status) {
  return bulletinStatusLabels[status] || bulletinStatusLabels.published;
}

function isVotingBulletinCategory(category) {
  const text = normalizeSearchText(category);
  return text.includes("chuong trinh binh chon") || text.includes("chuong trinh binh tron");
}

function isVotingBulletin(post) {
  return isVotingBulletinCategory(post?.category);
}

function parseBulletinVoteOptions(text, existingOptions = []) {
  const existingList = Array.isArray(existingOptions) ? existingOptions : [];
  const existingByLabel = new Map(
    existingList.map((option) => [normalizeSearchText(option.label), option.id]).filter(([label]) => label),
  );
  const seen = new Set();
  const labels = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((label) => {
      const key = normalizeSearchText(label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return labels.map((label, index) => {
    const key = normalizeSearchText(label);
    return { id: existingByLabel.get(key) || existingList[index]?.id || uid("bulletin-vote-option"), label };
  });
}

function bulletinVoteEnded(post) {
  if (!post?.voteEndsAt) return false;
  const endsAt = new Date(post.voteEndsAt);
  return !Number.isNaN(endsAt.getTime()) && Date.now() > endsAt.getTime();
}

function currentBulletinVote(post) {
  const accountId = currentAccount()?.id;
  if (!accountId) return null;
  return (post?.votes || []).find((vote) => vote.accountId === accountId) || null;
}

function bulletinVoteOptionIds(vote) {
  if (Array.isArray(vote?.optionIds)) return vote.optionIds.filter(Boolean);
  return vote?.optionId ? [vote.optionId] : [];
}

function bulletinVoteLimit(post) {
  const options = Array.isArray(post?.voteOptions) ? post.voteOptions : [];
  if (!options.length) return 1;
  return clamp(Math.trunc(Number(post?.voteLimit) || 1), 1, options.length);
}

function bulletinVoteCounts(post) {
  const counts = new Map((post?.voteOptions || []).map((option) => [option.id, 0]));
  (post?.votes || []).forEach((vote) => {
    bulletinVoteOptionIds(vote).forEach((optionId) => {
      if (counts.has(optionId)) counts.set(optionId, counts.get(optionId) + 1);
    });
  });
  return counts;
}

function visibleBulletins() {
  const posts = Array.isArray(state.bulletins) ? state.bulletins : [];
  if (isAdmin()) return posts;
  const accountId = currentAccount()?.id;
  return posts.filter((post) => post.status !== "draft" || (accountId && post.createdById === accountId));
}

function bulletinSortValue(post) {
  return [post.publishDate || "", post.updatedAt || "", post.createdAt || "", post.id || ""].join("|");
}

function bulletinMatchesFilters(post, search, category) {
  if (category && post.category !== category && !(isVotingBulletinCategory(category) && isVotingBulletinCategory(post.category))) return false;
  if (!search) return true;
  const mediaNames = (post.media || []).map((file) => file.name).join(" ");
  const voteOptions = (post.voteOptions || []).map((option) => option.label).join(" ");
  const haystack = normalizeSearchText([post.title, post.category, post.content, voteOptions, mediaNames, post.updatedBy, post.createdBy].filter(Boolean).join(" "));
  return haystack.includes(search);
}

function bulletinMediaByKey(key) {
  const draft = bulletinMediaDraft.find((file) => storedFileKey(file) === key);
  if (draft) return draft;
  for (const post of state.bulletins || []) {
    const found = (post.media || []).find((file) => storedFileKey(file) === key);
    if (found) return found;
  }
  return null;
}

// 🔥 TỰ ĐỘNG GIẢI MÃ VÀ HIỂN THỊ NÉT CĂNG HÌNH ẢNH/MEDIA TRÊN BẢNG TIN
async function hydrateBulletinMediaElements(root = document) {
    if (!root) return;
    const elements = Array.from(root.querySelectorAll("[data-bulletin-media-key]"));
    
    await Promise.all(
        elements.map(async (element) => {
            if (element.dataset.mediaReady === "true") return;
            const key = element.dataset.bulletinMediaKey;
            const file = bulletinMediaByKey(key);
            if (!file) return;

            try {
                // Ưu tiên lấy dataUrl có sẵn, nếu không có mới móc từ IndexedDB ra
                let dataUrl = file.dataUrl || await readStoredFileDataUrl(file);
                if (!dataUrl) return;

                const displayUrl = storedFileDisplayUrl(file, dataUrl);
                if (element.tagName === "A") element.href = displayUrl;
                else if (element.tagName === "OBJECT") element.data = displayUrl;
                else if (element.tagName === "IMG" || element.tagName === "VIDEO" || element.tagName === "AUDIO") {
                    element.src = displayUrl;
                }
                element.dataset.mediaReady = "true";
                element.classList.remove("is-loading-media");
            } catch (err) {
                console.warn("⚠️ Chưa thể nạp media cho key:", key, err);
            }
        })
    );
}

function renderBulletinMedia(media = []) {
  if (!media.length) return "";
  return `
    <div class="bulletin-media-grid">
      ${media
        .map((file) => {
          const kind = file.kind || mediaKindFromType(file.type) || mediaKindFromFile(file);
          const source = escapeHtml(file.dataUrl || "");
          const sourceAttr = source ? ` src="${source}"` : "";
          const objectDataAttr = source ? ` data="${source}"` : "";
          const key = escapeHtml(storedFileKey(file));
          const name = escapeHtml(file.name || "Media");
          const mediaAttrs = `data-bulletin-media-key="${key}"`;
          if (kind === "image") {
            return `<figure class="bulletin-media-item"><img${sourceAttr} ${mediaAttrs} alt="${name}" loading="lazy"></figure>`;
          }
          if (kind === "video") {
            return `<figure class="bulletin-media-item"><video${sourceAttr} ${mediaAttrs} controls preload="metadata"></video></figure>`;
          }
          if (kind === "audio") {
            return `<figure class="bulletin-media-item is-audio"><audio${sourceAttr} ${mediaAttrs} controls preload="metadata"></audio></figure>`;
          }
          if (kind === "pdf") {
            return `
              <figure class="bulletin-media-item is-pdf">
                <object class="bulletin-pdf-viewer"${objectDataAttr} ${mediaAttrs} type="application/pdf" aria-label="${name}">
                  <embed class="bulletin-pdf-viewer"${sourceAttr} ${mediaAttrs} type="application/pdf">
                  <span class="bulletin-pdf-fallback">Đang tải PDF...</span>
                </object>
                <a class="bulletin-pdf-open" href="${source || "#"}" ${mediaAttrs} target="_blank" rel="noopener">Mở PDF</a>
              </figure>
            `;
          }
          return `<a class="attachment-link" href="${source || "#"}" ${mediaAttrs} download="${name}" target="_blank" rel="noopener">Mở media</a>`;
        })
        .join("")}
    </div>
  `;
}

function bulletinDetailModalElement() {
  return byId("bulletinDetailDialog").querySelector(".bulletin-detail-modal");
}

function isLandscapeBulletinMediaElement(element) {
  if (element.tagName === "IMG") {
    return Number(element.naturalWidth) > Number(element.naturalHeight) && Number(element.naturalHeight) > 0;
  }
  if (element.tagName === "VIDEO") {
    return Number(element.videoWidth) > Number(element.videoHeight) && Number(element.videoHeight) > 0;
  }
  return false;
}

function updateBulletinDetailLandscapeState() {
  const modal = bulletinDetailModalElement();
  if (!modal) return;
  const mediaElements = Array.from(byId("bulletinDetailMedia").querySelectorAll("img, video"));
  modal.classList.toggle("has-landscape-media", mediaElements.some(isLandscapeBulletinMediaElement));
}

function bindBulletinDetailMediaOrientation() {
  const mediaElements = Array.from(byId("bulletinDetailMedia").querySelectorAll("img, video"));
  mediaElements.forEach((element) => {
    const eventName = element.tagName === "VIDEO" ? "loadedmetadata" : "load";
    element.addEventListener(eventName, updateBulletinDetailLandscapeState, { once: true });
  });
  updateBulletinDetailLandscapeState();
}

function bulletinById(id) {
  return (state.bulletins || []).find((post) => post.id === id);
}

function closeBulletinDetailDialog() {
  byId("bulletinDetailDialog").classList.add("is-hidden");
  byId("bulletinDetailDialog").setAttribute("aria-hidden", "true");
  bulletinDetailModalElement()?.classList.remove("has-landscape-media");
}

function renderBulletinVoting(post) {
  const root = byId("bulletinDetailVoting");
  if (!root) return;
  if (!isVotingBulletin(post)) {
    root.innerHTML = "";
    root.classList.add("is-hidden");
    return;
  }

  root.classList.remove("is-hidden");
  const options = Array.isArray(post.voteOptions) ? post.voteOptions : [];
  const votes = Array.isArray(post.votes) ? post.votes : [];
  const optionIds = new Set(options.map((option) => option.id));
  const validVotes = votes.filter((vote) => bulletinVoteOptionIds(vote).some((optionId) => optionIds.has(optionId)));
  const totalVoters = validVotes.length;
  const totalSelections = validVotes.reduce((sum, vote) => sum + bulletinVoteOptionIds(vote).filter((optionId) => optionIds.has(optionId)).length, 0);
  const counts = bulletinVoteCounts(post);
  const ended = bulletinVoteEnded(post);
  const currentVote = currentBulletinVote(post);
  const currentOptionIds = new Set(bulletinVoteOptionIds(currentVote).filter((optionId) => optionIds.has(optionId)));
  const currentOptions = options.filter((option) => currentOptionIds.has(option.id));
  const voteLimit = bulletinVoteLimit(post);
  const inputType = voteLimit === 1 ? "radio" : "checkbox";
  const endLabel = post.voteEndsAt ? formatDateTime(post.voteEndsAt) : "Chưa đặt thời gian kết thúc";

  if (!options.length) {
    root.innerHTML = `
      <section class="bulletin-vote-panel">
        <div class="bulletin-vote-head">
          <div>
            <h3>Chương trình bình chọn</h3>
            <p class="muted">Chưa có tiêu chí bình chọn.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const resultRows = options
    .map((option) => {
      const count = counts.get(option.id) || 0;
      const percent = totalVoters ? Math.round((count / totalVoters) * 1000) / 10 : 0;
      return `
        <div class="bulletin-vote-result">
          <div>
            <span>${escapeHtml(option.label)}</span>
            <strong>${count} lượt chọn · ${percent}%</strong>
          </div>
          <div class="bulletin-vote-bar" aria-hidden="true"><span style="width: ${percent}%"></span></div>
        </div>
      `;
    })
    .join("");

  const optionControls = options
    .map(
      (option) => `
        <label class="bulletin-vote-option">
          <input type="${inputType}" name="bulletinVoteOption" value="${escapeHtml(option.id)}"${currentOptionIds.has(option.id) ? " checked" : ""}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `,
    )
    .join("");

  const voteInstruction = voteLimit === 1 ? "Chọn 1 tiêu chí." : `Chọn đúng ${voteLimit} tiêu chí.`;
  const currentOptionLabels = currentOptions.map((option) => option.label).join(", ");
  const voteNotice = currentOptions.length
    ? `<p class="bulletin-vote-note">Bạn đã bình chọn: <strong>${escapeHtml(currentOptionLabels)}</strong>${ended ? "." : ". Có thể thay đổi trước khi chương trình kết thúc."}</p>`
    : `<p class="bulletin-vote-note">${ended ? "Bạn chưa bình chọn trước thời hạn." : `Mỗi tài khoản được bình chọn một lần. ${voteInstruction} Có thể thay đổi trước hạn.`}</p>`;

  root.innerHTML = `
    <section class="bulletin-vote-panel">
      <div class="bulletin-vote-head">
        <div>
          <h3>Chương trình bình chọn</h3>
          <p class="muted">Kết thúc: ${escapeHtml(endLabel)} · Mỗi tài khoản chọn ${voteLimit} tiêu chí</p>
        </div>
        <span class="badge ${ended ? "warn" : "good"}">${ended ? "Đã kết thúc" : "Đang bình chọn"}</span>
      </div>
      ${
        ended
          ? voteNotice
          : `<form class="bulletin-vote-form" data-vote-bulletin="${escapeHtml(post.id)}">
              <p class="bulletin-vote-instruction">${escapeHtml(voteInstruction)}</p>
              <div class="bulletin-vote-options">${optionControls}</div>
              <div class="form-actions">
                <button type="submit">${currentVote ? "Cập nhật bình chọn" : "Gửi bình chọn"}</button>
              </div>
            </form>
            ${voteNotice}`
      }
      <div class="bulletin-vote-results" aria-label="Kết quả bình chọn">
        <div class="bulletin-vote-total">${totalVoters} tài khoản đã bình chọn · ${totalSelections} lượt chọn</div>
        ${resultRows}
      </div>
    </section>
  `;
}

function openBulletinDetailDialog(postId) {
  const post = bulletinById(postId);
  if (!post || (post.status === "draft" && !canEditBulletin(post))) return;
  const media = Array.isArray(post.media) ? post.media : [];
  const labels = [post.category || "Tin tức chung", post.pinned ? "Tin ghim" : "", canEditBulletin(post) ? bulletinStatusLabel(post.status || "published") : ""].filter(Boolean);
  byId("bulletinDetailMeta").textContent = labels.join(" · ");
  byId("bulletinDetailTitle").textContent = post.title || "Tin bài";
  byId("bulletinDetailContent").textContent = post.content || "";
  byId("bulletinDetailMedia").innerHTML = renderBulletinMedia(media);
  bulletinDetailModalElement()?.classList.remove("has-landscape-media");
  bindBulletinDetailMediaOrientation();
  renderBulletinVoting(post);
  byId("bulletinDetailDialog").classList.remove("is-hidden");
  byId("bulletinDetailDialog").setAttribute("aria-hidden", "false");
  hydrateBulletinMediaElements(byId("bulletinDetailMedia")).then(() => {
    bindBulletinDetailMediaOrientation();
  });
}

function renderBulletinMediaDraft() {
  const list = byId("bulletinMediaList");
  if (!bulletinMediaDraft.length) {
    list.innerHTML = '<span class="muted">Chưa có media đính kèm.</span>';
    return;
  }
  list.innerHTML = bulletinMediaDraft
    .map((file) => {
      const kind = file.kind || mediaKindFromType(file.type) || mediaKindFromFile(file);
      const kindLabel =
        kind === "image" ? "Hình ảnh" : kind === "video" ? "Video" : kind === "audio" ? "Âm thanh" : kind === "pdf" ? "PDF" : "Media";
      const source = escapeHtml(file.dataUrl || "");
      return `
        <div class="attachment-item">
          <a href="${source || "#"}" data-bulletin-media-key="${escapeHtml(storedFileKey(file))}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>
          <span class="muted">${escapeHtml(kindLabel)} · ${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-bulletin-media="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `;
    })
    .join("");
  hydrateBulletinMediaElements(list);
}

function renderBulletinMasonry(cardHtmls) {
  // CSS Grid places direct children left to right, then continues on the next row.
  // This preserves the pinned/newest-first order established before rendering.
  return cardHtmls.join("");
}

function renderBulletinBoard(options = {}) {
  const posts = visibleBulletins();
  const search = normalizeSearchText(byId("bulletinSearch").value.trim());
  const category = byId("bulletinCategoryFilter").value;
  const filtered = posts
    .filter((post) => bulletinMatchesFilters(post, search, category))
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return bulletinSortValue(b).localeCompare(bulletinSortValue(a));
    });
  const allPosts = posts;
  const publishedCount = allPosts.filter((post) => post.status !== "draft").length;
  const draftCount = allPosts.length - publishedCount;
  byId("bulletinAdminPanel").classList.toggle("is-hidden", !canPublishBulletins());
  byId("bulletinSummary").textContent = canPublishBulletins()
    ? `${publishedCount} tin đang hiển thị${draftCount ? `, ${draftCount} tin nháp` : ""}.`
    : `${publishedCount} tin đang hiển thị.`;

  byId("bulletinList").classList.toggle("empty-state", !filtered.length);
  const bulletinCardHtmls = filtered.map((post, index) => {
          const status = post.status || "published";
          const statusClass = status === "draft" ? "warn" : "good";
          const content = post.content || "";
          const media = Array.isArray(post.media) ? post.media : [];
          const previewText = content;
          const voting = isVotingBulletin(post);
          const votingEnded = voting && bulletinVoteEnded(post);
          return `
            <article class="bulletin-card${post.pinned ? " is-pinned" : ""}" style="--bulletin-delay: ${Math.min(index * 45, 420)}ms" data-open-bulletin="${escapeHtml(post.id)}" tabindex="0">
              <div class="bulletin-card-head">
                <div>
                  <div class="bulletin-meta">
                    <span class="badge">${escapeHtml(post.category || "Tin tức chung")}</span>
                    ${voting ? `<span class="badge ${votingEnded ? "warn" : "good"}">${votingEnded ? "Đã kết thúc" : "Đang bình chọn"}</span>` : ""}
                    ${post.pinned ? "<span class=\"badge warn\">Ghim</span>" : ""}
                    ${canEditBulletin(post) ? `<span class="badge ${statusClass}">${escapeHtml(bulletinStatusLabel(status))}</span>` : ""}
                  </div>
                  <h3>${escapeHtml(post.title)}</h3>
                </div>
                <time>${escapeHtml(formatDate(post.publishDate || post.createdAt))}</time>
              </div>
              ${previewText ? `<p class="bulletin-excerpt">${escapeHtml(previewText)}</p>` : ""}
              ${renderBulletinMedia(media)}
              ${
                canEditBulletin(post) || canDeleteBulletin()
                  ? `<div class="bulletin-footer">
                      <span class="row-actions">
                        ${canEditBulletin(post) ? `<button class="ghost" data-edit-bulletin="${escapeHtml(post.id)}" type="button">Sửa</button>` : ""}
                        ${canDeleteBulletin() ? `<button class="ghost" data-delete-bulletin="${escapeHtml(post.id)}" type="button">Xóa</button>` : ""}
                      </span>
                    </div>`
                  : ""
              }
            </article>
          `;
        });
  byId("bulletinList").innerHTML = filtered.length ? renderBulletinMasonry(bulletinCardHtmls) : "Chưa có tin bài phù hợp.";
  scheduleVisibleViewWork("bulletin", () => hydrateBulletinMediaElements(byId("bulletinList")), 100);
  if (options.applyCustomization !== false) applyFieldCustomizations();
}

function updateBulletinVoteSettingsVisibility() {
  const voting = isVotingBulletinCategory(byId("bulletinCategory").value);
  byId("bulletinVoteSettings").classList.toggle("is-hidden", !voting);
  byId("bulletinVoteEndsAt").required = voting;
  byId("bulletinVoteLimit").required = voting;
  byId("bulletinVoteOptions").required = voting;
  if (!voting) {
    byId("bulletinVoteEndsAt").value = "";
    byId("bulletinVoteLimit").value = "1";
    byId("bulletinVoteOptions").value = "";
  }
}

function resetBulletinForm() {
  byId("bulletinForm").reset();
  byId("bulletinId").value = "";
  byId("bulletinDate").value = todayInputDate();
  byId("bulletinStatus").value = "published";
  byId("bulletinPinned").checked = false;
  updateBulletinVoteSettingsVisibility();
  byId("bulletinMedia").value = "";
  bulletinMediaDraft = [];
  renderBulletinMediaDraft();
}

function populateBulletinForm(post) {
  if (!post) return;
  byId("bulletinId").value = post.id;
  byId("bulletinTitle").value = post.title || "";
  byId("bulletinCategory").value = bulletinCategories.includes(post.category) ? post.category : isVotingBulletinCategory(post.category) ? BULLETIN_VOTE_CATEGORY : "Khác";
  byId("bulletinDate").value = post.publishDate || todayInputDate();
  byId("bulletinStatus").value = post.status || "published";
  byId("bulletinPinned").checked = Boolean(post.pinned);
  byId("bulletinContent").value = post.content || "";
  byId("bulletinVoteEndsAt").value = post.voteEndsAt || "";
  byId("bulletinVoteLimit").value = post.voteLimit || 1;
  byId("bulletinVoteOptions").value = (post.voteOptions || []).map((option) => option.label).join("\n");
  updateBulletinVoteSettingsVisibility();
  byId("bulletinMedia").value = "";
  bulletinMediaDraft = [...(post.media || [])];
  renderBulletinMediaDraft();
  renderCustomFieldsForScope("bulletin");
  applyFieldCustomizations();
}

async function migrateBulletinMediaToIndexedDb({ persist = true, render = true } = {}) {
  let changed = false;
  const pendingFiles = [];
  for (const post of state.bulletins || []) {
    if (!canEditBulletin(post)) continue;
    if (!Array.isArray(post.media)) continue;
    for (const file of post.media) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("bulletin-media");
      file.id = file.id || key;
      file.storageKey = key;
      pendingFiles.push(file);
    }
  }
  await processWithConcurrency(pendingFiles, async (file) => {
    try {
      await writeStoredFile(file, file.dataUrl);
      delete file.dataUrl;
      changed = true;
    } catch {
      // Keep legacy inline media if IndexedDB cannot accept it, so existing posts do not lose content.
    }
  }, 3);
  if (changed) {
    try {
      if (persist) persistState();
      if (render) renderBulletinBoard();
    } catch {
      // If localStorage is already constrained, keep the in-memory migration for this session.
    }
  }
}

function archiveById(id) {
  return (state.archiveRecords || []).find((record) => record.id === id);
}

function archiveProjectId(record) {
  const directProject = projectById(record?.projectId);
  if (directProject) return directProject.id;
  const legacyTask = (state.tasks || []).find((task) => task.id === record?.taskId);
  return legacyTask ? projectIdForTask(legacyTask) : "";
}

function archiveProjectForRecord(record) {
  return projectById(archiveProjectId(record));
}

function archiveRecordTags(record) {
  const source = Array.isArray(record?.tags) ? record.tags.join(",") : record?.tags || "";
  return String(source)
    .split(/[,;\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseArchiveTags(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function archiveStatusBadgeClass(status) {
  if (status === "Đã hoàn thành" || status === "Còn hiệu lực") return "good";
  if (status === "Hết hiệu lực") return "bad";
  return "warn";
}

function archiveEditableDepartments() {
  if (canSaveArchive()) return departments;
  return [];
}

function archiveEditablePeople() {
  if (canSaveArchive()) return state.people;
  return [];
}

function archiveFileByKey(key) {
  const draft = archiveFileDraft.find((file) => storedFileKey(file) === key);
  if (draft) return draft;
  for (const record of state.archiveRecords || []) {
    const found = (record.files || []).find((file) => storedFileKey(file) === key);
    if (found) return found;
  }
  return null;
}

function dataUrlTextContent(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]*)(;base64)?,(.*)$/);
  if (!match) return "";
  const payload = match[3] || "";
  try {
    if (match[2]) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return "Không thể đọc nội dung văn bản của tệp này.";
  }
}

async function hydrateArchiveFileLinks(root = document) {
  const elements = Array.from(root.querySelectorAll("[data-archive-file-key]"));
  await Promise.all(
    elements.map(async (element) => {
      if (element.dataset.fileReady === "true") return;
      const file = archiveFileByKey(element.dataset.archiveFileKey);
      if (!file) return;
      try {
        const dataUrl = await readStoredFileDataUrl(file);
        if (!dataUrl) return;
        const displayUrl = storedFileDisplayUrl(file, dataUrl);
        if (element.tagName === "A") element.href = displayUrl;
        else if (element.tagName === "OBJECT") element.data = displayUrl;
        else if (element.tagName === "PRE") element.textContent = dataUrlTextContent(dataUrl);
        else element.src = displayUrl;
        element.dataset.fileReady = "true";
      } catch {
        element.dataset.fileReady = "error";
      }
    }),
  );
}

function renderArchiveOptions() {
  const selectedDepartment = byId("archiveDepartment").value;
  const selectedPerson = byId("archivePerson").value;
  const selectedProject = byId("archiveProject").value;
  const selectedCategoryFilter = byId("archiveCategoryFilter").value;
  const selectedStatusFilter = byId("archiveStatusFilter").value;
  const selectedDepartmentFilter = byId("archiveDepartmentFilter").value;

  fillSelect(
    byId("archiveDepartment"),
    [{ value: "", label: "Không chọn phòng" }].concat(archiveEditableDepartments().map((department) => ({ value: department.id, label: department.name }))),
    selectedDepartment,
  );
  fillSelect(
    byId("archivePerson"),
    [{ value: "", label: "Không chọn nhân sự" }].concat(
      archiveEditablePeople().map((person) => ({
        value: person.id,
        label: `${person.name} - ${departmentById(person.departmentId)?.name || "Chưa rõ phòng"}`,
      })),
    ),
    selectedPerson,
  );
  fillSelect(
    byId("archiveProject"),
    [{ value: "", label: "Không chọn dự án" }].concat(taskProjectOptions()),
    selectedProject,
  );
  fillSelect(
    byId("archiveCategoryFilter"),
    [{ value: "", label: "Tất cả nhóm hồ sơ" }].concat(archiveCategories.map((category) => ({ value: category, label: category }))),
    selectedCategoryFilter,
  );
  fillSelect(
    byId("archiveStatusFilter"),
    [{ value: "", label: "Tất cả tình trạng" }].concat(archiveStatuses.map((status) => ({ value: status, label: status }))),
    selectedStatusFilter,
  );
  fillSelect(
    byId("archiveDepartmentFilter"),
    [{ value: "", label: "Tất cả phòng" }].concat(departments.map((department) => ({ value: department.id, label: department.name }))),
    selectedDepartmentFilter,
  );
}

function archiveRecordSearchText(record) {
  const department = departmentById(record.departmentId)?.name || "";
  const person = personById(record.personId)?.name || "";
  const project = archiveProjectForRecord(record);
  const files = (record.files || []).map((file) => file.name).join(" ");
  return normalizeSearchText(
    [
      record.title,
      record.category,
      record.status,
      record.documentNo,
      record.recordDate,
      department,
      person,
      project?.name,
      archiveRecordTags(record).join(" "),
      record.description,
      files,
      record.createdBy,
      record.updatedBy,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function indexedArchiveRecordSearchText(record) {
  const cached = archiveSearchTextCache.get(record);
  if (cached?.generation === searchIndexGeneration) return cached.text;
  const text = archiveRecordSearchText(record);
  archiveSearchTextCache.set(record, { generation: searchIndexGeneration, text });
  return text;
}

function archiveMatchesFilters(record, search, category, status, departmentId) {
  if (category && record.category !== category) return false;
  if (status && record.status !== status) return false;
  if (departmentId && record.departmentId !== departmentId) return false;
  return !search || indexedArchiveRecordSearchText(record).includes(search);
}

function archiveSortValue(record) {
  return record.recordDate || record.updatedAt || record.createdAt || "";
}

function visibleArchiveRecords() {
  return Array.isArray(state.archiveRecords) ? state.archiveRecords : [];
}

function renderArchiveStats(allRecords, filteredRecords) {
  const files = allRecords.reduce((sum, record) => sum + (record.files || []).length, 0);
  const activeProjects = allRecords.filter((record) => record.category === "Hồ sơ dự án" && record.status === "Đang thực hiện").length;
  const effectiveDocuments = allRecords.filter((record) => {
    const category = normalizeSearchText(record.category);
    const isDocument = category.includes("van ban") || category.includes("cong van");
    return isDocument && record.status === "Còn hiệu lực";
  }).length;
  byId("archiveStats").innerHTML = [
    { label: "Tổng hồ sơ", value: allRecords.length },
    { label: "Đang hiển thị", value: filteredRecords.length },
    { label: "Tệp lưu trữ", value: files },
    { label: "Dự án đang thực hiện", value: activeProjects },
    { label: "Văn bản còn hiệu lực", value: effectiveDocuments },
  ]
    .map(
      (item) => `
        <article class="archive-stat">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `,
    )
    .join("");
}

function archiveLinkButtons(record) {
  const buttons = [];
  const person = personById(record.personId);
  const project = archiveProjectForRecord(record);
  if (record.departmentId && canAccessView("history")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-department-history="${escapeHtml(record.departmentId)}" type="button">Lịch sử phòng</button>`);
  }
  if (person && canAccessView("people")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-person="${escapeHtml(person.id)}" type="button">Hồ sơ nhân sự</button>`);
  }
  if (project && canAccessView("tasks")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-project="${escapeHtml(project.id)}" type="button">Dự án liên quan</button>`);
  }
  return buttons.join("");
}

function renderArchiveCard(record, index) {
  const department = departmentById(record.departmentId);
  const tags = archiveRecordTags(record);
  const files = Array.isArray(record.files) ? record.files : [];
  const compactMeta = [record.recordDate ? formatDate(record.recordDate) : "", department?.name || ""].filter(Boolean).join(" · ");
  const summary = record.description || tags.join(", ") || record.documentNo || "Click để xem chi tiết hồ sơ.";
  return `
    <article class="archive-card" data-open-archive-detail="${escapeHtml(record.id)}" tabindex="0" style="--bulletin-delay: ${Math.min(index * 35, 360)}ms">
      ${canDeleteArchive() ? `<button class="archive-delete-button" data-delete-archive="${escapeHtml(record.id)}" type="button" aria-label="Xóa hồ sơ" title="Xóa">×</button>` : ""}
      <div class="archive-card-head">
        <div>
          <div class="archive-meta">
            <span class="badge">${escapeHtml(record.category || "Hồ sơ khác")}</span>
            <span class="badge ${archiveStatusBadgeClass(record.status)}">${escapeHtml(record.status || "Lưu tham khảo")}</span>
          </div>
          <h3>${escapeHtml(record.title || "Hồ sơ lưu trữ")}</h3>
        </div>
      </div>
      <p class="archive-card-summary">${escapeHtml(summary)}</p>
      <div class="archive-card-foot">
        <div class="archive-card-foot-main">
          <span>${escapeHtml(compactMeta || record.documentNo || "Chưa phân loại")}</span>
          <strong>${files.length} tệp</strong>
        </div>
        ${canEditArchive(record) ? `<button class="archive-edit-button ghost" data-edit-archive="${escapeHtml(record.id)}" type="button">Sửa</button>` : ""}
      </div>
    </article>
  `;
}

function renderArchive(options = {}) {
  if (!byId("archiveList")) return;
  byId("archiveAdminPanel").classList.toggle("is-hidden", !canSaveArchive());
  const allRecords = visibleArchiveRecords()
    .slice()
    .sort((a, b) => archiveSortValue(b).localeCompare(archiveSortValue(a)));
  const search = normalizeSearchText(byId("archiveSearch").value.trim());
  const category = byId("archiveCategoryFilter").value;
  const status = byId("archiveStatusFilter").value;
  const departmentId = byId("archiveDepartmentFilter").value;
  const filtered = allRecords.filter((record) => archiveMatchesFilters(record, search, category, status, departmentId));
  byId("archiveSummary").textContent = allRecords.length
    ? `${allRecords.length} hồ sơ lưu trữ, ${allRecords.reduce((sum, record) => sum + (record.files || []).length, 0)} tệp đính kèm.`
    : "Chưa có hồ sơ lưu trữ.";
  renderArchiveStats(allRecords, filtered);
  byId("archiveList").classList.toggle("empty-state", !filtered.length);
  byId("archiveList").innerHTML = filtered.length
    ? filtered.map(renderArchiveCard).join("")
    : '<div class="archive-empty-help">Chưa có hồ sơ phù hợp với điều kiện tìm kiếm.</div>';
  // Nạp tệp sau khi màn hình đã rảnh; bỏ lượt nạp khi người dùng đã chuyển mục.
  scheduleVisibleViewWork("archive", () => hydrateArchiveFileLinks(byId("archiveList")), 100);
  if (options.applyCustomization !== false) applyFieldCustomizations();
}

function storedFileBlob(file, dataUrl) {
  const type = file?.type || "application/octet-stream";
  return dataUrlToBlob(normalizeStoredMediaDataUrl(dataUrl, type), type);
}

function downloadBlobFile(blob, name) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name || "tep-luu-tru";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

async function downloadArchiveFile(key) {
  const file = archiveFileByKey(key);
  if (!file) {
    alert("Không tìm thấy tệp lưu trữ cần tải.");
    return false;
  }
  try {
    const dataUrl = await readStoredFileDataUrl(file);
    if (!dataUrl) {
      alert("Không thể tải nội dung tệp. Vui lòng kiểm tra kết nối mạng rồi thử lại.");
      return false;
    }
    downloadBlobFile(storedFileBlob(file, dataUrl), file.name || "tep-luu-tru");
    return true;
  } catch {
    alert("Không thể chuẩn bị tệp để tải xuống. Vui lòng thử lại.");
    return false;
  }
}

// Reserve the tab before the asynchronous data read so mobile browsers do not block it.
async function openFileInNewTab(key) {
  const file = archiveFileByKey(key) || bulletinMediaByKey(key);
  const previewWindow = window.open("", "_blank");
  if (previewWindow) {
    previewWindow.document.title = "Đang tải tệp";
    previewWindow.document.body.textContent = "Đang tải tệp...";
  }
  if (!file) {
    previewWindow?.close();
    return false;
  }

  let dataUrl = "";
  try {
    dataUrl = await readStoredFileDataUrl(file);
  } catch {
    previewWindow?.close();
    alert("Không thể nạp nội dung tệp. Vui lòng thử lại.");
    return false;
  }
  if (!dataUrl) {
    previewWindow?.close();
    alert("Không thể nạp nội dung tệp. Vui lòng kiểm tra kết nối mạng rồi thử lại.");
    return false;
  }

  const objectUrl = URL.createObjectURL(storedFileBlob(file, dataUrl));
  if (previewWindow) {
    previewWindow.location.replace(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 300000);
    return true;
  }
  URL.revokeObjectURL(objectUrl);
  alert("Trình duyệt đang chặn tab mới. Vui lòng cho phép mở tab mới rồi thử lại.");
  return false;
}

function renderArchiveDetailFile(file) {
  const kind = file.kind || archiveFileKindFromFile(file);
  const key = escapeHtml(storedFileKey(file));
  const source = escapeHtml(file.dataUrl || "");
  const name = escapeHtml(file.name || "Tệp đính kèm");
  const preview =
    kind === "pdf"
      ? `<object class="archive-preview-frame" data-archive-file-key="${key}" type="application/pdf"><span class="muted">Không thể hiển thị PDF trong trình duyệt này.</span></object>`
      : kind === "image"
        ? `<img class="archive-preview-media" src="${source || "#"}" data-archive-file-key="${key}" alt="${name}" loading="lazy">`
        : kind === "video"
          ? `<video class="archive-preview-media" src="${source || "#"}" data-archive-file-key="${key}" controls preload="metadata"></video>`
          : kind === "audio"
            ? `<audio class="archive-preview-media" src="${source || "#"}" data-archive-file-key="${key}" controls preload="metadata"></audio>`
            : kind === "text"
              ? `<pre class="archive-text-preview" data-archive-file-key="${key}">Đang tải nội dung văn bản...</pre>`
              : `<div class="archive-empty-help">Tệp này cần mở bằng ứng dụng phù hợp trên thiết bị.</div>`;
  return `
    <article class="archive-preview-card">
      <div class="archive-preview-head">
        <div class="archive-preview-title">
          <strong>${name}</strong>
          <span class="archive-meta">
            <span class="badge">${escapeHtml(archiveFileKindLabel(file))}</span>
            <span>${escapeHtml(formatFileSize(file.size))}</span>
          </span>
        </div>

        <div class="archive-preview-actions">
          <button class="archive-download-button" data-download-archive-file="${key}" type="button">Tải tệp</button>
          <button class="ghost archive-open-button" data-open-archive-file="${key}" type="button">Mở tệp</button>
        </div>
      </div>
      ${preview}
    </article>
  `;
}

function openArchiveDetailDialog(recordId) {
  const record = archiveById(recordId);
  if (!record) return;
  const department = departmentById(record.departmentId);
  const person = personById(record.personId);
  const project = archiveProjectForRecord(record);
  const tags = archiveRecordTags(record);
  const files = Array.isArray(record.files) ? record.files : [];
  const metaItems = [
    record.documentNo ? `Số hiệu: ${record.documentNo}` : "",
    record.recordDate ? `Ngày: ${formatDate(record.recordDate)}` : "",
    department ? `Phòng: ${department.name}` : "",
    person ? `Nhân sự: ${person.name}` : "",
    project ? `Dự án: ${project.name}` : "",
    record.createdAt ? `Tạo: ${formatDateTime(record.createdAt)}${record.createdBy ? ` bởi ${record.createdBy}` : ""}` : "",
    record.updatedAt ? `Cập nhật: ${formatDateTime(record.updatedAt)}${record.updatedBy ? ` bởi ${record.updatedBy}` : ""}` : "",
  ].filter(Boolean);
  byId("archiveDetailMeta").textContent = [record.category || "Hồ sơ khác", record.status || "Lưu tham khảo"].filter(Boolean).join(" · ");
  byId("archiveDetailTitle").textContent = record.title || "Hồ sơ lưu trữ";
  byId("archiveDetailContent").innerHTML = `
    <div class="archive-detail-meta-grid">${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    ${tags.length ? `<div class="archive-tags">${tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    ${record.description ? `<p class="archive-detail-description">${escapeHtml(record.description)}</p>` : ""}
  `;
  byId("archiveDetailLinks").innerHTML = archiveLinkButtons(record) || "";
  byId("archiveDetailFiles").innerHTML = files.length
    ? files.map(renderArchiveDetailFile).join("")
    : '<div class="archive-empty-help">Hồ sơ này chưa có tệp đính kèm.</div>';
  byId("archiveDetailDialog").classList.remove("is-hidden");
  byId("archiveDetailDialog").setAttribute("aria-hidden", "false");
  hydrateArchiveFileLinks(byId("archiveDetailDialog"));
}

function closeArchiveDetailDialog() {
  byId("archiveDetailDialog").classList.add("is-hidden");
  byId("archiveDetailDialog").setAttribute("aria-hidden", "true");
}

function handleArchiveRelatedTarget(event) {
  const personId = event.target.closest("[data-open-archive-person]")?.dataset.openArchivePerson;
  const projectId = event.target.closest("[data-open-archive-project]")?.dataset.openArchiveProject;
  const departmentId = event.target.closest("[data-open-archive-department-history]")?.dataset.openArchiveDepartmentHistory;
  if (personId && canAccessView("people")) {
    const person = personById(personId);
    byId("personSearch").value = person?.name || "";
    renderPeopleTable();
    switchView("people");
    byId("peopleTable").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  if (projectId && canAccessView("tasks")) {
    openProjectTaskList(projectId);
    return true;
  }
  if (departmentId && canAccessView("history")) {
    openHistoryDetail("department", departmentId);
    return true;
  }
  return false;
}

function renderArchiveFileDraft() {
  const list = byId("archiveFileList");
  if (!archiveFileDraft.length) {
    list.innerHTML = '<span class="muted">Chưa có tệp đính kèm.</span>';
    return;
  }
  list.innerHTML = archiveFileDraft
    .map(
      (file) => `
        <div class="attachment-item">
          <a href="${escapeHtml(file.dataUrl || "#")}" data-archive-file-key="${escapeHtml(storedFileKey(file))}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>
          <span class="muted">${escapeHtml(archiveFileKindLabel(file))} · ${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-archive-file="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
  hydrateArchiveFileLinks(list);
}

function resetArchiveForm() {
  byId("archiveForm").reset();
  byId("archiveId").value = "";
  byId("archiveDate").value = todayInputDate();
  archiveFileDraft = [];
  renderArchiveOptions();
  renderArchiveFileDraft();
}

function populateArchiveForm(record) {
  if (!record) return;
  renderArchiveOptions();
  byId("archiveId").value = record.id;
  byId("archiveTitle").value = record.title || "";
  byId("archiveCategory").value = archiveCategories.includes(record.category) ? record.category : "Hồ sơ khác";
  byId("archiveStatus").value = archiveStatuses.includes(record.status) ? record.status : "Lưu tham khảo";
  byId("archiveDocumentNo").value = record.documentNo || "";
  byId("archiveDate").value = record.recordDate || todayInputDate();
  byId("archiveDepartment").value = record.departmentId || "";
  byId("archivePerson").value = record.personId || "";
  byId("archiveProject").value = archiveProjectId(record);
  byId("archiveTags").value = archiveRecordTags(record).join(", ");
  byId("archiveDescription").value = record.description || "";
  byId("archiveFiles").value = "";
  archiveFileDraft = [...(record.files || [])];
  renderArchiveFileDraft();
  renderCustomFieldsForScope("archive");
  applyFieldCustomizations();
}

async function migrateArchiveFilesToIndexedDb({ persist = true, render = true } = {}) {
  let changed = false;
  const pendingFiles = [];
  for (const record of state.archiveRecords || []) {
    if (!canEditArchive(record)) continue;
    if (!Array.isArray(record.files)) continue;
    for (const file of record.files) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("archive-file");
      file.id = file.id || key;
      file.storageKey = key;
      file.kind = file.kind || archiveFileKindFromFile(file);
      file.type = file.type || archiveFileTypeFromFile(file);
      pendingFiles.push(file);
    }
  }
  await processWithConcurrency(pendingFiles, async (file) => {
    try {
      await writeStoredFile(file, normalizeStoredMediaDataUrl(file.dataUrl, file.type));
      delete file.dataUrl;
      changed = true;
    } catch {
      // Keep legacy inline files if IndexedDB cannot accept them.
    }
  }, 3);
  if (changed) {
    try {
      if (persist) persistState();
      if (render) renderArchive();
    } catch {
      // Keep the in-memory migration for this session if localStorage is constrained.
    }
  }
}

// 🔥 2. HÀM MỚI BỔ SUNG: Bóc tách file đính kèm Công việc vào IndexedDB (Chống tràn 5MB)
async function migrateTaskAttachmentsToIndexedDb({ persist = true } = {}) {
  let changed = false;
  const pendingFiles = [];
  for (const task of state.tasks || []) {
    if (!canEditTaskDetails(task) && !canUpdateTaskProgress(task)) continue;
    if (!Array.isArray(task.attachments)) continue;
    for (const file of task.attachments) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("task-file");
      file.id = file.id || key;
      file.storageKey = key;
      pendingFiles.push(file);
    }
  }
  await processWithConcurrency(pendingFiles, async (file) => {
    try {
      await writeStoredFile(file, file.dataUrl);
      delete file.dataUrl;
      changed = true;
    } catch (error) {
      console.error("Task attachment migration failed:", error);
    }
  }, 3);
  if (changed && persist) persistState();
  return changed;
}

function renderModuleAccessControls() {
  const panel = byId("moduleAccessPanel");
  const list = byId("moduleAccessList");
  if (!panel || !list) return;
  panel.classList.toggle("is-hidden", !isAdmin());
  if (!isAdmin()) {
    list.innerHTML = "";
    byId("systemThemePanel")?.classList.add("is-hidden");
    return;
  }

  state.moduleSettings = normalizeModuleSettings(state.moduleSettings);
  list.innerHTML = systemModules
    .map((module) => {
      const enabled = moduleIsEnabled(module.id);
      const roles = state.moduleSettings[module.id]?.roles || defaultModuleRoleSettings(module.id);
      const enabledRoles = moduleAccessRoles.filter((role) => roles[role] === true).length;
      const roleControls = moduleAccessRoles
        .map(
          (role) => `
            <label class="module-role-toggle">
              <input type="checkbox" data-module-id="${escapeHtml(module.id)}" data-module-role-toggle="${escapeHtml(role)}" ${roles[role] === true ? "checked" : ""} ${module.locked || !enabled ? "disabled" : ""}>
              <span>${escapeHtml(accountRoleLabels[role])}</span>
            </label>
          `,
        )
        .join("");
      const status = module.locked ? "Luôn bật" : enabled ? `${enabledRoles}/${moduleAccessRoles.length} nhóm đang bật` : "Đang tắt toàn hệ thống";
      return `
        <article class="module-toggle-card${module.locked ? " is-locked" : ""}${!enabled ? " is-disabled" : ""}">
          <div class="module-toggle-main">
            <label class="module-global-toggle" title="Bật hoặc tắt mục này cho toàn bộ tài khoản không phải admin">
              <input type="checkbox" data-module-toggle="${escapeHtml(module.id)}" ${enabled ? "checked" : ""} ${module.locked ? "disabled" : ""}>
              <span>Bật mục</span>
            </label>
            <span class="module-toggle-text">
              <strong>${escapeHtml(module.label)}</strong>
              <small>${escapeHtml(module.note || "")}</small>
            </span>
            <span class="module-toggle-status${enabled ? "" : " is-off"}">${escapeHtml(status)}</span>
          </div>
          <div class="module-role-grid" aria-label="Quyền hiển thị ${escapeHtml(module.label)} theo loại tài khoản">
            ${roleControls}
          </div>
        </article>
      `;
    })
    .join("");
  renderSystemThemeControls();
}

function systemThemePreviewHtml(theme) {
  const palette = themePalette(theme);
  return ["--primary", "--primary-dark", "--accent", "--bg"].map((color) => `<span style="background:${palette[color]}"></span>`).join("");
}

function themeDraftFromForm() {
  return normalizeSystemTheme({
    preset: byId("systemThemePreset")?.value,
    customName: byId("systemThemeCustomName")?.value,
    primary: byId("systemThemePrimary")?.value,
    primaryDark: byId("systemThemePrimaryDark")?.value,
    accent: byId("systemThemeAccent")?.value,
    background: byId("systemThemeBackground")?.value,
  });
}

function updateSystemThemeFormState() {
  const isCustom = byId("systemThemePreset")?.value === "custom";
  document.querySelectorAll(".theme-custom-field").forEach((field) => field.classList.toggle("is-hidden", !isCustom));
  const preview = byId("systemThemePreview");
  if (preview) preview.innerHTML = systemThemePreviewHtml(themeDraftFromForm());
}

function renderSystemThemeControls() {
  const panel = byId("systemThemePanel");
  if (!panel) return;
  panel.classList.toggle("is-hidden", !isAdmin());
  if (!isAdmin()) return;
  const theme = normalizeSystemTheme(state.systemCustomization?.theme);
  fillSelect(byId("systemThemePreset"), systemThemeOptions.map((option) => ({ value: option.id, label: option.label })), theme.preset);
  byId("systemThemeCustomName").value = theme.customName;
  byId("systemThemePrimary").value = theme.primary;
  byId("systemThemePrimaryDark").value = theme.primaryDark;
  byId("systemThemeAccent").value = theme.accent;
  byId("systemThemeBackground").value = theme.background;
  byId("systemThemePreview").innerHTML = systemThemePreviewHtml(theme);
  updateSystemThemeFormState();
}

function registerPwaForUpdates() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return Promise.resolve(null);
  if (!pwaRegistrationPromise) {
    pwaRegistrationPromise = navigator.serviceWorker
      .register(new URL("service-worker.js", window.location.href).href, { updateViaCache: "none" })
      .catch((error) => {
        console.warn("PWA registration failed:", error);
        return null;
      });
  }
  return pwaRegistrationPromise;
}
function applySystemCustomization() {
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const layout = state.systemCustomization.layout;
  const root = document.documentElement;
  root.style.setProperty("--app-input-height", `${layout.inputHeight}px`);
  root.style.setProperty("--app-field-gap", `${layout.fieldGap}px`);
  root.style.setProperty("--app-field-min-width", `${layout.fieldMinWidth}px`);
  root.style.setProperty("--app-popup-width", `${layout.popupWidth}px`);
  root.style.setProperty("--app-wide-popup-width", `${layout.widePopupWidth}px`);
  const theme = state.systemCustomization.theme;
  Object.entries(themePalette(theme)).forEach(([name, value]) => root.style.setProperty(name, value));
  document.body.dataset.systemTheme = theme.preset;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", themePalette(theme)["--primary"]);
}

function customFieldScopeLabel(scopeId) {
  return customFieldScopes.find((scope) => scope.id === scopeId)?.label || scopeId;
}

function customFieldTypeLabel(typeId) {
  return customFieldTypes.find((type) => type.id === typeId)?.label || typeId;
}

function customizationEnabled() {
  return isAdmin() && customizeMode;
}

function setCustomizeMode(enabled) {
  customizeMode = Boolean(enabled) && isAdmin();
  localStorage.setItem(CUSTOMIZE_MODE_KEY, customizeMode ? "1" : "0");
  renderDirectCustomization();
}

function activeViewId() {
  return document.querySelector(".view.is-active")?.id || "dashboard";
}

function customizationScopeForView(viewId = activeViewId()) {
  return customFieldScopes.find((scope) => scope.id === viewId);
}

function customFieldsForScope(scopeId, includeDisabled = false) {
  const fields = state.systemCustomization?.customFields || [];
  return fields
    .filter((field) => field.scope === scopeId && (includeDisabled || field.enabled !== false))
    .sort((a, b) => {
      const hasOrderA = a.order || a.order === 0;
      const hasOrderB = b.order || b.order === 0;
      const orderA = hasOrderA ? Number(a.order) : 0;
      const orderB = hasOrderB ? Number(b.order) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return 0;
    });
}

function customFieldInputId(fieldId) {
  return `custom-field-${fieldId}`;
}

function customFieldKey(fieldId) {
  return `custom:${fieldId}`;
}

function customFieldControlHtml(field, value = "") {
  const id = customFieldInputId(field.id);
  const common = `id="${escapeHtml(id)}" data-custom-field-id="${escapeHtml(field.id)}"`;
  if (field.type === "textarea") return `<textarea ${common} rows="2">${escapeHtml(value)}</textarea>`;
  if (field.type === "date") return `<input ${common} type="date" value="${escapeHtml(value)}">`;
  if (field.type === "number") return `<input ${common} type="number" step="0.01" value="${escapeHtml(value)}">`;
  return `<input ${common} value="${escapeHtml(value)}">`;
}

function recordForCustomScope(scopeId) {
  if (scopeId === "people") return personById(byId("personId")?.value);
  if (scopeId === "tasks") return (state.tasks || []).find((task) => task.id === byId("taskId")?.value);
  if (scopeId === "department-evaluations") return latestDepartmentEvaluation(byId("deptEvalDepartment")?.value, byId("deptEvalPeriod")?.value || state.activePeriod);
  if (scopeId === "evaluations") return latestEvaluation(byId("evalPerson")?.value, byId("evalPeriod")?.value || state.activePeriod);
  if (scopeId === "bulletin") return (state.bulletins || []).find((post) => post.id === byId("bulletinId")?.value);
  if (scopeId === "archive") return (state.archiveRecords || []).find((record) => record.id === byId("archiveId")?.value);
  if (scopeId === "accounts") return accountById(byId("accountId")?.value);
  return null;
}

function renderCustomFieldsForScope(scopeId) {
  const scope = customFieldScopes.find((item) => item.id === scopeId);
  const form = scope ? byId(scope.formId) : null;
  if (!form) return;
  form.querySelectorAll(".custom-fields-container").forEach((item) => item.remove());
  const fields = customFieldsForScope(scopeId);
  if (!fields.length) return;
  const record = recordForCustomScope(scopeId);
  const values = record?.customFields || {};
  const container = document.createElement("div");
  container.className = `custom-fields-container form-grid${form.classList.contains("form-grid") ? " wide" : ""}`;
  container.dataset.customScope = scopeId;
  container.innerHTML = fields
    .map((field) => {
      const span = numberWithin(field.width, 1, 4, 1);
      const hasOrder = field.order || field.order === 0;
      const order = hasOrder ? ` style="order:${Number(field.order)}"` : "";
      return `
        <label class="custom-field-span-${span}" data-custom-field-key="${escapeHtml(customFieldKey(field.id))}"${order}>
          ${escapeHtml(field.label)}
          ${customFieldControlHtml(field, values[field.id] || "")}
          ${customizationEnabled() ? `<button class="ghost inline-custom-field-edit" data-edit-inline-custom-field="${escapeHtml(field.id)}" data-custom-field-scope="${escapeHtml(scopeId)}" type="button">Sửa trường</button>` : ""}
        </label>
      `;
    })
    .join("");
  const insertBefore = form.querySelector(".form-actions");
  if (insertBefore) form.insertBefore(container, insertBefore);
  else form.appendChild(container);
}

function renderAllCustomFields(scopeId = "") {
  if (scopeId) {
    renderCustomFieldsForScope(scopeId);
    return;
  }
  customFieldScopes.forEach((scope) => renderCustomFieldsForScope(scope.id));
}

function collectCustomFieldValues(scopeId, existing = {}) {
  const values = { ...(existing || {}) };
  customFieldsForScope(scopeId).forEach((field) => {
    const control = byId(customFieldInputId(field.id));
    if (control) values[field.id] = control.value;
  });
  return values;
}

function fieldLabelTextNode(label) {
  const directText = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (directText) return directText;
  const inlineLabel = Array.from(label.children).find((child) => child.matches("span, strong") && child.textContent.trim());
  return inlineLabel ? customizableTextNode(inlineLabel) : null;
}

function customizableTextNode(element) {
  if (element.matches("label")) return fieldLabelTextNode(element);
  if (element.matches(".nav-item, .block, .score-panel, .metrics article, .dashboard-card-column, .dashboard-card-column > section, .task-kind-head, .task-inbox-panel, .task-column, .criteria-item, .behavior-item, .score-result > div, .archive-stat, .bulletin-card, .archive-card, .module-toggle-card, .task-collaborator-field")) {
    const heading = element.querySelector(":scope > h2, :scope > h3, :scope h3, :scope h4, :scope strong, :scope span");
    if (heading) return customizableTextNode(heading);
  }
  return Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
}

function elementIndexInSet(element, selector) {
  const root = element.closest(".view, .modal-card") || document;
  let rootCache = customizationElementIndexCache.get(root);
  if (!rootCache) {
    rootCache = new Map();
    customizationElementIndexCache.set(root, rootCache);
  }
  if (!rootCache.has(selector)) {
    rootCache.set(selector, new Map(Array.from(root.querySelectorAll(selector)).map((item, index) => [item, index])));
  }
  return rootCache.get(selector).get(element) ?? -1;
}

function contentCustomizationKey(element) {
  if (element.dataset.customFieldKey || element.dataset.customContentKey) {
    return element.dataset.customFieldKey || element.dataset.customContentKey;
  }
  if (element.matches("label")) {
    const control = element.querySelector("input[id], select[id], textarea[id]");
    return element.dataset.customFieldKey || control?.id || "";
  }
  if (element.id) return `content:${element.id}`;
  const rootId = element.closest(".view")?.id || element.closest(".modal-card")?.className.split(/\s+/).find((name) => name !== "modal-card") || "global";
  const tag = element.tagName.toLowerCase();
  return `content:${rootId}:${tag}:${elementIndexInSet(element, tag)}`;
}

function legacyContentCustomizationKey(element) {
  if (element.matches("label")) return "";
  if (element.id) return "";
  const rootId = element.closest(".view")?.id || element.closest(".modal-card")?.className.split(/\s+/).find((name) => name !== "modal-card") || "global";
  const tag = element.tagName.toLowerCase();
  const text = (customizableTextNode(element)?.textContent || element.textContent || "").trim().slice(0, 40);
  return `content:${rootId}:${tag}:${elementIndexInSet(element, tag)}:${text}`;
}

function customizationElementKey(element) {
  return element?.dataset?.customFieldKey || element?.dataset?.customContentKey || "";
}

function customizationHandleEligible(element) {
  if (!element) return false;
  if (element.closest(".customization-modal, .view-custom-toolbar, .kpi-formula-customizer")) return false;
  return element.matches(
    [
      "label",
      "button",
      "th",
      "h2",
      "h3",
      "h4",
      ".nav-item",
      ".block",
      ".score-panel",
      ".metrics article",
      ".dashboard-card-column",
      ".dashboard-card-column > section",
      ".task-inbox-panel",
      ".task-kind-head",
      ".task-column",
      ".criteria-item",
      ".behavior-item",
      ".score-result > div",
      ".archive-stat",
      ".bulletin-card",
      ".archive-card",
      ".module-toggle-card",
      ".task-collaborator-field",
      ".section-note",
      ".field-note",
      ".badge",
      ".compact-upload-title",
    ].join(","),
  );
}

function setCustomizationOverride(key, patch, legacyKey = "") {
  if (!key) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const existing = state.systemCustomization.fieldOverrides[key] || (legacyKey ? state.systemCustomization.fieldOverrides[legacyKey] : null) || {};
  state.systemCustomization.fieldOverrides[key] = { ...existing, ...patch };
  if (legacyKey && legacyKey !== key) delete state.systemCustomization.fieldOverrides[legacyKey];
}

function removeCustomizationMiniTools(element) {
  Array.from(element.children || [])
    .filter((child) => child.classList?.contains("customization-mini-tools"))
    .forEach((child) => child.remove());
}

function addCustomizationMiniTools(element, key) {
  if (!customizationEnabled() || !customizationHandleEligible(element) || !key) return;
  if (element.querySelector(":scope > .customization-mini-tools")) return;
  const tools = document.createElement("span");
  tools.className = "customization-mini-tools";
  tools.setAttribute("contenteditable", "false");
  tools.innerHTML = `
    <button class="customization-drag-handle" data-custom-drag-handle draggable="true" type="button" title="Kéo để di chuyển" aria-label="Kéo để di chuyển">&#8597;</button>
    <span class="customization-resize-handle" data-custom-resize-handle title="Kéo để đổi kích thước"></span>
  `;
  element.appendChild(tools);
}

function showCustomizationMiniTools(element) {
  if (!customizationEnabled() || !element || !customizationElementKey(element)) return;
  if (customizationHoverClearTimer) window.clearTimeout(customizationHoverClearTimer);
  if (customizationHoverElement === element) return;
  if (customizationHoverElement) removeCustomizationMiniTools(customizationHoverElement);
  customizationHoverElement = element;
  addCustomizationMiniTools(element, customizationElementKey(element));
}

function hideCustomizationMiniTools(element, { delayed = true } = {}) {
  if (!element || customizationHoverElement !== element) return;
  if (customizationHoverClearTimer) window.clearTimeout(customizationHoverClearTimer);
  const clear = () => {
    if (customizationHoverElement !== element || customizationResizeState?.element === element) return;
    removeCustomizationMiniTools(element);
    customizationHoverElement = null;
    customizationHoverClearTimer = 0;
  };
  if (delayed) customizationHoverClearTimer = window.setTimeout(clear, 120);
  else clear();
}

function customizationDropContainerSelector() {
  return [
    ".view.is-active",
    ".view.is-active form",
    ".view.is-active .form-grid",
    ".view.is-active .form-actions",
    ".view.is-active .filter-row",
    ".view.is-active .section-head",
    ".view.is-active .compact-upload-row",
    ".view.is-active .evaluation-form",
    ".view.is-active .score-panel",
    ".view.is-active .criteria-grid",
    ".view.is-active .behavior-grid",
    ".view.is-active .score-result",
    ".view.is-active .department-adjustment-grid",
    ".view.is-active .metrics",
    ".view.is-active .dashboard-card-columns",
    ".view.is-active .dashboard-card-column",
    ".view.is-active .task-inbox-panel",
    ".view.is-active .task-board",
    ".view.is-active .task-columns",
    ".view.is-active .bulletin-list",
    ".view.is-active .bulletin-masonry-column",
    ".view.is-active .archive-list",
    ".view.is-active .rules-grid",
    ".view.is-active .module-access-list",
    ".modal-backdrop:not(.is-hidden) .modal-card",
    ".modal-backdrop:not(.is-hidden) form",
    ".modal-backdrop:not(.is-hidden) .form-grid",
    ".modal-backdrop:not(.is-hidden) .form-actions",
    ".modal-backdrop:not(.is-hidden) .section-head",
    ".modal-backdrop:not(.is-hidden) .compact-upload-row",
    ".modal-backdrop:not(.is-hidden) .score-panel",
    ".modal-backdrop:not(.is-hidden) .score-result",
    ".topbar",
    ".topbar > div",
    ".top-actions",
    ".sidebar nav",
    ".period-box",
  ].join(",");
}

function customizationDropContainers() {
  return Array.from(document.querySelectorAll(customizationDropContainerSelector())).filter((container) => {
    if (container.closest(".customization-modal, .view-custom-toolbar, .kpi-formula-customizer")) return false;
    return true;
  });
}

function customizationContainerKey(container) {
  if (!container) return "";
  if (container.id) return `container:id:${container.id}`;
  if (container.dataset.customContainerKey) return container.dataset.customContainerKey;
  const root = container.closest(".view, .modal-card, aside, header") || document.body;
  const rootId = root.id || Array.from(root.classList || []).join(".") || root.tagName.toLowerCase();
  const tag = container.tagName.toLowerCase();
  const classKey = Array.from(container.classList || [])
    .filter((name) => !name.startsWith("is-") && !name.startsWith("field-") && !name.startsWith("customization-"))
    .slice(0, 3)
    .join(".");
  const selector = `${tag}${classKey ? `.${classKey.split(".").join(".")}` : ""}`;
  const peers = Array.from(root.querySelectorAll(selector));
  return `container:${rootId}:${selector}:${peers.indexOf(container)}`;
}

function findCustomizationContainer(containerKey) {
  if (!containerKey) return null;
  if (containerKey.startsWith("container:id:")) return byId(containerKey.replace("container:id:", ""));
  return customizationDropContainers().find((container) => customizationContainerKey(container) === containerKey) || null;
}

function markCustomizationDropContainers() {
  document.querySelectorAll(".is-customization-drop-container").forEach((container) => {
    container.classList.remove("is-customization-drop-container", "is-customization-drop-target", "is-customization-drop-container-active");
    delete container.dataset.customContainerKey;
  });
  if (!customizationEnabled()) return;
  customizationDropContainers().forEach((container) => {
    container.dataset.customContainerKey = customizationContainerKey(container);
    container.classList.add("is-customization-drop-container");
  });
}

function canMoveCustomizationElementToContainer(element, container) {
  if (!element || !container || container === element || element.contains(container)) return false;
  const sourceForm = element.closest("form");
  if (sourceForm) return container.closest("form") === sourceForm || container === sourceForm;
  const sourceModal = element.closest(".modal-card");
  if (sourceModal) return container.closest(".modal-card") === sourceModal || container === sourceModal;
  const sourceSidebar = element.closest(".sidebar");
  if (sourceSidebar) return container.closest(".sidebar") === sourceSidebar || container === sourceSidebar;
  const sourceView = element.closest(".view");
  if (sourceView) return container.closest(".view") === sourceView || container === sourceView;
  const sourceTopbar = element.closest(".topbar");
  if (sourceTopbar) return container.closest(".topbar") === sourceTopbar || container === sourceTopbar;
  return false;
}

function directCustomizableSiblings(parent) {
  return Array.from(parent?.children || []).filter((element) => customizationElementKey(element));
}

function persistCustomizationSiblingOrder(parent, movedElement = null) {
  const siblings = directCustomizableSiblings(parent);
  if (!siblings.length) return;
  const parentKey = customizationContainerKey(parent);
  siblings.forEach((element, index) => {
    const key = customizationElementKey(element);
    const legacyKey = element.dataset.customLegacyKey || "";
    const patch = { order: (index + 1) * 10 };
    if (element === movedElement && parentKey) patch.parentKey = parentKey;
    setCustomizationOverride(key, patch, legacyKey);
  });
  logActivity({
    action: "Cập nhật",
    module: "Tùy biến",
    targetType: "customization",
    targetId: "layout-order",
    title: "Kéo thả đổi vị trí nội dung",
    details: `${siblings.length} nội dung`,
  });
  saveState();
  markCustomizationDropContainers();
}

function setCustomizationDropState(dropTarget = null) {
  const nextTarget = dropTarget?.target || null;
  const nextContainer = dropTarget?.container || null;
  if (customizationDropState.target && customizationDropState.target !== nextTarget) {
    customizationDropState.target.classList.remove("is-customization-drop-target");
  }
  if (customizationDropState.container && customizationDropState.container !== nextContainer) {
    customizationDropState.container.classList.remove("is-customization-drop-container-active");
  }
  if (nextTarget) nextTarget.classList.add("is-customization-drop-target");
  if (nextContainer) nextContainer.classList.add("is-customization-drop-container-active");
  customizationDropState = { target: nextTarget, container: nextContainer };
}

function clearCustomizationDragState() {
  customizationDragElement?.classList.remove("is-customization-dragging");
  setCustomizationDropState();
  customizationDragElement = null;
}

function applyStoredCustomizationPlacements(elements) {
  const affectedParents = new Set();
  elements.forEach((element) => {
    const key = customizationElementKey(element);
    if (!key) return;
    const override = state.systemCustomization.fieldOverrides[key] || {};
    const targetContainer = findCustomizationContainer(override.parentKey);
    if (!targetContainer || targetContainer === element.parentElement || !canMoveCustomizationElementToContainer(element, targetContainer)) return;
    const previousParent = element.parentElement;
    targetContainer.appendChild(element);
    if (previousParent) affectedParents.add(previousParent);
    affectedParents.add(targetContainer);
  });
  elements.forEach((element) => {
    const override = state.systemCustomization.fieldOverrides[customizationElementKey(element)] || {};
    if ((override.parentKey || override.order || override.order === 0) && element.parentElement) {
      affectedParents.add(element.parentElement);
    }
  });
  affectedParents.forEach((parent) => {
    directCustomizableSiblings(parent)
      .slice()
      .sort((a, b) => {
        const aKey = customizationElementKey(a);
        const bKey = customizationElementKey(b);
        const aOrder = state.systemCustomization.fieldOverrides[aKey]?.order;
        const bOrder = state.systemCustomization.fieldOverrides[bKey]?.order;
        const aValue = aOrder || aOrder === 0 ? Number(aOrder) : Number.MAX_SAFE_INTEGER;
        const bValue = bOrder || bOrder === 0 ? Number(bOrder) : Number.MAX_SAFE_INTEGER;
        return aValue - bValue;
      })
      .forEach((element) => parent.appendChild(element));
  });
}

function customizationDropTargetFromEvent(event) {
  const fieldTarget = event.target.closest(".is-admin-customizable-field");
  if (fieldTarget && fieldTarget !== customizationDragElement && canMoveCustomizationElementToContainer(customizationDragElement, fieldTarget.parentElement)) {
    return { target: fieldTarget, container: fieldTarget.parentElement };
  }
  const container = event.target.closest(".is-customization-drop-container");
  if (container && canMoveCustomizationElementToContainer(customizationDragElement, container)) {
    return { target: null, container };
  }
  return null;
}

function customizableElements() {
  const selector = [
    ".topbar .unit",
    ".topbar h1",
    ".sidebar-toggle",
    ".sidebar .nav-item",
    ".sidebar .nav-label",
    ".period-box label",
    ".period-box p",
    ".view.is-active .block",
    ".view.is-active .score-panel",
    ".view.is-active .metrics article",
    ".view.is-active .dashboard-card-column",
    ".view.is-active .dashboard-card-column > section",
    ".view.is-active .task-inbox-panel",
    ".view.is-active .task-kind-head",
    ".view.is-active .task-column",
    ".view.is-active .criteria-item",
    ".view.is-active .behavior-item",
    ".view.is-active .score-result > div",
    ".view.is-active .archive-stat",
    ".view.is-active .bulletin-card",
    ".view.is-active .archive-card",
    ".view.is-active .module-toggle-card",
    ".view.is-active .task-collaborator-field",
    ".view.is-active label",
    ".view.is-active h2",
    ".view.is-active h3",
    ".view.is-active h4",
    ".view.is-active th",
    ".view.is-active button:not(.nav-item):not(.archive-delete-button):not(.popup-customize-button):not(.scroll-jump-button)",
    ".view.is-active .eyebrow",
    ".view.is-active .section-note",
    ".view.is-active .field-note",
    ".view.is-active .compact-upload-title",
    ".view.is-active .badge",
    ".view.is-active .filter-note span",
    ".view.is-active .score-result span",
    ".view.is-active .metrics span",
    ".view.is-active .task-inbox-button strong",
    ".view.is-active .task-inbox-button small",
    ".view.is-active .chart-heading h3",
    ".view.is-active .task-column-head span",
    ".view.is-active .task-column-head strong",
    ".view.is-active .task-card h4",
    ".view.is-active .archive-card h3",
    ".view.is-active .bulletin-card h3",
    ".view.is-active .archive-stat span",
    ".view.is-active .archive-stat strong",
    ".view.is-active .rank-item strong",
    ".view.is-active .alert-item strong",
    ".view.is-active .block > p",
    ".view.is-active .rules-grid li",
    ".modal-backdrop:not(.is-hidden) .modal-card h2",
    ".modal-backdrop:not(.is-hidden) .modal-card h3",
    ".modal-backdrop:not(.is-hidden) .modal-card h4",
    ".modal-backdrop:not(.is-hidden) .modal-card label",
    ".modal-backdrop:not(.is-hidden) .modal-card th",
    ".modal-backdrop:not(.is-hidden) .modal-card .eyebrow",
    ".modal-backdrop:not(.is-hidden) .modal-card .muted",
    ".modal-backdrop:not(.is-hidden) .modal-card .field-note",
    ".modal-backdrop:not(.is-hidden) .modal-card .compact-upload-title",
    ".modal-backdrop:not(.is-hidden) .modal-card .badge",
    ".modal-backdrop:not(.is-hidden) .modal-card button:not(.popup-customize-button)",
  ].join(",");
  return Array.from(document.querySelectorAll(selector)).filter((element) => {
    if (element.closest(".customization-modal")) return false;
    if (element.closest(".view-custom-toolbar")) return false;
    if (element.closest(".kpi-formula-customizer")) return false;
    return Boolean(customizableTextNode(element));
  });
}

function clearCustomizationElementInteraction(element) {
  removeCustomizationMiniTools(element);
  element.classList.remove("is-admin-customizable-field", "is-customization-dragging", "is-customization-drop-target", "is-customization-resizing");
}

function applyFieldCustomizations() {
  // Apply stored settings to the visible view; interactive controls only exist in customization mode.
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  customizationElementIndexCache = new WeakMap();
  const elements = customizableElements();
  const elementSet = new Set(elements);
  document.querySelectorAll(".is-admin-customizable-field").forEach((element) => {
    if (!elementSet.has(element)) clearCustomizationElementInteraction(element);
  });
  const interactive = customizationEnabled();
  elements.forEach((element) => {
    const key = contentCustomizationKey(element);
    if (!key) return;
    const legacyKey = legacyContentCustomizationKey(element);
    const textNode = customizableTextNode(element);
    if (!textNode) return;
    if (element.matches("label")) element.dataset.customFieldKey = key;
    else element.dataset.customContentKey = key;
    if (legacyKey && legacyKey !== key) element.dataset.customLegacyKey = legacyKey;
    else delete element.dataset.customLegacyKey;
    element.dataset.customizationKey = key;
    element.dataset.defaultLabel = element.dataset.defaultLabel || textNode.textContent.trim();
    const override = state.systemCustomization.fieldOverrides[key] || (legacyKey ? state.systemCustomization.fieldOverrides[legacyKey] : null) || {};
    const labelSuffix = element.matches("label") && textNode.parentNode === element ? "\n" : "";
    const nextLabel = `${override.label || element.dataset.defaultLabel}${labelSuffix}`;
    if (textNode.textContent !== nextLabel) textNode.textContent = nextLabel;
    element.classList.toggle("is-admin-customizable-field", interactive);
    element.classList.toggle("field-hidden-by-admin", override.hidden === true || override.deleted === true);
    element.classList.toggle("field-deleted-by-admin", override.deleted === true);
    element.style.gridColumn = override.width ? `span ${override.width}` : "";
    const hasOverrideOrder = override.order || override.order === 0;
    element.style.order = hasOverrideOrder ? override.order : "";
    element.style.minWidth = !element.matches("label") && override.width ? `${Number(override.width) * 90}px` : "";
    const height = override.height ? `${override.height}px` : "";
    element.style.minHeight = height && !element.matches("label") ? height : "";
    element.style.width = override.pixelWidth ? `${override.pixelWidth}px` : "";
    element.style.height = override.pixelHeight ? `${override.pixelHeight}px` : "";
    element.querySelectorAll("input, select, textarea").forEach((fieldControl) => {
      if (fieldControl.dataset.originalRequired === undefined) {
        fieldControl.dataset.originalRequired = fieldControl.required ? "1" : "0";
      }
      fieldControl.required = (override.hidden === true || override.deleted === true) && !interactive ? false : fieldControl.dataset.originalRequired === "1";
      fieldControl.style.minHeight = height;
    });
  });
  if (elements.some((element) => {
    const override = state.systemCustomization.fieldOverrides[customizationElementKey(element)] || {};
    return override.parentKey || override.order || override.order === 0;
  })) {
    applyStoredCustomizationPlacements(elements);
  }
  if (!interactive && customizationHoverElement) hideCustomizationMiniTools(customizationHoverElement, { delayed: false });
  markCustomizationDropContainers();
  document.body.classList.toggle("is-customize-mode", interactive);
  byId("toggleCustomizeMode")?.classList.toggle("is-active", interactive);
  if (byId("toggleCustomizeMode")) byId("toggleCustomizeMode").textContent = interactive ? "Đang tùy biến" : "Tùy biến";
}

function renderViewCustomizationTools() {
  document.querySelectorAll(".view-custom-toolbar, .kpi-formula-customizer").forEach((item) => item.remove());
  if (!customizationEnabled()) return;
  const view = document.querySelector(".view.is-active");
  const scope = customizationScopeForView(view?.id);
  if (!view || !scope) return;
  const toolbar = document.createElement("section");
  toolbar.className = "block view-custom-toolbar";
  toolbar.innerHTML = `
    <div>
      <p class="eyebrow">Tùy biến trực tiếp</p>
      <h3>${escapeHtml(scope.label)}</h3>
    </div>
    <div class="form-actions">
      <button data-open-custom-field="${escapeHtml(scope.id)}" type="button">Thêm ô thông tin</button>
    </div>
  `;
  const head = view.querySelector(".section-head");
  if (head?.nextSibling) view.insertBefore(toolbar, head.nextSibling);
  else view.prepend(toolbar);
  renderKpiFormulaCustomizers();
}

function renderKpiFormulaCustomizers() {
  // Formula parameters are managed centrally in Quy chế > Quản lý danh mục KPI.
  return;

  const params = currentKpiParameters();
  const deptForm = byId("departmentEvaluationForm");
  if (document.querySelector(".view.is-active")?.id === "department-evaluations" && deptForm) {
    const panel = document.createElement("section");
    panel.className = "score-panel kpi-formula-customizer";
    panel.innerHTML = `
      <div><h3>Công thức KPI phòng</h3></div>
      <div class="formula-parameter-grid">
        <label>Giới hạn % hoàn thành<input data-kpi-param="completionMax" type="number" min="1" max="300" step="1" value="${escapeHtml(params.completionMax)}"></label>
        <label>Hệ số điểm tiêu chí<input data-kpi-param="criterionScale" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.criterionScale)}"></label>
        <label>Hệ số tiêu chí phòng<input data-kpi-param="departmentCriteriaWeight" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.departmentCriteriaWeight)}"></label>
        <label>Hệ số cộng/trừ<input data-kpi-param="departmentAdjustmentWeight" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.departmentAdjustmentWeight)}"></label>
      </div>
    `;
    deptForm.insertBefore(panel, deptForm.querySelector(".score-result"));
  }
  const evalForm = byId("evaluationForm");
  if (document.querySelector(".view.is-active")?.id === "evaluations" && evalForm) {
    const panel = document.createElement("section");
    panel.className = "score-panel kpi-formula-customizer";
    panel.innerHTML = `
      <div><h3>Công thức KPI cá nhân</h3></div>
      <div class="formula-parameter-grid">
        <label>Hệ số KPI cá nhân<input data-kpi-param="personalWeight" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.personalWeight)}"></label>
        <label>Hệ số KPI phòng<input data-kpi-param="departmentWeight" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.departmentWeight)}"></label>
        <label>Hệ số cộng/trừ<input data-kpi-param="behaviorWeight" type="number" min="0" max="10" step="0.01" value="${escapeHtml(params.behaviorWeight)}"></label>
        <label>Giới hạn % hoàn thành<input data-kpi-param="completionMax" type="number" min="1" max="300" step="1" value="${escapeHtml(params.completionMax)}"></label>
      </div>
    `;
    evalForm.insertBefore(panel, evalForm.querySelector(".score-result"));
  }
}

function popupCustomizationKey(card) {
  if (card.classList.contains("bulletin-detail-modal")) return "bulletin-detail";
  if (card.classList.contains("archive-detail-modal")) return "archive-detail";
  if (card.classList.contains("task-inbox-modal")) return "task-inbox";
  if (card.classList.contains("task-detail-modal")) return "task-detail";
  if (card.classList.contains("task-status-detail-modal")) return "task-status-detail";
  if (card.classList.contains("kpi-task-detail-modal")) return "kpi-task-detail";
  if (card.classList.contains("customization-modal")) return "customization";
  return "default";
}

function applyPopupCustomizations() {
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  document.querySelectorAll(".modal-card").forEach((card) => {
    const key = popupCustomizationKey(card);
    const width = state.systemCustomization.popupSizes[key]?.width;
    card.style.width = width ? `min(${width}px, calc(100vw - 24px))` : "";
    card.classList.toggle("is-admin-customizable-popup", customizationEnabled());
  });
}

function renderPopupCustomizationButtons() {
  document.querySelectorAll("[data-open-popup-customize]").forEach((button) => button.remove());
  if (!customizationEnabled()) return;
  document.querySelectorAll(".modal-backdrop:not(.is-hidden) .modal-card").forEach((card) => {
    if (card.classList.contains("customization-modal")) return;
    const head = card.querySelector(".section-head");
    if (!head) return;
    const button = document.createElement("button");
    button.className = "ghost popup-customize-button";
    button.type = "button";
    button.dataset.openPopupCustomize = popupCustomizationKey(card);
    button.textContent = "Tùy biến popup";
    head.appendChild(button);
  });
}

function renderDirectCustomization({ viewId = activeViewId() } = {}) {
  const scope = customizationScopeForView(viewId);
  if (scope) renderAllCustomFields(scope.id);
  renderViewCustomizationTools();
  applyFieldCustomizations();
  applyPopupCustomizations();
  renderPopupCustomizationButtons();
}

function openModal(id) {
  byId(id).classList.remove("is-hidden");
  byId(id).setAttribute("aria-hidden", "false");
  applyFieldCustomizations();
  applyPopupCustomizations();
  renderPopupCustomizationButtons();
}

function closeModal(id) {
  byId(id).classList.add("is-hidden");
  byId(id).setAttribute("aria-hidden", "true");
}

function openFieldCustomizeDialog(label) {
  const key = label.dataset.customFieldKey || label.dataset.customContentKey;
  const legacyKey = label.dataset.customLegacyKey || "";
  const override = state.systemCustomization.fieldOverrides[key] || (legacyKey ? state.systemCustomization.fieldOverrides[legacyKey] : null) || {};
  byId("fieldCustomizeKey").value = key;
  byId("fieldCustomizeLegacyKey").value = legacyKey;
  byId("fieldCustomizeLabel").value = override.label || label.dataset.defaultLabel || "";
  byId("fieldCustomizeWidth").value = override.width || "";
  byId("fieldCustomizeHeight").value = override.height || "";
  byId("fieldCustomizePixelWidth").value = override.pixelWidth || "";
  byId("fieldCustomizePixelHeight").value = override.pixelHeight || "";
  const hasOverrideOrder = override.order || override.order === 0;
  byId("fieldCustomizeOrder").value = hasOverrideOrder ? override.order : "";
  byId("fieldCustomizeHidden").checked = override.hidden === true;
  byId("fieldCustomizeDeleted").checked = override.deleted === true;
  openModal("fieldCustomizeDialog");
}

function openCustomFieldDialog(scopeId, fieldId = "") {
  const field = (state.systemCustomization.customFields || []).find((item) => item.id === fieldId);
  fillSelect(byId("customFieldInlineType"), customFieldTypes.map((type) => ({ value: type.id, label: type.label })), field?.type || "text");
  byId("customFieldInlineId").value = field?.id || "";
  byId("customFieldInlineScope").value = field?.scope || scopeId;
  byId("customFieldInlineLabel").value = field?.label || "";
  byId("customFieldInlineWidth").value = String(field?.width || 1);
  const hasFieldOrder = field?.order || field?.order === 0;
  byId("customFieldInlineOrder").value = hasFieldOrder ? field.order : "";
  byId("customFieldInlineEnabled").checked = field?.enabled !== false;
  byId("deleteCustomFieldInline").classList.toggle("is-hidden", !field);
  openModal("customFieldDialog");
}

function openPopupCustomizeDialog(key) {
  const current = state.systemCustomization.popupSizes?.[key]?.width || "";
  byId("popupCustomizeKey").value = key;
  byId("popupCustomizeWidth").value = current || "";
  openModal("popupCustomizeDialog");
}

function renderAccountTable() {
  const tbody = byId("accountTable");
  const adminQuickTools = byId("accountAdminQuickTools");
  const accountScrollActions = byId("accountScrollActions");
  const canUseAdminTools = isAdmin();
  const canViewAccountDirectory = canManageAccounts() || canViewSystemContent();
  adminQuickTools?.classList.toggle("is-hidden", !canUseAdminTools);
  accountScrollActions?.classList.toggle("is-hidden", !canUseAdminTools);
  if (!canViewAccountDirectory && !canEditOwnAccount()) {
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"5\"");
    return;
  }
  const searchText = canUseAdminTools ? normalizeSearchText(byId("accountSearch")?.value || "") : "";
  const accounts = (canViewAccountDirectory ? state.accounts : [currentAccount()].filter(Boolean)).filter((account) => {
    if (!searchText) return true;
    const person = personById(account.personId);
    const department = departmentById(account.departmentId || person?.departmentId);
    return normalizeSearchText([account.displayName, account.username, person?.name, department?.name, accountRoleLabels[account.role] || account.role].join(" ")).includes(searchText);
  });
  if (!accounts.length) {
    tbody.innerHTML = searchText
      ? '<tr><td colspan="5" class="empty-cell">Không có tài khoản phù hợp.</td></tr>'
      : byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"5\"");
    return;
  }
  tbody.innerHTML = accounts
    .map((account) => {
      const person = personById(account.personId);
      const department = departmentById(account.departmentId || person?.departmentId);
      const isSelf = currentAccount()?.id === account.id;
      const canEdit = canManageAccounts() || (canEditOwnAccount() && isSelf);
      const canDelete = canManageAccounts() && !isSelf;

      // 🌟 THÊM KIỂM TRA VÀ HIỂN THỊ THẺ [ĐÃ KHÓA] KHI BỊ VÔ HIỆU HÓA
      const isDisabled = Boolean(account.disabled);
      const statusBadge = isDisabled ? ' <span class="badge bad" style="font-size:10px; padding:1px 5px;">Đã khóa</span>' : '';

      return `
        <tr class="${isDisabled ? 'is-disabled-account' : ''}">
          <td><strong>${escapeHtml(account.displayName)}</strong>${statusBadge}<br><span class="muted">${escapeHtml(account.username)}</span></td>
          <td>${escapeHtml(accountRoleLabels[account.role] || account.role)}</td>
          <td>${escapeHtml(person?.name || "")}</td>
          <td>${escapeHtml(department?.name || "")}</td>
          <td>
            <span class="row-actions">
              ${canEdit ? `<button class="ghost" data-edit-account="${account.id}" type="button">Sửa</button>` : ""}
              ${canDelete ? `<button class="ghost" data-delete-account="${account.id}" type="button">Xóa</button>` : ""}
              ${isSelf && !canDelete ? "<span class=\"muted\">Đang dùng</span>" : ""}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
  if (!canManageAccounts() && canEditOwnAccount() && !byId("accountId").value) {
    populateAccountForm(currentAccount());
  }
}

function populateAccountForm(account) {
  if (!account) return;
  byId("accountId").value = account.id;
  byId("accountDisplayName").value = account.displayName;
  byId("accountUsername").value = account.username;
  byId("accountPassword").value = "";
  byId("accountPassword").placeholder = "Để trống để giữ nguyên mật khẩu hiện tại";
  byId("accountRole").value = account.role;
  renderAccountOptions();
  byId("accountPerson").value = account.personId || "";
  byId("accountDepartment").value = account.departmentId || personById(account.personId)?.departmentId || "";
  const grants = accountAccessGrants(account);
  byId("accountCanPublishBulletins").checked = grants.bulletinPublish;
  byId("accountCanSaveArchive").checked = grants.archiveWrite;
  byId("accountCanViewSystemContent").checked = grants.viewSystemContent;
  updateAccountFormAccess();
  renderCustomFieldsForScope("accounts");
  applyFieldCustomizations();
}

function resetAccountForm() {
  const ownOnly = !canManageAccounts() && canEditOwnAccount();
  if (ownOnly) {
    populateAccountForm(currentAccount());
    return;
  }
  byId("accountForm").reset();
  byId("accountId").value = "";
  byId("accountPassword").placeholder = "Mật khẩu mới (tối thiểu 10 ký tự)";
  renderAccountOptions();
  updateAccountFormAccess();
}

function renderCurrentUser() {
  const account = currentAccount();
  const person = currentPerson();
  const department = departmentById(currentDepartmentId());
  byId("currentUserLabel").textContent = account ? account.displayName : "Chưa đăng nhập";
  byId("currentUserMeta").textContent = account
    ? `${accountRoleLabels[account.role] || account.role}${department ? ` · ${department.name}` : ""}${person ? ` · ${person.name}` : ""}`
    : "";
}

function applySidebarCollapsed(collapsed) {
  document.body.classList.toggle("is-sidebar-collapsed", Boolean(collapsed));
  const toggle = byId("sidebarToggle");
  if (!toggle) return;
  toggle.textContent = collapsed ? "☰" : "Thu gọn menu";
  toggle.setAttribute("aria-label", collapsed ? "Mở menu" : "Thu gọn menu");
  toggle.title = collapsed ? "Mở menu" : "Thu gọn menu";
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function setSidebarCollapsed(collapsed) {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  applySidebarCollapsed(collapsed);
  if (document.querySelector(".view.is-active")?.id === "bulletin") renderBulletinBoard();
}

function updateAccountFormAccess() {
  const ownOnly = !canManageAccounts() && canEditOwnAccount();
  byId("accountDisplayName").disabled = ownOnly;
  byId("accountUsername").disabled = ownOnly;
  byId("accountRole").disabled = ownOnly;
  byId("accountPerson").disabled = ownOnly;
  byId("accountDepartment").disabled = ownOnly;
  const canManageGrants = isAdmin();
  byId("accountAccessGrants").classList.toggle("is-hidden", !canManageGrants);
  byId("accountCanPublishBulletins").disabled = !canManageGrants;
  byId("accountCanSaveArchive").disabled = !canManageGrants;
  byId("accountCanViewSystemContent").disabled = !canManageGrants;
}

function syncMobileNavigationAccess(activeViewId = document.querySelector(".view.is-active")?.id || "") {
  const mobileViewButtons = document.querySelectorAll(".mobile-bottom-nav [data-view], #mobileMenuPopup [data-view]");
  mobileViewButtons.forEach((button) => {
    const allowed = canAccessView(button.dataset.view);
    button.classList.toggle("is-access-hidden", !allowed);
    button.disabled = !allowed;
    button.tabIndex = allowed ? 0 : -1;
    button.setAttribute("aria-hidden", String(!allowed));
  });

  document.querySelectorAll(".mobile-bottom-nav [data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeViewId && canAccessView(activeViewId));
  });
}

function applyAccessControls() {
  const account = currentAccount();
  document.body.classList.toggle("is-authenticated", Boolean(account));

  // 🌟 KHẮC PHỤC LỖI TRẮNG TRANG: Xóa thuộc tính inline display:none khi đã đăng xuất
  const loginElem = byId("loginScreen");
  if (loginElem) {
    loginElem.classList.toggle("is-hidden", Boolean(account));
    if (!account) loginElem.style.display = ""; 
  }

  document.querySelector(".topbar").classList.toggle("is-hidden", !account);
  document.querySelector(".layout").classList.toggle("is-hidden", !account);
  if (!account) {
    accessControlAccountId = "";
    document.body.classList.remove("is-customize-mode");
    syncMobileNavigationAccess();
    return "";
  }

  renderCurrentUser();
  document.querySelectorAll(".admin-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isDirector());
  });
  document.querySelectorAll(".summary-action").forEach((element) => {
    element.classList.toggle("is-hidden", !canViewSystemContent());
  });
  document.querySelectorAll(".json-data-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin());
  });
  document.querySelectorAll(".customization-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin());
  });
  if (!isAdmin() && customizeMode) {
    customizeMode = false;
    localStorage.setItem(CUSTOMIZE_MODE_KEY, "0");
  }
  document.querySelectorAll(".bulletin-admin-only").forEach((element) => {
    element.classList.toggle("is-hidden", !canPublishBulletins());
  });
  document.querySelectorAll(".archive-manager-only").forEach((element) => {
    element.classList.toggle("is-hidden", !canSaveArchive());
  });
  if (!canPublishBulletins()) closeBulletinFormDialog();
  if (!canSaveArchive()) closeArchiveFormDialog();
  const canManagePeople = canEditPeople();
  byId("personForm").classList.toggle("is-hidden", !canManagePeople);
  byId("openPersonForm").classList.toggle("is-hidden", !canManagePeople);
  if (!canManagePeople) closePersonFormDialog();
  byId("openDepartmentEvaluationFromPersonal").classList.toggle("is-hidden", !canAccessView("department-evaluations"));
  updateAccountFormAccess();
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-hidden", !canAccessView(button.dataset.view));
  });
  const currentView = activeViewId();
  const savedView = localStorage.getItem(activeViewStorageKey());
  const accountChanged = accessControlAccountId !== account.id;
  const targetView =
    !canAccessView(currentView) || accountChanged
      ? savedView && canAccessView(savedView)
        ? savedView
        : firstAccessibleView()
      : currentView;
  if (targetView !== currentView) setActiveView(targetView, { persist: false });
  else syncMobileNavigationAccess(targetView);
  accessControlAccountId = account.id;
  return targetView;
}

function setActiveView(viewId, { persist = true } = {}) {
  if (!viewId) return;
  if (persist) localStorage.setItem(activeViewStorageKey(), viewId);

  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((item) => item.classList.toggle("is-active", item.id === viewId));
  syncMobileNavigationAccess(viewId);
}

function renderActiveView(viewId = activeViewId(), { animateDashboard = false } = {}) {
  if (!currentAccount() || !viewId || activeViewId() !== viewId) return;
  if (viewId === "dashboard") {
    renderDashboard({ animate: animateDashboard });
  } else if (viewId === "bulletin") {
    renderBulletinBoard({ applyCustomization: false });
  } else if (viewId === "archive") {
    renderArchiveOptions();
    renderArchive({ applyCustomization: false });
  } else if (viewId === "people") {
    renderDepartmentAndRoleOptions();
    renderPeopleTable();
  } else if (viewId === "tasks") {
    renderTaskProjectCatalog();
    renderPersonOptions();
    updateTaskFormLock();
    renderTaskBoard({ applyCustomization: false });
  } else if (viewId === "department-evaluations") {
    renderDepartmentEvaluationOptions();
    loadDepartmentEvaluationForSelection();
    renderDepartmentEvaluationTable();
  } else if (viewId === "evaluations") {
    renderPersonOptions();
    loadEvaluationForSelection();
    renderEvaluationTable();
  } else if (viewId === "history") {
    renderHistory();
  } else if (viewId === "accounts") {
    renderAccountOptions();
    renderAccountTable();
    renderAccountPresence();
    if (isAdmin()) {
      requestAccountPresence();
      requestAccountUsageHistory();
    }
  } else if (viewId === "system-settings") {
    renderModuleAccessControls();
  } else if (viewId === "rules") {
    renderRules();
  } else if (viewId === "help") {
    renderHelpView();
  }
  renderDirectCustomization({ viewId });
}

function scheduleActiveViewRender(viewId, { animateDashboard = false } = {}) {
  activeViewRenderToken += 1;
  const renderToken = activeViewRenderToken;
  if (activeViewRenderFrame) {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(activeViewRenderFrame);
    else window.clearTimeout(activeViewRenderFrame);
  }
  const run = () => {
    activeViewRenderFrame = 0;
    if (renderToken !== activeViewRenderToken || activeViewId() !== viewId) return;
    renderActiveView(viewId, { animateDashboard });
  };
  activeViewRenderFrame =
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(run) : window.setTimeout(run, 0);
}

function switchView(viewId) {
  if (!canAccessView(viewId)) return;
  const currentView = activeViewId();
  if (currentView === viewId) {
    syncMobileNavigationAccess(viewId);
    return;
  }
  setActiveView(viewId);
  scheduleActiveViewRender(viewId, { animateDashboard: viewId === "dashboard" });
}

function focusEditForm(formId, focusId) {
  const form = byId(formId);
  if (formId === "taskForm" && byId("taskFormDialog")?.contains(form)) {
    showTaskFormDialog({ focusId });
    return;
  }
  if (formId === "personForm" && byId("personFormDialog")?.contains(form)) {
    showPersonFormDialog({ focusId });
    return;
  }
  if (formId === "bulletinForm" && byId("bulletinFormDialog")?.contains(form)) {
    showBulletinFormDialog({ focusId });
    return;
  }
  if (formId === "archiveForm" && byId("archiveFormDialog")?.contains(form)) {
    showArchiveFormDialog({ focusId });
    return;
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  byId(focusId)?.focus({ preventScroll: true });
}

function syncTaskFormDialogHeading() {
  byId("taskFormDialogTitle").textContent = byId("taskId").value ? "Cập nhật công việc" : "Thêm công việc";
}

function showTaskFormDialog({ focusId = "taskTitle" } = {}) {
  const dialog = byId("taskFormDialog");
  if (!dialog) return;
  syncTaskFormDialogHeading();
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  const focusTarget = () => {
    const target = byId(focusId) || byId("taskTitle");
    if (target && !target.disabled) target.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusTarget);
  else window.setTimeout(focusTarget, 0);
}

function closeTaskFormDialog() {
  const dialog = byId("taskFormDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
}

function openNewTaskFormDialog() {
  if (!canCreateRegularTasks()) return;
  resetTaskForm();
  showTaskFormDialog();
}

function syncPersonFormDialogHeading() {
  byId("personFormDialogTitle").textContent = byId("personId").value ? "Cập nhật nhân sự" : "Thêm nhân sự";
}

function showPersonFormDialog({ focusId = "personName" } = {}) {
  const dialog = byId("personFormDialog");
  if (!dialog) return;
  syncPersonFormDialogHeading();
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  const focusTarget = () => {
    const target = byId(focusId) || byId("personName");
    if (target && !target.disabled) target.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusTarget);
  else window.setTimeout(focusTarget, 0);
}

function closePersonFormDialog() {
  const dialog = byId("personFormDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
}

function openNewPersonFormDialog() {
  if (!canEditPeople()) return;
  resetPersonForm();
  showPersonFormDialog();
}

function syncBulletinFormDialogHeading() {
  byId("bulletinFormDialogTitle").textContent = byId("bulletinId").value ? "Cập nhật tin bài" : "Thêm tin bài";
}

function showBulletinFormDialog({ focusId = "bulletinTitle" } = {}) {
  const dialog = byId("bulletinFormDialog");
  if (!dialog) return;
  syncBulletinFormDialogHeading();
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  const focusTarget = () => {
    const target = byId(focusId) || byId("bulletinTitle");
    if (target && !target.disabled) target.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusTarget);
  else window.setTimeout(focusTarget, 0);
}

function closeBulletinFormDialog() {
  const dialog = byId("bulletinFormDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
}

function openNewBulletinFormDialog() {
  if (!canPublishBulletins()) return;
  resetBulletinForm();
  showBulletinFormDialog();
}

function syncArchiveFormDialogHeading() {
  byId("archiveFormDialogTitle").textContent = byId("archiveId").value ? "Cập nhật lưu trữ" : "Thêm lưu trữ";
}

function showArchiveFormDialog({ focusId = "archiveTitle" } = {}) {
  const dialog = byId("archiveFormDialog");
  if (!dialog) return;
  syncArchiveFormDialogHeading();
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  const focusTarget = () => {
    const target = byId(focusId) || byId("archiveTitle");
    if (target && !target.disabled) target.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusTarget);
  else window.setTimeout(focusTarget, 0);
}

function closeArchiveFormDialog() {
  const dialog = byId("archiveFormDialog");
  if (!dialog) return;
  dialog.classList.add("is-hidden");
  dialog.setAttribute("aria-hidden", "true");
}

function openNewArchiveFormDialog() {
  if (!canSaveArchive()) return;
  resetArchiveForm();
  showArchiveFormDialog();
}

function populatePersonForm(person) {
  if (!person) return;
  byId("personId").value = person.id;
  byId("personName").value = person.name;
  byId("personGender").value = person.gender || "";
  byId("personDepartment").value = person.departmentId;
  updateRoleOptions(person.roleId);
  updatePersonSectionHeadOptions(person.sectionHeadId);
  byId("personContract").value = person.contract;
  byId("personQualification").value = person.qualification || "";
  byId("personContractTerm").value = person.contractTerm || "";
  byId("personContractSignedDate").value = person.contractSignedDate || "";
  byId("personPhone").value = person.phone;
  byId("personBirthDate").value = person.birthDate || "";
  byId("personSalaryCoefficient").value = person.salaryCoefficient || "";
  byId("personSalaryGrade").value = person.salaryGrade || "";
  byId("personSalaryReviewDate").value = person.salaryReviewDate || "";
  byId("personAddress").value = person.address || "";
  byId("personNote").value = person.note;
  renderCustomFieldsForScope("people");
  applyFieldCustomizations();
}

function populateTaskForm(task) {
  if (!task) return;
  setTaskOwnerPickerOpen(false);
  setTaskCollaboratorPickerOpen(false);
  byId("taskId").value = task.id;
  byId("taskTitle").value = task.title;
  renderTaskProjectOptions();
  byId("taskProjectId").value = projectIdForTask(task);
  ensureTaskOwnerOption(task);
  byId("taskOwner").value = task.ownerId;
  updateTaskCollaboratorOptions(taskCollaboratorIds(task));
  updateTaskCategoryOptions(task.category);
  byId("taskWorkType").value = normalizeTaskWorkType(task);
  byId("taskRecurrence").value = normalizeTaskRecurrence(task);
  byId("taskStartDate").value = task.startDate || "";
  byId("taskDue").value = task.due;
  byId("taskDueTime").value = task.dueTime || "";
  byId("taskStatus").value = normalizeTaskStatus(task.status);
  byId("taskProgress").value = task.progress;
  byId("taskQualityPercent").value = normalizeTaskQualityInput(task.qualityPercent);
  byId("taskNote").value = !canEditTaskDetails(task) && canUpdateTaskProgress(task) && !taskHasQualityPercent(task) ? "" : task.note;
  updateTaskResponseMeta(task);
  byId("taskAttachments").value = "";
  taskAttachmentDraft = [...(task.attachments || [])];
  renderTaskAttachmentDraft();
  updateTaskFormLock(task);
  renderCustomFieldsForScope("tasks");
  applyFieldCustomizations();
}

function latestTaskProgressReport(task) {
  return [...(task?.progressReports || [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
}

function sortedTaskProgressReports(task) {
  return [...(task?.progressReports || [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function taskProgressReportRowsHtml(task) {
  const reports = sortedTaskProgressReports(task);
  if (!reports.length) return "";
  return reports
    .map(
      (report, index) => {
        const isCompletionReview = report.type === "completion-review";
        const reportStatus = normalizeTaskStatus(report.status || task.status);
        const transition = report.previousStatus && report.previousStatus !== reportStatus
          ? `Chuyển trạng thái: ${report.previousStatus} -> ${reportStatus}`
          : reportStatus;
        const reviewTiming = isCompletionReview && report.decision === "passed"
          ? report.completionTiming || taskCompletionTimingStatus(task)
          : "";
        const reviewTimingLabel = reviewTiming === "ahead" ? "Vượt tiến độ" : reviewTiming === "late" ? "Chậm tiến độ" : "";
        const reviewResult = report.decision === "passed"
          ? `<span class="task-completion-review-value is-passed">Đạt${reviewTimingLabel ? `<span class="task-completion-timing is-${reviewTiming}">${reviewTimingLabel}</span>` : ""}</span>`
          : "Không đạt";
        const reviewTransition = isCompletionReview && report.previousStatus && report.previousStatus !== reportStatus
          ? `<span><strong>${escapeHtml(transition)}</strong></span>`
          : "";
        return `
          <div class="progress-report-row">
            <small>Lần ${reports.length - index} · ${escapeHtml(formatDateTime(report.createdAt) || "Chưa rõ thời gian")} · ${escapeHtml(report.createdBy || "Người cập nhật")}</small>
            ${isCompletionReview ? `<span><strong>Đánh giá hoàn thành:</strong> ${reviewResult}</span>${reviewTransition}` : `<span><strong>${escapeHtml(transition)}</strong> · Tiến độ ${formatScore(report.progress)}%</span>`}
            ${report.action ? `<span>${escapeHtml(report.action)}</span>` : ""}
            ${report.note ? `<span>${escapeHtml(report.note)}</span>` : ""}
          </div>
        `;
      },
    )
    .join("");
}

function taskProgressReportListHtml(task) {
  const rows = taskProgressReportRowsHtml(task);
  return rows ? `<div class="progress-report-list">${rows}</div>` : "";
}

function renderTaskProgressReportList(targetId, task) {
  const container = byId(targetId);
  if (!container) return;
  container.innerHTML = taskProgressReportRowsHtml(task);
}

function updateTaskResponseMeta(task) {
  const taskProgressMeta = byId("taskProgressMeta");
  if (!task) {
    taskProgressMeta.textContent = "";
    taskProgressMeta.dataset.baseText = "";
    renderTaskProgressReportList("taskProgressReportList", null);
    return;
  }
  const taskLatestReport = latestTaskProgressReport(task);
  taskProgressMeta.textContent = taskLatestReport
    ? `Cập nhật gần nhất lúc ${formatDateTime(taskLatestReport.createdAt)} bởi ${taskLatestReport.createdBy || "người thực hiện"}: ${formatScore(taskLatestReport.progress)}%.`
    : "Chưa có cập nhật tiến độ.";
  taskProgressMeta.dataset.baseText = taskProgressMeta.textContent;
  renderTaskProgressReportList("taskProgressReportList", task);
  return;

  const responseMeta = byId("taskResponseMeta");
  const progressMeta = byId("taskProgressMeta");
  if (!task) {
    responseMeta.textContent = "";
    progressMeta.textContent = "";
    progressMeta.dataset.baseText = "";
    renderTaskProgressReportList("taskProgressReportList", null);
    return;
  }
  if (!isAssignedTask(task)) {
    responseMeta.textContent = "";
    const latestReport = latestTaskProgressReport(task);
    progressMeta.textContent = latestReport
      ? `Cập nhật gần nhất lúc ${formatDateTime(latestReport.createdAt)} bởi ${latestReport.createdBy || "người thực hiện"}: ${formatScore(latestReport.progress)}%.`
      : "Chưa có cập nhật tiến độ.";
    progressMeta.dataset.baseText = progressMeta.textContent;
    renderTaskProgressReportList("taskProgressReportList", task);
    return;
  }
  responseMeta.textContent = task.responseAt
    ? `Phản hồi lúc ${formatDateTime(task.responseAt)} bởi ${task.responseByName || "người được giao"}.`
    : "Chưa có phản hồi nhận việc.";
  const latestReport = latestTaskProgressReport(task);
  progressMeta.textContent = latestReport
    ? `Báo cáo/cập nhật gần nhất lúc ${formatDateTime(latestReport.createdAt)} bởi ${latestReport.createdBy || "người được giao"}: ${formatScore(latestReport.progress)}%.`
    : "Chưa có báo cáo tiến độ.";
  progressMeta.dataset.baseText = progressMeta.textContent;
  renderTaskProgressReportList("taskProgressReportList", task);
}

function updateTaskFormLock(task = null) {
  const existingTask = task || state.tasks.find((item) => item.id === byId("taskId").value);
  const adminOverride = isAdmin();
  const kind = TASK_KIND_REGULAR;
  const ownerId = byId("taskOwner").value;
  const canEditDetails = existingTask
    ? canEditTaskDetails(existingTask)
    : kind === TASK_KIND_ASSIGNED
      ? canAssignTasks()
      : canCreateRegularTasks();
  const reportLockedByApproval = !!existingTask && taskProgressLockedAfterApproval(existingTask) && !adminOverride;
  const canUpdateReport = existingTask ? !reportLockedByApproval && (adminOverride || canUpdateTaskProgress(existingTask) || canEditDetails) : canEditDetails;
  const canUpdateCollaborators = existingTask ? !reportLockedByApproval && (canEditDetails || canUpdateTaskCollaborators(existingTask)) : canEditDetails;
  const canEditQuality = !!existingTask && adminOverride;
  const isReportOnly = !!existingTask && !canEditDetails && canUpdateTaskProgress(existingTask) && !reportLockedByApproval;
  byId("taskOwnerLabelText").textContent = kind === TASK_KIND_ASSIGNED ? "Người được giao" : "Người thực hiện";
  byId("taskNoteLabelText").textContent = isReportOnly ? "Nội dung công việc / Báo cáo tiến độ mới" : kind === TASK_KIND_ASSIGNED ? "Yêu cầu giao việc" : "Nội dung công việc / Báo cáo tiến độ";
  byId("taskNote").placeholder =
    isReportOnly
      ? "Nhập nội dung báo cáo tiến độ mới. Mỗi lần lưu sẽ tạo một dòng lịch sử riêng."
      : kind === TASK_KIND_ASSIGNED
        ? "Nội dung yêu cầu, rủi ro, phối hợp, hồ sơ liên quan..."
        : "Nội dung công việc, tiến độ thực hiện, rủi ro, phối hợp, hồ sơ liên quan...";
  document.querySelectorAll(".assignment-only").forEach((element) => {
    element.classList.toggle("is-hidden", kind !== TASK_KIND_ASSIGNED);
  });
  document.querySelectorAll(".regular-only").forEach((element) => {
    element.classList.toggle("is-hidden", kind !== TASK_KIND_REGULAR);
  });
  byId("taskForm")
    .querySelectorAll("#taskTitle, #taskProjectId, #taskOwner, #taskCategory, #taskWorkType, #taskRecurrence, #taskStartDate, #taskDue, #taskDueTime")
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  const ownerPickerLocked = !canEditDetails || (isEmployee() && kind === TASK_KIND_REGULAR);
  const ownerPicker = byId("taskOwnerPicker");
  if (ownerPicker) {
    ownerPicker.classList.toggle("is-disabled", ownerPickerLocked);
    ownerPicker.setAttribute("aria-disabled", String(ownerPickerLocked));
    byId("taskOwnerToggle").disabled = ownerPickerLocked;
    byId("taskOwnerSearch").disabled = ownerPickerLocked;
    if (ownerPickerLocked) setTaskOwnerPickerOpen(false);
  }
  byId("taskNote").disabled = reportLockedByApproval || (!canEditDetails && !canUpdateReport);
  byId("taskCollaborators")
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      input.disabled = !canUpdateCollaborators;
    });
  byId("taskCollaborators").classList.toggle("is-disabled", !canUpdateCollaborators);
  const collaboratorPicker = byId("taskCollaboratorPicker");
  if (collaboratorPicker) {
    collaboratorPicker.classList.toggle("is-disabled", !canUpdateCollaborators);
    collaboratorPicker.setAttribute("aria-disabled", String(!canUpdateCollaborators));
    if (!canUpdateCollaborators) setTaskCollaboratorPickerOpen(false);
  }
  if (isEmployee() && kind === TASK_KIND_REGULAR) {
    byId("taskOwner").disabled = true;
  }
  byId("taskStatus").disabled = !canUpdateReport;
  byId("taskForm")
    .querySelectorAll("#taskProgress, #taskAttachments")
    .forEach((input) => {
      input.disabled = !canUpdateReport;
    });
  const qualityInput = byId("taskQualityPercent");
  if (!taskCompletionIsApproved(existingTask) && !adminOverride) {
    qualityInput.value = "";
  }
  qualityInput.disabled = !canEditQuality;
  qualityInput.title = canEditQuality
    ? "Admin có thể cập nhật đánh giá chất lượng và mọi dữ liệu công việc, kể cả khi công việc đang khóa."
    : "Đánh giá chất lượng được nhập cùng kết quả Đạt tại màn hình Duyệt hoàn thành.";
  if (reportLockedByApproval) {
    const progressMeta = byId("taskProgressMeta");
    if (progressMeta) {
      const baseText = progressMeta.dataset.baseText || progressMeta.textContent || "";
      progressMeta.textContent = `${baseText ? `${baseText} ` : ""}Công việc đã được đánh giá hoàn thành là Đạt, báo cáo tiến độ đã khóa.`;
    }
  }
  byId("taskForm").querySelector("button[type='submit']").disabled = !canEditDetails && !canUpdateReport && !canEditQuality;
}

function updateAssignmentTaskResponseMeta(task) {
  const responseMeta = byId("assignmentTaskResponseMeta");
  const progressMeta = byId("assignmentTaskProgressMeta");
  if (!task) {
    responseMeta.textContent = "";
    progressMeta.textContent = "";
    progressMeta.dataset.baseText = "";
    renderTaskProgressReportList("assignmentTaskProgressReportList", null);
    return;
  }
  responseMeta.textContent = task.responseAt
    ? `Phản hồi lúc ${formatDateTime(task.responseAt)} bởi ${task.responseByName || "người được giao"}.`
    : "Chưa có phản hồi nhận việc.";
  const latestReport = latestTaskProgressReport(task);
  progressMeta.textContent = latestReport
    ? `Báo cáo gần nhất lúc ${formatDateTime(latestReport.createdAt)} bởi ${latestReport.createdBy || "người được giao"}: ${formatScore(latestReport.progress)}%.`
    : "Chưa có báo cáo tiến độ.";
  progressMeta.dataset.baseText = progressMeta.textContent;
  renderTaskProgressReportList("assignmentTaskProgressReportList", task);
}

function updateAssignmentTaskFormLock(task = null) {
  const existingTask = task || state.tasks.find((item) => item.id === byId("assignmentTaskId").value);
  const adminOverride = isAdmin();
  const isClosed = existingTask && normalizeTaskStatus(existingTask.status) === TASK_STATUS_CLOSED;
  const canEditDetails = existingTask ? (!isClosed || adminOverride) && canEditTaskDetails(existingTask) : canAssignTaskToPerson(byId("assignmentTaskOwner").value) || canAssignTasks();
  const reportLockedByApproval = !!existingTask && taskProgressLockedAfterApproval(existingTask) && !adminOverride;
  const canUpdateReport = existingTask ? (!isClosed || adminOverride) && !reportLockedByApproval && (adminOverride || canUpdateTaskProgress(existingTask) || canEditDetails) : canEditDetails;
  const canUpdateCollaborators = existingTask ? (!isClosed || adminOverride) && !reportLockedByApproval && (canEditDetails || canUpdateTaskCollaborators(existingTask)) : canEditDetails;
  const canEditQuality = (!!existingTask && adminOverride) && (!isClosed || adminOverride);
  byId("assignmentTaskAssignerLabel").value = existingTask?.assignedByName || existingTask?.createdBy || (canAssignTasks() ? currentActorInfo().name : "");
  byId("assignmentTaskForm")
    .querySelectorAll("#assignmentTaskTitle, #assignmentTaskProjectId, #assignmentTaskOwner, #assignmentTaskCategory, #assignmentTaskStartDate, #assignmentTaskDue, #assignmentTaskDueTime, #assignmentTaskNote")
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  byId("assignmentTaskCollaborator").disabled = !canUpdateCollaborators;
  byId("assignmentTaskStatus").disabled = !canUpdateReport;
  byId("assignmentTaskForm")
    .querySelectorAll("#assignmentTaskProgress, #assignmentTaskAttachments")
    .forEach((input) => {
      input.disabled = !canUpdateReport;
    });
  const qualityInput = byId("assignmentTaskQualityPercent");
  if (!taskCompletionIsApproved(existingTask) && !adminOverride) {
    qualityInput.value = "";
  }
  qualityInput.disabled = !canEditQuality;
  qualityInput.title = canEditQuality
    ? "Admin có thể cập nhật đánh giá chất lượng và mọi dữ liệu công việc, kể cả khi công việc đang khóa."
    : "Đánh giá chất lượng được nhập cùng kết quả Đạt tại màn hình Duyệt hoàn thành.";
  const canRespondToAssignment = !!existingTask && (!isClosed || adminOverride) && !reportLockedByApproval && (adminOverride || canReportTask(existingTask));
  const collaboratorProgressOnly = !!existingTask && !canEditDetails && canCollaborateTask(existingTask) && !canReportTask(existingTask);
  const departmentManagementProgressOnly = !!existingTask && !canEditDetails && canManageDepartmentTaskProgress(existingTask) && !canReportTask(existingTask);
  const progressOnly = collaboratorProgressOnly || departmentManagementProgressOnly;
  byId("assignmentTaskResponseStatus").disabled = !canRespondToAssignment;
  byId("assignmentTaskResponseNote").disabled = !(existingTask && (!isClosed || adminOverride) && !reportLockedByApproval && canUpdateReport);
  byId("assignmentTaskResponseNoteLabel").textContent = progressOnly ? "Báo cáo tiến độ mới" : "Nội dung phản hồi / Báo cáo tiến độ";
  byId("assignmentTaskResponseNote").placeholder = progressOnly
    ? "Nhập nội dung báo cáo tiến độ mới. Mỗi lần lưu sẽ tạo một dòng lịch sử riêng."
    : "Xác nhận nhận việc, lý do cần trao đổi hoặc báo cáo tiến độ thực hiện...";
  if (reportLockedByApproval) {
    const progressMeta = byId("assignmentTaskProgressMeta");
    if (progressMeta) {
      const baseText = progressMeta.dataset.baseText || progressMeta.textContent || "";
      progressMeta.textContent = `${baseText ? `${baseText} ` : ""}Công việc đã được đánh giá hoàn thành là Đạt, báo cáo tiến độ đã khóa.`;
    }
  }
  byId("assignmentTaskForm").querySelector("button[type='submit']").disabled = !canEditDetails && !canUpdateReport && !canEditQuality;
  const closedOption = byId("assignmentTaskStatus").querySelector(`option[value="${TASK_STATUS_CLOSED}"]`);
  if (closedOption) closedOption.disabled = !adminOverride;
  byId("endAssignmentTask").classList.toggle("is-hidden", !canEndTaskAssignment(existingTask));
  byId("endAssignmentTask").disabled = !canEndTaskAssignment(existingTask);
}

function populateAssignmentTaskForm(task) {
  if (!task) return;
  byId("assignmentTaskId").value = task.id;
  byId("assignmentTaskTitle").value = task.title || "";
  renderTaskProjectOptions();
  byId("assignmentTaskProjectId").value = projectIdForTask(task);
  byId("assignmentTaskOwner").value = task.ownerId || "";
  byId("assignmentTaskCollaborator").value = task.collaboratorId || "";
  renderPersonOptions();
  byId("assignmentTaskOwner").value = task.ownerId || "";
  byId("assignmentTaskCollaborator").value = task.collaboratorId || "";
  updateTaskCategoryOptions(task.category, "assignmentTaskOwner", "assignmentTaskCategory");
  byId("assignmentTaskStartDate").value = task.startDate || "";
  byId("assignmentTaskDue").value = task.due || "";
  byId("assignmentTaskDueTime").value = task.dueTime || "";
  byId("assignmentTaskStatus").value = normalizeTaskStatus(task.status);
  byId("assignmentTaskProgress").value = task.progress || 0;
  byId("assignmentTaskQualityPercent").value = normalizeTaskQualityInput(task.qualityPercent);
  byId("assignmentTaskNote").value = task.note || "";
  byId("assignmentTaskAssignerLabel").value = task.assignedByName || task.createdBy || "";
  byId("assignmentTaskResponseStatus").value = task.responseStatus || "";
  byId("assignmentTaskResponseNote").value = !canEditTaskDetails(task) && canUpdateTaskProgress(task) && !taskHasQualityPercent(task) ? "" : task.responseNote || "";
  updateAssignmentTaskResponseMeta(task);
  byId("assignmentTaskAttachments").value = "";
  assignmentAttachmentDraft = [...(task.attachments || [])];
  renderAssignmentTaskAttachmentDraft();
  updateAssignmentTaskFormLock(task);
}

function copiedTaskTitle(title) {
  const value = String(title || "").trim();
  return value ? `Bản sao - ${value}` : "Bản sao công việc";
}

function copyRegularTaskToForm(task) {
  resetTaskForm();
  byId("taskTitle").value = copiedTaskTitle(task.title);
  byId("taskProjectId").value = projectIdForTask(task);
  byId("taskOwner").value = task.ownerId || "";
  updateTaskCollaboratorOptions(taskCollaboratorIds(task));
  updateTaskCategoryOptions(task.category);
  byId("taskWorkType").value = normalizeTaskWorkType(task);
  byId("taskRecurrence").value = normalizeTaskRecurrence(task);
  byId("taskStartDate").value = task.startDate || "";
  byId("taskDue").value = task.due || "";
  byId("taskDueTime").value = task.dueTime || "";
  byId("taskStatus").value = TASK_STATUS_PREPARING;
  byId("taskProgress").value = 0;
  byId("taskQualityPercent").value = "";
  byId("taskNote").value = task.note || "";
  taskAttachmentDraft = [];
  byId("taskAttachments").value = "";
  updateTaskResponseMeta(null);
  renderTaskAttachmentDraft();
  updateTaskFormLock();
  renderCustomFieldsForScope("tasks");
  applyFieldCustomizations();
  focusEditForm("taskForm", "taskTitle");
}

function copyAssignmentTaskToForm(task) {
  resetAssignmentTaskForm();
  renderTaskInboxDialog();
  byId("taskInboxDialog").classList.remove("is-hidden");
  byId("taskInboxDialog").setAttribute("aria-hidden", "false");
  byId("assignmentTaskTitle").value = copiedTaskTitle(task.title);
  byId("assignmentTaskProjectId").value = projectIdForTask(task);
  byId("assignmentTaskOwner").value = task.ownerId || "";
  byId("assignmentTaskCollaborator").value = task.collaboratorId || "";
  updateTaskCategoryOptions(task.category, "assignmentTaskOwner", "assignmentTaskCategory");
  byId("assignmentTaskStartDate").value = task.startDate || "";
  byId("assignmentTaskDue").value = task.due || "";
  byId("assignmentTaskDueTime").value = task.dueTime || "";
  byId("assignmentTaskStatus").value = TASK_STATUS_PREPARING;
  byId("assignmentTaskProgress").value = 0;
  byId("assignmentTaskQualityPercent").value = "";
  byId("assignmentTaskNote").value = task.note || "";
  byId("assignmentTaskResponseStatus").value = "";
  byId("assignmentTaskResponseNote").value = "";
  assignmentAttachmentDraft = [];
  byId("assignmentTaskAttachments").value = "";
  updateAssignmentTaskResponseMeta(null);
  renderAssignmentTaskAttachmentDraft();
  updateAssignmentTaskFormLock();
  byId("assignmentTaskTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  byId("assignmentTaskTitle").focus({ preventScroll: true });
}

function copyTaskToForm(task) {
  if (!task || !canCopyTask(task)) return;
  if (isAssignedTask(task)) {
    copyAssignmentTaskToForm(task);
    return;
  }
  copyRegularTaskToForm(task);
}

function resetAssignmentTaskForm() {
  byId("assignmentTaskForm").reset();
  byId("assignmentTaskId").value = "";
  renderTaskProjectOptions();
  byId("assignmentTaskProjectId").value = "";
  byId("assignmentTaskProgress").value = 0;
  byId("assignmentTaskQualityPercent").value = "";
  byId("assignmentTaskStatus").value = TASK_STATUS_PREPARING;
  byId("assignmentTaskStartDate").value = "";
  byId("assignmentTaskDueTime").value = "";
  byId("assignmentTaskAssignerLabel").value = canAssignTasks() ? currentActorInfo().name : "";
  byId("assignmentTaskCollaborator").value = "";
  byId("assignmentTaskResponseStatus").value = "";
  byId("assignmentTaskResponseNote").value = "";
  updateAssignmentTaskResponseMeta(null);
  byId("assignmentTaskAttachments").value = "";
  assignmentAttachmentDraft = [];
  renderPersonOptions();
  updateTaskCategoryOptions("", "assignmentTaskOwner", "assignmentTaskCategory");
  renderAssignmentTaskAttachmentDraft();
  updateAssignmentTaskFormLock();
}

function endAssignmentTask(taskId = byId("assignmentTaskId").value) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canEndTaskAssignment(task)) return false;
  if (!confirm("Kết thúc công việc này? Công việc sẽ được đóng lại và không còn hiện thông báo quá hạn.")) return false;
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const owner = personById(task.ownerId);
  const previousStatus = normalizeTaskStatus(task.status);
  const record = applyRecordAudit(
    {
      ...task,
      status: TASK_STATUS_CLOSED,
      closedAt: timestamp,
      closedBy: actor.name,
      closedById: actor.id,
      progressReports: [
        ...(task.progressReports || []),
        {
          id: uid("task-report"),
          progress: Number(task.progress || 0),
          status: TASK_STATUS_CLOSED,
          previousStatus,
          action: "Kết thúc công việc",
          note: `Đóng công việc. Trạng thái trước đó: ${previousStatus}.`,
          createdAt: timestamp,
          createdById: actor.id,
          createdBy: actor.name,
        },
      ],
    },
    task,
  );
  Object.assign(task, record);
  logActivity({
    action: "Kết thúc",
    module: "Công việc",
    targetType: "task",
    targetId: task.id,
    personId: task.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(task),
    title: task.title,
    details: `Đóng công việc được giao. Trạng thái trước đó: ${previousStatus}`,
    score: `${formatScore(task.progress)}%`,
  });
  saveState();
  populateAssignmentTaskForm(task);
  renderTaskInbox();
  renderTaskInboxDialog();
  renderTaskBoard();
  renderDashboard();
  return true;
}

function endAssignmentTaskFromForm() {
  endAssignmentTask();
}

function populateDepartmentEvaluationForm(evaluation) {
  if (!evaluation) return;
  byId("deptEvalPeriod").value = evaluation.period;
  renderDepartmentEvaluationOptions(evaluation.departmentId);
  byId("deptEvalDepartment").value = evaluation.departmentId;
  renderAdjustmentActorInput("deptEvalReviewer", evaluation);
  byId("deptEvalRewardDiscipline").value = evaluation.rewardDisciplineNote || "";
  byId("deptEvalAdjustmentType").value = normalizeDepartmentAdjustmentType(evaluation.adjustmentType);
  byId("deptEvalAdjustmentPoints").value = hasOwnValue(evaluation, "adjustmentPoints") ? evaluation.adjustmentPoints : "";
  byId("deptEvalComment").value = evaluation.comment || "";
  renderDepartmentCriteriaInputs(evaluation.criteriaScores);
  renderCustomFieldsForScope("department-evaluations");
  applyFieldCustomizations();
}

function populateEvaluationForm(evaluation) {
  if (!evaluation) return;
  byId("evalPeriod").value = evaluation.period;
  byId("evalPerson").value = evaluation.personId;
  renderAdjustmentActorInput("evalReviewer", evaluation);
  byId("evalComment").value = evaluation.comment || "";
  syncDepartmentScoreFromSelectedPerson();
  renderCriteriaInputs(evaluation.criteriaScores);
  renderBehaviorInputs(evaluation);
  updateScorePreview();
  renderCustomFieldsForScope("evaluations");
  applyFieldCustomizations();
}

function loadEvaluationForSelection() {
  const period = byId("evalPeriod").value || state.activePeriod;
  const personId = byId("evalPerson").value;
  const existing = latestEvaluation(personId, period);
  renderAdjustmentActorInput("evalReviewer", existing);
  byId("evalComment").value = existing?.comment || "";
  syncDepartmentScoreFromSelectedPerson();
  renderCriteriaInputs(existing?.criteriaScores || {});
  renderBehaviorInputs(existing || {});
  updateScorePreview();
  renderCustomFieldsForScope("evaluations");
  applyFieldCustomizations();
}

function openHistoryTimelineTarget(target) {
  const { targetType, targetId, personId, departmentId, title } = target;
  if (targetType === "person" && canAccessView("people")) {
    const person = personById(targetId);
    byId("personSearch").value = person?.name || title || "";
    renderPeopleTable();
    switchView("people");
    byId("peopleTable").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (targetType === "task" && canAccessView("tasks")) {
    const task = state.tasks.find((item) => item.id === targetId);
    byId("taskStatusFilter").value = "";
    byId("taskSearch").value = task?.title || title || "";
    byId("taskProjectFilter").value = "";
    clearTaskTimeFilter();
    renderTaskBoard();
    switchView("tasks");
    if (task && isAssignedTask(task)) {
      renderTaskInboxDialog();
      byId("taskInboxDialog").classList.remove("is-hidden");
      byId("taskInboxDialog").setAttribute("aria-hidden", "false");
      if (canOpenTask(task)) {
        populateAssignmentTaskForm(task);
        const focusTarget = byId("assignmentTaskNote");
        focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        focusTarget.focus({ preventScroll: true });
      }
    } else if (task && canOpenTask(task)) {
      populateTaskForm(task);
      focusEditForm("taskForm", canEditTaskDetails(task) ? "taskTitle" : "taskNote");
    } else {
      byId("taskBoard").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }
  if (targetType === "departmentEvaluation" && canAccessView("department-evaluations")) {
    const evaluation = state.departmentEvaluations.find((item) => item.id === targetId);
    switchView("department-evaluations");
    if (evaluation) {
      populateDepartmentEvaluationForm(evaluation);
      focusEditForm("departmentEvaluationForm", "deptEvalPeriod");
    }
    return;
  }
  if (targetType === "evaluation" && canAccessView("evaluations")) {
    const evaluation = state.evaluations.find((item) => item.id === targetId);
    switchView("evaluations");
    if (evaluation) {
      populateEvaluationForm(evaluation);
      focusEditForm("evaluationForm", "evalPeriod");
    }
    return;
  }
  if (targetType === "account" && canAccessView("accounts")) {
    const account = accountById(targetId);
    switchView("accounts");
    if (account && (canManageAccounts() || account.id === currentAccount()?.id)) {
      populateAccountForm(account);
      focusEditForm("accountForm", "accountDisplayName");
    }
    return;
  }
  if (targetType === "bulletin" && canAccessView("bulletin")) {
    const post = (state.bulletins || []).find((item) => item.id === targetId);
    byId("bulletinSearch").value = post?.title || title || "";
    byId("bulletinCategoryFilter").value = "";
    renderBulletinBoard();
    switchView("bulletin");
    byId("bulletinList").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (targetType === "archive" && canAccessView("archive")) {
    const record = archiveById(targetId);
    byId("archiveSearch").value = record?.title || title || "";
    byId("archiveCategoryFilter").value = "";
    byId("archiveStatusFilter").value = "";
    byId("archiveDepartmentFilter").value = "";
    renderArchive();
    switchView("archive");
    byId("archiveList").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (departmentId) openHistoryDetail("department", departmentId);
  else if (personId) openHistoryDetail("person", personId);
}

function openHistoryDetail(type, targetId) {
  if (!canAccessView("history")) return;
  byId("historyType").value = type;
  renderHistoryTargetOptions();
  byId("historyTarget").value = targetId;
  renderHistory();
  switchView("history");
}

function clearDashboardDrillFilters() {
  evaluationGradeFilter = "";
  peoplePendingEvaluationOnly = false;
  updateEvaluationFilterNote(0);
  updatePeopleFilterNote(0);
}

function openDashboardGradeDetail(grade) {
  if (!grade) return;
  if (grade === "Chưa chấm") {
    if (!canAccessView("people")) return;
    evaluationGradeFilter = "";
    peoplePendingEvaluationOnly = true;
    byId("personSearch").value = "";
    renderPeopleTable();
    switchView("people");
    byId("peopleFilterNote").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (!canAccessView("evaluations")) return;
  peoplePendingEvaluationOnly = false;
  evaluationGradeFilter = grade;
  renderPeopleTable();
  renderEvaluationTable();
  switchView("evaluations");
  byId("evaluationFilterNote").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openDashboardDepartmentEvaluationDetail(departmentId) {
  if (!departmentId || !canAccessView("department-evaluations")) return;
  const visible = visibleDepartmentsForDepartmentEvaluations().some((department) => department.id === departmentId);
  if (!visible) return;
  clearDashboardDrillFilters();
  byId("deptEvalPeriod").value = state.activePeriod;
  renderDepartmentEvaluationOptions(departmentId);
  byId("deptEvalDepartment").value = departmentId;
  loadDepartmentEvaluationForSelection();
  renderDepartmentEvaluationTable();
  switchView("department-evaluations");
  focusEditForm("departmentEvaluationForm", "deptEvalDepartment");
}

function openDashboardPersonalEvaluationDetail(evaluationId) {
  if (!evaluationId || !canAccessView("evaluations")) return;
  let evaluation = state.evaluations.find((item) => item.id === evaluationId);
  if (!evaluation && String(evaluationId).startsWith("auto-personal-evaluation:")) {
    const [, personId, period] = String(evaluationId).match(/^auto-personal-evaluation:(.+):(\d{4}-\d{2})$/) || [];
    evaluation = personalEvaluationSnapshot(personId, period);
  }
  if (!evaluation || !personIsVisible(evaluation.personId)) return;
  clearDashboardDrillFilters();
  if (evaluation.autoCalculated) {
    byId("evalPeriod").value = evaluation.period;
    byId("evalPerson").value = evaluation.personId;
    loadEvaluationForSelection();
  } else {
    populateEvaluationForm(evaluation);
  }
  renderEvaluationTable();
  switchView("evaluations");
  focusEditForm("evaluationForm", "evalPeriod");
}

function openDashboardTaskDetail(taskId) {
  if (!taskId || !canAccessView("tasks")) return;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canViewTaskRecord(task)) return;
  openTaskDetailDialog(taskId);
}

function openDashboardDetail(action) {
  if (action === "people" && canAccessView("people")) {
    clearDashboardDrillFilters();
    byId("personSearch").value = "";
    renderPeopleTable();
    switchView("people");
    byId("peopleTable").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "overdue" && canAccessView("tasks")) {
    byId("taskSearch").value = "";
    byId("taskStatusFilter").value = "";
    byId("taskProjectFilter").value = "";
    clearTaskTimeFilter();
    renderTaskBoard();
    switchView("tasks");
    openTaskStatusDetailDialog("Quá hạn");
    return;
  }
  if ((action === "evaluations" || action === "reward") && canAccessView("evaluations")) {
    clearDashboardDrillFilters();
    renderEvaluationTable();
    switchView("evaluations");
    return;
  }
  if (canAccessView("history")) {
    switchView("history");
  }
}

function renderPrintOptions() {
  const activeId = document.querySelector(".view.is-active")?.id || "dashboard";
  const available = printableSections.filter((section) => canAccessView(section.id));
  byId("printOptions").innerHTML = available
    .map((section) => {
      const checked = section.id === activeId || activeId === "dashboard";
      return `
        <label class="print-option">
          <input type="checkbox" name="printSection" value="${escapeHtml(section.id)}" ${checked ? "checked" : ""}>
          <span>${escapeHtml(section.label)}</span>
        </label>
      `;
    })
    .join("");
}

function openPrintDialog() {
  renderPrintOptions();
  byId("printDialog").classList.remove("is-hidden");
  byId("printDialog").setAttribute("aria-hidden", "false");
}

function closePrintDialog() {
  byId("printDialog").classList.add("is-hidden");
  byId("printDialog").setAttribute("aria-hidden", "true");
}

function updatePrintHeader(sectionIds) {
  const account = currentAccount();
  const labels = printableSections.filter((section) => sectionIds.includes(section.id)).map((section) => section.label);
  byId("printReportPeriod").textContent = formatMonthPeriod(state.activePeriod || currentMonth());
  byId("printReportSections").textContent = labels.join(", ");
  byId("printReportUser").textContent = account ? `${account.displayName} (${accountRoleLabels[account.role] || account.role})` : "-";
  byId("printReportDate").textContent = formatDate(new Date());
}

function clearPrintSelection() {
  document.body.classList.remove("is-printing-selection");
  document.querySelectorAll(".view.is-print-selected").forEach((view) => view.classList.remove("is-print-selected"));
}

function printSelectedSections(sectionIds) {
  clearPrintSelection();
  updatePrintHeader(sectionIds);
  sectionIds.forEach((id) => byId(id)?.classList.add("is-print-selected"));
  finishDashboardChartAnimations();
  document.body.classList.add("is-printing-selection");
  closePrintDialog();
  const runPrint = () => window.print();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(runPrint));
  } else {
    setTimeout(runPrint, 0);
  }
}

function renderAll(options = {}) {
  searchIndexGeneration += 1;
  applySystemCustomization();
  const viewId = applyAccessControls();
  if (!currentAccount()) return;
  ensureRecurringTasksForPeriod();
  byId("activePeriod").value = state.activePeriod;
  byId("evalPeriod").value = state.activePeriod;
  byId("deptEvalPeriod").value = state.activePeriod;
  renderActiveView(viewId, { animateDashboard: options.animateDashboard === true });
  renderHelpSupportBadge();
  renderBirthdayCelebration();
}

function resetPersonForm() {
  byId("personForm").reset();
  byId("personId").value = "";
  renderDepartmentAndRoleOptions();
}

function resetTaskForm() {
  byId("taskForm").reset();
  byId("taskId").value = "";
  renderTaskProjectOptions();
  byId("taskProjectId").value = "";
  byId("taskCollaborators").innerHTML = "";
  setTaskOwnerPickerOpen(false);
  setTaskCollaboratorPickerOpen(false);
  renderPersonOptions();
  byId("taskWorkType").value = TASK_WORK_TYPE_ROUTINE;
  byId("taskRecurrence").value = TASK_RECURRENCE_NONE;
  byId("taskProgress").value = 0;
  byId("taskQualityPercent").value = "";
  byId("taskStatus").value = TASK_STATUS_PREPARING;
  byId("taskStartDate").value = "";
  byId("taskDueTime").value = "";
  updateTaskResponseMeta(null);
  byId("taskAttachments").value = "";
  taskAttachmentDraft = [];
  updateTaskCategoryOptions();
  renderTaskAttachmentDraft();
  updateTaskFormLock();
}

function resetEvaluationForm() {
  byId("evaluationForm").reset();
  byId("evalPeriod").value = state.activePeriod;
  renderPersonOptions();
  loadEvaluationForSelection();
}

function resetDepartmentEvaluationForm() {
  byId("departmentEvaluationForm").reset();
  byId("deptEvalPeriod").value = state.activePeriod;
  renderDepartmentEvaluationOptions();
  loadDepartmentEvaluationForSelection();
}

function seedDemoData() {
  if (state.people.length || state.tasks.length || state.evaluations.length || state.departmentEvaluations.length) {
    if (!confirm("Thao tác này sẽ thêm dữ liệu mẫu vào dữ liệu hiện có. Tiếp tục?")) return;
  }
  const people = [
    ["Nguyễn Minh Anh", "ke-hoach", "truong-phong-ke-hoach", "Biên chế"],
    ["Trần Quốc Huy", "du-an-1", "truong-phong-du-an-1", "Biên chế"],
    ["Lê Thu Hà", "gpmb", "can-bo-gpmb", "Hợp đồng chuyên môn"],
    ["Phạm Đức Long", "ha-tang", "can-bo-ha-tang", "Hợp đồng chuyên môn"],
  ].map((item) => ({
    id: uid("person"),
    name: item[0],
    departmentId: item[1],
    roleId: item[2],
    contract: item[3],
    gender: "",
    qualification: "",
    contractTerm: "",
    contractSignedDate: "",
    phone: "",
    birthDate: "",
    start: "",
    salaryCoefficient: "",
    salaryGrade: "",
    salaryReviewDate: "",
    address: "",
    note: "",
  }));
  state.people.push(...people);
  [
    ["nhanvien", "Nhân viên mẫu", "employee", people[2]],
    ["truongphong", "Trưởng phòng mẫu", "manager", people[1]],
  ].forEach(([username, displayName, role, person]) => {
    if (!state.accounts.some((account) => account.username === username)) {
      state.accounts.push({
        id: uid("account"),
        username,
        password: createTemporaryPassword(),
        passwordChangeRequired: false,
        displayName,
        role,
        personId: person.id,
        departmentId: person.departmentId,
      });
    }
  });
  state.tasks.push(
    {
      id: uid("task"),
      title: "Tổng hợp báo cáo tiến độ tháng",
      ownerId: people[0].id,
      category: "Cải cách hành chính",
      due: `${state.activePeriod}-27`,
      status: "Đang thực hiện",
      progress: 70,
      note: "",
    },
    {
      id: uid("task"),
      title: "Kiểm tra nghiệm thu hạng mục đường trục",
      ownerId: people[1].id,
      category: "Tiến độ - chất lượng - chi phí",
      due: `${state.activePeriod}-24`,
      status: "Hoàn thành",
      progress: 100,
      note: "",
    },
  );
  departments.forEach((department, index) => {
    const score = 84 + index * 2;
    state.departmentEvaluations.push(applyRecordAudit({
      id: uid("dept-eval"),
      period: state.activePeriod,
      departmentId: department.id,
      criteriaScores: {},
      finalScore: score,
      grade: gradeDepartment(score),
      reviewer: "Giám đốc",
      comment: "Dữ liệu mẫu phục vụ chạy thử KPI phòng.",
    }));
  });
  people.forEach((person, index) => {
    const departmentScore = latestDepartmentEvaluation(person.departmentId)?.finalScore ?? 84 + index;
    const personalScore = 86 + index * 2;
    const behaviorScore = index === 0 ? 2 : 0;
    const finalScore = calculatePersonalFinalScore(personalScore, departmentScore, behaviorScore);
    state.evaluations.push(applyRecordAudit({
      id: uid("eval"),
      period: state.activePeriod,
      personId: person.id,
      criteriaScores: {},
      behavior: {},
      personalScore,
      departmentScore,
      behaviorScore,
      finalScore,
      grade: gradePersonal(finalScore),
      reviewer: "Hội đồng thi đua",
      comment: "Dữ liệu mẫu phục vụ chạy thử.",
    }));
  });
  logActivity({
    action: "Tạo",
    module: "Dữ liệu mẫu",
    targetType: "data",
    targetId: "seed",
    title: "Nạp dữ liệu mẫu",
    details: "Tạo nhanh nhân sự, công việc, KPI phòng và KPI cá nhân mẫu.",
  });
  syncPersonnelAccounts();
  saveState();
  renderAll();
}

function readLoginGuard() {
  try {
    const value = JSON.parse(localStorage.getItem(LOGIN_GUARD_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeLoginGuard(guard) {
  try {
    localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(guard));
  } catch {
    // Server-side protection remains active when this browser blocks storage.
  }
}

function loginGuardEntryKey(username) {
  return String(username || "").trim().toLowerCase().slice(0, 96) || "anonymous";
}

function clearLocalLoginFailures(username) {
  const guard = readLoginGuard();
  delete guard[loginGuardEntryKey(username)];
  writeLoginGuard(guard);
}

function renderApplicationIdentity() {
  document.querySelectorAll("[data-app-version]").forEach((element) => {
    element.textContent = `Phiên bản ${APP_VERSION}`;
  });
}

renderApplicationIdentity();

function offlineTestSetupAvailable() {
  return isOfflineFileRuntime();
}

function closeOfflineTestSetupDialog() {
  closeModal("offlineTestSetupDialog");
  byId("offlineTestSetupError").textContent = "";
}

function openOfflineTestSetupDialog() {
  if (!offlineTestSetupAvailable()) return;
  const existingAdmin = (state.accounts || []).find((account) => account?.role === "admin");
  if (existingAdmin && !existingAdmin.offlineTestOnly) {
    byId("loginError").textContent = "Bản kiểm thử này đã có tài khoản Admin. Hãy đăng nhập bằng tài khoản đó hoặc xóa dữ liệu trình duyệt của bản file:// để khởi tạo lại.";
    return;
  }
  byId("offlineTestSetupForm").reset();
  byId("offlineTestUsername").value = existingAdmin?.username || "admin-test";
  byId("offlineTestSetupError").textContent = "";
  openModal("offlineTestSetupDialog");
  window.setTimeout(() => byId("offlineTestUsername")?.focus(), 0);
}

async function createOfflineTestAdmin(event) {
  event.preventDefault();
  if (!offlineTestSetupAvailable()) return;
  const username = byId("offlineTestUsername").value.trim();
  const password = byId("offlineTestPassword").value;
  const confirmation = byId("offlineTestPasswordConfirm").value;
  const error = byId("offlineTestSetupError");
  error.textContent = "";

  if (!/^[A-Za-z0-9._-]{3,96}$/.test(username)) {
    error.textContent = "Tên đăng nhập gồm 3-96 ký tự: chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.";
    return;
  }
  if (!isStrongAccountPassword(password)) {
    error.textContent = "Mật khẩu cần từ 10 ký tự và có ít nhất 3 nhóm: chữ hoa, chữ thường, số, ký tự đặc biệt.";
    return;
  }
  if (password !== confirmation) {
    error.textContent = "Xác nhận mật khẩu chưa khớp.";
    return;
  }
  const usernameKey = normalizedLoginUsername(username);
  const duplicate = (state.accounts || []).find(
    (account) => normalizedLoginUsername(account?.username) === usernameKey && !account.offlineTestOnly,
  );
  if (duplicate) {
    error.textContent = "Tên đăng nhập này đã có trong dữ liệu kiểm thử. Hãy chọn tên khác.";
    return;
  }

  state.accounts = (state.accounts || []).filter((account) => !account?.offlineTestOnly);
  const timestamp = new Date().toISOString();
  const account = {
    id: uid("offline-admin"),
    username,
    password: "",
    displayName: "Admin kiểm thử offline",
    role: "admin",
    personId: "",
    departmentId: "",
    accessGrants: {},
    offlineTestOnly: true,
    createdAt: timestamp,
    createdBy: "Khởi tạo kiểm thử offline",
    updatedAt: timestamp,
    updatedBy: "Khởi tạo kiểm thử offline",
  };
  // Store only a one-way verifier. The password is never retained in the local test state.
  await rememberOfflineLogin({ ...account, password }, password);
  state.accounts.push(account);
  cacheOfflineAccountDirectory(state.accounts);
  persistState();
  sharedSync.session = true;
  sharedSync.accountId = account.id;
  sharedSync.available = null;
  sharedSync.initialized = null;
  sharedSync.sessionToken = "";
  localStorage.removeItem(SHARED_SYNC_SESSION_TOKEN_KEY);
  localStorage.setItem(SESSION_KEY, account.id);
  birthdayCelebrationDisplayKey = "";
  closeOfflineTestSetupDialog();
  byId("loginForm").reset();
  renderAll();
  showSystemToast("Đã mở môi trường kiểm thử offline", "Tài khoản Admin kiểm thử chỉ hoạt động trên bản file:// của trình duyệt này và không đồng bộ lên máy chủ.", { tone: "success" });
}

byId("openOfflineTestSetup")?.classList.toggle("is-hidden", !offlineTestSetupAvailable());
byId("openOfflineTestSetup")?.addEventListener("click", openOfflineTestSetupDialog);
byId("offlineTestSetupForm")?.addEventListener("submit", createOfflineTestAdmin);
byId("closeOfflineTestSetup")?.addEventListener("click", closeOfflineTestSetupDialog);
byId("cancelOfflineTestSetup")?.addEventListener("click", closeOfflineTestSetupDialog);
byId("offlineTestSetupDialog")?.addEventListener("click", (event) => {
  if (event.target === byId("offlineTestSetupDialog")) closeOfflineTestSetupDialog();
});

// 🌟 Tự động kéo dữ liệu mây MỚI NHẤT ngay khi Đăng nhập thành công
byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = byId("loginUsername").value.trim();
  const password = byId("loginPassword").value;
  byId("loginError").textContent = "";
  // Browser-level lockouts caused valid users to be rejected after a few
  // mistyped attempts. Authentication and its light throttle are centralised
  // on the server; clear only the obsolete local marker from older versions.
  clearLocalLoginFailures(username);
  const sharedLogin = await loginSharedSession(username, password);
  if (sharedLogin.error) {
    byId("loginError").textContent = sharedLogin.error;
    return;
  }
  if (sharedLogin.warning) alert(sharedLogin.warning);
  const remoteSupabaseLogin = usingSupabaseSync() && sharedLogin.mode === "remote";
  const offlineLogin = sharedLogin.mode === "offline";
  const normalizedUsername = username.toLowerCase();
  const account = offlineLogin
    ? state.accounts.find((item) => String(item.id || "") === String(sharedLogin.offlineAccountId || ""))
    : state.accounts.find((item) => String(item.username || "").toLowerCase() === normalizedUsername && (remoteSupabaseLogin || item.password === password));
  if (!account) {
    byId("loginError").textContent = "Máy chủ đã xác thực nhưng chưa tải được hồ sơ tài khoản. Vui lòng thử lại; lần thử này không bị tính là nhập sai mật khẩu.";
    return;
  }
  if (account.disabled) {
    byId("loginError").textContent = "Tài khoản này đang bị vô hiệu hóa. Vui lòng liên hệ Admin.";
    return;
  }
  if (sharedLogin.mode !== "offline") await rememberOfflineLogin(account, password);
  clearLocalLoginFailures(username);
  localStorage.setItem(SESSION_KEY, account.id);
  birthdayCelebrationDisplayKey = "";
  const sectionHeadCatalogMigrated = migrateSectionHeadKpiCatalog();
  const personalKpiMigrated = migratePersonalKpiClassification();
  if (sectionHeadCatalogMigrated || personalKpiMigrated) {
    saveState();
    if (sharedSync.session && !isOfflineFileRuntime()) await flushSharedStateSync();
  }
  byId("loginForm").reset();
  renderAll();
  startAccountPresenceMonitoring();
});

byId("logoutButton").addEventListener("click", () => {
  logoutSharedSession();
  localStorage.removeItem(SESSION_KEY);
  renderAll();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  requestAccountPresence();
  refreshSharedState();
  scheduleSharedStateRefresh({ immediate: true });
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    reloadStateFromStorage();
    renderAll();
  }
});

byId("dashboard").addEventListener("click", (event) => {
  const evaluationDetail = event.target.closest("[data-dashboard-evaluation-detail]");
  if (evaluationDetail) {
    openDashboardPersonalEvaluationDetail(evaluationDetail.dataset.dashboardEvaluationDetail);
    return;
  }
  const departmentDetail = event.target.closest("[data-dashboard-department-detail]");
  if (departmentDetail) {
    openDashboardDepartmentEvaluationDetail(departmentDetail.dataset.dashboardDepartmentDetail);
    return;
  }
  const taskDetail = event.target.closest("[data-dashboard-task-detail]");
  if (taskDetail) {
    openDashboardTaskDetail(taskDetail.dataset.dashboardTaskDetail);
    return;
  }
  const personLink = event.target.closest("[data-dashboard-person-history]");
  if (personLink) {
    openHistoryDetail("person", personLink.dataset.dashboardPersonHistory);
    return;
  }
  const departmentLink = event.target.closest("[data-dashboard-department-history]");
  if (departmentLink) {
    openHistoryDetail("department", departmentLink.dataset.dashboardDepartmentHistory);
    return;
  }
  const gradeLink = event.target.closest("[data-dashboard-grade]");
  if (gradeLink) {
    openDashboardGradeDetail(gradeLink.dataset.dashboardGrade);
    return;
  }
  const actionLink = event.target.closest("[data-dashboard-action]");
  if (actionLink) {
    openDashboardDetail(actionLink.dataset.dashboardAction);
  }
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

byId("supportRequestForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  createSupportRequest();
});

byId("resetSupportRequest")?.addEventListener("click", resetSupportRequestForm);

byId("help")?.addEventListener("click", (event) => {
  const supportRequest = event.target.closest("[data-open-support-request]");
  if (supportRequest) {
    openSupportRequestDialog(supportRequest.dataset.openSupportRequest);
    return;
  }
  const viewButton = event.target.closest("[data-help-open-view]");
  if (viewButton) {
    switchView(viewButton.dataset.helpOpenView);
  }
});

byId("help")?.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-support-admin-form], form[data-support-user-form]");
  if (!form) return;
  event.preventDefault();
  const requestId = form.dataset.supportAdminForm || form.dataset.supportUserForm;
  const message = form.elements.message?.value || "";
  const status = form.dataset.supportAdminForm ? form.elements.status?.value || "" : "";
  updateSupportRequest(requestId, message, status);
});

byId("closeSupportRequestDetail")?.addEventListener("click", closeSupportRequestDialog);

byId("supportRequestDialog")?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-support-request]");
  if (deleteButton) {
    deleteSupportRequest(deleteButton.dataset.deleteSupportRequest);
    return;
  }
  if (event.target === byId("supportRequestDialog")) closeSupportRequestDialog();
});

byId("supportRequestDialog")?.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-support-admin-form], form[data-support-user-form]");
  if (!form) return;
  event.preventDefault();
  const requestId = form.dataset.supportAdminForm || form.dataset.supportUserForm;
  const message = form.elements.message?.value || "";
  const status = form.dataset.supportAdminForm ? form.elements.status?.value || "" : "";
  updateSupportRequest(requestId, message, status);
});

byId("toggleCustomizeMode").addEventListener("click", () => {
  setCustomizeMode(!customizeMode);
});

document.addEventListener("click", (event) => {
  if (!customizationEnabled()) return;
  if (event.target.closest("#taskOwnerPicker, #taskCollaboratorPicker")) return;
  if (event.target.closest("[data-kpi-param]")) return;
  if (event.target.closest(".customization-mini-tools")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const toolbarButton = event.target.closest("[data-open-custom-field]");
  if (toolbarButton) {
    event.preventDefault();
    event.stopPropagation();
    openCustomFieldDialog(toolbarButton.dataset.openCustomField);
    return;
  }
  const customFieldEdit = event.target.closest("[data-edit-inline-custom-field]");
  if (customFieldEdit) {
    event.preventDefault();
    event.stopPropagation();
    openCustomFieldDialog(customFieldEdit.dataset.customFieldScope, customFieldEdit.dataset.editInlineCustomField);
    return;
  }
  const popupButton = event.target.closest("[data-open-popup-customize]");
  if (popupButton) {
    event.preventDefault();
    event.stopPropagation();
    openPopupCustomizeDialog(popupButton.dataset.openPopupCustomize);
    return;
  }
  const fieldLabel = event.target.closest(".is-admin-customizable-field[data-custom-field-key], .is-admin-customizable-field[data-custom-content-key]");
  if (fieldLabel) {
    event.preventDefault();
    event.stopPropagation();
    openFieldCustomizeDialog(fieldLabel);
  }
}, true);

document.addEventListener("pointerover", (event) => {
  if (!customizationEnabled()) return;
  const element = event.target.closest(".is-admin-customizable-field");
  if (element) showCustomizationMiniTools(element);
});

document.addEventListener("pointerout", (event) => {
  const element = event.target.closest(".is-admin-customizable-field");
  if (element && !element.contains(event.relatedTarget)) hideCustomizationMiniTools(element);
});

document.addEventListener("dragstart", (event) => {
  if (!customizationEnabled()) return;
  const handle = event.target.closest("[data-custom-drag-handle]");
  if (!handle) return;
  const element = handle.closest(".is-admin-customizable-field");
  if (!element || !customizationElementKey(element)) return;
  customizationDragElement = element;
  element.classList.add("is-customization-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", customizationElementKey(element));
});

document.addEventListener("dragover", (event) => {
  if (!customizationEnabled() || !customizationDragElement) return;
  const dropTarget = customizationDropTargetFromEvent(event);
  if (!dropTarget) return;
  event.preventDefault();
  setCustomizationDropState(dropTarget);
  event.dataTransfer.dropEffect = "move";
});

document.addEventListener("dragleave", (event) => {
  const target = event.target.closest(".is-admin-customizable-field");
  if (target && customizationDropState.target === target) {
    setCustomizationDropState({ target: null, container: customizationDropState.container });
  }
});

document.addEventListener("drop", (event) => {
  if (!customizationEnabled() || !customizationDragElement) return;
  const dropTarget = customizationDropTargetFromEvent(event);
  if (!dropTarget) {
    clearCustomizationDragState();
    return;
  }
  event.preventDefault();
  if (dropTarget.target) {
    const rect = dropTarget.target.getBoundingClientRect();
    const horizontal = rect.width > rect.height * 1.35;
    const placeAfter = horizontal ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
    dropTarget.container.insertBefore(customizationDragElement, placeAfter ? dropTarget.target.nextSibling : dropTarget.target);
  } else {
    dropTarget.container.appendChild(customizationDragElement);
  }
  persistCustomizationSiblingOrder(dropTarget.container, customizationDragElement);
  clearCustomizationDragState();
});

document.addEventListener("dragend", clearCustomizationDragState);

document.addEventListener("pointerdown", (event) => {
  if (!customizationEnabled()) return;
  const handle = event.target.closest("[data-custom-resize-handle]");
  if (!handle) return;
  const element = handle.closest(".is-admin-customizable-field");
  const key = customizationElementKey(element);
  if (!element || !key) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = element.getBoundingClientRect();
  customizationResizeState = {
    element,
    key,
    legacyKey: element.dataset.customLegacyKey || "",
    startX: event.clientX,
    startY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
    nextWidth: rect.width,
    nextHeight: rect.height,
  };
  handle.setPointerCapture?.(event.pointerId);
  element.classList.add("is-customization-resizing");
  document.body.classList.add("is-customization-resizing");
});

function applyCustomizationResizePreview() {
  customizationResizeFrame = 0;
  if (!customizationResizeState) return;
  const { element, nextWidth, nextHeight } = customizationResizeState;
  element.style.width = `${Math.round(nextWidth)}px`;
  element.style.height = `${Math.round(nextHeight)}px`;
}

document.addEventListener("pointermove", (event) => {
  if (!customizationResizeState) return;
  event.preventDefault();
  customizationResizeState.nextWidth = clamp(customizationResizeState.startWidth + event.clientX - customizationResizeState.startX, 40, 2400);
  customizationResizeState.nextHeight = clamp(customizationResizeState.startHeight + event.clientY - customizationResizeState.startY, 24, 1800);
  if (!customizationResizeFrame) customizationResizeFrame = requestAnimationFrame(applyCustomizationResizePreview);
});

document.addEventListener("pointerup", () => {
  if (!customizationResizeState) return;
  if (customizationResizeFrame) {
    cancelAnimationFrame(customizationResizeFrame);
    applyCustomizationResizePreview();
  }
  const { element, key, legacyKey } = customizationResizeState;
  const rect = element.getBoundingClientRect();
  setCustomizationOverride(
    key,
    {
      pixelWidth: Math.round(rect.width),
      pixelHeight: Math.round(rect.height),
    },
    legacyKey,
  );
  logActivity({
    action: "Cập nhật",
    module: "Tùy biến",
    targetType: "customization",
    targetId: key,
    title: "Kéo đổi kích thước nội dung",
    details: `${Math.round(rect.width)} x ${Math.round(rect.height)} px`,
  });
  saveState();
  element.classList.remove("is-customization-resizing");
  document.body.classList.remove("is-customization-resizing");
  customizationResizeState = null;
});

byId("fieldCustomizeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const key = byId("fieldCustomizeKey").value;
  const legacyKey = byId("fieldCustomizeLegacyKey").value;
  state.systemCustomization.fieldOverrides[key] = {
    label: byId("fieldCustomizeLabel").value.trim(),
    width: byId("fieldCustomizeWidth").value || "",
    height: byId("fieldCustomizeHeight").value || "",
    pixelWidth: byId("fieldCustomizePixelWidth").value || "",
    pixelHeight: byId("fieldCustomizePixelHeight").value || "",
    order: byId("fieldCustomizeOrder").value || "",
    hidden: byId("fieldCustomizeHidden").checked,
    deleted: byId("fieldCustomizeDeleted").checked,
  };
  if (legacyKey && legacyKey !== key) delete state.systemCustomization.fieldOverrides[legacyKey];
  logActivity({
    action: "Cập nhật",
    module: "Tùy biến",
    targetType: "customization",
    targetId: key,
    title: "Tùy biến ô thông tin",
    details: state.systemCustomization.fieldOverrides[key].label,
  });
  saveState();
  closeModal("fieldCustomizeDialog");
  renderAll();
});

byId("resetFieldCustomize").addEventListener("click", () => {
  const key = byId("fieldCustomizeKey").value;
  const legacyKey = byId("fieldCustomizeLegacyKey").value;
  if (!key || !isAdmin()) return;
  delete state.systemCustomization.fieldOverrides[key];
  if (legacyKey && legacyKey !== key) delete state.systemCustomization.fieldOverrides[legacyKey];
  saveState();
  closeModal("fieldCustomizeDialog");
  renderAll();
});

byId("deleteFieldCustomize").addEventListener("click", () => {
  if (!isAdmin()) return;
  const key = byId("fieldCustomizeKey").value;
  const legacyKey = byId("fieldCustomizeLegacyKey").value;
  if (!key) return;
  setCustomizationOverride(
    key,
    {
      label: byId("fieldCustomizeLabel").value.trim(),
      width: byId("fieldCustomizeWidth").value || "",
      height: byId("fieldCustomizeHeight").value || "",
      pixelWidth: byId("fieldCustomizePixelWidth").value || "",
      pixelHeight: byId("fieldCustomizePixelHeight").value || "",
      order: byId("fieldCustomizeOrder").value || "",
      hidden: true,
      deleted: true,
    },
    legacyKey,
  );
  logActivity({
    action: "Xóa",
    module: "Tùy biến",
    targetType: "customization",
    targetId: key,
    title: "Xóa nội dung giao diện",
    details: byId("fieldCustomizeLabel").value.trim(),
  });
  saveState();
  closeModal("fieldCustomizeDialog");
  renderAll();
});

byId("closeFieldCustomize").addEventListener("click", () => closeModal("fieldCustomizeDialog"));

byId("customFieldInlineForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const id = byId("customFieldInlineId").value || uid("custom-field");
  const record = {
    id,
    scope: byId("customFieldInlineScope").value || activeViewId(),
    label: byId("customFieldInlineLabel").value.trim(),
    type: byId("customFieldInlineType").value || "text",
    width: numberWithin(byId("customFieldInlineWidth").value, 1, 4, 1),
    order: byId("customFieldInlineOrder").value || "",
    enabled: byId("customFieldInlineEnabled").checked,
  };
  if (!record.label) return;
  const index = state.systemCustomization.customFields.findIndex((field) => field.id === id);
  if (index >= 0) state.systemCustomization.customFields[index] = record;
  else state.systemCustomization.customFields.push(record);
  logActivity({
    action: index >= 0 ? "Cập nhật" : "Tạo",
    module: "Tùy biến",
    targetType: "customField",
    targetId: id,
    title: record.label,
    details: customFieldScopeLabel(record.scope),
  });
  saveState();
  closeModal("customFieldDialog");
  renderAll();
});

byId("deleteCustomFieldInline").addEventListener("click", () => {
  const id = byId("customFieldInlineId").value;
  if (!id || !isAdmin()) return;
  state.systemCustomization.customFields = (state.systemCustomization.customFields || []).filter((field) => field.id !== id);
  saveState();
  closeModal("customFieldDialog");
  renderAll();
});

byId("closeCustomFieldDialog").addEventListener("click", () => closeModal("customFieldDialog"));

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-kpi-param]");
  if (!input || !customizationEnabled()) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  state.systemCustomization.kpiParameters[input.dataset.kpiParam] = Number(input.value) || 0;
  saveState();
  updateScorePreview();
  updateDepartmentScorePreview();
});

byId("popupCustomizeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const key = byId("popupCustomizeKey").value;
  state.systemCustomization.popupSizes[key] = {
    width: numberWithin(byId("popupCustomizeWidth").value, 420, 1800, ""),
  };
  saveState();
  closeModal("popupCustomizeDialog");
  applyPopupCustomizations();
});

byId("resetPopupCustomize").addEventListener("click", () => {
  const key = byId("popupCustomizeKey").value;
  if (!key || !isAdmin()) return;
  delete state.systemCustomization.popupSizes[key];
  saveState();
  closeModal("popupCustomizeDialog");
  applyPopupCustomizations();
});

byId("closePopupCustomize").addEventListener("click", () => closeModal("popupCustomizeDialog"));

byId("sidebarToggle").addEventListener("click", () => {
  setSidebarCollapsed(!document.body.classList.contains("is-sidebar-collapsed"));
});

byId("activePeriod").addEventListener("change", (event) => {
  const shouldAnimateDashboard = document.querySelector(".view.is-active")?.id === "dashboard";
  state.activePeriod = event.target.value || currentMonth();
  persistState();
  renderAll({ animateDashboard: shouldAnimateDashboard });
});

byId("bulletinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedMediaFiles = Array.from(byId("bulletinMedia").files || []);
  const pendingMediaSize =
    bulletinMediaDraft.reduce((sum, file) => sum + (Number(file.size) || 0), 0) +
    selectedMediaFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (pendingMediaSize > MAX_BULLETIN_MEDIA_TOTAL_BYTES) {
    alert("Tổng dung lượng media của một tin bài không được vượt quá 120MB.");
    return;
  }
  const id = byId("bulletinId").value || uid("bulletin");
  state.bulletins = Array.isArray(state.bulletins) ? state.bulletins : [];
  const index = state.bulletins.findIndex((item) => item.id === id);
  const existing = index >= 0 ? state.bulletins[index] : null;
  if (!canPublishBulletins() || (existing && !canEditBulletin(existing))) {
    alert("Tài khoản hiện tại không có quyền đăng hoặc cập nhật tin bài này.");
    return;
  }
  const category = byId("bulletinCategory").value;
  const voting = isVotingBulletinCategory(category);
  const voteOptions = voting ? parseBulletinVoteOptions(byId("bulletinVoteOptions").value, existing?.voteOptions || []) : [];
  const requestedVoteLimit = voting ? Math.trunc(Number(byId("bulletinVoteLimit").value) || 0) : 1;
  if (voting && !voteOptions.length) {
    alert("Vui lòng nhập ít nhất một tiêu chí bình chọn.");
    return;
  }
  if (voting && !byId("bulletinVoteEndsAt").value) {
    alert("Vui lòng nhập thời gian kết thúc bình chọn.");
    return;
  }
  if (voting && requestedVoteLimit < 1) {
    alert("Số tiêu chí bình chọn phải từ 1 trở lên.");
    return;
  }
  if (voting && requestedVoteLimit > voteOptions.length) {
    alert("Số tiêu chí bình chọn không được lớn hơn số tiêu chí đã nhập.");
    return;
  }
  let uploadedMedia = [];
  try {
    uploadedMedia = await readBulletinMediaFiles(selectedMediaFiles);
  } catch (error) {
    alert(error.message || "Không thể đọc media đính kèm. Vui lòng thử lại.");
    return;
  }
  const media = [...bulletinMediaDraft, ...uploadedMedia];
  const totalMediaSize = media.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (totalMediaSize > MAX_BULLETIN_MEDIA_TOTAL_BYTES) {
    uploadedMedia.forEach((file) => deleteStoredFile(file));
    alert("Tổng dung lượng media của một tin bài không được vượt quá 120MB.");
    return;
  }
  const voteOptionIds = new Set(voteOptions.map((option) => option.id));
  const votes = voting
    ? (existing?.votes || [])
        .map((vote) => {
          const selectedIds = bulletinVoteOptionIds(vote).filter((optionId) => voteOptionIds.has(optionId)).slice(0, requestedVoteLimit);
          return selectedIds.length ? { ...vote, optionId: selectedIds[0], optionIds: selectedIds } : null;
        })
        .filter(Boolean)
    : [];
  const record = {
    id,
    title: byId("bulletinTitle").value.trim(),
    category,
    publishDate: byId("bulletinDate").value || todayInputDate(),
    status: byId("bulletinStatus").value || "published",
    pinned: byId("bulletinPinned").checked,
    content: byId("bulletinContent").value.trim(),
    media,
    voteOptions,
    voteLimit: voting ? requestedVoteLimit : 1,
    voteEndsAt: voting ? byId("bulletinVoteEndsAt").value : "",
    votes,
    customFields: collectCustomFieldValues("bulletin", existing?.customFields),
  };
  const mediaKeys = new Set(media.map(storedFileKey));
  const removedMedia = (existing?.media || []).filter((file) => !mediaKeys.has(storedFileKey(file)));
  const auditedRecord = applyRecordAudit(record, existing);
  const previousBulletins = [...state.bulletins];
  const previousActivityLog = state.activityLog;
  if (index >= 0) state.bulletins[index] = auditedRecord;
  else state.bulletins.push(auditedRecord);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "Bảng tin",
    targetType: "bulletin",
    targetId: id,
    period: periodFromTimestamp(`${auditedRecord.publishDate}T00:00:00`) || state.activePeriod,
    title: auditedRecord.title,
    details: `${auditedRecord.category} · ${bulletinStatusLabel(auditedRecord.status)}${auditedRecord.pinned ? " · Ghim đầu bảng tin" : ""}${media.length ? ` · ${media.length} media` : ""}`,
  });
  try {
    saveState();
  } catch {
    state.bulletins = previousBulletins;
    state.activityLog = previousActivityLog;
    uploadedMedia.forEach((file) => deleteStoredFile(file));
    alert("Không thể lưu media vì dung lượng dữ liệu trình duyệt đã đầy. Vui lòng giảm số lượng hoặc dung lượng hình ảnh/video/âm thanh/PDF.");
    return;
  }
  removedMedia.forEach((file) => deleteStoredFile(file));
  resetBulletinForm();
  closeBulletinFormDialog();
  renderAll();
});

byId("openBulletinForm").addEventListener("click", openNewBulletinFormDialog);
byId("closeBulletinForm").addEventListener("click", closeBulletinFormDialog);
byId("bulletinFormDialog").addEventListener("click", (event) => {
  if (event.target === byId("bulletinFormDialog")) closeBulletinFormDialog();
});
byId("resetBulletinForm").addEventListener("click", () => {
  resetBulletinForm();
  syncBulletinFormDialogHeading();
});
byId("bulletinCategory").addEventListener("change", updateBulletinVoteSettingsVisibility);
byId("bulletinSearch").addEventListener("input", debounce(renderBulletinBoard, 200));
byId("bulletinCategoryFilter").addEventListener("change", renderBulletinBoard);
byId("bulletinMediaList").addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeBulletinMedia;
  if (!removeId) return;
  bulletinMediaDraft = bulletinMediaDraft.filter((file) => file.id !== removeId);
  renderBulletinMediaDraft();
});
byId("bulletinList").addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit-bulletin]")?.dataset.editBulletin;
  const deleteId = event.target.closest("[data-delete-bulletin]")?.dataset.deleteBulletin;
  if (editId) {
    const post = (state.bulletins || []).find((item) => item.id === editId);
    if (!canEditBulletin(post)) return;
    populateBulletinForm(post);
    focusEditForm("bulletinForm", "bulletinTitle");
    return;
  }
  if (deleteId && canDeleteBulletin() && confirm("Xóa tin bài này?")) {
    registerDeletedId(deleteId);
    const post = (state.bulletins || []).find((item) => item.id === deleteId);
    state.bulletins = (state.bulletins || []).filter((item) => item.id !== deleteId);
    logActivity({
      action: "Xóa",
      module: "Bảng tin",
      targetType: "bulletin",
      targetId: deleteId,
      period: periodFromTimestamp(`${post?.publishDate || todayInputDate()}T00:00:00`) || state.activePeriod,
      title: post?.title || "Tin bài đã xóa",
      details: `${post?.category || "Bảng tin"} · ${bulletinStatusLabel(post?.status)}`,
    });
    saveState();
    (post?.media || []).forEach((file) => deleteStoredFile(file));
    renderAll();
    return;
  }
  if (event.target.closest("a, video, audio, iframe, object, embed")) return;
  const openId = event.target.closest("[data-open-bulletin]")?.dataset.openBulletin;
  if (openId) openBulletinDetailDialog(openId);
});
byId("bulletinList").addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const item = event.target.closest("[data-open-bulletin]");
  if (!item) return;
  event.preventDefault();
  openBulletinDetailDialog(item.dataset.openBulletin);
});
byId("closeBulletinDetail").addEventListener("click", closeBulletinDetailDialog);
byId("bulletinDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("bulletinDetailDialog")) {
    closeBulletinDetailDialog();
  }
});
byId("bulletinDetailVoting").addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"][name="bulletinVoteOption"]')) return;
  const form = event.target.closest("[data-vote-bulletin]");
  const post = bulletinById(form?.dataset.voteBulletin);
  if (!post) return;
  const checked = Array.from(form.querySelectorAll('input[name="bulletinVoteOption"]:checked'));
  const voteLimit = bulletinVoteLimit(post);
  if (checked.length > voteLimit) {
    event.target.checked = false;
    alert(`Chỉ được chọn ${voteLimit} tiêu chí bình chọn.`);
  }
});
byId("bulletinDetailVoting").addEventListener("submit", (event) => {
  const form = event.target.closest("[data-vote-bulletin]");
  if (!form) return;
  event.preventDefault();
  const post = bulletinById(form.dataset.voteBulletin);
  if (!post || !isVotingBulletin(post)) return;
  if (bulletinVoteEnded(post)) {
    alert("Chương trình bình chọn đã kết thúc.");
    renderBulletinVoting(post);
    return;
  }
  const account = currentAccount();
  if (!account) {
    alert("Vui lòng đăng nhập để bình chọn.");
    return;
  }
  const options = Array.isArray(post.voteOptions) ? post.voteOptions : [];
  const optionIds = new Set(options.map((option) => option.id));
  const selectedOptionIds = Array.from(new Set(new FormData(form).getAll("bulletinVoteOption").map(String))).filter((optionId) => optionIds.has(optionId));
  const voteLimit = bulletinVoteLimit(post);
  if (selectedOptionIds.length !== voteLimit) {
    alert(voteLimit === 1 ? "Vui lòng chọn một tiêu chí bình chọn." : `Vui lòng chọn đúng ${voteLimit} tiêu chí bình chọn.`);
    return;
  }
  const selectedOptions = options.filter((option) => selectedOptionIds.includes(option.id));
  const timestamp = new Date().toISOString();
  post.votes = Array.isArray(post.votes) ? post.votes : [];
  const voteIndex = post.votes.findIndex((vote) => vote.accountId === account.id);
  const existingVote = voteIndex >= 0 ? post.votes[voteIndex] : null;
  const voteRecord = {
    accountId: account.id,
    accountName: account.displayName || account.username || "Tài khoản",
    optionId: selectedOptionIds[0],
    optionIds: selectedOptionIds,
    votedAt: existingVote?.votedAt || timestamp,
    updatedAt: timestamp,
  };
  if (voteIndex >= 0) post.votes[voteIndex] = voteRecord;
  else post.votes.push(voteRecord);
  logActivity({
    action: existingVote ? "Cập nhật bình chọn" : "Bình chọn",
    module: "Bảng tin",
    targetType: "bulletin",
    targetId: post.id,
    period: periodFromTimestamp(timestamp) || state.activePeriod,
    title: post.title,
    details: selectedOptions.map((option) => option.label).join(", "),
  });
  saveState();
  renderBulletinBoard();
  openBulletinDetailDialog(post.id);
});

byId("archiveForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedFiles = Array.from(byId("archiveFiles").files || []);
  const pendingSize =
    archiveFileDraft.reduce((sum, file) => sum + (Number(file.size) || 0), 0) +
    selectedFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (pendingSize > MAX_ARCHIVE_FILE_TOTAL_BYTES) {
    alert("Tổng dung lượng tệp của một hồ sơ lưu trữ không được vượt quá 300MB.");
    return;
  }

  let uploadedFiles = [];
  try {
    uploadedFiles = await readArchiveFiles(selectedFiles);
  } catch (error) {
    alert(error.message || "Không thể đọc tệp hồ sơ. Vui lòng thử lại.");
    return;
  }

  const id = byId("archiveId").value || uid("archive");
  state.archiveRecords = Array.isArray(state.archiveRecords) ? state.archiveRecords : [];
  const index = state.archiveRecords.findIndex((record) => record.id === id);
  const existing = index >= 0 ? state.archiveRecords[index] : null;
  if (!canSaveArchive() || (existing && !canEditArchive(existing))) {
    alert("Tài khoản hiện tại không có quyền lưu hoặc cập nhật hồ sơ này.");
    return;
  }
  const files = [...archiveFileDraft, ...uploadedFiles];
  const totalFileSize = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (totalFileSize > MAX_ARCHIVE_FILE_TOTAL_BYTES) {
    uploadedFiles.forEach((file) => deleteStoredFile(file));
    alert("Tổng dung lượng tệp của một hồ sơ lưu trữ không được vượt quá 300MB.");
    return;
  }

  const record = {
    id,
    title: byId("archiveTitle").value.trim(),
    category: byId("archiveCategory").value || "Hồ sơ khác",
    status: byId("archiveStatus").value || "Lưu tham khảo",
    documentNo: byId("archiveDocumentNo").value.trim(),
    recordDate: byId("archiveDate").value || todayInputDate(),
    departmentId: byId("archiveDepartment").value,
    personId: byId("archivePerson").value,
    projectId: byId("archiveProject").value,
    tags: parseArchiveTags(byId("archiveTags").value),
    description: byId("archiveDescription").value.trim(),
    files,
    customFields: collectCustomFieldValues("archive", existing?.customFields),
  };
  const fileKeys = new Set(files.map(storedFileKey));
  const removedFiles = (existing?.files || []).filter((file) => !fileKeys.has(storedFileKey(file)));
  const auditedRecord = applyRecordAudit(record, existing);
  const previousArchiveRecords = [...state.archiveRecords];
  const previousActivityLog = state.activityLog;
  if (index >= 0) state.archiveRecords[index] = auditedRecord;
  else state.archiveRecords.push(auditedRecord);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "Lưu Trữ",
    targetType: "archive",
    targetId: id,
    period: periodFromTimestamp(`${auditedRecord.recordDate}T00:00:00`) || state.activePeriod,
    title: auditedRecord.title,
    departmentId: auditedRecord.departmentId,
    personId: auditedRecord.personId,
    details: `${auditedRecord.category} · ${auditedRecord.status}${auditedRecord.documentNo ? ` · ${auditedRecord.documentNo}` : ""}${files.length ? ` · ${files.length} tệp` : ""}`,
  });
  try {
    saveState();
  } catch {
    state.archiveRecords = previousArchiveRecords;
    state.activityLog = previousActivityLog;
    uploadedFiles.forEach((file) => deleteStoredFile(file));
    alert("Không thể lưu hồ sơ vì dung lượng dữ liệu trình duyệt đã đầy. Vui lòng giảm số lượng hoặc dung lượng tệp.");
    return;
  }
  removedFiles.forEach((file) => deleteStoredFile(file));
  resetArchiveForm();
  closeArchiveFormDialog();
  renderAll();
});

byId("openArchiveForm").addEventListener("click", openNewArchiveFormDialog);
byId("closeArchiveForm").addEventListener("click", closeArchiveFormDialog);
byId("archiveFormDialog").addEventListener("click", (event) => {
  if (event.target === byId("archiveFormDialog")) closeArchiveFormDialog();
});
byId("resetArchiveForm").addEventListener("click", () => {
  resetArchiveForm();
  syncArchiveFormDialogHeading();
});
byId("archiveSearch").addEventListener("input", debounce(renderArchive, 200));
byId("archiveCategoryFilter").addEventListener("change", renderArchive);
byId("archiveStatusFilter").addEventListener("change", renderArchive);
byId("archiveDepartmentFilter").addEventListener("change", renderArchive);
byId("archiveFileList").addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeArchiveFile;
  if (!removeId) return;
  archiveFileDraft = archiveFileDraft.filter((file) => file.id !== removeId);
  renderArchiveFileDraft();
});
byId("archiveList").addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit-archive]")?.dataset.editArchive;
  const deleteId = event.target.closest("[data-delete-archive]")?.dataset.deleteArchive;
  if (editId) {
    const record = archiveById(editId);
    if (!canEditArchive(record)) return;
    populateArchiveForm(record);
    focusEditForm("archiveForm", "archiveTitle");
    return;
  }
  if (deleteId && canDeleteArchive() && confirm("Xóa hồ sơ lưu trữ này?")) {
    registerDeletedId(deleteId); // 🔥 THÊM DÒNG NÀY Ở ĐÂY
    const record = archiveById(deleteId);
    state.archiveRecords = (state.archiveRecords || []).filter((item) => item.id !== deleteId);
    logActivity({
      action: "Xóa",
      module: "Lưu Trữ",
      targetType: "archive",
      targetId: deleteId,
      period: periodFromTimestamp(`${record?.recordDate || todayInputDate()}T00:00:00`) || state.activePeriod,
      title: record?.title || "Hồ sơ lưu trữ đã xóa",
      departmentId: record?.departmentId || "",
      personId: record?.personId || "",
      details: `${record?.category || "Lưu Trữ"} · ${record?.status || "Đã xóa"}`,
    });
    saveState();
    (record?.files || []).forEach((file) => deleteStoredFile(file));
    renderAll();
    return;
  }
  if (handleArchiveRelatedTarget(event)) return;
  if (event.target.closest("a, button, video, audio, object, embed")) return;
  const openId = event.target.closest("[data-open-archive-detail]")?.dataset.openArchiveDetail;
  if (openId) openArchiveDetailDialog(openId);
});
byId("archiveList").addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const item = event.target.closest("[data-open-archive-detail]");
  if (!item) return;
  event.preventDefault();
  openArchiveDetailDialog(item.dataset.openArchiveDetail);
});

byId("closeArchiveDetail").addEventListener("click", closeArchiveDetailDialog);
byId("archiveDetailDialog").addEventListener("click", async (event) => {
  const downloadButton = event.target.closest("[data-download-archive-file]");
  if (downloadButton) {
    event.preventDefault();
    event.stopPropagation();
    downloadButton.disabled = true;
    try {
      await downloadArchiveFile(downloadButton.dataset.downloadArchiveFile);
    } finally {
      downloadButton.disabled = false;
    }
    return;
  }

  const openFileButton = event.target.closest("[data-open-archive-file], [data-open-pdf-tab]");
  if (openFileButton) {
    event.preventDefault();
    event.stopPropagation();
    openFileInNewTab(openFileButton.dataset.openArchiveFile || openFileButton.dataset.openPdfTab);
    return;
  }

  if (event.target === byId("archiveDetailDialog")) {
    closeArchiveDetailDialog();
    return;
  }
  if (handleArchiveRelatedTarget(event)) {
    closeArchiveDetailDialog();
  }
});

byId("personDepartment").addEventListener("change", () => {
  updateRoleOptions();
  updatePersonSectionHeadOptions();
});
byId("personRole").addEventListener("change", () => updatePersonSectionHeadOptions());
byId("personSearch").addEventListener("input", debounce(renderPeopleTable, 200));
byId("clearPersonSearch").addEventListener("click", () => {
  byId("personSearch").value = "";
  renderPeopleTable();
  byId("personSearch").focus();
});
byId("clearPeoplePendingFilter").addEventListener("click", () => {
  peoplePendingEvaluationOnly = false;
  renderPeopleTable();
});

byId("personForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canEditPeople()) {
    alert("Tài khoản hiện tại chỉ được xem thông tin nhân sự, không có quyền chỉnh sửa.");
    return;
  }
  const id = byId("personId").value || uid("person");
  const personDraft = {
    id,
    departmentId: byId("personDepartment").value,
    roleId: byId("personRole").value,
  };
  const sectionHeadId = normalizeSectionHeadIdForPerson(personDraft, byId("personSectionHead").value);
  const record = {
    id,
    name: byId("personName").value.trim(),
    gender: byId("personGender").value,
    departmentId: personDraft.departmentId,
    roleId: personDraft.roleId,
    sectionHeadId,
    contract: byId("personContract").value,
    qualification: byId("personQualification").value.trim(),
    contractTerm: byId("personContractTerm").value.trim(),
    contractSignedDate: byId("personContractSignedDate").value,
    phone: byId("personPhone").value.trim(),
    birthDate: byId("personBirthDate").value,
    salaryCoefficient: byId("personSalaryCoefficient").value,
    salaryGrade: byId("personSalaryGrade").value.trim(),
    salaryReviewDate: byId("personSalaryReviewDate").value,
    address: byId("personAddress").value.trim(),
    note: byId("personNote").value.trim(),
    customFields: collectCustomFieldValues("people", personById(id)?.customFields),
  };
  const index = state.people.findIndex((item) => item.id === id);
  const existing = index >= 0 ? state.people[index] : null;
  const auditedRecord = applyRecordAudit(record, existing);
  if (index >= 0) state.people[index] = auditedRecord;
  else state.people.push(auditedRecord);
  normalizeSectionHeadManagementLinks();
  recalculateSavedPersonalEvaluationScores();
  const sectionHead = sectionHeadForPerson(auditedRecord);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "Nhân sự",
    targetType: "person",
    targetId: id,
    personId: id,
    departmentId: auditedRecord.departmentId,
    title: auditedRecord.name,
    details: `${departmentById(auditedRecord.departmentId)?.name || ""} · ${roleById(auditedRecord.roleId)?.name || ""}${sectionHead ? ` · nhóm ${sectionHead.name}` : ""}`,
  });
  syncPersonnelAccounts();
  saveState();
  resetPersonForm();
  renderAll();
  document.dispatchEvent(new CustomEvent("person-record-saved", { detail: { personId: id } }));
  if (byId("personFormDialog")?.contains(byId("personForm"))) closePersonFormDialog();
});

byId("openPersonForm").addEventListener("click", openNewPersonFormDialog);
byId("closePersonForm").addEventListener("click", closePersonFormDialog);
byId("personFormDialog").addEventListener("click", (event) => {
  if (event.target === byId("personFormDialog")) closePersonFormDialog();
});
byId("resetPersonForm").addEventListener("click", () => {
  resetPersonForm();
  syncPersonFormDialogHeading();
});

byId("openKpiCatalogManager")?.addEventListener("click", openKpiCatalogManager);
byId("closeKpiCatalogManager")?.addEventListener("click", () => closeModal("kpiCatalogManagerDialog"));
byId("kpiCatalogManagerDialog")?.addEventListener("click", (event) => {
  if (event.target === byId("kpiCatalogManagerDialog")) closeModal("kpiCatalogManagerDialog");
});
byId("resetKpiCatalogManager")?.addEventListener("click", resetKpiCatalogManager);
byId("saveKpiCatalogManager")?.addEventListener("click", saveKpiCatalogManager);
byId("kpiCatalogManagerContent")?.addEventListener("input", (event) => updateKpiCatalogDraftInput(event.target));
byId("kpiCatalogManagerContent")?.addEventListener("change", (event) => updateKpiCatalogDraftInput(event.target));
byId("kpiCatalogManagerContent")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-kpi-catalog-action]");
  if (!button || !kpiCatalogDraft) return;
  const action = button.dataset.kpiCatalogAction;
  const scope = button.dataset.kpiCatalogScope;
  const recordId = button.dataset.kpiCatalogRecord;
  const index = Number(button.dataset.kpiCatalogCriterionIndex);
  const behaviorIndex = Number(button.dataset.kpiCatalogBehaviorIndex);
  let targetRecord = null;
  if (action === "add-department") {
    kpiCatalogDraft.departments.push({ id: uid("department"), name: "Phòng mới", criteria: [], leadershipOnly: false, kpiExempt: false });
  } else if (action === "remove-department") {
    const nextDepartments = kpiCatalogDraft.departments.filter((department) => department.id !== recordId);
    const referenceError = kpiCatalogReferenceError(nextDepartments, kpiCatalogDraft.roles);
    if (referenceError) {
      setKpiCatalogNotice(referenceError, true);
      return;
    }
    kpiCatalogDraft.departments = nextDepartments;
  } else if (action === "add-role") {
    const departmentId = kpiCatalogDraft.departments[0]?.id;
    if (!departmentId) {
      setKpiCatalogNotice("Hãy tạo phòng trước khi thêm vị trí.", true);
      return;
    }
    kpiCatalogDraft.roles.push({ id: uid("role"), departmentId, name: "Vị trí mới", accountRole: "employee", criteria: [] });
  } else if (action === "remove-role") {
    const nextRoles = kpiCatalogDraft.roles.filter((role) => role.id !== recordId);
    const referenceError = kpiCatalogReferenceError(kpiCatalogDraft.departments, nextRoles);
    if (referenceError) {
      setKpiCatalogNotice(referenceError, true);
      return;
    }
    kpiCatalogDraft.roles = nextRoles;
  } else if (action === "add-criterion") {
    targetRecord = kpiCatalogDraftRecord(scope, recordId);
    if (!targetRecord) return;
    targetRecord.criteria.push(["Tiêu chí mới", 0]);
  } else if (action === "remove-criterion") {
    targetRecord = kpiCatalogDraftRecord(scope, recordId);
    if (!targetRecord || !Number.isInteger(index)) return;
    targetRecord.criteria.splice(index, 1);
  } else if (action === "add-behavior") {
    kpiCatalogDraft.behaviorRules.push(["Danh mục mới", 0]);
  } else if (action === "remove-behavior") {
    if (!Number.isInteger(behaviorIndex)) return;
    kpiCatalogDraft.behaviorRules.splice(behaviorIndex, 1);
  } else {
    return;
  }
  setKpiCatalogNotice();
  renderKpiCatalogManager();
});

byId("accountPerson").addEventListener("change", () => {
  const person = personById(byId("accountPerson").value);
  if (!person) return;
  byId("accountDepartment").value = person.departmentId;
  byId("accountRole").value = accountRoleForPerson(person);
});

byId("accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const ownOnly = !canManageAccounts() && canEditOwnAccount();
  if (!canManageAccounts() && !ownOnly) return;
  const current = currentAccount();
  const id = byId("accountId").value || (ownOnly ? current?.id : uid("account"));
  if (ownOnly && id !== current?.id) {
    alert("Tài khoản hiện tại chỉ được chỉnh sửa thông tin của chính mình.");
    return;
  }
  const existing = accountById(id);
  const requestedPassword = byId("accountPassword").value;
  if ((!existing || requestedPassword) && !isStrongAccountPassword(requestedPassword)) {
    alert("Mật khẩu phải có ít nhất 10 ký tự và sử dụng tối thiểu 3 nhóm: chữ hoa, chữ thường, số, ký tự đặc biệt.");
    return;
  }
  const username = ownOnly ? existing?.username || current?.username || "" : byId("accountUsername").value.trim();
  const duplicate = state.accounts.find((account) => account.username === username && account.id !== id);
  if (duplicate) {
    alert("Tên đăng nhập đã tồn tại.");
    return;
  }
  const personId = ownOnly ? existing?.personId || "" : byId("accountPerson").value;
  const linkedPerson = personById(personId);
  const selectedRole = ownOnly ? existing?.role : byId("accountRole").value;
  const role = linkedPerson && isPersonnelAccountRole(selectedRole) ? accountRoleForPerson(linkedPerson) : selectedRole;
  const departmentId = ownOnly ? existing?.departmentId || linkedPerson?.departmentId || "" : byId("accountDepartment").value || linkedPerson?.departmentId || "";
  if ((role === "employee" || role === "section_head" || role === "manager" || role === "deputy_manager") && !personId) {
    alert("Tài khoản nhân viên/trưởng bộ phận/trưởng nhóm/trưởng/phó phòng cần liên kết với một hồ sơ nhân sự.");
    return;
  }
  if ((role === "manager" || role === "deputy_manager") && !departmentId) {
    alert("Tài khoản trưởng/phó phòng cần có phòng quản lý.");
    return;
  }
  const record = {
    id,
    username,
    // Online snapshots never expose passwords. An empty field must therefore
    // be sent as empty so the server preserves the stored password.
    password: requestedPassword || existing?.password || "",
    passwordChangeRequired: false,
    displayName: ownOnly ? existing?.displayName || current?.displayName || "" : byId("accountDisplayName").value.trim(),
    role,
    personId,
    departmentId,
    accessGrants: isAdmin()
      ? {
          bulletinPublish: byId("accountCanPublishBulletins").checked,
          archiveWrite: byId("accountCanSaveArchive").checked,
          viewSystemContent: byId("accountCanViewSystemContent").checked,
        }
      : existing?.accessGrants || {},
    customFields: collectCustomFieldValues("accounts", existing?.customFields),
  };
  const index = state.accounts.findIndex((account) => account.id === id);
  const existingAccount = index >= 0 ? state.accounts[index] : null;
  const auditedRecord = applyRecordAudit(record, existingAccount);
  if (index >= 0) state.accounts[index] = auditedRecord;
  else state.accounts.push(auditedRecord);
  logActivity({
    action: existingAccount ? "Cập nhật" : "Tạo",
    module: "Tài khoản",
    targetType: "account",
    targetId: id,
    personId,
    departmentId,
    title: auditedRecord.displayName,
    details: `${auditedRecord.username} · ${accountRoleLabels[auditedRecord.role] || auditedRecord.role}`,
  });
  saveState();
  resetAccountForm();
  renderAll();
});

byId("resetAccountForm").addEventListener("click", resetAccountForm);
byId("dismissBirthdayCelebration").addEventListener("click", closeBirthdayCelebration);
byId("birthdayCelebration").addEventListener("click", (event) => {
  if (event.target === byId("birthdayCelebration")) closeBirthdayCelebration();
});
byId("birthdayDayBanner").addEventListener("click", () => {
  if (birthdayBannerCanCollapse()) setBirthdayBannerCollapsed(!birthdayBannerCollapsed);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderBirthdayCelebration();
});
byId("refreshAccountPresence").addEventListener("click", () => {
  if (!isAdmin()) return;
  requestAccountPresence();
  requestAccountUsageHistory({ force: true });
});
byId("accountUsageDepartmentFilter").addEventListener("change", (event) => {
  if (!isAdmin()) return;
  accountPresence.usageDepartmentId = String(event.target.value || "");
  renderAccountTaskCreationStatistics();
  renderAccountUsageDetails();
});

byId("moduleAccessList").addEventListener("change", (event) => {
  const moduleId = event.target.dataset.moduleToggle || event.target.dataset.moduleId;
  if (!moduleId || !isAdmin()) return;
  const module = systemModules.find((item) => item.id === moduleId);
  if (!module || module.locked) return;
  state.moduleSettings = normalizeModuleSettings(state.moduleSettings);
  const role = event.target.dataset.moduleRoleToggle;
  const enabled = Boolean(event.target.checked);
  if (role && moduleAccessRoles.includes(role)) {
    state.moduleSettings[moduleId].roles[role] = enabled;
  } else {
    state.moduleSettings[moduleId].enabled = enabled;
  }
  logActivity({
    action: "Cập nhật",
    module: "Phân quyền",
    targetType: role ? "moduleRoleAccess" : "moduleAccess",
    targetId: role ? `${moduleId}:${role}` : moduleId,
    title: role ? `Quyền xem ${module.label}` : `Cấu hình mục ${module.label}`,
    details: role
      ? `${accountRoleLabels[role]}: ${enabled ? "bật hiển thị" : "tắt hiển thị"}`
      : enabled
        ? "Bật hiển thị cho toàn hệ thống"
        : "Tắt hiển thị cho toàn hệ thống",
  });
  saveState();
  renderAll();
});

byId("systemThemePreset").addEventListener("change", updateSystemThemeFormState);
["systemThemeCustomName", "systemThemePrimary", "systemThemePrimaryDark", "systemThemeAccent", "systemThemeBackground"].forEach((id) => {
  byId(id).addEventListener("input", updateSystemThemeFormState);
});
byId("systemThemeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  const theme = normalizeSystemTheme({
    preset: byId("systemThemePreset").value,
    customName: byId("systemThemeCustomName").value,
    primary: byId("systemThemePrimary").value,
    primaryDark: byId("systemThemePrimaryDark").value,
    accent: byId("systemThemeAccent").value,
    background: byId("systemThemeBackground").value,
  });
  state.systemCustomization.theme = theme;
  const themeName = theme.preset === "custom" ? theme.customName || "Dịp kỷ niệm tùy chỉnh" : themeOptionById(theme.preset).label;
  logActivity({
    action: "Cập nhật",
    module: "Cấu hình hệ thống",
    targetType: "systemTheme",
    targetId: theme.preset,
    title: "Theme giao diện",
    details: themeName,
  });
  saveState();
  renderAll();
});

byId("accountSearch").addEventListener("input", debounce(renderAccountTable, 160));

byId("accountTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.editAccount;
  const deleteId = event.target.dataset.deleteAccount;
  if (editId) {
    if (!canManageAccounts() && !(canEditOwnAccount() && editId === currentAccount()?.id)) return;
    const account = accountById(editId);
    populateAccountForm(account);
    focusEditForm("accountForm", "accountDisplayName");
  }
  if (deleteId && canManageAccounts() && deleteId !== currentAccount()?.id && confirm("Xóa tài khoản này?")) {
    const account = accountById(deleteId);
    const linkedPerson = personById(account?.personId);
    state.accounts = state.accounts.filter((account) => account.id !== deleteId);
    logActivity({
      action: "Xóa",
      module: "Tài khoản",
      targetType: "account",
      targetId: deleteId,
      personId: account?.personId || "",
      departmentId: account?.departmentId || linkedPerson?.departmentId || "",
      title: account?.displayName || "Tài khoản đã xóa",
      details: account?.username || "",
    });
    saveState();
    renderAll();
  }
});

byId("peopleTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.editPerson;
  const deleteId = event.target.dataset.deletePerson;
  if ((editId || deleteId) && !canEditPeople()) return;
  if (editId) {
    const person = personById(editId);
    byId("personId").value = person.id;
    byId("personName").value = person.name;
    byId("personGender").value = person.gender || "";
    byId("personDepartment").value = person.departmentId;
    updateRoleOptions(person.roleId);
    updatePersonSectionHeadOptions(person.sectionHeadId);
    byId("personContract").value = person.contract;
    byId("personQualification").value = person.qualification || "";
    byId("personContractTerm").value = person.contractTerm || "";
    byId("personContractSignedDate").value = person.contractSignedDate || "";
    byId("personPhone").value = person.phone;
    byId("personBirthDate").value = person.birthDate || "";
    byId("personSalaryCoefficient").value = person.salaryCoefficient || "";
    byId("personSalaryGrade").value = person.salaryGrade || "";
    byId("personSalaryReviewDate").value = person.salaryReviewDate || "";
    byId("personAddress").value = person.address || "";
    byId("personNote").value = person.note;
    renderCustomFieldsForScope("people");
    applyFieldCustomizations();
    focusEditForm("personForm", "personName");
  }
  if (deleteId && confirm("Xóa nhân sự này? Công việc và đánh giá liên quan vẫn được giữ để tra cứu.")) {
    registerDeletedId(deleteId); // 🔥 THÊM DÒNG NÀY Ở ĐÂY
    const person = personById(deleteId);
    state.people = state.people.filter((item) => item.id !== deleteId);
    normalizeSectionHeadManagementLinks();
    recalculateSavedPersonalEvaluationScores();
    logActivity({
      action: "Xóa",
      module: "Nhân sự",
      targetType: "person",
      targetId: deleteId,
      personId: deleteId,
      departmentId: person?.departmentId || "",
      title: person?.name || "Nhân sự đã xóa",
      details: departmentById(person?.departmentId)?.name || "",
    });
    saveState();
    renderAll();
  }
});

async function saveTaskRecord(record, fileInput, draftAttachments, responseStatus, responseNote, progressReportNote, resetCallback) {
  const index = state.tasks.findIndex((item) => item.id === record.id);
  const existingTask = index >= 0 ? state.tasks[index] : null;
  const adminOverride = isAdmin();
  let uploadedAttachments = [];
  try {
    uploadedAttachments = await readTaskAttachmentFiles(fileInput.files);
  } catch (error) {
    alert(error.message || "Không thể đọc hồ sơ đính kèm. Vui lòng thử lại.");
    return false;
  }
  const preparedRecord = {
    ...record,
    attachments: [...draftAttachments, ...uploadedAttachments],
    customFields: collectCustomFieldValues("tasks", existingTask?.customFields),
  };
  const progressOnlyUpdate = !!existingTask && !canEditTaskDetails(existingTask) && canUpdateTaskProgress(existingTask);
  if (progressOnlyUpdate) {
    // A collaborator receives a filtered personnel list from the server. Preserve
    // immutable task details instead of relying on disabled form controls.
    preparedRecord.ownerId = existingTask.ownerId;
    preparedRecord.projectId = projectIdForTask(existingTask);
  }
  const selectedProject = projectById(preparedRecord.projectId);
  if (preparedRecord.projectId && !selectedProject) {
    alert("Danh mục dự án đã chọn không còn tồn tại. Vui lòng chọn lại.");
    return false;
  }
  if (!selectedProject) {
    alert("Vui lòng chọn Danh mục dự án trước khi lưu công việc.");
    return false;
  }
  if (!preparedRecord.startDate) {
    alert("Vui lòng nhập Ngày bắt đầu trước khi lưu công việc.");
    return false;
  }
  preparedRecord.projectId = selectedProject?.id || "";
  preparedRecord.projectName = selectedProject?.name || "";
  const recordKind = existingTask ? normalizeTaskKind(existingTask) : normalizeTaskKind(preparedRecord.kind || TASK_KIND_REGULAR);
  preparedRecord.kind = recordKind;
  if (recordKind === TASK_KIND_REGULAR) {
    preparedRecord.workType = normalizeTaskWorkType(preparedRecord);
    preparedRecord.recurrence = normalizeTaskRecurrence(preparedRecord);
    preparedRecord.collaboratorIds = taskCollaboratorIds(preparedRecord).filter((id) => id !== preparedRecord.ownerId);
    preparedRecord.collaboratorId = "";
    if (preparedRecord.recurrence === TASK_RECURRENCE_NONE) {
      preparedRecord.recurrenceSourceId = "";
      preparedRecord.recurrenceSeriesId = "";
      preparedRecord.recurrenceAnchorDue = "";
      preparedRecord.recurrenceAnchorDay = "";
    } else if (existingTask?.recurrenceSourceId) {
      preparedRecord.recurrenceSourceId = existingTask.recurrenceSourceId;
      preparedRecord.recurrenceSeriesId = existingTask.recurrenceSeriesId || existingTask.recurrenceSourceId;
      preparedRecord.recurrenceAnchorDue = existingTask.recurrenceAnchorDue || existingTask.due;
      preparedRecord.recurrenceAnchorDay = existingTask.recurrenceAnchorDay || Number(existingTask.due?.slice(8, 10)) || "";
    } else {
      preparedRecord.recurrenceSourceId = "";
      preparedRecord.recurrenceSeriesId = existingTask?.recurrenceSeriesId || preparedRecord.id;
      preparedRecord.recurrenceAnchorDue = preparedRecord.due;
      preparedRecord.recurrenceAnchorDay = Number(preparedRecord.due?.slice(8, 10)) || "";
    }
  } else {
    preparedRecord.collaboratorIds = [];
    preparedRecord.workType = "";
    preparedRecord.recurrence = TASK_RECURRENCE_NONE;
    preparedRecord.recurrenceSourceId = "";
    preparedRecord.recurrenceSeriesId = "";
    preparedRecord.recurrenceAnchorDue = "";
    preparedRecord.recurrenceAnchorDay = "";
  }
  const canEditDetails = existingTask
    ? canEditTaskDetails(existingTask)
    : recordKind === TASK_KIND_ASSIGNED
      ? canAssignTaskToPerson(preparedRecord.ownerId)
      : canCreateRegularTaskForPerson(preparedRecord.ownerId);
  const reportLockedByApproval = !!existingTask && taskProgressLockedAfterApproval(existingTask) && !adminOverride;
  const canUpdateReport = existingTask ? !reportLockedByApproval && (adminOverride || canUpdateTaskProgress(existingTask)) : false;
  const canUpdateCollaborators = !!existingTask && !reportLockedByApproval && (canEditDetails || canUpdateTaskCollaborators(existingTask));
  if (reportLockedByApproval) {
    preparedRecord.status = existingTask.status;
    preparedRecord.progress = existingTask.progress;
    preparedRecord.attachments = existingTask.attachments || [];
    preparedRecord.note = existingTask.note || "";
  }
  if (existingTask && !canUpdateCollaborators) {
    if (recordKind === TASK_KIND_REGULAR) {
      preparedRecord.collaboratorIds = taskCollaboratorIds(existingTask);
      preparedRecord.collaboratorId = "";
    } else {
      preparedRecord.collaboratorIds = [];
      preparedRecord.collaboratorId = existingTask.collaboratorId || "";
    }
  }
  const submittedQuality = normalizeTaskQualityInput(preparedRecord.qualityPercent);
  const priorQuality = existingTask ? normalizeTaskQualityInput(existingTask.qualityPercent) : "";
  const nextStatusForQuality = normalizeTaskStatus(preparedRecord.status);
  const canEditQuality = !!existingTask && adminOverride;
  const nextQuality = adminOverride
    ? (canEditQuality ? submittedQuality : priorQuality)
    : nextStatusForQuality === TASK_STATUS_COMPLETED && taskCompletionIsApproved(existingTask)
      ? (canEditQuality ? submittedQuality : priorQuality)
      : "";
  const qualityChanged = String(nextQuality) !== String(priorQuality);
  const qualityAssessmentChanged = qualityChanged && (nextStatusForQuality === TASK_STATUS_COMPLETED || adminOverride);
  preparedRecord.qualityPercent = nextQuality;
  if (!canEditDetails && !canUpdateReport && !canEditQuality) {
    alert("Tài khoản hiện tại không có quyền lưu hoặc cập nhật công việc này.");
    return false;
  }
  if (!existingTask && !canEditDetails) {
    alert("Tài khoản hiện tại không có quyền tạo loại công việc này.");
    return false;
  }
  if (recordKind === TASK_KIND_ASSIGNED && canEditDetails && !isAdmin() && !canAssignTaskToPerson(preparedRecord.ownerId)) {
    alert("Tài khoản hiện tại chỉ được giao việc trong phạm vi phân quyền.");
    return false;
  }
  if (recordKind === TASK_KIND_ASSIGNED && normalizeTaskStatus(preparedRecord.status) === TASK_STATUS_CLOSED && !adminOverride && (!existingTask || !canEndTaskAssignment(existingTask))) {
    alert("Chỉ người giao việc mới được kết thúc công việc này.");
    return false;
  }
  if (recordKind === TASK_KIND_REGULAR && canEditDetails && !isAdmin() && !canCreateRegularTaskForPerson(preparedRecord.ownerId)) {
    alert("Tài khoản hiện tại chỉ được tạo/sửa công việc thường kỳ trong phạm vi được xem.");
    return false;
  }
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const ownerChanged = existingTask && existingTask.ownerId !== preparedRecord.ownerId;
  const collaboratorsChanged = !!existingTask && (
    (existingTask.collaboratorId || "") !== (preparedRecord.collaboratorId || "") ||
    !samePersonIdList(taskCollaboratorIds(existingTask), taskCollaboratorIds(preparedRecord))
  );
  const detailsChanged =
    !existingTask ||
    ownerChanged ||
    normalizeTaskKind(existingTask) !== recordKind ||
    existingTask.title !== preparedRecord.title ||
    projectIdForTask(existingTask) !== (preparedRecord.projectId || "") ||
    (existingTask.projectName || "") !== (preparedRecord.projectName || "") ||
    collaboratorsChanged ||
    existingTask.category !== preparedRecord.category ||
    normalizeTaskWorkType(existingTask) !== preparedRecord.workType ||
    normalizeTaskRecurrence(existingTask) !== preparedRecord.recurrence ||
    (existingTask.startDate || "") !== (preparedRecord.startDate || "") ||
    existingTask.due !== preparedRecord.due ||
    (existingTask.dueTime || "") !== (preparedRecord.dueTime || "") ||
    (existingTask.note || "") !== preparedRecord.note;

  let mergedRecord = canEditDetails
    ? {
        ...existingTask,
        ...preparedRecord,
        progressReports: existingTask?.progressReports || [],
      }
    : canUpdateReport
      ? {
          ...existingTask,
          status: preparedRecord.status,
          progress: preparedRecord.progress,
          attachments: preparedRecord.attachments,
        }
      : {
          ...existingTask,
        };
  if (!canEditDetails && canUpdateCollaborators) {
    if (recordKind === TASK_KIND_REGULAR) {
      mergedRecord.collaboratorIds = taskCollaboratorIds(preparedRecord);
      mergedRecord.collaboratorId = "";
    } else {
      mergedRecord.collaboratorIds = [];
      mergedRecord.collaboratorId = preparedRecord.collaboratorId || "";
    }
  }
  mergedRecord.qualityPercent = nextQuality;
  const completionResubmitted = nextStatusForQuality === TASK_STATUS_COMPLETED && (
    !existingTask ||
    normalizeTaskStatus(existingTask.status) !== TASK_STATUS_COMPLETED ||
    taskCompletionReviewStatus(existingTask) === "failed"
  );
  if (completionResubmitted) {
    mergedRecord.completionReviewStatus = "pending";
    mergedRecord.completionReviewedAt = "";
    mergedRecord.completionReviewedById = "";
    mergedRecord.completionReviewedByName = "";
    mergedRecord.completionReviewNote = "";
    mergedRecord.lateCompletion = false;
    if (!adminOverride) mergedRecord.qualityPercent = "";
    mergedRecord.qualityAssessedAt = "";
    mergedRecord.qualityAssessedById = "";
    mergedRecord.qualityAssessedByName = "";
  } else if (nextStatusForQuality !== TASK_STATUS_COMPLETED) {
    mergedRecord.completionReviewStatus = "";
    mergedRecord.completionReviewedAt = "";
    mergedRecord.completionReviewedById = "";
    mergedRecord.completionReviewedByName = "";
    mergedRecord.completionReviewNote = "";
    mergedRecord.lateCompletion = false;
  } else if (!mergedRecord.completionReviewStatus) {
    mergedRecord.completionReviewStatus = taskCompletionReviewStatus(existingTask);
  }
  if (nextStatusForQuality !== TASK_STATUS_COMPLETED && !adminOverride) {
    mergedRecord.qualityAssessedAt = "";
    mergedRecord.qualityAssessedById = "";
    mergedRecord.qualityAssessedByName = "";
  } else if (qualityChanged) {
    mergedRecord.qualityAssessedAt = timestamp;
    mergedRecord.qualityAssessedById = actor.id;
    mergedRecord.qualityAssessedByName = actor.name;
  }
  if (existingTask && !adminOverride && canUpdateReport && !sharedSyncSupportsTaskProgressLifecycle()) {
    preserveLegacyTaskProgressLifecycle(mergedRecord, existingTask);
  }

  if (recordKind === TASK_KIND_ASSIGNED && canEditDetails) {
    mergedRecord.assignedById = detailsChanged ? actor.id : existingTask?.assignedById || actor.id;
    mergedRecord.assignedByName = detailsChanged ? actor.name : existingTask?.assignedByName || actor.name;
    mergedRecord.assignedAt = detailsChanged ? timestamp : existingTask?.assignedAt || timestamp;
    mergedRecord.responseStatus = ownerChanged ? "" : existingTask?.responseStatus || "";
    mergedRecord.responseNote = ownerChanged ? "" : existingTask?.responseNote || "";
    mergedRecord.responseAt = ownerChanged ? "" : existingTask?.responseAt || "";
    mergedRecord.responseById = ownerChanged ? "" : existingTask?.responseById || "";
    mergedRecord.responseByName = ownerChanged ? "" : existingTask?.responseByName || "";
  }

  if (recordKind === TASK_KIND_REGULAR && canEditDetails) {
    mergedRecord.assignedById = "";
    mergedRecord.assignedByName = "";
    mergedRecord.assignedAt = "";
    mergedRecord.responseStatus = "";
    mergedRecord.responseNote = "";
    mergedRecord.responseAt = "";
    mergedRecord.responseById = "";
    mergedRecord.responseByName = "";
  }

  if (existingTask && canUpdateReport && recordKind === TASK_KIND_ASSIGNED && (canReportTask(existingTask) || canEditDetails)) {
    const responseNoteText = String(responseNote || "").trim();
    const nextResponseNote = responseNoteText || existingTask.responseNote || "";
    const changedResponse = responseStatus !== (existingTask.responseStatus || "") || (!!responseNoteText && responseNoteText !== (existingTask.responseNote || ""));
    mergedRecord = {
      ...mergedRecord,
      responseStatus,
      responseNote: nextResponseNote,
      responseAt: changedResponse && (responseStatus || responseNoteText) ? timestamp : existingTask.responseAt || "",
      responseById: changedResponse && (responseStatus || responseNoteText) ? actor.id : existingTask.responseById || "",
      responseByName: changedResponse && (responseStatus || responseNoteText) ? actor.name : existingTask.responseByName || "",
    };
  }

  const previousStatus = normalizeTaskStatus(existingTask?.status);
  const nextStatus = normalizeTaskStatus(mergedRecord.status);
  const previousComputedStatus = existingTask ? getDueStatus(existingTask) : previousStatus;
  const nextComputedStatus = getDueStatus(mergedRecord);
  const progressChanged = existingTask && Number(existingTask.progress || 0) !== Number(mergedRecord.progress || 0);
  const statusChanged = existingTask && (previousStatus !== nextStatus || previousComputedStatus !== nextComputedStatus);
  const progressReportNoteText = String(progressReportNote || "").trim();
  const shouldAppendProgressNote = !!progressReportNoteText && (!canEditDetails || progressReportNoteText !== (existingTask?.note || ""));
  const updateChangeLabels = existingTask ? taskUpdateChangeLabels(existingTask, mergedRecord) : [];
  const hasTaskUpdate = updateChangeLabels.length > 0;
  if ((existingTask && !reportLockedByApproval && (canUpdateReport || canEditDetails)) && (shouldAppendProgressNote || hasTaskUpdate)) {
    const updateAction = statusChanged
      ? "Chuyển trạng thái công việc"
      : qualityChanged
        ? "Cập nhật đánh giá chất lượng"
        : collaboratorsChanged
          ? "Cập nhật người phối hợp"
          : progressChanged || shouldAppendProgressNote
            ? "Cập nhật tiến độ công việc"
            : "Cập nhật thông tin công việc";
    const updateNote = shouldAppendProgressNote
      ? progressReportNoteText
      : hasTaskUpdate
        ? `Đã thay đổi: ${updateChangeLabels.join(", ")}.`
        : "Cập nhật công việc.";
    mergedRecord.progressReports = [
      ...(mergedRecord.progressReports || []),
      {
        id: uid("task-report"),
        progress: mergedRecord.progress,
        status: nextStatus,
        previousStatus,
        action: updateAction,
        note: updateNote,
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      },
    ];
  }

  if (nextStatus === "Hoàn thành" && previousStatus !== "Hoàn thành") {
    mergedRecord.completedAt = timestamp;
    mergedRecord.completedById = actor.id;
    mergedRecord.completedByName = actor.name;
  } else if (nextStatus !== "Hoàn thành") {
    mergedRecord.completedAt = "";
    mergedRecord.completedById = "";
    mergedRecord.completedByName = "";
  }

  const totalAttachmentSize = mergedRecord.attachments.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (totalAttachmentSize > MAX_TASK_ATTACHMENT_TOTAL_BYTES) {
    alert("Tổng dung lượng hồ sơ đính kèm của một công việc không được vượt quá 5MB.");
    return false;
  }
  const previousTasks = state.tasks;
  const previousActivityLog = state.activityLog;
  const previousEvaluations = state.evaluations;
  const auditedRecord = applyRecordAudit(mergedRecord, existingTask);
  state.tasks = index >= 0 ? state.tasks.map((item) => (item.id === preparedRecord.id ? auditedRecord : item)) : [...state.tasks, auditedRecord];
  syncPersonalEvaluationTaskScoresForTask(auditedRecord, existingTask);
  const owner = personById(auditedRecord.ownerId);
  const collaboratorNames = taskCollaboratorNames(auditedRecord);
  const collaboratorMeta = collaboratorNames.length ? ` · phối hợp ${collaboratorNames.join(", ")}` : "";
  const projectMeta = auditedRecord.projectName ? ` · dự án ${auditedRecord.projectName}` : "";
  const action = !existingTask
    ? recordKind === TASK_KIND_ASSIGNED
      ? "Giao việc"
      : "Tạo"
    : canEditDetails && detailsChanged
      ? recordKind === TASK_KIND_ASSIGNED
        ? "Cập nhật giao việc"
        : "Cập nhật thường kỳ"
      : updateChangeLabels.length
        ? "Cập nhật công việc"
      : collaboratorsChanged
        ? "Cập nhật người phối hợp"
      : qualityAssessmentChanged
        ? "Đánh giá chất lượng"
      : recordKind === TASK_KIND_ASSIGNED
        ? "Phản hồi/Báo cáo"
        : "Cập nhật tiến độ";
  logActivity({
    action,
    module: "Công việc",
    targetType: "task",
    targetId: preparedRecord.id,
    personId: auditedRecord.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(auditedRecord),
    title: auditedRecord.title,
    details: `${taskKindLabels[recordKind]}${recordKind === TASK_KIND_REGULAR ? ` · ${taskWorkMeta(auditedRecord)}` : ""}${projectMeta} · ${taskOwnerName(auditedRecord, "Chưa rõ người nhận")}${collaboratorMeta} · ${normalizeTaskStatus(auditedRecord.status)} · hoàn thành ${formatTaskDeadline(auditedRecord) || "chưa có"}${taskHasQualityPercent(auditedRecord) ? ` · chất lượng ${formatScore(taskQualityPercentValue(auditedRecord))}%` : ""}`,
    score: taskHasQualityPercent(auditedRecord)
      ? `Tiến độ ${formatScore(auditedRecord.progress)}% · Chất lượng ${formatScore(taskQualityPercentValue(auditedRecord))}%`
      : `${formatScore(auditedRecord.progress)}%`,
  });
  try {
    saveState();
  } catch {
    state.tasks = previousTasks;
    state.activityLog = previousActivityLog;
    state.evaluations = previousEvaluations;
    alert("Không thể lưu hồ sơ đính kèm vì dung lượng dữ liệu trình duyệt đã đầy. Vui lòng giảm số lượng hoặc dung lượng tệp.");
    return false;
  }
  resetCallback();
  renderAll();
  return true;
}

byId("taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const taskId = byId("taskId").value || uid("task");
  const existingTask = state.tasks.find((task) => task.id === taskId);
  const preserveExistingOwner = !!existingTask && !canEditTaskDetails(existingTask);
  const ownerId = preserveExistingOwner ? String(existingTask.ownerId || "") : byId("taskOwner").value;
  if (!ownerId) {
    alert("Chọn Người thực hiện trước khi lưu công việc.");
    setTaskOwnerPickerOpen(true);
    return;
  }
  const saved = await saveTaskRecord(
    {
      id: taskId,
      kind: TASK_KIND_REGULAR,
      title: byId("taskTitle").value.trim(),
      projectId: byId("taskProjectId").value,
      ownerId,
      collaboratorIds: selectedTaskCollaboratorIds(),
      category: byId("taskCategory").value,
      workType: byId("taskWorkType").value,
      recurrence: byId("taskRecurrence").value,
      startDate: byId("taskStartDate").value,
      due: byId("taskDue").value,
      dueTime: byId("taskDueTime").value,
      status: normalizeTaskStatus(byId("taskStatus").value),
      progress: clamp(byId("taskProgress").value, 0, 100),
      qualityPercent: normalizeTaskQualityInput(byId("taskQualityPercent").value),
      note: byId("taskNote").value.trim(),
    },
    byId("taskAttachments"),
    taskAttachmentDraft,
    "",
    "",
    byId("taskNote").value.trim(),
    resetTaskForm,
  );
  if (saved && taskDetailInlineEditor?.taskId === taskId) {
    restoreTaskDetailInlineEditor();
    openTaskDetailDialog(taskId);
  } else if (saved) {
    closeTaskFormDialog();
  }
});

byId("assignmentTaskForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const taskId = byId("assignmentTaskId").value || uid("task");
  const saved = await saveTaskRecord(
    {
      id: taskId,
      kind: TASK_KIND_ASSIGNED,
      title: byId("assignmentTaskTitle").value.trim(),
      projectId: byId("assignmentTaskProjectId").value,
      ownerId: byId("assignmentTaskOwner").value,
      collaboratorId: byId("assignmentTaskCollaborator").value,
      category: byId("assignmentTaskCategory").value,
      startDate: byId("assignmentTaskStartDate").value,
      due: byId("assignmentTaskDue").value,
      dueTime: byId("assignmentTaskDueTime").value,
      status: normalizeTaskStatus(byId("assignmentTaskStatus").value),
      progress: clamp(byId("assignmentTaskProgress").value, 0, 100),
      qualityPercent: normalizeTaskQualityInput(byId("assignmentTaskQualityPercent").value),
      note: byId("assignmentTaskNote").value.trim(),
    },
    byId("assignmentTaskAttachments"),
    assignmentAttachmentDraft,
    byId("assignmentTaskResponseStatus").value,
    byId("assignmentTaskResponseNote").value.trim(),
    byId("assignmentTaskResponseNote").value.trim(),
    () => {
      resetAssignmentTaskForm();
      renderTaskInboxDialog();
    },
  );
  if (saved && taskDetailInlineEditor?.taskId === taskId) {
    restoreTaskDetailInlineEditor();
    openTaskDetailDialog(taskId);
  }
});

byId("openTaskForm").addEventListener("click", openNewTaskFormDialog);
byId("openTaskBulkImport").addEventListener("click", openTaskBulkImportDialog);
byId("closeTaskForm").addEventListener("click", closeTaskFormDialog);
byId("taskFormDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskFormDialog")) closeTaskFormDialog();
});
byId("closeTaskBulkImport").addEventListener("click", closeTaskBulkImportDialog);
byId("taskBulkImportDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskBulkImportDialog")) closeTaskBulkImportDialog();
});
byId("taskBulkImportFile").addEventListener("change", (event) => {
  handleTaskBulkImportFile(event.target.files?.[0]);
});
byId("downloadTaskImportTemplate").addEventListener("click", downloadTaskBulkImportTemplate);
byId("confirmTaskBulkImport").addEventListener("click", importTaskBulkRows);
byId("resetTaskBulkImport").addEventListener("click", resetTaskBulkImport);
byId("resetTaskForm").addEventListener("click", () => {
  resetTaskForm();
  syncTaskFormDialogHeading();
});
byId("resetAssignmentTaskForm")?.addEventListener("click", resetAssignmentTaskForm);
byId("endAssignmentTask")?.addEventListener("click", endAssignmentTaskFromForm);
byId("openTaskProjectCatalog").addEventListener("click", openTaskProjectCatalogDialog);
byId("closeTaskProjectCatalog").addEventListener("click", closeTaskProjectCatalogDialog);
byId("taskProjectCatalogDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskProjectCatalogDialog")) closeTaskProjectCatalogDialog();
});
byId("taskProjectCatalogForm").addEventListener("submit", saveTaskProjectCatalog);
byId("resetTaskProjectCatalogForm").addEventListener("click", resetTaskProjectCatalogForm);
byId("taskProjectCatalogSearch").addEventListener("input", renderTaskProjectCatalog);
byId("taskProjectCatalogList").addEventListener("click", (event) => {
  const projectTaskListId = event.target.closest("[data-open-project-tasks]")?.dataset.openProjectTasks;
  if (projectTaskListId) {
    openProjectTaskList(projectTaskListId);
    return;
  }
  const editProjectId = event.target.closest("[data-edit-task-project]")?.dataset.editTaskProject;
  if (editProjectId) {
    editTaskProjectCatalog(editProjectId);
    return;
  }
  const deleteProjectId = event.target.closest("[data-delete-task-project]")?.dataset.deleteTaskProject;
  if (deleteProjectId) deleteTaskProjectCatalog(deleteProjectId);
});
byId("taskOwner").addEventListener("change", () => {
  byId("taskCategory").value = "";
  updateTaskOwnerOptions();
  updateTaskCollaboratorOptions();
  updateTaskCategoryOptions();
  updateTaskFormLock();
});
byId("taskOwnerOptions").addEventListener("change", (event) => {
  const input = event.target.closest('input[type="radio"]');
  if (!input?.value || byId("taskOwner").disabled) return;
  byId("taskOwner").value = input.value;
  byId("taskOwner").dispatchEvent(new Event("change", { bubbles: true }));
  setTaskOwnerPickerOpen(false);
});
byId("taskOwnerSearch").addEventListener("input", debounce(filterTaskOwnerOptions, 100));
byId("taskOwnerSearch").addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setTaskOwnerPickerOpen(false);
  byId("taskOwnerToggle")?.focus();
});
byId("taskOwnerToggle").addEventListener("click", () => {
  setTaskOwnerPickerOpen(!isTaskOwnerPickerOpen());
});
byId("taskCollaborators").addEventListener("change", updateTaskCollaboratorSummary);
byId("taskCollaboratorSearch").addEventListener("input", debounce(filterTaskCollaboratorOptions, 150));
byId("taskCollaboratorSearch").addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setTaskCollaboratorPickerOpen(false);
  byId("taskCollaboratorToggle")?.focus();
});
byId("taskCollaboratorToggle").addEventListener("click", () => {
  setTaskCollaboratorPickerOpen(!isTaskCollaboratorPickerOpen());
});
document.addEventListener("pointerdown", (event) => {
  const collaboratorPicker = byId("taskCollaboratorPicker");
  const ownerPicker = byId("taskOwnerPicker");
  if (isTaskCollaboratorPickerOpen() && !collaboratorPicker?.contains(event.target)) {
    setTaskCollaboratorPickerOpen(false);
  }
  if (isTaskOwnerPickerOpen() && !ownerPicker?.contains(event.target)) {
    setTaskOwnerPickerOpen(false);
  }
});
byId("taskStatus").addEventListener("change", () => {
  updateTaskFormLock();
});
byId("assignmentTaskOwner")?.addEventListener("change", () => {
  byId("assignmentTaskCategory").value = "";
  updateTaskCategoryOptions("", "assignmentTaskOwner", "assignmentTaskCategory");
  updateAssignmentTaskFormLock();
});
byId("assignmentTaskStatus")?.addEventListener("change", () => {
  updateAssignmentTaskFormLock();
});
byId("taskSearch").addEventListener("input", debounce(renderTaskBoard, 200));
byId("taskProjectFilter").addEventListener("change", renderTaskBoard);
byId("taskStatusFilter").addEventListener("change", renderTaskBoard);
byId("taskDateFrom").addEventListener("change", renderTaskBoard);
byId("taskDateTo").addEventListener("change", renderTaskBoard);
byId("clearTaskTimeFilter").addEventListener("click", () => {
  clearTaskTimeFilter();
  renderTaskBoard();
});
document.querySelectorAll("[data-scroll-page]").forEach((button) => button.addEventListener("click", () => {
  const scrollRoot = document.scrollingElement || document.documentElement;
  const top = button.dataset.scrollPage === "bottom" ? scrollRoot.scrollHeight : 0;
  window.scrollTo({ top, behavior: "smooth" });
}));
byId("taskInboxButton")?.addEventListener("click", openTaskInboxDialog);
byId("closeTaskInbox")?.addEventListener("click", closeTaskInboxDialog);
byId("taskInboxDialog")?.addEventListener("click", (event) => {
  if (event.target === byId("taskInboxDialog")) {
    closeTaskInboxDialog();
  }
});
byId("taskInboxList")?.addEventListener("click", (event) => {
  const taskId = event.target.closest("[data-open-inbox-task]")?.dataset.openInboxTask;
  if (!taskId) return;
  closeTaskInboxDialog();
  openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
});
byId("closeTaskStatusDetail").addEventListener("click", closeTaskStatusDetailDialog);
byId("taskStatusDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskStatusDetailDialog")) {
    closeTaskStatusDetailDialog();
  }
});
byId("closeTaskCompletionReview").addEventListener("click", closeTaskCompletionReviewDialog);
byId("cancelTaskCompletionReview").addEventListener("click", closeTaskCompletionReviewDialog);
byId("taskCompletionReviewDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskCompletionReviewDialog")) {
    closeTaskCompletionReviewDialog();
  }
});
byId("taskCompletionReviewStatus").addEventListener("change", updateTaskCompletionReviewQualityField);
byId("taskCompletionReviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const taskId = byId("taskCompletionReviewTaskId").value;
  const decision = byId("taskCompletionReviewStatus").value;
  if (!decision) {
    alert("Chọn kết quả Đạt hoặc Không đạt trước khi lưu.");
    return;
  }
  const qualityPercent = normalizeTaskQualityInput(byId("taskCompletionReviewQualityPercent").value);
  if (decision === "passed" && qualityPercent === "") {
    alert("Nhập Đánh giá chất lượng trước khi lưu kết quả Đạt.");
    byId("taskCompletionReviewQualityPercent").focus();
    return;
  }
  if (reviewTaskCompletion(taskId, decision, byId("taskCompletionReviewNote").value, qualityPercent)) {
    closeTaskCompletionReviewDialog();
  }
});
byId("closeTaskDetail").addEventListener("click", closeTaskDetailDialog);
byId("taskDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskDetailDialog")) {
    closeTaskDetailDialog();
  }
});
byId("taskDetailActions").addEventListener("click", (event) => {
  const action = event.target.closest("[data-task-detail-action]")?.dataset.taskDetailAction;
  const taskId = byId("taskDetailDialog").dataset.taskId;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!action || !task) return;
  if (action === "cancel-edit") {
    openTaskDetailDialog(taskId);
    return;
  }
  if (action === "edit" && canEditTaskDetails(task)) {
    openTaskDetailInlineEditor(taskId);
    return;
  }
  if (action === "report" && canUpdateTaskProgress(task)) {
    openTaskDetailInlineEditor(taskId, isAssignedTask(task) ? "assignmentTaskResponseNote" : "taskNote");
    return;
  }
  if (action === "copy" && canCopyTask(task)) {
    closeTaskDetailDialog();
    copyTaskToForm(task);
    return;
  }
  if (action === "review" && canReviewTaskCompletion(task)) {
    closeTaskDetailDialog();
    openTaskCompletionReviewDialog(taskId);
    return;
  }
  if (action === "end" && canEndTaskAssignment(task)) {
    if (endAssignmentTask(taskId)) closeTaskDetailDialog();
    return;
  }
  if (action === "delete" && canDeleteTask(task)) {
    if (deleteTaskRecord(taskId)) closeTaskDetailDialog();
  }
});
byId("taskStatusDetailList").addEventListener("click", (event) => {
  const taskId = event.target.closest("[data-open-status-task]")?.dataset.openStatusTask;
  if (!taskId) return;
  closeTaskStatusDetailDialog();
  openTaskDetailDialog(taskId);
});
byId("closeKpiTaskDetail").addEventListener("click", closeKpiTaskDetailDialog);
byId("kpiTaskDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("kpiTaskDetailDialog")) {
    closeKpiTaskDetailDialog();
  }
});
byId("kpiTaskDetailList").addEventListener("click", (event) => {
  const criterionName = event.target.closest("[data-open-kpi-criterion]")?.dataset.openKpiCriterion;
  if (criterionName) {
    openKpiTaskDetailDialog("personal", criterionName);
    return;
  }
  const taskId = event.target.closest("[data-open-kpi-task]")?.dataset.openKpiTask;
  if (!taskId) return;
  closeKpiTaskDetailDialog();
  openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
});
byId("taskAttachmentList").addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeTaskAttachment;
  if (!removeId) return;
  taskAttachmentDraft = taskAttachmentDraft.filter((file) => file.id !== removeId);
  renderTaskAttachmentDraft();
});
byId("assignmentTaskAttachmentList")?.addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeAssignmentAttachment;
  if (!removeId) return;
  assignmentAttachmentDraft = assignmentAttachmentDraft.filter((file) => file.id !== removeId);
  renderAssignmentTaskAttachmentDraft();
});

byId("taskBoard").addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-open-task-status]");
  const detailId = event.target.closest("[data-open-task-detail]")?.dataset.openTaskDetail;
  const editId = event.target.closest("[data-edit-task]")?.dataset.editTask;
  const copyId = event.target.closest("[data-copy-task]")?.dataset.copyTask;
  const respondId = event.target.closest("[data-respond-task]")?.dataset.respondTask;
  const reviewId = event.target.closest("[data-review-task]")?.dataset.reviewTask;
  const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;
  if (statusButton) {
    openTaskStatusDetailDialog(statusButton.dataset.openTaskStatus);
    return;
  }
  if (detailId && !event.target.closest("button, a, input, select, textarea, label, details, summary")) {
    openTaskDetailDialog(detailId);
    return;
  }
  if (editId) {
    const task = state.tasks.find((item) => item.id === editId);
    if (!task || !canEditTaskDetails(task)) return;
    if (isAssignedTask(task)) {
      renderTaskInboxDialog();
      byId("taskInboxDialog").classList.remove("is-hidden");
      byId("taskInboxDialog").setAttribute("aria-hidden", "false");
      populateAssignmentTaskForm(task);
      byId("assignmentTaskTitle").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    populateTaskForm(task);
    focusEditForm("taskForm", "taskTitle");
  }
  if (copyId) {
    const task = state.tasks.find((item) => item.id === copyId);
    copyTaskToForm(task);
    return;
  }
  if (respondId) {
    const task = state.tasks.find((item) => item.id === respondId);
    if (!task || !canUpdateTaskProgress(task)) return;
    if (isAssignedTask(task)) {
      renderTaskInboxDialog();
      byId("taskInboxDialog").classList.remove("is-hidden");
      byId("taskInboxDialog").setAttribute("aria-hidden", "false");
      populateAssignmentTaskForm(task);
      byId("assignmentTaskResponseNote").scrollIntoView({ behavior: "smooth", block: "center" });
      (canReportTask(task) ? byId("assignmentTaskResponseStatus") : byId("assignmentTaskResponseNote")).focus({ preventScroll: true });
      return;
    }
    populateTaskForm(task);
    focusEditForm("taskForm", isAssignedTask(task) ? "taskResponseStatus" : "taskNote");
  }
  if (reviewId) {
    openTaskCompletionReviewDialog(reviewId);
    return;
  }
  if (deleteId) deleteTaskRecord(deleteId);
});

byId("deptEvalPeriod").addEventListener("change", loadDepartmentEvaluationForSelection);
byId("deptEvalDepartment").addEventListener("change", loadDepartmentEvaluationForSelection);
byId("departmentEvaluationForm").addEventListener("input", (event) => {
  if (event.target.matches("[data-department-score-input]")) updateDepartmentScorePreview();
});
byId("departmentEvaluationForm").addEventListener("change", (event) => {
  if (event.target.matches("[data-department-score-input]")) updateDepartmentScorePreview();
});
byId("departmentCriteriaInputs").addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-kpi-detail]");
  if (!detailButton) return;
  openKpiTaskDetailDialog(detailButton.dataset.kpiDetail, detailButton.dataset.kpiCriterion || "");
});

byId("departmentEvaluationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const period = byId("deptEvalPeriod").value || state.activePeriod;
  const departmentId = byId("deptEvalDepartment").value;
  const canReportData = canReportDepartmentEvaluation(departmentId, period);
  const canConfirm = canConfirmDepartmentEvaluation(departmentId, period);
  if (!canReportData && !canConfirm) {
    alert("Tài khoản hiện tại không có quyền lưu KPI phòng.");
    return;
  }
  const existing = latestDepartmentEvaluation(departmentId, period);
  const adjustmentActor = currentAdjustmentActor();
  const calculated = calculateDepartmentEvaluationFromForm();
  const adjustmentType = canConfirm
    ? calculated.adjustmentType
    : normalizeDepartmentAdjustmentType(existing?.adjustmentType);
  const adjustmentPoints = canConfirm
    ? calculated.adjustmentPoints
    : Math.max(0, Number(existing?.adjustmentPoints || 0));
  const adjustmentScore = departmentAdjustmentSignedScore(adjustmentType, adjustmentPoints);
  const result = {
    ...calculated,
    adjustmentType,
    adjustmentPoints,
    adjustmentScore,
    rewardDisciplineNote: canConfirm ? calculated.rewardDisciplineNote : existing?.rewardDisciplineNote || "",
    finalScore: calculateDepartmentFinalScore(calculated.criteriaScore, adjustmentScore),
  };
  const record = applyRecordAudit({
    id: existing?.id || uid("dept-eval"),
    period,
    departmentId,
    criteriaScores: result.criteriaScores,
    criteriaScore: result.criteriaScore,
    adjustmentType: result.adjustmentType,
    adjustmentPoints: result.adjustmentPoints,
    adjustmentScore: result.adjustmentScore,
    rewardDisciplineNote: result.rewardDisciplineNote,
    finalScore: result.finalScore,
    grade: gradeDepartment(result.finalScore),
    reviewer: canConfirm ? adjustmentActor.label : existing?.reviewer || "",
    reviewerId: canConfirm ? adjustmentActor.id : existing?.reviewerId || "",
    comment: canConfirm ? byId("deptEvalComment").value.trim() : existing?.comment || "",
    customFields: collectCustomFieldValues("department-evaluations", existing?.customFields),
  }, existing);
  if (existing) Object.assign(existing, record);
  else state.departmentEvaluations.push(record);
  syncIndividualScoresForDepartment(period, departmentId, result.finalScore);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "KPI phòng",
    targetType: "departmentEvaluation",
    targetId: record.id,
    departmentId,
    period,
    title: departmentById(departmentId)?.name || "Phòng",
    details: [
      record.reviewer ? `Điều chỉnh điểm: ${record.reviewer}` : "",
      departmentAdjustmentSummary(record),
      record.comment || "",
    ]
      .filter(Boolean)
      .join(" · "),
    score: `${formatScore(record.finalScore)} điểm - ${record.grade}`,
  });
  saveState();
  resetDepartmentEvaluationForm();
  renderAll();
});

byId("resetDeptEvalForm").addEventListener("click", resetDepartmentEvaluationForm);

byId("departmentEvaluationTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.editDeptEval;
  const deleteId = event.target.dataset.deleteDeptEval;
  if (editId) {
    const evaluation = state.departmentEvaluations.find((item) => item.id === editId);
    if (!evaluation || !canEditDepartmentEvaluation(evaluation.departmentId, evaluation.period)) return;
    populateDepartmentEvaluationForm(evaluation);
    focusEditForm("departmentEvaluationForm", "deptEvalPeriod");
  }
  if (deleteId && confirm("Xóa phiếu KPI phòng này? Điểm phòng trong các phiếu cá nhân đã lưu sẽ được giữ nguyên.")) {
    const evaluation = state.departmentEvaluations.find((item) => item.id === deleteId);
    if (!evaluation || !canEditDepartmentEvaluation(evaluation.departmentId, evaluation.period)) return;
    state.departmentEvaluations = state.departmentEvaluations.filter((item) => item.id !== deleteId);
    logActivity({
      action: "Xóa",
      module: "KPI phòng",
      targetType: "departmentEvaluation",
      targetId: deleteId,
      departmentId: evaluation.departmentId,
      period: evaluation.period,
      title: departmentById(evaluation.departmentId)?.name || "Phòng đã xóa",
      details: [evaluation.reviewer ? `Điều chỉnh điểm: ${evaluation.reviewer}` : "", evaluation.comment || ""].filter(Boolean).join(" · "),
      score: `${formatScore(evaluation.finalScore)} điểm - ${evaluation.grade}`,
    });
    saveState();
    renderAll();
  }
});

byId("evalPerson").addEventListener("change", () => {
  loadEvaluationForSelection();
});
byId("evalPeriod").addEventListener("change", () => {
  loadEvaluationForSelection();
});
byId("evalDepartmentScore").addEventListener("input", updateScorePreview);
byId("criteriaInputs").addEventListener("click", (event) => {
  const behaviorCriterion = event.target.closest("[data-kpi-behavior-criterion]")?.dataset.kpiBehaviorCriterion;
  if (behaviorCriterion) {
    openTaskBehaviorDetailDialog(behaviorCriterion);
    return;
  }
  const detailButton = event.target.closest("[data-kpi-detail]");
  if (!detailButton) return;
  openKpiTaskDetailDialog(detailButton.dataset.kpiDetail, detailButton.dataset.kpiCriterion || "");
});

byId("openDepartmentEvaluationFromPersonal").addEventListener("click", () => {
  const person = personById(byId("evalPerson").value);
  byId("deptEvalPeriod").value = byId("evalPeriod").value || state.activePeriod;
  if (person) {
    byId("deptEvalDepartment").value = person.departmentId;
  }
  loadDepartmentEvaluationForSelection();
  switchView("department-evaluations");
  byId("deptEvalDepartment").focus();
});

byId("evaluationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const period = byId("evalPeriod").value || state.activePeriod;
  const personId = byId("evalPerson").value;
  const person = personById(personId);
  const canEditBase = canEditEvaluation(personId, period);
  const canEditBehavior = canEditEvaluationBehavior(personId, period);
  const existing = state.evaluations.find((item) => item.period === period && item.personId === personId);
  if (!canEditBase && !canEditBehavior) {
    alert("Tài khoản hiện tại không có quyền lưu phiếu KPI này hoặc kỳ đánh giá đã khóa.");
    return;
  }
  if (!canEditBase && !existing) {
    alert("Chưa có phiếu KPI cá nhân trong kỳ này. Tài khoản hiện tại chỉ được nhập phần khen thưởng, kỷ luật, tác phong trên phiếu đã có.");
    return;
  }
  syncDepartmentScoreFromSelectedPerson();
  const result = calculateEvaluationFromForm();
  const criteriaScores = canEditBase ? result.criteriaScores : existing?.criteriaScores || {};
  const personalScore = canEditBase ? result.personalScore : existing?.personalScore || 0;
  const departmentScore = canEditBase ? result.departmentScore : existing?.departmentScore || 0;
  const behavior = canEditBehavior ? result.behavior : existing?.behavior || {};
  const behaviorManual = canEditBehavior ? result.behaviorManual : existing?.behaviorManual || existing?.behavior || {};
  const behaviorAutomatic = canEditBehavior ? result.behaviorAutomatic : existing?.behaviorAutomatic || {};
  const taskBehaviorLinks = canEditBehavior ? result.taskBehaviorLinks : existing?.taskBehaviorLinks || [];
  const behaviorScore = canEditBehavior ? result.behaviorScore : existing?.behaviorScore || 0;
  const finalScore = calculatePersonalFinalScore(personalScore, departmentScore, behaviorScore);
  const adjustmentActor = currentAdjustmentActor();
  const record = applyRecordAudit({
    id: existing?.id || uid("eval"),
    period,
    personId,
    criteriaScores,
    behavior,
    behaviorManual,
    behaviorAutomatic,
    taskBehaviorLinks,
    personalScore,
    departmentScore,
    behaviorScore,
    finalScore,
    grade: gradePersonal(finalScore),
    reviewer: canEditBehavior ? adjustmentActor.label : existing?.reviewer || "",
    reviewerId: canEditBehavior ? adjustmentActor.id : existing?.reviewerId || "",
    comment: canEditBase ? byId("evalComment").value.trim() : existing?.comment || "",
    customFields: collectCustomFieldValues("evaluations", existing?.customFields),
  }, existing);
  if (existing) Object.assign(existing, record);
  else state.evaluations.push(record);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "KPI cá nhân",
    targetType: "evaluation",
    targetId: record.id,
    personId,
    departmentId: person?.departmentId || "",
    period,
    title: person?.name || "Nhân sự",
    details: record.comment || record.reviewer || "",
    score: `${formatScore(record.finalScore)} điểm - ${record.grade}`,
  });
  saveState();
  resetEvaluationForm();
  renderAll();
});

byId("resetEvalForm").addEventListener("click", resetEvaluationForm);
byId("clearEvaluationGradeFilter").addEventListener("click", () => {
  evaluationGradeFilter = "";
  renderEvaluationTable();
});

byId("evaluationTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.editEval;
  const deleteId = event.target.dataset.deleteEval;
  if (editId) {
    const evaluation = state.evaluations.find((item) => item.id === editId);
    if (!evaluation || (!canEditEvaluation(evaluation.personId, evaluation.period) && !canEditEvaluationBehavior(evaluation.personId, evaluation.period))) return;
    byId("evalPeriod").value = evaluation.period;
    byId("evalPerson").value = evaluation.personId;
    renderAdjustmentActorInput("evalReviewer", evaluation);
    byId("evalComment").value = evaluation.comment || "";
    syncDepartmentScoreFromSelectedPerson();
    renderCriteriaInputs(evaluation.criteriaScores);
    renderBehaviorInputs(evaluation);
    updateScorePreview();
    renderCustomFieldsForScope("evaluations");
    applyFieldCustomizations();
    focusEditForm("evaluationForm", "evalPeriod");
  }
  if (deleteId && confirm("Xóa phiếu đánh giá này?")) {
    const evaluation = state.evaluations.find((item) => item.id === deleteId);
    if (!evaluation || !canEditEvaluation(evaluation.personId, evaluation.period)) return;
    const person = personById(evaluation.personId);
    state.evaluations = state.evaluations.filter((item) => item.id !== deleteId);
    logActivity({
      action: "Xóa",
      module: "KPI cá nhân",
      targetType: "evaluation",
      targetId: deleteId,
      personId: evaluation.personId,
      departmentId: person?.departmentId || "",
      period: evaluation.period,
      title: person?.name || "Nhân sự đã xóa",
      details: evaluation.comment || evaluation.reviewer || "",
      score: `${formatScore(evaluation.finalScore)} điểm - ${evaluation.grade}`,
    });
    saveState();
    renderAll();
  }
});

byId("behaviorInputs").addEventListener("click", (event) => {
  const ruleIndex = Number(event.target.closest("[data-task-behavior-rule]")?.dataset.taskBehaviorRule);
  if (!Number.isInteger(ruleIndex) || ruleIndex < 0) return;
  openTaskBehaviorDetailDialog("", ruleIndex);
});

byId("historyType").addEventListener("change", () => {
  renderHistoryTargetOptions();
  renderHistory();
});
byId("historyTarget").addEventListener("change", renderHistory);
byId("historyFrom").addEventListener("change", renderHistory);
byId("historyTo").addEventListener("change", renderHistory);
byId("historyTimeline").addEventListener("click", (event) => {
  const item = event.target.closest("[data-history-target-type]");
  if (!item) return;
  openHistoryTimelineTarget({
    targetType: item.dataset.historyTargetType,
    targetId: item.dataset.historyTargetId,
    personId: item.dataset.historyPersonId,
    departmentId: item.dataset.historyDepartmentId,
    title: item.dataset.historyTitle,
  });
});
byId("historyTimeline").addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const item = event.target.closest("[data-history-target-type]");
  if (!item) return;
  event.preventDefault();
  openHistoryTimelineTarget({
    targetType: item.dataset.historyTargetType,
    targetId: item.dataset.historyTargetId,
    personId: item.dataset.historyPersonId,
    departmentId: item.dataset.historyDepartmentId,
    title: item.dataset.historyTitle,
  });
});

byId("seedDemo").addEventListener("click", seedDemoData);

byId("printReport").addEventListener("click", openPrintDialog);

byId("cancelPrint").addEventListener("click", closePrintDialog);

byId("printDialog").addEventListener("click", (event) => {
  if (event.target === byId("printDialog")) {
    closePrintDialog();
  }
});

byId("printForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = Array.from(document.querySelectorAll("input[name='printSection']:checked")).map((input) => input.value);
  if (!selected.length) {
    alert("Vui lòng chọn ít nhất một mục để in.");
    return;
  }
  printSelectedSections(selected);
});

window.addEventListener("beforeprint", finishDashboardChartAnimations);
window.addEventListener("afterprint", clearPrintSelection);

async function stateForExport() {
  const exported = JSON.parse(JSON.stringify(state));
  for (const post of exported.bulletins || []) {
    if (!Array.isArray(post.media)) continue;
    for (const file of post.media) {
      if (file.dataUrl) continue;
      const sourceFile = bulletinMediaByKey(storedFileKey(file)) || file;
      try {
        const dataUrl = await readStoredFileDataUrl(sourceFile);
        if (dataUrl) file.dataUrl = dataUrl;
      } catch {
        // Keep metadata even if the stored media cannot be read during export.
      }
    }
  }
  for (const record of exported.archiveRecords || []) {
    if (!Array.isArray(record.files)) continue;
    for (const file of record.files) {
      if (file.dataUrl) continue;
      const sourceFile = archiveFileByKey(storedFileKey(file)) || file;
      try {
        const dataUrl = await readStoredFileDataUrl(sourceFile);
        if (dataUrl) file.dataUrl = dataUrl;
      } catch {
        // Keep metadata even if the stored file cannot be read during export.
      }
    }
  }
  for (const task of exported.tasks || []) {
    if (!Array.isArray(task.attachments)) continue;
    for (const file of task.attachments) {
      if (file.dataUrl) continue;
      const sourceFile = taskAttachmentByKey(storedFileKey(file)) || file;
      try {
        const dataUrl = await readStoredFileDataUrl(sourceFile);
        if (dataUrl) file.dataUrl = dataUrl;
      } catch {
        // Keep metadata even if the stored task attachment cannot be read during export.
      }
    }
  }
  return exported;
}

const SPLIT_JSON_FORMAT = "phuc-thinh-kpi-split-json";
const SPLIT_JSON_VERSION = 1;
const SPLIT_JSON_GROUPS = new Set(["bulletins", "archive", "people-accounts", "operations"]);

function splitStateForExport(exported) {
  const period = String(exported.activePeriod || state.activePeriod || currentMonth());
  const metadata = {
    format: SPLIT_JSON_FORMAT,
    version: SPLIT_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    activePeriod: period,
  };
  return [
    {
      filename: `du-lieu-bang-tin-${period}.json`,
      data: { ...metadata, group: "bulletins", bulletins: exported.bulletins || [] },
    },
    {
      filename: `du-lieu-luu-tru-${period}.json`,
      data: { ...metadata, group: "archive", archiveRecords: exported.archiveRecords || [] },
    },
    {
      filename: `du-lieu-nhan-su-tai-khoan-${period}.json`,
      data: {
        ...metadata,
        group: "people-accounts",
        people: exported.people || [],
        accounts: exported.accounts || [],
        importedPeopleVersion: exported.importedPeopleVersion || "",
      },
    },
    {
      filename: `du-lieu-cong-viec-kpi-he-thong-${period}.json`,
      data: {
        ...metadata,
        group: "operations",
        tasks: exported.tasks || [],
        projectCatalog: exported.projectCatalog || [],
        evaluations: exported.evaluations || [],
        departmentEvaluations: exported.departmentEvaluations || [],
        moduleSettings: exported.moduleSettings || {},
        systemCustomization: exported.systemCustomization || {},
        departments: exported.departments || [],
        roles: exported.roles || [],
        behaviorRules: exported.behaviorRules || [],
        supportRequests: exported.supportRequests || [],
        activityLog: exported.activityLog || [],
        canBoGpmbKpiCatalogVersion: exported.canBoGpmbKpiCatalogVersion || "",
        sectionHeadKpiCatalogVersion: exported.sectionHeadKpiCatalogVersion || "",
        personalKpiClassificationVersion: exported.personalKpiClassificationVersion || "",
        deletedIds: exported.deletedIds || [],
      },
    },
  ];
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function selectedJsonExportGroups() {
  return Array.from(document.querySelectorAll("input[name='jsonExportGroup']:checked"))
    .map((input) => input.value)
    .filter((group) => SPLIT_JSON_GROUPS.has(group));
}

function updateJsonExportSelectAll() {
  const selectAll = byId("jsonExportSelectAll");
  if (!selectAll) return;
  const selectedCount = selectedJsonExportGroups().length;
  selectAll.checked = selectedCount === SPLIT_JSON_GROUPS.size;
  selectAll.indeterminate = selectedCount > 0 && selectedCount < SPLIT_JSON_GROUPS.size;
}

function openJsonExportDialog() {
  if (!isAdmin()) {
    alert("Chi tai khoan admin duoc xuat du lieu JSON.");
    return;
  }
  document.querySelectorAll("input[name='jsonExportGroup']").forEach((input) => {
    input.checked = true;
  });
  updateJsonExportSelectAll();
  openModal("jsonExportDialog");
}

function closeJsonExportDialog() {
  closeModal("jsonExportDialog");
}

async function exportSeparatedJsonData(selectedGroups = [...SPLIT_JSON_GROUPS]) {
  if (!isAdmin()) {
    alert("Chi tai khoan admin duoc xuat du lieu JSON.");
    return false;
  }
  const selected = new Set(selectedGroups.filter((group) => SPLIT_JSON_GROUPS.has(group)));
  if (!selected.size) {
    alert("Vui long chon it nhat mot nhom du lieu de xuat.");
    return false;
  }
  try {
    const exported = await stateForExport();
    splitStateForExport(exported)
      .filter(({ data }) => selected.has(data.group))
      .forEach(({ filename, data }) => downloadJsonFile(filename, data));
    return true;
  } catch (error) {
    alert(`Khong the chuan bi du lieu xuat: ${error.message}`);
    return false;
  }
}

function readUploadedJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Khong the doc tep ${file.name}.`));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "")));
      } catch {
        reject(new Error(`Tep ${file.name} khong phai JSON hop le.`));
      }
    };
    reader.readAsText(file);
  });
}

function importBundleFromJson(data, sourceName) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Tep ${sourceName} khong co cau truc du lieu hop le.`);
  }
  if (data.format === SPLIT_JSON_FORMAT) {
    const group = String(data.group || "");
    if (!SPLIT_JSON_GROUPS.has(group)) throw new Error(`Tep ${sourceName} khong thuoc nhom du lieu duoc ho tro.`);
    return { group, data };
  }
  if (Array.isArray(data.people) && Array.isArray(data.tasks) && Array.isArray(data.evaluations)) {
    return { group: "legacy", data };
  }
  throw new Error(`Tep ${sourceName} khong dung dinh dang JSON cua he thong.`);
}

function touchImportedRecords(records, timestamp) {
  if (!Array.isArray(records)) return [];
  return records.map((item) => (item && typeof item === "object" ? { ...item, updatedAt: timestamp } : item));
}

function mergeImportedRecords(localRecords, importedRecords, timestamp) {
  const recordsById = new Map();
  (Array.isArray(localRecords) ? localRecords : []).forEach((item) => {
    if (item && item.id) recordsById.set(item.id, item);
  });
  touchImportedRecords(importedRecords, timestamp).forEach((item) => {
    if (item && item.id) recordsById.set(item.id, item);
  });
  const createdAtById = new Map();
  recordsById.forEach((item, id) => {
    createdAtById.set(id, new Date(item.createdAt || item.assignedAt || 0).getTime() || 0);
  });
  return [...recordsById.values()].sort((left, right) => createdAtById.get(left.id) - createdAtById.get(right.id));
}

function requireImportArray(data, key, group) {
  if (!Array.isArray(data[key])) throw new Error(`Nhom ${group} thieu truong ${key}.`);
  return data[key];
}

function mergePeopleAndAccounts(target, data, timestamp, allowMissing = false) {
  const people = Array.isArray(data.people) ? data.people : allowMissing ? null : requireImportArray(data, "people", "people-accounts");
  const accounts = Array.isArray(data.accounts) ? data.accounts : allowMissing ? null : requireImportArray(data, "accounts", "people-accounts");
  if (people) {
    target.people = mergeImportedRecords(target.people, people, timestamp);
    // Imported personnel is authoritative and must not be replaced by the
    // bundled Excel source on another browser.
    target.importedPeopleVersion = data.importedPeopleVersion || IMPORTED_PEOPLE_VERSION;
  }
  if (accounts) target.accounts = mergeImportedRecords(target.accounts, accounts, timestamp);
}

function mergeOperations(target, data, timestamp, allowMissing = false) {
  const tasks = Array.isArray(data.tasks) ? data.tasks : allowMissing ? null : requireImportArray(data, "tasks", "operations");
  const projectCatalog = Array.isArray(data.projectCatalog) ? data.projectCatalog : null;
  const evaluations = Array.isArray(data.evaluations) ? data.evaluations : allowMissing ? null : requireImportArray(data, "evaluations", "operations");
  const departmentEvaluations = Array.isArray(data.departmentEvaluations) ? data.departmentEvaluations : allowMissing ? null : requireImportArray(data, "departmentEvaluations", "operations");
  if (tasks) target.tasks = mergeImportedRecords(target.tasks, tasks, timestamp);
  if (projectCatalog) target.projectCatalog = mergeImportedRecords(target.projectCatalog, projectCatalog, timestamp);
  if (evaluations) target.evaluations = mergeImportedRecords(target.evaluations, evaluations, timestamp);
  if (departmentEvaluations) target.departmentEvaluations = mergeImportedRecords(target.departmentEvaluations, departmentEvaluations, timestamp);
  if (data.activePeriod) target.activePeriod = data.activePeriod;
  if (data.moduleSettings) target.moduleSettings = normalizeModuleSettings(data.moduleSettings);
  if (data.systemCustomization) target.systemCustomization = normalizeSystemCustomization(data.systemCustomization);
  if (Array.isArray(data.departments)) target.departments = normalizeDepartmentsCatalog(data.departments);
  if (Array.isArray(data.roles)) target.roles = normalizeRolesCatalog(data.roles);
  if (Array.isArray(data.behaviorRules)) target.behaviorRules = normalizeBehaviorRulesCatalog(data.behaviorRules);
  if (Array.isArray(data.supportRequests)) target.supportRequests = mergeImportedRecords(target.supportRequests, data.supportRequests, timestamp);
  if (Array.isArray(data.activityLog)) target.activityLog = data.activityLog;
  if (data.canBoGpmbKpiCatalogVersion) target.canBoGpmbKpiCatalogVersion = data.canBoGpmbKpiCatalogVersion;
  if (data.sectionHeadKpiCatalogVersion) target.sectionHeadKpiCatalogVersion = data.sectionHeadKpiCatalogVersion;
  if (data.personalKpiClassificationVersion) target.personalKpiClassificationVersion = data.personalKpiClassificationVersion;
  if (Array.isArray(data.deletedIds)) target.deletedIds = data.deletedIds;
}

function mergeImportBundle(target, bundle, timestamp) {
  const { group, data } = bundle;
  if (group === "bulletins") {
    target.bulletins = mergeImportedRecords(target.bulletins, requireImportArray(data, "bulletins", group), timestamp);
    return;
  }
  if (group === "archive") {
    target.archiveRecords = mergeImportedRecords(target.archiveRecords, requireImportArray(data, "archiveRecords", group), timestamp);
    return;
  }
  if (group === "people-accounts") {
    mergePeopleAndAccounts(target, data, timestamp);
    return;
  }
  if (group === "operations") {
    mergeOperations(target, data, timestamp);
    return;
  }
  if (group !== "legacy") throw new Error("Nhom du lieu khong duoc ho tro.");

  mergePeopleAndAccounts(target, data, timestamp, true);
  mergeOperations(target, data, timestamp, true);
  if (Array.isArray(data.bulletins) && data.bulletins.length) target.bulletins = mergeImportedRecords(target.bulletins, data.bulletins, timestamp);
  if (Array.isArray(data.archiveRecords) && data.archiveRecords.length) target.archiveRecords = mergeImportedRecords(target.archiveRecords, data.archiveRecords, timestamp);
}

async function importSeparatedJsonData(files) {
  if (!isAdmin()) {
    alert("Chi tai khoan admin duoc nhap du lieu JSON.");
    return;
  }
  if (!files.length) return;
  const jsonData = await Promise.all(files.map((file) => readUploadedJsonFile(file)));
  const bundles = jsonData.map((data, index) => importBundleFromJson(data, files[index].name));
  const legacyBundle = bundles.find((bundle) => bundle.group === "legacy");
  if (legacyBundle && bundles.length !== 1) throw new Error("Tep JSON cu phai duoc nhap mot minh, khong chon kem tep da tach.");
  const groups = new Set();
  bundles.forEach((bundle) => {
    if (groups.has(bundle.group)) throw new Error(`Da chon trung nhom du lieu ${bundle.group}.`);
    groups.add(bundle.group);
  });

  const nextState = cloneStatePayload(state);
  const timestamp = new Date().toISOString();
  bundles.forEach((bundle) => mergeImportBundle(nextState, bundle, timestamp));
  Object.assign(state, normalizeStatePayload(nextState));
  applyRuntimeKpiCatalogs(state);
  migrateDepartmentTermLabels({ persist: false });
  syncPersonnelAccounts();
  // Keep one-way verifiers for every imported credential. This makes an
  // Admin's local recovery copy usable for offline account testing without
  // keeping those passwords in the synced browser state.
  scheduleLocalOfflineLoginProofCache(state.accounts);
  const localPersist = persistState();
  sharedSync.localChangeVersion += 1;
  await markSharedStateDirty();
  // Show imported records immediately. Media is moved to IndexedDB afterwards
  // so a large JSON backup does not block the whole interface.
  renderAll();
  await new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(resolve);
    else setTimeout(resolve, 0);
  });
  await Promise.all([
    migrateBulletinMediaToIndexedDb({ persist: false, render: false }),
    migrateArchiveFilesToIndexedDb({ persist: false, render: false }),
    migrateTaskAttachmentsToIndexedDb({ persist: false }),
  ]);
  await localPersist;
  await persistState();
  queueSharedStateSync();
  let syncResult = { ok: false, pending: true, reason: "offline" };
  if (sharedSync.session && (sharedSync.available === true || (await probeSharedSync({ force: true })))) {
    syncResult = await flushSharedStateSync();
  }
  renderAll();
  if (syncResult.ok && !(syncResult.fileWarnings || []).length) {
    alert("Da nhap JSON va dong bo du lieu len may chu thanh cong.");
    return;
  }
  if (syncResult.ok) {
    alert(`Da nhap va dong bo du lieu thanh cong, tru ${syncResult.fileWarnings.length} tep vuot gioi han 10MB cua may chu. Cac tep nay van duoc giu tren thiet bi nhap va duoc danh dau can xu ly.`);
    return;
  }
  alert("Da nhap va luu du lieu tren thiet bi. Dong bo may chu chua hoan tat; he thong se tu dong thu lai khi ket noi on dinh. Khong nen tai JSON moi de tranh ghi de ban dang cho dong bo.");
}

byId("jsonExportSelectAll").addEventListener("change", (event) => {
  const checked = event.target.checked;
  document.querySelectorAll("input[name='jsonExportGroup']").forEach((input) => {
    input.checked = checked;
  });
  event.target.indeterminate = false;
});

document.querySelectorAll("input[name='jsonExportGroup']").forEach((input) => {
  input.addEventListener("change", updateJsonExportSelectAll);
});

byId("jsonExportForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const exported = await exportSeparatedJsonData(selectedJsonExportGroups());
  if (exported) closeJsonExportDialog();
});

byId("cancelJsonExport").addEventListener("click", closeJsonExportDialog);

byId("jsonExportDialog").addEventListener("click", (event) => {
  if (event.target === byId("jsonExportDialog")) closeJsonExportDialog();
});

byId("exportData").textContent = "Xu\u1ea5t JSON";
byId("exportData").title = "Ch\u1ecdn nh\u00f3m d\u1eef li\u1ec7u c\u1ea7n xu\u1ea5t";

byId("exportData").addEventListener("click", async () => {
  return openJsonExportDialog();
  if (!isAdmin()) {
    alert("Chỉ tài khoản admin được xuất dữ liệu JSON.");
    return;
  }
  let exported;
  try {
    exported = await stateForExport();
  } catch (error) {
    alert(`Không thể chuẩn bị dữ liệu xuất: ${error.message}`);
    return;
  }
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `du-lieu-kpi-phuc-thinh-${state.activePeriod}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

byId("importData").addEventListener("change", (event) => {
  const selectedFiles = Array.from(event.target.files || []);
  event.target.value = "";
  return importSeparatedJsonData(selectedFiles).catch((error) => {
    alert(`Khong the nhap du lieu: ${error.message}`);
  });
  if (!isAdmin()) {
    event.target.value = "";
    alert("Chỉ tài khoản admin được nhập dữ liệu JSON.");
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.people) || !Array.isArray(imported.tasks) || !Array.isArray(imported.evaluations)) {
        throw new Error("Sai cấu trúc dữ liệu JSON");
      }

      const nowTimestamp = new Date().toISOString();

      // 🔥 Ép mốc updatedAt mới nhất cho toàn bộ dữ liệu Import
      const touchUpdatedAt = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => (item && typeof item === 'object') ? { ...item, updatedAt: nowTimestamp } : item);
      };

      imported.people = touchUpdatedAt(imported.people);
      imported.tasks = touchUpdatedAt(imported.tasks);
      imported.evaluations = touchUpdatedAt(imported.evaluations);
      imported.accounts = touchUpdatedAt(imported.accounts);
      imported.bulletins = touchUpdatedAt(imported.bulletins);
      imported.archiveRecords = touchUpdatedAt(imported.archiveRecords);
      imported.departmentEvaluations = touchUpdatedAt(imported.departmentEvaluations);

      state.activePeriod = imported.activePeriod || currentMonth();

      const combineAndSort = (localArr, importedArr) => {
        const map = new Map();
        (localArr || []).forEach(item => { if (item?.id) map.set(item.id, item); });
        (importedArr || []).forEach(item => { if (item?.id) map.set(item.id, item); });
        
        const list = Array.from(map.values());
        const timeCache = new Map();
        list.forEach(item => {
          timeCache.set(item.id, new Date(item.createdAt || item.assignedAt || 0).getTime() || 0);
        });
        return list.sort((a, b) => timeCache.get(a.id) - timeCache.get(b.id));
      };

      state.people = combineAndSort(state.people, imported.people);
      state.tasks = combineAndSort(state.tasks, imported.tasks); 
      state.evaluations = combineAndSort(state.evaluations, imported.evaluations);
      
      const mergedAccounts = combineAndSort(state.accounts, imported.accounts);
      state.accounts = mergedAccounts;

      if (imported.bulletins?.length) state.bulletins = combineAndSort(state.bulletins, imported.bulletins);
      if (imported.archiveRecords?.length) state.archiveRecords = combineAndSort(state.archiveRecords, imported.archiveRecords);
      if (imported.departmentEvaluations?.length) state.departmentEvaluations = combineAndSort(state.departmentEvaluations, imported.departmentEvaluations);

      if (imported.moduleSettings) state.moduleSettings = normalizeModuleSettings(imported.moduleSettings);
      if (imported.systemCustomization) state.systemCustomization = normalizeSystemCustomization(imported.systemCustomization);
      if (imported.activityLog) state.activityLog = Array.isArray(imported.activityLog) ? imported.activityLog : [];

      migrateDepartmentTermLabels({ persist: false });
      syncPersonnelAccounts();

      // Cất media vào IndexedDB dưới máy Admin
      await migrateBulletinMediaToIndexedDb();
      await migrateArchiveFilesToIndexedDb();
      await migrateTaskAttachmentsToIndexedDb();
      
      persistState();
      sharedSync.localChangeVersion += 1;
      queueSharedStateSync();
      if (sharedSync.session && sharedSync.available) await flushSharedStateSync();
      
      renderAll();
      alert("Đã gộp dữ liệu thành công và đồng bộ theo phiên đăng nhập hiện tại.");

    } catch (error) {
      alert(`Không thể nhập dữ liệu: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});


window.addEventListener("resize", () => {
  if (document.querySelector(".view.is-active")?.id !== "bulletin" || bulletinResizeRefreshQueued) return;
  bulletinResizeRefreshQueued = true;
  requestAnimationFrame(() => {
    bulletinResizeRefreshQueued = false;
    renderBulletinBoard();
  });
});

// Khởi tạo các cấu hình giao diện ban đầu khi tải trang
renderDepartmentAndRoleOptions();
resetBulletinForm();
resetArchiveForm();
applySidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
renderAll();
requestDurableBrowserStorage();
migrateBulletinMediaToIndexedDb();
migrateArchiveFilesToIndexedDb();
migrateTaskAttachmentsToIndexedDb();

// =========================================================================
// ⏳ KÍCH HOẠT CHU KỲ ĐỒNG BỘ NỀN SUPABASE STORAGE DIRECT (8 GIÂY/LẦN)
// =========================================================================

// Register the static application shell only.
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    registerPwaForUpdates();
  });
}
// 🌟 TỰ ĐỘNG GHI NHỚ VỊ TRÍ CUỘN CHUỘT TRƯỚC KHI F5
window.addEventListener("beforeunload", () => {
  localStorage.setItem("phuc-thinh-scroll-y", window.scrollY);
});

// 🌟 KHÔI PHỤC VỊ TRÍ CUỘN CHUỘT SAU KHI GIAO DIỆN VẼ XONG
setTimeout(() => {
  const savedScrollY = localStorage.getItem("phuc-thinh-scroll-y");
  if (savedScrollY) {
    window.scrollTo(0, parseInt(savedScrollY, 10));
  }
}, 200); // Trì hoãn 200ms chờ hệ thống vẽ xong việc là cuộn xuống ngay
// =========================================================================
// 🌟 XỬ LÝ ĐÓNG / MỞ MENU TRƯỢT MOBILE KIỂU FACEBOOK
// =========================================================================
document.addEventListener("click", (event) => {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  // 1. Bấm nút Mở / Đóng Menu
  const toggleBtn = event.target.closest("#sidebarToggle");
  if (toggleBtn) {
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.toggle("mobile-menu-open");
    return;
  }

  // 2. Bấm vào bất kỳ mục chuyển Tab nào -> Tự động đóng Menu trượt
  const navItem = event.target.closest(".nav-item");
  if (navItem) {
    document.body.classList.remove("mobile-menu-open");
    return;
  }

  // 3. Bấm ra ngoài khoảng tối màn hình -> Tự động đóng Menu
  if (document.body.classList.contains("mobile-menu-open") && !event.target.closest(".sidebar")) {
    document.body.classList.remove("mobile-menu-open");
  }
});
// =========================================================================
// 📱 BỘ ĐIỀU KHIỂN GIAO DIỆN MOBILE CHUẨN APP FACEBOOK
// =========================================================================
document.addEventListener("click", (event) => {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  // 1. Bấm nút "Menu ☰" ở đáy màn hình -> Bật trang Menu Lối tắt (Ảnh 2)
  if (event.target.closest("#openMobileMenuBtn")) {
    event.preventDefault();
    document.body.classList.add("mobile-menu-open");
    return;
  }

  // 2. Chuyển Tab từ Bottom Nav hoặc từ Trang Menu -> Đổi View & Cập nhật Active Icon
  const navBtn = event.target.closest("[data-view]");
  if (navBtn) {
    const viewId = navBtn.dataset.view;
    if (!canAccessView(viewId)) {
      event.preventDefault();
      return;
    }

    // Available immediately, including when the offline bootstrapper loads this script after DOMContentLoaded.
    event.preventDefault();
    switchView(viewId);
    
    // Cập nhật trạng thái Active nút Bottom Nav
    document.querySelectorAll(".bottom-nav-item").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.view === viewId);
    });

    // Tự động đóng trang Menu sau khi chọn chức năng
    document.body.classList.remove("mobile-menu-open");
  }
});
/* =========================================================================
   📱 KẾT NỐI DỮ LIỆU & CHUYỂN TAB MƯỢT MÀ CHO THANH BOTTOM NAV (MOBILE)
   ========================================================================= */

runWhenDocumentReady(function() {
  // 1. Quét tất cả nút điều hướng Mobile (Thanh đáy + Popup Menu)
  const mobileNavButtons = document.querySelectorAll('.mobile-bottom-nav [data-view], #mobileMenuPopup [data-view]');
  const popupMenu = document.getElementById('mobileMenuPopup');

  mobileNavButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const viewId = this.getAttribute('data-view');
      if (!viewId || !canAccessView(viewId)) return;

      // Use the same permission-aware navigation path as the main sidebar.
      switchView(viewId);

      // 3. Đổi trạng thái "sáng đèn" (is-active) cho 4 nút dưới thanh đáy Mobile
      document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item').forEach(navBtn => {
        if (navBtn.getAttribute('data-view') === viewId) {
          navBtn.classList.add('is-active');
        } else {
          navBtn.classList.remove('is-active');
        }
      });

      // 4. Nếu bấm từ trong Popup Menu -> Tự động khép Popup lại
      if (popupMenu) {
        popupMenu.classList.remove('is-active');
      }
    });
  });
});
/* =========================================================================
   📱 LOGIC DỮ LIỆU & ĐĂNG XUẤT CHO POPUP MENU MOBILE
   ========================================================================= */

runWhenDocumentReady(function() {
  const openBtn = document.getElementById('openMobileMenuBtn');
  const closeBtn = document.getElementById('closeMobileMenuBtn');
  const popup = document.getElementById('mobileMenuPopup');
  const logoutBtn = document.getElementById('mobileLogoutBtn');

  // 1. Đồng bộ thông tin Tên + Chức vụ vào Popup mỗi khi mở Menu
  function syncUserProfile() {
    const mainUserLabel = document.getElementById('currentUserLabel');
    const mainUserMeta = document.getElementById('currentUserMeta');
    const mobileUserLabel = document.getElementById('mobileUserLabel');
    const mobileUserMeta = document.getElementById('mobileUserMeta');

    if (mainUserLabel && mobileUserLabel) {
      mobileUserLabel.textContent = mainUserLabel.textContent || "Tài khoản";
    }
    if (mainUserMeta && mobileUserMeta) {
      mobileUserMeta.textContent = mainUserMeta.textContent || "";
    }
  }

  // 2. Mở / Đóng Popup Menu
  if (openBtn && popup) {
    openBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      syncUserProfile();
      popup.classList.toggle('is-active');
    });
  }

  if (closeBtn && popup) {
    closeBtn.addEventListener('click', () => popup.classList.remove('is-active'));
  }

  // 3. Xử lý bấm Đăng xuất từ Popup Mobile
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      const mainLogoutBtn = document.getElementById('logoutButton');
      if (mainLogoutBtn) {
        mainLogoutBtn.click(); // Gọi hàm Đăng xuất gốc của hệ thống
      } else {
        logoutSharedSession();
        localStorage.removeItem(SESSION_KEY);
        renderAll();
      }
    });
  }
});
/* =========================================================================
   📱 BẤM VÀO TÊN NHÂN SỰ ĐỂ MỞ POPUP XEM TOÀN BỘ THÔNG TIN CHI TIẾT
   ========================================================================= */

runWhenDocumentReady(function() {
  const peopleTable = document.getElementById('peopleTable');
  const dialog = document.getElementById('personDetailDialog');
  const closeBtn = document.getElementById('closePersonDetail');
  const detailName = document.getElementById('personDetailName');
  const detailContent = document.getElementById('personDetailContent');

  if (!peopleTable || !dialog) return;
  return; // Replaced by the state-backed detail dialog below.

  // Lắng nghe cú bấm vào bất kỳ dòng nào trong bảng Nhân sự
  peopleTable.addEventListener('click', function(e) {
    const row = e.target.closest('tr');
    if (!row || row.querySelector('td.empty-cell')) return;

    // Lấy tất cả dữ liệu từ các ô trong hàng
    const tds = row.querySelectorAll('td');
    if (tds.length < 4) return;

    // Đọc thông tin từ dòng
    const nameText = tds[0]?.childNodes[0]?.textContent?.trim() || tds[0]?.textContent?.trim();
    const phoneText = tds[0]?.querySelector('small, .muted')?.textContent?.trim() || 'Chưa cập nhật';
    const genderText = tds[1]?.textContent?.trim() || 'Chưa cập nhật';
    const deptText = tds[2]?.textContent?.trim() || 'Chưa chọn';
    const roleText = tds[3]?.textContent?.trim() || 'Chưa chọn';
    const qualText = tds[4]?.textContent?.trim() || 'Chưa cập nhật';
    const birthText = tds[5]?.textContent?.trim() || 'Chưa cập nhật';
    const addressText = tds[6]?.textContent?.trim() || 'Chưa cập nhật';
    const contractText = tds[7]?.textContent?.trim() || 'Chưa cập nhật';
    const salaryText = tds[8]?.textContent?.trim() || 'Chưa cập nhật';
    const kpiText = tds[9]?.textContent?.trim() || 'Chưa có';

    // Cập nhật thông tin vào Popup
    if (detailName) detailName.textContent = nameText;
    
    if (detailContent) {
      detailContent.innerHTML = `
        <div class="person-detail-item"><span>Điện thoại</span><strong>${phoneText}</strong></div>
        <div class="person-detail-item"><span>Giới tính</span><strong>${genderText}</strong></div>
        <div class="person-detail-item"><span>Phòng ban</span><strong>${deptText}</strong></div>
        <div class="person-detail-item"><span>Chức vụ</span><strong>${roleText}</strong></div>
        <div class="person-detail-item"><span>Trình độ chuyên môn</span><strong>${qualText}</strong></div>
        <div class="person-detail-item"><span>Ngày sinh</span><strong>${birthText}</strong></div>
        <div class="person-detail-item"><span>Loại hợp đồng</span><strong>${contractText}</strong></div>
        <div class="person-detail-item"><span>Hệ số / Bậc lương</span><strong>${salaryText}</strong></div>
        <div class="person-detail-item"><span>KPI kỳ này</span><strong>${kpiText}</strong></div>
        <div class="person-detail-item full-width"><span>Địa chỉ cư trú</span><strong>${addressText}</strong></div>
      `;
    }

    // Hiển thị Popup
    dialog.classList.remove('is-hidden');
    dialog.setAttribute('aria-hidden', 'false');
  });

  // Đóng Popup
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      dialog.classList.add('is-hidden');
      dialog.setAttribute('aria-hidden', 'true');
    });
  }

  // Chạm ra ngoài vùng xám để đóng Popup
  dialog.addEventListener('click', function(e) {
    if (e.target === dialog) {
      dialog.classList.add('is-hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
  });
});

runWhenDocumentReady(() => {
  const peopleTable = byId("peopleTable");
  const dialog = byId("personDetailDialog");
  const detailName = byId("personDetailName");
  const detailMeta = byId("personDetailMeta");
  const detailContent = byId("personDetailContent");
  const editButton = byId("editPersonDetail");
  const deleteButton = byId("deletePersonDetail");
  const closeButton = byId("closePersonDetail");
  if (!peopleTable || !dialog || !detailContent) return;

  const detailValue = (label, value, wide = false) => `
    <div class="person-detail-field${wide ? " person-detail-field-wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Chưa cập nhật")}</strong>
    </div>
  `;
  const detailSection = (title, content, wide = false) => `
    <section class="person-detail-section${wide ? " person-detail-section-wide" : ""}">
      <h3>${escapeHtml(title)}</h3>
      <div class="person-detail-fields">${content}</div>
    </section>
  `;
  const closePersonDetail = () => {
    // Return the shared form before hiding the dialog so the main Personnel screen remains usable.
    restorePersonDetailInlineEditor({ reset: true });
    dialog.classList.add("is-hidden");
    dialog.setAttribute("aria-hidden", "true");
    delete dialog.dataset.personId;
  };
  const populatePersonForm = (person) => {
    byId("personId").value = person.id;
    byId("personName").value = person.name || "";
    byId("personGender").value = person.gender || "";
    byId("personDepartment").value = person.departmentId || "";
    updateRoleOptions(person.roleId);
    updatePersonSectionHeadOptions(person.sectionHeadId);
    byId("personContract").value = person.contract || "";
    byId("personQualification").value = person.qualification || "";
    byId("personContractTerm").value = person.contractTerm || "";
    byId("personContractSignedDate").value = person.contractSignedDate || "";
    byId("personPhone").value = person.phone || "";
    byId("personBirthDate").value = person.birthDate || "";
    byId("personSalaryCoefficient").value = person.salaryCoefficient || "";
    byId("personSalaryGrade").value = person.salaryGrade || "";
    byId("personSalaryReviewDate").value = person.salaryReviewDate || "";
    byId("personAddress").value = person.address || "";
    byId("personNote").value = person.note || "";
    renderCustomFieldsForScope("people");
    applyFieldCustomizations();
    focusEditForm("personForm", "personName");
  };
  const restorePersonDetailInlineEditor = ({ reset = false } = {}) => {
    if (!personDetailInlineEditor) return;
    const { form, anchor } = personDetailInlineEditor;
    if (anchor?.parentNode) {
      anchor.parentNode.insertBefore(form, anchor.nextSibling);
      anchor.remove();
    }
    form.classList.remove("person-detail-inline-form");
    personDetailInlineEditor = null;
    if (reset) resetPersonForm();
    editButton.textContent = "Sửa hồ sơ";
    closeButton.textContent = "×";
    closeButton.classList.remove("person-detail-cancel");
    closeButton.title = "Đóng";
    closeButton.setAttribute("aria-label", "Đóng hồ sơ chi tiết");
  };
  const openPersonDetailInlineEditor = (person) => {
    if (!person || !canEditPeople()) return;
    restorePersonDetailInlineEditor({ reset: true });
    const form = byId("personForm");
    const anchor = document.createElement("span");
    anchor.className = "person-detail-form-anchor";
    form.parentNode.insertBefore(anchor, form);
    personDetailInlineEditor = { personId: person.id, form, anchor };
    detailName.textContent = person.name || "Hồ sơ nhân sự";
    detailMeta.textContent = "Chỉnh sửa trực tiếp trong màn hình hồ sơ chi tiết.";
    detailContent.className = "person-detail-editor";
    detailContent.innerHTML = '<section><h3>Chỉnh sửa hồ sơ</h3><div id="personDetailEditorSlot"></div></section>';
    byId("personDetailEditorSlot").append(form);
    form.classList.add("person-detail-inline-form");
    editButton.classList.add("is-hidden");
    deleteButton.classList.add("is-hidden");
    closeButton.textContent = "Hủy";
    closeButton.classList.add("person-detail-cancel");
    closeButton.title = "Hủy chỉnh sửa";
    closeButton.setAttribute("aria-label", "Hủy chỉnh sửa hồ sơ");
    populatePersonForm(person);
  };
  const deletePerson = (person) => {
    if (!canEditPeople()) return;
    if (!confirm("Xóa nhân sự này? Công việc và đánh giá liên quan vẫn được giữ để tra cứu.")) return;
    registerDeletedId(person.id);
    state.people = state.people.filter((item) => item.id !== person.id);
    normalizeSectionHeadManagementLinks();
    recalculateSavedPersonalEvaluationScores();
    logActivity({
      action: "Xóa",
      module: "Nhân sự",
      targetType: "person",
      targetId: person.id,
      personId: person.id,
      departmentId: person.departmentId || "",
      title: person.name || "Nhân sự đã xóa",
      details: departmentById(person.departmentId)?.name || "",
    });
    closePersonDetail();
    saveState();
    renderAll();
  };
  const openPersonDetail = (personId) => {
    restorePersonDetailInlineEditor({ reset: true });
    const person = personById(personId);
    if (!person) return;
    const department = departmentById(person.departmentId)?.name || "Chưa cập nhật";
    const role = roleById(person.roleId)?.name || "Chưa cập nhật";
    const evaluation = personalEvaluationSnapshot(person.id, state.activePeriod);
    const account = state.accounts.find((item) => item.personId === person.id);
    const sectionHead = sectionHeadForPerson(person);
    const managedMembers = isSectionHeadPerson(person) ? managedTeamMembers(person.id) : [];
    const managementLabel = isSectionHeadPerson(person)
      ? managedMembers.length
        ? `${managedMembers.length} nhân sự: ${managedMembers.map((member) => member.name).join(", ")}`
        : "Chưa phân nhóm nhân sự"
      : sectionHead?.name || "Không phân nhóm quản lý";
    const salary = [
      person.salaryCoefficient ? `Hệ số ${person.salaryCoefficient}` : "",
      person.salaryGrade ? `Bậc ${person.salaryGrade}` : "",
    ].filter(Boolean).join(" · ");
    const kpi = evaluation
      ? `${formatScore(evaluation.finalScore)} điểm · ${evaluation.grade}`
      : "Chưa có kết quả KPI trong kỳ";

    detailName.textContent = person.name || "Hồ sơ nhân sự";
    detailMeta.textContent = `${department} · ${role}`;
    detailContent.className = "person-detail-grid";
    detailContent.innerHTML = [
      detailSection("Thông tin cá nhân", [
        detailValue("Giới tính", person.gender),
        detailValue("Ngày sinh", formatDate(person.birthDate)),
        detailValue("Điện thoại", person.phone),
        detailValue("Địa chỉ cư trú", person.address, true),
      ].join("")),
      detailSection("Công tác", [
        detailValue("Phòng", department),
        detailValue("Vị trí", role),
        detailValue(isSectionHeadPerson(person) ? "Nhóm nhân sự quản lý" : "Trưởng bộ phận/Trưởng nhóm quản lý", managementLabel, true),
        detailValue("Trình độ chuyên môn", person.qualification, true),
        detailValue("KPI kỳ này", kpi, true),
      ].join("")),
      detailSection("Hợp đồng và lương", [
        detailValue("Loại hợp đồng", person.contract),
        detailValue("Ngày ký hợp đồng", formatDate(person.contractSignedDate)),
        detailValue("Thời hạn hợp đồng", person.contractTerm, true),
        detailValue("Hệ số / bậc lương", salary),
        detailValue("Thời điểm xét nâng lương", formatDate(person.salaryReviewDate)),
      ].join("")),
      detailSection("Tài khoản hệ thống", [
        detailValue("Tên đăng nhập", account?.username || "Chưa liên kết"),
        detailValue("Vai trò", account ? accountRoleLabels[account.role] || account.role : "Chưa liên kết"),
      ].join("")),
      person.note
        ? detailSection("Ghi chú", detailValue("Thông tin bổ sung", person.note, true), true)
        : "",
    ].join("");

    dialog.dataset.personId = person.id;
    const canManage = canEditPeople();
    editButton.classList.toggle("is-hidden", !canManage);
    deleteButton.classList.toggle("is-hidden", !canManage);
    dialog.classList.remove("is-hidden");
    dialog.setAttribute("aria-hidden", "false");
    closeButton.focus({ preventScroll: true });
  };

  peopleTable.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, select, textarea, label")) return;
    const personId = event.target.closest("tr[data-person-id]")?.dataset.personId;
    if (personId) openPersonDetail(personId);
  });
  editButton.addEventListener("click", () => {
    const person = personById(dialog.dataset.personId);
    if (!person || !canEditPeople()) return;
    openPersonDetailInlineEditor(person);
  });
  deleteButton.addEventListener("click", () => {
    const person = personById(dialog.dataset.personId);
    if (person) deletePerson(person);
  });
  closeButton.addEventListener("click", closePersonDetail);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePersonDetail();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.classList.contains("is-hidden")) closePersonDetail();
  });
  document.addEventListener("person-record-saved", (event) => {
    const personId = event.detail?.personId;
    if (!personId || personDetailInlineEditor?.personId !== personId) return;
    restorePersonDetailInlineEditor();
    openPersonDetail(personId);
  });
});
/* =========================================================================
   ⚡ FIX LỖI BẤM MENU MOBILE (DÙNG ONCLICK TRỰC TIẾP CHỐNG XUNG ĐỘT)
   ========================================================================= */

runWhenDocumentReady(function() {
  const openBtn = document.getElementById('openMobileMenuBtn');
  const closeBtn = document.getElementById('closeMobileMenuBtn');
  const popup = document.getElementById('mobileMenuPopup');

  if (openBtn && popup) {
    // Ghi đè trực tiếp sự kiện click, ngăn chặn mọi xung đột chồng chéo
    openBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation(); // Chặn sự kiện lan ra ngoài làm đóng menu

      // Đồng bộ thông tin người dùng đang đăng nhập
      const mainUserLabel = document.getElementById('currentUserLabel');
      const mainUserMeta = document.getElementById('currentUserMeta');
      const mobileUserLabel = document.getElementById('mobileUserLabel');
      const mobileUserMeta = document.getElementById('mobileUserMeta');

      if (mainUserLabel && mobileUserLabel) mobileUserLabel.textContent = mainUserLabel.textContent || "Tài khoản";
      if (mainUserMeta && mobileUserMeta) mobileUserMeta.textContent = mainUserMeta.textContent || "";

      // Bật / Tắt Popup Menu
      popup.classList.toggle('is-active');
    };
  }

  if (closeBtn && popup) {
    closeBtn.onclick = function(e) {
      e.preventDefault();
      popup.classList.remove('is-active');
    };
  }

  // Bấm chạm ra ngoài vùng Popup thì mới đóng Menu
  document.addEventListener('click', function(e) {
    if (popup && popup.classList.contains('is-active')) {
      if (!popup.contains(e.target) && openBtn && !openBtn.contains(e.target)) {
        popup.classList.remove('is-active');
      }
    }
  });
});
/* =========================================================================
   📱 LOGIC DỮ LIỆU & ĐĂNG XUẤT CHO POPUP MENU MOBILE
   ========================================================================= */

runWhenDocumentReady(function() {
  const openBtn = document.getElementById('openMobileMenuBtn');
  const closeBtn = document.getElementById('closeMobileMenuBtn');
  const popup = document.getElementById('mobileMenuPopup');
  const logoutBtn = document.getElementById('mobileLogoutBtn');

  // 1. Đồng bộ thông tin Tên + Chức vụ vào Popup mỗi khi mở Menu
  function syncUserProfile() {
    const mainUserLabel = document.getElementById('currentUserLabel');
    const mainUserMeta = document.getElementById('currentUserMeta');
    const mobileUserLabel = document.getElementById('mobileUserLabel');
    const mobileUserMeta = document.getElementById('mobileUserMeta');

    if (mainUserLabel && mobileUserLabel) {
      mobileUserLabel.textContent = mainUserLabel.textContent || "Tài khoản";
    }
    if (mainUserMeta && mobileUserMeta) {
      mobileUserMeta.textContent = mainUserMeta.textContent || "";
    }
  }

  // 2. Mở / Đóng Popup Menu
  if (openBtn && popup) {
    openBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      syncUserProfile();
      popup.classList.toggle('is-active');
    });
  }

  if (closeBtn && popup) {
    closeBtn.addEventListener('click', () => popup.classList.remove('is-active'));
  }

  // 3. Xử lý bấm Đăng xuất từ Popup Mobile
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      const mainLogoutBtn = document.getElementById('logoutButton');
      if (mainLogoutBtn) {
        mainLogoutBtn.click(); // Gọi hàm Đăng xuất gốc của hệ thống
      } else {
        logoutSharedSession();
        localStorage.removeItem(SESSION_KEY);
        renderAll();
      }
    });
  }
});

// Keep the mobile navigation available without permanently covering the
// working area. It returns as soon as the user scrolls up or interacts with it.
let mobileBottomNavLastScrollY = 0;
let mobileBottomNavScrollFrame = 0;

function setMobileBottomNavHidden(hidden) {
  if (window.innerWidth > 768) {
    document.body.classList.remove("mobile-bottom-nav-hidden");
    return;
  }
  document.body.classList.toggle("mobile-bottom-nav-hidden", Boolean(hidden));
}

function updateMobileBottomNavOnScroll() {
  mobileBottomNavScrollFrame = 0;
  if (window.innerWidth > 768) {
    setMobileBottomNavHidden(false);
    return;
  }
  const scrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
  const delta = scrollY - mobileBottomNavLastScrollY;
  const modalOpen = Boolean(document.querySelector(".modal-backdrop:not(.is-hidden)"));
  if (modalOpen || document.body.classList.contains("mobile-menu-open") || scrollY < 28 || delta < -8) {
    setMobileBottomNavHidden(false);
  } else if (scrollY > 84 && delta > 8) {
    setMobileBottomNavHidden(true);
  }
  mobileBottomNavLastScrollY = scrollY;
}

function queueMobileBottomNavScrollUpdate() {
  if (mobileBottomNavScrollFrame) return;
  mobileBottomNavScrollFrame = window.requestAnimationFrame(updateMobileBottomNavOnScroll);
}

window.addEventListener("scroll", queueMobileBottomNavScrollUpdate, { passive: true });
window.addEventListener("resize", () => {
  mobileBottomNavLastScrollY = Math.max(0, window.scrollY || 0);
  setMobileBottomNavHidden(false);
});
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".mobile-bottom-nav, #mobileMenuPopup")) setMobileBottomNavHidden(false);
});
document.addEventListener("focusin", (event) => {
  if (window.innerWidth <= 768 && event.target.matches("input, textarea, select")) setMobileBottomNavHidden(true);
});
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    mobileBottomNavLastScrollY = Math.max(0, window.scrollY || 0);
    updateMobileBottomNavOnScroll();
  });
} else {
  mobileBottomNavLastScrollY = Math.max(0, window.scrollY || 0);
  updateMobileBottomNavOnScroll();
}



// Secure cloud synchronization retained from the production baseline.
if (!window.__phucThinhSecureSyncBooted) {
  window.__phucThinhSecureSyncBooted = true;
  const resumeSharedSync = () => {
    refreshSharedState();
    scheduleSharedStateRefresh({ immediate: true });
  };
  window.addEventListener("focus", resumeSharedSync);
  window.addEventListener("online", resumeSharedSync);
  restoreSharedSession();
}
