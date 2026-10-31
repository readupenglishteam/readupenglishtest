# ReadUp English — cập nhật 31/10/2026

Đây là dự án web HTML/CSS/JavaScript gốc, có bổ sung các tính năng và sửa một số điểm gây chậm tải. Không thay đổi schema cơ sở dữ liệu Supabase hoặc quyền giáo viên/học sinh hiện có.

## Chức năng cập nhật

- **teacher.html — Bài Tập:** nút **Xem thử · Đề / Đáp án** mở một màn hình xem trước độc lập, không gửi bài và không ghi điểm. Có thể chuyển giữa **Xem dạng đề thi** (ẩn đáp án) và **Xem dạng đáp án** (đánh dấu đúng, đáp án điền khuyết, giải thích). Hỗ trợ bài tập thường và bài TEST (`is_test`), kể cả bài chưa đến giờ mở.
- **teacher.html — soạn bài:** nút **Xem thử bản đang soạn** trong trình tạo bài; từng ô nội dung câu hỏi, bài Reading và câu hỏi con có nút **Trực quan / HTML**. Có thể thiết kế bằng bảng, ảnh, tiêu đề, định dạng chữ và HTML an toàn. Nội dung HTML được lọc khi đổi về chế độ trực quan; không hỗ trợ nhúng script/iframe tùy ý để bảo vệ học viên.
- **admin.html — đề Reading:** nút **Xem thử** trên đề và **Xem thử bài nháp** dùng chung hai chế độ đề / đáp án, thay cho việc luôn hiện đáp án. Trình nhập câu hỏi theo dạng cũng có tab trực quan / HTML. Các modal thông báo cũ vẫn giữ nguyên.
- **assignment.html và exam.html:** menu highlight chung 6 màu (**Yellow, Green, Blue, Pink, Orange, Purple**), **Copy, Look up / Translate, Note, Remove highlight, Clear all highlights**. Cửa sổ dịch có Oxford, Cambridge, Cambridge EN–VI, Google Translate, DeepL. Dịch tức thời thử qua dịch vụ MyMemory; khi nhà cung cấp không đáp ứng vẫn có link từ điển. Ghi chú được lưu cục bộ theo trang trong `localStorage`. Highlight trực quan không được đồng bộ qua tài khoản/cơ sở dữ liệu.
- **Hiệu năng và đồng bộ font:** đồng nhất link tải font Montserrat và thêm `assets/css/ru-base.css` cho các trang; bỏ thời gian chờ tối thiểu 140 ms khỏi page loader; không kiểm tra Supabase trên trang công khai; tải thư viện Mammoth, SheetJS và ExcelJS ở trang giáo viên khi bấm tính năng cần đến chúng (thay vì tải khi vào trang).

## Cài đặt / kiểm tra

Giải nén và chạy bằng web server (Vercel hoặc `python -m http.server 8000` trong thư mục mã nguồn). Không mở file HTML trực tiếp bằng `file://` nếu muốn kiểm tra Supabase, import hoặc các API. Truy cập `teacher.html`, chọn lớp, mở bài tập -> bấm **Xem thử**. Bấm **Tạo bài tập mới**, chọn tab **HTML** ở từng câu hỏi và bấm **Xem thử bản đang soạn**. Ở `admin.html`, vào danh sách bài thi Reading -> **Xem thử**.

## Giới hạn và lưu ý

- Việc kiểm tra trên bộ dữ liệu Supabase thực tế cần tài khoản và quyền truy cập hợp lệ; gói này chưa được kiểm thử end-to-end với dữ liệu production, thời gian tải thực tế và quy tắc RLS.
- Đường dẫn từ điển mở nhà cung cấp bên ngoài; dịch nhanh phụ thuộc kết nối mạng và quota/dịch vụ MyMemory.
- Giao diện menu các trang chỉ mới được đồng bộ font và các thành phần mới. Việc thiết kế lại toàn bộ điều hướng/menu cũ chưa nằm trong đợt này.
- Bộ build hiện dùng Tailwind CDN và một số tài nguyên bên ngoài, nên thời gian tải vẫn phụ thuộc mạng. Muốn tối ưu sâu hơn cần chuyển Tailwind sang build tĩnh, kiểm tra số lượng truy vấn Supabase và đo bằng Lighthouse trên môi trường triển khai thật.
