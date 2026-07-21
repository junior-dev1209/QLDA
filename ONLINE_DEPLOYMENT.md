# Trien khai API PHP du phong

Tai lieu nay chi ap dung khi `supabase-config.js` de trong. Khi da cau hinh Supabase, ung dung tu dong dung Edge Function cua Supabase va khong goi `api/sync.php`.

## Nguyen nhan da duoc khac phuc

Ban cu chi luu trang thai vao `localStorage` va tep media vao `IndexedDB` cua tung trinh duyet. Hai kho nay khong duoc chia se giua cac may. Service worker chi cache giao dien, khong phai may chu du lieu.

Ban nay bo sung `api/sync.php`. API luu mot ban trang thai trung tam, dung phien dang nhap PHP, khoa tep khi ghi va kiem tra `revision` truoc moi lan cap nhat. Vi vay mot may khac se tai cung du lieu sau khi dang nhap.

Media trong Bang tin va Luu tru duoc tai len `api/data/files`; khi mo o may khac, ung dung tai tep tu may chu ve IndexedDB cua may do de xem va cache cuc bo.

## Yeu cau may chu

- PHP 8.1 tro len, Apache hoac Nginx, va HTTPS.
- Tat ca tep trong thu muc du an phai nam tren **cung mot domain**. Vi du: `https://kpi.phucthinh.gov.vn/` va `https://kpi.phucthinh.gov.vn/api/sync.php`.
- Tai khoan chay PHP can co quyen doc/ghi voi `api/data` va `api/data/files`.
- Khong trien khai tren GitHub Pages, Netlify Static, Vercel Static hay bat ky hosting chi co HTML/CSS/JS.

Khuyen nghi cau hinh PHP:

```ini
upload_max_filesize = 64M
post_max_size = 256M
memory_limit = 512M
max_execution_time = 180
```

Voi Nginx, can chan truy cap truc tiep vao thu muc du lieu:

```nginx
location ^~ /api/data/ {
    deny all;
}
```

Apache da co tep `api/data/.htaccess` de chan truy cap khi hosting cho phep `.htaccess`.

## Khoi tao lan dau

1. Tu may dang co du lieu day du, dang nhap admin va chon `Xuat JSON` de tao ban sao luu.
2. Tai toan bo thu muc du an, bao gom `api`, len hosting PHP/HTTPS.
3. Kiem tra `https://ten-mien-cua-ban/api/sync.php?action=status`. Trang phai tra ve JSON co truong `available: true`.
4. Mo website tren hosting, dang nhap `admin / 123456`, sau do chon `Nhap JSON` va chon ban sao da xuat o buoc 1.
5. Doi mat khau mac dinh ngay sau khi khoi tao. Khi JSON da duoc dong bo xong, dang nhap cung dia chi nay o may thu hai de kiem tra du lieu.

Lan Nhap JSON dau tien se tao du lieu trung tam. Sau do, moi lan luu cong viec, KPI, nhan su, tin bai, luu tru, tai khoan hoac tuy bien giao dien se duoc dong bo len may chu.

## Van hanh an toan

- Bat buoc dung HTTPS. Khong mo cong khai thu muc `api/data`.
- Sao luu dinh ky tep `api/data/shared-state.json` va thu muc `api/data/files`.
- Khong cho hai nguoi sua cung mot ban ghi trong cung mot thoi diem. Neu may chu phat hien hai phien ban khac nhau, ung dung se **khong ghi de**; no dung dong bo, tu tai mot JSON du phong tren may dang sua va yeu cau tai lai trang.
- API hien tai giu nguyen mo hinh phan quyen cua ung dung. De dat muc bao mat doanh nghiep cao hon, buoc tiep theo la tach tung module thanh API/co so du lieu rieng va kiem tra quyen o may chu cho tung thao tac.

## Khi mat ket noi

Ung dung van giu ban lam viec tren trinh duyet. Khi may chu tro lai, he thong tu thu dong bo lai. Khong xoa du lieu trinh duyet truoc khi da kiem tra du lieu da hien o may khac.
