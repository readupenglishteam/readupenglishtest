# ReadUp English — Bản sửa giao diện và gộp CSS/JS (31/10/2026)

Dự án HTML/CSS/JavaScript thuần, giữ nguyên kết nối Supabase, schema, quyền giáo viên và dữ liệu. Đây là toàn bộ website, không phải bản patch phải chép từng file.

## 1. Bảng Highlight & Tra cứu gọn

- Hoạt động trên **exam.html** và **assignment.html**, trong phần Reading và khu vực câu hỏi; chỉ còn **một** bộ quản lý sự kiện chọn chữ cho mỗi trang, không còn xung đột với listener cũ.
- Menu rộng khoảng **256px** (điện thoại 240px), có 6 màu trong lưới 3×2, icon Bootstrap (`bi-*`), sao chép, tra cứu, ghi chú, bỏ highlight, xóa tất cả.
- Menu ưu tiên đặt **bên cạnh** vùng chữ chọn, khi thiếu chỗ mới đặt phía trên hoặc dưới; luôn giữ trong viewport nếu kích thước màn hình cho phép.
- Bảng tra cứu là **popover không có nền tối** thay vì hộp thoại modal lớn. Liên kết: Oxford, Cambridge, Cambridge EN–VI, Google Dịch, DeepL; thử dịch nhanh qua MyMemory. Ghi chú ở một popover nhỏ riêng; dữ liệu ghi chú lưu trong localStorage của thiết bị.
- **Lưu ý trình duyệt:** Thanh chọn chữ như `Answer · Copy · Search · Translate` trong hình là **mini menu mặc định của Microsoft Edge / tiện ích**, website không thể tự điều khiển hay thay đổi thanh đó. Nếu nó tiếp tục hiện đè lên menu ReadUp, hãy tắt mini menu cho văn bản đã chọn trong phần Cài đặt của trình duyệt Edge.

## 2. Câu hỏi HTML — trực quan + live preview

- Giáo viên/admin soạn câu hỏi ở `teacher.html` / `admin.html` chuyển **Trực quan** ⇄ **HTML + Xem nhanh**.
- Chế độ HTML hiển thị **mã nguồn bên trái và bản xem trước tự cập nhật bên phải** (trên màn hình hẹp tự xếp dọc). Đổi về Trực quan sẽ áp dụng và lưu HTML đã xử lý.
- Thêm bộ CSS trình bày an toàn cho bảng, danh sách, khung từ vựng `.vocabulary-section`, `.vocabulary-letter`, `.word-bank`, `.ru-card`, `.ru-callout`, `.ru-grid` và các thẻ HTML thường dùng.
- Có thể dùng `style="..."` trực tiếp hoặc `<style>.ten-class {...}</style>` (selector đơn giản) trong mã HTML. Trình lọc sẽ **chuyển các thuộc tính CSS an toàn sang inline** để nội dung giữ được màu, nền, bố cục và hiển thị nhất quán cho giáo viên và học sinh. `<script>`, trình xử lý sự kiện như `onclick`, `<iframe>`, CSS tải URL ngoài và các thuộc tính nguy hiểm vẫn bị loại bỏ theo thiết kế.

Ví dụ dùng ở tab HTML:

```html
<style>
  .vocabulary-section { background: #fff5e4; padding: 14px; border-radius: 10px }
  .vocabulary-letter strong { color: #168d5a; font-size: 20px }
</style>
<section class="vocabulary-section">
  <div class="vocabulary-letter">A <strong>BUILD VOCABULARY</strong></div>
  <p>Complete the sentences.</p>
</section>
```

## 3. Gộp CSS và JS

- CSS **38 → 16 file**: mỗi trang có một `assets/compiled/<ten-trang>.css`. Các quy tắc CSS nội bộ được ghép theo thứ tự trong HTML gốc.
- JS **71 → 45 file**: các khối script liên tục và an toàn được gộp thành `assets/compiled/<ten-trang>.partN.js`. Những script có ranh giới phụ thuộc vào Supabase, CDN hoặc thời điểm DOM vẫn giữ riêng để giảm nguy cơ lỗi.
- Các file CSS/JS gốc **không còn được sử dụng** đã được loại khỏi ZIP; không cần tìm các file `.01.js`, `.02.css` cũ. Khi sửa thêm tính năng, chỉnh file bundle mới tương ứng hoặc dùng quy trình build có nguồn riêng.
- Không gộp mã thư viện CDN hoặc Supabase thành mã nguồn của dự án. Tailwind hiện vẫn dùng CDN; chưa chuyển sang bản build CSS tĩnh.

## 4. Cách chạy

1. Giải nén nguyên thư mục `readupenglishtest-main` và triển khai **toàn bộ** lên môi trường đang sử dụng (không chỉ ghi đè một file).
2. Có thể thử với local server: trong thư mục mã nguồn chạy `python -m http.server 8000`, truy cập `http://localhost:8000/teacher.html` hoặc `assignment.html`.
3. Sau khi triển khai, **Ctrl+Shift+R** trên Windows để tải lại JS/CSS mới, hoặc xóa cache CDN/browser nếu hệ thống lưu bộ nhớ lâu.
4. Thử bôi đen chữ trong Reading; mở tab HTML tại khối câu hỏi của giáo viên; kiểm tra bài đang soạn bằng **Xem thử**.

## 5. Phạm vi kiểm thử và giới hạn

- Đã kiểm tra cú pháp các file JS sau gộp, đường dẫn CSS/JS tồn tại, và thử UI độc lập với Chromium ở viewport **1280px** và **390px**: 6 màu, tô/bỏ tô, popup tra cứu, tạo note, HTML live preview, chuyển về trực quan và lọc script độc hại.
- **Chưa** xác minh end-to-end với tài khoản Supabase thật hoặc dữ liệu production; sau khi deploy cần kiểm tra đăng nhập, tạo/lưu/xem thử bài thi, làm bài, xem lại đáp án và quyền truy cập trước khi dùng chính thức.
- Dịch tự động phụ thuộc dịch vụ MyMemory và kết nối. Bootstrap Icons, font và Tailwind vẫn phụ thuộc các nguồn CDN đang có; hiệu năng tải trên mạng thực tế chưa benchmark.
- Cấu trúc các menu lớn của toàn bộ website và những bất cập chức năng ngoài yêu cầu lần này chưa được thiết kế lại.

---

## Cập nhật 31/10/2026 — Clipboard PNG, menu thống nhất, UI tinh gọn

### 1. Ảnh bài học & thông báo (Admin)

Trong `admin.html`, hai ô **Ảnh bìa bài học** và **Ảnh nền/ảnh minh họa thông báo** hỗ trợ:

- Click vào vùng dán → **Ctrl+V** ảnh vừa sao chép (hoặc chuỗi `data:image/png;base64,...`).
- Kéo thả ảnh vào vùng dán; hoặc nhấn **Chọn ảnh** để lấy ảnh từ máy.
- Đường dẫn HTTPS sẽ được thử tải và chuyển sang PNG; nếu máy chủ chặn CORS, hãy sao chép *hình ảnh* trực tiếp thay vì sao chép *địa chỉ hình ảnh*.
- Tự xem trước và nhấn **Xóa ảnh** để xóa. Khi lưu, giá trị `data:image/png;base64,...` đi vào trường `posts.thumbnail_url` / `news.image_url` như trước (không thêm cột mới).
- Ảnh trong nội dung bài học/thông báo được chèn bằng nút **Ảnh**, Ctrl+V hoặc nhập DOCX cũng được chuyển về PNG base64. Ảnh có sẵn từ phiên bản cũ vẫn hiển thị bình thường.

Hệ thống tự thu nhỏ ảnh lớn, tối đa khoảng **1 MB cho mỗi chuỗi PNG base64** để tránh làm chậm tải. Nếu hình quá lớn/chi tiết, cần cắt hoặc thu nhỏ và dán lại. Dữ liệu ảnh lưu trong database nên có thể làm tăng dung lượng truy vấn hơn ảnh lưu ở Storage/CDN. **Các cột `posts.thumbnail_url` và `news.image_url` trong Supabase phải thuộc kiểu TEXT** (hoặc kiểu tương đương có đủ dung lượng); nếu đang là `VARCHAR(255)`, cần đổi sang `TEXT` trước khi sử dụng. Không nhúng ảnh mật khẩu/tài liệu riêng tư vào nội dung công khai.

Đã sửa sửa-thông-báo: không chèn chuỗi base64 dài vào HTML `onclick`, mà lấy từ dữ liệu bản ghi theo `id`. Khi lưu lỗi, form giữ nguyên nội dung và hiển thị thông báo để xử lý.

### 2. Menu & giao diện

- Thứ tự menu chính dùng chung: **Bài Học (Post) → Assignment (VIP) → Learning Materials Library → Vocabulary**; các shortcut trong trang được giữ riêng phía dưới. Nút về Dashboard hiển thị trên trang con.
- Đã thêm nút Menu cho các trang thiếu menu nhanh: Admin, Teacher, LML, Edit LML, Room; giữ nguyên các chức năng riêng của các trang.
- Tinh chỉnh bố cục nhẹ: tiêu đề, khoảng trắng, nền tĩnh bớt hiệu ứng, viền nhẹ, trạng thái focus rõ ràng, menu đơn giản. Vẫn giữ nhận diện đỏ ReadUp và cấu trúc cũ.
- Tài nguyên bổ sung dùng chung có cache: `assets/js/ru-navigation.js`, `assets/js/ru-image-clipboard.js`, `assets/css/ru-refined.css`. Không tách thêm một bộ JS/CSS riêng cho từng trang; file JS xử lý ảnh chỉ tải ở Admin.

### 3. Kiểm tra & giới hạn

- Đã kiểm tra cú pháp JavaScript, các đường dẫn file local, tương tác paste PNG/base64, xóa ảnh, thứ tự điều hướng, và hàm sửa/lưu thông báo với dữ liệu giả trong Chromium.
- Chưa thể kiểm tra quyền đăng nhập, việc lưu với Supabase thật, RLS, kích thước/kiểu cột thật hoặc hiệu năng production; cần kiểm thử với bản sao dữ liệu trước khi cập nhật website chính.
- Sau khi thay thế file, bấm **Ctrl+Shift+R** hoặc tăng cache version khi deploy.
