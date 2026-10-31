/* Source: assets/js/pages/post.03.js */

const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let HOME = 'dashboard.html';
let currentUser = null, allPosts = [], page = 1, q = '';
const PER = 6;
const $ = id => document.getElementById(id);
const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const fmt = d => new Date(d).toLocaleDateString('vi-VN');
const link = p => 'post.html?token=' + encodeURIComponent(p.token);

function notify(m, icon='bi-info-circle-fill'){
  const t=document.createElement('div');
  t.className='fixed top-20 right-4 z-[9999] max-w-xs bg-white dark:bg-zinc-900 border-l-4 border-[#cf1717] shadow-2xl rounded-xl p-4 text-xs font-bold text-gray-800 dark:text-white';
  const i=document.createElement('i'); i.className='bi '+icon+' mr-1.5';
  const sp=document.createElement('span'); sp.textContent=m;
  t.append(i,sp); document.body.appendChild(t); setTimeout(()=>t.remove(),4500);
}
function toggleDarkMode(){const d=document.documentElement.classList.toggle('dark');localStorage.theme=d?'dark':'light';}
async function handleLogout(){await sbClient.auth.signOut();window.location.href='index.html';}
function toggleUserDropdown(e){if(e)e.stopPropagation();if(!currentUser){window.location.href='login.html';return;}$('userDropdownMenu')?.classList.toggle('hidden');$('sectionNavMenu')?.classList.add('hidden');}
function toggleSectionNavMenu(e){if(e)e.stopPropagation();$('sectionNavMenu')?.classList.toggle('hidden');$('userDropdownMenu')?.classList.add('hidden');}
document.addEventListener('click',e=>{['userDropdownMenu','sectionNavMenu'].forEach(id=>{const m=$(id);if(m&&!m.contains(e.target))m.classList.add('hidden');});});

const thumb = (p,cls) => p.thumbnail_url
  ? `<img src="${esc(p.thumbnail_url)}" alt="${esc(p.title)}" loading="lazy" class="${cls} object-cover">`
  : `<div class="${cls} bg-gradient-to-br from-red-600 to-[#cf1717] flex items-center justify-center text-white text-4xl"><i class="bi bi-book"></i></div>`;

async function initPost(){
  const {data:{session}} = await sbClient.auth.getSession();
  if(!session?.user){
    // Khách chưa đăng nhập: vẫn xem được bài đăng
    currentUser = null;
    HOME = 'index.html';
    $('welcomeUser').classList.add('hidden');
    $('sectionNavWrap')?.classList.add('hidden');
    ['logoLink1','logoLink2'].forEach(id=>{const a=$(id); if(a) a.href='index.html';});
    const t = new URLSearchParams(location.search).get('token');
    t ? showDetail(t) : showList();
    return;
  }
  currentUser = session.user;
  sbClient.from('profiles').select('full_name, avatar_url').eq('id',currentUser.id).maybeSingle().then(({data:p})=>{
    const n = p?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Người dùng';
    $('welcomeUser').innerHTML = `<i class="bi bi-person-check mr-1"></i>Chào, ${esc(n)}`; $('dropdownUserName').innerText = n;
    if(p?.avatar_url){$('headerAvatarImg').src=p.avatar_url;$('headerAvatarImg').classList.remove('hidden');$('headerAvatarIcon').classList.add('hidden');}
  });
  const token = new URLSearchParams(location.search).get('token');
  token ? showDetail(token) : showList();
}

async function showList(){
  $('crumb').innerHTML = `<a href="${HOME}" class="hover:text-[#cf1717]">Trang Chủ</a><span>›</span><span class="text-gray-800 dark:text-gray-200 font-bold">Bài Học</span>`;
  $('listView').classList.remove('hidden');
  const {data,error} = await sbClient.from('posts').select('id,title,token,thumbnail_url,excerpt,created_at').eq('is_published',true).order('created_at',{ascending:false});
  if(error) $('postList').innerHTML = `<p class="py-8 text-sm text-red-500"><i class="bi bi-x-circle mr-1"></i>${esc(error.message)}</p>`;
  allPosts = data || []; renderList();
}

function renderList(){
  const kw = norm(q);
  const rows = allPosts.filter(p => !kw || norm(p.title+' '+p.excerpt).includes(kw));
  const pages = Math.max(1, Math.ceil(rows.length/PER)); if(page>pages) page=pages;
  const cur = rows.slice((page-1)*PER, page*PER);
  $('postList').innerHTML = cur.length ? cur.map(p => `
    <a href="${link(p)}" class="group flex flex-col sm:flex-row gap-5 py-6 border-b last:border-b-0 border-gray-200 dark:border-zinc-800">
      <div class="sm:w-56 sm:h-56 flex-shrink-0 overflow-hidden rounded-xl shadow">${thumb(p,'w-full h-48 sm:h-56 group-hover:scale-105 transition duration-300')}</div>
      <div class="min-w-0 flex-1">
        <h3 class="text-lg sm:text-2xl font-extrabold text-gray-800 dark:text-white group-hover:text-[#cf1717] transition">${esc(p.title)}</h3>
        <p class="mt-3 text-sm sm:text-base text-gray-400 line-clamp-4">${esc(p.excerpt)} … <span class="text-[#cf1717] font-bold">Xem tiếp</span></p>
        <p class="mt-3 text-[11px] text-gray-400"><i class="bi bi-calendar-event mr-1"></i>${fmt(p.created_at)}</p>
      </div>
    </a>`).join('') : '<p class="py-10 text-center text-sm text-gray-400">Chưa có bài học nào.</p>';
  $('postPager').innerHTML = pages<2 ? '' : Array.from({length:pages},(_,i)=>i+1).map(n =>
    `<button onclick="page=${n};renderList();window.scrollTo({top:0,behavior:'smooth'})" class="w-9 h-9 rounded-lg text-xs font-bold transition ${n===page?'bg-[#cf1717] text-white shadow':'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-zinc-700'}">${n}</button>`).join('');
}


let latestIdx = 0, latestCount = 0, latestPausedUntil = 0, latestTimer = null;
const LATEST_AUTO_MS = 4500;
const LATEST_LIMIT = 6; // số bài hiển thị ở mục "Bài viết mới nhất"

function renderLatestSlider(list){
  const track = $('latestList'), dots = $('latestDots');
  if(!list.length){ track.innerHTML = '<p class="text-xs text-gray-400">Chưa có bài khác.</p>'; dots.innerHTML=''; return; }
  latestCount = list.length; latestIdx = 0;
  track.innerHTML = list.map(l => `
    <div class="snap-start shrink-0 w-full px-0.5 py-1">
      <a href="${link(l)}" class="latest-anim group block rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/60 hover:border-[#cf1717] hover:shadow-lg transition-all duration-300">
        <div class="overflow-hidden">${thumb(l,'w-full h-40 group-hover:scale-105 transition duration-500')}</div>
        <div class="p-3.5">
          <p class="text-[11px] text-gray-400 mb-1"><i class="bi bi-calendar-event mr-1"></i>${fmt(l.created_at)}</p>
          <h4 class="text-sm font-extrabold text-gray-800 dark:text-white line-clamp-2 group-hover:text-[#cf1717] transition">${esc(l.title)}</h4>
          ${l.excerpt ? `<p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${esc(l.excerpt)}</p>` : ''}
          <span class="inline-block mt-2 text-xs font-bold text-[#cf1717]">Đọc thêm <i class="bi bi-arrow-right"></i></span>
        </div>
      </a>
    </div>`).join('');
  track.scrollLeft = 0;
  dots.innerHTML = latestCount > 1
    ? list.map((_,i)=>`<button type="button" onclick="goLatest(${i},true)" aria-label="Bài ${i+1}" class="latest-dot"></button>`).join('') : '';
  updateLatestDots();

  if(!track.dataset.bound){
    track.dataset.bound = '1';
    let t;
    track.addEventListener('scroll', ()=>{
      clearTimeout(t);
      t = setTimeout(()=>{
        latestIdx = Math.max(0, Math.min(latestCount-1, Math.round(track.scrollLeft/(track.clientWidth||1))));
        updateLatestDots();
      }, 60);
    }, {passive:true});
    const pause = ()=>{ latestPausedUntil = Date.now()+8000; };
    ['pointerdown','touchstart','wheel','mouseenter','focusin'].forEach(ev=>track.addEventListener(ev,pause,{passive:true}));
    track.addEventListener('mouseleave', ()=>{ latestPausedUntil = Date.now()+1500; });
  }
  clearInterval(latestTimer);
  if(latestCount > 1){
    latestTimer = setInterval(()=>{
      if(document.hidden || Date.now() < latestPausedUntil) return;
      goLatest((latestIdx+1) % latestCount);
    }, LATEST_AUTO_MS);
  }
}
function updateLatestDots(){
  document.querySelectorAll('#latestDots .latest-dot').forEach((d,i)=>{
    const on = i === latestIdx;
    d.style.width = on ? '24px' : '8px';
    d.style.background = on ? '#cf1717' : '';
    d.classList.toggle('bg-gray-300', !on);
    d.classList.toggle('dark:bg-zinc-600', !on);
  });
}
function goLatest(i, byUser){
  const track = $('latestList'); if(!track || !latestCount) return;
  if(byUser) latestPausedUntil = Date.now()+8000;
  latestIdx = (i + latestCount) % latestCount;
  track.scrollTo({left: latestIdx*track.clientWidth, behavior:'smooth'});
  updateLatestDots();
}

async function showDetail(token){
  $('detailView').classList.remove('hidden');
  const {data:p} = await sbClient.from('posts').select('*').eq('token',token).eq('is_published',true).maybeSingle();
  if(!p){
    $('crumb').innerHTML = `<a href="${HOME}" class="hover:text-[#cf1717]">Trang Chủ</a><span>›</span><a href="post.html" class="hover:text-[#cf1717]">Bài Học</a>`;
    $('dTitle').innerText='Không tìm thấy bài học'; $('dContent').innerHTML='<p>Bài học không tồn tại hoặc đã bị gỡ.</p>'; return;
  }
  document.title = p.title + ' | ReadUp English';
  $('crumb').innerHTML = `<a href="${HOME}" class="hover:text-[#cf1717]">Trang Chủ</a><span>›</span><a href="post.html" class="hover:text-[#cf1717]">Bài Học</a><span>›</span><span class="text-gray-800 dark:text-gray-200 font-bold">${esc(p.title)}</span>`;
  $('dTitle').innerText = p.title; $('dDate').innerHTML = '<i class="bi bi-calendar-event mr-1"></i>' + fmt(p.created_at);
  $('dContent').innerHTML = (p.content_html||'').replace(/<script[\s\S]*?<\/script>/gi,'');
  const {data:latest} = await sbClient.from('posts').select('title,token,thumbnail_url,excerpt,created_at').eq('is_published',true).neq('token',token).order('created_at',{ascending:false}).limit(LATEST_LIMIT);
  renderLatestSlider(latest || []);
}

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
    if (error) { notify("Lỗi gửi yêu cầu: " + error.message, 'bi-x-circle-fill'); return; }

    notify(`Gửi yêu cầu thành công! Mã hỗ trợ của bạn là: ${ticketCode}`, 'bi-check-circle-fill');
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
            <span class="font-bold text-[#cf1717] block"><i class="bi bi-chat-left-text mr-1"></i>Trả lời từ hỗ trợ:</span>
            <p class="text-gray-800 dark:text-gray-200">${t.admin_reply}</p>
          </div>
        ` : `
          <p class="text-[11px] text-yellow-600 italic"><i class="bi bi-hourglass-split mr-1"></i>Đang chờ Quản trị viên phản hồi...</p>
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
      s.className = `bi bi-star-fill star${qNum} ${idx < starCount ? 'text-amber-400' : 'text-gray-300'}`;
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
    if (error) { notify("Lỗi gửi đánh giá: " + error.message, 'bi-x-circle-fill'); return; }

    notify("Cảm ơn bạn đã đóng góp ý kiến cho ReadUp English!", 'bi-heart-fill');
    document.getElementById('fbComment').value = '';
    closeFeedbackModal();
  }
  
window.onload = initPost;

;
/* Source: assets/js/pages/post.04.js */

  (function () {
    const tab = document.getElementById('assignmentSideTab');
    if (!tab) return;

    // Luôn hiển thị tab
    tab.classList.add('show');
    // Khách chưa đăng nhập -> chuyển tới login
    sbClient.auth.getSession().then(({data:{session}})=>{ if(!session?.user) tab.href='login.html'; });

    // Sơ đồ sự kiện click giữ nguyên
    tab.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const r = tab.getBoundingClientRect();
      if (window.readupFireworks && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.readupFireworks(r.left - 100, r.top + r.height / 2);
        setTimeout(function () { location.href = tab.href; }, 1100);
      } else {
        location.href = tab.href;
      }
    });
  })();

;
/* Source: assets/js/page-loader.js */
/* Màn hình chờ dùng chung. Không sửa đổi hoặc can thiệp vào hàm gốc của từng trang. */
(function () {
  'use strict';
  var overlay = document.getElementById('ru-page-loader');
  if (!overlay) return;
  var pathname = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  var protectedPages = [
    'admin.html', 'dashboard.html', 'editlml.html', 'exam.html',
    'profile.html', 'room.html', 'teacher.html', 'vocab.html', 'gamevocab.html'
  ];
  var isDemo = pathname === 'gamevocab.html' && new URLSearchParams(location.search).has('demo');
  var requiresLogin = protectedPages.indexOf(pathname) !== -1 && !isDemo;
  var dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('ru-page-loader--done');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 190);
  }
  function fail() {
    if (requiresLogin) {
      // Giữ nguyên đích chuyển hướng đăng nhập như các trang hiện tại.
      window.location.replace('index.html');
      return;
    }
    dismiss();
  }
  async function verifyAndReveal() {
    // Các trang công khai không cần đợi Supabase để hiện nội dung.
    if (!requiresLogin) { dismiss(); return; }
    if (typeof sbClient === 'undefined' || !sbClient || !sbClient.auth) {
      // Trang công khai hoặc phòng thi không dùng sbClient.
      if (requiresLogin) { fail(); return; }
      dismiss();
      return;
    }
    try {
      // Dùng lại Supabase client sẵn có của trang; không tạo thêm phiên hay client mới.
      var authResult = await sbClient.auth.getSession();
      var user = authResult && authResult.data && authResult.data.session && authResult.data.session.user;
      if (requiresLogin && !user) { fail(); return; }
      // Trang quyền hạn giáo viên/admin tiếp tục được kiểm tra role bằng logic có sẵn.
      dismiss();
    } catch (error) {
      console.warn('Không kiểm tra được phiên đăng nhập:', error);
      fail();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyAndReveal, { once: true });
  } else {
    verifyAndReveal();
  }
}());
