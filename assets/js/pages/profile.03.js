
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;

  function pel(id) { return document.getElementById(id); }

  let rawProfileData = null; // Lưu trữ dữ liệu tạm để khôi phục khi ấn Hủy
  let profilePhoneIti;
  let profileDobFp; // Instance Flatpickr cho ô chọn Ngày sinh

  // =========================================================================
  // TOAST NOTIFICATION GÓC PHẢI (thay thế popup alert() giữa màn hình)
  // =========================================================================

  // 0. Hàm thay thế cho alert() mặc định của trình duyệt: hiển thị dưới dạng Toast góc phải
  function notify(rawMessage) {
    const msg = String(rawMessage ?? '');
    // Tách icon emoji ở đầu chuỗi (nếu có) để hiển thị làm icon toast
    const emojiMatch = msg.match(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u);
    const BI_MAP = {'📖':'book','⭐':'star-fill','🏠':'house-door-fill','👤':'person-circle','🌙':'moon-stars-fill','🚪':'box-arrow-right','📷':'camera-fill','🔥':'fire','⚡':'lightning-charge-fill','✏':'pencil-square','💾':'floppy-fill','❌':'x-circle-fill','🔑':'key-fill','🔒':'lock-fill','📧':'envelope-fill','🎧':'headset','📝':'pencil-square','🔔':'bell-fill','⚠':'exclamation-triangle-fill','🎉':'stars','✅':'check-circle-fill','❤':'heart-fill','💪':'hand-thumbs-up-fill','📋':'clipboard-check','ℹ':'info-circle-fill','⏳':'hourglass-split','💬':'chat-dots-fill','➕':'plus-circle-fill','✕':'x-lg','➔':'arrow-right','★':'star-fill'};
    let icon = 'bell-fill';
    let text = msg;
    if (emojiMatch && emojiMatch[0].trim()) {
      icon = BI_MAP[emojiMatch[0].trim().replace(/\uFE0F/g, '')] || 'bell-fill';
      text = msg.slice(emojiMatch[0].length).trim() || msg;
    }
    // Suy luận tiêu đề toast dựa theo nội dung/emoji của thông báo gốc
    let title = 'Thông báo';
    if (/❌/.test(msg) || /lỗi|thất bại|không thể/i.test(msg)) title = 'Lỗi';
    else if (/⚠️/.test(msg)) title = 'Cảnh báo';
    else if (/🎉|✅|❤️|💪|💾|📋/.test(msg)) title = 'Thành công';
    else if (/ℹ️/.test(msg)) title = 'Thông tin';
    showToastNotification({ title, message: text, icon });
  }

  // 1. Hàm hiển thị Toast Popup góc phải
  function showToastNotification({ title, message, icon = 'bell-fill', linkUrl = null, onClick = null }) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="pointer-events-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 translate-x-full opacity-0 relative">
        <div class="p-3.5 sm:p-4 flex items-start gap-3">
          <div class="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/80 flex-shrink-0 flex items-center justify-center text-[#cf1717] dark:text-red-400 font-bold text-base shadow-sm">
            <i class="bi bi-${icon}"></i>
          </div>
          <div class="flex-1 pr-4">
            <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">${title}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${message}</p>
            ${onClick ? `
              <button type="button" onclick="${onClick}; closeToast('${toastId}')" class="inline-block mt-1.5 text-xs font-bold text-[#cf1717] hover:underline cursor-pointer">
                Xem ngay <i class="bi bi-arrow-right"></i>
              </button>
            ` : (linkUrl ? `
              <a href="${linkUrl}" class="inline-block mt-1.5 text-xs font-bold text-[#cf1717] hover:underline">
                Xem ngay <i class="bi bi-arrow-right"></i>
              </a>
            ` : '')}
          </div>
          <button onclick="closeToast('${toastId}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-base leading-none p-1">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="h-1 bg-red-100 dark:bg-zinc-800 w-full">
          <div class="h-full bg-[#cf1717] animate-toast-bar"></div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);

    const toastElem = document.getElementById(toastId);
    setTimeout(() => {
      toastElem.classList.remove('translate-x-full', 'opacity-0');
    }, 50);

    setTimeout(() => {
      closeToast(toastId);
    }, 5000);
  }

  // Hàm đóng Toast
  function closeToast(id) {
    const elem = document.getElementById(id);
    if (!elem) return;
    elem.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => elem.remove(), 300);
  }

// 1. Khởi tạo ô SĐT cờ Việt Nam khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
  const phoneInput = document.getElementById("inputPhone");
  if (phoneInput) {
    profilePhoneIti = window.intlTelInput(phoneInput, {
      initialCountry: "vn",
      separateDialCode: true,
      utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
    });
  }

  // 2. Khởi tạo Bảng chọn Lịch Ngày sinh (giống hệt trang đăng nhập)
  // Người dùng chỉ cần bấm vào ô để mở lịch chọn, không cần gõ tay nữa
  const dobInput = document.getElementById("inputDob");
  if (dobInput && typeof flatpickr === 'function') {
    profileDobFp = flatpickr("#inputDob", {
      locale: "vn",
      altInput: true,
      altFormat: "d/m/Y",       // Hiển thị cho người dùng xem: DD/MM/YYYY
      altInputClass: "w-full p-3 bg-gray-50 dark:bg-zinc-800 disabled:opacity-60 text-gray-800 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer",
      dateFormat: "Y-m-d",       // Giá trị thực tế lưu vào Supabase: YYYY-MM-DD
      disableMobile: true,
      allowInput: false,         // Chỉ cho chọn qua lịch, không gõ tay
      clickOpens: false,         // Mặc định khóa (chỉ mở khi đang ở chế độ Chỉnh sửa)
      maxDate: "today"
    });
    // Ô hiển thị (altInput) cũng cần bị khóa/mở tương ứng chế độ Chỉnh sửa
    if (profileDobFp.altInput) profileDobFp.altInput.disabled = true;
  }
});

// --- HÀM HỖ TRỢ CHUYỂN ĐỔI NGÀY VIỆT NAM (DD/MM/YYYY <-> YYYY-MM-DD) ---
function formatToVN(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDateStr;
}

function formatToISO(vnDateStr) {
  if (!vnDateStr) return null;
  const parts = vnDateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

// =========================================================================
// CHỨC NĂNG UPLOAD ẢNH ĐẠI DIỆN QUA FREEIMAGE.HOST
// =========================================================================


// Hiển thị ảnh đại diện dùng chung cho avatar lớn (trang Profile) + avatar trên Header
// Nếu url rỗng/null -> hiển thị icon người mặc định (bi-person-circle)
function applyAvatarUrl(url) {
  const bigIcon = document.getElementById('profileAvatarIcon');
  const bigImg = document.getElementById('profileAvatarImg');
  const headIcon = document.getElementById('headerAvatarIcon');
  const headImg = document.getElementById('headerAvatarImg');

  if (url) {
    if (bigImg) { bigImg.src = url; bigImg.classList.remove('hidden'); }
    if (bigIcon) bigIcon.classList.add('hidden');
    if (headImg) { headImg.src = url; headImg.classList.remove('hidden'); }
    if (headIcon) headIcon.classList.add('hidden');
  } else {
    if (bigImg) { bigImg.classList.add('hidden'); bigImg.src = ''; }
    if (bigIcon) bigIcon.classList.remove('hidden');
    if (headImg) { headImg.classList.add('hidden'); headImg.src = ''; }
    if (headIcon) headIcon.classList.remove('hidden');
  }
}

// Xử lý khi người dùng chọn file ảnh mới cho Avatar
async function handleAvatarFileChange(inputElem) {
  const file = inputElem.files && inputElem.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    notify('⚠️ Vui lòng chọn đúng định dạng file ảnh (JPG, PNG, GIF...)!');
    inputElem.value = '';
    return;
  }
  // Giới hạn nhẹ dung lượng để tránh upload quá nặng
  if (file.size > 10 * 1024 * 1024) {
    notify('⚠️ Ảnh quá lớn! Vui lòng chọn ảnh dưới 10MB.');
    inputElem.value = '';
    return;
  }

  const uploadIconElem = document.getElementById('avatarUploadIcon');
  if (uploadIconElem) uploadIconElem.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    if (!currentUser) throw new Error('Không xác định được tài khoản đang đăng nhập');

    // ========================================================
    // PHẦN CODE MỚI: UPLOAD TRỰC TIẾP LÊN BUCKET "avatars"
    // ========================================================
    
    // 1. Tạo tên file duy nhất cho user (ví dụ: id-cua-user.jpg)
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUser.id}.${fileExt}`;

    // 2. Upload file lên Supabase (dùng upsert: true để ghi đè nếu user đổi ảnh mới)
    const { error: uploadError } = await sbClient.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // 3. Lấy URL Public của ảnh vừa up
    const { data: publicUrlData } = sbClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    // ========================================================
    // KẾT THÚC PHẦN MỚI, BÊN DƯỚI GIỮ NGUYÊN NHƯ CŨ
    // ========================================================

    // Lưu đường dẫn ảnh đại diện mới vào Supabase (bảng profiles, cột avatar_url)
    const { error: updErr } = await sbClient
      .from('profiles')
      .upsert(
        { id: currentUser.id, avatar_url: imageUrl, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (updErr) throw updErr;

    if (rawProfileData) rawProfileData.avatar_url = imageUrl; // Đồng bộ dữ liệu tạm

    applyAvatarUrl(imageUrl);
    notify('🎉 Cập nhật ảnh đại diện thành công!');

  } catch (err) {
    notify('❌ Tải ảnh đại diện thất bại: ' + (err.message || 'Vui lòng thử lại sau!'));
  } finally {
    if (uploadIconElem) uploadIconElem.innerHTML = '<i class="bi bi-camera-fill"></i>';
    inputElem.value = '';
  }
}

// --- LOGIC BẬT / TẮT CHẾ ĐỘ CHỈNH SỬA THÔNG TIN CÁ NHÂN ---
function toggleProfileEdit(enable) {
  const fields = ['inputFullName', 'inputPhone', 'inputEmail'];
  fields.forEach(id => {
    document.getElementById(id).disabled = !enable;
  });

  // Ô Ngày sinh giờ dùng Flatpickr: bật/tắt cho phép bấm mở lịch chọn
  if (profileDobFp) {
    profileDobFp.set('clickOpens', enable);
    if (profileDobFp.altInput) profileDobFp.altInput.disabled = !enable;
    if (!enable) profileDobFp.close();
  } else {
    const dobElem = document.getElementById('inputDob');
    if (dobElem) dobElem.disabled = !enable;
  }

  document.getElementById('btnEditProfile').classList.toggle('hidden', enable);
  document.getElementById('profileActionBtns').classList.toggle('hidden', !enable);

  if (!enable && rawProfileData) {
    // Nếu bấm Hủy, khôi phục lại dữ liệu ban đầu
    populateForm(rawProfileData);
  }
}

// --- LOGIC BẬT / TẮT CHẾ ĐỘ CHỈNH SỬA MẬT KHẨU ---
function togglePasswordEdit(enable) {
  const fields = ['inputNewPassword', 'inputConfirmPassword'];
  fields.forEach(id => {
    const input = document.getElementById(id);
    input.disabled = !enable;
    if (!enable) input.value = '';
  });

  document.getElementById('btnEditPassword').classList.toggle('hidden', enable);
  document.getElementById('passwordActionBtns').classList.toggle('hidden', !enable);
}

function populateForm(profile, stats) {
  const fullName = profile?.full_name || currentUser?.user_metadata?.full_name || 'Học sinh';
  const rawPhone = profile?.phone || currentUser?.user_metadata?.phone || '';
  const rawDob = profile?.dob || currentUser?.user_metadata?.dob || '';

  document.getElementById('inputFullName').value = fullName;
  document.getElementById('displayFullName').innerText = fullName;
  
  // Đổ Số điện thoại vào ô có lá cờ +84
  if (profilePhoneIti && rawPhone) {
    profilePhoneIti.setNumber(rawPhone);
  } else if (document.getElementById('inputPhone')) {
    document.getElementById('inputPhone').value = rawPhone;
  }

  // Đổ Ngày sinh vào Flatpickr (rawDob đã ở dạng YYYY-MM-DD từ Supabase)
  if (profileDobFp) {
    if (rawDob) {
      profileDobFp.setDate(rawDob, true);
    } else {
      profileDobFp.clear();
    }
  } else if (document.getElementById('inputDob')) {
    document.getElementById('inputDob').value = formatToVN(rawDob);
  }
  // Đổ ảnh đại diện (hoặc icon người mặc định nếu chưa có ảnh)
  applyAvatarUrl(profile?.avatar_url || null);

  // Cập nhật Streak & XP từ dữ liệu stats truyền vào
  document.getElementById('profileStreak').innerText = stats?.streak_count || 0;
  document.getElementById('profileXp').innerText = stats?.total_xp || 0;
}

async function initProfile() {
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session || !session.user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = session.user;
  
  // Kiểm tra an toàn trước khi gán value/innerText
  const inputEmailElem = document.getElementById('inputEmail');
  if (inputEmailElem) inputEmailElem.value = currentUser.email || '';
  
  const displayEmailElem = document.getElementById('displayEmail');
  if (displayEmailElem) displayEmailElem.innerText = currentUser.email || 'N/A';

  const provider = currentUser.app_metadata?.provider || 'email';
  const badgeElem = document.getElementById('authProviderBadge');
  if (badgeElem) badgeElem.innerText = provider === 'google' ? 'Google Auth' : 'Tài khoản Email';

  // 1. Lấy thông tin Profile
  const { data: profile } = await sbClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  // --- [ĐỌC VÀ GÁN TÊN VÀO DROPDOWN MENU] ---
  const displayName = profile?.full_name 
    || currentUser.user_metadata?.full_name 
    || currentUser.email?.split('@')[0] 
    || 'Người dùng';

  const dropdownNameElem = document.getElementById('dropdownUserName');
  if (dropdownNameElem) {
    dropdownNameElem.innerText = displayName;
  }
  // ------------------------------------------

  // 2. Lấy hoặc tự tạo mới dòng dữ liệu trong user_stats nếu chưa có
  let { data: stats } = await sbClient
    .from('user_stats')
    .select('streak_count, total_xp')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  // Nếu chưa có trong bảng user_stats, tự động tạo mới 1 hàng ban đầu
  if (!stats) {
    const { data: newStats } = await sbClient
      .from('user_stats')
      .insert([{ user_id: currentUser.id, streak_count: 0, total_xp: 0 }])
      .select()
      .maybeSingle();
    stats = newStats;
  }

  rawProfileData = profile;
  
  // 3. Đổ dữ liệu ra giao diện
  if (typeof populateForm === 'function') {
    populateForm(profile, stats);
  }
  
  if (typeof toggleProfileEdit === 'function') toggleProfileEdit(false);

  // Nếu tài khoản đang dùng mật khẩu ban đầu do giáo viên/admin cấp (must_change_password = true):
  // hiện banner nhắc và tự mở sẵn form đổi mật khẩu để học sinh đổi ngay.
  if (profile?.must_change_password) {
    document.getElementById('mustChangePwBanner')?.classList.remove('hidden');
    if (typeof togglePasswordEdit === 'function') togglePasswordEdit(true);
    if (typeof notify === 'function') notify('🔑 Vui lòng đổi mật khẩu ban đầu để bảo mật tài khoản.');
  } else {
    if (typeof togglePasswordEdit === 'function') togglePasswordEdit(false);
  }
}
async function handleUpdateProfile(e) {
  e.preventDefault();
  const newName = document.getElementById('inputFullName').value.trim();
  
  // 👈 Lấy Số điện thoại chuẩn +84 từ thư viện
  const newPhone = profilePhoneIti ? profilePhoneIti.getNumber() : document.getElementById('inputPhone').value.trim();
  
  const rawDob = document.getElementById('inputDob').value.trim();
  const newEmail = document.getElementById('inputEmail').value.trim();

  // Ô Ngày sinh giờ chọn qua Flatpickr nên giá trị đã sẵn dạng chuẩn YYYY-MM-DD
  let isoDob = null;
  if (rawDob) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
      isoDob = rawDob; // Giá trị Flatpickr trả về (dateFormat: "Y-m-d")
    } else {
      // Dự phòng: nếu vì lý do nào đó vẫn là chuỗi dd/mm/yyyy kiểu cũ
      isoDob = formatToISO(rawDob);
    }
    if (!isoDob) {
      notify("⚠️ Ngày sinh không hợp lệ! Vui lòng chọn lại từ lịch.");
      return;
    }
  }

  try {
    const { error: profileErr } = await sbClient
      .from('profiles')
      .upsert(
        {
          id: currentUser.id,
          full_name: newName,
          phone: newPhone, // Lưu SĐT chuẩn dạng +84... xuống DB
          dob: isoDob,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (profileErr) throw profileErr;

    if (newEmail && newEmail !== currentUser.email) {
      const { error: authErr } = await sbClient.auth.updateUser({ email: newEmail });
      if (authErr) throw authErr;
      notify("🎉 Đã lưu thông tin! Vui lòng kiểm tra email mới để xác nhận.");
    } else {
      notify("🎉 Cập nhật thông tin cá nhân thành công!");
    }

    await initProfile(); // Tải lại dữ liệu trang

  } catch (err) {
    notify("❌ Lỗi cập nhật: " + (err.message || "Không thể lưu dữ liệu"));
  }
}
// --- HÀM CẬP NHẬT MẬT KHẨU ---
async function handleUpdatePassword(e) {
  e.preventDefault();
  const newPassword = document.getElementById('inputNewPassword').value;
  const confirmPassword = document.getElementById('inputConfirmPassword').value;

  if (newPassword !== confirmPassword) {
    notify("⚠️ Mật khẩu xác nhận không trùng khớp!");
    return;
  }

  try {
    const { error } = await sbClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    // Tắt cờ must_change_password (nếu có) vì học sinh đã tự đổi mật khẩu mới
    await sbClient.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
    document.getElementById('mustChangePwBanner')?.classList.add('hidden');

    notify("🎉 Đổi mật khẩu thành công!");
    togglePasswordEdit(false); // Khóa lại và xóa ô nhập

  } catch (err) {
    notify("❌ Không thể đổi mật khẩu: " + err.message);
  }
}

  // 4. Các hàm giao diện chung
  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  }

async function handleLogout() {
  sessionStorage.clear();
  await sbClient.auth.signOut();
  window.location.href = 'index.html';
}
  
window.onload = initProfile;

let ratings = { q1: 5, q2: 5, q3: 5 };

  function openSupportModal() {
    showSupportChoice();
    document.getElementById('supportModal').classList.remove('hidden');
    // Tự động điền tên + email nếu học viên đã đăng nhập
    if (typeof currentUser !== 'undefined' && currentUser) {
      document.getElementById('spEmail').value = currentUser.email || '';
      document.getElementById('spFullName').value = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    }
  }

  function closeSupportModal() { document.getElementById('supportModal').classList.add('hidden'); }
  function showSupportChoice() {
    document.getElementById('supportChoiceView').classList.remove('hidden');
    document.getElementById('createTicketForm').classList.add('hidden');
    document.getElementById('ticketHistoryView').classList.add('hidden');
  }
  function showCreateTicketForm() {
    document.getElementById('supportChoiceView').classList.add('hidden');
    document.getElementById('createTicketForm').classList.remove('hidden');
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    const ticketCode = 'TK-' + Math.floor(10000 + Math.random() * 90000);
    const payload = {
      ticket_code: ticketCode,
      user_id: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null,
      full_name: document.getElementById('spFullName').value,
      email: document.getElementById('spEmail').value,
      title: document.getElementById('spTitle').value,
      content: document.getElementById('spContent').value
    };

    const { error } = await sbClient.from('support_tickets').insert([payload]);
    if (error) { notify("❌ Lỗi gửi yêu cầu: " + error.message); return; }

    notify(`✅ Gửi yêu cầu thành công! Mã hỗ trợ của bạn là: ${ticketCode}`);
    document.getElementById('spTitle').value = '';
    document.getElementById('spContent').value = '';
    showTicketHistoryView();
  }

  async function showTicketHistoryView() {
    document.getElementById('supportChoiceView').classList.add('hidden');
    document.getElementById('ticketHistoryView').classList.remove('hidden');
    
    const container = document.getElementById('ticketListContainer');
    container.innerHTML = '<p class="text-xs text-gray-400">Đang tải dữ liệu...</p>';

    let query = sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (typeof currentUser !== 'undefined' && currentUser) {
      query = query.eq('user_id', currentUser.id);
    } else {
      const inputEmail = prompt("Nhập Email của bạn để kiểm tra lịch sử hỗ trợ:");
      if (!inputEmail) { showSupportChoice(); return; }
      query = query.eq('email', inputEmail.trim());
    }

    const { data: tickets, error } = await query;
    if (error || !tickets || tickets.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Chưa có lịch sử yêu cầu hỗ trợ nào.</p>';
      return;
    }

    // Render giao diện thẻ phản hồi chuẩn như ảnh đính kèm
    container.innerHTML = tickets.map(t => `
      <div class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border dark:border-zinc-700 space-y-2 text-xs">
        <div class="flex justify-between items-start gap-2">
          <strong class="text-gray-900 dark:text-white font-bold">${t.title}</strong>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
            Mã: ${t.ticket_code}
          </span>
        </div>
        <p class="text-gray-500 text-[11px]">Ngày gửi: ${new Date(t.created_at).toLocaleString('vi-VN')}</p>
        <div class="text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border dark:border-zinc-800">
          ${t.content}
        </div>
        ${t.admin_reply ? `
          <div class="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/40 text-xs space-y-1">
            <span class="font-bold text-[#cf1717] block"><i class="bi bi-chat-dots-fill"></i> Trả lời từ hỗ trợ:</span>
            <p class="text-gray-800 dark:text-gray-200">${t.admin_reply}</p>
          </div>
        ` : `
          <p class="text-[11px] text-yellow-600 italic"><i class="bi bi-hourglass-split"></i> Đang chờ Quản trị viên phản hồi...</p>
        `}
      </div>
    `).join('');
  }

  // KHẢO SÁT
  function openFeedbackModal() { document.getElementById('feedbackModal').classList.remove('hidden'); setRating(1, 5); setRating(2, 5); setRating(3, 5); }
  function closeFeedbackModal() { document.getElementById('feedbackModal').classList.add('hidden'); }
  
  function setRating(qNum, starCount) {
    ratings[`q${qNum}`] = starCount;
    const stars = document.querySelectorAll(`#starQ${qNum} .star${qNum}`);
    stars.forEach((s, idx) => {
      s.className = `star${qNum} ${idx < starCount ? 'text-amber-400' : 'text-gray-300'}`;
    });
  }

  async function handleSendFeedback(e) {
    e.preventDefault();
    const payload = {
      q1_rating: ratings.q1,
      q2_rating: ratings.q2,
      q3_rating: ratings.q3,
      comment: document.getElementById('fbComment').value
    };

    const { error } = await sbClient.from('feedbacks').insert([payload]);
    if (error) { notify("❌ Lỗi gửi đánh giá: " + error.message); return; }

    notify("❤️ Cảm ơn bạn đã đóng góp ý kiến cho ReadUp English!");
    document.getElementById('fbComment').value = '';
    closeFeedbackModal();
  }
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Chạy 1 lần rồi dừng
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveal);
//Xem mật khẩu
  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('svg');

    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.04 10.04 0 013.122-.563c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
      `;
    } else {
      input.type = 'password';
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  }
   // ===== Dropdown "dải chọn" (menu section) & menu Trang cá nhân =====
  function toggleSectionNavMenu(e) {
    if (e) e.stopPropagation();
    pel('userDropdownMenu')?.classList.add('hidden');
    pel('sectionNavMenu')?.classList.toggle('hidden');
  }
  function toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    pel('sectionNavMenu')?.classList.add('hidden');
    pel('userDropdownMenu')?.classList.toggle('hidden');
  }
  document.addEventListener('click', () => {
    pel('sectionNavMenu')?.classList.add('hidden');
    pel('userDropdownMenu')?.classList.add('hidden');
  });
