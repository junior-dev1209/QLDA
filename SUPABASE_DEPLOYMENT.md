# Trien khai Supabase Cloud

## Ban 2026.10.21.1 SAFE: bao ve xoa du lieu va Admin cuoi cung

Edge Function `kpi-sync` chan cac patch xoa toan bo `people`, `tasks` hoac `accounts` khi collection con du lieu; chan xoa tu 25% tro len doi voi cac collection trong nhom nay khi co it nhat 8 ban ghi; giu nguong bao ve chung cho cac collection duoc bao ve khac. Neu patch lam so tai khoan Admin dang hoat dong tu lon hon 0 ve 0, server tu choi thay doi. Cac thao tac bi chan ghi log `[SAFE_MUTATION_BLOCKED]` chi gom ID tai khoan tac dong, ly do va so luong ban ghi, khong ghi noi dung ban ghi hay thong tin dang nhap.

Ban SAFE giu nguyen cac chuc nang cua v3.4.14 va su dung deployment version `2026.10.21.1`. Sau khi deploy, chay ` .\Deploy-KpiSync.ps1 -CheckOnly` de xac nhan phien ban va cac kiem tra san co. Nen sao luu du lieu truoc khi deploy; khong chay migration neu chua kiem tra trang thai migration.

## Kien truc

Ung dung dung Supabase theo luong sau:

`Trinh duyet -> Edge Function kpi-sync -> Postgres + Storage private kpi-files`

## Ban 2026.10.19.1: phan quyen tai khoan va danh muc du an

Admin la tai khoan duy nhat duoc tao, sua va xoa tai khoan; Ban giam doc van xem duoc danh sach tai khoan nhung khong the gui lenh ghi/xoa truc tiep. Ban giam doc duoc xem Danh muc du an trong muc Cong viec o che do chi doc. Chuc nang In bao cao tong hop chi hien va chay duoc voi Admin. Nut Nap du lieu mau va ham tao du lieu mau da duoc go khoi bo ma ung dung.

Khi phat hanh, deploy Edge Function truoc giao dien de quyen tai khoan moi duoc ap dung o may chu truoc khi nguoi dung nhan ban frontend moi.

## Ban 2026.10.15.1: phuc hoi trang thai duyet hoan thanh

May chu va giao dien doi chieu ban ghi cong viec voi lan danh gia hoan thanh gan nhat trong lich su. Chi khi lich su co ket qua `Dat` kem danh gia chat luong hop le, he thong moi khoi phuc trang thai `Dat`, chat luong, nguoi duyet va moc hoan thanh cho ban ghi hien tai. Viec nay xu ly du lieu da bi may chu phien cu tra ve `Cho danh gia` du da tung duyet thanh cong, khong tu suy dien tu ghi chu thuong va khong xoa lich su truy vet.

Cong viec o trang thai `Hoan thanh` duoc chuan hoa tien do `100%` o ca giao dien va may chu. Nhu vay khong the phat sinh lai truong hop `Hoan thanh 0%`; cong viec co bang chung da duyet `Dat` se khong tiep tuc nam trong danh sach Cho phe duyet hoan thanh. Giao dien chi chay phuc hoi tu dong sau khi endpoint cong bo phien ban toi thieu `2026.10.15.1`, tranh ghi du lieu vao may chu cu.

## Ban 2026.10.14.1: cong viec dinh ky va trang thai thong bao

Cong viec dinh ky hang ngay, hang tuan, hang thang va hang quy duoc ghi nhan **Nguoi tao** theo dung Nguoi thuc hien cua tung ky. Quy tac nay ap dung ca khi he thong tu sinh ky moi va khi nguoi co quyen khoi tao mau dinh ky cho nhan su khac. Neu nhan su da ban giao mau dinh ky, cac ky phat sinh sau ngay hieu luc se ghi nhan nguoi tiep quan. Ban ghi dinh ky cu se hien thi theo Nguoi thuc hien va duoc may chu chuan hoa lai o lan cap nhat hop le ke tiep.

Trung tam thong bao da bo sung dong bo day du trang thai **da doc/an** cua nhac viec den han va qua han. Nguoi nhan tai lai trang, dang nhap lai hoac dong bo sang thiet bi khac van giu dung trang thai da xac nhan. Trinh duyet chi gui xac nhan len Edge Function khi endpoint trang thai cong bo ro `notifications: true` va phien ban toi thieu `2026.10.14.1`; neu may chu cu hoac dang gian doan, giao dien giu trang thai cuc bo an toan va tu dong dung lai sau khi may chu moi da duoc deploy.

## Ban 2026.10.09.1: dieu hanh quy trinh GPMB trong Cong viec

Quy trinh GPMB duoc dua hoan toan vao muc **Cong viec** va lien ket truc tiep voi danh sach cong viec. Moi dot GPMB co 16 buoc nghiep vu, gan voi mot du an, nguoi phu trach va danh sach nguoi phoi hop cho tung buoc. Admin, Ban giam doc, Truong bo phan/Truong nhom, Truong phong va Pho phong duoc thao tac quy trinh; nhan vien khong nhan du lieu va khong thay khu vuc nay.

Edge Function la noi dieu hanh trang thai: chi khi cong viec cua buoc dang thuc hien da chuyen `Hoan thanh` va duoc danh gia `Dat` (`completionReviewStatus = passed`), may chu moi danh dau buoc do hoan thanh va sinh duy nhat mot cong viec cho buoc ke tiep. Ma cong viec duoc dinh danh theo dot va buoc, nen dong bo lai, thao tac dong thoi hoac tai lai trinh duyet khong the tao trung cong viec. Nhap nguoi phoi hop dung tich chon, khong phu thuoc Ctrl. Nhanh co the bat/tat khi van con buoc chua phat sinh; nhiem vu da phat sinh duoc giu lai de bao toan lich su. Chi Ban giam doc va Admin duoc dieu chinh thoi han cua buoc chua phat sinh; Admin co quyen dieu chinh cao nhat.

Migration `20261007000000_gpmb_workflows.sql` tao bang `gpmb_workflows` bat RLS va khong cap quyen truy cap truc tiep. Bang nay la ban phan chieu cua lenh duoc Edge Function chap nhan; `kpi_shared_state` duoc giu tam thoi de tuong thich voi du lieu hien co. Khi cap nhat ban nay, bat buoc chay `Deploy-KpiSync.cmd` de day ca migration va Function, sau do kiem tra `action=status` tra `gpmbWorkflows: true` va `deploymentVersion: 2026.10.09.1`.

## Ban 2026.10.02.1: trung tam thong bao

He thong co trung tam thong bao chung trong o tai khoan tren thanh dieu khien. Chuong mau do hien so thong bao chua doc; moi tai khoan chi nhan thong bao cua chinh minh. Nguoi dung co the mo danh sach, loc theo Cong viec/Lich, danh dau da doc, an tung thong bao va bat thong bao trinh duyet neu chu dong dong y.

May chu sinh thong bao khi giao viec, cap nhat tien do, chuyen sang cho danh gia, danh gia Dat/Khong dat. Canh bao den han va qua han duoc suy dien lai tu cong viec hien hanh, nen khong bi mat khi mot lan dong bo dang gian doan. Lich cong viec dung cung trung tam nay, toast nhanh chi hien o goc duoi ben trai va khong con lap lai toast cu. Bang `notifications` chi do Edge Function ghi; nguoi nhan chi duoc cap nhat trang thai da doc/an cua thong bao hop le cua minh. Migration `20261002000000_kpi_notifications.sql` phai duoc ap dung truoc khi deploy Function.

## Ban 2026.09.30.1: nghi viec va ban giao

Khong xoa cung nhan su dang co lich su nghiep vu. Trong muc **Nhan su**, nguoi co quyen quan ly dung **Ban giao** de chon nguoi tiep quan theo tung cong viec, ngay hieu luc va ghi chu. Toan bo cong viec chua ket thuc cua nguoi nghi duoc kiem tra lai tren may chu va chuyen nguyen tu cho dung nguoi duoc chon tren tung dong; co the ban giao cac cong viec khac nhau cho nhieu nguoi. Du lieu cu, KPI, bao cao tien do va nhat ky van thuoc ho so cu de truy vet.

Tai khoan duoc lien ket voi nhan su nghi viec bi khoa va moi phien dang nhap dang con hieu luc bi thu hoi. Khong the lien ket tai khoan moi voi ho so da nghi hoac tam ngung. Mau cong viec dinh ky cung luu moc ban giao: cac ky phat sinh tu ngay hieu luc se giao cho nguoi duoc chon cua tung mau; neu chua co nguoi tiep quan, he thong khong tao ky moi cho nhan su da nghi.

Xoa vinh vien chi con duoc may chu chap nhan voi ho so khong co bat ky tham chieu nghiep vu hoac tai khoan lien ket nao.

## Ban va 2026.09.24.1

Ban nay bao ve cong viec du lieu cu khong co `createdAt`, `createdBy` hoac `createdById`: khi nguoi thuc hien, nguoi phoi hop hoac cap quan ly co quyen cap nhat tien do, Edge Function giu nguyen thong tin nguon goc dang thieu thay vi coi viec cap nhat la thay doi nguoi tao. Nguon goc cua cong viec da ton tai la bat bien trong lenh cap nhat; chi cong viec moi duoc may chu gan thong tin tao tu phien dang nhap. Vi vay quyen cap nhat van duoc kiem tra o may chu, nhung cong viec cu van co the chuyen trang thai hop le.

Edge Function giu service key o phia may chu, quan ly phien dang nhap cua ung dung va khong tra mat khau tai khoan ve trinh duyet. Trinh duyet chi dung `Project URL` va `publishable key`.

Tu phien ban nay, trinh duyet gui cac thay doi theo tung ban ghi (nhan su, cong viec, KPI, ban tin, ho so, tai khoan). Function kiem tra phan quyen tren may chu va hop nhat cac thay doi doc lap; hai nguoi cap nhat hai ban ghi khac nhau se khong ghi de nhau. Du lieu moi duoc kiem tra sau toi da 15 giay, ngay khi mo lai tab, va sau moi lan luu.

Phien ban `2026.09.18.2` tiep tuc chuyen doi an toan sang mo hinh du lieu theo ban ghi. Cac bang `people`, `tasks`, `task_progress_reports`, `evaluations`, `kpi_catalog` va `activity_log` duoc khoi tao va phan chieu sau moi lenh da duoc may chu cho phep. Moi dong co `version`; lenh van kiem tra gia tri goc cua ban ghi va phan quyen tai Edge Function truoc khi ghi. `kpi_shared_state` tam thoi duoc giu lam lop tuong thich trong giai doan chuyen doi, do do du lieu hien co va giao dien dang van hanh khong bi mat hay phai nhap lai. Danh muc KPI cua Admin duoc cap nhat bang lenh rieng nguyen tu tren may chu, khong di qua ban va trang thai chung nen khong bi tu choi chi vi mot thiet bi khac vua dong bo du lieu khong lien quan. Mot phan hoi xac thuc bat thuong duoc kiem tra lai rieng truoc khi dang xuat; loi mang va loi tam thoi cua may chu khong duoc phep xoa phien dang lam viec. Ban nay bo sung chot ky KPI co truy vet ly do dieu chinh va truong dieu hanh cong viec (muc uu tien, moc cap nhat, tro ngai, phu thuoc) trong cung luong dong bo co kiem tra phien ban. Edge Function tu dong xoa co phan hoi hoan thanh khong hop le neu cong viec chua o trang thai `Hoan thanh`; chi cong viec da `Hoan thanh` moi co the chuyen sang `pending` de cho danh gia. Neu bang du lieu theo ban ghi bi cham mot phien ban do ghi bi gian doan, endpoint trang thai se tu phan chieu lai tu trang thai may chu truoc khi bao ket qua dong bo. Lich cong viec duoc dong bo theo tung cuoc hop, kiem tra phien ban ban ghi va quyen thao tac truoc khi ghi; may chu chi tra danh ba gom ten, phong va vi tri de chon thanh phan tham du. Lich co ket luan da tao cong viec se khong duoc phep xoa de giu lien ket theo doi. Moi lich co the bat hoac tat nhac rieng; may chu chi chap nhan gia tri boolean va giu mac dinh bat nhac voi lich cu. Mat khau hien co duoc tu dong chuyen sang PBKDF2 co muoi khi dang nhap thanh cong hoac khi tai khoan duoc luu lai; he thong khong ep doi mat khau va khong tra gia tri xac thuc ve trinh duyet.

Moi tai khoan online chi co mot phien hop le. Khi dang nhap tren thiet bi moi, may chu thu hoi token cua thiet bi cu theo mot giao dich; thiet bi cu se tu dong tro ve man hinh dang nhap trong lan goi may chu tiep theo. Quy tac nay chi ap dung khi co ket noi Supabase; che do `file://` la mot ban kiem thu doc lap va khong the dong bo/thu hoi phien giua cac may.

## Trien khai

1. Mo PowerShell tai thu muc goc du an, dang nhap va lien ket dung du an Supabase. CLI co the hoi mat khau database cua du an khi lien ket:

```powershell
.\Deploy-KpiSync.cmd -Login
.\tools\supabase-cli\supabase.exe link --project-ref hqquobfaccxnydeyvioe
```

Tep `.cmd` tu chay PowerShell voi pham vi `ExecutionPolicy Bypass` cho rieng mot lenh, khong thay doi chinh sach bao mat cua Windows. Script dung Supabase CLI da duoc dat trong `tools\supabase-cli`, khong phu thuoc lenh `supabase` toan cuc hay bien moi truong `PATH`. Lan dau, `-Login` yeu cau dang nhap Supabase. `-CheckOnly` kiem tra CLI va xac nhan may chu da thuc su chay phien ban `2026.10.19.1`. Khi deploy binh thuong, script tu lien ket du an neu can, chay `db push` truoc khi deploy Function; dung `-SkipDatabaseMigrations` chi khi migration da duoc ap dung thu cong.

Neu can dung Supabase CLI cua may tinh thay vi script, cai CLI va dang nhap:

```powershell
supabase login
supabase link --project-ref <project-ref>
```

2. Day migration truoc de tao/cap nhat bang Postgres, bucket private va ham cap nhat nguyen tu. `Deploy-KpiSync.cmd` se tu dong thuc hien buoc nay; khi can chay thu cong, dung:

```powershell
.\tools\supabase-cli\supabase.exe db push
```

3. Deploy Edge Function va xac nhan phien ban may chu:

```powershell
.\Deploy-KpiSync.cmd
.\Deploy-KpiSync.cmd -CheckOnly
```

4. Cau hinh CORS cho domain dang chay ung dung. Thay domain mau bang domain that, khong them dau `/` o cuoi:

```powershell
supabase secrets set KPI_ALLOWED_ORIGIN=https://ten-mien-cua-ban
```

Voi du an Supabase moi chua co du lieu trung tam, dat tai khoan khoi tao trong Secret truoc khi deploy. Khong dat mat khau mac dinh trong ma nguon:

```powershell
supabase secrets set KPI_BOOTSTRAP_ADMIN_USERNAME=ten-admin KPI_BOOTSTRAP_ADMIN_PASSWORD='MatKhauManh!2026'
```

4. Deploy Edge Function. Can deploy lai buoc nay sau khi cap nhat ma dong bo:

```powershell
supabase functions deploy kpi-sync
```

5. Mo `supabase-config.js` va dien hai gia tri lay tu Supabase Dashboard, Settings > API:

```js
window.PHUC_THINH_SUPABASE = {
  projectUrl: "https://<project-ref>.supabase.co",
  publishableKey: "sb_publishable_...",
};
```

Khong dien `service_role`, `secret key` hoac chuoi ket noi database vao `supabase-config.js`. Service key chi duoc dung ben trong Edge Function. Supabase cung cap cac bien moi truong nay cho Edge Function; secrets tuy chinh duoc quan ly qua Dashboard hoac CLI. [Supabase secrets](https://supabase.com/docs/guides/functions/secrets)

6. Tai lai website de service worker nhan cache moi, sau do dang nhap bang `admin / 123456` va Nhap JSON tu may dang co du lieu goc. Lan nhap dau tien tao dong du lieu trung tam tren Postgres.

7. Dang nhap tren mot may thu hai. Du lieu, tin bai, PDF, media va ho so phai hien thi tu Supabase.

## Xuat va nhap du lieu JSON tach tep

- Nut `Xuat JSON` cua Admin mo hop chon nhom du lieu. Co the chon mot, nhieu, hoac ca bon nhom: Bang tin, Luu tru, Nhan su va Tai khoan, va du lieu Cong viec/KPI/he thong con lai.
- Khi khoi phuc toan bo du lieu, chon ca bon tep trong cung hop thoai Nhap JSON. Co the nhap tung tep rieng khi chi can bo sung mot nhom du lieu.
- Tep JSON cu dang gom tat ca du lieu van duoc ho tro va can chon mot minh trong hop thoai nhap.
- Viec tach tep chi ap dung cho sao luu va trao doi du lieu. Tren Supabase, trang thai van duoc dong bo atomically de tranh xung dot khi nhieu tai khoan cung su dung.

## Bao ve du lieu Nhan su va Tai khoan

- Tep `people-data.js` chi dung de khoi tao lan dau khi chay cuc bo. Khi co cau hinh Supabase, du lieu Nhân sự va Tài khoản luon duoc lay tu may chu va khong bao gio bi tep Excel goc ghi de.
- Tai khoan mac dinh chi duoc tao khi khoi tao trang thai moi. He thong khong tu dong them lai tai khoan ma Admin da sua hoac xoa tren may chu.
- Sau khi deploy ban nay, Admin can Nhap tep `Nhan su va Tai khoan` moi nhat mot lan neu du lieu tren may chu da tung bi ghi de truoc do. Sau lan nhap nay, tat ca may se nhan cung mot du lieu tu Supabase.

## Kiem thu sau khi deploy

1. Dang nhap admin tren may A va mot nhan vien tren may B. Cap nhat hai cong viec hoac KPI khac nhau gan nhu cung luc; ca hai thay doi phai duoc giu lai.
2. Thu sua cung mot cong viec tren hai may. May luu sau khong duoc ghi de ket qua may truoc; he thong chi thong bao thay doi do bi tu choi va van dong bo cac thay doi hop le khac.
3. Dang nhap bang tai khoan nhan vien va kiem tra API `state`: chi co ho so, KPI cua minh, KPI phong va cong viec duoc phep xem; khong co toan bo tai khoan, nhan su va lich su he thong.
4. Doi mat khau tai khoan nhan vien, dang xuat va dang nhap lai bang mat khau moi.
5. Tai mot tep 6 MB, sau do mo tep tren may thu hai. Tep qua 10 MB phai bi Function tu choi.
6. Dang nhap Admin tren may A va mot tai khoan khac tren may B. Trong muc `Tai khoan`, phan `Tai khoan truc tuyen` cua Admin phai hien thi tai khoan B trong vong toi da 45 giay. Dong tab B, tai khoan nay se tu an sau khoang 2 phut. Kiem tra bo loc phong va ba danh sach chua dang nhap theo ngay/tuan/thang, cung lich su hoat dong hang thang theo phong.
7. Tren may A, tao hoac cap nhat cong viec co tep dinh kem, cho dong bo hoan tat, sau do mo chi tiet cong viec va tai tep tu may B. Tep dinh kem cong viec phai hien thi va tai duoc tren ca hai may.
8. Ngat mang may A, cap nhat mot cong viec va giu nguyen tab. Ket noi lai mang; thay doi phai tu dong duoc day len may chu trong thoi gian ngan, khong can tai lai trang. Kiem tra ket qua tren may B.
9. Dang nhap bang tai khoan khac tren cung trinh duyet sau khi may A da co thay doi dang cho dong bo. He thong phai luu ban sao du phong cua thay doi cu va khong duoc phep day thay doi do bang phien cua tai khoan moi.
10. Dang nhap cung mot tai khoan tren may A, sau do dang nhap tai khoan do tren may B. Tai khoan tren may B phai vao binh thuong; may A phai tu tro ve man hinh dang nhap khi tab duoc mo lai, tai lai, hoac gui/nhan du lieu. Khong may nao duoc mat du lieu may chu trong qua trinh nay.

## Giam sat tai khoan truc tuyen

- Chi Admin xem duoc danh sach tai khoan dang hoat dong, so tai khoan da su dung he thong duy nhat trong ngay va trong thang.
- Trinh duyet gui nhiep hoat dong moi 45 giay khi tab dang hien thi. Tai khoan khong co nhiep trong 2 phut se duoc xem la offline.
- Thong ke ngay/thang tinh theo gio Viet Nam. Bo dem `Dang nhap hom nay` tinh moi tai khoan mot lan khi dang nhap hoac su dung phien hop le trong ngay, ke ca khi trinh duyet khoi phuc phien dang nhap tu ngay truoc; danh sach truc tuyen khong bao gio tra ve mat khau.
- Admin co them danh sach chi tiet tai khoan chua dang nhap theo ngay, tuan, thang va bo loc theo tung phong. Du lieu nay chi tai khi mo hoac lam moi muc `Tai khoan`, khong nam trong chu ky 45 giay.
- Lich su hoat dong he thong luu va hien thi 12 thang gan nhat: so tai khoan da dang nhap, tong so tai khoan dang hoat dong, luot dang nhap va thong ke tung phong. Phien ban `2026.08.13.2` bo sung thong ke luot truy cap theo tung ngay trong 31 ngay gan nhat, luot truy cap trong ngay/thang dang xem va bo loc theo phong; truy van duoc tong hop tai Postgres, khong tai toan bo nhat ky dang nhap ve Edge Function. Du lieu dang nhap duoc giu toi da 400 ngay.
- Migration `20260723000000_kpi_account_presence.sql`, `20260804000000_kpi_login_activity_summary.sql`, `20260807000000_kpi_daily_account_activity.sql`, `20260813000000_kpi_daily_visit_summary.sql`, `20260825000000_kpi_record_tables_and_single_session.sql` va Edge Function `kpi-sync` phai duoc deploy cung phien ban giao dien nay. Phien ban `2026.09.18.2` dung dang nhap thong thuong va bao ve du lieu trung tam: chi kiem tra tai khoan, mat khau va trang thai vo hieu hoa; khong yeu cau mat khau manh, khong tu dong doi hay thay the mat khau da luu, khong tu khoa sau nhieu lan nhap sai. Mat khau dang o dang cu se duoc chuyen sang PBKDF2 co muoi ngay sau lan dang nhap thanh cong, khong can nguoi dung doi mat khau. Thiet bi khong co anh goc dong bo tin cay khong the gui lenh xoa; may chu chan xoa hang loat va khong bao gio tu dong khoi tao tu du lieu cuc bo. Khi may chu that su rong, chi Admin moi co the khoi phuc mot cach tuong minh tu ban JSON da kiem tra. Danh muc KPI duoc cap nhat bang lenh rieng nguyen tu, chi chap nhan cho Admin va chi ghi cac truong danh muc can thiet; dong bo bat ky tu thiet bi khac khong con lam tu choi thay doi danh muc. Phien cua mot tai khoan van chi co mot thiet bi, nhung duoc gia han khi thiet bi do van hoat dong va chi bi xoa sau khi may chu xac nhan lai token khong con hop le. Cac bang du lieu theo ban ghi va mot phien duy nhat cho moi tai khoan duoc kich hoat sau khi migration nay da duoc ap dung. May chu chi chap nhan co `pending` khi trang thai cong viec la `Hoan thanh`.

## Bao mat va van hanh

- Bucket `kpi-files` la private. Tep cong viec/ho so chi tai qua Edge Function sau khi co phien hop le. Cac bang va bucket kho phat hanh ma cu co the giu lai de tranh thao tac xoa du lieu khong can thiet, nhung Edge Function khong con cung cap API doc, tai len hoac kich hoat ma nguon.
- Bang `kpi_shared_state`, `kpi_sync_sessions`, `people`, `tasks`, `task_progress_reports`, `evaluations`, `kpi_catalog`, `activity_log`, `notifications` va `gpmb_workflows` bat RLS va khong cap quyen truy cap truc tiep cho `anon` hoac `authenticated`. Chi Edge Function dung service key truy cap duoc.
- Edge Function dung custom session de tuong thich voi tai khoan hien co. Phan quyen duoc kiem tra lai o Function: admin toan quyen; ban giam doc/truong-pho phong theo pham vi duoc giao; nhan vien chi cap nhat cong viec, KPI va mat khau cua minh trong pham vi cho phep. State tra ve cho nhan vien/truong-pho phong duoc loc theo ca nhan/phong ban; khong coi viec an nut tren giao dien la co che bao mat.
- Cac thay doi cung mot ban ghi duoc kiem tra theo gia tri goc. Neu mot nguoi da sua truoc, thay doi cu cua may con lai bi tu choi, du lieu hop le khac van tiep tuc dong bo. Trinh duyet luu ban sao JSON du phong khi co thay doi bi tu choi.
- Tep dinh kem Cong viec duoc luu trong bucket private `kpi-files`, tuong tu media Bang tin va tep Luu tru. Gioi han la 2 MB moi tep va 5 MB cho tong tep dinh kem cua mot cong viec de giu dong bo on dinh tren nhieu thiet bi.
- Khi mang gian doan, trinh duyet luu thay doi theo tai khoan trong IndexedDB va thu dong bo lai voi do tre tang dan, co ngau nhien nhe de tranh nhieu may dong loat gui lai du lieu. Khong dang nhap bang tai khoan khac tren cung trinh duyet truoc khi thay doi hien tai da dong bo xong.
- Khi cap nhat giao dien, upload dong bo bo tep tinh moi len hosting. Giu nguyen ma phien ban trong `index.html`, `script.js`, `manifest.webmanifest` va `service-worker.js`; upload `.htaccess` o web root neu hosting dung Apache. Uu tien deploy nguyen tu; neu hosting chi cho phep ghi de tep, upload `styles.css`, `people-data.js`, `supabase-config.js`, `script.js`, `manifest.webmanifest`, icon va `assets/` truoc, sau do moi upload `index.html` va `service-worker.js`. Khong chen mot lan tai lai giua quy trinh. HTML va service worker phai co `Cache-Control: no-store`; tai nguyen co tham so `?v=` co the cache dai han. Khi thay doi Edge Function hoac migration Supabase, deploy lai `kpi-sync` bang `Deploy-KpiSync.cmd`.
- `KPI_ALLOWED_ORIGIN` phai la domain that cua he thong. Khong de `*` khi dua vao van hanh chinh thuc. Neu co ca domain www va khong www, khai bao cach nhau bang dau phay.
- Dang nhap dung co che thong thuong: tai khoan dang hoat dong va mat khau dung se vao he thong ngay. Khong co bo dem tu khoa trinh duyet, gioi han theo IP hay ma xac thuc offline theo thiet bi.
- Phien dang nhap co hieu luc toi da 12 gio va chi mot thiet bi co the giu phien hop le cho mot tai khoan. Dang nhap tren thiet bi moi se ket thuc phien tren thiet bi cu; nguoi dung khong can doi mat khau khi chuyen thiet bi.
- Khong su dung tai khoan/mac dinh trong tep giao dien. Neu du an trung tam chua khoi tao, khai bao `KPI_BOOTSTRAP_ADMIN_USERNAME` va `KPI_BOOTSTRAP_ADMIN_PASSWORD` trong Secret. Mat khau khoi tao nay khong bi he thong bat buoc phai doi sau dang nhap.
- Khi da dung Supabase, khong can cong khai thu muc `api/` tren hosting. Day la API PHP du phong va phai duoc bao ve rieng neu van su dung.
- Khi upload giao dien tinh, chi dua cac tep can chay nhu `.htaccess`, `index.html`, `styles.css`, `script.js`, `people-data.js`, `supabase-config.js`, `service-worker.js`, `manifest.webmanifest`, `assets/` va icon. Khong dua `backup-before-*`, `tmp/`, `tools/`, tai lieu noi bo hay du lieu sao luu vao web root.
- `activityLog` duoc gioi han 5.000 dong gan nhat de tranh phinh to JSON trung tam va Function tu ghi them dau vet dong bo co thoi gian, tai khoan thuc hien.
- Sao luu dinh ky Postgres va bucket `kpi-files`. Ban sao luu database khong tu dong bao gom tep Storage. [Supabase Database](https://supabase.com/docs/guides/database/overview)

## Kiem tra loi nhanh

- `401` tu Function: kiem tra da deploy `supabase/config.toml` voi `verify_jwt = false`; Function tu xac thuc bang phien `x-kpi-session`.
- `CORS`: kiem tra secret `KPI_ALLOWED_ORIGIN` dung chinh xac domain cua website.
- `500` hoac `Khong the tai thong ke su dung`: chay `supabase db push` de tao bang `kpi_account_daily_activity` va ham `kpi_login_activity_summary`, sau do deploy lai `kpi-sync`.
- `500`: xem Edge Function Logs tren Supabase Dashboard va kiem tra migration da chay thanh cong.
- `500` kem `PGRST205` hoac thong bao khong tim thay `public.kpi_shared_state`: bang dong bo trung tam chua duoc tao. Mo `SQL Editor` trong Supabase, chay lan luot noi dung hai file migration `supabase/migrations/20260716000000_kpi_cloud.sql` va `supabase/migrations/20260723000000_kpi_account_presence.sql`, sau do deploy lai `kpi-sync`.
- Du lieu khong dong bo: kiem tra `projectUrl`, `publishableKey`, secret `KPI_ALLOWED_ORIGIN` va Function URL `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`.
- Sau khi sua hoac import JSON, mo Edge Function Logs de kiem tra khong co `Permission denied` ngoai du kien. Chi admin nen Nhap JSON; thuc hien ngoai gio nhap lieu de tranh canh tranh du lieu khong can thiet.

## Chay tep cuc bo

- Khi mo `index.html` truc tiep tu may tinh, he thong dung du lieu tai khoan co san trong bo tep va kiem tra ten dang nhap/mat khau binh thuong.
- Ban tep cuc bo dung de kiem thu; du lieu sua tren ban nay khong tu dong dong bo voi Supabase. Ban online can ket noi mang de dang nhap va dong bo du lieu trung tam.

## Khoi phuc dang nhap Admin

Khi toan bo tai khoan deu bao sai mat khau, dat lai secret khoi phuc va deploy Function bang mot lenh trong PowerShell tai thu muc goc du an:

```powershell
.\Recover-AdminPassword.ps1 -Login -Username admin -Password 'MatKhauMoi!2026'
```

Sau khi lenh hoan tat, dang nhap Admin bang mat khau vua dat. Lenh chi dat lai mat khau cua tai khoan Admin co ten dang nhap trung khop; cac tai khoan va du lieu khac khong bi xoa. Khi da khoi phuc xong, co the go secret khoi phuc neu khong con can dung:

```powershell
.\tools\supabase-cli\supabase.exe secrets unset KPI_BOOTSTRAP_ADMIN_USERNAME KPI_BOOTSTRAP_ADMIN_PASSWORD --project-ref hqquobfaccxnydeyvioe
```

## Phuc hoi khi JSON cham hoac mat sau khi tai lai trang

Phien ban giao dien co co che luu du phong trang thai va diem dong bo trong IndexedDB cua trinh duyet. Du lieu da nhap duoc giu lai tren may dang nhap ngay ca khi ket noi Supabase bi gian doan; khi ket noi phuc hoi, he thong tu dong dong bo lai thay vi nap ban rong tu may chu de ghi de du lieu cuc bo.

Sau khi cap nhat ma, can deploy lai Edge Function de nhan truong `deletedIds` va cac sua loi dong bo:

```powershell
supabase functions deploy kpi-sync
```

Quy trinh khoi tao hoac phuc hoi du lieu trung tam:

1. Mo phien ban moi, dang nhap Admin tren may dang co ban JSON day du va moi nhat.
2. Neu may chu rong, he thong hien canh bao va khong tu dong tai bat ky du lieu cuc bo nao. Tai khoan Admin chon Nhap JSON, chon tep JSON day du (it nhat Nhan su - Tai khoan va Van hanh), sau do xac nhan khoi phuc trung tam.
3. Kiem tra `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`. Sau khi hoan tat, `initialized` phai la `true`, `revision` lon hon `0`, `deploymentVersion` la `2026.10.19.1`, `storageModel` la `record-projection-transition`, `singleDeviceSession`, `credentialHashing`, `calendarEvents`, `notifications` va `gpmbWorkflows` la `true`, `recordProjection.available` va `recordProjection.synchronized` la `true`, `releaseUpdates` la `false` va `originRestricted` la `true`.
4. Dang nhap tren may thu hai, tai lai trang va kiem tra du lieu van con day du.

Neu ket qua `status` co `initialized: false` hoac `revision: 0`, Postgres trung tam chua co du lieu va tat ca may khac se chi nhan trang thai rong. Ban giao dien khong bao gio tu khoi tao hoac dong bo ban sao cuc bo len may chu trong truong hop do. Chi Admin dang nhap tren may co ban sao JSON da kiem tra moi duoc phep chon Nhap JSON va xac nhan khoi phuc. Khong tao du lieu moi, khong thao tac tu may khac va khong dung tep JSON thieu nhom Nhan su - Tai khoan hoac Van hanh truoc khi hoan tat khoi phuc.

Tep tren 10 MB khong the di qua Edge Function hien tai. He thong van dong bo cac du lieu khac va danh dau tep can xu ly, khong de mot tep qua lon lam dung toan bo viec nhap JSON.
