# Trien khai Supabase Cloud

## Kien truc

Ung dung dung Supabase theo luong sau:

`Trinh duyet -> Edge Function kpi-sync -> Postgres kpi_shared_state + Storage private kpi-files`

Edge Function giu service key o phia may chu, quan ly phien dang nhap cua ung dung, khoa xung dot theo `revision` va khong tra mat khau tai khoan ve trinh duyet. Trinh duyet chi dung `Project URL` va `publishable key`.

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

4. Deploy Edge Function:

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

## Bao mat va van hanh

- Bucket `kpi-files` la private; client chi tai tep qua Edge Function sau khi co phien hop le.
- Bang `kpi_shared_state` va `kpi_sync_sessions` bat RLS va khong cap quyen truy cap truc tiep cho `anon` hoac `authenticated`. Chi Edge Function dung service key truy cap duoc.
- Edge Function dang dung custom session de tuong thich voi tai khoan hien co. Neu can nang cap bao mat tiep, chuyen cac tai khoan sang Supabase Auth va tach du lieu JSON thanh bang nghiep vu rieng.
- Khi hai may gui thay doi tu cung `revision`, ban sau se khong ghi de ban truoc. Ung dung tai JSON du phong ve may dang sua va yeu cau tai lai trang.
- Sao luu dinh ky Postgres va bucket `kpi-files`. Ban sao luu database khong tu dong bao gom tep Storage. [Supabase Database](https://supabase.com/docs/guides/database/overview)

## Kiem tra loi nhanh

- `401` tu Function: kiem tra da deploy `supabase/config.toml` voi `verify_jwt = false`; Function tu xac thuc bang phien `x-kpi-session`.
- `CORS`: kiem tra secret `KPI_ALLOWED_ORIGIN` dung chinh xac domain cua website.
- `500`: xem Edge Function Logs tren Supabase Dashboard va kiem tra migration da chay thanh cong.
- Du lieu khong dong bo: kiem tra `projectUrl`, `publishableKey` va Function URL `https://<project-ref>.supabase.co/functions/v1/kpi-sync?action=status`.
