# Cap nhat ma nguon tu giao dien

## Co che hoat dong

`Trung tam cap nhat` trong `Cau hinh he thong` chi danh cho Admin. Admin co the chon cac tep ma nguon tren may tinh, tao goi nhap, tai len Supabase va kich hoat goi ngay trong he thong. Sau khi da cai dat nen tang mot lan, cac goi giao dien thong thuong khong can chep lai ma nguon len hosting.

He thong chi nhan cac tep duoc phep: `index.html`, `styles.css`, `people-data.js`, `script.js`, `manifest.webmanifest`, `app-icon-phuc-thinh.png`, `icon.svg` va hai anh sinh nhat trong `assets`. Moi tep duoc tinh SHA-256 o may chu. Tep cua goi da kich hoat khong the sua; goi moi phai tao ban nhap rieng.

Truoc khi kich hoat, he thong luon:

1. Kiem tra phien Admin va ket noi Supabase.
2. Dong bo het thay doi du lieu con ton.
3. Tai ve tep sao luu JSON day du.
4. Ghi nhat ky va chi sau do moi chuyen goi ma nguon.

Neu mot buoc that bai, goi ma cu van duoc giu nguyen.

## Cai dat nen tang mot lan

1. Upload bo ma hien tai len hosting, bao gom `release-bootstrap.js`, `service-worker.js`, `supabase-config.js`, `index.html`, `script.js`, `styles.css` va toan bo thu muc `assets`, dac biet la `assets/birthday-cake.png` va `assets/birthday-bouquet.png`.
2. Ap dung migration `20260803000000_kpi_code_releases.sql` trong thu muc `supabase/migrations`.
3. Deploy Edge Function `kpi-sync` phien ban moi.
4. Mo he thong bang HTTPS, kiem tra hai URL `https://ten-mien-cua-ban/assets/birthday-cake.png` va `https://ten-mien-cua-ban/assets/birthday-bouquet.png` deu tra ve anh (HTTP 200), sau do dang nhap Admin, vao `Cau hinh he thong` > `Trung tam cap nhat`, bam `Kiem tra phien ban`.

Sau buoc nay, hosting chi giu trinh khoi dong on dinh. Trinh khoi dong tu tai goi ma dang kich hoat trong Supabase Storage khi nguoi dung mo lai he thong.

## Tao goi dau tien

1. Dang nhap Admin va chon `Kiem tra phien ban`.
2. Nhap so phien ban, vi du `2.3.0`, va ghi chu phat hanh.
3. Chon day du 8 tep bat buoc: `index.html`, `styles.css`, `people-data.js`, `script.js`, `manifest.webmanifest`, `app-icon-phuc-thinh.png`, `assets/birthday-cake.png`, `assets/birthday-bouquet.png`.
4. Bam `Tai tep va luu nhap`. Neu can, chon lai ban nhap va bam cung nut de bo sung tep con thieu.
5. Chon ban nhap da du tep, bam `Kich hoat goi da chon`.

## Cap nhat cac lan sau

1. Tao goi moi voi so phien ban moi.
2. Chi chon cac tep da thay doi. He thong tu sao chep tep cua goi dang kich hoat sang ban nhap, nen tep khong thay doi van duoc giu lai.
3. Kiem tra bang mot thiet bi thu nghiem, sau do kich hoat goi.
4. Nguoi dung khac nhan phien ban moi o lan tai lai trang/mo lai he thong tiep theo; khong bi ep tai lai khi dang lam viec.

## Quay lai phien ban truoc

Trong danh sach goi, chon mot goi `Da luu tru` da du tep, sau do bam `Kich hoat goi da chon`. He thong sao luu va dong bo truoc khi quay lai.

Neu mot goi moi loi den muc khong mo duoc giao dien, them `?release-base=1` vao cuoi dia chi he thong. He thong se mo bo ma nen tren hosting; dang nhap Admin, vao Trung tam cap nhat va kich hoat lai goi on dinh truoc do.

## Gioi han an toan

Cap nhat bang tep da chon chi phu hop voi giao dien va logic trinh duyet. Thay doi bang du lieu Supabase, Edge Function, quyen backend, khoa bi mat hoac cau truc Storage van can deploy ky thuat, dong thoi phai tuong thich nguoc voi goi dang chay. Khong tai tep co ma khong ro nguon goc: quyen Admin phat hanh goi ma tuong duong quyen thay doi toan bo hanh vi he thong.
