const STORAGE_KEY = "phuc-thinh-workforce-kpi-v1";
const SESSION_KEY = "phuc-thinh-current-account-v1";
const SIDEBAR_COLLAPSED_KEY = "phuc-thinh-sidebar-collapsed-v1";
const CUSTOMIZE_MODE_KEY = "phuc-thinh-customize-mode-v1";
const CUSTOMIZATION_LAYOUT_RESTORE_KEY = "phuc-thinh-custom-layout-restore-v159";
const BINARY_STORAGE_DB = "phuc-thinh-kpi-binary-v1";
const BINARY_STORAGE_STORE = "files";

// =========================================================================
// 🌐 CẤU HÌNH ĐỒNG BỘ ĐÁM MÂY SUPABASE STORAGE (KHỚP VỚI BUCKET BACKUP_DATA)
// =========================================================================
function getSyncFlags() {
    if (!window.supabaseSyncFlags) {
        window.supabaseSyncFlags = { isSyncing: false, lastCloudData: "" };
    }
    return window.supabaseSyncFlags;
}

function getSupabaseConfig() {
    const rawConfig = window.PHUC_THINH_SUPABASE || {};
    return {
        url: String(rawConfig.projectUrl || "").trim().replace(/\/$/, ""),
        key: String(rawConfig.publishableKey || rawConfig.anonKey || "").trim()
    };
}

function getSupabaseClient() {
    if (!window.supabase) {
        console.error("❌ Không tìm thấy thư viện Supabase! Hãy kiểm tra lại file index.html.");
        return null;
    }
    if (!window.supabaseClientInstance) {
        const config = getSupabaseConfig();
        window.supabaseClientInstance = window.supabase.createClient(config.url, config.key);
    }
    return window.supabaseClientInstance;
}
// 🌟 Hàm hoãn thực thi (Debounce) giúp gõ phím siêu mượt, không bị đơ giao diện
function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const IMPORTED_PEOPLE_VERSION = "excel-2026-05-07-v1";
const CAN_BO_GPMB_KPI_CATALOG_VERSION = "2026-07-13-v1";
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

const departments = [
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
];

const roles = [
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
    name: "Cán bộ GPMB",
    criteria: [
      ["Điều tra, kiểm đếm đất đai / Trích đo, quy chủ", 20],
      ["Xác minh nguồn gốc / Thông báo thu hồi đất", 30],
      ["Lập / Thẩm định / Phê duyệt phương án bồi thường", 30],
      ["Niêm yết công khai / Đối thoại / Lấy ý kiến", 10],
      ["Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư", 10],
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
];

departments.forEach((department) => {
  roles.push(
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
      criteria: [
        ["Hoàn thành kế hoạch bộ phận", 25],
        ["Phân công và kiểm soát tiến độ nhóm", 20],
        ["Chất lượng hồ sơ, công việc phụ trách", 15],
        ["Báo cáo, cập nhật dữ liệu đúng hạn", 15],
        ["Phối hợp nội bộ", 15],
        ["Tinh thần trách nhiệm", 10],
      ],
    },
  );
});

const behaviorRules = [
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
  { id: "tasks", label: "Công việc", note: "Danh mục công việc, giao việc, hồ sơ và tiến độ." },
  { id: "department-evaluations", label: "KPI phòng", note: "Dữ liệu hoạt động và chấm điểm KPI cấp phòng." },
  { id: "evaluations", label: "KPI cá nhân", note: "Chấm điểm KPI cá nhân và kết quả thi đua tháng." },
  { id: "history", label: "Lịch sử", note: "Dòng thời gian hoạt động của phòng ban và nhân viên." },
  { id: "accounts", label: "Tài khoản", note: "Quản lý tài khoản và cấu hình sử dụng hệ thống." },
  { id: "rules", label: "Quy chế", note: "Quy chế thi đua, khen thưởng và cách tính KPI." },
];

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
  return [
    {
      id: "account-admin",
      username: "admin",
      password: "123456",
      displayName: "Admin tổng hợp",
      role: "admin",
      personId: "",
      departmentId: "",
    },
    {
      id: "account-director",
      username: "giamdoc",
      password: "123456",
      displayName: "Giám đốc",
      role: "director",
      personId: "",
      departmentId: "",
    },
    {
      id: "account-deputy-1",
      username: "phogiamdoc1",
      password: "123456",
      displayName: "Phó giám đốc 1",
      role: "director",
      personId: "",
      departmentId: "",
    },
    {
      id: "account-deputy-2",
      username: "phogiamdoc2",
      password: "123456",
      displayName: "Phó giám đốc 2",
      role: "director",
      personId: "",
      departmentId: "",
    },
    {
      id: "account-deputy-3",
      username: "phogiamdoc3",
      password: "123456",
      displayName: "Phó giám đốc 3",
      role: "director",
      personId: "",
      departmentId: "",
    },
  ];
}

function ensureDefaultAccounts(accounts) {
  const merged = Array.isArray(accounts) ? [...accounts] : [];
  defaultAccounts().forEach((account) => {
    if (!merged.some((item) => item.username === account.username)) {
      merged.push(account);
    }
  });
  return merged;
}

function accountRoleForPerson(person) {
  const roleId = person?.roleId || "";
  if (roleId.startsWith("truong-phong-")) return "manager";
  if (roleId.startsWith("pho-phong-")) return "deputy_manager";
  if (roleId.startsWith("truong-bo-phan-")) return "section_head";
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

function createPersonnelAccount(person, accounts) {
  const timestamp = new Date().toISOString();
  return {
    id: `account-person-${person.id}`,
    username: uniqueUsernameForPerson(person, accounts),
    password: "123456",
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

    // 1. Tìm tài khoản hiện có khớp Tên đăng nhập hoặc Tên hiển thị
    let matchingAccount = state.accounts.find((acc) => {
      const accUser = String(acc.username || "").toLowerCase();
      const accName = normalizeSearchText(acc.displayName);
      return (accUser === expectedUsername || accName === personNameNorm) && (!acc.personId || acc.personId === person.id);
    });

    if (matchingAccount) {
      // Nếu đã có tài khoản -> Cập nhật nối personId và departmentId
      if (matchingAccount.personId !== person.id || matchingAccount.departmentId !== (person.departmentId || "")) {
        matchingAccount.personId = person.id;
        matchingAccount.departmentId = person.departmentId || "";
        matchingAccount.role = accountRoleForPerson(person);
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

function defaultModuleRoleSettings() {
  return Object.fromEntries(moduleAccessRoles.map((role) => [role, true]));
}

function defaultModuleSettings() {
  return Object.fromEntries(systemModules.map((module) => [module.id, { enabled: true, roles: defaultModuleRoleSettings() }]));
}

function normalizeModuleSettings(settings = {}) {
  const defaults = defaultModuleSettings();
  systemModules.forEach((module) => {
    const saved = settings?.[module.id] || {};
    const roles = defaultModuleRoleSettings();
    moduleAccessRoles.forEach((role) => {
      roles[role] = saved?.roles?.[role] !== false;
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
  return state?.moduleSettings?.[viewId]?.roles?.[account?.role] !== false;
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
let evaluationGradeFilter = "";
let peoplePendingEvaluationOnly = false;
let bulletinMediaDraft = [];
let archiveFileDraft = [];
let bulletinResizeRefreshQueued = false;
let taskAttachmentDraft = [];
let assignmentAttachmentDraft = [];
let dashboardRefreshQueued = false;
let dashboardChartAnimationFrame = 0;
let binaryStorageOpenPromise = null;
let durableStorageRequestPromise = null;
const storedFileDataCache = new Map();
const storedFileObjectUrlCache = new Map();
const DASHBOARD_CHART_ANIMATION_MS = 720;
const sharedSync = {
  available: null,
  session: false,
  sessionToken: "", // Đổi thành chuỗi rỗng để chặn đứng lỗi sập luồng sếp nhé
  revision: null,
  timer: 0,
  pending: false,
  inFlight: false,
  retryTimer: 0,
  conflict: false,
  conflictNotified: false,
};

const TASK_STATUS_PREPARING = "Chuẩn bị thực hiện";
const TASK_STATUS_OLD_PREPARING = "Chưa bắt đầu";
const TASK_STATUS_COMPLETED = "Hoàn thành";
const TASK_STATUS_CLOSED = "Đã kết thúc";
const taskStatuses = [TASK_STATUS_PREPARING, "Đang thực hiện", "Hoàn thành", "Quá hạn"];
const TASK_KIND_ASSIGNED = "assigned";
const TASK_KIND_REGULAR = "regular";
const taskKindLabels = {
  [TASK_KIND_ASSIGNED]: "Công việc được giao",
  [TASK_KIND_REGULAR]: "Danh mục KPI cá nhân",
};
const TASK_WORK_TYPE_ROUTINE = "routine";
const TASK_WORK_TYPE_ARISING = "arising";
const taskWorkTypeLabels = {
  [TASK_WORK_TYPE_ROUTINE]: "Công việc thường xuyên",
  [TASK_WORK_TYPE_ARISING]: "Công việc phát sinh",
};
const TASK_RECURRENCE_NONE = "none";
const TASK_RECURRENCE_MONTHLY = "monthly";
const TASK_RECURRENCE_QUARTERLY = "quarterly";
const taskRecurrenceLabels = {
  [TASK_RECURRENCE_NONE]: "Không định kỳ",
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
const MAX_BULLETIN_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_BULLETIN_MEDIA_TOTAL_BYTES = 120 * 1024 * 1024;
const MAX_ARCHIVE_FILE_BYTES = 30 * 1024 * 1024;
const MAX_ARCHIVE_FILE_TOTAL_BYTES = 300 * 1024 * 1024;
const TASK_OVERDUE_STATUS_LOCK_MS = 24 * 60 * 60 * 1000;

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

function taskHasQualityPercent(task) {
  return normalizeTaskQualityInput(task?.qualityPercent) !== "";
}

function taskQualityPercentValue(task) {
  const value = normalizeTaskQualityInput(task?.qualityPercent);
  return value === "" ? 0 : value;
}

function taskKpiActualScore(task) {
  if (normalizeTaskStatus(task?.status) !== TASK_STATUS_COMPLETED) return 0;
  return taskQualityPercentValue(task) / 100;
}

function taskQualityLabel(task) {
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
    const request = indexedDB.open(BINARY_STORAGE_DB, 1);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BINARY_STORAGE_STORE)) {
        db.createObjectStore(BINARY_STORAGE_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => reject(new Error("Không thể mở kho dữ liệu media vì trình duyệt đang khóa phiên cũ.")));
  });
  return binaryStorageOpenPromise;
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
  const config = getSupabaseConfig();
  if (!remoteKey || !config.url || !config.key) return "";
  try {
    // Luồng kết nối REST API kéo file trực tiếp từ kho chứa backup_data công khai của bạn
    const downloadUrl = `${config.url}/storage/v1/object/public/backup_data/${remoteKey}`;
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: { 'apikey': config.key },
      cache: "no-store",
    });
    if (!response.ok) return "";
    const blob = await response.blob();
    return normalizeStoredMediaDataUrl(await readFileAsDataUrl(blob), file?.type || blob.type);
  } catch {
    return "";
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
    selected.map(async (file) => ({
      id: uid("task-file"),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: await readFileAsDataUrl(file),
    })),
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
    throw new Error(`Tệp "${oversized.name}" vượt quá 20MB. Vui lòng chọn file media nhỏ hơn để lưu ổn định trong dữ liệu ứng dụng.`);
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
    throw new Error(`Tệp "${oversized.name}" vượt quá 30MB. Vui lòng chọn tệp nhỏ hơn để lưu ổn định trong kho dữ liệu.`);
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
    bulletins: [],
    archiveRecords: [],
    evaluations: [],
    departmentEvaluations: [],
    accounts: ensureDefaultAccounts(defaultAccounts()),
    moduleSettings: defaultModuleSettings(),
    systemCustomization: defaultSystemCustomization(),
    activityLog: [],
    importedPeopleVersion: "",
    canBoGpmbKpiCatalogVersion: "",
    deletedIds: [], // 🌟 KHÓA CHỐNG HỒI SINH: Lưu danh sách ID đã bị xóa
  };
}

// 🌟 Hàm ghi nhận ID vừa xóa để đồng bộ lệnh xóa sang tất cả máy trạm khác
function registerDeletedId(id) {
    if (!id) return;
    if (!Array.isArray(state.deletedIds)) state.deletedIds = [];
    if (!state.deletedIds.includes(id)) {
        state.deletedIds.push(id);
    }
}

function normalizeStatePayload(parsed) {
  const fallback = defaultStatePayload();
  if (!parsed || typeof parsed !== "object") return fallback;
  return {
    activePeriod: parsed.activePeriod || fallback.activePeriod,
    people: Array.isArray(parsed.people) ? parsed.people : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    bulletins: Array.isArray(parsed.bulletins) ? parsed.bulletins : [],
    archiveRecords: Array.isArray(parsed.archiveRecords) ? parsed.archiveRecords : [],
    evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
    departmentEvaluations: Array.isArray(parsed.departmentEvaluations) ? parsed.departmentEvaluations : [],
    accounts: ensureDefaultAccounts(parsed.accounts),
    moduleSettings: normalizeModuleSettings(parsed.moduleSettings),
    systemCustomization: normalizeSystemCustomization(parsed.systemCustomization),
    activityLog: Array.isArray(parsed.activityLog) ? parsed.activityLog : [],
    importedPeopleVersion: parsed.importedPeopleVersion || "",
    canBoGpmbKpiCatalogVersion: parsed.canBoGpmbKpiCatalogVersion || "",
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


// =========================================================================
// 🧠 HỆ THỐNG ĐỒNG BỘ ĐÁM MÂY SUPABASE STORAGE DIRECT REAL-TIME (V3.5 LÕI THÉP)
// =========================================================================

// Thuật toán gộp thông minh: Trộn việc của hai máy dựa theo quy tắc cộng dồn, xếp theo thời gian
// 🌟 Thuật toán gộp dữ liệu siêu tốc (Cache sẵn Timestamp chống đơ)
// 🌟 Thuật toán gộp dữ liệu siêu tốc & Chống hồi sinh dữ liệu đã xóa
function mergeStates(local, cloud) {
    if (!cloud) return local;
    const result = { ...local };

    // 🔥 Gộp tất cả ID đã xóa từ cả máy local và trên mây
    const mergedDeletedIds = new Set([
        ...(Array.isArray(local.deletedIds) ? local.deletedIds : []),
        ...(Array.isArray(cloud.deletedIds) ? cloud.deletedIds : [])
    ]);
    result.deletedIds = Array.from(mergedDeletedIds);

    const combineAndSort = (localArr, cloudArr) => {
        const map = new Map();
        
        // 🚨 Loại bỏ ngay các item có ID đã bị xóa
        (localArr || []).forEach(item => { 
            if (item && item.id && !mergedDeletedIds.has(item.id)) {
                map.set(item.id, item); 
            }
        });
        
        (cloudArr || []).forEach(item => { 
            if (item && item.id && !mergedDeletedIds.has(item.id)) {
                const existing = map.get(item.id);
                if (existing && existing.updatedAt && item.updatedAt) {
                    if (new Date(item.updatedAt) > new Date(existing.updatedAt)) {
                        map.set(item.id, item);
                    }
                } else {
                    map.set(item.id, item);
                }
            } 
        });
        
        const list = Array.from(map.values());
        const timeCache = new Map();
        list.forEach(item => {
            timeCache.set(item.id, new Date(item.createdAt || item.assignedAt || item.recordDate || 0).getTime() || 0);
        });

        return list.sort((a, b) => timeCache.get(a.id) - timeCache.get(b.id));
    };

    result.activePeriod = cloud.activePeriod || local.activePeriod;
    result.people = combineAndSort(local.people, cloud.people);
    result.tasks = combineAndSort(local.tasks, cloud.tasks);
    result.evaluations = combineAndSort(local.evaluations, cloud.evaluations);
    result.accounts = combineAndSort(local.accounts, cloud.accounts);
    
    result.bulletins = combineAndSort(local.bulletins, cloud.bulletins);
    result.archiveRecords = combineAndSort(local.archiveRecords, cloud.archiveRecords);
    result.departmentEvaluations = combineAndSort(local.departmentEvaluations, cloud.departmentEvaluations);

    if (cloud.moduleSettings) result.moduleSettings = cloud.moduleSettings;
    if (cloud.systemCustomization) result.systemCustomization = cloud.systemCustomization;

    return result;
}

// 🔥 ĐỒNG BỘ SIÊU TỐC: Đẩy file Master JSON siêu nhẹ (<1MB) lên mây trong 0.2s
async function backupDataToSupabase() {
    const flags = getSyncFlags();
    const client = getSupabaseClient();
    if (!client) return;

    try {
        // 🌟 Sao chép state và lọc bỏ chuỗi dataUrl Base64 nặng để file JSON không bị phình to
        const cleanState = JSON.parse(JSON.stringify(state));
        
        const stripHeavyDataUrl = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach(item => {
                if (Array.isArray(item?.media)) item.media.forEach(f => delete f.dataUrl);
                if (Array.isArray(item?.files)) item.files.forEach(f => delete f.dataUrl);
                if (Array.isArray(item?.attachments)) item.attachments.forEach(f => delete f.dataUrl);
            });
        };

        stripHeavyDataUrl(cleanState.bulletins);
        stripHeavyDataUrl(cleanState.archiveRecords);
        stripHeavyDataUrl(cleanState.tasks);

        const jsonData = JSON.stringify(cleanState);
        const fileName = `backup_phuc_thinh_master.json`;
        flags.lastCloudData = jsonData; 

        await client.storage.from('backup_data').upload(fileName, jsonData, {
            cacheControl: '0', 
            upsert: true,
            contentType: 'application/json'
        });
        console.log("🚀 [Đám mây] Tự động đồng bộ Master JSON siêu nhẹ lên Supabase thành công!");
    } catch (err) {
        console.error("❌ [Đám mây] Lỗi luồng gửi dữ liệu backupDataToSupabase:", err);
    }
}

// Hàm quét dữ liệu mây qua Rest Public API và nạp đè tức thì
// 🔥 ĐỒNG BỘ SIÊU TỐC: Nạp ngay dữ liệu chữ (0.5s) rồi mới lưu ảnh ngầm dưới máy
async function syncDataFromSupabase() {
    const flags = getSyncFlags();
    if (flags.isSyncing) return;
    const config = getSupabaseConfig();
    if (!config.url || !config.key) return;
    
    flags.isSyncing = true;
    try {
        const fileName = `backup_phuc_thinh_master.json`;
        const downloadUrl = `${config.url}/storage/v1/object/public/backup_data/${fileName}?t=${Date.now()}`;
        
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: { 'apikey': config.key },
            cache: 'no-store'
        });

        if (!response.ok) return;

        const text = await response.text();
        if (!text || text.trim() === "" || text.length < 50) return;
        if (text === flags.lastCloudData) return;
        
        flags.lastCloudData = text;
        const cloudState = JSON.parse(text);
        
        if (cloudState && typeof cloudState === 'object' && (cloudState.people || cloudState.accounts)) {
            const merged = mergeStates(state, cloudState);
            Object.assign(state, merged);
            
            syncPersonnelAccounts(); 
            persistState();

            // 🌟 HIỂN THỊ TỨC THÌ GIAO DIỆN CHỮ (0.5 giây)
            renderAll(); 
            console.log("🔄 [Đám mây] Đã nạp biến động dữ liệu chữ siêu tốc!");

            // 🌟 NẠP ĐỆM FILE/ẢNH VÀO INDEXEDDB NGẦM TRONG LUỒNG PHỤ (Không làm đơ Web)
            setTimeout(async () => {
                await migrateBulletinMediaToIndexedDb();
                await migrateArchiveFilesToIndexedDb();
                await migrateTaskAttachmentsToIndexedDb();
                // Nạp lại media sau khi cất vào IndexedDB thành công
                if (document.querySelector(".view.is-active")?.id === "bulletin") {
                    hydrateBulletinMediaElements(byId("bulletinList"));
                }
            }, 100);
        }
    } catch (err) {
        console.error("❌ [Đám mây] Lỗi luồng kéo dữ liệu syncDataFromSupabase:", err);
    } finally {
        flags.isSyncing = false;
    }
}

// Thiết lập đè hàm saveState() mới có mốc kiểm toán thời gian ghi
function saveState() {
    persistState();
    scheduleDashboardRefresh();
    backupDataToSupabase(); // Kích hoạt bắn file JSON lên mây ngay khi bấm nút Lưu
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
  if (!dashboardElementsReady()) return;
  renderDashboard();
  if (byId("taskInboxBadge")) renderTaskInbox();
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

function reloadStateFromStorage() {
  Object.assign(state, loadState());
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

function mergeImportedPeopleIntoState() {
  if (!importedPeopleFromExcel.length || state.importedPeopleVersion === IMPORTED_PEOPLE_VERSION) return;
  
  let changed = false;
  // Thiết lập bản đồ tra cứu nhanh danh sách nhân sự hiện tại theo ID gốc
  const localPeopleMap = new Map((state.people || []).map(p => [p.id, p]));

  importedPeopleFromExcel.forEach((excelPerson) => {
    if (!excelPerson || !excelPerson.id || !excelPerson.name) return;
    
    // Chuẩn hóa phòng ban và vị trí theo đặc thù dự án Phúc Thịnh (ví dụ chuyển đổi phòng du-an sang du-an-1)
    const normalizedExcelPerson = normalizeProjectPerson(excelPerson);
    
    if (localPeopleMap.has(normalizedExcelPerson.id)) {
      // 🔄 ĐỐI CHIẾU NHÂN SỰ CŨ
      const currentLocalPerson = localPeopleMap.get(normalizedExcelPerson.id);
      
      // 🔥 GIẢI PHÁP ĐỘC QUYỀN: Chỉ so sánh giá trị chuỗi thuần túy của các trường lấy từ file Excel
      const isDataChanged = Object.keys(normalizedExcelPerson).some(key => {
        // Bỏ qua các trường kiểm toán tự sinh và cấu hình tùy biến động
        if (["createdAt", "createdBy", "updatedAt", "updatedBy", "customFields"].includes(key)) return false;
        
        const localVal = currentLocalPerson[key] !== undefined && currentLocalPerson[key] !== null ? String(currentLocalPerson[key]).trim() : "";
        const excelVal = normalizedExcelPerson[key] !== undefined && normalizedExcelPerson[key] !== null ? String(normalizedExcelPerson[key]).trim() : "";
        
        return localVal !== excelVal;
      });
      
      if (isDataChanged) {
        // Chỉ ghi đè dữ liệu thô từ Excel, giữ nguyên mảng customFields và ngày tạo gốc
        Object.assign(currentLocalPerson, normalizedExcelPerson, {
          updatedAt: new Date().toISOString(),
          updatedBy: "Hệ thống (Excel)"
        });
        changed = true;
      }
    } else {
      // ➕ TIẾN HÀNH THÊM NHÂN SỰ MỚI TỪ FILE EXCEL
      state.people.push({
        ...normalizedExcelPerson,
        customFields: {},
        createdAt: new Date().toISOString(),
        createdBy: "Hệ thống (Excel)"
      });
      changed = true;
    }
  });

  // Khóa mạch xử lý nạp chồng bằng cách lưu lại nhãn phiên bản hiện tại
  state.importedPeopleVersion = IMPORTED_PEOPLE_VERSION;
  
  // Kích hoạt hàm saveState() để đẩy gói tin sạch lên kho lưu trữ Supabase cho các máy trạm khác đồng bộ theo
  if (changed) {
    saveState();
  }
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

migrateDepartmentTermLabels();
migrateLegacyProjectDepartments();
mergeImportedPeopleIntoState();
migrateCanBoGpmbKpiCatalog();
if (syncPersonnelAccounts()) saveState();

function departmentById(id) {
  return departments.find((item) => item.id === id);
}

function roleById(id) {
  return roles.find((item) => item.id === id);
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

function currentPerson() {
  const account = currentAccount();
  return account?.personId ? personById(account.personId) : null;
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
  return canViewAllData() || hasDepartmentManagementAccess();
}

function canEditPeople() {
  return canViewAllData();
}

function canViewTasks() {
  return canViewAllData() || hasDepartmentTaskAccess() || !!currentPerson();
}

function canViewDepartmentEvaluations() {
  return canViewAllData() || hasDepartmentManagementAccess();
}

function canManageBulletins() {
  return isAdmin();
}

function canManageArchive() {
  return isAdmin();
}

function canAccessView(viewId) {
  if (!currentAccount()) return false;
  if (!moduleIsAvailableToAccount(viewId)) return false;
  if (viewId === "bulletin") return true;
  if (viewId === "archive") return true;
  if (viewId === "accounts") return canManageAccounts() || canEditOwnAccount();
  if (viewId === "people") return canViewPeople();
  if (viewId === "tasks") return canViewTasks();
  if (viewId === "department-evaluations") return canViewDepartmentEvaluations();
  if (viewId === "history") return !isEmployee();
  if (canViewAllData()) return true;
  return ["evaluations", "rules"].includes(viewId);
}

function firstAccessibleView() {
  const preferred = canViewAllData()
    ? systemModules.map((module) => module.id)
    : ["evaluations", "tasks", "bulletin", "archive", "people", "department-evaluations", "history", "accounts", "rules", "dashboard"];
  return preferred.find((viewId) => canAccessView(viewId)) || "accounts";
}

function canEvaluatePerson(personId) {
  const account = currentAccount();
  const person = personById(personId);
  if (!account || !person) return false;
  if (isDirector() || isAdmin()) return true;
  if (isManager()) return person.departmentId === currentDepartmentId();
  return person.id === account.personId;
}

function canEditEvaluation(personId, period) {
  return canEvaluatePerson(personId) && canEditPeriod(period);
}

function canEditEvaluationBehavior(personId, period) {
  const person = personById(personId);
  if (!person || !canEditPeriod(period)) return false;
  if (isDirector() || isAdmin()) return true;
  return isManager() && person.departmentId === currentDepartmentId();
}

function canReportDepartmentEvaluation(departmentId, period) {
  if (!departmentId || !canEditPeriod(period)) return false;
  if (isAdmin()) return true;
  return hasDepartmentManagementAccess() && departmentId === currentDepartmentId();
}

function canConfirmDepartmentEvaluation(departmentId, period) {
  if (!departmentId || !canEditPeriod(period)) return false;
  return isDirector() || isAdmin();
}

function canEditDepartmentEvaluation(departmentId, period) {
  return canReportDepartmentEvaluation(departmentId, period) || canConfirmDepartmentEvaluation(departmentId, period);
}

function visiblePeopleForEvaluation() {
  if (canViewAllData()) return state.people;
  if (isManager()) return state.people.filter((person) => person.departmentId === currentDepartmentId());
  const person = currentPerson();
  return person ? [person] : [];
}

function visiblePeopleForPeopleView() {
  if (canViewAllData()) return state.people;
  if (hasDepartmentManagementAccess()) return state.people.filter((person) => person.departmentId === currentDepartmentId());
  return [];
}

function visiblePeopleForTasks() {
  if (canViewAllData()) return state.people;
  if (hasDepartmentTaskAccess()) return state.people.filter((person) => person.departmentId === currentDepartmentId());
  const person = currentPerson();
  return person ? [person] : [];
}

function visiblePeopleForHistory() {
  if (canViewAllData()) return state.people;
  const person = currentPerson();
  return person ? [person] : [];
}

function visibleDepartmentsForHistory() {
  if (canViewAllData()) return departments;
  const departmentId = currentDepartmentId();
  return departments.filter((department) => department.id === departmentId);
}

function visibleDepartmentsForDepartmentEvaluations() {
  if (canViewAllData()) return departments;
  if (!hasDepartmentManagementAccess()) return [];
  const departmentId = currentDepartmentId();
  return departments.filter((department) => department.id === departmentId);
}

function canAssignTasks() {
  return canViewAllData() || hasDepartmentManagementAccess();
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
  return !!task && !!person && task.ownerId === person.id;
}

function canAssessTaskQualityForPerson(personId, status) {
  if (normalizeTaskStatus(status) !== TASK_STATUS_COMPLETED) return false;
  if (isDirector() || isAdmin()) return true;
  const person = personById(personId);
  return hasDepartmentManagementAccess() && person?.departmentId === currentDepartmentId();
}

function canAssessTaskQuality(task, statusOverride = "") {
  if (!task) return false;
  return canAssessTaskQualityForPerson(task.ownerId, statusOverride || task.status);
}

function canCollaborateTask(task) {
  const person = currentPerson();
  return !!task && !!person && taskCollaboratorIds(task).includes(person.id);
}

function canUpdateTaskProgress(task) {
  return canReportTask(task) || canCollaborateTask(task);
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
  return !!task && isAssignedTask(task) && (canViewAllData() || isTaskAssigner(task) || canReportTask(task) || canCollaborateTask(task) || (hasDepartmentTaskAccess() && taskHasParticipantInDepartment(task, currentDepartmentId())));
}

function canEndTaskAssignment(task) {
  return !!task && isAssignedTask(task) && isTaskAssigner(task) && !isTaskFinishedStatus(getDueStatus(task));
}

function canOpenTask(task) {
  return canEditTaskDetails(task) || canDeleteTask(task) || canReportTask(task) || canCollaborateTask(task) || canAssessTaskQuality(task);
}

function canViewTaskRecord(task) {
  if (!task) return false;
  if (isAssignedTask(task)) return canViewAssignedTask(task);
  if (canViewAllData()) return true;
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

function evaluationsForPeriod(period = state.activePeriod) {
  return state.evaluations.filter((item) => item.period === period);
}

function latestEvaluation(personId, period = state.activePeriod) {
  return state.evaluations.find((item) => item.personId === personId && item.period === period);
}

function departmentEvaluationsForPeriod(period = state.activePeriod) {
  return state.departmentEvaluations.filter((item) => item.period === period);
}

function latestDepartmentEvaluation(departmentId, period = state.activePeriod) {
  return [...state.departmentEvaluations].reverse().find((item) => item.departmentId === departmentId && item.period === period);
}

function currentActorInfo() {
  const account = currentAccount();
  return {
    id: account?.id || "",
    name: account?.displayName || "Chưa đăng nhập",
    role: accountRoleLabels[account?.role] || account?.role || "",
  };
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
  const existingKeys = new Set(
    (state.tasks || []).map((task) => `${task.recurrenceSeriesId || task.recurrenceSourceId || task.id}|${task.due || ""}`),
  );
  const additions = [];
  (state.tasks || [])
    .filter((task) => normalizeTaskKind(task) === TASK_KIND_REGULAR)
    .filter((task) => !task.recurrenceSourceId)
    .forEach((sourceTask) => {
      const recurrence = normalizeTaskRecurrence(sourceTask);
      const step = recurrenceStepMonths(recurrence);
      if (!step || !sourceTask.due) return;
      const sourcePeriod = taskPeriod(sourceTask);
      const sourceIndex = periodIndex(sourcePeriod);
      if (sourceIndex < 0 || sourceIndex >= targetIndex) return;
      const seriesId = sourceTask.recurrenceSeriesId || sourceTask.id;
      const anchorDay = Number(sourceTask.recurrenceAnchorDay) || Number(sourceTask.due.slice(8, 10));
      for (let offset = step; sourceIndex + offset <= targetIndex && offset <= 60; offset += step) {
        const due = addMonthsToIsoDate(sourceTask.due, offset, anchorDay);
        if (!due) continue;
        const key = `${seriesId}|${due}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const repeatedTask = applyRecordAudit(
          {
            ...sourceTask,
            id: uid("task"),
            startDate: sourceTask.startDate ? addMonthsToIsoDate(sourceTask.startDate, offset, Number(sourceTask.startDate.slice(8, 10))) : "",
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
  return uniquePersonIds([...ids, task?.collaboratorId]);
}

function taskParticipantIds(task) {
  return uniquePersonIds([task?.ownerId, ...taskCollaboratorIds(task)]);
}

function taskHasParticipantInDepartment(task, departmentId) {
  return !!departmentId && taskParticipantIds(task).some((personId) => personById(personId)?.departmentId === departmentId);
}

function taskCollaboratorNames(task) {
  return taskCollaboratorIds(task)
    .map((id) => personById(id)?.name)
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

function getDueStatus(task) {
  const status = normalizeTaskStatus(task.status);
  if (isTaskFinishedStatus(status)) return status;
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

function taskOverdueStatusLockDate(task) {
  const due = taskDeadlineDate(task);
  return due ? new Date(due.getTime() + TASK_OVERDUE_STATUS_LOCK_MS) : null;
}

function taskIsPastOverdueStatusLock(task) {
  const lockDate = taskOverdueStatusLockDate(task);
  return !!lockDate && getDueStatus(task) === "Quá hạn" && lockDate <= new Date();
}

function canOverrideTaskOverdueStatusLock() {
  return canViewAllData();
}

function isTaskStatusUpdateLocked(task) {
  return !!task && taskIsPastOverdueStatusLock(task) && !canOverrideTaskOverdueStatusLock();
}

function taskCompletedBeforeDeadline(task) {
  if (normalizeTaskStatus(task?.status) !== "Hoàn thành") return false;
  if (!task.completedAt) return true;
  return isTimestampBeforeDeadline(task.completedAt, task);
}

function taskViolationReasons(task) {
  if (!isAssignedTask(task)) return [];
  if (normalizeTaskStatus(task.status) === TASK_STATUS_CLOSED) return [];
  if (!taskIsPastDeadline(task)) return [];
  const reasons = [];
  if (!taskHasTimelyResponse(task)) reasons.push("Chưa phản hồi nhận việc trước thời hạn hoàn thành");
  if (!taskHasTimelyProgressReport(task)) reasons.push("Chưa báo cáo tiến độ trước thời hạn hoàn thành");
  if (!taskCompletedBeforeDeadline(task)) reasons.push("Chưa hoàn thành khi hết thời hạn");
  return reasons;
}

function taskBehaviorRuleIndexes() {
  return {
    report: behaviorRules.findIndex((rule) => rule[0] === "Không báo cáo đúng hạn"),
    deadline: behaviorRules.findIndex((rule) => rule[0] === "Chậm thời hạn hoàn thành"),
  };
}

function automaticTaskBehaviorForPerson(personId, period) {
  const indexes = taskBehaviorRuleIndexes();
  const counts = {};
  const links = [];
  state.tasks
    .filter((task) => task.ownerId === personId && taskPeriod(task) === period)
    .forEach((task) => {
      const reasons = taskViolationReasons(task);
      if (!reasons.length) return;
      const missingReport = reasons.some((reason) => reason.includes("phản hồi") || reason.includes("báo cáo"));
      const missedDeadline = reasons.some((reason) => reason.includes("hoàn thành"));
      if (missingReport && indexes.report >= 0) counts[indexes.report] = (counts[indexes.report] || 0) + 1;
      if (missedDeadline && indexes.deadline >= 0) counts[indexes.deadline] = (counts[indexes.deadline] || 0) + 1;
      links.push({
        taskId: task.id,
        title: task.title,
        due: task.due,
        dueTime: task.dueTime || "",
        reasons,
      });
    });
  return { counts, links };
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
  const peopleIds = state.people.filter((person) => person.departmentId === departmentId).map((person) => person.id);
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
  if (role) {
    role.criteria.forEach((criterion, index) => {
      const plan = plannedTaskCountForPersonalCriterion(person.id, period, criterion[0]);
      const actual = actualTaskScoreForPersonalCriterion(person.id, period, criterion[0]);
      const planInput = byId(`criterion-plan-${index}`);
      const actualInput = byId(`criterion-actual-${index}`);
      if (planInput) planInput.value = plan;
      if (actualInput) actualInput.value = formatScore(actual);
      const result = calculateCriterionResult(plan, actual, criterion[1]);
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
  let behaviorScore = 0;
  behaviorRules.forEach((rule, index) => {
    const manualCount = clamp(byId(`behavior-${index}`)?.value, 0, 99);
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
  const criteriaScores = {};
  const criteriaResults = [];
  let criteriaScore = 0;
  if (department) {
    department.criteria.forEach((criterion, index) => {
      const plan = normalizeNumberInput(byId(`dept-criterion-plan-${index}`)?.value);
      const actual = normalizeNumberInput(byId(`dept-criterion-actual-${index}`)?.value);
      const result = calculateCriterionResult(plan, actual, criterion[1]);
      criteriaScores[index] = {
        plan,
        actual,
        completionPercent: result.completionPercent,
        points: result.points,
      };
      criteriaResults[index] = result;
      criteriaScore += result.points;
    });
  }
  const adjustmentType = normalizeDepartmentAdjustmentType(byId("deptEvalAdjustmentType")?.value);
  const adjustmentPoints = Math.max(0, normalizeNumberInput(byId("deptEvalAdjustmentPoints")?.value));
  const adjustmentScore = departmentAdjustmentSignedScore(adjustmentType, adjustmentPoints);
  const rewardDisciplineNote = byId("deptEvalRewardDiscipline")?.value.trim() || "";
  const finalScore = calculateDepartmentFinalScore(criteriaScore, adjustmentScore);
  return {
    criteriaScores,
    criteriaResults,
    criteriaScore: clamp(criteriaScore, 0, 120),
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

function addNameOption(options, seen, name, suffix = "") {
  const value = String(name || "").trim();
  if (!value || seen.has(value)) return;
  seen.add(value);
  options.push({ value, label: suffix ? `${value} - ${suffix}` : value });
}

function departmentReporterNames(departmentId) {
  const options = [];
  const seen = new Set();
  state.people
    .filter((person) => person.departmentId === departmentId)
    .filter((person) => {
      const roleId = person.roleId || "";
      return roleId.startsWith("truong-phong-") || roleId.startsWith("pho-phong-");
    })
    .forEach((person) => addNameOption(options, seen, person.name, roleById(person.roleId)?.name || ""));

  state.accounts
    .filter((account) => ["manager", "deputy_manager"].includes(account.role))
    .forEach((account) => {
      const person = account.personId ? personById(account.personId) : null;
      const accountDepartmentId = departmentById(account.departmentId) ? account.departmentId : person?.departmentId || "";
      if (accountDepartmentId !== departmentId) return;
      addNameOption(options, seen, account.displayName, accountRoleLabels[account.role] || "");
    });

  const account = currentAccount();
  if (account && hasDepartmentManagementAccess() && currentDepartmentId() === departmentId) {
    addNameOption(options, seen, account.displayName, accountRoleLabels[account.role] || "");
  }
  return options;
}

function directorReviewerNames() {
  const options = [];
  const seen = new Set();
  state.accounts
    .filter((account) => account.role === "director")
    .forEach((account) => addNameOption(options, seen, account.displayName, accountRoleLabels[account.role] || ""));
  const account = currentAccount();
  if (account && isDirector()) {
    addNameOption(options, seen, account.displayName, accountRoleLabels[account.role] || "");
  }
  return options;
}

function renderDepartmentReporterOptions(selectedValue = "") {
  const departmentId = byId("deptEvalDepartment").value;
  const reporterOptions = departmentReporterNames(departmentId);
  const seen = new Set(reporterOptions.map((item) => item.value));
  const options = [{ value: "", label: "Chọn trưởng/phó phòng báo cáo" }, ...reporterOptions];
  if (selectedValue && !seen.has(selectedValue)) {
    options.push({ value: selectedValue, label: `${selectedValue} - dữ liệu cũ` });
  }
  fillSelect(byId("deptEvalReporter"), options, selectedValue);
}

function renderDepartmentReviewerOptions(selectedValue = "") {
  const reviewerOptions = directorReviewerNames();
  const seen = new Set(reviewerOptions.map((item) => item.value));
  const options = [{ value: "", label: "Chọn Ban giám đốc xác nhận" }, ...reviewerOptions];
  if (selectedValue && !seen.has(selectedValue)) {
    options.push({ value: selectedValue, label: `${selectedValue} - dữ liệu cũ` });
  }
  fillSelect(byId("deptEvalReviewer"), options, selectedValue);
}

function isValidDepartmentReporterName(departmentId, value) {
  if (!value) return false;
  return departmentReporterNames(departmentId).some((item) => item.value === value);
}

function isValidDepartmentReviewerName(value) {
  if (!value) return false;
  return directorReviewerNames().some((item) => item.value === value);
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
  if (!byId("taskId").value) byId("taskKind").value = TASK_KIND_REGULAR;
  const currentTaskOwner = byId("taskOwner").value;
  const currentTaskCollaborators = selectedTaskCollaboratorIds();
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
  const placeholder = [{ value: "", label: state.people.length ? "Chọn nhân sự" : "Chưa có nhân sự" }];
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
    placeholder.concat(taskSelectOptions),
    selectedTaskOwner,
  );
  updateTaskCollaboratorOptions(currentTaskCollaborators);
  updateTaskCategoryOptions(byId("taskCategory").value);

  const currentAssignmentOwner = byId("assignmentTaskOwner").value;
  const currentAssignmentCollaborator = byId("assignmentTaskCollaborator").value;
  const assignmentPeople = canAssignTasks() ? assignablePeopleForTasks() : [];
  const assignmentPeopleWithSelected = [...assignmentPeople];
  [currentAssignmentOwner, currentAssignmentCollaborator].forEach((personId) => {
    const person = personById(personId);
    if (person && !assignmentPeopleWithSelected.some((item) => item.id === person.id)) {
      assignmentPeopleWithSelected.unshift(person);
    }
  });
  const assignmentOptions = assignmentPeopleWithSelected.map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const selectedAssignmentOwner = assignmentOptions.some((option) => option.value === currentAssignmentOwner)
    ? currentAssignmentOwner
    : assignmentOptions.length === 1
      ? assignmentOptions[0].value
      : "";
  const selectedAssignmentCollaborator = assignmentOptions.some((option) => option.value === currentAssignmentCollaborator) ? currentAssignmentCollaborator : "";
  fillSelect(byId("assignmentTaskOwner"), placeholder.concat(assignmentOptions), selectedAssignmentOwner);
  fillSelect(byId("assignmentTaskCollaborator"), [{ value: "", label: "Không chọn người phối hợp" }].concat(assignmentOptions), selectedAssignmentCollaborator);
  updateTaskCategoryOptions(byId("assignmentTaskCategory").value, "assignmentTaskOwner", "assignmentTaskCategory");
  fillSelect(byId("evalPerson"), placeholder.concat(evaluationOptions), selectedEvalPerson);
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
    if (peoplePendingEvaluationOnly && evaluatedPeople.has(person.id)) return false;
    if (!search) return true;
    const department = departmentById(person.departmentId)?.name || "";
    const role = roleById(person.roleId)?.name || "";
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
      const evaluation = latestEvaluation(person.id);
      const department = departmentById(person.departmentId)?.name || "";
      const role = roleById(person.roleId)?.name || "";
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
        <tr class="people-row">
          <td class="people-name-cell">
            <div class="people-person-card">
              <strong>${escapeHtml(person.name)}</strong>
              <span class="people-contact">${escapeHtml(person.phone || "Chưa cập nhật SĐT")}</span>
            </div>
          </td>
          <td class="people-gender"><span class="people-tag">${escapeHtml(person.gender || "-")}</span></td>
          <td class="people-department-cell"><span class="people-department">${escapeHtml(department || "Chưa cập nhật")}</span></td>
          <td class="people-role-cell"><span class="people-role">${escapeHtml(role || "Chưa cập nhật")}</span></td>
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
          const owner = personById(task.ownerId);
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
                <span><strong>Tên dự án:</strong> ${escapeHtml(task.projectName || "Chưa cập nhật")}</span>
                <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
                <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
                <span><strong>Thời hạn hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
                <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
                <span><strong>Đánh giá chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))}</span>
                <span><strong>Điểm thực hiện KPI:</strong> ${formatScore(taskKpiActualScore(task))}</span>
                <span><strong>Người giao:</strong> ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</span>
                <span><strong>Người được giao:</strong> ${escapeHtml(owner?.name || "Chưa rõ")}</span>
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
  const owner = personById(task.ownerId)?.name || "";
  const collaborators = taskCollaboratorNames(task).join(" ");
  const assigner = task.assignedByName || task.createdBy || "";
  const attachments = (task.attachments || []).map((file) => file.name).join(" ");
  const reports = (task.progressReports || []).map((report) => report.note).join(" ");
  const taskKind = taskKindLabels[normalizeTaskKind(task)] || "";
  const regularMeta = isAssignedTask(task) ? "" : taskWorkMeta(task);
  return `${task.title} ${task.projectName || ""} ${taskKind} ${owner} ${collaborators} ${assigner} ${task.category} ${regularMeta} ${task.note || ""} ${task.responseNote || ""} ${reports} ${attachments}`.toLowerCase();
}

function visibleTaskRecords(search = "", status = "") {
  const keyword = (search || "").trim().toLowerCase();
  return state.tasks
    .map((task) => ({ ...task, status: normalizeTaskStatus(task.status), computedStatus: getDueStatus(task) }))
    .filter((task) => canViewTaskRecord(task))
    .filter((task) => !status || task.computedStatus === status)
    .filter((task) => !keyword || taskBoardSearchText(task).includes(keyword));
}

function visibleRegularTaskRecords(search = "", status = "") {
  return visibleTaskRecords(search, status).filter((task) => normalizeTaskKind(task) === TASK_KIND_REGULAR);
}

function compareTaskRecords(a, b) {
  const aDue = taskDeadlineDate(a)?.toISOString() || "9999-12-31";
  const bDue = taskDeadlineDate(b)?.toISOString() || "9999-12-31";
  if (aDue !== bDue) return aDue.localeCompare(bDue);
  return (a.title || "").localeCompare(b.title || "", "vi");
}

function renderTaskBoard() {
  const search = byId("taskSearch").value.trim().toLowerCase();
  const filter = byId("taskStatusFilter").value;
  const tasks = visibleTaskRecords(search, filter);

  const renderTaskColumns = () => {
    return taskStatuses
      .map((status) => {
        const cards = tasks
          .filter((task) => task.computedStatus === status)
          .map((task) => {
            const owner = personById(task.ownerId);
            const collaboratorNames = taskCollaboratorNames(task);
            const assigned = isAssignedTask(task);
            const taskKind = normalizeTaskKind(task);
            const editable = canEditTaskDetails(task);
            const deletable = canDeleteTask(task);
            const copyable = canCopyTask(task);
            const reportable = canUpdateTaskProgress(task) && !taskHasQualityPercent(task);
            const assessable = canAssessTaskQuality(task);
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
                  .map(
                    (file) =>
                      `<a class="attachment-link" href="${escapeHtml(file.dataUrl)}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>`,
                  )
                  .join("")}</div>`
              : "";
            return `
              <article class="task-card task-card-clickable" data-open-task-detail="${escapeHtml(task.id)}">
                <h4>${escapeHtml(task.title)}</h4>
                ${task.projectName ? `<div class="task-meta">Dự án: ${escapeHtml(task.projectName)}</div>` : ""}
                <div class="task-meta">${assigned ? "Giao cho" : "Người thực hiện"} ${escapeHtml(owner?.name || "Chưa rõ")} · bắt đầu ${escapeHtml(formatTaskStartDate(task) || "chưa có")} · hoàn thành ${escapeHtml(formatTaskDeadline(task) || "chưa có")}</div>
                ${collaboratorNames.length ? `<div class="task-meta">Người phối hợp: ${escapeHtml(collaboratorNames.join(", "))}</div>` : ""}
                ${!assigned ? `<div class="task-meta">${escapeHtml(taskWorkMeta(task))}</div>` : ""}
                ${assigned ? `<div class="task-meta">Người giao: ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</div>` : ""}
                <span class="badge ${status === "Quá hạn" ? "bad" : status === "Hoàn thành" ? "good" : "warn"}">${escapeHtml(taskKindLabels[taskKind] || "Công việc")}: ${escapeHtml(task.category)}</span>
                <div class="task-status-grid">
                  ${assigned ? `<span><strong>Phản hồi:</strong> ${escapeHtml(responseText)}</span>` : ""}
                  <span><strong>${assigned ? "Báo cáo" : "Cập nhật"}:</strong> ${escapeHtml(reportText)}</span>
                  <span><strong>Chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))} · Thực hiện KPI ${formatScore(taskKpiActualScore(task))}</span>
                </div>
                <div class="progress" aria-label="Tiến độ ${task.progress}%"><span style="width:${clamp(task.progress, 0, 100)}%"></span></div>
                ${violations.length ? `<div class="task-violation">Tính lỗi KPI: ${escapeHtml(violations.join("; "))}</div>` : ""}
                ${attachmentList}
                <div class="row-actions">
                  ${editable ? `<button class="ghost" data-edit-task="${task.id}" type="button">${assigned ? "Sửa giao việc" : "Sửa"}</button>` : ""}
                  ${copyable ? `<button class="ghost" data-copy-task="${task.id}" type="button">Sao chép</button>` : ""}
                  ${reportable ? `<button class="ghost" data-respond-task="${task.id}" type="button">${assigned ? "Phản hồi/Báo cáo" : "Cập nhật tiến độ"}</button>` : ""}
                  ${assessable && !editable ? `<button class="ghost" data-assess-task="${task.id}" type="button">Đánh giá</button>` : ""}
                  ${deletable ? `<button class="ghost" data-delete-task="${task.id}" type="button">Xóa</button>` : ""}
                  ${editable || copyable || deletable || reportable || assessable ? "" : "<span class=\"muted\">Chỉ xem</span>"}
                </div>
              </article>
            `;
          })
          .join("");
        const count = visibleTaskRecords(search, status).length;
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
  applyFieldCustomizations();
}

function renderTaskStatusDetailItem(task) {
  const owner = personById(task.ownerId);
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
        <span><strong>${isAssignedTask(task) ? "Người được giao" : "Người thực hiện"}:</strong> ${escapeHtml(owner?.name || "Chưa rõ")}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Tên dự án:</strong> ${escapeHtml(task.projectName || "Chưa cập nhật")}</span>
        ${isAssignedTask(task) ? `<span><strong>Người giao:</strong> ${escapeHtml(task.assignedByName || task.createdBy || "Chưa ghi nhận")}</span>` : ""}
        <span><strong>Nhóm công việc:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
        <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
        ${!isAssignedTask(task) ? `<span><strong>Loại công việc:</strong> ${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)])}</span>` : ""}
        ${!isAssignedTask(task) ? `<span><strong>Định kỳ:</strong> ${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)])}</span>` : ""}
        <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
        <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
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
  const tasks = visibleTaskRecords(search, status).sort(compareTaskRecords);
  const averageProgress = tasks.length ? tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length : 0;
  const nextDeadlineTask = tasks.find((task) => taskDeadlineDate(task));
  byId("taskStatusDetailTitle").textContent = `${status || "Tất cả trạng thái"} (${tasks.length})`;
  byId("taskStatusDetailSubtitle").textContent = search
    ? `Danh sách công việc · đang lọc theo "${search}"`
    : "Danh sách công việc · tất cả công việc bạn có quyền xem";
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

function openTaskDetailDialog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canViewTaskRecord(task)) return;
  const owner = personById(task.ownerId);
  const collaborators = taskCollaboratorNames(task);
  const status = task.computedStatus || getDueStatus(task);
  const assigned = isAssignedTask(task);
  const latestReport = latestTaskProgressReport(task);
  const attachments = task.attachments || [];
  const violations = taskViolationReasons(task);
  const attachmentList = attachments.length
    ? `<div class="task-detail-attachments">${attachments
        .map(
          (file) =>
            `<a class="attachment-link" href="${escapeHtml(file.dataUrl)}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>`,
        )
        .join("")}</div>`
    : `<p class="muted">Chưa có hồ sơ liên quan.</p>`;

  byId("taskDetailSubtitle").textContent = taskKindLabels[normalizeTaskKind(task)] || "Công việc";
  byId("taskDetailTitle").textContent = task.title || "Công việc";
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
        <span><strong>${assigned ? "Người được giao" : "Người thực hiện"}</strong>${escapeHtml(owner?.name || "Chưa cập nhật")}</span>
        <span><strong>Người phối hợp</strong>${escapeHtml(collaborators.length ? collaborators.join(", ") : "Chưa chọn")}</span>
        ${assigned ? `<span><strong>Người giao</strong>${escapeHtml(task.assignedByName || task.createdBy || "Chưa cập nhật")}</span>` : ""}
        <span><strong>Tên dự án</strong>${escapeHtml(task.projectName || "Chưa cập nhật")}</span>
        <span><strong>Danh mục KPI cá nhân</strong>${escapeHtml(task.category || "Chưa phân loại")}</span>
        ${!assigned ? `<span><strong>Loại công việc</strong>${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)] || "Chưa cập nhật")}</span>` : ""}
        ${!assigned ? `<span><strong>Định kỳ</strong>${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)] || "Không định kỳ")}</span>` : ""}
        <span><strong>Ngày bắt đầu</strong>${escapeHtml(formatTaskStartDate(task) || "Chưa cập nhật")}</span>
        <span><strong>Ngày hoàn thành</strong>${escapeHtml(formatTaskDeadline(task) || "Chưa cập nhật")}</span>
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
  byId("taskDetailDialog").classList.remove("is-hidden");
  byId("taskDetailDialog").setAttribute("aria-hidden", "false");
}

function closeTaskDetailDialog() {
  byId("taskDetailDialog").classList.add("is-hidden");
  byId("taskDetailDialog").setAttribute("aria-hidden", "true");
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
          <a href="${escapeHtml(file.dataUrl)}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>
          <span class="muted">${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-task-attachment="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
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
          <a href="${escapeHtml(file.dataUrl)}" download="${escapeHtml(file.name)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a>
          <span class="muted">${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-assignment-attachment="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
}

function renderCriteriaInputs(existing = {}) {
  const person = personById(byId("evalPerson").value);
  const role = person ? roleById(person.roleId) : null;
  const period = byId("evalPeriod").value || state.activePeriod;
  byId("roleHint").textContent = role
    ? `${role.name}. Kế hoạch tự động lấy từ số công việc trong kỳ ${formatMonthPeriod(period)}; Thực hiện tự động cộng từ điểm chất lượng của các công việc hoàn thành. Hệ thống tự tính % hoàn thành = Thực hiện / Kế hoạch, tối đa 120% theo quy chế.`
    : "Chọn nhân sự để hiển thị bộ tiêu chí.";
  byId("criteriaInputs").innerHTML = role
    ? role.criteria
        .map((criterion, index) => {
          const plan = plannedTaskCountForPersonalCriterion(person.id, period, criterion[0]);
          const actual = actualTaskScoreForPersonalCriterion(person.id, period, criterion[0]);
          const result = calculateCriterionResult(plan, actual, criterion[1]);
          return `
            <article class="criteria-item">
              <div class="criteria-top">
                <strong>${escapeHtml(criterion[0])}</strong>
                <span class="criteria-actions">
                  <span class="badge">Trọng số ${criterion[1]}</span>
                  <button class="ghost criteria-detail-button" data-kpi-detail="personal" data-kpi-criterion="${escapeHtml(criterion[0])}" type="button">Chi tiết</button>
                </span>
              </div>
              <div class="criteria-input-grid">
                <label>Kế hoạch
                  <input id="criterion-plan-${index}" class="auto-plan-input" type="number" min="0" step="1" value="${escapeHtml(plan)}" readonly aria-readonly="true" title="Tự động tính theo số công việc thuộc tiêu chí này trong kỳ ${escapeHtml(formatMonthPeriod(period))}.">
                </label>
                <label>Thực hiện
                  <input id="criterion-actual-${index}" class="auto-actual-input" type="number" min="0" step="0.01" value="${escapeHtml(formatScore(actual))}" readonly aria-readonly="true" title="Tự động cộng từ đánh giá chất lượng của công việc hoàn thành trong kỳ ${escapeHtml(formatMonthPeriod(period))}.">
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
  if (!links.length) {
    container.innerHTML = '<span class="muted">Chưa có lỗi tự động từ công việc được giao trong kỳ này.</span>';
    return;
  }
  container.innerHTML = `
    <strong>Lỗi tự động từ công việc được giao</strong>
    ${links
      .map(
        (item) => `
          <button class="task-violation-link" data-task-behavior-link="${escapeHtml(item.taskId)}" type="button">
            <span>${escapeHtml(item.title)}</span>
            <small>${escapeHtml(formatTaskDeadline(item) || "chưa có ngày hoàn thành")} · ${escapeHtml(item.reasons.join("; "))}</small>
          </button>
        `,
      )
      .join("")}
  `;
}

function renderBehaviorInputs(existing = {}) {
  const manualValues = behaviorManualValues(existing);
  const automatic = automaticTaskBehaviorForPerson(byId("evalPerson").value, byId("evalPeriod").value || state.activePeriod);
  renderTaskBehaviorLinks(automatic.links);
  byId("behaviorInputs").innerHTML = behaviorRules
    .map(
      (rule, index) => {
        const automaticCount = automatic.counts[index] || 0;
        const manualValue = hasOwnValue(manualValues, index) ? manualValues[index] : "";
        return `
        <label class="behavior-item">
          <span class="behavior-top"><strong>${rule[0]}</strong><span class="badge ${rule[1] > 0 ? "good" : "bad"}">${rule[1] > 0 ? "+" : ""}${rule[1]}/lần</span></span>
          <input id="behavior-${index}" type="number" min="0" value="${escapeHtml(manualValue)}" data-score-input>
          ${automaticCount ? `<span class="field-note is-warning">Tự động từ giao việc: ${automaticCount} lỗi</span>` : ""}
        </label>
      `;
      },
    )
    .join("");
  document.querySelectorAll("[data-score-input]").forEach((input) => input.addEventListener("input", updateScorePreview));
  updateScorePreview();
}

function renderDepartmentCriteriaInputs(existing = {}) {
  const department = departmentById(byId("deptEvalDepartment").value);
  byId("departmentCriteriaHint").textContent = department
    ? `${department.name}. Nhập số kế hoạch và số thực hiện. Hệ thống tự tính % hoàn thành = Thực hiện / Kế hoạch, giới hạn tối đa 120% theo quy chế.`
    : "Chọn phòng để nhập số kế hoạch và số thực hiện theo từng chỉ tiêu.";
  byId("departmentCriteriaInputs").innerHTML = department
    ? department.criteria
        .map((criterion, index) => {
          const values = criterionInputValues(existing, index);
          const result = calculateCriterionResult(values.plan, values.actual, criterion[1]);
          return `
            <article class="criteria-item department-criteria-item">
              <div class="criteria-top">
                <strong>${escapeHtml(criterion[0])}</strong>
                <span class="criteria-actions">
                  <span class="badge">Trọng số ${criterion[1]}</span>
                  <button class="ghost criteria-detail-button" data-kpi-detail="department" data-kpi-criterion="${escapeHtml(criterion[0])}" type="button">Chi tiết</button>
                </span>
              </div>
              <div class="criteria-input-grid">
                <label>Kế hoạch
                  <input id="dept-criterion-plan-${index}" type="number" min="0" step="0.01" value="${escapeHtml(values.plan)}" data-department-score-input>
                </label>
                <label>Thực hiện
                  <input id="dept-criterion-actual-${index}" type="number" min="0" step="0.01" value="${escapeHtml(values.actual)}" data-department-score-input>
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

function plannedTaskCountForPersonalCriterion(personId, period, criterionName) {
  if (!personId || !period || !criterionName) return 0;
  return state.tasks
    .filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period)
    .filter((task) => taskMatchesKpiCriterion(task, criterionName))
    .length;
}

function actualTaskScoreForPersonalCriterion(personId, period, criterionName) {
  if (!personId || !period || !criterionName) return 0;
  return state.tasks
    .filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period)
    .filter((task) => taskMatchesKpiCriterion(task, criterionName))
    .reduce((sum, task) => sum + taskKpiActualScore(task), 0);
}

function personalCriteriaScoresFromTasks(personId, period) {
  const person = personById(personId);
  const role = person ? roleById(person.roleId) : null;
  const criteriaScores = {};
  const criteriaResults = [];
  let personalScore = 0;
  if (!role) return { criteriaScores, criteriaResults, personalScore };
  role.criteria.forEach((criterion, index) => {
    const plan = plannedTaskCountForPersonalCriterion(person.id, period, criterion[0]);
    const actual = actualTaskScoreForPersonalCriterion(person.id, period, criterion[0]);
    const result = calculateCriterionResult(plan, actual, criterion[1]);
    criteriaScores[index] = {
      plan,
      actual,
      completionPercent: result.completionPercent,
      points: result.points,
    };
    criteriaResults[index] = result;
    personalScore += result.points;
  });
  return { criteriaScores, criteriaResults, personalScore };
}

function syncPersonalEvaluationTaskScores(personId, period) {
  if (!personId || !period) return;
  const index = state.evaluations.findIndex((item) => item.personId === personId && item.period === period);
  if (index < 0) return;
  const evaluation = state.evaluations[index];
  const recalculated = personalCriteriaScoresFromTasks(personId, period);
  const nextEvaluation = {
    ...evaluation,
    criteriaScores: recalculated.criteriaScores,
    personalScore: recalculated.personalScore,
  };
  nextEvaluation.finalScore = calculatePersonalFinalScore(
    nextEvaluation.personalScore,
    Number(nextEvaluation.departmentScore || 0),
    Number(nextEvaluation.behaviorScore || 0),
  );
  nextEvaluation.grade = gradePersonal(nextEvaluation.finalScore);
  state.evaluations = state.evaluations.map((item, itemIndex) => (itemIndex === index ? nextEvaluation : item));
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
    taskParticipantIds(item).forEach((personId) => addTarget(personId, period));
  });
  targets.forEach((item) => syncPersonalEvaluationTaskScores(item.personId, item.period));
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
    const peopleIds = new Set(state.people.filter((person) => person.departmentId === departmentId).map((person) => person.id));
    const tasks = state.tasks
      .filter((task) => taskParticipantIds(task).some((personId) => peopleIds.has(personId)) && taskPeriod(task) === period && canViewTaskRecord(task))
      .filter((task) => taskMatchesKpiCriterion(task, criterionName))
      .sort(sortKpiDetailTasks);
    return {
      period,
      tasks,
      subject: department?.name || "Phòng chưa rõ",
      scopeLabel: "KPI phòng",
      emptyText: "Chưa có công việc trong phòng khớp với tiêu chí này ở kỳ đã chọn.",
    };
  }

  const personId = byId("evalPerson").value;
  const person = personById(personId);
  const tasks = state.tasks
    .filter((task) => taskBelongsToPersonForKpi(task, personId) && taskPeriod(task) === period && canViewTaskRecord(task))
    .filter((task) => taskMatchesKpiCriterion(task, criterionName))
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
  const owner = personById(task.ownerId);
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
        <span><strong>Người thực hiện:</strong> ${escapeHtml(owner?.name || "Chưa rõ")}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Tên dự án:</strong> ${escapeHtml(task.projectName || "Chưa cập nhật")}</span>
        <span><strong>Loại:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
        ${!isAssignedTask(task) ? `<span><strong>Loại công việc:</strong> ${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)])}</span>` : ""}
        ${!isAssignedTask(task) ? `<span><strong>Định kỳ:</strong> ${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)])}</span>` : ""}
        <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
        <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
        <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
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
  const defaultReporter = canReportDepartmentEvaluation(departmentId, period) ? currentActorInfo().name : "";
  const defaultReviewer = isDirector() && canConfirmDepartmentEvaluation(departmentId, period) ? currentActorInfo().name : "";
  renderDepartmentReporterOptions(existing?.reporter || defaultReporter);
  renderDepartmentReviewerOptions(existing?.reviewer || defaultReviewer);
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
  const departmentEvaluation = person ? latestDepartmentEvaluation(person.departmentId, period) : null;
  scoreInput.value = departmentEvaluation ? formatScore(departmentEvaluation.finalScore) : "";
  scoreInput.dataset.sourceId = departmentEvaluation?.id || "";
  scoreInput.title = departmentEvaluation
    ? `Tự lấy từ KPI phòng: ${departmentEvaluation.grade}`
    : "Chưa có KPI phòng trong kỳ. Nhập KPI phòng trước khi lưu KPI cá nhân.";
  hint.textContent = departmentEvaluation
    ? `Đã liên kết ${department?.name || "phòng"} kỳ ${formatPeriod(period)}: ${formatScore(departmentEvaluation.finalScore)} điểm - ${departmentEvaluation.grade}.`
    : `Chưa có KPI phòng ${department?.name || ""} kỳ ${formatPeriod(period)}. Hãy nhập ở tab KPI phòng trước.`;
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
  byId("evalReviewer").disabled = !canEditBase || isEmployee();
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
  byId("departmentEvaluationForm").querySelectorAll("[data-department-score-input], #deptEvalReporter").forEach((input) => {
    input.disabled = !canReportData;
  });
  byId("departmentEvaluationForm").querySelectorAll("#deptEvalReviewer, #deptEvalComment").forEach((input) => {
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

function renderEvaluationTable() {
  const tbody = byId("evaluationTable");
  const evaluations = [...state.evaluations]
    .filter((evaluation) => personIsVisible(evaluation.personId))
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
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"7\"");
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
          <td>${escapeHtml(evaluation.reporter || "")}</td>
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

function renderGradeDistribution(periodEvaluations) {
  const counts = Object.fromEntries(personalGradeOrder.map((grade) => [grade, 0]));
  periodEvaluations.forEach((evaluation) => {
    counts[evaluation.grade || gradePersonal(evaluation.finalScore)] = (counts[evaluation.grade || gradePersonal(evaluation.finalScore)] || 0) + 1;
  });
  const evaluatedPeople = new Set(periodEvaluations.map((evaluation) => evaluation.personId));
  const notEvaluated = state.people.filter((person) => !evaluatedPeople.has(person.id)).length;
  counts["Chưa chấm"] = notEvaluated;
  const total = state.people.length;
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

function renderDepartmentEffectivenessChart() {
  const items = departments.map((department, index) => {
    const people = state.people.filter((person) => person.departmentId === department.id);
    const evaluation = latestDepartmentEvaluation(department.id);
    const score = evaluation?.finalScore || 0;
    return {
      department,
      people,
      evaluation,
      score,
      grade: evaluation ? evaluation.grade : "Chưa chấm",
      color: departmentChartColors[index % departmentChartColors.length],
    };
  });
  const scored = items.filter((item) => item.evaluation);
  const avg = scored.length ? scored.reduce((sum, item) => sum + item.score, 0) / scored.length : 0;
  byId("departmentChartSummary").textContent = scored.length
    ? `${scored.length}/${departments.length} phòng đã có KPI phòng trong kỳ ${formatMonthPeriod(state.activePeriod)}.`
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
          meta: timelineRecordMeta(evaluation, evaluation.comment || evaluation.reviewer || ""),
        }
      : null,
    evaluation.updatedAt && evaluation.updatedAt !== evaluation.createdAt
      ? {
          ...base,
          type: "Sửa KPI cá nhân",
          timestamp: evaluation.updatedAt,
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
    evaluation.reporter ? `Báo cáo: ${evaluation.reporter}` : "",
    evaluation.reviewer ? `Xác nhận: ${evaluation.reviewer}` : "",
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
          meta: timelineRecordMeta(evaluation, details),
        }
      : null,
    evaluation.updatedAt && evaluation.updatedAt !== evaluation.createdAt
      ? {
          ...base,
          type: "Sửa KPI phòng",
          timestamp: evaluation.updatedAt,
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
  const projectMeta = task.projectName ? ` · dự án ${task.projectName}` : "";
  const qualityMeta = taskHasQualityPercent(task) ? ` · chất lượng ${formatScore(taskQualityPercentValue(task))}%` : "";
  const startMeta = task.startDate ? ` · bắt đầu ${formatTaskStartDate(task)}` : "";
  const baseMeta = `${taskKindLabels[normalizeTaskKind(task)]}${regularMeta}${projectMeta} · ${owner?.name || "Chưa rõ"}${collaboratorMeta} · ${status}${startMeta} · hoàn thành ${formatTaskDeadline(task) || "chưa có"}${qualityMeta}`;
  const base = {
    period: taskPeriod(task),
    targetType: "task",
    targetId: task.id,
    personId: task.ownerId,
    departmentId: owner?.departmentId || "",
    title: task.title,
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
      meta: timelineRecordMeta(task, baseMeta),
      badgeClass: "good",
    });
  }
  if (task.assignedAt) {
    items.push({
      ...base,
      type: "Giao việc",
      timestamp: task.assignedAt,
      meta: `Người giao: ${task.assignedByName || task.createdBy || "Chưa rõ"} · Người nhận: ${owner?.name || "Chưa rõ"} · ${task.category || "Chưa phân loại"}${projectMeta}`,
      badgeClass: "warn",
    });
  }
  if (task.responseAt) {
    items.push({
      ...base,
      type: "Phản hồi giao việc",
      timestamp: task.responseAt,
      meta: `${task.responseStatus || "Phản hồi"} · ${task.responseByName || "Người được giao"}${task.responseNote ? ` · ${task.responseNote}` : ""}`,
      badgeClass: "warn",
    });
  }
  (task.progressReports || []).forEach((report) => {
    items.push({
      ...base,
      type: "Báo cáo tiến độ",
      timestamp: report.createdAt,
      meta: `${report.createdBy || "Người cập nhật"} · ${report.status || status}${report.note ? ` · ${report.note}` : ""}`,
      score: `${formatScore(report.progress)}%`,
      badgeClass: taskStatusBadgeClass(report.status || status),
    });
  });
  if (task.qualityAssessedAt && taskHasQualityPercent(task)) {
    items.push({
      ...base,
      type: "Đánh giá chất lượng",
      timestamp: task.qualityAssessedAt,
      meta: `${task.qualityAssessedByName || "Người đánh giá"} · ${formatScore(taskQualityPercentValue(task))}% · điểm thực hiện KPI ${formatScore(taskKpiActualScore(task))}`,
      score: `${formatScore(taskQualityPercentValue(task))}%`,
      badgeClass: "good",
    });
  }
  if (task.updatedAt && task.updatedAt !== task.createdAt && task.updatedAt !== task.assignedAt && task.updatedAt !== task.responseAt) {
    items.push({
      ...base,
      type: "Sửa Công việc",
      timestamp: task.updatedAt,
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
      meta: `Hoàn thành bởi ${task.completedByName || "Chưa rõ"} · ${baseMeta}`,
      badgeClass: "good",
    });
  }
  if (task.closedAt) {
    items.push({
      ...base,
      type: "Kết thúc Công việc",
      timestamp: task.closedAt,
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
                <time>${escapeHtml(item.timestamp ? formatDateTime(item.timestamp) : formatPeriod(item.period) || "Không có kỳ")}</time>
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
    const peopleIds = people.map((person) => person.id);
    const departmentEvals = state.departmentEvaluations.filter((item) => item.departmentId === targetId && isPeriodInRange(item.period, from, to));
    const personalEvals = state.evaluations.filter((item) => peopleIds.includes(item.personId) && isPeriodInRange(item.period, from, to));
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
  const evaluations = state.evaluations.filter((item) => item.personId === targetId && isPeriodInRange(item.period, from, to));
  const departmentEvals = person
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
  const periodEvaluations = evaluationsForPeriod().filter((evaluation) => personById(evaluation.personId) && personIsVisible(evaluation.personId));
  const avg = periodEvaluations.length
    ? periodEvaluations.reduce((sum, item) => sum + item.finalScore, 0) / periodEvaluations.length
    : 0;
  const visibleTasks = state.tasks.filter((task) => personById(task.ownerId) && canViewTaskRecord(task));
  const overdue = visibleTasks.filter((task) => getDueStatus(task) === "Quá hạn").length;
  const reward = periodEvaluations.filter((item) => item.finalScore >= 90 || item.behaviorScore >= 5).length;
  byId("metricPeople").textContent = state.people.length;
  byId("metricOverdue").textContent = overdue;
  byId("metricAvg").textContent = formatScore(avg);
  byId("metricReward").textContent = reward;
  renderGradeDistribution(periodEvaluations);

  const ranking = [...periodEvaluations].sort((a, b) => b.finalScore - a.finalScore).slice(0, 10);
  byId("rankingList").classList.toggle("empty-state", !ranking.length);
  byId("rankingList").innerHTML = ranking.length
    ? ranking
        .map((evaluation, index) => {
          const person = personById(evaluation.personId);
          if (!person) return "";
          return `<div class="rank-item dashboard-link" data-dashboard-evaluation-detail="${escapeHtml(evaluation.id)}"><span class="rank-no">${index + 1}</span><div><strong>${escapeHtml(person.name)}</strong><br><span class="muted">${escapeHtml(roleById(person.roleId)?.name || "")}</span></div><span class="score">${formatScore(evaluation.finalScore)}</span></div>`;
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
        text: `Lỗi giao việc: ${task.title} (${personById(task.ownerId)?.name || "chưa rõ"}) - ${taskViolationReasons(task).join("; ")}`,
        taskId: task.id,
      }),
    );
  periodEvaluations
    .filter((item) => item.finalScore < 70)
    .forEach((item) => alerts.push({ text: `KPI dưới 70: ${personById(item.personId)?.name || "nhân sự đã xóa"} - ${formatScore(item.finalScore)}`, personId: item.personId }));
  departmentEvaluationsForPeriod()
    .filter((item) => item.finalScore < 65)
    .forEach((item) => alerts.push({ text: `KPI phòng dưới mức khá: ${departmentById(item.departmentId)?.name || "phòng đã xóa"} - ${formatScore(item.finalScore)}`, departmentId: item.departmentId }));
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

  renderDepartmentEffectivenessChart();
  if (options.animate) animateDashboardCharts();
  else finishDashboardChartAnimations();
}

function rolesForRules() {
  const seen = new Set();
  return roles.filter((role) => {
    const criteriaKey = (role.criteria || []).map((criterion) => `${criterion[0]}:${criterion[1]}`).join("|");
    const key = `${role.name}|${criteriaKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderRules() {
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
  if (canManageBulletins()) return posts;
  return posts.filter((post) => post.status !== "draft");
}

function bulletinSortValue(post) {
  return post.publishDate || post.updatedAt || post.createdAt || "";
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
  if (!post || (!canManageBulletins() && post.status === "draft")) return;
  const media = Array.isArray(post.media) ? post.media : [];
  const labels = [post.category || "Tin tức chung", post.pinned ? "Tin ghim" : "", canManageBulletins() ? bulletinStatusLabel(post.status || "published") : ""].filter(Boolean);
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

function bulletinMasonryColumnCount(cardCount = 1) {
  const list = byId("bulletinList");
  const width = list?.clientWidth || list?.parentElement?.clientWidth || 0;
  if (!width) return 1;
  const minColumnWidth = 360;
  const gap = 10;
  return clamp(Math.floor((width + gap) / (minColumnWidth + gap)), 1, Math.max(1, cardCount));
}

function renderBulletinMasonry(cardHtmls) {
  const columnCount = bulletinMasonryColumnCount(cardHtmls.length);
  const columns = Array.from({ length: columnCount }, () => []);
  cardHtmls.forEach((html, index) => {
    columns[index % columnCount].push(html);
  });
  return columns
    .map((items) => `<div class="bulletin-masonry-column">${items.join("")}</div>`)
    .join("");
}

function renderBulletinBoard() {
  const posts = visibleBulletins();
  const search = normalizeSearchText(byId("bulletinSearch").value.trim());
  const category = byId("bulletinCategoryFilter").value;
  const filtered = posts
    .filter((post) => bulletinMatchesFilters(post, search, category))
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return bulletinSortValue(b).localeCompare(bulletinSortValue(a));
    });
  const allPosts = Array.isArray(state.bulletins) ? state.bulletins : [];
  const publishedCount = allPosts.filter((post) => post.status !== "draft").length;
  const draftCount = allPosts.length - publishedCount;
  byId("bulletinAdminPanel").classList.toggle("is-hidden", !canManageBulletins());
  byId("bulletinSummary").textContent = canManageBulletins()
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
                    ${canManageBulletins() ? `<span class="badge ${statusClass}">${escapeHtml(bulletinStatusLabel(status))}</span>` : ""}
                  </div>
                  <h3>${escapeHtml(post.title)}</h3>
                </div>
                <time>${escapeHtml(formatDate(post.publishDate || post.createdAt))}</time>
              </div>
              ${previewText ? `<p class="bulletin-excerpt">${escapeHtml(previewText)}</p>` : ""}
              ${renderBulletinMedia(media)}
              ${
                canManageBulletins()
                  ? `<div class="bulletin-footer">
                      <span class="row-actions">
                        <button class="ghost" data-edit-bulletin="${escapeHtml(post.id)}" type="button">Sửa</button>
                        <button class="ghost" data-delete-bulletin="${escapeHtml(post.id)}" type="button">Xóa</button>
                      </span>
                    </div>`
                  : ""
              }
            </article>
          `;
        });
  byId("bulletinList").innerHTML = filtered.length ? renderBulletinMasonry(bulletinCardHtmls) : "Chưa có tin bài phù hợp.";
  setTimeout(() => {
    hydrateBulletinMediaElements(byId("bulletinList"));
  }, 100);
  applyFieldCustomizations();
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

async function migrateBulletinMediaToIndexedDb() {
  let changed = false;
  for (const post of state.bulletins || []) {
    if (!Array.isArray(post.media)) continue;
    for (const file of post.media) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("bulletin-media");
      file.id = file.id || key;
      file.storageKey = key;
      try {
        await writeStoredFile(file, file.dataUrl);
        delete file.dataUrl;
        changed = true;
      } catch {
        // Keep legacy inline media if IndexedDB cannot accept it, so existing posts do not lose content.
      }
    }
  }
  if (changed) {
    try {
      persistState();
      renderBulletinBoard();
    } catch {
      // If localStorage is already constrained, keep the in-memory migration for this session.
    }
  }
}

function archiveById(id) {
  return (state.archiveRecords || []).find((record) => record.id === id);
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
  if (canManageArchive()) return departments;
  return [];
}

function archiveEditablePeople() {
  if (canManageArchive()) return state.people;
  return [];
}

function archiveEditableDepartmentEvaluations() {
  if (canManageArchive()) return state.departmentEvaluations || [];
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
  const selectedTask = byId("archiveTask").value;
  const selectedDepartmentEvaluation = byId("archiveDepartmentEvaluation").value;
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
    byId("archiveTask"),
    [{ value: "", label: "Không chọn công việc" }].concat(
      (state.tasks || [])
        .filter((task) => canViewTaskRecord(task))
        .sort(compareTaskRecords)
        .map((task) => ({
          value: task.id,
          label: `${task.title} - ${personById(task.ownerId)?.name || "Chưa rõ người thực hiện"}`,
        })),
    ),
    selectedTask,
  );
  fillSelect(
    byId("archiveDepartmentEvaluation"),
    [{ value: "", label: "Không chọn KPI phòng" }].concat(
      archiveEditableDepartmentEvaluations()
        .slice()
        .sort((a, b) => (b.period || "").localeCompare(a.period || ""))
        .map((evaluation) => ({
          value: evaluation.id,
          label: `${departmentById(evaluation.departmentId)?.name || "Phòng"} - ${formatMonthPeriod(evaluation.period)} - ${formatScore(evaluation.finalScore)} điểm`,
        })),
    ),
    selectedDepartmentEvaluation,
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
  const task = (state.tasks || []).find((item) => item.id === record.taskId);
  const departmentEvaluation = (state.departmentEvaluations || []).find((item) => item.id === record.departmentEvaluationId);
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
      task?.title,
      departmentEvaluation ? `${departmentById(departmentEvaluation.departmentId)?.name || ""} ${formatMonthPeriod(departmentEvaluation.period)}` : "",
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

function archiveMatchesFilters(record, search, category, status, departmentId) {
  if (category && record.category !== category) return false;
  if (status && record.status !== status) return false;
  if (departmentId && record.departmentId !== departmentId) return false;
  return !search || archiveRecordSearchText(record).includes(search);
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

function archiveFileLinkHtml(file) {
  const key = escapeHtml(storedFileKey(file));
  const source = escapeHtml(file.dataUrl || "");
  const name = escapeHtml(file.name || "Tệp đính kèm");
  return `
    <a class="archive-file-link" href="${source || "#"}" data-archive-file-key="${key}" download="${name}" target="_blank" rel="noopener">
      <span class="badge">${escapeHtml(archiveFileKindLabel(file))}</span>
      <span>${name}</span>
      <small>${escapeHtml(formatFileSize(file.size))}</small>
    </a>
  `;
}

function archiveLinkButtons(record) {
  const buttons = [];
  const person = personById(record.personId);
  const task = (state.tasks || []).find((item) => item.id === record.taskId);
  const departmentEvaluation = (state.departmentEvaluations || []).find((item) => item.id === record.departmentEvaluationId);
  if (record.departmentId && canAccessView("history")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-department-history="${escapeHtml(record.departmentId)}" type="button">Lịch sử phòng</button>`);
  }
  if (person && canAccessView("people")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-person="${escapeHtml(person.id)}" type="button">Hồ sơ nhân sự</button>`);
  }
  if (task && canAccessView("tasks") && canViewTaskRecord(task)) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-task="${escapeHtml(task.id)}" type="button">Công việc</button>`);
  }
  if (departmentEvaluation && canAccessView("department-evaluations")) {
    buttons.push(`<button class="archive-link-button ghost" data-open-archive-dept-eval="${escapeHtml(departmentEvaluation.id)}" type="button">KPI phòng</button>`);
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
      ${canManageArchive() ? `<button class="archive-delete-button" data-delete-archive="${escapeHtml(record.id)}" type="button" aria-label="Xóa hồ sơ" title="Xóa">×</button>` : ""}
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
        ${canManageArchive() ? `<button class="archive-edit-button ghost" data-edit-archive="${escapeHtml(record.id)}" type="button">Sửa</button>` : ""}
      </div>
    </article>
  `;
}

function renderArchive() {
  if (!byId("archiveList")) return;
  byId("archiveAdminPanel").classList.toggle("is-hidden", !canManageArchive());
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
  // 🌟 TỐI ƯU: Đưa việc nạp tệp ra luồng phụ để giao diện Tab hiển thị ngay lập tức
  setTimeout(() => {
    hydrateArchiveFileLinks(byId("archiveList"));
  }, 100);
  applyFieldCustomizations();
}

function renderArchiveDetailFile(file) {
  const kind = file.kind || archiveFileKindFromFile(file);
  const key = escapeHtml(storedFileKey(file));
  const source = escapeHtml(file.dataUrl || "");
  const name = escapeHtml(file.name || "Tệp đính kèm");
  const openLink = archiveFileLinkHtml(file);
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
      <div class="archive-preview-head" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
        <div>
          <strong>${name}</strong>
          <span class="archive-meta">
            <span class="badge">${escapeHtml(archiveFileKindLabel(file))}</span>
            <span>${escapeHtml(formatFileSize(file.size))}</span>
          </span>
        </div>

        <!-- 🌟 NÚT TẢI FILE XUỐNG DÀNH RIÊNG CHO SẾP -->
        <a class="archive-file-link btn-download-file" 
           href="${source || "#"}" 
           data-archive-file-key="${key}" 
           download="${name}" 
           target="_blank" 
           rel="noopener" 
           style="padding: 6px 14px; background: #0284c7; color: #ffffff !important; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          📥 Tải file xuống
        </a>
      </div>
      ${preview}
      <div class="archive-files">${openLink}</div>
    </article>
  `;
}

function openArchiveDetailDialog(recordId) {
  const record = archiveById(recordId);
  if (!record) return;
  const department = departmentById(record.departmentId);
  const person = personById(record.personId);
  const task = (state.tasks || []).find((item) => item.id === record.taskId);
  const departmentEvaluation = (state.departmentEvaluations || []).find((item) => item.id === record.departmentEvaluationId);
  const tags = archiveRecordTags(record);
  const files = Array.isArray(record.files) ? record.files : [];
  const metaItems = [
    record.documentNo ? `Số hiệu: ${record.documentNo}` : "",
    record.recordDate ? `Ngày: ${formatDate(record.recordDate)}` : "",
    department ? `Phòng: ${department.name}` : "",
    person ? `Nhân sự: ${person.name}` : "",
    task ? `Công việc: ${task.title}` : "",
    departmentEvaluation ? `KPI phòng: ${departmentById(departmentEvaluation.departmentId)?.name || "Phòng"} - ${formatMonthPeriod(departmentEvaluation.period)}` : "",
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
  const taskId = event.target.closest("[data-open-archive-task]")?.dataset.openArchiveTask;
  const departmentEvaluationId = event.target.closest("[data-open-archive-dept-eval]")?.dataset.openArchiveDeptEval;
  const departmentId = event.target.closest("[data-open-archive-department-history]")?.dataset.openArchiveDepartmentHistory;
  if (personId && canAccessView("people")) {
    const person = personById(personId);
    byId("personSearch").value = person?.name || "";
    renderPeopleTable();
    switchView("people");
    byId("peopleTable").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  if (taskId && canAccessView("tasks")) {
    openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
    return true;
  }
  if (departmentEvaluationId && canAccessView("department-evaluations")) {
    openHistoryTimelineTarget({ targetType: "departmentEvaluation", targetId: departmentEvaluationId });
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
  byId("archiveTask").value = record.taskId || "";
  byId("archiveDepartmentEvaluation").value = record.departmentEvaluationId || "";
  byId("archiveTags").value = archiveRecordTags(record).join(", ");
  byId("archiveDescription").value = record.description || "";
  byId("archiveFiles").value = "";
  archiveFileDraft = [...(record.files || [])];
  renderArchiveFileDraft();
  renderCustomFieldsForScope("archive");
  applyFieldCustomizations();
}

async function migrateArchiveFilesToIndexedDb() {
  let changed = false;
  for (const record of state.archiveRecords || []) {
    if (!Array.isArray(record.files)) continue;
    for (const file of record.files) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("archive-file");
      file.id = file.id || key;
      file.storageKey = key;
      file.kind = file.kind || archiveFileKindFromFile(file);
      file.type = file.type || archiveFileTypeFromFile(file);
      try {
        await writeStoredFile(file, normalizeStoredMediaDataUrl(file.dataUrl, file.type));
        delete file.dataUrl;
        changed = true;
      } catch {
        // Keep legacy inline files if IndexedDB cannot accept them.
      }
    }
  }
  if (changed) {
    try {
      persistState();
      renderArchive();
    } catch {
      // Keep the in-memory migration for this session if localStorage is constrained.
    }
  }
}

// 🔥 2. HÀM MỚI BỔ SUNG: Bóc tách file đính kèm Công việc vào IndexedDB (Chống tràn 5MB)
async function migrateTaskAttachmentsToIndexedDb() {
  let changed = false;
  for (const task of state.tasks || []) {
    if (!Array.isArray(task.attachments)) continue;
    for (const file of task.attachments) {
      if (!file?.dataUrl) continue;
      const key = storedFileKey(file) || uid("task-file");
      file.id = file.id || key;
      file.storageKey = key;
      try {
        await writeStoredFile(file, file.dataUrl);
        delete file.dataUrl; // Giải phóng bộ nhớ chuỗi nặng khỏi localStorage
        changed = true;
      } catch (e) {
        console.error("❌ Lỗi lưu file công việc vào IndexedDB:", e);
      }
    }
  }
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
      const roles = state.moduleSettings[module.id]?.roles || defaultModuleRoleSettings();
      const enabledRoles = moduleAccessRoles.filter((role) => roles[role] !== false).length;
      const roleControls = moduleAccessRoles
        .map(
          (role) => `
            <label class="module-role-toggle">
              <input type="checkbox" data-module-id="${escapeHtml(module.id)}" data-module-role-toggle="${escapeHtml(role)}" ${roles[role] !== false ? "checked" : ""} ${module.locked ? "disabled" : ""}>
              <span>${escapeHtml(accountRoleLabels[role])}</span>
            </label>
          `,
        )
        .join("");
      const status = module.locked ? "Luôn bật" : enabled ? `${enabledRoles}/${moduleAccessRoles.length} nhóm đang bật` : "Đang tắt toàn hệ thống";
      return `
        <article class="module-toggle-card${module.locked ? " is-locked" : ""}">
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
  renderAll();
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

function renderAllCustomFields() {
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
  return Array.from(root.querySelectorAll(selector)).indexOf(element);
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
  removeCustomizationMiniTools(element);
  const tools = document.createElement("span");
  tools.className = "customization-mini-tools";
  tools.setAttribute("contenteditable", "false");
  tools.innerHTML = `
    <span class="customization-resize-handle" data-custom-resize-handle title="Kéo để đổi kích thước"></span>
  `;
  element.appendChild(tools);
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
  return Array.from(parent?.children || []).filter((element) => element.classList?.contains("is-admin-customizable-field") && customizationElementKey(element));
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
  applyFieldCustomizations();
}

function clearCustomizationDragState() {
  document.querySelectorAll(".is-customization-dragging, .is-customization-drop-target, .is-customization-drop-container-active").forEach((element) => {
    element.classList.remove("is-customization-dragging", "is-customization-drop-target", "is-customization-drop-container-active");
  });
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
    if (element.parentElement) affectedParents.add(element.parentElement);
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
    ".view .block",
    ".view .score-panel",
    ".view .metrics article",
    ".view .dashboard-card-column",
    ".view .dashboard-card-column > section",
    ".view .task-inbox-panel",
    ".view .task-kind-head",
    ".view .task-column",
    ".view .criteria-item",
    ".view .behavior-item",
    ".view .score-result > div",
    ".view .archive-stat",
    ".view .bulletin-card",
    ".view .archive-card",
    ".view .module-toggle-card",
    ".view .task-collaborator-field",
    ".view label",
    ".view h2",
    ".view h3",
    ".view h4",
    ".view th",
    ".view button:not(.nav-item):not(.archive-delete-button):not(.popup-customize-button):not(.scroll-jump-button)",
    ".view .eyebrow",
    ".view .section-note",
    ".view .field-note",
    ".view .compact-upload-title",
    ".view .badge",
    ".view .filter-note span",
    ".view .score-result span",
    ".view .metrics span",
    ".view .task-inbox-button strong",
    ".view .task-inbox-button small",
    ".view .chart-heading h3",
    ".view .task-column-head span",
    ".view .task-column-head strong",
    ".view .task-card h4",
    ".view .archive-card h3",
    ".view .bulletin-card h3",
    ".view .archive-stat span",
    ".view .archive-stat strong",
    ".view .rank-item strong",
    ".view .alert-item strong",
    ".view .block > p",
    ".view .rules-grid li",
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

function applyFieldCustomizations() {
  // 🌟 TỐI ƯU: Nếu không bật chế độ Tùy biến thì bỏ qua việc quét DOM để chuyển tab siêu nhanh
  if (!customizationEnabled()) {
    document.body.classList.remove("is-customize-mode");
    return;
  }
  state.systemCustomization = normalizeSystemCustomization(state.systemCustomization);
  document.querySelectorAll(".is-admin-customizable-field").forEach((element) => {
    removeCustomizationMiniTools(element);
    element.classList.remove("is-admin-customizable-field", "field-hidden-by-admin");
    element.classList.remove("field-deleted-by-admin", "is-customization-dragging", "is-customization-drop-target", "is-customization-resizing");
    element.style.gridColumn = "";
    element.style.minWidth = "";
    element.style.order = "";
    element.style.minHeight = "";
    element.style.width = "";
    element.style.height = "";
  });
  const elements = customizableElements();
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
    textNode.textContent = `${override.label || element.dataset.defaultLabel}${labelSuffix}`;
    element.classList.toggle("is-admin-customizable-field", customizationEnabled());
    element.classList.toggle("field-hidden-by-admin", override.hidden === true || override.deleted === true);
    element.classList.toggle("field-deleted-by-admin", override.deleted === true);
    element.style.gridColumn = override.width ? `span ${override.width}` : "";
    const hasOverrideOrder = override.order || override.order === 0;
    element.style.order = hasOverrideOrder ? override.order : "";
    if (!element.matches("label") && override.width) {
      element.style.minWidth = `${Number(override.width) * 90}px`;
    }
    const height = override.height ? `${override.height}px` : "";
    if (height && !element.matches("label")) element.style.minHeight = height;
    element.style.width = override.pixelWidth ? `${override.pixelWidth}px` : "";
    element.style.height = override.pixelHeight ? `${override.pixelHeight}px` : "";
    element.querySelectorAll("input, select, textarea").forEach((fieldControl) => {
      if (fieldControl.dataset.originalRequired === undefined) {
        fieldControl.dataset.originalRequired = fieldControl.required ? "1" : "0";
      }
      fieldControl.required = (override.hidden === true || override.deleted === true) && !customizationEnabled() ? false : fieldControl.dataset.originalRequired === "1";
      fieldControl.style.minHeight = height;
    });
  });
  elements.forEach((element) => addCustomizationMiniTools(element, customizationElementKey(element)));
  document.body.classList.toggle("is-customize-mode", customizationEnabled());
  byId("toggleCustomizeMode")?.classList.toggle("is-active", customizationEnabled());
  if (byId("toggleCustomizeMode")) byId("toggleCustomizeMode").textContent = customizationEnabled() ? "Đang tùy biến" : "Tùy biến";
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

function renderDirectCustomization() {
  renderAllCustomFields();
  renderViewCustomizationTools();
  applyFieldCustomizations();
  applyPopupCustomizations();
  renderPopupCustomizationButtons();
}

function openModal(id) {
  byId(id).classList.remove("is-hidden");
  byId(id).setAttribute("aria-hidden", "false");
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
  if (!canManageAccounts() && !canEditOwnAccount()) {
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"5\"");
    return;
  }
  const accounts = canManageAccounts() ? state.accounts : [currentAccount()].filter(Boolean);
  if (!accounts.length) {
    tbody.innerHTML = byId("emptyRowTemplate").innerHTML.replace("colspan=\"8\"", "colspan=\"5\"");
    return;
  }
  tbody.innerHTML = accounts
    .map((account) => {
      const person = personById(account.personId);
      const department = departmentById(account.departmentId || person?.departmentId);
      const isSelf = currentAccount()?.id === account.id;
      const canEdit = canManageAccounts() || (canEditOwnAccount() && isSelf);
      const canDelete = canManageAccounts() && !isSelf;
      return `
        <tr>
          <td><strong>${escapeHtml(account.displayName)}</strong><br><span class="muted">${escapeHtml(account.username)}</span></td>
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
  byId("accountPassword").value = account.password;
  byId("accountRole").value = account.role;
  renderAccountOptions();
  byId("accountPerson").value = account.personId || "";
  byId("accountDepartment").value = account.departmentId || personById(account.personId)?.departmentId || "";
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
  if (!account) return;

  renderCurrentUser();
  document.querySelectorAll(".admin-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isDirector());
  });
  document.querySelectorAll(".summary-action").forEach((element) => {
    element.classList.toggle("is-hidden", !canViewAllData());
  });
  document.querySelectorAll(".json-data-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin());
  });
  document.querySelectorAll(".customization-action").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin());
  });
  if (!isAdmin() && customizeMode) setCustomizeMode(false);
  document.querySelectorAll(".bulletin-admin-only").forEach((element) => {
    element.classList.toggle("is-hidden", !canManageBulletins());
  });
  document.querySelectorAll(".archive-manager-only").forEach((element) => {
    element.classList.toggle("is-hidden", !canManageArchive());
  });
  byId("personForm").classList.toggle("is-hidden", !canEditPeople());
  byId("openDepartmentEvaluationFromPersonal").classList.toggle("is-hidden", !canAccessView("department-evaluations"));
  updateAccountFormAccess();
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-hidden", !canAccessView(button.dataset.view));
  });

  // 🌟 ƯU TIÊN 1: Mở lại Tab đang xem dở trước khi F5
  const savedView = localStorage.getItem("phuc-thinh-active-view");
  if (savedView && canAccessView(savedView)) {
    switchView(savedView);
  } else {
    // ƯU TIÊN 2: Nếu không có bộ nhớ hoặc mất quyền, mới cho về mặc định
    switchView(firstAccessibleView());
  }
}

function switchView(viewId) {
  if (!canAccessView(viewId)) return;
  
  // 🌟 CHÈN THÊM DÒNG NÀY: Lưu lại tên Tab đang xem vào máy
  localStorage.setItem("phuc-thinh-active-view", viewId);

  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((item) => item.classList.toggle("is-active", item.id === viewId));
  if (viewId === "dashboard") renderDashboard({ animate: true });
  if (viewId === "bulletin") renderBulletinBoard();
  if (viewId === "archive") renderArchive();
}

function focusEditForm(formId, focusId) {
  byId(formId).scrollIntoView({ behavior: "smooth", block: "start" });
  byId(focusId)?.focus({ preventScroll: true });
}

function populatePersonForm(person) {
  if (!person) return;
  byId("personId").value = person.id;
  byId("personName").value = person.name;
  byId("personGender").value = person.gender || "";
  byId("personDepartment").value = person.departmentId;
  updateRoleOptions(person.roleId);
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
  byId("taskId").value = task.id;
  byId("taskKind").value = normalizeTaskKind(task);
  byId("taskTitle").value = task.title;
  byId("taskProjectName").value = task.projectName || "";
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
  byId("taskAssignerLabel").value = task.assignedByName || task.createdBy || "";
  byId("taskResponseStatus").value = task.responseStatus || "";
  byId("taskResponseNote").value = task.responseNote || "";
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
      (report, index) => `
        <div class="progress-report-row">
          <small>Lần ${reports.length - index} · ${escapeHtml(formatDateTime(report.createdAt) || "Chưa rõ thời gian")} · ${escapeHtml(report.createdBy || "Người cập nhật")}</small>
          <span><strong>${escapeHtml(normalizeTaskStatus(report.status))}</strong> · Tiến độ ${formatScore(report.progress)}%</span>
          ${report.note ? `<span>${escapeHtml(report.note)}</span>` : ""}
        </div>
      `,
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
  if (!existingTask && !canAssignTasks() && byId("taskKind").value === TASK_KIND_ASSIGNED) {
    byId("taskKind").value = TASK_KIND_REGULAR;
  }
  const kind = existingTask ? normalizeTaskKind(existingTask) : normalizeTaskKind(byId("taskKind").value || (canAssignTasks() ? TASK_KIND_ASSIGNED : TASK_KIND_REGULAR));
  const ownerId = byId("taskOwner").value;
  const canEditDetails = existingTask
    ? canEditTaskDetails(existingTask)
    : kind === TASK_KIND_ASSIGNED
      ? canAssignTasks()
      : canCreateRegularTasks();
  const reportLockedByQuality = !!existingTask && taskHasQualityPercent(existingTask);
  const canUpdateReport = existingTask ? !reportLockedByQuality && (canUpdateTaskProgress(existingTask) || canEditDetails) : canEditDetails;
  const statusUpdateLocked = isTaskStatusUpdateLocked(existingTask);
  const canEditQuality = canAssessTaskQualityForPerson(ownerId || existingTask?.ownerId, byId("taskStatus").value);
  const isReportOnly = !!existingTask && !canEditDetails && canUpdateTaskProgress(existingTask) && !reportLockedByQuality;
  byId("taskKind").value = kind;
  byId("taskKind").disabled = !!existingTask || !canAssignTasks();
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
  byId("taskAssignerLabel").value = existingTask?.assignedByName || existingTask?.createdBy || (kind === TASK_KIND_ASSIGNED && canAssignTasks() ? currentActorInfo().name : "");
  byId("taskForm")
    .querySelectorAll("#taskTitle, #taskProjectName, #taskOwner, #taskCategory, #taskWorkType, #taskRecurrence, #taskStartDate, #taskDue, #taskDueTime")
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  byId("taskNote").disabled = reportLockedByQuality || (!canEditDetails && !canUpdateReport);
  byId("taskCollaborators")
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  byId("taskCollaborators").classList.toggle("is-disabled", !canEditDetails);
  const collaboratorPicker = byId("taskCollaboratorPicker");
  if (collaboratorPicker) {
    collaboratorPicker.classList.toggle("is-disabled", !canEditDetails);
    collaboratorPicker.setAttribute("aria-disabled", String(!canEditDetails));
    if (!canEditDetails) setTaskCollaboratorPickerOpen(false);
  }
  if (statusUpdateLocked) {
    byId("taskStartDate").disabled = true;
    byId("taskDue").disabled = true;
    byId("taskDueTime").disabled = true;
  }
  if (isEmployee() && kind === TASK_KIND_REGULAR) {
    byId("taskOwner").disabled = true;
  }
  byId("taskStatus").disabled = !canUpdateReport || statusUpdateLocked;
  byId("taskForm")
    .querySelectorAll("#taskProgress, #taskAttachments")
    .forEach((input) => {
      input.disabled = !canUpdateReport;
    });
  const qualityInput = byId("taskQualityPercent");
  if (normalizeTaskStatus(byId("taskStatus").value) !== TASK_STATUS_COMPLETED) {
    qualityInput.value = "";
  }
  qualityInput.disabled = !canEditQuality;
  qualityInput.title = canEditQuality
    ? "Nhập tỷ lệ chất lượng sau khi công việc hoàn thành. Điểm thực hiện KPI = tỷ lệ này / 100."
    : "Chỉ Ban giám đốc, admin, Trưởng phòng/Phó phòng được nhập khi công việc ở trạng thái Hoàn thành.";
  byId("taskResponseStatus").disabled = !(kind === TASK_KIND_ASSIGNED && existingTask && !reportLockedByQuality && canReportTask(existingTask));
  byId("taskResponseNote").disabled = !(kind === TASK_KIND_ASSIGNED && existingTask && !reportLockedByQuality && canUpdateReport);
  if (reportLockedByQuality) {
    const progressMeta = byId("taskProgressMeta");
    if (progressMeta) {
      const baseText = progressMeta.dataset.baseText || progressMeta.textContent || "";
      progressMeta.textContent = `${baseText ? `${baseText} ` : ""}Công việc đã được đánh giá chất lượng, báo cáo tiến độ đã khóa.`;
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
  const isClosed = existingTask && normalizeTaskStatus(existingTask.status) === TASK_STATUS_CLOSED;
  const canEditDetails = existingTask ? !isClosed && canEditTaskDetails(existingTask) : canAssignTaskToPerson(byId("assignmentTaskOwner").value) || canAssignTasks();
  const reportLockedByQuality = !!existingTask && taskHasQualityPercent(existingTask);
  const canUpdateReport = existingTask ? !isClosed && !reportLockedByQuality && (canUpdateTaskProgress(existingTask) || canEditDetails) : canEditDetails;
  const statusUpdateLocked = isTaskStatusUpdateLocked(existingTask);
  const canEditQuality = !isClosed && canAssessTaskQualityForPerson(byId("assignmentTaskOwner").value || existingTask?.ownerId, byId("assignmentTaskStatus").value);
  byId("assignmentTaskAssignerLabel").value = existingTask?.assignedByName || existingTask?.createdBy || (canAssignTasks() ? currentActorInfo().name : "");
  byId("assignmentTaskForm")
    .querySelectorAll("#assignmentTaskTitle, #assignmentTaskProjectName, #assignmentTaskOwner, #assignmentTaskCollaborator, #assignmentTaskCategory, #assignmentTaskStartDate, #assignmentTaskDue, #assignmentTaskDueTime, #assignmentTaskNote")
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  if (statusUpdateLocked) {
    byId("assignmentTaskStartDate").disabled = true;
    byId("assignmentTaskDue").disabled = true;
    byId("assignmentTaskDueTime").disabled = true;
  }
  byId("assignmentTaskStatus").disabled = !canUpdateReport || statusUpdateLocked;
  byId("assignmentTaskForm")
    .querySelectorAll("#assignmentTaskProgress, #assignmentTaskAttachments")
    .forEach((input) => {
      input.disabled = !canUpdateReport;
    });
  const qualityInput = byId("assignmentTaskQualityPercent");
  if (normalizeTaskStatus(byId("assignmentTaskStatus").value) !== TASK_STATUS_COMPLETED) {
    qualityInput.value = "";
  }
  qualityInput.disabled = !canEditQuality;
  qualityInput.title = canEditQuality
    ? "Nhập tỷ lệ chất lượng sau khi công việc hoàn thành. Điểm thực hiện KPI = tỷ lệ này / 100."
    : "Chỉ Ban giám đốc, admin, Trưởng phòng/Phó phòng được nhập khi công việc ở trạng thái Hoàn thành.";
  const canRespondToAssignment = !!existingTask && !isClosed && !reportLockedByQuality && canReportTask(existingTask);
  const collaboratorProgressOnly = !!existingTask && !canEditDetails && canCollaborateTask(existingTask) && !canReportTask(existingTask);
  byId("assignmentTaskResponseStatus").disabled = !canRespondToAssignment;
  byId("assignmentTaskResponseNote").disabled = !(existingTask && !isClosed && !reportLockedByQuality && canUpdateReport);
  byId("assignmentTaskResponseNoteLabel").textContent = collaboratorProgressOnly ? "Báo cáo tiến độ mới" : "Nội dung phản hồi / Báo cáo tiến độ";
  byId("assignmentTaskResponseNote").placeholder = collaboratorProgressOnly
    ? "Nhập nội dung báo cáo tiến độ mới. Mỗi lần lưu sẽ tạo một dòng lịch sử riêng."
    : "Xác nhận nhận việc, lý do cần trao đổi hoặc báo cáo tiến độ thực hiện...";
  if (reportLockedByQuality) {
    const progressMeta = byId("assignmentTaskProgressMeta");
    if (progressMeta) {
      const baseText = progressMeta.dataset.baseText || progressMeta.textContent || "";
      progressMeta.textContent = `${baseText ? `${baseText} ` : ""}Công việc đã được đánh giá chất lượng, báo cáo tiến độ đã khóa.`;
    }
  }
  byId("assignmentTaskForm").querySelector("button[type='submit']").disabled = !canEditDetails && !canUpdateReport && !canEditQuality;
  byId("endAssignmentTask").classList.toggle("is-hidden", !canEndTaskAssignment(existingTask));
  byId("endAssignmentTask").disabled = !canEndTaskAssignment(existingTask);
}

function populateAssignmentTaskForm(task) {
  if (!task) return;
  byId("assignmentTaskId").value = task.id;
  byId("assignmentTaskTitle").value = task.title || "";
  byId("assignmentTaskProjectName").value = task.projectName || "";
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
  byId("taskKind").value = TASK_KIND_REGULAR;
  byId("taskTitle").value = copiedTaskTitle(task.title);
  byId("taskProjectName").value = task.projectName || "";
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
  byId("assignmentTaskProjectName").value = task.projectName || "";
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
  byId("assignmentTaskProjectName").value = "";
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

function endAssignmentTaskFromForm() {
  const task = state.tasks.find((item) => item.id === byId("assignmentTaskId").value);
  if (!task || !canEndTaskAssignment(task)) return;
  if (!confirm("Kết thúc công việc này? Công việc sẽ được đóng lại và không còn hiện thông báo quá hạn.")) return;
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
}

function populateDepartmentEvaluationForm(evaluation) {
  if (!evaluation) return;
  byId("deptEvalPeriod").value = evaluation.period;
  renderDepartmentEvaluationOptions(evaluation.departmentId);
  byId("deptEvalDepartment").value = evaluation.departmentId;
  renderDepartmentReporterOptions(evaluation.reporter || "");
  renderDepartmentReviewerOptions(evaluation.reviewer || "");
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
  byId("evalReviewer").value = evaluation.reviewer || "";
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
  byId("evalReviewer").value = existing?.reviewer || "";
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
    renderTaskBoard();
    switchView("tasks");
    if (task && isAssignedTask(task)) {
      renderTaskInboxDialog();
      byId("taskInboxDialog").classList.remove("is-hidden");
      byId("taskInboxDialog").setAttribute("aria-hidden", "false");
      if (canOpenTask(task)) {
        populateAssignmentTaskForm(task);
        const focusTarget = canAssessTaskQuality(task) && !canEditTaskDetails(task) && !canUpdateTaskProgress(task) ? byId("assignmentTaskQualityPercent") : byId("assignmentTaskNote");
        focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        focusTarget.focus({ preventScroll: true });
      }
    } else if (task && canOpenTask(task)) {
      populateTaskForm(task);
      focusEditForm("taskForm", canAssessTaskQuality(task) && !canEditTaskDetails(task) && !canUpdateTaskProgress(task) ? "taskQualityPercent" : canEditTaskDetails(task) ? "taskTitle" : "taskNote");
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
  const evaluation = state.evaluations.find((item) => item.id === evaluationId);
  if (!evaluation || !personIsVisible(evaluation.personId)) return;
  clearDashboardDrillFilters();
  populateEvaluationForm(evaluation);
  renderEvaluationTable();
  switchView("evaluations");
  focusEditForm("evaluationForm", "evalPeriod");
}

function openDashboardTaskDetail(taskId) {
  if (!taskId || !canAccessView("tasks")) return;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canViewTaskRecord(task)) return;
  clearDashboardDrillFilters();
  openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
}

function openDashboardDetail(action) {
  if (action === "people" && canAccessView("people")) {
    clearDashboardDrillFilters();
    renderPeopleTable();
    switchView("people");
    return;
  }
  if (action === "overdue" && canAccessView("tasks")) {
    byId("taskStatusFilter").value = "Quá hạn";
    byId("taskSearch").value = "";
    renderTaskBoard();
    switchView("tasks");
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

function renderAll() {
  applySystemCustomization();
  applyAccessControls();
  if (currentAccount()) ensureRecurringTasksForPeriod();
  byId("activePeriod").value = state.activePeriod;
  byId("evalPeriod").value = state.activePeriod;
  byId("deptEvalPeriod").value = state.activePeriod;
  renderDepartmentEvaluationOptions();
  renderPersonOptions();
  updateTaskFormLock();
  updateAssignmentTaskFormLock();
  renderAccountOptions();
  renderPeopleTable();
  renderBulletinBoard();
  renderArchiveOptions();
  renderArchive();
  renderTaskBoard();
  renderTaskInbox();
  loadDepartmentEvaluationForSelection();
  loadEvaluationForSelection();
  renderDepartmentEvaluationTable();
  renderEvaluationTable();
  renderDashboard();
  renderHistory();
  renderRules();
  renderModuleAccessControls();
  renderAccountTable();
  renderDirectCustomization();
  applyAccessControls();
}

function resetPersonForm() {
  byId("personForm").reset();
  byId("personId").value = "";
  renderDepartmentAndRoleOptions();
}

function resetTaskForm() {
  byId("taskForm").reset();
  byId("taskId").value = "";
  byId("taskKind").disabled = false;
  byId("taskKind").value = TASK_KIND_REGULAR;
  byId("taskProjectName").value = "";
  byId("taskCollaborators").innerHTML = "";
  setTaskCollaboratorPickerOpen(false);
  renderPersonOptions();
  byId("taskWorkType").value = TASK_WORK_TYPE_ROUTINE;
  byId("taskRecurrence").value = TASK_RECURRENCE_NONE;
  byId("taskProgress").value = 0;
  byId("taskQualityPercent").value = "";
  byId("taskStatus").value = TASK_STATUS_PREPARING;
  byId("taskStartDate").value = "";
  byId("taskDueTime").value = "";
  byId("taskAssignerLabel").value = "";
  byId("taskResponseStatus").value = "";
  byId("taskResponseNote").value = "";
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
        password: "123456",
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
      reporter: "Trưởng phòng mẫu",
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

// 🌟 Tự động kéo dữ liệu mây MỚI NHẤT ngay khi Đăng nhập thành công
byId("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const username = byId("loginUsername").value.trim().toLowerCase();
  const password = byId("loginPassword").value;
  const account = state.accounts.find((item) => String(item.username || "").toLowerCase() === username && item.password === password);
  
  if (!account) {
    byId("loginError").textContent = "Sai tài khoản hoặc mật khẩu.";
    return;
  }
  
  // 🌟 Lưu Username chuẩn hóa làm chìa khóa phiên
  localStorage.setItem(SESSION_KEY, account.username);
  byId("loginError").textContent = "";
  byId("loginForm").reset();
  
  saveState(); // 🌟 Lưu state ngay lập tức để F5 không bao giờ bị mất tài khoản
  renderAll();
  
  syncDataFromSupabase(); // Kéo mây ngầm
});

// 🌟 ĐỒNG BỘ SIÊU TỐC GIỮA CÁC TAB TRÌNH DUYỆT (0.1 giây)
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    reloadStateFromStorage();
    renderAll(); // Vẽ lại ngay khi tab khác thay đổi
  }
});

// ⏳ KÍCH HOẠT CHU KỲ ĐỒNG BỘ NỀN SUPABASE (3 GIÂY/LẦN BẮT TÍN HIỆU SIÊU NHANH)
syncDataFromSupabase(); 
setInterval(syncDataFromSupabase, 3000); // Đã giảm từ 8s xuống 3s
window.addEventListener("focus", syncDataFromSupabase);

byId("logoutButton").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  
  const loginElem = document.getElementById("loginScreen");
  if (loginElem) loginElem.style.display = "";
  
  renderAll();
  window.location.reload();
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

byId("toggleCustomizeMode").addEventListener("click", () => {
  setCustomizeMode(!customizeMode);
});

document.addEventListener("click", (event) => {
  if (!customizationEnabled()) return;
  if (event.target.closest("#taskCollaboratorPicker")) return;
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
  document.querySelectorAll(".is-customization-drop-target, .is-customization-drop-container-active").forEach((element) => {
    if (element !== dropTarget.target && element !== dropTarget.container) element.classList.remove("is-customization-drop-target", "is-customization-drop-container-active");
  });
  if (dropTarget.target) dropTarget.target.classList.add("is-customization-drop-target");
  dropTarget.container.classList.add("is-customization-drop-container-active");
  event.dataTransfer.dropEffect = "move";
});

document.addEventListener("dragleave", (event) => {
  const target = event.target.closest(".is-admin-customizable-field");
  if (target) target.classList.remove("is-customization-drop-target");
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
  };
  element.classList.add("is-customization-resizing");
  document.body.classList.add("is-customization-resizing");
});

document.addEventListener("pointermove", (event) => {
  if (!customizationResizeState) return;
  event.preventDefault();
  const nextWidth = clamp(customizationResizeState.startWidth + event.clientX - customizationResizeState.startX, 40, 2400);
  const nextHeight = clamp(customizationResizeState.startHeight + event.clientY - customizationResizeState.startY, 24, 1800);
  customizationResizeState.element.style.width = `${Math.round(nextWidth)}px`;
  customizationResizeState.element.style.height = `${Math.round(nextHeight)}px`;
});

document.addEventListener("pointerup", () => {
  if (!customizationResizeState) return;
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
  applyFieldCustomizations();
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
  renderAll();
  if (shouldAnimateDashboard && document.querySelector(".view.is-active")?.id === "dashboard") {
    renderDashboard({ animate: true });
  }
});

byId("bulletinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageBulletins()) {
    alert("Chỉ tài khoản admin được đăng tải, cập nhật hoặc chỉnh sửa tin bài.");
    return;
  }
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
  renderAll();
});

byId("resetBulletinForm").addEventListener("click", resetBulletinForm);
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
    if (!canManageBulletins()) return;
    const post = (state.bulletins || []).find((item) => item.id === editId);
    populateBulletinForm(post);
    focusEditForm("bulletinForm", "bulletinTitle");
    return;
  }
  if (deleteId && canManageBulletins() && confirm("Xóa tin bài này?")) {
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
  if (!canManageArchive()) {
    alert("Chỉ tài khoản admin được tải lên, chỉnh sửa hoặc xóa hồ sơ trong mục Lưu Trữ.");
    return;
  }
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
    taskId: byId("archiveTask").value,
    departmentEvaluationId: byId("archiveDepartmentEvaluation").value,
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
  renderAll();
});

byId("resetArchiveForm").addEventListener("click", resetArchiveForm);
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
    if (!canManageArchive()) return;
    populateArchiveForm(archiveById(editId));
    focusEditForm("archiveForm", "archiveTitle");
    return;
  }
  if (deleteId && canManageArchive() && confirm("Xóa hồ sơ lưu trữ này?")) {
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
byId("archiveDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("archiveDetailDialog")) {
    closeArchiveDetailDialog();
    return;
  }
  if (handleArchiveRelatedTarget(event)) {
    closeArchiveDetailDialog();
  }
});

byId("personDepartment").addEventListener("change", () => updateRoleOptions());
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
  const record = {
    id,
    name: byId("personName").value.trim(),
    gender: byId("personGender").value,
    departmentId: byId("personDepartment").value,
    roleId: byId("personRole").value,
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
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "Nhân sự",
    targetType: "person",
    targetId: id,
    personId: id,
    departmentId: auditedRecord.departmentId,
    title: auditedRecord.name,
    details: `${departmentById(auditedRecord.departmentId)?.name || ""} · ${roleById(auditedRecord.roleId)?.name || ""}`,
  });
  syncPersonnelAccounts();
  saveState();
  resetPersonForm();
  renderAll();
});

byId("resetPersonForm").addEventListener("click", resetPersonForm);

byId("accountPerson").addEventListener("change", () => {
  const person = personById(byId("accountPerson").value);
  if (person) byId("accountDepartment").value = person.departmentId;
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
  const username = ownOnly ? existing?.username || current?.username || "" : byId("accountUsername").value.trim();
  const duplicate = state.accounts.find((account) => account.username === username && account.id !== id);
  if (duplicate) {
    alert("Tên đăng nhập đã tồn tại.");
    return;
  }
  const role = ownOnly ? existing?.role : byId("accountRole").value;
  const personId = ownOnly ? existing?.personId || "" : byId("accountPerson").value;
  const linkedPerson = personById(personId);
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
    password: byId("accountPassword").value,
    displayName: ownOnly ? existing?.displayName || current?.displayName || "" : byId("accountDisplayName").value.trim(),
    role,
    personId,
    departmentId,
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
  let uploadedAttachments = [];
  try {
    uploadedAttachments = await readTaskAttachmentFiles(fileInput.files);
  } catch (error) {
    alert(error.message || "Không thể đọc hồ sơ đính kèm. Vui lòng thử lại.");
    return;
  }
  const preparedRecord = {
    ...record,
    attachments: [...draftAttachments, ...uploadedAttachments],
    customFields: collectCustomFieldValues("tasks", existingTask?.customFields),
  };
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
  const reportLockedByQuality = !!existingTask && taskHasQualityPercent(existingTask);
  const canUpdateReport = existingTask ? !reportLockedByQuality && canUpdateTaskProgress(existingTask) : false;
  if (reportLockedByQuality) {
    preparedRecord.status = existingTask.status;
    preparedRecord.progress = existingTask.progress;
    preparedRecord.attachments = existingTask.attachments || [];
    preparedRecord.note = existingTask.note || "";
  }
  const submittedQuality = normalizeTaskQualityInput(preparedRecord.qualityPercent);
  const priorQuality = existingTask ? normalizeTaskQualityInput(existingTask.qualityPercent) : "";
  const nextStatusForQuality = normalizeTaskStatus(preparedRecord.status);
  const canEditQuality = canAssessTaskQualityForPerson(preparedRecord.ownerId || existingTask?.ownerId, nextStatusForQuality);
  const nextQuality = nextStatusForQuality === TASK_STATUS_COMPLETED ? (canEditQuality ? submittedQuality : priorQuality) : "";
  const qualityChanged = String(nextQuality) !== String(priorQuality);
  const qualityAssessmentChanged = nextStatusForQuality === TASK_STATUS_COMPLETED && qualityChanged;
  preparedRecord.qualityPercent = nextQuality;
  if (!canEditDetails && !canUpdateReport && !canEditQuality) {
    alert("Tài khoản hiện tại không có quyền lưu hoặc cập nhật công việc này.");
    return;
  }
  if (!existingTask && !canEditDetails) {
    alert("Tài khoản hiện tại không có quyền tạo loại công việc này.");
    return;
  }
  if (recordKind === TASK_KIND_ASSIGNED && canEditDetails && !isAdmin() && !canAssignTaskToPerson(preparedRecord.ownerId)) {
    alert("Tài khoản hiện tại chỉ được giao việc trong phạm vi phân quyền.");
    return;
  }
  if (recordKind === TASK_KIND_ASSIGNED && normalizeTaskStatus(preparedRecord.status) === TASK_STATUS_CLOSED && (!existingTask || !canEndTaskAssignment(existingTask))) {
    alert("Chỉ người giao việc mới được kết thúc công việc này.");
    return;
  }
  if (recordKind === TASK_KIND_REGULAR && canEditDetails && !isAdmin() && !canCreateRegularTaskForPerson(preparedRecord.ownerId)) {
    alert("Tài khoản hiện tại chỉ được tạo/sửa công việc thường kỳ trong phạm vi được xem.");
    return;
  }
  if (existingTask && isTaskStatusUpdateLocked(existingTask)) {
    const statusChanged = normalizeTaskStatus(existingTask.status) !== normalizeTaskStatus(preparedRecord.status);
    const deadlineChanged = (existingTask.startDate || "") !== (preparedRecord.startDate || "") || (existingTask.due || "") !== (preparedRecord.due || "") || (existingTask.dueTime || "") !== (preparedRecord.dueTime || "");
    if (statusChanged || deadlineChanged) {
      alert("Công việc đã quá hạn quá 24 giờ. Chỉ Ban lãnh đạo hoặc admin được cập nhật lại trạng thái hoặc thời hạn hoàn thành.");
      return;
    }
  }

  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const ownerChanged = existingTask && existingTask.ownerId !== preparedRecord.ownerId;
  const detailsChanged =
    !existingTask ||
    ownerChanged ||
    normalizeTaskKind(existingTask) !== recordKind ||
    existingTask.title !== preparedRecord.title ||
    (existingTask.projectName || "") !== (preparedRecord.projectName || "") ||
    (existingTask.collaboratorId || "") !== (preparedRecord.collaboratorId || "") ||
    !samePersonIdList(taskCollaboratorIds(existingTask), taskCollaboratorIds(preparedRecord)) ||
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
        progressReports: ownerChanged ? [] : existingTask?.progressReports || [],
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
  mergedRecord.qualityPercent = nextQuality;
  if (nextStatusForQuality !== TASK_STATUS_COMPLETED) {
    mergedRecord.qualityAssessedAt = "";
    mergedRecord.qualityAssessedById = "";
    mergedRecord.qualityAssessedByName = "";
  } else if (qualityChanged) {
    mergedRecord.qualityAssessedAt = timestamp;
    mergedRecord.qualityAssessedById = actor.id;
    mergedRecord.qualityAssessedByName = actor.name;
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

  const progressChanged = existingTask && Number(existingTask.progress || 0) !== Number(mergedRecord.progress || 0);
  const statusChanged = existingTask && normalizeTaskStatus(existingTask.status) !== normalizeTaskStatus(mergedRecord.status);
  const progressReportNoteText = String(progressReportNote || "").trim();
  const shouldAppendProgressNote = !!progressReportNoteText && (!canEditDetails || progressReportNoteText !== (existingTask?.note || ""));
  if ((existingTask && !reportLockedByQuality && (canUpdateReport || canEditDetails)) && (shouldAppendProgressNote || progressChanged || statusChanged || uploadedAttachments.length)) {
    mergedRecord.progressReports = [
      ...(mergedRecord.progressReports || []),
      {
        id: uid("task-report"),
        progress: mergedRecord.progress,
        status: normalizeTaskStatus(mergedRecord.status),
        note: shouldAppendProgressNote ? progressReportNoteText : "Cập nhật tiến độ công việc.",
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      },
    ];
  }

  const previousStatus = normalizeTaskStatus(existingTask?.status);
  const nextStatus = normalizeTaskStatus(mergedRecord.status);
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
    return;
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
    details: `${taskKindLabels[recordKind]}${recordKind === TASK_KIND_REGULAR ? ` · ${taskWorkMeta(auditedRecord)}` : ""}${projectMeta} · ${owner?.name || "Chưa rõ người nhận"}${collaboratorMeta} · ${normalizeTaskStatus(auditedRecord.status)} · hoàn thành ${formatTaskDeadline(auditedRecord) || "chưa có"}${taskHasQualityPercent(auditedRecord) ? ` · chất lượng ${formatScore(taskQualityPercentValue(auditedRecord))}%` : ""}`,
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
    return;
  }
  resetCallback();
  renderAll();
}

byId("taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveTaskRecord(
    {
      id: byId("taskId").value || uid("task"),
      kind: TASK_KIND_REGULAR,
      title: byId("taskTitle").value.trim(),
      projectName: byId("taskProjectName").value.trim(),
      ownerId: byId("taskOwner").value,
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
});

byId("assignmentTaskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveTaskRecord(
    {
      id: byId("assignmentTaskId").value || uid("task"),
      kind: TASK_KIND_ASSIGNED,
      title: byId("assignmentTaskTitle").value.trim(),
      projectName: byId("assignmentTaskProjectName").value.trim(),
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
});

byId("resetTaskForm").addEventListener("click", resetTaskForm);
byId("resetAssignmentTaskForm").addEventListener("click", resetAssignmentTaskForm);
byId("endAssignmentTask").addEventListener("click", endAssignmentTaskFromForm);
byId("taskKind").addEventListener("change", () => {
  renderPersonOptions();
  updateTaskCategoryOptions();
  updateTaskFormLock();
});
byId("taskOwner").addEventListener("change", () => {
  byId("taskCategory").value = "";
  updateTaskCollaboratorOptions();
  updateTaskCategoryOptions();
  updateTaskFormLock();
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
  const picker = byId("taskCollaboratorPicker");
  if (!isTaskCollaboratorPickerOpen() || picker?.contains(event.target)) return;
  setTaskCollaboratorPickerOpen(false);
});
byId("taskStatus").addEventListener("change", () => {
  updateTaskFormLock();
});
byId("assignmentTaskOwner").addEventListener("change", () => {
  byId("assignmentTaskCategory").value = "";
  updateTaskCategoryOptions("", "assignmentTaskOwner", "assignmentTaskCategory");
  updateAssignmentTaskFormLock();
});
byId("assignmentTaskStatus").addEventListener("change", () => {
  updateAssignmentTaskFormLock();
});
byId("taskSearch").addEventListener("input", debounce(renderTaskBoard, 200));
byId("taskStatusFilter").addEventListener("change", renderTaskBoard);
document.querySelectorAll("[data-scroll-page]").forEach((button) => button.addEventListener("click", () => {
  const scrollRoot = document.scrollingElement || document.documentElement;
  const top = button.dataset.scrollPage === "bottom" ? scrollRoot.scrollHeight : 0;
  window.scrollTo({ top, behavior: "smooth" });
}));
byId("taskInboxButton").addEventListener("click", openTaskInboxDialog);
byId("closeTaskInbox").addEventListener("click", closeTaskInboxDialog);
byId("taskInboxDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskInboxDialog")) {
    closeTaskInboxDialog();
  }
});
byId("taskInboxList").addEventListener("click", (event) => {
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
byId("closeTaskDetail").addEventListener("click", closeTaskDetailDialog);
byId("taskDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("taskDetailDialog")) {
    closeTaskDetailDialog();
  }
});
byId("taskStatusDetailList").addEventListener("click", (event) => {
  const taskId = event.target.closest("[data-open-status-task]")?.dataset.openStatusTask;
  if (!taskId) return;
  closeTaskStatusDetailDialog();
  openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
});
byId("closeKpiTaskDetail").addEventListener("click", closeKpiTaskDetailDialog);
byId("kpiTaskDetailDialog").addEventListener("click", (event) => {
  if (event.target === byId("kpiTaskDetailDialog")) {
    closeKpiTaskDetailDialog();
  }
});
byId("kpiTaskDetailList").addEventListener("click", (event) => {
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
byId("assignmentTaskAttachmentList").addEventListener("click", (event) => {
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
  const assessId = event.target.closest("[data-assess-task]")?.dataset.assessTask;
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
  if (assessId) {
    const task = state.tasks.find((item) => item.id === assessId);
    if (!task || !canAssessTaskQuality(task)) return;
    if (isAssignedTask(task)) {
      renderTaskInboxDialog();
      byId("taskInboxDialog").classList.remove("is-hidden");
      byId("taskInboxDialog").setAttribute("aria-hidden", "false");
      populateAssignmentTaskForm(task);
      byId("assignmentTaskQualityPercent").scrollIntoView({ behavior: "smooth", block: "center" });
      byId("assignmentTaskQualityPercent").focus({ preventScroll: true });
      return;
    }
    populateTaskForm(task);
    focusEditForm("taskForm", "taskQualityPercent");
  }
  if (deleteId && confirm("Xóa công việc này?")) {
    registerDeletedId(deleteId); // 🔥 THÊM DÒNG NÀY Ở ĐÂY
    const task = state.tasks.find((item) => item.id === deleteId);
    if (!task || !canDeleteTask(task)) return;
    const owner = personById(task.ownerId);
    state.tasks = state.tasks.filter((item) => item.id !== deleteId);
    syncPersonalEvaluationTaskScoresForTask(null, task);
    logActivity({
      action: "Xóa",
      module: "Công việc",
      targetType: "task",
      targetId: deleteId,
      personId: task.ownerId,
      departmentId: owner?.departmentId || "",
      period: taskPeriod(task),
      title: task.title,
      details: `${owner?.name || "Chưa rõ người nhận"} · ${normalizeTaskStatus(task.status)}`,
      score: `${formatScore(task.progress)}%`,
    });
    saveState();
    renderAll();
  }
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
  if (!existing && !canReportData) {
    alert("Chưa có số liệu KPI phòng để xác nhận.");
    return;
  }
  const reporter = byId("deptEvalReporter").value.trim();
  if (canReportData && !isValidDepartmentReporterName(departmentId, reporter)) {
    alert("Người báo cáo phải là Trưởng phòng hoặc Phó phòng của phòng được chọn.");
    return;
  }
  const reviewer = byId("deptEvalReviewer").value.trim();
  if (canConfirm && reviewer && !isValidDepartmentReviewerName(reviewer)) {
    alert("Người xác nhận phải thuộc Ban giám đốc.");
    return;
  }
  const result = canReportData
    ? calculateDepartmentEvaluationFromForm()
    : {
        criteriaScores: existing?.criteriaScores || {},
        criteriaScore: existing?.criteriaScore || existing?.finalScore || 0,
        adjustmentType: normalizeDepartmentAdjustmentType(existing?.adjustmentType),
        adjustmentPoints: existing?.adjustmentPoints || 0,
        adjustmentScore: existing?.adjustmentScore || 0,
        rewardDisciplineNote: existing?.rewardDisciplineNote || "",
        finalScore: existing?.finalScore || 0,
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
    reporter: canReportData ? reporter : existing?.reporter || "",
    reviewer: canConfirm ? reviewer : existing?.reviewer || "",
    comment: canConfirm ? byId("deptEvalComment").value.trim() : existing?.comment || "",
    customFields: collectCustomFieldValues("department-evaluations", existing?.customFields),
  }, existing);
  if (existing) Object.assign(existing, record);
  else state.departmentEvaluations.push(record);
  if (canReportData) syncIndividualScoresForDepartment(period, departmentId, result.finalScore);
  logActivity({
    action: existing ? "Cập nhật" : "Tạo",
    module: "KPI phòng",
    targetType: "departmentEvaluation",
    targetId: record.id,
    departmentId,
    period,
    title: departmentById(departmentId)?.name || "Phòng",
    details: [
      record.reporter ? `Báo cáo: ${record.reporter}` : "",
      record.reviewer ? `Xác nhận: ${record.reviewer}` : "",
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
      details: [evaluation.reporter ? `Báo cáo: ${evaluation.reporter}` : "", evaluation.reviewer ? `Xác nhận: ${evaluation.reviewer}` : "", evaluation.comment || ""].filter(Boolean).join(" · "),
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
  const departmentEvaluation = person ? latestDepartmentEvaluation(person.departmentId, period) : null;
  if (!departmentEvaluation) {
    alert("Chưa có KPI phòng cho nhân sự/kỳ này. Vui lòng nhập KPI phòng trước khi lưu KPI cá nhân.");
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
  const canEditReviewer = canEditBase && !isEmployee();
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
    reviewer: canEditReviewer ? byId("evalReviewer").value.trim() : existing?.reviewer || "",
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
    byId("evalReviewer").value = evaluation.reviewer || "";
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

byId("taskBehaviorLinks").addEventListener("click", (event) => {
  const taskId = event.target.closest("[data-task-behavior-link]")?.dataset.taskBehaviorLink;
  if (!taskId) return;
  openHistoryTimelineTarget({ targetType: "task", targetId: taskId });
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
  return exported;
}

byId("exportData").addEventListener("click", async () => {
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
  if (!isAdmin()) {
    event.target.value = "";
    alert("Chỉ tài khoản admin được nhập dữ liệu JSON.");
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const flags = getSyncFlags();
    flags.isSyncing = true; // Khóa luồng quét ngầm trong lúc gộp

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
      state.accounts = ensureDefaultAccounts(mergedAccounts);

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
      
      // Bắn file Master siêu nhẹ lên Supabase
      await backupDataToSupabase();
      
      renderAll();
      alert("🎉 Đã gộp dữ liệu thành công và tự động đồng bộ lên Mây cho tất cả các máy trạm!");

    } catch (error) {
      alert(`Không thể nhập dữ liệu: ${error.message}`);
    } finally {
      flags.isSyncing = false;
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
syncDataFromSupabase(); // Quét dữ liệu trên mây ngay lập tức khi mở trang
setInterval(syncDataFromSupabase, 2000); // Cứ 8 giây tự động quét ngầm một lần
window.addEventListener("focus", syncDataFromSupabase); // Quét lại khi người dùng chuyển tab quay lại phần mềm

// Kịch bản kích hoạt Service Worker chạy Offline ngầm của trình duyệt
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
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
