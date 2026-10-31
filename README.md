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
