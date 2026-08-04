# Trien khai Supabase Cloud

## Kien truc

Ung dung dung Supabase theo luong sau:

`Trinh duyet -> Edge Function kpi-sync -> Postgres kpi_shared_state + Storage private kpi-files, kpi-releases`

Edge Function giu service key o phia may chu, quan ly phien dang nhap cua ung dung va khong tra mat khau tai khoan ve trinh duyet. Trinh duyet chi dung `Project URL` va `publishable key`.

Tu phien ban nay, trinh duyet gui cac thay doi theo tung ban ghi (nhan su, cong viec, KPI, ban tin, ho so, tai khoan). Function kiem tra phan quyen tren may chu va hop nhat cac thay doi doc lap; hai nguoi cap nhat hai ban ghi khac nhau se khong ghi de nhau. Du lieu moi duoc kiem tra sau toi da 10 giay, ngay khi mo lai tab, va sau moi lan luu.

## Trien khai

1. Cai Supabase CLI va dang nhap:

```powershell
supabase login
supabase link --project-ref <project-ref>
```

2. Day migration tao bang Postgres, bucket private va ham cap nhat nguyen tu:

```powershell
supabase db push
```

3. Cau hinh CORS cho domain dang chay ung dung. Thay domain mau bang domain that, khong them dau `/` o cuoi:

```powershell
supabase secrets set KPI_ALLOWED_ORIGIN=https://ten-mien-cua-ban
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

## Kho phat hanh ma nguon

- Migration `20260803000000_kpi_code_releases.sql` tao bang `kpi_app_releases`, bucket private `kpi-releases` va ham kich hoat goi ma nguyen tu. Migration nay phai duoc day truoc khi su dung Trung tam cap nhat.
- Edge Function `kpi-sync` phien ban co `release-current`, `release-list`, `release-create`, `release-file`, `release-activate` va `release-delete`. Chi phien Admin co the tao, tai tep, kich hoat hoac xoa ban nhap.
- Hosting can duoc cap nhat **mot lan** voi `release-bootstrap.js` va `service-worker.js` moi. Sau do, Admin cap nhat cac tep giao dien duoc phep ngay trong `Cau hinh he thong` > `Trung tam cap nhat`; khong can tai lai tep ma giao dien len hosting cho moi phien ban.
- Goi dau tien phai day du cac tep bat buoc. Goi sau tu sao chep tep cua goi dang kich hoat, chi can tai len tep da thay doi. Tep cua goi active khong the bi ghi de.
- Neu goi moi loi, mo he thong voi tham so `?release-base=1`, dang nhap Admin va kich hoat lai goi da luu tru on dinh.

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

## Giam sat tai khoan truc tuyen

- Chi Admin xem duoc danh sach tai khoan dang hoat dong, so tai khoan dang nhap duy nhat trong ngay va trong thang.
- Trinh duyet gui nhiep hoat dong moi 45 giay khi tab dang hien thi. Tai khoan khong co nhiep trong 2 phut se duoc xem la offline.
- Thong ke ngay/thang tinh theo gio Viet Nam va chi tinh cac tai khoan dang nhap thanh cong; danh sach truc tuyen khong bao gio tra ve mat khau.
- Admin co them danh sach chi tiet tai khoan chua dang nhap theo ngay, tuan, thang va bo loc theo tung phong. Du lieu nay chi tai khi mo hoac lam moi muc `Tai khoan`, khong nam trong chu ky 45 giay.
- Lich su hoat dong he thong luu va hien thi 12 thang gan nhat: so tai khoan da dang nhap, tong so tai khoan dang hoat dong, luot dang nhap va thong ke tung phong. Truy van duoc tong hop tai Postgres, khong tai toan bo nhat ky dang nhap ve Edge Function. Du lieu dang nhap duoc giu toi da 400 ngay.
- Migration `20260723000000_kpi_account_presence.sql`, `20260804000000_kpi_login_activity_summary.sql` va Edge Function `kpi-sync` phai duoc deploy cung phien ban giao dien nay. Phien ban `2026.08.04.2` dong bo quyen cap nhat cong viec giua giao dien va may chu, dong thoi ngan viec chuyen media cu cua nguoi chi co quyen xem thanh thay doi bi tu choi.

## Bao mat va van hanh

- Bucket `kpi-files` va `kpi-releases` la private. Tep cong viec/ho so chi tai qua Edge Function sau khi co phien hop le; tep ma cua goi active chi duoc Edge Function phuc vu theo ID bat bien cua goi da kich hoat.
- Bang `kpi_shared_state` va `kpi_sync_sessions` bat RLS va khong cap quyen truy cap truc tiep cho `anon` hoac `authenticated`. Chi Edge Function dung service key truy cap duoc.
- Edge Function dung custom session de tuong thich voi tai khoan hien co. Phan quyen duoc kiem tra lai o Function: admin toan quyen; ban giam doc/truong-pho phong theo pham vi duoc giao; nhan vien chi cap nhat cong viec, KPI va mat khau cua minh trong pham vi cho phep. State tra ve cho nhan vien/truong-pho phong duoc loc theo ca nhan/phong ban; khong coi viec an nut tren giao dien la co che bao mat.
- Cac thay doi cung mot ban ghi duoc kiem tra theo gia tri goc. Neu mot nguoi da sua truoc, thay doi cu cua may con lai bi tu choi, du lieu hop le khac van tiep tuc dong bo. Trinh duyet luu ban sao JSON du phong khi co thay doi bi tu choi.
- Tep dinh kem Cong viec duoc luu trong bucket private `kpi-files`, tuong tu media Bang tin va tep Luu tru. Gioi han la 2 MB moi tep va 5 MB cho tong tep dinh kem cua mot cong viec de giu dong bo on dinh tren nhieu thiet bi.
- Khi mang gian doan, trinh duyet luu thay doi theo tai khoan trong IndexedDB va thu dong bo lai voi do tre tang dan, co ngau nhien nhe de tranh nhieu may dong loat gui lai du lieu. Khong dang nhap bang tai khoan khac tren cung trinh duyet truoc khi thay doi hien tai da dong bo xong.
- Sau khi cai dat kho phat hanh, thay doi giao dien thuong quy duoc tai len bang Trung tam cap nhat. Chi can deploy lai Edge Function khi thay doi backend, migration Supabase, giao thuc kho phat hanh hoac trinh khoi dong `release-bootstrap.js`.
- `KPI_ALLOWED_ORIGIN` phai la domain that cua he thong. Khong de `*` khi dua vao van hanh chinh thuc. Neu co ca domain www va khong www, khai bao cach nhau bang dau phay.
- `activityLog` duoc gioi han 5.000 dong gan nhat de tranh phinh to JSON trung tam va Function tu ghi them dau vet dong bo co thoi gian, tai khoan thuc hien.
- Sao luu dinh ky Postgres va bucket `kpi-files`. Ban sao luu database khong tu dong bao gom tep Storage. [Supabase Database](https://supabase.com/docs/guides/database/overview)

## Kiem tra loi nhanh

- `401` tu Function: kiem tra da deploy `supabase/config.toml` voi `verify_jwt = false`; Function tu xac thuc bang phien `x-kpi-session`.
- `CORS`: kiem tra secret `KPI_ALLOWED_ORIGIN` dung chinh xac domain cua website.
- `500` hoac `Khong the tai thong ke su dung`: chay `supabase db push` de tao ham `kpi_login_activity_summary`, sau do deploy lai `kpi-sync`.
- `500`: xem Edge Function Logs tren Supabase Dashboard va kiem tra migration da chay thanh cong.
- `500` kem `PGRST205` hoac thong bao khong tim thay `public.kpi_shared_state`: bang dong bo trung tam chua duoc tao. Mo `SQL Editor` trong Supabase, chay lan luot noi dung hai file migration `supabase/migrations/20260716000000_kpi_cloud.sql` va `supabase/migrations/20260723000000_kpi_account_presence.sql`, sau do deploy lai `kpi-sync`.
- Du lieu khong dong bo: kiem tra `projectUrl`, `publishableKey`, secret `KPI_ALLOWED_ORIGIN` va Function URL `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`.
- Sau khi sua hoac import JSON, mo Edge Function Logs de kiem tra khong co `Permission denied` ngoai du kien. Chi admin nen Nhap JSON; thuc hien ngoai gio nhap lieu de tranh canh tranh du lieu khong can thiet.

## Su dung ngoai tuyen

- Tai khoan can dang nhap thanh cong khi co mang it nhat mot lan tren chinh thiet bi do. He thong luu ma xac thuc PBKDF2 mot chieu, khong luu mat khau, va cho phep dang nhap ngoai tuyen trong toi da 7 ngay.
- Khi Admin dang nhap online, may Admin se nhan ma xac thuc mot chieu cua cac tai khoan dang hoat dong. Sau do co the ngat mang va dang xuat/de thu nghiem quyen cua tung tai khoan tren chinh may nay; mat khau cua cac tai khoan khong duoc gui ve trinh duyet.
- Khi mat mang, du lieu da tai ve va cac thay doi moi van duoc luu tren trinh duyet. Phien cuc bo duoc giu lai khi token dong bo bi mat do don dep cache; dang nhap online lai se thiet lap lai ket noi dong bo may chu.
- Tai khoan chua tung dang nhap online tren thiet bi, tai khoan bi khoa trong ban du lieu da luu, hoac ma xac thuc da qua 7 ngay se khong the dang nhap ngoai tuyen.

## Phuc hoi khi JSON cham hoac mat sau khi tai lai trang

Phien ban giao dien co co che luu du phong trang thai va diem dong bo trong IndexedDB cua trinh duyet. Du lieu da nhap duoc giu lai tren may dang nhap ngay ca khi ket noi Supabase bi gian doan; khi ket noi phuc hoi, he thong tu dong dong bo lai thay vi nap ban rong tu may chu de ghi de du lieu cuc bo.

Sau khi cap nhat ma, can deploy lai Edge Function de nhan truong `deletedIds` va cac sua loi dong bo:

```powershell
supabase functions deploy kpi-sync
```

Quy trinh khoi tao hoac phuc hoi du lieu trung tam:

1. Mo phien ban moi, dang nhap Admin tren may dang co JSON moi nhat.
2. Nhap cac tep JSON can khoi phuc va cho thong bao da dong bo len may chu thanh cong. Neu thong bao dang cho dong bo, giu may mo va ket noi mang on dinh; khong nhap them tep khac trong luc nay.
3. Kiem tra `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`. Sau khi hoan tat, `initialized` phai la `true`, `revision` lon hon `0`, `deploymentVersion` la `2026.08.04.2`, `releaseUpdates` la `true` va `originRestricted` la `true`.
4. Dang nhap tren may thu hai, tai lai trang va kiem tra du lieu van con day du.

Neu ket qua `status` co `initialized: false` hoac `revision: 0`, Postgres trung tam chua co du lieu va tat ca may khac se chi nhan trang thai rong. Ban giao dien nay khong con ghi de am tham du lieu cuc bo trong truong hop do: khi Admin dang nhap tren may dang luu day du du lieu va mat khau tai khoan, he thong se tu khoi tao may chu. Neu may do chi con ban du lieu da loc hoac da an mat khau, dang nhap Admin va Nhap JSON day du de khoi phuc; khong tao du lieu moi truoc khi hoan tat buoc nay.

Tep tren 10 MB khong the di qua Edge Function hien tai. He thong van dong bo cac du lieu khac va danh dau tep can xu ly, khong de mot tep qua lon lam dung toan bo viec nhap JSON.
