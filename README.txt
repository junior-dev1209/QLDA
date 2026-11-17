UNG DUNG QUAN LY HIEU QUA CONG VIEC
Ban Quan ly Du an Dau tu - Ha tang xa Phuc Thinh

Chay va kiem thu offline tren Windows:
1. Mo file QTNS_v1.bat de khoi dong bang trinh duyet mac dinh.
2. Hoac mo truc tiep file index.html.
3. Khi mo tu tep cuc bo (file://), he thong dung che do kiem thu doc lap: khong tu dong dong bo hay ghi de du lieu online.
4. Dang nhap kiem thu bang tai khoan `admin` va mat khau `123456`. Cac tai khoan lanh dao mau `giamdoc`, `phogiamdoc1`, `phogiamdoc2`, `phogiamdoc3` dung cung mat khau `123456`.
5. Ban file:// dung co che dang nhap thong thuong, khong can khoi tao ma xac thuc theo thiet bi, khong can mo mang truoc va khong tu khoa sau nhieu lan nhap sai.
6. Du lieu offline chi luu tren trinh duyet cua may dang test va khong tu dong dong bo len he thong online. Khong dung ban file:// de nhap lieu van hanh chinh thuc.

Trien khai online dung chung du lieu:
1. Khuyen dung Supabase Cloud: Postgres luu du lieu theo ban ghi, Storage luu tep dinh kem va Edge Function lam API dong bo.
2. Chay migration va deploy Edge Function trong thu muc supabase, sau do dien Project URL va publishable key vao supabase-config.js.
3. Mo website tren may co du lieu goc, dang nhap admin va Nhap JSON mot lan dau tien.
4. Cac may/di dong khac dang nhap cung dia chi se tai du lieu tu Supabase va tu dong dong bo sau moi lan luu. Moi tai khoan online chi dung tren mot thiet bi tai mot thoi diem; dang nhap o thiet bi moi se tu dang xuat thiet bi cu.

Xem SUPABASE_DEPLOYMENT.md de trien khai Supabase. ONLINE_DEPLOYMENT.md chi ap dung cho API PHP du phong khi supabase-config.js de trong.

Bao mat tai khoan:
- Tai khoan mau chi duoc nap khi mo tep `index.html` truc tiep tu may tinh; ban online luon xac thuc tu may chu trung tam.
- He thong khong ap dung yeu cau mat khau manh bat buoc. Mat khau hien co duoc giu nguyen; khi tao hoac doi mat khau, nguoi dung dat theo quy dinh noi bo.
- Phien online tu het han sau 12 gio; can dang nhap lai de tiep tuc su dung.
- Tai khoan tu tao kem ho so nhan su moi dung mat khau khoi tao `123456`; Admin hoac nguoi dung co the doi khi can.
- Neu toan bo tai khoan online bao sai mat khau, chay `Recover-AdminPassword.ps1` theo huong dan trong `SUPABASE_DEPLOYMENT.md` de dat lai mat khau Admin ma khong xoa du lieu.

Phan quyen:
- Admin: xem toan bo du lieu, tong hop so lieu, in/xuat bao cao; khong sua phieu KPI va khong quan ly tai khoan.
- Nhan vien: chi vao cham KPI ca nhan cua minh, xem lich su KPI ca nhan va KPI phong minh.
- Truong phong: cham KPI ca nhan cua minh va nhan vien trong phong minh quan ly, xem lich su ca nhan va phong minh.
- Ban giam doc: toan quyen xem, nhap, danh gia, quan ly tai khoan va du lieu.
- Nhan vien/truong phong khong duoc sua hoac xoa ket qua khac thang hien tai.

Chuc nang chinh:
- Quan ly nhan su theo phong, vi tri, gioi tinh, ngay sinh, dia chi cu tru, loai hop dong, ngay ky hop dong, trinh do chuyen mon, thoi han hop dong, he so luong, bac luong, thoi diem xet nang luong.
- Da nap san 115 ho so nhan su tu file Excel danh sach Ban Quan ly Dau tu - Ha tang Phuc Thinh; ung dung tu ghep vao du lieu hien co mot lan, khong ghi de ho so da co cung ho ten va ngay sinh.
- Muc Nhan su co o tim kiem nhanh theo ten, phong, vi tri, dien thoai, trinh do, dia chi va thong tin hop dong/luong.
- Quan ly cong viec, han xu ly, trang thai, tien do.
- KPI phong co mot tieu chi "Hoan thanh ke hoach" trong so 100. Ke hoach tu tong hop toan bo cong viec cua phong trong ky; Thuc hien chi tinh cong viec Hoan thanh da duoc danh gia Dat. Nguoi dieu chinh diem chi dung de cong/tru thi dua, khen thuong hoac ky luat khi can.
- Cham KPI ca nhan theo bo trong so cua tung vi tri; nhap so ke hoach va so thuc hien, ung dung tu tinh ty le hoan thanh va diem KPI theo cong thuc Thuc hien/Ke hoach x Trong so, gioi han 120%.
- Tinh KPI tong theo cong thuc: KPI ca nhan x 80% + KPI phong x 20% + diem khen thuong/ky luat/tac phong.
- KPI ca nhan tu lay diem KPI phong tu cong viec trong ky, khong phu thuoc vao xac nhan; ket qua duoc tong hop truc tiep tren Tong quan.
- Xem lich su KPI va cong viec theo tung phong ban hoac tung nhan vien.
- Dang nhap va phan quyen tai khoan theo nhan vien, truong phong, ban giam doc.
- Ho tro dang ky tai khoan nhan vien moi tu man hinh dang nhap va lien ket voi ho so nhan su da co.
- Khi dang nhap hoac khoi phuc phien, he thong tu chon ky danh gia moi nhat co du lieu KPI hoac cong viec, nhung khong vuot qua thang hien tai.
- Cac o trong Tong quan co the bam de mo danh sach/lien ket chi tiet tuong ung.
- Tong quan co bieu do phan loai xep hang KPI ca nhan theo ky danh gia; bam tung phan loai de mo popup tong hop nhan su cua dung phan loai do, bao gom ca nhom "Chua cham".
- Cac popup chi tiet trong Tong quan va chi tiet cong viec deu co nut Xuat Excel; tep xuat bam dung du lieu dang hien thi.
- In bao cao theo tuy chon tung muc: Tong quan, Nhan su, Cong viec, KPI phong, KPI ca nhan, Lich su, Quy che, Tai khoan neu co quyen.
- Mau in/PDF duoc can le A4 ngang, co dau trang bao cao, bang bieu ro mau, bo cuc gon va han che tran/chong cheo noi dung.
- Dinh dang thoi gian hien thi thong nhat la ngay/thang/nam; cac ky theo thang duoc hien thi bang ngay dau thang.
- Ho tro PWA de trien khai online va dung tren nhieu nen tang thiet bi.
- He thong khong ho tro cap nhat ma nguon truc tiep trong giao dien. Moi cap nhat duoc trien khai dong bo bo tep tinh tren hosting va Edge Function theo huong dan SUPABASE_DEPLOYMENT.md de dam bao on dinh.
- Xep loai ca nhan, tong quan phong ban, canh bao qua han, de xuat khen thuong.
- In bao cao va xuat/nhap du lieu JSON.
