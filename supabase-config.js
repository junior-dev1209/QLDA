window.PHUC_THINH_SUPABASE = {
  // Example: https://abcdefghijk.supabase.co
  projectUrl: "https://hqquobfaccxnydeyvioe.supabase.co",
  // Use only the publishable/anon key. Never put the service_role key in this file.
  publishableKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcXVvYmZhY2N4bnlkZXl2aW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjQyNzksImV4cCI6MjA5OTYwMDI3OX0.R2uEbDHMgIquUMI8ESvD_fNxya1KtLGcCVMfgYC_VJk",
};
// 🌟 KHỞI TẠO KẾT NỐI SUPABASE CLIENT (BẮT BUỘC PHẢI CÓ ĐOẠN NÀY)
if (window.supabase && typeof window.supabase.createClient === "function") {
  window.supabaseClient = window.supabase.createClient(
    window.PHUC_THINH_SUPABASE.projectUrl,
    window.PHUC_THINH_SUPABASE.publishableKey
  );
  console.log("✅ Đã kết nối Supabase Cloud thành công!");
} else {
  console.warn("⚠️ Chưa nạp được thư viện Supabase SDK từ CDN.");
}
