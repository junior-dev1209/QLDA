# Trien khai Supabase Cloud

## Kien truc

Ung dung dung Supabase theo luong sau:

`Trinh duyet -> Edge Function kpi-sync -> Postgres kpi_shared_state + Storage private kpi-files`

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
6. Dang nhap Admin tren may A va mot tai khoan khac tren may B. Trong muc `Tai khoan`, phan `Tai khoan truc tuyen` cua Admin phai hien thi tai khoan B trong vong toi da 45 giay. Dong tab B, tai khoan nay se tu an sau khoang 2 phut.

## Giam sat tai khoan truc tuyen

- Chi Admin xem duoc danh sach tai khoan dang hoat dong, so tai khoan dang nhap duy nhat trong ngay va trong thang.
- Trinh duyet gui nhiep hoat dong moi 45 giay khi tab dang hien thi. Tai khoan khong co nhiep trong 2 phut se duoc xem la offline.
- Thong ke ngay/thang tinh theo gio Viet Nam va chi tinh cac tai khoan dang nhap thanh cong; danh sach truc tuyen khong bao gio tra ve mat khau.
- Migration `20260723000000_kpi_account_presence.sql` va Edge Function `kpi-sync` phai duoc deploy cung phien ban giao dien nay.

## Bao mat va van hanh

- Bucket `kpi-files` la private; client chi tai tep qua Edge Function sau khi co phien hop le.
- Bang `kpi_shared_state` va `kpi_sync_sessions` bat RLS va khong cap quyen truy cap truc tiep cho `anon` hoac `authenticated`. Chi Edge Function dung service key truy cap duoc.
- Edge Function dung custom session de tuong thich voi tai khoan hien co. Phan quyen duoc kiem tra lai o Function: admin toan quyen; ban giam doc/truong-pho phong theo pham vi duoc giao; nhan vien chi cap nhat cong viec, KPI va mat khau cua minh trong pham vi cho phep. State tra ve cho nhan vien/truong-pho phong duoc loc theo ca nhan/phong ban; khong coi viec an nut tren giao dien la co che bao mat.
- Cac thay doi cung mot ban ghi duoc kiem tra theo gia tri goc. Neu mot nguoi da sua truoc, thay doi cu cua may con lai bi tu choi, du lieu hop le khac van tiep tuc dong bo. Trinh duyet luu ban sao JSON du phong khi co thay doi bi tu choi.
- `KPI_ALLOWED_ORIGIN` phai la domain that cua he thong. Khong de `*` khi dua vao van hanh chinh thuc. Neu co ca domain www va khong www, khai bao cach nhau bang dau phay.
- `activityLog` duoc gioi han 5.000 dong gan nhat de tranh phinh to JSON trung tam va Function tu ghi them dau vet dong bo co thoi gian, tai khoan thuc hien.
- Sao luu dinh ky Postgres va bucket `kpi-files`. Ban sao luu database khong tu dong bao gom tep Storage. [Supabase Database](https://supabase.com/docs/guides/database/overview)

## Kiem tra loi nhanh

- `401` tu Function: kiem tra da deploy `supabase/config.toml` voi `verify_jwt = false`; Function tu xac thuc bang phien `x-kpi-session`.
- `CORS`: kiem tra secret `KPI_ALLOWED_ORIGIN` dung chinh xac domain cua website.
- `500`: xem Edge Function Logs tren Supabase Dashboard va kiem tra migration da chay thanh cong.
- Du lieu khong dong bo: kiem tra `projectUrl`, `publishableKey`, secret `KPI_ALLOWED_ORIGIN` va Function URL `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`.
- Sau khi sua hoac import JSON, mo Edge Function Logs de kiem tra khong co `Permission denied` ngoai du kien. Chi admin nen Nhap JSON; thuc hien ngoai gio nhap lieu de tranh canh tranh du lieu khong can thiet.

## Phuc hoi khi JSON cham hoac mat sau khi tai lai trang

Phien ban giao dien co co che luu du phong trang thai va diem dong bo trong IndexedDB cua trinh duyet. Du lieu da nhap duoc giu lai tren may dang nhap ngay ca khi ket noi Supabase bi gian doan; khi ket noi phuc hoi, he thong tu dong dong bo lai thay vi nap ban rong tu may chu de ghi de du lieu cuc bo.

Sau khi cap nhat ma, can deploy lai Edge Function de nhan truong `deletedIds` va cac sua loi dong bo:

```powershell
supabase functions deploy kpi-sync
```

Quy trinh khoi tao hoac phuc hoi du lieu trung tam:

1. Mo phien ban moi, dang nhap Admin tren may dang co JSON moi nhat.
2. Nhap cac tep JSON can khoi phuc va cho thong bao da dong bo len may chu thanh cong. Neu thong bao dang cho dong bo, giu may mo va ket noi mang on dinh; khong nhap them tep khac trong luc nay.
3. Kiem tra `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`. Sau khi hoan tat, `initialized` phai la `true` va `revision` lon hon `0`.
4. Dang nhap tren may thu hai, tai lai trang va kiem tra du lieu van con day du.

Tep tren 10 MB khong the di qua Edge Function hien tai. He thong van dong bo cac du lieu khac va danh dau tep can xu ly, khong de mot tep qua lon lam dung toan bo viec nhap JSON.
