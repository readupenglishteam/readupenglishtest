
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentMode = 'login';

  // Trang muốn quay lại sau khi đăng nhập (chỉ cho phép file .html cùng thư mục, tránh chuyển hướng ra ngoài)
  const nextParam = new URLSearchParams(location.search).get('next');
  const nextUrl = (nextParam && /^[\w\-]+\.html(\?[^#\s]*)?$/.test(nextParam)) ? nextParam : null;

  // Lối tắt Assignment: chưa đăng nhập thì báo rõ, không âm thầm bị bật ngược về đây
  document.getElementById('vipShortcut')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) { window.location.href = 'assignment.html'; return; }
    const msg = document.getElementById('authMsg');
    msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Bạn chưa đăng nhập. Hãy đăng nhập bằng tài khoản VIP ở trên, hệ thống sẽ tự chuyển vào trang Assignment.';
    msg.className = 'mt-4 text-center text-sm font-semibold text-amber-600';
    window.__goAssignmentAfterLogin = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function switchTab(mode) {
  currentMode = mode;
  const isReg = currentMode === 'register';

  document.getElementById('fullNameGroup')?.classList.toggle('hidden', !isReg);
  document.getElementById('dobGroup')?.classList.toggle('hidden', !isReg);
  document.getElementById('phoneGroup')?.classList.toggle('hidden', !isReg); // 👈 Sửa !isRegister thành !isReg ở đây
  document.getElementById('submitBtn').innerText = isReg ? 'Tạo Tài Khoản Đăng Ký' : 'Đăng Nhập';

  document.getElementById('tabLogin').className = isReg 
    ? 'w-1/2 py-2.5 text-center font-bold text-gray-400 hover:text-gray-600 transition' 
    : 'w-1/2 py-2.5 text-center font-bold text-[#cf1717] border-b-2 border-[#cf1717] transition';
  
  document.getElementById('tabRegister').className = isReg 
    ? 'w-1/2 py-2.5 text-center font-bold text-[#cf1717] border-b-2 border-[#cf1717] transition' 
    : 'w-1/2 py-2.5 text-center font-bold text-gray-400 hover:text-gray-600 transition';
}

// 3. Hàm Xử lý Đăng ký / Đăng nhập
async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const fullName = document.getElementById('fullName')?.value?.trim() || '';
  
  // Lấy SĐT đầy đủ có mã quốc gia (VD: +84912345678)
  const phone = phoneInputIti ? phoneInputIti.getNumber() : document.getElementById('phone')?.value?.trim();
  
  // Flatpickr tự động chuyển giá trị #dob thành YYYY-MM-DD chuẩn Supabase
  const isoDob = document.getElementById('dob')?.value?.trim() || ''; 
  const msg = document.getElementById('authMsg');

  msg.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang xử lý...';
  msg.className = "mt-4 text-center text-sm font-semibold text-gray-500";

  if (currentMode === 'register') {
    if (!fullName || !isoDob) {
      msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Vui lòng nhập đầy đủ Họ tên và Chọn ngày sinh!';
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
      return;
    }
    if (!phone) {
      msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Vui lòng nhập đầy đủ Số điện thoại!';
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
      return;
    }

    const { data, error } = await sbClient.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName, 
          phone: phone, 
          dob: isoDob, 
          role: 'student' 
        }
      }
    });

    if (error) {
      msg.innerHTML = '<i class="bi bi-dash-circle-fill"></i> Lỗi đăng ký: ' + error.message;
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
    } else {
      msg.innerHTML = '<i class="bi bi-check-circle"></i> Đăng ký thành công!';
      msg.className = "mt-4 text-center text-sm font-semibold text-green-600";
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    }
  } else {
    // Luồng Đăng nhập
    const { data: authData, error: authError } = await sbClient.auth.signInWithPassword({ email, password });
    
    if (authError) {
      msg.innerHTML = '<i class="bi bi-x-circle-fill"></i> Đăng nhập thất bại: ';
      msg.appendChild(document.createTextNode(authError.message));
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
      return;
    }

    const { data: profile } = await sbClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const role = profile?.role?.trim().toLowerCase();

    if (role === 'admin') {
  msg.innerHTML = '<i class="bi bi-gear"></i> Đăng nhập Admin thành công';
  msg.className = "mt-4 text-center text-sm font-semibold text-green-600";
  setTimeout(() => window.location.href = 'admin.html', 1000);
} else if (role === 'teacher' || role === 'assistant') {
  msg.innerHTML = '<i class="bi bi-person-badge"></i> Đăng nhập Giảng viên thành công';
  msg.className = "mt-4 text-center text-sm font-semibold text-green-600";
  setTimeout(() => window.location.href = 'teacher.html', 1000);
} else {
  msg.innerHTML = '<i class="bi bi-check-circle"></i> Đăng nhập thành công';
  msg.className = "mt-4 text-center text-sm font-semibold text-green-600";
  setTimeout(() => window.location.href = nextUrl || (window.__goAssignmentAfterLogin ? 'assignment.html' : 'dashboard.html'), 1000);
}
  }
}

  // 1. ĐĂNG NHẬP BẰNG GOOGLE
  async function loginWithGoogle() {
    const msg = document.getElementById('authMsg');
    const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/dashboard.html');
    const { data, error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
    if (error) {
      msg.innerHTML = `<i class="bi bi-dash-circle-fill"></i> Lỗi đăng nhập Google: ${error.message}`;
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
    }
  }

  // 2. ĐĂNG NHẬP BẰNG FACEBOOK / GITHUB / APPLE
  async function loginWithSocial(providerName) {
    const msg = document.getElementById('authMsg');
    const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/dashboard.html');
    const { data, error } = await sbClient.auth.signInWithOAuth({
      provider: providerName,
      options: { redirectTo: redirectUrl }
    });
    if (error) {
      msg.innerHTML = `<i class="bi bi-dash-circle-fill"></i> Lỗi đăng nhập ${providerName}: ${error.message}`;
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
    }
  }

  // 3. ĐĂNG NHẬP BẰNG EMAIL & MẬT KHẨU TRUYỀN THỐNG
  async function loginWithEmail(email, password) {
    const msg = document.getElementById('authMsg');
    const { data, error } = await sbClient.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) {
      msg.innerHTML = '<i class="bi bi-dash-circle-fill"></i> Sai email hoặc mật khẩu!';
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
    } else {
      window.location.href = 'dashboard.html';
    }
  }

  // 4. ĐĂNG NHẬP KHÔNG CẦN MẬT KHẨU (MAGIC LINK)
  async function loginWithMagicLink(email) {
    const msg = document.getElementById('authMsg');
    const { data, error } = await sbClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard.html'
      }
    });
    if (error) {
      msg.innerHTML = `<i class="bi bi-dash-circle-fill"></i> Lỗi gửi liên kết: ${error.message}`;
      msg.className = "mt-4 text-center text-sm font-semibold text-red-500";
    } else {
      alert("Đã gửi link đăng nhập vào Email của bạn!");
    }
  }

  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  }

  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash text-lg leading-none';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye text-lg leading-none';
    }
  }
  function formatToISO(vnDateStr) {
  if (!vnDateStr) return null;
  const parts = vnDateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Kiểm tra tính hợp lệ cơ bản của ngày, tháng, năm
    if (Number(day) > 0 && Number(day) <= 31 && Number(month) > 0 && Number(month) <= 12 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}
  let phoneInputIti;
document.addEventListener("DOMContentLoaded", () => {
  const phoneInputField = document.getElementById("phone");
  if (phoneInputField) {
    phoneInputIti = window.intlTelInput(phoneInputField, {
      initialCountry: "vn",
      separateDialCode: true,
      utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
    });
  }

  // 2. Khởi tạo Bảng chọn Lịch ngày sinh (Định dạng hiển thị dd/mm/yyyy)
  flatpickr("#dob", {
    locale: "vn",
    altInput: true,
    altFormat: "d/m/Y",   // Hiển thị cho người dùng xem: DD/MM/YYYY
    dateFormat: "Y-m-d",   // Giá trị thực tế lấy gửi Supabase: YYYY-MM-DD
    disableMobile: true,
    allowInput: true,
    maxDate: "today"
  });
});
