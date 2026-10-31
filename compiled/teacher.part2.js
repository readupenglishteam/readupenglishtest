/* Source: assets/js/ru-preview.js */
/* ReadUp teacher/admin question preview: no submissions, no score writes. */
(function (w) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed = new Set('P BR DIV SPAN B STRONG I EM U S SUB SUP H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE HR TABLE THEAD TBODY TFOOT TR TH TD CAPTION COLGROUP COL IMG A FONT SMALL BIG CODE PRE MARK SECTION ARTICLE HEADER FOOTER NAV ASIDE DL DT DD ABBR DEL INS Q CITE KBD SAMP VAR WBR LABEL DETAILS SUMMARY AUDIO SOURCE VIDEO FIGURE FIGCAPTION'.split(' '));
  const drop = new Set('SCRIPT IFRAME OBJECT EMBED FORM INPUT TEXTAREA BUTTON SELECT OPTION SVG MATH LINK META BASE TEMPLATE'.split(' '));
  // Inline style="" : whitelisted properties (layout properties included so Flex/Grid designs keep working).
  const styleOK = /^(color|background|background-color|font|font-family|font-size|font-weight|font-style|font-variant|text-decoration|text-decoration-color|text-align|text-indent|text-transform|text-shadow|line-height|letter-spacing|word-spacing|word-break|overflow-wrap|hyphens|border|border-(top|right|bottom|left)(-(color|width|style))?|border-color|border-width|border-style|border-radius|border-collapse|border-spacing|outline|outline-offset|box-shadow|box-sizing|opacity|padding(-(left|right|top|bottom))?|margin(-(left|right|top|bottom))?|width|max-width|min-width|height|max-height|min-height|vertical-align|list-style|list-style-type|list-style-position|white-space|display|flex|flex-(direction|wrap|flow|grow|shrink|basis)|order|align-(items|content|self)|justify-(content|items|self)|place-(items|content|self)|gap|row-gap|column-gap|grid|grid-(template|template-columns|template-rows|template-areas|column|row|area|auto-flow|auto-columns|auto-rows|column-start|column-end|row-start|row-end)|float|clear|overflow|overflow-x|overflow-y|position|top|right|bottom|left|aspect-ratio|object-fit|columns|column-count|column-gap|cursor)$/i;
  const badVal = /url\s*\(|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import|image-set\s*\(|[<>\\]/i;
  const badDecl = (p, v) => badVal.test(v) || (/^position$/i.test(p) && /fixed|sticky/i.test(v));
  // ---- <style> support: sanitise + scope every rule under a unique wrapper so it cannot leak out of the question ----
  function splitSel(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
  function scopeSel(sel, scope) {
    return splitSel(sel).map(s => {
      s = s.trim(); if (!s) return '';
      if (s.startsWith(scope)) return s;
      if (/^(html|body|:root)(?![\w-])/i.test(s)) return s.replace(/^(html|body|:root)/i, scope);
      return scope + ' ' + s;
    }).filter(Boolean).join(',');
  }
  function declText(st) {
    let clean = true;
    for (let i = 0; i < st.length; i++) { const p = st[i], v = st.getPropertyValue(p); if (/^(z-index|behavior|-moz-binding)$/i.test(p) || (p.startsWith('--') ? badVal.test(v) : badDecl(p, v))) { clean = false; break; } }
    if (clean) return st.cssText;
    let out = '';
    for (let i = 0; i < st.length; i++) {
      const p = st[i], v = st.getPropertyValue(p);
      if (p.startsWith('--')) { if (badVal.test(v)) continue; }
      else if (/^(z-index|behavior|-moz-binding)$/i.test(p) || badDecl(p, v)) continue;
      out += `${p}:${v}${st.getPropertyPriority(p) ? ' !important' : ''};`;
    }
    return out;
  }
  function scopeRules(rules, scope) {
    let out = '';
    for (const r of Array.from(rules)) {
      if (r.type === 1) { const d = declText(r.style); if (d) out += `${scopeSel(r.selectorText, scope)}{${d}}`; }
      else if (r.type === 4 || r.type === 12) { const inner = scopeRules(r.cssRules, scope); if (inner) out += `@${r.type === 4 ? 'media' : 'supports'} ${r.conditionText || (r.media && r.media.mediaText) || ''}{${inner}}`; }
      else if (r.type === 7) { if (!badVal.test(r.cssText)) out += r.cssText; }
    }
    return out;
  }
  function hashOf(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function scopedCss(css, scope) {
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(css); return scopeRules(sheet.cssRules, scope).replace(/</g, ''); }
    catch (e) { return ''; }
  }
  const WRAP_RE = /^\s*<div class="ru-scope (ru-s-[a-z0-9]+)">/i;
  // Turn stored (scoped) HTML back into the "natural" code the teacher originally wrote (for the HTML tab).
  function unscope(html) {
    html = String(html ?? ''); const m = html.match(WRAP_RE); if (!m) return html;
    const cls = '.' + m[1];
    let inner = html.replace(WRAP_RE, '').replace(/<\/div>\s*$/i, '');
    inner = inner.replace(/<style[^>]*>([\s\S]*?)<\/style>/i, (all, css) => '<style>\n' + css.split(cls + ' ').join('').split(cls).join('body').replace(/\}(?=[^\n])/g, '}\n') + '</style>');
    return inner;
  }
  function clean(html) {
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    // 1) Re-open content that was already wrapped by an earlier clean() so it stays idempotent.
    let scope = '';
    const first = doc.body.firstElementChild;
    if (first && first.tagName === 'DIV' && first.classList.contains('ru-scope') && doc.body.children.length === 1) {
      scope = '.' + Array.from(first.classList).find(c => /^ru-s-/.test(c));
      first.replaceWith(...Array.from(first.childNodes));
    }
    // 2) Collect all <style> blocks (kept only if they survive sanitising).
    let rawCss = '';
    doc.querySelectorAll('style').forEach(s => { rawCss += s.textContent + '\n'; s.remove(); });
    function walk(node) {
      for (const child of Array.from(node.children)) {
        if (drop.has(child.tagName)) { child.remove(); continue; }
        if (!allowed.has(child.tagName)) { walk(child); child.replaceWith(...Array.from(child.childNodes)); continue; }
        for (const a of Array.from(child.attributes)) {
          const k = a.name.toLowerCase(), v = a.value.trim();
          if (k.startsWith('on') || k === 'srcdoc') { child.removeAttribute(a.name); continue; }
          if (k === 'style') {
            const safe = v.split(';').map(x => x.trim()).filter(x => {
              const i = x.indexOf(':'); if (i < 1) return false;
              const p = x.slice(0, i).trim(), val = x.slice(i + 1).trim();
              return styleOK.test(p) && !badDecl(p, val);
            }).join(';');
            if (safe) child.setAttribute('style', safe); else child.removeAttribute('style');
          } else if (k === 'href' || k === 'src') {
            if (!/^(https?:\/\/|\/[^/]|#|data:image\/(png|jpeg|gif|webp);base64,|data:audio\/(mpeg|mp3|wav|ogg);base64,)/i.test(v)) child.removeAttribute(a.name);
          } else if (!['class','title','alt','width','height','colspan','rowspan','align','target','rel','controls','poster','type','start','open','lang','dir'].includes(k)) child.removeAttribute(a.name);
        }
        if (child.tagName === 'A') child.setAttribute('rel','noopener noreferrer');
        walk(child);
      }
    }
    walk(doc.body);
    let out = doc.body.innerHTML;
    if (rawCss.trim()) {
      const sc = scope || ('.ru-s-' + hashOf(rawCss.replace(/\s+/g, '')));
      const css = scopedCss(rawCss, sc);
      if (css) out = `<div class="ru-scope ${sc.slice(1)}"><style>${css}</style>${out}</div>`;
    }
    return out;
  }
  const typeLabels = {mcq:'Trắc nghiệm',multi:'Chọn nhiều đáp án',tf:'Đúng / Sai',fill:'Điền khuyết',essay:'Tự luận',text:'Hướng dẫn',reading:'Bài đọc'};
  let current = null, mode = 'paper', oldOverflow = '';
  function answersOf(q) {
    const blanks = q.blanks;
    if (Array.isArray(blanks)) return blanks.map(b => `${b.gap}: ${(b.accepted_answers || []).join(' / ')}`).join(' · ');
    if (blanks && typeof blanks === 'object') return Object.entries(blanks).map(([key,val]) => `${key}: ${val}`).join(' · ');
    return '';
  }
  function count(qs) { return (qs||[]).reduce((n,q) => n+(q.type==='reading'?count(q.sub_blocks):q.type==='text'?0:1),0); }
  function renderOne(q, index, isAnswer) {
    if (!q || typeof q !== 'object') return '';
    if (q.type === 'reading') return `<section class="rup-reading"><div class="rup-reading__label">BÀI ĐỌC · READING</div><div class="rup-rich ${q.two_col ? 'rup-two-col' : ''}">${clean(q.content)}</div><div class="rup-reading__questions">${renderQs(q.sub_blocks || [],isAnswer)}</div></section>`;
    const name = typeLabels[q.type] || q.type || 'Câu hỏi';
    let content = clean(q.content);
    if (q.type === 'fill') content = content.replace(/\{\{(\d+)\}\}/g, (_,n) => `<span class="rup-gap" title="Chỗ trống ${n}">${isAnswer ? esc((() => { const b=q.blanks; const v=Array.isArray(b)?b.find(x=>String(x.gap)===n)?.accepted_answers?.[0]:b?.[n]; return typeof v==='string'?v.split(';')[0]:v || '_____';})()) : '________'}</span>`);
    let details='';
    if (Array.isArray(q.options)) details=`<div class="rup-options">${q.options.map((o,i) => `<div class="rup-option ${isAnswer&&o.correct?'rup-correct':''}"><span class="rup-option__marker">${String.fromCharCode(65+i)}.</span><span class="rup-rich">${clean(o.text)}</span>${isAnswer&&o.correct?'<b class="rup-correct-label">✓ Đúng</b>':''}</div>`).join('')}</div>`;
    if (q.type === 'essay') details += '<div class="rup-essay">Không gian trả lời tự luận</div>';
    if (isAnswer && q.type==='fill' && answersOf(q)) details+=`<div class="rup-answer">Đáp án: ${esc(answersOf(q))}</div>`;
    if (isAnswer && q.explanation) details+=`<div class="rup-explanation"><b>Giải thích:</b> ${clean(q.explanation)}</div>`;
    return `<article class="rup-question"><div class="rup-question__head"><b>${q.type==='text'?'Hướng dẫn':`Câu ${index}`}</b><span>${esc(name)}${q.type==='text'?'':` · ${esc(q.points ?? 1)} điểm`}</span></div><div class="rup-rich">${content}</div>${details}</article>`;
  }
  function renderQs(qs, answer) {
    let number=0;
    return (qs || []).map(q => renderOne(q, q.type === 'text' || q.type === 'reading' ? '' : ++number, answer)).join('') || '<p class="rup-empty">Chưa có câu hỏi.</p>';
  }
  function ensure() {
    let el = document.getElementById('ruPreviewOverlay'); if(el) return el;
    el = document.createElement('div'); el.id='ruPreviewOverlay'; el.className='rup-overlay';
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Xem trước bài thi và đáp án');
    el.innerHTML=`<div class="rup-shell"><div class="rup-header"><div><strong>ReadUp <span>English</span> · Xem thử</strong><small>Chỉ xem trước — không ghi kết quả học sinh</small></div><button type="button" class="rup-close" data-rup-close aria-label="Đóng">✕</button></div><div class="rup-toolbar"><div class="rup-modes"><button type="button" data-rup-mode="paper">📄 Xem dạng đề thi</button><button type="button" data-rup-mode="answer">✅ Xem dạng đáp án</button></div><button type="button" data-rup-print>🖨 In / PDF</button></div><div class="rup-scroll"><div id="ruPreviewContent" class="rup-document"></div></div></div>`;
    el.addEventListener('click', e => {
      if(e.target===el || e.target.closest('[data-rup-close]')) close();
      const btn = e.target.closest('[data-rup-mode]'); if(btn) setMode(btn.dataset.rupMode);
      if(e.target.closest('[data-rup-print]')) window.print();
    });
    document.body.append(el); return el;
  }
  function render() {
    if(!current) return;
    const container=document.getElementById('ruPreviewContent'), show=mode==='answer';
    container.innerHTML=`<div class="rup-doc-brand">READUP ENGLISH · ${current.is_test ? 'BÀI TEST':'BÀI TẬP / READING'}</div><h1>${esc(current.title || 'Bài chưa đặt tên')}</h1><div class="rup-metadata"><span>${count(current.questions)} câu</span>${current.time_limit ? `<span>${esc(current.time_limit)} phút</span>`:''}${current.total_points!=null?`<span>${esc(current.total_points)} điểm</span>`:''}<span>${show?'BẢN ĐÁP ÁN':'BẢN ĐỀ THI'}</span></div>${current.description?`<div class="rup-description">${esc(current.description)}</div>`:''}${current.passage_html?`<section class="rup-reading"><div class="rup-reading__label">READING PASSAGE</div><div class="rup-rich">${clean(current.passage_html)}</div></section>`:''}<div class="rup-question-list">${renderQs(current.questions,show)}</div>`;
    document.querySelectorAll('[data-rup-mode]').forEach(b=>{b.classList.toggle('rup-active',b.dataset.rupMode===mode);b.setAttribute('aria-pressed',String(b.dataset.rupMode===mode));});
  }
  function setMode(v) { mode=v==='answer'?'answer':'paper';render(); }
  function open(data) {
    if(!data || !Array.isArray(data.questions)) throw new Error('Dữ liệu câu hỏi không hợp lệ.');
    current=data;mode='paper'; ensure();oldOverflow=document.body.style.overflow;
    document.getElementById('ruPreviewOverlay').classList.add('rup-visible');document.body.style.overflow='hidden';render();
  }
  function close() { const modal=document.getElementById('ruPreviewOverlay');if(modal)modal.classList.remove('rup-visible');document.body.style.overflow=oldOverflow;current=null; }
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.getElementById('ruPreviewOverlay')?.classList.contains('rup-visible'))close(); });
  w.RUPreview={open,close,setMode,clean,unscope};
})(window);

;
/* Source: assets/js/ru-editor.js */
/* Safe WYSIWYG/HTML dual editor with immediately rendered HTML preview. */
(function (w) {
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clean=html=>w.RUPreview?.clean ? w.RUPreview.clean(html) : String(html||'');
 function button(id,prefix='qc-') {
   const idAttr=escape(prefix+id);
   return `<div class="rue-tabs" data-rue-for="${idAttr}"><button type="button" class="rue-selected" data-rue-visual="${idAttr}" onclick="RUEditor.toggle('${idAttr}','visual')"><i class="bi bi-palette" aria-hidden="true"></i> Trực quan</button><button type="button" data-rue-html="${idAttr}" onclick="RUEditor.toggle('${idAttr}','html')"><i class="bi bi-code-slash" aria-hidden="true"></i> HTML + Xem nhanh</button><span><i class="bi bi-info-circle" aria-hidden="true"></i> Dùng <code>style="..."</code> hoặc <code>&lt;style&gt;</code> với thuộc tính CSS an toàn; JavaScript/iframe bị chặn.</span></div>`;
 }
 function fieldUpdate(selector,value){const id=selector.slice(3),kind=selector.slice(0,2);if(kind==='qb'&&typeof w.qbUpdate==='function')w.qbUpdate(id,'content',value);if(kind==='qc'&&typeof w.updateField==='function')w.updateField(id,'content',value);}
 function workbench(visual){
   const bench=document.createElement('div');bench.className='rue-workbench';bench.hidden=true;
   bench.innerHTML=`<div class="rue-code"><div class="rue-pane-label"><i class="bi bi-code-slash"></i> Mã nguồn HTML</div><textarea class="rue-source" spellcheck="false" aria-label="Mã nguồn HTML của câu hỏi" placeholder="<section style=\"background:#fff8e1;padding:16px;border-radius:10px\">Nội dung…</section>"></textarea></div><div class="rue-preview-pane"><div class="rue-pane-label"><i class="bi bi-eye"></i> Giao diện xem trước <span>(tự cập nhật)</span></div><div class="rue-preview-content ru-rich qcontent"></div></div>`;
   visual.insertAdjacentElement('afterend',bench);return bench;
 }
 function toggle(selector,mode){
   const visual=document.getElementById(selector),tabs=document.querySelector(`[data-rue-for="${CSS.escape(selector)}"]`);if(!visual||!tabs)return;
   const bench=visual.nextElementSibling?.classList.contains('rue-workbench')?visual.nextElementSibling:workbench(visual),ta=bench.querySelector('textarea'),preview=bench.querySelector('.rue-preview-content');
   if(mode==='html'){
     ta.value=(w.RUPreview&&w.RUPreview.unscope?w.RUPreview.unscope(visual.innerHTML):visual.innerHTML);
     preview.innerHTML=clean(ta.value);
     visual.hidden=true;visual.style.display='none';bench.hidden=false;
     ta.oninput=()=>{const safe=clean(ta.value);preview.innerHTML=safe;fieldUpdate(selector,safe);};
   }else{
     // Commit the last source edit before restoring the visual editor.
     const safe=clean(ta.value);visual.innerHTML=safe;visual.hidden=false;visual.style.display='';bench.hidden=true;
     fieldUpdate(selector,safe);
     visual.dispatchEvent(new Event('input',{bubbles:true}));
   }
   tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('rue-selected',mode==='html'?b.hasAttribute('data-rue-html'):b.hasAttribute('data-rue-visual')));
 }
 w.RUEditor={button,toggle,sanitize:clean};
})(window);

;
/* Source: assets/js/pages/teacher.03.js */

  // =====================================================================
  // CẤU HÌNH SUPABASE
  // =====================================================================
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // Client phụ CHỈ dùng để tạo tài khoản học sinh (signUp) mà KHÔNG làm mất phiên đăng nhập
  // hiện tại của giáo viên (persistSession:false + storageKey riêng biệt).
  const sbAuthHelper = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storageKey: 'sb-teacher-create-student', persistSession: false, autoRefreshToken: false }
  });

  function pel(id) { return document.getElementById(id); }

  // =====================================================================
  // TOAST NOTIFICATION (giống hệ thống chung — đường màu đỏ chạy phía dưới)
  // =====================================================================
  function notify(rawMessage) {
    const msg = String(rawMessage ?? '');
    const emojiMatch = msg.match(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u);
    let icon = '<i class="bi bi-bell-fill"></i>', text = msg;
    if (emojiMatch && emojiMatch[0].trim()) { icon = emojiMatch[0].trim(); text = msg.slice(emojiMatch[0].length).trim() || msg; }
    let title = 'Thông báo';
    if (/❌/.test(msg) || /lỗi|thất bại|không thể/i.test(msg)) title = 'Lỗi';
    else if (/⚠️/.test(msg)) title = 'Cảnh báo';
    else if (/🎉|✅|❤️|💪|💾|📋/.test(msg)) title = 'Thành công';
    showToastNotification({ title, message: text, icon });
  }
  function showToastNotification({ title, message, icon = '🔔' }) {
    const container = pel('toastContainer'); if (!container) return;
    const toastId = 'toast-' + Date.now() + Math.random().toString(36).slice(2,6);
    const html = `
      <div id="${toastId}" class="pointer-events-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 translate-x-full opacity-0 relative">
        <div class="p-3.5 sm:p-4 flex items-start gap-3">
          <div class="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/80 flex-shrink-0 flex items-center justify-center text-[#cf1717] dark:text-red-400 font-bold text-base shadow-sm">${icon}</div>
          <div class="flex-1 pr-4">
            <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">${title}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${message}</p>
          </div>
          <button onclick="closeToast('${toastId}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-base leading-none p-1">✕</button>
        </div>
        <div class="h-1 bg-red-100 dark:bg-zinc-800 w-full"><div class="h-full bg-[#cf1717] animate-toast-bar"></div></div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = pel(toastId);
    setTimeout(() => el.classList.remove('translate-x-full', 'opacity-0'), 50);
    setTimeout(() => closeToast(toastId), 5000);
  }
  function closeToast(id) { const el = pel(id); if (!el) return; el.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => el.remove(), 300); }

  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
    else { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; }
  }
  async function handleLogout() { await sbClient.auth.signOut(); window.location.href = 'index.html'; }

  // =====================================================================
  // KIỂM TRA QUYỀN GIÁO VIÊN
  // =====================================================================
  let currentUser = null;
  let myClasses = [];
  let myRole = null; // 'teacher' | 'admin' | 'assistant'
  let currentClassForModal = null;
  let currentClassForAssignments = '';
  let currentAssignments = [];

  function isOwnerRole() { return myRole === 'teacher' || myRole === 'admin'; }
  function isAssistantRole() { return myRole === 'assistant'; }

  async function checkTeacher() {
    const { data: { user } } = await sbClient.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    const { data: profile } = await sbClient.from('profiles').select('role, full_name').eq('id', user.id).single();
    if (!['teacher', 'admin', 'assistant'].includes(profile?.role)) { window.location.href = 'dashboard.html'; return; }
    currentUser = user;
    myRole = profile.role;
    applyRoleUI();
    await loadClasses();
    loadNotifCounts();
    setupRealtime();
    setInterval(loadNotifCounts, 45000); // dự phòng: tự làm mới thông báo mỗi 45 giây nếu realtime bị gián đoạn
  }

  // Giáo viên phụ trách (assistant): không được tạo/sửa lớp, không quản lý học sinh, không sửa lịch học
  // — chỉ xem lịch + thêm bài tập cho lớp được phân công.
  function applyRoleUI() {
    if (isOwnerRole()) pel('acalDesc').textContent = 'Tổng hợp lịch học của tất cả các lớp bạn dạy. Bấm vào 1 ngày để xem chi tiết, duyệt/từ chối yêu cầu tạm ngưng của giáo viên phụ trách hoặc tự tạm ngưng buổi học.';
    if (isAssistantRole()) {
      pel('createClassForm').classList.add('hidden');
      pel('assistantHint').classList.remove('hidden');
      pel('classSectionTitle').innerHTML = '<i class="bi bi-building"></i> Lớp Tôi Phụ Trách';
      pel('assistantCalendarSection').classList.remove('hidden');
    }
  }

  // =====================================================================
  // TIỆN ÍCH
  // =====================================================================
  function slugify(str) {
    str = (str || '').toLowerCase();
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    str = str.replace(/đ/g, 'd');
    str = str.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return str || 'bai-tap';
  }
  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let s = ''; for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // =====================================================================
  // BỘ NHỚ ĐỆM (localStorage + bộ nhớ tạm) — vẽ ngay dữ liệu lần trước rồi âm thầm
  // tải bản mới nhất và cập nhật lại, để mọi trang lịch/điểm danh/bài tập cảm giác
  // không có thời gian chờ (trừ lần đầu tiên chưa từng có dữ liệu trong máy).
  // =====================================================================
  const ruMem = {};
  const RU_CACHE_VER = 'v1';
  function cacheGet(key) {
    if (key in ruMem) return ruMem[key];
    try {
      const raw = localStorage.getItem('ru_cache_' + RU_CACHE_VER + ':' + key);
      if (raw) { const v = JSON.parse(raw); ruMem[key] = v; return v; }
    } catch (e) {}
    return null;
  }
  function cacheSet(key, val) {
    ruMem[key] = val;
    try { localStorage.setItem('ru_cache_' + RU_CACHE_VER + ':' + key, JSON.stringify(val)); } catch (e) {}
  }
  function cacheDel(key) {
    delete ruMem[key];
    try { localStorage.removeItem('ru_cache_' + RU_CACHE_VER + ':' + key); } catch (e) {}
  }
  function attSyncCache() {
    if (!attClass) return;
    cacheSet('att:' + attClass.id, { students: attStudents, sessions: attSessions, map: attMap, locked: [...attLocked] });
  }

  // =====================================================================
  // 1. QUẢN LÝ LỚP HỌC
  // =====================================================================
  async function createClass(e) {
    e.preventDefault();
    const class_code = pel('newClassCode').value.trim();
    const title = pel('newClassTitle').value.trim();
    const info = pel('newClassInfo').value.trim() || null;
    const { error } = await sbClient.from('classes').insert([{ class_code, title, info, teacher_id: currentUser.id }]);
    if (error) return notify('❌ Lỗi tạo lớp: ' + (error.message.includes('duplicate') ? 'Mã lớp đã tồn tại!' : error.message));
    notify('🎉 Đã tạo lớp "' + title + '"!');
    pel('newClassCode').value = ''; pel('newClassTitle').value = ''; pel('newClassInfo').value = '';
    loadClasses();
  }

  function renderClassesUI() {
    pel('classCount').innerText = myClasses.length + ' lớp';

    const filterSel = pel('assignClassFilter');
    const prevVal = filterSel.value;
    filterSel.innerHTML = '<option value="">-- Chọn lớp để quản lý bài tập --</option>' +
      myClasses.map(c => `<option value="${c.id}">${esc(c.class_code)} — ${esc(c.title)}</option>`).join('');
    if (prevVal) filterSel.value = prevVal;
    const gSel = pel('gradeClassFilter'); const gPrev = gSel.value;
    gSel.innerHTML = '<option value="">-- Chọn lớp để xem bảng điểm --</option>' +
      myClasses.map(c => `<option value="${c.id}">${esc(c.class_code)} — ${esc(c.title)}</option>`).join('');
    if (gPrev) gSel.value = gPrev;

    pel('classGrid').innerHTML = myClasses.map(c => `
      <div class="bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-950 text-[#cf1717] rounded-full">${esc(c.class_code)}</span>
          <span class="text-[10px] text-gray-400">${c.class_students?.[0]?.count ?? 0} học sinh</span>
        </div>
        <h4 class="font-bold text-sm text-gray-900 dark:text-white">${esc(c.title)}</h4>
        ${c.info ? `<p class="text-xs text-gray-500 line-clamp-2">${esc(c.info)}</p>` : ''}
        <div class="flex flex-wrap gap-3 pt-1">
          ${isOwnerRole() ? `
            <button onclick="openClassModal('${c.id}')" class="text-xs font-bold text-[#cf1717] hover:underline"><i class="bi bi-people-fill"></i> Quản lý học sinh</button>
            <button onclick="openScheduleModal('${c.id}')" class="text-xs font-bold text-indigo-500 hover:underline"><i class="bi bi-calendar-event"></i> Lịch học</button>
            <button onclick="openAttendanceModal('${c.id}')" class="text-xs font-bold text-emerald-600 hover:underline"><i class="bi bi-check-circle-fill"></i> Điểm danh</button>
            <button onclick="deleteClass('${c.id}','${esc(c.title)}')" class="text-xs font-bold text-red-500 hover:underline">Xóa lớp</button>
          ` : `
            <button onclick="openScheduleModal('${c.id}')" class="text-xs font-bold text-indigo-500 hover:underline"><i class="bi bi-calendar-event"></i> Xem lịch học</button>
            <button onclick="openAttendanceModal('${c.id}')" class="text-xs font-bold text-emerald-600 hover:underline"><i class="bi bi-check-circle-fill"></i> Điểm danh</button>
          `}
        </div>
      </div>`).join('') || `<p class="text-gray-400 text-sm col-span-full">${isAssistantRole() ? 'Bạn chưa được phân công phụ trách lớp nào.' : 'Chưa có lớp nào. Hãy tạo lớp đầu tiên ở trên!'}</p>`;
  }

  async function loadClasses() {
    const cacheKey = 'classes:' + currentUser.id + ':' + myRole;
    const cached = cacheGet(cacheKey);
    if (cached && cached.length) { myClasses = cached; renderClassesUI(); loadAssistantScheduleCalendar(); }

    let data, error;
    if (isAssistantRole()) {
      // Giáo viên phụ trách: chỉ thấy các lớp mà chủ lớp đã gán mình vào (bảng class_assistants)
      const res = await sbClient.from('class_assistants').select('classes(*, class_students(count))').eq('teacher_id', currentUser.id);
      data = (res.data || []).map(r => r.classes).filter(Boolean);
      error = res.error;
    } else {
      const res = await sbClient.from('classes').select('*, class_students(count)').eq('teacher_id', currentUser.id).order('created_at', { ascending: false });
      data = res.data; error = res.error;
    }
    if (error) { if (!cached) pel('classGrid').innerHTML = `<p class="text-red-500 text-sm col-span-full">Lỗi tải lớp: ${esc(error.message)}</p>`; return; }
    myClasses = data || [];
    cacheSet(cacheKey, myClasses);
    renderClassesUI();
    loadAssistantScheduleCalendar();
    prefetchAllClassData();
  }

  // Âm thầm tải trước lịch học + điểm danh + bài tập của MỌI lớp ngay khi vào trang,
  // để lúc bấm mở modal thì dữ liệu đã có sẵn trong bộ nhớ đệm — mở ra là thấy ngay.
  async function prefetchAllClassData() {
    for (const c of myClasses) {
      prefetchScheduleFor(c.id);
      prefetchAssignmentsFor(c.id);
      prefetchAttendanceFor(c.id);
    }
  }
  async function prefetchScheduleFor(classId) {
    try {
      const { data, error } = await sbClient.from('class_schedule_sessions').select('*').eq('class_id', classId).order('session_date', { ascending: true });
      if (!error) cacheSet('sched:' + classId, data || []);
    } catch (e) {}
  }
  async function prefetchAssignmentsFor(classId) {
    try {
      const { data, error } = await sbClient.from('assignments').select('*').eq('class_id', classId).order('created_at', { ascending: false });
      if (!error) cacheSet('assign:' + classId, data || []);
    } catch (e) {}
  }
  async function prefetchAttendanceFor(classId) {
    try {
      const [stuRes, sesRes, attRows, lockRes] = await Promise.all([
        sbClient.rpc('get_class_student_emails', { p_class_id: classId }),
        sbClient.from('class_schedule_sessions').select('id, session_date, session_time, subject_name, status')
          .eq('class_id', classId).order('session_date', { ascending: true }).order('session_time', { ascending: true }),
        attFetchAll(() => sbClient.from('class_attendance').select('session_id, student_id, status').eq('class_id', classId).order('id')),
        sbClient.from('class_attendance_locks').select('session_id').eq('class_id', classId),
      ]);
      if (stuRes.error || sesRes.error) return;
      const lastWord = s => (String(s || '').trim().split(/\s+/).pop() || '');
      const students = (stuRes.data || []).slice().sort((a, b) =>
        lastWord(a.full_name).localeCompare(lastWord(b.full_name), 'vi') ||
        (a.full_name || '').localeCompare(b.full_name || '', 'vi'));
      const sessions = sesRes.data || [];
      const map = {};
      (attRows || []).forEach(r => { map[r.session_id + '|' + r.student_id] = r.status; });
      const locked = ((lockRes && !lockRes.error && lockRes.data) || []).map(r => r.session_id);
      cacheSet('att:' + classId, { students, sessions, map, locked });
    } catch (e) {}
  }

  async function deleteClass(id, title) {
    if (!confirm(`Xóa lớp "${title}"? Toàn bộ bài tập và danh sách học sinh trong lớp sẽ bị xóa.`)) return;
    const { error } = await sbClient.from('classes').delete().eq('id', id);
    if (error) return notify('❌ Lỗi xóa lớp: ' + error.message);
    notify('✅ Đã xóa lớp.'); loadClasses();
  }

  // ---- Modal quản lý học sinh trong lớp ----
  function openClassModal(classId) {
    const c = myClasses.find(x => x.id === classId); if (!c) return;
    currentClassForModal = c;
    pel('cmClassTitle').innerText = c.title;
    pel('cmClassCode').innerText = c.class_code;
    pel('classModal').classList.remove('hidden'); pel('classModal').classList.add('flex');
    loadClassStudents();
    loadClassAssistants();
  }
  function closeClassModal() { pel('classModal').classList.add('hidden'); pel('classModal').classList.remove('flex'); currentClassForModal = null; }

  async function loadClassStudents() {
    if (!currentClassForModal) return;
    pel('cmStuList').innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';
    const { data, error } = await sbClient.from('class_students').select('id, student_id, profiles(full_name, role)').eq('class_id', currentClassForModal.id).order('created_at', { ascending: false });
    if (error) { pel('cmStuList').innerHTML = `<p class="text-red-500 text-xs">Lỗi: ${esc(error.message)}</p>`; return; }
    pel('cmStuCount').innerText = (data || []).length;
    pel('cmStuList').innerHTML = (data || []).map(row => {
      const isVip = row.profiles?.role === 'vip';
      return `
      <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl px-3 py-2">
        <div>
          <p class="font-bold text-xs text-gray-900 dark:text-white">${esc(row.profiles?.full_name || '(chưa có tên)')}</p>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isVip ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-gray-300'}">${isVip ? '<i class="bi bi-star-fill"></i> VIP' : 'Free'}</span>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="toggleStudentVip('${row.student_id}', ${isVip})" class="text-[11px] font-bold ${isVip ? 'text-gray-500' : 'text-amber-600'} hover:underline">${isVip ? 'Gỡ VIP' : 'Cấp VIP'}</button>
          <button onclick="removeStudent('${row.id}')" class="text-[11px] font-bold text-red-500 hover:underline">Xóa khỏi lớp</button>
        </div>
      </div>`;
    }).join('') || '<p class="text-xs text-gray-400 italic">Lớp chưa có học sinh nào.</p>';
  }

  async function toggleStudentVip(studentId, isCurrentlyVip) {
    if (!currentClassForModal) return;
    const newRole = isCurrentlyVip ? 'student' : 'vip';
    const { error } = await sbClient.rpc('teacher_set_student_role', { p_student_id: studentId, p_class_id: currentClassForModal.id, p_role: newRole });
    if (error) return notify('❌ Lỗi: ' + error.message);
    notify(newRole === 'vip' ? '🎉 Đã cấp VIP cho học sinh!' : '✅ Đã gỡ VIP.');
    loadClassStudents();
  }

  async function addStudent(e) {
    e.preventDefault();
    if (!currentClassForModal) return;
    const name = pel('stuName').value.trim();
    const email = pel('stuEmail').value.trim();
    const password = pel('stuPassword').value;
    const btn = pel('addStuBtn'); btn.disabled = true; btn.innerText = 'Đang tạo...';
    try {
      // 1) Tạo tài khoản đăng nhập cho học sinh bằng client phụ (không ảnh hưởng phiên giáo viên)
      const { data: signData, error: signErr } = await sbAuthHelper.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (signErr) throw signErr;
      const newId = signData.user?.id;
      if (!newId) throw new Error('Không lấy được ID tài khoản mới. Có thể dự án đang bật xác nhận Email — hãy tắt "Confirm email" trong Supebase Auth Settings để dùng tính năng này.');
      // 2) Gán hồ sơ + thêm vào lớp bằng hàm RPC an toàn (SECURITY DEFINER)
      const chosenRole = pel('stuVip').checked ? 'vip' : 'student';
      const { error: rpcErr } = await sbClient.rpc('teacher_provision_student', { p_student_id: newId, p_full_name: name, p_class_id: currentClassForModal.id, p_role: chosenRole });
      if (rpcErr) throw rpcErr;
      notify((chosenRole === 'vip' ? '🎉 Đã tạo tài khoản VIP & thêm "' : '🎉 Đã tạo tài khoản & thêm "') + name + '" vào lớp!');
      pel('stuName').value = ''; pel('stuEmail').value = ''; pel('stuPassword').value = ''; pel('stuVip').checked = true;
      loadClassStudents(); loadClasses();
    } catch (err) {
      notify('❌ Lỗi thêm học sinh: ' + (err.message || 'Vui lòng thử lại.'));
    } finally { btn.disabled = false; btn.innerText = 'Tạo tài khoản & thêm vào lớp'; }
  }

  function switchAddStuTab(which) {
    const isNew = which === 'new';
    pel('formAddStuNew').classList.toggle('hidden', !isNew);
    pel('formAddStuExisting').classList.toggle('hidden', isNew);
    pel('tabAddStuNew').className = 'flex-1 py-1.5 rounded-lg font-bold text-xs ' + (isNew ? 'bg-[#cf1717] text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-gray-600 dark:text-gray-300');
    pel('tabAddStuExisting').className = 'flex-1 py-1.5 rounded-lg font-bold text-xs ' + (!isNew ? 'bg-[#cf1717] text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-gray-600 dark:text-gray-300');
  }

  // Thêm học sinh ĐÃ CÓ tài khoản (ở lớp khác) vào lớp hiện tại bằng email — không tạo tài khoản mới.
  // Cần hàm RPC teacher_add_existing_student_by_email (SECURITY DEFINER) đã tạo sẵn trong Supabase.
  async function addExistingStudent(e) {
    e.preventDefault();
    if (!currentClassForModal) return;
    const email = pel('existingStuEmail').value.trim();
    const role = pel('existingStuVip').checked ? 'vip' : null;
    const btn = pel('addExistingStuBtn'); btn.disabled = true; btn.innerText = 'Đang thêm...';
    try {
      const { data, error } = await sbClient.rpc('teacher_add_existing_student_by_email', { p_email: email, p_class_id: currentClassForModal.id, p_role: role });
      if (error) throw error;
      notify(`🎉 Đã thêm "${data || email}" vào lớp!`);
      pel('existingStuEmail').value = ''; pel('existingStuVip').checked = true;
      loadClassStudents(); loadClasses();
    } catch (err) {
      notify('❌ Lỗi: ' + (err.message || 'Không thêm được học sinh này — kiểm tra lại email hoặc đã tạo hàm SQL teacher_add_existing_student_by_email chưa.'));
    } finally { btn.disabled = false; btn.innerText = 'Thêm vào lớp (không tạo tài khoản mới)'; }
  }

  // ---- Giáo viên phụ trách của lớp ----
  async function loadClassAssistants() {
    if (!currentClassForModal) return;
    pel('cmAssistList').innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';
    const { data, error } = await sbClient.from('class_assistants').select('id, teacher_id, profiles(full_name)').eq('class_id', currentClassForModal.id).order('created_at', { ascending: false });
    if (error) { pel('cmAssistList').innerHTML = `<p class="text-red-500 text-xs">Lỗi: ${esc(error.message)}</p>`; return; }
    pel('cmAssistList').innerHTML = (data || []).map(row => `
      <div class="flex items-center justify-between bg-white dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl px-3 py-2">
        <p class="font-bold text-xs text-gray-900 dark:text-white"><i class="bi bi-person-fill"></i> ${esc(row.profiles?.full_name || '(chưa có tên)')}</p>
        <button onclick="removeAssistant('${row.id}')" class="text-[11px] font-bold text-red-500 hover:underline">Gỡ khỏi lớp</button>
      </div>`).join('') || '<p class="text-xs text-gray-400 italic">Lớp này chưa có giáo viên phụ trách nào.</p>';
  }
  function switchAddAsstTab(which) {
    const isNew = which === 'new';
    pel('formAddAsstNew').classList.toggle('hidden', !isNew);
    pel('formAddAsstExisting').classList.toggle('hidden', isNew);
    pel('tabAddAsstNew').className = 'flex-1 py-1.5 rounded-lg font-bold text-xs ' + (isNew ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-gray-600 dark:text-gray-300');
    pel('tabAddAsstExisting').className = 'flex-1 py-1.5 rounded-lg font-bold text-xs ' + (!isNew ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-gray-600 dark:text-gray-300');
  }
  async function addAssistant(e) {
    e.preventDefault();
    if (!currentClassForModal) return;
    const name = pel('asstName').value.trim(), email = pel('asstEmail').value.trim(), password = pel('asstPassword').value;
    const btn = pel('addAsstBtn'); btn.disabled = true; btn.innerText = 'Đang tạo...';
    try {
      const { data: signUpData, error: signErr } = await sbClient.auth.signUp({ email, password });
      if (signErr) throw signErr;
      const newId = signUpData.user?.id; if (!newId) throw new Error('Không lấy được ID tài khoản mới.');
      const { error: rpcErr } = await sbClient.rpc('teacher_provision_assistant', { p_teacher_id: newId, p_full_name: name, p_class_id: currentClassForModal.id });
      if (rpcErr) throw rpcErr;
      notify(`🎉 Đã tạo tài khoản giáo viên phụ trách "${name}"!`);
      pel('asstName').value = ''; pel('asstEmail').value = ''; pel('asstPassword').value = '';
      loadClassAssistants();
    } catch (err) {
      notify('❌ Lỗi: ' + (err.message || 'không xác định'));
    } finally { btn.disabled = false; btn.innerText = 'Tạo tài khoản & gán vào lớp'; }
  }
  async function addExistingAssistant(e) {
    e.preventDefault();
    if (!currentClassForModal) return;
    const email = pel('existingAsstEmail').value.trim();
    const btn = pel('addExistingAsstBtn'); btn.disabled = true; btn.innerText = 'Đang thêm...';
    try {
      const { data, error } = await sbClient.rpc('teacher_add_existing_assistant_by_email', { p_email: email, p_class_id: currentClassForModal.id });
      if (error) throw error;
      notify(`🎉 Đã gán "${data || email}" làm giáo viên phụ trách lớp này!`);
      pel('existingAsstEmail').value = '';
      loadClassAssistants();
    } catch (err) {
      notify('❌ Lỗi: ' + (err.message || 'Kiểm tra lại email hoặc đã chạy hàm SQL teacher_add_existing_assistant_by_email chưa.'));
    } finally { btn.disabled = false; btn.innerText = 'Gán vào lớp (không tạo tài khoản mới)'; }
  }
  async function removeAssistant(rowId) {
    if (!confirm('Gỡ giáo viên này khỏi lớp? Họ sẽ không còn thấy lớp/lịch học/bài tập của lớp này nữa.')) return;
    const { error } = await sbClient.from('class_assistants').delete().eq('id', rowId);
    if (error) return notify('❌ Lỗi: ' + error.message);
    notify('✅ Đã gỡ khỏi lớp.'); loadClassAssistants();
  }

  async function removeStudent(rowId) {
    if (!confirm('Xóa học sinh này khỏi lớp?')) return;
    const { error } = await sbClient.from('class_students').delete().eq('id', rowId);
    if (error) return notify('❌ Lỗi: ' + error.message);
    notify('✅ Đã xóa khỏi lớp.'); loadClassStudents(); loadClasses();
  }

  // =====================================================================
  // LỊCH HỌC CỦA LỚP — owner tải Excel lên & chỉnh sửa, assistant chỉ xem + gửi yêu cầu tạm ngưng
  // =====================================================================
  let currentClassForSchedule = null;
  let currentScheduleRows = [];

  function openScheduleModal(classId) {
    const c = myClasses.find(x => x.id === classId); if (!c) return;
    currentClassForSchedule = c;
    scheduleEditingId = null;
    smSearchQuery = '';
    if (pel('smSearchInput')) pel('smSearchInput').value = '';
    pel('smClassTitle').innerText = c.title;
    pel('smUploadBox').classList.toggle('hidden', !isOwnerRole());
    pel('manualAddForm').classList.add('hidden');
    pel('scheduleModal').classList.remove('hidden'); pel('scheduleModal').classList.add('flex');
    loadSchedule();
  }
  function closeScheduleModal() { pel('scheduleModal').classList.add('hidden'); pel('scheduleModal').classList.remove('flex'); currentClassForSchedule = null; }

  const statusLabel = { active: '🟢 Đang học', pending_suspend: '🟡 Chờ duyệt tạm ngưng', suspended: '🔴 Đã tạm ngưng' };

  async function loadSchedule() {
    if (!currentClassForSchedule) return;
    const myId = currentClassForSchedule.id;
    const cacheKey = 'sched:' + myId;
    const cached = cacheGet(cacheKey);
    if (cached) { currentScheduleRows = cached; renderSchedule(); }
    else pel('smList').innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';
    const { data, error } = await sbClient.from('class_schedule_sessions').select('*').eq('class_id', myId).order('session_date', { ascending: true });
    if (!currentClassForSchedule || currentClassForSchedule.id !== myId) return; // đã đóng / đổi lớp trong lúc tải
    if (error) { if (!cached) pel('smList').innerHTML = `<p class="text-red-500 text-xs">Lỗi: ${esc(error.message)}</p>`; return; }
    currentScheduleRows = data || [];
    cacheSet(cacheKey, currentScheduleRows);
    renderSchedule();
  }

  let scheduleEditingId = null;
  let smSearchQuery = '';
  function smSearch(v) { smSearchQuery = (v || '').trim().toLowerCase(); renderSchedule(); }
  function smMatchesSearch(r) {
    if (!smSearchQuery) return true;
    const hay = [r.subject_name, r.room, r.lecturer, r.note, fmtDate(r.session_date), r.session_time]
      .map(x => (x || '').toString().toLowerCase()).join(' | ');
    return hay.includes(smSearchQuery);
  }
  function renderSchedule() {
    const owner = isOwnerRole();
    const pending = currentScheduleRows.filter(r => r.status === 'pending_suspend');
    pel('smPendingBox').classList.toggle('hidden', !(owner && pending.length));
    if (owner && pending.length) {
      pel('smPendingList').innerHTML = pending.map(r => `
        <div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-xs space-y-1">
          <p class="font-bold text-gray-900 dark:text-white">${esc(r.subject_name || '')} — ${fmtDate(r.session_date)} · ${esc(r.session_time || '')}</p>
          ${r.request_note ? `<p class="text-gray-500">Lý do: ${esc(r.request_note)}</p>` : ''}
          <div class="flex gap-3 pt-1">
            <button onclick="approveSuspend('${r.id}')" class="font-bold text-emerald-600 hover:underline"><i class="bi bi-check-circle-fill"></i> Duyệt tạm ngưng</button>
            <button onclick="rejectSuspend('${r.id}')" class="font-bold text-red-500 hover:underline"><i class="bi bi-x-circle-fill"></i> Từ chối</button>
          </div>
        </div>`).join('');
    }

    const visibleRows = currentScheduleRows.filter(smMatchesSearch);
    pel('smCount').innerText = smSearchQuery ? `${visibleRows.length}/${currentScheduleRows.length}` : currentScheduleRows.length;
    pel('smList').innerHTML = visibleRows.map(r => {
      if (owner && scheduleEditingId === r.id) return renderScheduleEditRow(r);
      return `
      <div class="bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl p-3 text-xs space-y-1.5" data-row="${r.id}">
        <div class="flex items-start justify-between gap-2">
          <p class="font-bold text-gray-900 dark:text-white flex-1">${esc(r.subject_name || '(chưa rõ tên lớp học phần)')}</p>
          ${owner ? `
            <select onchange="quickSetStatus('${r.id}', this.value)" class="text-[10px] font-bold rounded-full border-0 px-2 py-0.5 ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : r.status === 'pending_suspend' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">
              <option value="active" ${r.status === 'active' ? 'selected' : ''}>🟢 Đang học</option>
              <option value="suspended" ${r.status === 'suspended' ? 'selected' : ''}>🔴 Đã tạm ngưng</option>
              <option value="pending_suspend" ${r.status === 'pending_suspend' ? 'selected' : ''}>🟡 Chờ duyệt tạm ngưng</option>
            </select>
          ` : `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : r.status === 'pending_suspend' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">${statusLabel[r.status] || r.status}</span>`}
        </div>
        <p class="text-gray-500"><i class="bi bi-calendar-event"></i> ${fmtDate(r.session_date)} · <i class="bi bi-clock"></i> ${esc(r.session_time || '')} ${r.room ? '· <i class="bi bi-door-open"></i> ' + esc(r.room) : ''} ${r.lecturer ? '· <i class="bi bi-person-fill"></i> ' + esc(r.lecturer) : ''}</p>
        ${r.note ? `<p class="text-gray-400">Ghi chú: ${esc(r.note)}</p>` : ''}
        <div class="flex flex-wrap items-center gap-3 pt-1">
          ${owner ? `
            <button onclick="startEditRow('${r.id}')" class="font-bold text-blue-500 hover:underline"><i class="bi bi-pencil-square"></i> Sửa chi tiết</button>
            <button onclick="deleteScheduleRow('${r.id}')" class="font-bold text-red-500 hover:underline"><i class="bi bi-trash"></i> Xóa buổi học</button>
          ` : ''}
          ${!owner && r.status === 'active' ? `<button onclick="requestSuspend('${r.id}')" class="font-bold text-amber-600 hover:underline"><i class="bi bi-slash-circle"></i> Yêu cầu tạm ngưng</button>` : ''}
          <button onclick="openSupportModal('${r.id}')" class="relative font-bold text-indigo-500 hover:underline flex items-center gap-1" title="Gửi/xem trao đổi hỗ trợ về buổi học này">
            <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-black not-italic">i</span> Hỗ trợ
            ${unreadSupportSessionIds.has(r.id) ? '<span class="absolute -top-1 -right-1 w-2 h-2 bg-[#cf1717] rounded-full animate-pulse"></span>' : ''}
          </button>
          <button onclick="openHistoryModal('${r.id}')" class="font-bold text-gray-500 hover:underline"><i class="bi bi-clock-history"></i> Lịch sử</button>
        </div>
      </div>`;
    }).join('') || (smSearchQuery
      ? '<p class="text-xs text-gray-400 italic">Không tìm thấy buổi học nào khớp với "' + esc(smSearchQuery) + '".</p>'
      : '<p class="text-xs text-gray-400 italic">Lớp này chưa có lịch học. ' + (owner ? 'Hãy tải file Excel lên hoặc thêm thủ công ở trên.' : '') + '</p>');
  }

  function renderScheduleEditRow(r) {
    return `
    <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-xl p-3 text-xs space-y-2" data-row="${r.id}">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <input id="er-subject-${r.id}" value="${esc(r.subject_name || '')}" placeholder="Tên buổi/lớp học phần" class="col-span-2 sm:col-span-1 p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
        <input id="er-date-${r.id}" type="date" value="${r.session_date || ''}" class="p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
        <input id="er-time-${r.id}" value="${esc(r.session_time || '')}" placeholder="Ca học" class="p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
        <input id="er-room-${r.id}" value="${esc(r.room || '')}" placeholder="Phòng (VD: A101 / ONLINE)" class="p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
        <input id="er-lecturer-${r.id}" value="${esc(r.lecturer || '')}" placeholder="Giảng viên" class="p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
        <input id="er-note-${r.id}" value="${esc(r.note || '')}" placeholder="Ghi chú" class="col-span-2 sm:col-span-3 p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
      </div>
      <div class="flex gap-3">
        <button onclick="saveEditRow('${r.id}')" class="font-bold text-emerald-600 hover:underline"><i class="bi bi-floppy"></i> Lưu</button>
        <button onclick="cancelEditRow()" class="font-bold text-gray-500 hover:underline">Hủy</button>
      </div>
    </div>`;
  }
  function startEditRow(id) { scheduleEditingId = id; renderSchedule(); }
  function cancelEditRow() { scheduleEditingId = null; renderSchedule(); }
  async function saveEditRow(id) {
    const oldRow = currentScheduleRows.find(r => r.id === id);
    const patch = {
      subject_name: pel('er-subject-' + id).value.trim() || null,
      session_date: pel('er-date-' + id).value || null,
      session_time: pel('er-time-' + id).value.trim() || null,
      room: pel('er-room-' + id).value.trim() || null,
      lecturer: pel('er-lecturer-' + id).value.trim() || null,
      note: pel('er-note-' + id).value.trim() || null,
    };
    if (!patch.session_date) return notify('⚠️ Cần chọn ngày học.');
    const { error } = await sbClient.from('class_schedule_sessions').update(patch).eq('id', id);
    if (error) return notify('❌ Lỗi lưu: ' + error.message);
    if (oldRow) {
      const fieldLabel = { subject_name: 'Tên buổi', session_date: 'Ngày học', session_time: 'Ca học', room: 'Phòng', lecturer: 'Giảng viên', note: 'Ghi chú' };
      const changes = Object.keys(patch)
        .filter(k => (oldRow[k] || '') !== (patch[k] || ''))
        .map(k => `${fieldLabel[k]}: "${oldRow[k] || ''}" → "${patch[k] || ''}"`);
      if (changes.length) logHistory(oldRow, 'edit', changes.join('; '));
    }
    notify('✅ Đã lưu thay đổi.'); scheduleEditingId = null; cacheDel('sched:' + currentClassForSchedule.id); loadSchedule();
  }
  async function quickSetStatus(id, status) {
    const row = currentScheduleRows.find(r => r.id === id);
    const patch = { status };
    if (status !== 'pending_suspend') { patch.requested_by = null; patch.request_note = null; }
    const { error } = await sbClient.from('class_schedule_sessions').update(patch).eq('id', id);
    if (error) { notify('❌ Lỗi: ' + error.message); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule(); return; }
    if (row) logHistory(row, 'status_change', `${statusLabel[row.status] || row.status} → ${statusLabel[status] || status}`);
    notify('✅ Đã cập nhật trạng thái.'); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule();
  }
  function toggleManualAddForm() { pel('manualAddForm').classList.toggle('hidden'); }
  async function addManualSession(e) {
    e.preventDefault();
    if (!currentClassForSchedule) return;
    const row = {
      class_id: currentClassForSchedule.id,
      subject_name: pel('maSubject').value.trim() || null,
      session_date: pel('maDate').value,
      session_time: pel('maTime').value.trim() || null,
      room: pel('maRoom').value.trim() || null,
      lecturer: pel('maLecturer').value.trim() || null,
      note: pel('maNote').value.trim() || null,
    };
    const { data, error } = await sbClient.from('class_schedule_sessions').insert([row]).select().single();
    if (error) return notify('❌ Lỗi thêm buổi học: ' + error.message);
    if (data) logHistory(data, 'create', `Đã thêm buổi học ${fmtDate(data.session_date)}${data.session_time ? ' · ' + data.session_time : ''}`);
    notify('🎉 Đã thêm buổi học!');
    ['maSubject', 'maDate', 'maTime', 'maRoom', 'maLecturer', 'maNote'].forEach(id => pel(id).value = '');
    cacheDel('sched:' + currentClassForSchedule.id); loadSchedule();
  }

  function fmtDate(d) {
    if (!d) return '';
    const [y, m, day] = String(d).split('-');
    return day && m && y ? `${day}/${m}/${y}` : d;
  }

  async function deleteScheduleRow(id) {
    if (!confirm('Xóa buổi học này khỏi lịch?')) return;
    const row = currentScheduleRows.find(r => r.id === id);
    const { error } = await sbClient.from('class_schedule_sessions').delete().eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    if (row) logHistory(row, 'delete', `Đã xóa buổi học ${fmtDate(row.session_date)}${row.session_time ? ' · ' + row.session_time : ''}`);
    notify('✅ Đã xóa buổi học.'); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule();
  }
  async function approveSuspend(id) {
    const row = currentScheduleRows.find(r => r.id === id);
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'suspended' }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    if (row) logHistory(row, 'approve_suspend', `Đã duyệt tạm ngưng buổi ${fmtDate(row.session_date)}${row.session_time ? ' · ' + row.session_time : ''}`);
    notify('✅ Đã duyệt tạm ngưng buổi học.'); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule(); loadNotifCounts();
  }
  async function rejectSuspend(id) {
    const row = currentScheduleRows.find(r => r.id === id);
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'active', requested_by: null, request_note: null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    if (row) logHistory(row, 'reject_suspend', `Đã từ chối yêu cầu tạm ngưng buổi ${fmtDate(row.session_date)}`);
    notify('✅ Đã từ chối yêu cầu — buổi học trở lại bình thường.'); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule(); loadNotifCounts();
  }
  async function requestSuspend(id) {
    const reason = prompt('Lý do đề nghị tạm ngưng buổi học này (giáo viên chủ nhiệm sẽ thấy lý do này để duyệt):');
    if (reason === null) return;
    const row = currentScheduleRows.find(r => r.id === id);
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'pending_suspend', requested_by: currentUser.id, request_note: reason.trim() || null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message + ' (kiểm tra đã tạo policy "assistant requests suspend" trong SQL chưa)');
    if (row) logHistory(row, 'request_suspend', reason.trim() || null);
    notify('📨 Đã gửi yêu cầu — chờ giáo viên chủ nhiệm duyệt.'); cacheDel('sched:' + currentClassForSchedule.id); loadSchedule();
    cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
    loadNotifCounts();
  }

  // ---- Tải file Excel lên & bóc tách thành các buổi học ----
  function normalizeHeader(h) {
    return String(h || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const HEADER_MAP = {
    subject_name: ['tiedelophoc', 'tieudelophoc', 'tendehoc', 'tenmonhoc', 'monhoc', 'lophocphan'],
    session_date: ['ngayhoc', 'ngay', 'date'],
    session_time: ['cahoc', 'gio', 'thoigian', 'ca'],
    room: ['phonghoc', 'phong', 'room'],
    lecturer: ['giangvien', 'gv', 'lecturer'],
    note: ['ghichu', 'note', 'ghi']
  };
  function parseExcelDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { // Excel serial date
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(d) ? null : d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // dd/mm/yyyy
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); // yyyy-mm-dd
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
  async function uploadScheduleExcel(input) {
    const file = input.files[0]; input.value = '';
    if (!file || !currentClassForSchedule) return;
    try { await RUAssets.load('xlsx'); } catch(e) { return notify('❌ Không tải được thư viện đọc Excel.'); }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) return notify('⚠️ File Excel không có dữ liệu.');

      // Ánh xạ tên cột trong file với các trường cần dùng
      const sampleKeys = Object.keys(rows[0]);
      const colFor = {};
      Object.keys(HEADER_MAP).forEach(field => {
        colFor[field] = sampleKeys.find(k => HEADER_MAP[field].includes(normalizeHeader(k)));
      });
      if (!colFor.session_date) return notify('⚠️ Không tìm thấy cột ngày học (VD: "NgayHoc") trong file. Cần có dòng tiêu đề đúng như file mẫu.');

      const parsed = rows.map(r => ({
        class_id: currentClassForSchedule.id,
        subject_name: colFor.subject_name ? String(r[colFor.subject_name] || '').trim() || null : null,
        session_date: parseExcelDate(r[colFor.session_date]),
        session_time: colFor.session_time ? String(r[colFor.session_time] || '').trim() || null : null,
        room: colFor.room ? String(r[colFor.room] || '').trim() || null : null,
        lecturer: colFor.lecturer ? String(r[colFor.lecturer] || '').trim() || null : null,
        note: colFor.note ? String(r[colFor.note] || '').trim() || null : null,
      })).filter(r => r.session_date);

      if (!parsed.length) return notify('⚠️ Không đọc được buổi học nào hợp lệ (thiếu ngày học đúng định dạng).');
      if (!confirm(`Tìm thấy ${parsed.length} buổi học trong file. Thao tác này sẽ XÓA TOÀN BỘ lịch học cũ của lớp và thay bằng danh sách mới — tiếp tục?`)) return;

      notify('⏳ Đang cập nhật lịch học...');
      const { error: delErr } = await sbClient.from('class_schedule_sessions').delete().eq('class_id', currentClassForSchedule.id);
      if (delErr) return notify('❌ Lỗi xóa lịch cũ: ' + delErr.message);
      const { error: insErr } = await sbClient.from('class_schedule_sessions').insert(parsed);
      if (insErr) return notify('❌ Lỗi thêm lịch mới: ' + insErr.message);
      notify(`🎉 Đã cập nhật ${parsed.length} buổi học!`);
      cacheDel('sched:' + currentClassForSchedule.id);
      loadSchedule();
    } catch (err) {
      notify('❌ Lỗi đọc file Excel: ' + (err.message || 'không xác định'));
    }
  }

  // =====================================================================
  // LỊCH HỌC TỔNG HỢP CHO GIÁO VIÊN PHỤ TRÁCH (gộp lịch mọi lớp được gán)
  // =====================================================================
  let allAssistantSessions = [];
  let acalLocked = new Set(); // session_id đã chốt điểm danh
  const acalTodayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  let acalCurrentDate = (() => { const [y, m] = acalTodayStr().split('-').map(Number); return new Date(y, m - 1, 1); })();
  let acalSelectedDateStr = acalTodayStr();

  async function loadAssistantScheduleCalendar() {
    const box = pel('acalSelectedContent');
    if (!myClasses.length) {
      allAssistantSessions = []; acalLocked = new Set();
      if (box) box.innerHTML = '<p class="text-xs text-gray-400 italic">Bạn chưa có lớp nào (hoặc chưa được phân công) nên chưa có lịch học.</p>';
      renderAssistantCalendar();
      return;
    }
    const classIds = myClasses.map(c => c.id);
    const cacheKey = 'acal:' + currentUser.id;
    const cached = cacheGet(cacheKey);
    if (cached) {
      allAssistantSessions = cached.sessions || [];
      acalLocked = new Set(cached.locked || []);
      initAssistantCalendar();
    }
    const { data, error } = await sbClient.from('class_schedule_sessions').select('*').in('class_id', classIds).order('session_date', { ascending: true });
    if (error) { if (!cached && box) box.innerHTML = `<p class="text-red-500 text-xs">Lỗi tải lịch học: ${esc(error.message)}</p>`; return; }
    allAssistantSessions = data || [];
    acalLocked = new Set();
    try {
      const { data: lk } = await sbClient.from('class_attendance_locks').select('session_id').in('class_id', classIds);
      acalLocked = new Set((lk || []).map(r => r.session_id));
    } catch (e) { /* chưa có bảng chốt thì coi như chưa chốt */ }
    cacheSet(cacheKey, { sessions: allAssistantSessions, locked: [...acalLocked] });
    initAssistantCalendar();
  }

  function classInfoOf(classId) { return myClasses.find(c => c.id === classId) || {}; }

  function initAssistantCalendar() {
    renderAssistantCalendar();
    updateAssistantSelectedDateDetails();
  }

  function renderAssistantCalendar() {
    const year = acalCurrentDate.getFullYear();
    const month = acalCurrentDate.getMonth();
    const monthYearElem = pel('acalMonthYear');
    if (monthYearElem) monthYearElem.innerText = `Tháng ${month + 1}, ${year}`;
    const grid = pel('acalDaysGrid');
    if (!grid) return;
    const firstDay = new Date(year, month, 1).getDay();
    const lead = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = acalTodayStr();

    const info = {}; // date -> { total, suspended, pending }
    allAssistantSessions.forEach(s => {
      if (!s.session_date) return;
      const d = String(s.session_date).slice(0, 10);
      const o = info[d] || (info[d] = { total: 0, suspended: 0, pending: 0 });
      o.total++;
      if (s.status === 'suspended') o.suspended++;
      if (s.status === 'pending_suspend') o.pending++;
    });

    let html = '<div class="p-2"></div>'.repeat(lead);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sel = ds === acalSelectedDateStr, today = ds === todayStr, o = info[ds];
      let cls = 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300';
      if (sel) cls = 'bg-[#cf1717] text-white font-black shadow-md';
      else if (today) cls = 'border-2 border-[#cf1717] font-bold text-[#cf1717] dark:text-red-400';
      let dot = '<span class="w-2 h-2 mt-1"></span>';
      if (o) {
        const color = o.pending ? 'bg-amber-500' : (o.suspended === o.total ? 'bg-gray-400' : 'bg-[#cf1717]');
        dot = `<span class="w-2 h-2 mt-1 rounded-full shadow-sm ${sel ? 'bg-white' : color}"></span>`;
      }
      html += `<div onclick="selectAssistantCalDate('${ds}')" class="p-2 sm:p-2.5 rounded-xl cursor-pointer transition flex flex-col items-center justify-center min-h-[42px] ${cls}">
        <span class="text-xs sm:text-sm font-bold">${d}</span>${dot}</div>`;
    }
    grid.innerHTML = html;
  }

  function acalGoToday() {
    const t = acalTodayStr(); const [y, m] = t.split('-').map(Number);
    acalCurrentDate = new Date(y, m - 1, 1);
    selectAssistantCalDate(t);
  }

  function prevAssistantCalMonth() { acalCurrentDate.setMonth(acalCurrentDate.getMonth() - 1); renderAssistantCalendar(); }
  function nextAssistantCalMonth() { acalCurrentDate.setMonth(acalCurrentDate.getMonth() + 1); renderAssistantCalendar(); }
  function selectAssistantCalDate(dateStr) { acalSelectedDateStr = dateStr; renderAssistantCalendar(); updateAssistantSelectedDateDetails(); }

  const ACAL_WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  function updateAssistantSelectedDateDetails() {
    const titleElem = pel('acalSelectedTitle');
    const contentElem = pel('acalSelectedContent');
    if (!titleElem || !contentElem) return;
    const [y, m, d] = acalSelectedDateStr.split('-').map(Number);
    const wd = ACAL_WEEKDAY[new Date(y, m - 1, d).getDay()];
    const list = allAssistantSessions
      .filter(s => String(s.session_date || '').slice(0, 10) === acalSelectedDateStr)
      .sort((a, b) => String(a.session_time || '').localeCompare(String(b.session_time || ''), 'vi', { numeric: true }));
    titleElem.innerHTML = `<span><i class="bi bi-pin-angle-fill"></i></span> ${wd}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}${list.length ? ` (${list.length} lịch học)` : ''}`;

    if (!list.length) {
      contentElem.innerHTML = `
        <div class="p-8 text-center bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
          <span class="text-2xl block mb-1"><i class="bi bi-cup-hot"></i></span>
          <p class="text-xs text-gray-400 font-medium">Không có buổi học nào trong ngày này.</p>
        </div>`;
      return;
    }
    contentElem.innerHTML = list.map(acalCardHtml).join('');
  }

  function acalCardHtml(s) {
    const cls = classInfoOf(s.class_id);
    const owner = isOwnerRole();
    const susp = s.status === 'suspended', pend = s.status === 'pending_suspend';
    const locked = acalLocked.has(s.id);
    const sid = esc(s.id);
    const ribbon = susp
      ? '<div class="sc-alert">!</div><div class="sc-ribbon">Tạm ngưng học</div>'
      : pend ? '<div class="sc-alert pend">!</div><div class="sc-ribbon pend">Chờ tạm ngưng</div>' : '';
    const tone = susp
      ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 pr-12 min-h-[190px]'
      : pend
        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 pr-12 min-h-[190px]'
        : 'bg-gray-50 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80';
    const unread = unreadSupportSessionIds.has(s.id) ? '<span class="absolute -top-1 -right-1 w-2 h-2 bg-[#cf1717] rounded-full animate-pulse"></span>' : '';

    let actions = '';
    if (!owner && s.status === 'active') actions += `<button onclick="requestSuspendFromCalendar('${sid}')" class="text-xs font-bold text-amber-600 hover:underline"><i class="bi bi-slash-circle"></i> Yêu cầu tạm ngưng</button>`;
    if (owner && pend) actions += `<button onclick="calApprove('${sid}')" class="text-xs font-bold text-emerald-600 hover:underline"><i class="bi bi-check-circle-fill"></i> Duyệt tạm ngưng</button>
                                   <button onclick="calReject('${sid}')" class="text-xs font-bold text-red-500 hover:underline"><i class="bi bi-x-circle-fill"></i> Từ chối</button>`;
    if (owner && s.status === 'active') actions += `<button onclick="calSuspendDirect('${sid}')" class="text-xs font-bold text-amber-600 hover:underline"><i class="bi bi-slash-circle"></i> Tạm ngưng buổi này</button>`;
    if (owner && susp) actions += `<button onclick="calReopen('${sid}')" class="text-xs font-bold text-emerald-600 hover:underline"><i class="bi bi-arrow-counterclockwise"></i> Mở lại buổi học</button>`;
    if (!susp) actions += `<button onclick="openAttendanceModal('${esc(s.class_id)}')" class="text-xs font-bold text-emerald-600 hover:underline"><i class="bi bi-check-circle-fill"></i> Điểm danh</button>`;
    actions += `<button onclick="openSupportModal('${sid}')" class="relative text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1" title="Gửi/xem trao đổi hỗ trợ về buổi học này">
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-black not-italic">i</span> Hỗ trợ ${unread}
      </button>
      <button onclick="openHistoryModal('${sid}')" class="text-xs font-bold text-gray-500 hover:underline"><i class="bi bi-clock-history"></i> Lịch sử</button>`;

    return `
    <div class="flex gap-3">
      <div class="flex flex-col items-center pt-1">
        <span class="w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-[5px] border-[#0f4c4c] flex-shrink-0"></span>
        <span class="flex-1 w-1 mt-1 rounded bg-[#4b9a95]"></span>
      </div>
      <div class="sc-card flex-1 rounded-2xl p-4 pb-4 text-sm space-y-1.5 ${tone} text-gray-900 dark:text-gray-100">
        ${ribbon}
        <p class="text-[11px]"><span class="font-black text-[#cf1717] bg-red-100/80 dark:bg-red-950 px-2 py-0.5 rounded-md">${esc(cls.class_code || '')}</span>
          <span class="text-gray-500 dark:text-gray-400 ml-1">${esc(cls.title || 'Lớp học')}</span></p>
        <p class="font-extrabold text-base leading-snug">${esc(s.subject_name || '(chưa rõ tên buổi)')}</p>
        <p><b>Phòng</b>: ${esc(s.room || '—')}</p>
        <p><b>Thời gian</b>: ${esc(s.session_time || '—')}</p>
        ${s.lecturer ? `<p><b>Giảng viên</b>: ${esc(s.lecturer)}</p>` : ''}
        <p><b>Ghi chú</b>${s.note ? ': ' + esc(s.note) : ''}</p>
        ${(pend || susp) && s.request_note ? `<p class="text-amber-700 dark:text-amber-400"><b>${pend ? 'Lý do đề nghị' : 'Lý do tạm ngưng'}</b>: ${esc(s.request_note)}</p>` : ''}
        ${susp ? '' : `<p><b>Điểm danh</b>: ${locked ? '<i class="bi bi-lock-fill"></i> Đã chốt' : '<span class="text-gray-400 italic font-normal">Chưa chốt</span>'}</p>`}
        <div class="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 mt-1 border-t border-gray-200/70 dark:border-zinc-700/70">${actions}</div>
      </div>
    </div>`;
  }

  // ---- Hành động của giáo viên chủ nhiệm ngay trên thẻ lịch ----
  function acalRow(id) { return allAssistantSessions.find(r => r.id === id); }
  async function calApprove(id) {
    const row = acalRow(id); if (!row) return;
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'suspended' }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    logHistory(row, 'approve_suspend', `Đã duyệt tạm ngưng buổi ${fmtDate(row.session_date)}${row.session_time ? ' · ' + row.session_time : ''}`);
    notify('✅ Đã duyệt tạm ngưng buổi học.'); cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar(); loadNotifCounts();
  }
  async function calReject(id) {
    const row = acalRow(id); if (!row) return;
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'active', requested_by: null, request_note: null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    logHistory(row, 'reject_suspend', `Đã từ chối yêu cầu tạm ngưng buổi ${fmtDate(row.session_date)}`);
    notify('✅ Đã từ chối yêu cầu — buổi học trở lại bình thường.'); cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar(); loadNotifCounts();
  }
  async function calSuspendDirect(id) {
    const row = acalRow(id); if (!row) return;
    const reason = prompt('Lý do tạm ngưng buổi học này (không bắt buộc):');
    if (reason === null) return;
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'suspended', request_note: reason.trim() || null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    logHistory(row, 'status_change', `${statusLabel[row.status] || row.status} → ${statusLabel.suspended}${reason.trim() ? ' — Lý do: ' + reason.trim() : ''}`);
    notify('✅ Đã tạm ngưng buổi học.'); cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
  }
  async function calReopen(id) {
    const row = acalRow(id); if (!row) return;
    if (!confirm('Mở lại buổi học này?')) return;
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'active', requested_by: null, request_note: null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    logHistory(row, 'status_change', `${statusLabel[row.status] || row.status} → ${statusLabel.active}`);
    notify('✅ Đã mở lại buổi học.'); cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
  }

  async function requestSuspendFromCalendar(id) {
    const reason = prompt('Lý do đề nghị tạm ngưng buổi học này (giáo viên chủ nhiệm sẽ thấy lý do này để duyệt):');
    if (reason === null) return;
    const row = allAssistantSessions.find(r => r.id === id);
    const { error } = await sbClient.from('class_schedule_sessions').update({ status: 'pending_suspend', requested_by: currentUser.id, request_note: reason.trim() || null }).eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    if (row) logHistory(row, 'request_suspend', reason.trim() || null);
    notify('📨 Đã gửi yêu cầu — chờ giáo viên chủ nhiệm duyệt.');
    cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
    loadNotifCounts();
  }

  // =====================================================================
  // HỆ THỐNG THÔNG BÁO NGOÀI MÀN HÌNH (chuông 🔔 + banner đầu trang)
  // Gom: (a) yêu cầu tạm ngưng đang chờ owner duyệt, (b) tin nhắn hỗ trợ chưa đọc
  // =====================================================================
  let notifItems = [];
  let unreadSupportSessionIds = new Set(); // session_id nào đang có tin nhắn chưa đọc -> chấm đỏ trên nút "i"

  async function loadNotifCounts() {
    if (!currentUser) return;
    notifItems = [];
    unreadSupportSessionIds = new Set();
    const classIds = myClasses.map(c => c.id);

    if (isOwnerRole()) {
      if (classIds.length) {
        const { data: pendingRows } = await sbClient.from('class_schedule_sessions').select('*').in('class_id', classIds).eq('status', 'pending_suspend');
        (pendingRows || []).forEach(r => {
          const cls = classInfoOf(r.class_id);
          notifItems.push({
            label: `<i class="bi bi-slash-circle"></i> Yêu cầu tạm ngưng — ${esc(cls.title || cls.class_code || 'Lớp học')} · ${fmtDate(r.session_date)}`,
            action: () => openScheduleModal(r.class_id)
          });
        });
        const { data: unreadMsgs } = await sbClient.from('class_schedule_support_messages').select('*').in('class_id', classIds).eq('read_by_teacher', false).neq('sender_id', currentUser.id);
        (unreadMsgs || []).forEach(m => {
          unreadSupportSessionIds.add(m.session_id);
          const cls = classInfoOf(m.class_id);
          notifItems.push({
            label: `<i class="bi bi-chat-dots"></i> Tin nhắn hỗ trợ mới — ${esc(cls.title || cls.class_code || 'Lớp học')}`,
            action: () => openSupportModal(m.session_id)
          });
        });
      }
    } else if (isAssistantRole()) {
      if (classIds.length) {
        const { data: unreadMsgs } = await sbClient.from('class_schedule_support_messages').select('*').eq('assistant_id', currentUser.id).eq('read_by_assistant', false).neq('sender_id', currentUser.id);
        (unreadMsgs || []).forEach(m => {
          unreadSupportSessionIds.add(m.session_id);
          const cls = classInfoOf(m.class_id);
          notifItems.push({
            label: `<i class="bi bi-chat-dots"></i> Giáo viên chủ nhiệm đã phản hồi — ${esc(cls.title || cls.class_code || 'Lớp học')}`,
            action: () => openSupportModal(m.session_id)
          });
        });
      }
    }
    renderNotifUI();
    // Nếu đang mở modal lịch/hỗ trợ, vẽ lại để cập nhật chấm đỏ trên nút "i"
    if (currentClassForSchedule && !pel('scheduleModal').classList.contains('hidden')) renderSchedule();
    if (pel('assistantCalendarSection')) updateAssistantSelectedDateDetails();
  }

  function renderNotifUI() {
    const badge = pel('notifBadge');
    const banner = pel('notifBanner');
    const bannerText = pel('notifBannerText');
    const dropdown = pel('notifDropdown');
    const count = notifItems.length;
    if (count > 0) {
      badge.classList.remove('hidden'); badge.innerText = count > 9 ? '9+' : String(count);
      banner.classList.remove('hidden');
      bannerText.innerHTML = isOwnerRole()
        ? `<span class="text-lg leading-none"><i class="bi bi-bell-fill"></i></span> <span>Bạn có ${count} việc cần xử lý: yêu cầu tạm ngưng và/hoặc tin nhắn hỗ trợ từ giáo viên phụ trách.</span>`
        : `<span class="text-lg leading-none"><i class="bi bi-bell-fill"></i></span> <span>Bạn có ${count} phản hồi mới từ giáo viên chủ nhiệm.</span>`;
    } else {
      badge.classList.add('hidden'); banner.classList.add('hidden');
    }
    dropdown.innerHTML = notifItems.map((it, idx) => `
      <button onclick="handleNotifClick(${idx})" class="w-full text-left text-xs p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-gray-700 dark:text-gray-200">${it.label}</button>
    `).join('') || '<p class="text-xs text-gray-400 italic p-2">Không có thông báo nào.</p>';
  }
  function handleNotifClick(idx) { pel('notifDropdown').classList.add('hidden'); notifItems[idx]?.action?.(); }
  function toggleNotifDropdown() { pel('notifDropdown').classList.toggle('hidden'); }
  document.addEventListener('click', (e) => {
    const dd = pel('notifDropdown');
    if (dd && !dd.classList.contains('hidden') && !e.target.closest('#notifDropdown') && !e.target.closest('#notifBellBtn')) dd.classList.add('hidden');
  });

  // =====================================================================
  // MODAL HỖ TRỢ BUỔI HỌC — assistant gửi yêu cầu/câu hỏi cho teacher về 1 buổi học,
  // teacher đọc và có thể phản hồi hoặc không.
  // =====================================================================
  let currentSupportSession = null;
  let currentSupportAssistantId = null;
  let currentSupportMessages = [];

  async function findSessionAnywhere(id) {
    let s = currentScheduleRows.find(r => r.id === id) || (typeof allAssistantSessions !== 'undefined' ? allAssistantSessions.find(r => r.id === id) : null);
    if (s) return s;
    // Không có sẵn trong bộ nhớ cục bộ (VD: bấm thẳng từ thông báo mà chưa mở lịch lớp đó) -> tải trực tiếp từ DB
    const { data, error } = await sbClient.from('class_schedule_sessions').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  }

  async function openSupportModal(sessionId) {
    const session = await findSessionAnywhere(sessionId);
    if (!session) return notify('❌ Không tìm thấy buổi học này.');
    currentSupportSession = session;
    currentSupportAssistantId = null;
    currentSupportMessages = [];
    const cls = classInfoOf(session.class_id);
    pel('smSupportSessionInfo').innerHTML = `<b>${esc(cls.title || cls.class_code || 'Lớp học')}</b> — <i class="bi bi-calendar-event"></i> ${fmtDate(session.session_date)} · <i class="bi bi-clock"></i> ${esc(session.session_time || '')} ${session.room ? '· <i class="bi bi-door-open"></i> ' + esc(session.room) : ''}`;
    pel('smSupportThread').innerHTML = '<p class="text-xs text-gray-400 italic"><i class="bi bi-hourglass-split"></i> Đang tải...</p>';
    pel('smSupportThreadPicker').classList.add('hidden');
    pel('smSupportForm').classList.remove('hidden');
    pel('supportModal').classList.remove('hidden'); pel('supportModal').classList.add('flex');

    if (isAssistantRole()) {
      currentSupportAssistantId = currentUser.id;
      await loadSupportThread();
      return;
    }

    // Owner: tìm những giáo viên phụ trách đã từng nhắn về buổi này + toàn bộ giáo viên phụ trách của lớp
    const { data: msgs } = await sbClient.from('class_schedule_support_messages').select('assistant_id').eq('session_id', sessionId);
    const threadIds = [...new Set((msgs || []).map(m => m.assistant_id))];
    const { data: assistants } = await sbClient.from('class_assistants').select('teacher_id, profiles(full_name)').eq('class_id', session.class_id);
    const nameOf = (id) => (assistants || []).find(a => a.teacher_id === id)?.profiles?.full_name || 'Giáo viên phụ trách';
    const allIds = [...new Set([...threadIds, ...(assistants || []).map(a => a.teacher_id)])];

    if (!allIds.length) {
      pel('smSupportThread').innerHTML = '<p class="text-xs text-gray-400 italic">Lớp này chưa có giáo viên phụ trách nào để trao đổi.</p>';
      pel('smSupportForm').classList.add('hidden');
      return;
    }
    if (allIds.length > 1) {
      pel('smSupportThreadPicker').classList.remove('hidden');
      pel('smSupportThreadPicker').innerHTML = `
        <label class="text-[10px] font-bold uppercase text-gray-400">Trao đổi với</label>
        <select onchange="switchSupportThread(this.value)" class="w-full p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-xs">
          ${allIds.map(id => `<option value="${id}">${esc(nameOf(id))}${threadIds.includes(id) ? '' : ' (chưa có tin nhắn)'}</option>`).join('')}
        </select>`;
    }
    currentSupportAssistantId = allIds[0];
    await loadSupportThread();
  }

  function switchSupportThread(id) { currentSupportAssistantId = id; loadSupportThread(); }

  async function loadSupportThread() {
    if (!currentSupportSession || !currentSupportAssistantId) return;
    const { data, error } = await sbClient.from('class_schedule_support_messages')
      .select('*').eq('session_id', currentSupportSession.id).eq('assistant_id', currentSupportAssistantId)
      .order('created_at', { ascending: true });
    if (error) { pel('smSupportThread').innerHTML = `<p class="text-red-500 text-xs">Lỗi: ${esc(error.message)} (đã chạy SQL tạo bảng class_schedule_support_messages chưa?)</p>`; return; }
    currentSupportMessages = data || [];
    renderSupportThread();
    markSupportRead();
  }

  function renderSupportThread() {
    const box = pel('smSupportThread');
    box.innerHTML = currentSupportMessages.map(m => {
      const mine = m.sender_id === currentUser.id;
      return `<div class="flex ${mine ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[80%] px-3 py-2 rounded-2xl text-xs ${mine ? 'bg-[#cf1717] text-white rounded-br-sm' : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'}">
          <p class="whitespace-pre-wrap">${esc(m.message)}</p>
          <p class="text-[9px] opacity-70 mt-1">${new Date(m.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>`;
    }).join('') || '<p class="text-xs text-gray-400 italic">Chưa có tin nhắn nào. Hãy gửi yêu cầu hỗ trợ đầu tiên bên dưới.</p>';
    box.scrollTop = box.scrollHeight;
  }

  async function markSupportRead() {
    const field = isOwnerRole() ? 'read_by_teacher' : 'read_by_assistant';
    const unreadIds = currentSupportMessages.filter(m => m.sender_id !== currentUser.id && !m[field]).map(m => m.id);
    if (!unreadIds.length) return;
    await sbClient.from('class_schedule_support_messages').update({ [field]: true }).in('id', unreadIds);
    loadNotifCounts();
  }

  async function sendSupportMessage(e) {
    e.preventDefault();
    if (!currentSupportSession || !currentSupportAssistantId) return;
    const input = pel('smSupportInput');
    const message = input.value.trim();
    if (!message) return;
    const row = {
      session_id: currentSupportSession.id,
      class_id: currentSupportSession.class_id,
      assistant_id: currentSupportAssistantId,
      sender_id: currentUser.id,
      message
    };
    const { error } = await sbClient.from('class_schedule_support_messages').insert([row]);
    if (error) return notify('❌ Lỗi gửi: ' + error.message);
    input.value = '';
    await loadSupportThread();
    loadNotifCounts();
  }

  function closeSupportModal() {
    pel('supportModal').classList.add('hidden'); pel('supportModal').classList.remove('flex');
    currentSupportSession = null; currentSupportAssistantId = null; currentSupportMessages = [];
  }

  // =====================================================================
  // LỊCH SỬ THAY ĐỔI BUỔI HỌC (class_schedule_history)
  // Ghi lại mọi thay đổi: tạo/sửa/xóa buổi học, yêu cầu-duyệt-từ chối tạm ngưng...
  // =====================================================================
  async function logHistory(sessionOrIds, action, detail) {
    if (!sessionOrIds || !currentUser) return;
    const session_id = sessionOrIds.id || sessionOrIds.session_id;
    const class_id = sessionOrIds.class_id;
    if (!session_id || !class_id) return;
    try {
      await sbClient.from('class_schedule_history').insert([{
        session_id, class_id, actor_id: currentUser.id, action, detail: detail || null
      }]);
    } catch (e) { /* lịch sử là phụ trợ — không chặn luồng chính nếu lỗi (VD chưa chạy SQL) */ }
  }

  const historyActionIcon = { create: '<i class="bi bi-plus-lg"></i>', edit: '<i class="bi bi-pencil-square"></i>', delete: '<i class="bi bi-trash"></i>', status_change: '<i class="bi bi-arrow-repeat"></i>', request_suspend: '<i class="bi bi-send"></i>', approve_suspend: '<i class="bi bi-check-circle-fill"></i>', reject_suspend: '<i class="bi bi-x-circle-fill"></i>' };
  const historyActionLabel = { create: 'Tạo buổi học', edit: 'Sửa chi tiết buổi học', delete: 'Xóa buổi học', status_change: 'Đổi trạng thái', request_suspend: 'Yêu cầu tạm ngưng', approve_suspend: 'Duyệt tạm ngưng', reject_suspend: 'Từ chối yêu cầu tạm ngưng' };

  async function openHistoryModal(sessionId) {
    const session = await findSessionAnywhere(sessionId);
    const cls = session ? classInfoOf(session.class_id) : {};
    pel('hmSessionInfo').innerHTML = session
      ? `<b>${esc(cls.title || cls.class_code || 'Lớp học')}</b> — <i class="bi bi-calendar-event"></i> ${fmtDate(session.session_date)} · <i class="bi bi-clock"></i> ${esc(session.session_time || '')}`
      : '';
    pel('hmList').innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';
    pel('historyModal').classList.remove('hidden'); pel('historyModal').classList.add('flex');

    const { data, error } = await sbClient.from('class_schedule_history')
      .select('*').eq('session_id', sessionId).order('created_at', { ascending: false });
    if (error) { pel('hmList').innerHTML = `<p class="text-red-500 text-xs">Lỗi: ${esc(error.message)} (đã chạy SQL tạo bảng class_schedule_history chưa?)</p>`; return; }
    const rows = data || [];
    // Lấy tên người thực hiện bằng truy vấn riêng (actor_id trỏ tới auth.users nên không join trực tiếp được với profiles)
    const actorIds = [...new Set(rows.map(h => h.actor_id).filter(Boolean))];
    const nameMap = {};
    if (actorIds.length) {
      const { data: profs } = await sbClient.from('profiles').select('id, full_name').in('id', actorIds);
      (profs || []).forEach(p => { nameMap[p.id] = p.full_name; });
    }
    rows.forEach(h => { h.profiles = { full_name: nameMap[h.actor_id] || (h.actor_id === currentUser.id ? 'Bạn' : null) }; });
    pel('hmList').innerHTML = rows.map(h => `
      <div class="bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl p-3 text-xs space-y-1">
        <div class="flex items-center justify-between gap-2">
          <p class="font-bold text-gray-900 dark:text-white">${historyActionIcon[h.action] || '<i class="bi bi-pin-angle-fill"></i>'} ${esc(historyActionLabel[h.action] || h.action)}</p>
          <span class="text-[10px] text-gray-400 whitespace-nowrap">${new Date(h.created_at).toLocaleString('vi-VN')}</span>
        </div>
        <p class="text-gray-500">Người thực hiện: ${esc(h.profiles?.full_name || 'Không rõ')}</p>
        ${h.detail ? `<p class="text-gray-500 dark:text-gray-400">${esc(h.detail)}</p>` : ''}
      </div>`).join('') || '<p class="text-xs text-gray-400 italic">Chưa có lịch sử thay đổi nào cho buổi học này.</p>';
  }
  function closeHistoryModal() { pel('historyModal').classList.add('hidden'); pel('historyModal').classList.remove('flex'); }

  // =====================================================================
  // REALTIME — mọi thay đổi lịch học / tin nhắn hỗ trợ tự cập nhật ngay,
  // không cần tải lại trang (Supabase Realtime, bảng cần bật ở file SQL đi kèm)
  // =====================================================================
  let realtimeChannel = null;
  function isMyClassId(classId) { return myClasses.some(c => c.id === classId); }

  function setupRealtime() {
    if (realtimeChannel || !currentUser) return;
    realtimeChannel = sbClient.channel('readup-teacher-rt-' + currentUser.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_schedule_sessions' }, handleSessionRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_schedule_support_messages' }, handleSupportRealtimeChange)
      .subscribe();
  }

  function handleSessionRealtimeChange(payload) {
    const row = (payload.new && Object.keys(payload.new).length) ? payload.new : payload.old;
    if (!row || !row.class_id || !isMyClassId(row.class_id)) return;

    if (currentClassForSchedule && currentClassForSchedule.id === row.class_id) { cacheDel('sched:' + row.class_id); loadSchedule(); }
    cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
    loadNotifCounts();

    const cls = classInfoOf(row.class_id);
    const clsName = esc(cls.title || cls.class_code || 'Lớp học');
    if (payload.eventType === 'UPDATE' && payload.old && payload.new && Object.keys(payload.old).length > 1) {
      if (payload.old.status !== payload.new.status) {
        notify(`🔄 ${clsName} — buổi ${fmtDate(row.session_date)} đổi trạng thái: ${statusLabel[payload.new.status] || payload.new.status}`);
      } else if ((payload.old.room || '') !== (payload.new.room || '')) {
        notify(`🔄 ${clsName} — buổi ${fmtDate(row.session_date)} đổi phòng học: ${esc(payload.new.room || '(chưa rõ)')}`);
      }
    } else if (payload.eventType === 'DELETE') {
      notify(`🗑️ Một buổi học của lớp ${clsName} vừa bị xóa.`);
    }
  }

  function handleSupportRealtimeChange(payload) {
    const row = (payload.new && Object.keys(payload.new).length) ? payload.new : payload.old;
    if (!row || !row.class_id || !isMyClassId(row.class_id)) return;

    if (currentSupportSession && currentSupportSession.id === row.session_id && currentSupportAssistantId === row.assistant_id) {
      loadSupportThread();
    }
    loadNotifCounts();

    if (payload.eventType === 'INSERT' && row.sender_id !== currentUser.id) {
      const cls = classInfoOf(row.class_id);
      notify(`💬 Tin nhắn hỗ trợ mới — ${esc(cls.title || cls.class_code || 'Lớp học')}`);
    }
  }

  // ---- Tìm kiếm trong lịch tổng hợp ----
  function searchAssistantSchedule(keyword) {
    const resultsBox = pel('acalSearchResults');
    if (!resultsBox) return;
    const kw = (keyword || '').trim().toLowerCase();
    if (!kw) { resultsBox.classList.add('hidden'); resultsBox.innerHTML = ''; return; }

    const matches = allAssistantSessions.filter(s => {
      const cls = classInfoOf(s.class_id);
      const text = `${cls.title || ''} ${cls.class_code || ''} ${s.subject_name || ''} ${s.note || ''} ${s.room || ''} ${s.lecturer || ''}`.toLowerCase();
      return text.includes(kw);
    }).sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));

    resultsBox.innerHTML = matches.length === 0
      ? `<div class="p-3 text-xs text-gray-400 text-center">Không tìm thấy kết quả.</div>`
      : matches.slice(0, 20).map(s => {
          const cls = classInfoOf(s.class_id);
          const [y, m, d] = (s.session_date || '--').split('-');
          return `
            <div onclick="jumpToAssistantSearchResult('${s.session_date}')" class="p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800 last:border-0">
              <div class="overflow-hidden">
                <p class="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">${esc(cls.class_code || '')} · ${esc(s.subject_name || cls.title || '')}</p>
                <p class="text-[10px] text-gray-400 truncate">${esc(s.note || s.room || '')}</p>
              </div>
              <span class="text-[10px] font-bold text-[#cf1717] shrink-0 ml-2">${d}/${m}/${y}</span>
            </div>`;
        }).join('');
    resultsBox.classList.remove('hidden');
  }

  function jumpToAssistantSearchResult(dateStr) {
    const [y, m] = dateStr.split('-').map(Number);
    acalCurrentDate = new Date(y, m - 1, 1);
    renderAssistantCalendar();
    selectAssistantCalDate(dateStr);
    const input = pel('acalSearchInput');
    const resultsBox = pel('acalSearchResults');
    if (input) input.value = '';
    if (resultsBox) { resultsBox.classList.add('hidden'); resultsBox.innerHTML = ''; }
  }

  // =====================================================================
  // 2. QUẢN LÝ BÀI TẬP
  // =====================================================================
  function countGradable(arr) {
    return (arr || []).reduce((s, q) => s + (q.type === 'text' ? 0 : q.type === 'reading' ? countGradable(q.sub_blocks || []) : 1), 0);
  }

  function renderAssignmentList() {
    pel('assignmentList').innerHTML = currentAssignments.map(a => `
      <div class="bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${a.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-zinc-700'}">${a.is_published ? 'Đã xuất bản' : 'Bản nháp'}</span>
          <span class="text-[10px] text-gray-400">${countGradable(a.questions || [])} câu · thang 10</span>
        </div>
        <h4 class="font-bold text-sm text-gray-900 dark:text-white">${esc(a.title)}</h4>
        ${a.is_test ? '<span class="inline-block text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">BÀI TEST · Phòng thi</span>' : ''}
        ${dueBadgeHtml(a.due_date)}
        <p class="text-[11px] text-gray-400 truncate flex items-center gap-1">token: ${esc(a.token)}
          <button onclick="copyTokenOf('${esc(a.token)}')" title="Sao chép token" class="text-blue-400 hover:text-blue-600"><i class="bi bi-clipboard"></i></button>
        </p>
        <div class="flex flex-wrap gap-3 pt-1">
          <button onclick="editAssignment('${a.id}')" class="text-xs font-bold text-blue-500 hover:underline">Sửa</button>
          <button onclick="openResultsModal('${a.id}')" class="text-xs font-bold text-amber-500 hover:underline">Kết quả</button>
          <button onclick="openCopyToClassPrompt('${a.id}')" class="text-xs font-bold text-indigo-500 hover:underline">Sao chép sang lớp khác</button>
          <button type="button" onclick="previewTeacherAssignment('${a.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">Xem thử · Đề / Đáp án</button>
          <button onclick="deleteAssignment('${a.id}')" class="text-xs font-bold text-red-500 hover:underline">Xóa</button>
        </div>
      </div>`).join('') || '<p class="text-gray-400 text-sm col-span-full">Lớp này chưa có bài tập nào.</p>';
  }

  // Xem trực tiếp dữ liệu giáo viên đang quản lý — không gửi bài, không ghi điểm.
  function previewTeacherAssignment(id) {
    const a = currentAssignments.find(x => String(x.id) === String(id));
    if (!a) return notify('⚠️ Không tìm thấy bài để xem thử.');
    RUPreview.open({ title:a.title, description:a.description, is_test:!!a.is_test,
      questions:(() => { try { const q = typeof a.questions === 'string' ? JSON.parse(a.questions) : a.questions; return Array.isArray(q) ? q : []; } catch(e){ return []; } })(), total_points:a.total_points,
      time_limit:a.time_limit_minutes });
  }
  // Xem bản đang soạn trước khi lưu, bao gồm bài Test chưa mở giờ.
  function previewTeacherDraft() {
    RUPreview.open({title:pel('asTitle').value || 'Bài tập chưa đặt tên',
      description:pel('asDesc').value, is_test:pel('asIsTest').checked,
      time_limit:pel('asTimeLimit').value,questions:blocks,
      total_points:blocks.reduce((n,b)=> n+(b.type==='reading'?(b.sub_blocks||[]).reduce((s,q)=>s+(Number(q.points)||0),0):Number(b.points)||0),0)});
  }

  async function loadAssignmentsForClass() {
    currentClassForAssignments = pel('assignClassFilter').value;
    pel('btnNewAssignment').disabled = !currentClassForAssignments;
    if (!currentClassForAssignments) { pel('assignmentList').innerHTML = '<p class="text-gray-400 text-sm col-span-full"><i class="bi bi-arrow-up-circle"></i> Hãy chọn một lớp ở trên để xem bài tập.</p>'; return; }
    const cid = currentClassForAssignments;
    const cacheKey = 'assign:' + cid;
    const cached = cacheGet(cacheKey);
    if (cached) { currentAssignments = cached; renderAssignmentList(); }
    else pel('assignmentList').innerHTML = '<p class="text-gray-400 text-sm col-span-full"><i class="bi bi-hourglass-split"></i> Đang tải bài tập...</p>';
    const { data, error } = await sbClient.from('assignments').select('*').eq('class_id', cid).order('created_at', { ascending: false });
    if (currentClassForAssignments !== cid) return; // đã đổi lớp khác trong lúc tải
    if (error) { if (!cached) pel('assignmentList').innerHTML = `<p class="text-red-500 text-sm col-span-full">${esc(error.message)}</p>`; return; }
    currentAssignments = data || [];
    cacheSet(cacheKey, currentAssignments);
    renderAssignmentList();
  }

  function dueBadgeHtml(dueDate) {
    if (!dueDate) return '';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const dd = String(dueDate).slice(0, 10);
    const [y, m, d] = dd.split('-');
    const diffDays = Math.round((new Date(dd) - new Date(todayStr)) / 86400000);
    let tone = 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300', label = `Hạn nộp: ${d}/${m}/${y}`;
    if (diffDays < 0) { tone = 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'; label = `<i class="bi bi-alarm"></i> Đã quá hạn (${d}/${m}/${y})`; }
    else if (diffDays === 0) { tone = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'; label = `<i class="bi bi-alarm"></i> Hạn hôm nay (${d}/${m}/${y})`; }
    else if (diffDays <= 3) { tone = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'; label = `<i class="bi bi-alarm"></i> Còn ${diffDays} ngày (hạn ${d}/${m}/${y})`; }
    return `<p class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}">${label}</p>`;
  }

  function copyTokenOf(token) {
    navigator.clipboard?.writeText('assignment.html?token=' + token).then(() => notify('📋 Đã sao chép đường dẫn!')).catch(() => {});
  }

  // ---- Sao chép bài tập sang lớp khác ----
  function openCopyToClassPrompt(assignmentId) {
    const a = currentAssignments.find(x => x.id === assignmentId); if (!a) return;
    const others = myClasses.filter(c => c.id !== a.class_id);
    if (!others.length) return notify('⚠️ Bạn chưa có lớp nào khác để sao chép sang.');
    const optionsText = others.map((c, i) => `${i + 1}. ${c.class_code} — ${c.title}`).join('\n');
    const pick = prompt(`Sao chép bài "${a.title}" sang lớp nào? Nhập số thứ tự:\n${optionsText}`);
    const idx = parseInt(pick) - 1;
    if (isNaN(idx) || !others[idx]) return;
    copyAssignmentToClass(a, others[idx]);
  }
  async function copyAssignmentToClass(a, targetClass) {
    let token = `${slugify(targetClass.class_code)}-${slugify(a.title)}`;
    const { data: dup } = await sbClient.from('assignments').select('id').eq('token', token).maybeSingle();
    if (dup) token += '-' + Math.random().toString(36).slice(2, 6);
    const row = {
      class_id: targetClass.id, teacher_id: currentUser.id, token, title: a.title,
      description: a.description, time_limit_minutes: a.time_limit_minutes, max_attempts: a.max_attempts, due_date: a.due_date,
      questions: a.questions, total_points: a.total_points, is_published: a.is_published
    };
    const { error } = await sbClient.from('assignments').insert([row]);
    if (error) return notify('❌ Lỗi sao chép: ' + error.message);
    notify(`🎉 Đã sao chép "${a.title}" sang lớp ${targetClass.class_code}!`);
    cacheDel('assign:' + targetClass.id);
    if (currentClassForAssignments === targetClass.id) loadAssignmentsForClass();
  }

  async function deleteAssignment(id) {
    if (!confirm('Xóa bài tập này? Kết quả làm bài liên quan cũng sẽ bị xóa.')) return;
    const { error } = await sbClient.from('assignments').delete().eq('id', id);
    if (error) return notify('❌ Lỗi: ' + error.message);
    notify('✅ Đã xóa bài tập.'); cacheDel('assign:' + currentClassForAssignments); loadAssignmentsForClass();
  }

  // =====================================================================
  // 3. TRÌNH TẠO BÀI TẬP (QUESTION BUILDER)
  // =====================================================================
  let blocks = []; // mảng câu hỏi hiện tại đang soạn
  let lastFocusedEditable = null;
  let savedRange = null;

  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('qeditor')) lastFocusedEditable = e.target; });
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !lastFocusedEditable) return;
    const range = sel.getRangeAt(0);
    if (lastFocusedEditable.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
  });
  function qcmd(cmd, value) {
    if (!lastFocusedEditable) return notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước.');
    lastFocusedEditable.focus();
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    if (cmd === 'foreColor') document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, value === undefined || value === '' ? null : value);
    if (cmd === 'foreColor') document.execCommand('styleWithCSS', false, false);
    lastFocusedEditable.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function qSaveSel() {
    const sel = window.getSelection();
    if (lastFocusedEditable && sel && sel.rangeCount && lastFocusedEditable.contains(sel.getRangeAt(0).commonAncestorContainer)) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function qRestore() {
    if (!lastFocusedEditable) { notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước.'); return false; }
    lastFocusedEditable.focus();
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    return true;
  }
  function qInsertLink() {
    if (!lastFocusedEditable) return notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước.');
    const hasSel = savedRange && !savedRange.collapsed;
    let u = prompt(hasSel ? 'Nhập đường dẫn (https://...) cho đoạn chữ đang bôi đen:' : 'Nhập đường dẫn (https://...):');
    if (!u) return;
    if (!/^(https?:|mailto:)/i.test(u)) u = 'https://' + u;
    if (!qRestore()) return;
    if (hasSel) document.execCommand('createLink', false, u);
    else document.execCommand('insertHTML', false, `<a href="${u}" target="_blank" rel="noopener">${u}</a>&nbsp;`);
    lastFocusedEditable.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    lastFocusedEditable.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function qInsertYoutube() {
    if (!lastFocusedEditable) return notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước.');
    const u = prompt('Dán link YouTube (watch?v=..., youtu.be/..., shorts/...):'); if (!u) return;
    const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (!m) return notify('❌ Link YouTube không hợp lệ.');
    if (!qRestore()) return;
    document.execCommand('insertHTML', false, `<div class="video-wrap" contenteditable="false" style="position:relative;padding-top:56.25%;margin:1em 0"><iframe src="https://www.youtube.com/embed/${m[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" allowfullscreen></iframe></div><p><br></p>`);
    lastFocusedEditable.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Dán từ Word/web: giữ đậm/nghiêng/màu/căn lề, bỏ rác
  function qClean(h) {
    const d = new DOMParser().parseFromString(h, 'text/html');
    d.querySelectorAll('style,meta,link,script,xml').forEach(n => n.remove());
    d.querySelectorAll('*').forEach(n => {
      n.removeAttribute('class');
      const st = (n.getAttribute('style') || '').split(';').filter(x => /^\s*(font-weight|font-style|text-decoration|text-align|color)\s*:/i.test(x)).join(';');
      st ? n.setAttribute('style', st) : n.removeAttribute('style');
    });
    return d.body.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?o:p>/g, '');
  }
  document.addEventListener('paste', (e) => {
    const t = e.target;
    if (!t.classList || !t.classList.contains('qeditor')) return;
    const h = e.clipboardData.getData('text/html'); if (!h) return;
    e.preventDefault(); document.execCommand('insertHTML', false, qClean(h));
  });
  function qInsertImage(input) {
    const file = input.files[0]; if (!file || !lastFocusedEditable) return;
    const reader = new FileReader();
    reader.onload = () => { lastFocusedEditable.focus(); document.execCommand('insertHTML', false, `<img src="${reader.result}">`); };
    reader.readAsDataURL(file);
  }
  function qInsertTable() {
    if (!lastFocusedEditable) return notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước.');
    const rows = parseInt(prompt('Bảng bao nhiêu HÀNG?', '2')) || 2;
    const cols = parseInt(prompt('Bảng bao nhiêu CỘT?', '2')) || 2;
    let html = '<table><tbody>';
    for (let r = 0; r < Math.max(1, rows); r++) {
      html += '<tr>';
      for (let c = 0; c < Math.max(1, cols); c++) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    lastFocusedEditable.focus();
    document.execCommand('insertHTML', false, html);
  }
  function qInsertAudio(input) {
    const file = input.files[0]; input.value = '';
    if (!file || !lastFocusedEditable) return notify('⚠️ Hãy bấm vào ô câu hỏi/giải thích trước, sau đó chọn file âm thanh.');
    if (file.size > 8 * 1024 * 1024) return notify('⚠️ File âm thanh quá 8MB, hãy nén nhỏ hơn rồi thử lại.');
    const reader = new FileReader();
    reader.onload = () => { lastFocusedEditable.focus(); document.execCommand('insertHTML', false, `<audio controls src="${reader.result}"></audio><p><br></p>`); };
    reader.readAsDataURL(file);
  }

  // =====================================================================
  // NHẬP CÂU HỎI TỪ FILE WORD (.docx) — theo quy ước thẻ [MCQ] [MULTI] [TF] [FILL] [ESSAY]
  // Xem file mẫu "Mau_Cau_Hoi_Word.docx" đi kèm để biết cách trình bày chính xác cho từng dạng.
  // Lưu ý: dạng "Bài đọc" (Reading) KHÔNG nhập được từ Word — hãy tạo trực tiếp trong khối 📖 Bài đọc.
  // =====================================================================
  async function importFromWord(input) {
    const file = input.files[0]; input.value = '';
    if (!file) return;
    try { await RUAssets.load('mammoth'); } catch(e) { return notify('❌ Không tải được thư viện đọc Word.'); }
    notify('⏳ Đang đọc file Word...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const newBlocks = parseWordText(result.value);
      if (!newBlocks.length) return notify('⚠️ Không nhận diện được câu hỏi nào. Mỗi câu phải bắt đầu bằng thẻ [MCQ] [MULTI] [TF] [FILL] hoặc [ESSAY] — tải file mẫu "Mau_Cau_Hoi_Word.docx" để xem cách trình bày.');
      blocks.push(...newBlocks);
      renderBlocks();
      const skipped = newBlocks.filter(b => b._needsCheck).length;
      notify(`🎉 Đã nhập ${newBlocks.length} câu từ Word!${skipped ? ` (${skipped} câu chưa rõ đáp án đúng — đã tạm đánh dấu đáp án A, hãy kiểm tra lại)` : ''}`);
    } catch (err) {
      notify('❌ Lỗi đọc file Word: ' + (err.message || 'không xác định'));
    }
  }

  // Quy ước: mỗi câu hỏi bắt đầu bằng thẻ [MCQ]/[MULTI]/[TF]/[FILL]/[ESSAY] rồi tới nội dung trên cùng dòng hoặc dòng kế tiếp.
  // - [MCQ]/[MULTI]/[TF]: các dòng lựa chọn tiếp theo (có thể có tiền tố "A. " hay không đều được), thêm dấu * cuối dòng cho đáp án đúng.
  //   [TF] chỉ cần 2 dòng lựa chọn là "Đúng" và "Sai".
  // - [FILL]: nội dung chứa {{1}} {{2}}... rồi các dòng "Đáp án 1: ...", "Đáp án 2: ..." (nhiều đáp án cách nhau bởi dấu ;)
  // - [ESSAY]: chỉ có nội dung đề bài, không có lựa chọn/đáp án.
  // Dòng tuỳ chọn ở bất kỳ câu nào: "Điểm: 2" và "Giải thích: ..." (giải thích có thể xuống dòng, sẽ được nối tiếp).
  function parseWordText(text) {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const tagRe = /^\[(MCQ|MULTI|TF|FILL|ESSAY)\]\s*(.*)/i;
    const pointsRe = /^Điểm\s*:\s*([\d.]+)/i;
    const explainRe = /^Giải thích\s*:\s*(.*)/i;
    const fillAnsRe = /^Đáp án\s*(\d+)?\s*:\s*(.*)/i;
    const optRe = /^([A-Da-d])[\.\)]\s+(.*)/;

    const out = [];
    let cur = null, explainMode = false;

    function finalizeAndPush() {
      if (!cur) return;
      if (cur.type === 'mcq' || cur.type === 'tf' || cur.type === 'multi') {
        const correctCount = cur.options.filter(o => o.correct).length;
        if (correctCount === 0 && cur.options.length) { cur.options[0].correct = true; cur._needsCheck = true; }
        if (cur.type !== 'multi' && correctCount > 1) { // mcq/tf chỉ được 1 đáp án đúng -> giữ đáp án đúng đầu tiên
          let kept = false;
          cur.options.forEach(o => { if (o.correct) { if (kept) o.correct = false; else kept = true; } });
        }
      }
      out.push(cur);
      cur = null; explainMode = false;
    }

    rawLines.forEach(line => {
      const tm = line.match(tagRe);
      if (tm) {
        finalizeAndPush();
        const type = tm[1].toLowerCase();
        cur = { id: newId(), type, content: esc(tm[2] || ''), points: type === 'essay' ? 5 : 1, explanation: '' };
        if (type === 'mcq' || type === 'multi' || type === 'tf') cur.options = [];
        if (type === 'fill') cur.blanks = {};
        return;
      }
      if (!cur) return; // bỏ qua dòng trước thẻ [TAG] đầu tiên (VD tiêu đề chung của đề)

      const pm = line.match(pointsRe);
      if (pm) { cur.points = parseFloat(pm[1]) || cur.points; explainMode = false; return; }
      const em = line.match(explainRe);
      if (em) { cur.explanation = esc(em[1] || ''); explainMode = true; return; }
      if (explainMode) { cur.explanation += ' ' + esc(line); return; }
      const fm = line.match(fillAnsRe);
      if (fm && cur.type === 'fill') {
        const gapNums = extractGapNumbers(cur.content);
        const n = fm[1] ? parseInt(fm[1]) : (gapNums[0] || 1);
        cur.blanks[n] = fm[2].trim();
        return;
      }
      if (cur.type === 'mcq' || cur.type === 'multi' || cur.type === 'tf') {
        const om = line.match(optRe);
        let t = om ? om[2] : line, correct = false;
        if (/\*\s*$/.test(t)) { correct = true; t = t.replace(/\*\s*$/, '').trim(); }
        const letter = om ? om[1].toLowerCase() : String.fromCharCode(97 + cur.options.length);
        cur.options.push({ id: letter + Math.random().toString(36).slice(2, 6), text: esc(t), correct });
        return;
      }
      cur.content += ' ' + esc(line); // dòng nối tiếp nội dung câu hỏi (cho fill/essay chưa có đáp án)
    });
    finalizeAndPush();

    return out.filter(b => {
      if (b.type === 'mcq' || b.type === 'multi' || b.type === 'tf') return b.options.length >= 2;
      if (b.type === 'fill') return extractGapNumbers(b.content).length > 0;
      return true;
    });
  }

  function toggleTestBox(){ pel('testBox').classList.toggle('hidden', !pel('asIsTest').checked); }
  function openBuilder(assignmentToEdit) {
    pel('editingAssignmentId').value = assignmentToEdit ? assignmentToEdit.id : '';
    pel('builderModeTitle').innerText = assignmentToEdit ? 'Chỉnh Sửa Bài Tập' : 'Tạo Bài Tập Mới';
    pel('asTitle').value = assignmentToEdit?.title || '';
    pel('asDesc').value = assignmentToEdit?.description || '';
    pel('asTimeLimit').value = assignmentToEdit?.time_limit_minutes || '';
    pel('asMaxAttempts').value = assignmentToEdit?.max_attempts || '';
    pel('asDueDate').value = assignmentToEdit?.due_date ? String(assignmentToEdit.due_date).slice(0, 10) : '';
    pel('asPublished').checked = assignmentToEdit ? !!assignmentToEdit.is_published : true;
    (function(){const a=assignmentToEdit||{},ls=v=>v?new Date(new Date(v)-new Date(v).getTimezoneOffset()*6e4).toISOString().slice(0,16):'';
      pel('asIsTest').checked=!!a.is_test; pel('asOpenAt').value=ls(a.open_at); pel('asCloseAt').value=ls(a.close_at);
      pel('asTestPass').value=a.test_password||''; pel('asShowResult').checked=a.show_result!==false; pel('asAllowReview').checked=a.allow_review!==false; toggleTestBox();})();
    const rawBlocks = assignmentToEdit ? JSON.parse(JSON.stringify(assignmentToEdit.questions || [])) : [];
    // Bài đã lưu trước đó có blanks ở dạng mảng [{gap, accepted_answers}] (định dạng lưu xuống DB),
    // trong khi khung soạn thảo cần dạng object {gap: "đáp án;đáp án"} để hiển thị ô nhập.
    // Nếu không chuẩn hoá lại ở đây thì lúc lưu (saveAssignment) sẽ bị lỗi "...split is not a function".
    function denormalizeFill(b) {
      if (b.type === 'fill' && Array.isArray(b.blanks)) {
        const map = {};
        b.blanks.forEach(bl => { map[bl.gap] = (bl.accepted_answers || []).join('; '); });
        b.blanks = map;
      }
      return b;
    }
    blocks = rawBlocks.map(b => {
      b = denormalizeFill(b);
      if (b.type === 'reading') b.sub_blocks = (b.sub_blocks || []).map(denormalizeFill);
      return b;
    });
    renderBlocks();
    previewAsToken();
    pel('asTitle').oninput = previewAsToken;
    pel('builderModal').classList.remove('hidden'); pel('builderModal').classList.add('flex');
  }
  function closeBuilder() { pel('builderModal').classList.add('hidden'); pel('builderModal').classList.remove('flex'); }
  function editAssignment(id) { const a = currentAssignments.find(x => x.id === id); if (a) openBuilder(a); }

  function copyAsToken() {
    const text = pel('asTokenPreview').innerText;
    navigator.clipboard?.writeText(text).then(() => notify('📋 Đã sao chép đường dẫn!')).catch(() => notify('⚠️ Không sao chép được, hãy bôi đen và copy thủ công.'));
  }

  function previewAsToken() {
    const cls = myClasses.find(c => c.id === currentClassForAssignments);
    const code = cls ? cls.class_code : '...';
    pel('asTokenPreview').innerText = `assignment.html?token=${slugify(code)}-${slugify(pel('asTitle').value || 'ten-bai-tap')}`;
  }

  function newId() { return 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function addBlock(type) {
    const base = { id: newId(), type, content: '', points: 1, explanation: '' };
    if (type === 'mcq' || type === 'multi') base.options = [{ id: 'a', text: '', correct: type === 'mcq' }, { id: 'b', text: '', correct: false }];
    if (type === 'tf') base.options = [{ id: 'true', text: 'True', correct: true }, { id: 'false', text: 'False', correct: false }];
    if (type === 'fill') { base.blanks = {}; }
    if (type === 'text') { base.points = 0; }
    if (type === 'reading') { base.points = 0; base.sub_blocks = []; }
    blocks.push(base);
    renderBlocks();
    revealBlock(base.id);
  }
  function removeBlock(id) { blocks = blocks.filter(b => b.id !== id); renderBlocks(); }
  function moveBlock(id, dir) {
    const i = blocks.findIndex(b => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; renderBlocks();
  }

  // ---- Câu hỏi con bên trong khối Reading ----
  function addSubBlock(readingId, type) {
    const rb = blocks.find(b => b.id === readingId); if (!rb) return;
    const base = { id: newId(), type, content: '', points: 1, explanation: '' };
    if (type === 'mcq' || type === 'multi') base.options = [{ id: 'a', text: '', correct: type === 'mcq' }, { id: 'b', text: '', correct: false }];
    if (type === 'tf') base.options = [{ id: 'true', text: 'True', correct: true }, { id: 'false', text: 'Flase', correct: false }];
    if (type === 'fill') base.blanks = {};
    if (type === 'text') base.points = 0;
    rb.sub_blocks = rb.sub_blocks || [];
    rb.sub_blocks.push(base);
    renderBlocks();
    revealBlock(base.id);
  }
  function removeSubBlock(readingId, id) {
    const rb = blocks.find(b => b.id === readingId); if (!rb) return;
    rb.sub_blocks = (rb.sub_blocks || []).filter(b => b.id !== id); renderBlocks();
  }
  function moveSubBlock(readingId, id, dir) {
    const rb = blocks.find(b => b.id === readingId); if (!rb) return;
    const arr = rb.sub_blocks || [];
    const i = arr.findIndex(b => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; renderBlocks();
  }

  const typeLabel = { mcq: '<i class="bi bi-check2-square"></i> Trắc nghiệm 1 đáp án', multi: '<i class="bi bi-check2-all"></i> Trắc nghiệm nhiều đáp án', tf: '<i class="bi bi-check-lg"></i><i class="bi bi-x-lg"></i> Đúng/Sai', fill: '<i class="bi bi-pencil-square"></i> Điền khuyết', essay: '<i class="bi bi-file-earmark-text"></i> Tự luận', text: '<i class="bi bi-pin-angle-fill"></i> Văn bản / hướng dẫn', reading: '<i class="bi bi-book"></i> Bài đọc (Reading)' };
  // Các dạng câu hỏi con được phép thêm bên trong 1 khối Reading (không cho lồng Reading trong Reading)
  const subBlockTypes = [
    ['mcq', '<i class="bi bi-check2-square"></i> 1 đáp án'], ['multi', '<i class="bi bi-check2-all"></i> Nhiều đáp án'], ['tf', '<i class="bi bi-check-lg"></i><i class="bi bi-x-lg"></i> Đúng/Sai'],
    ['fill', '<i class="bi bi-pencil-square"></i> Điền khuyết'], ['essay', '<i class="bi bi-file-earmark-text"></i> Tự luận'], ['text', '<i class="bi bi-pin-angle-fill"></i> Hướng dẫn']
  ];

  // Tìm 1 khối theo id, tìm cả trong danh sách chính lẫn bên trong các khối Reading (sub_blocks)
  function findBlock(id) {
    for (const b of blocks) {
      if (b.id === id) return b;
      if (b.type === 'reading' && Array.isArray(b.sub_blocks)) {
        const sub = b.sub_blocks.find(x => x.id === id);
        if (sub) return sub;
      }
    }
    return null;
  }

  // Vẽ lại danh sách câu hỏi NHƯNG giữ nguyên vị trí cuộn (modal, danh sách câu con, ô bài đọc)
  function renderBlocks() {
    const modal = pel('builderModal');
    const modalTop = modal ? modal.scrollTop : 0;
    const saved = {};
    document.querySelectorAll('#questionBlocks [id^="subList-"], #questionBlocks .qeditor[id^="qc-"]').forEach(el => { saved[el.id] = el.scrollTop; });
    _renderBlocksRaw();
    if (modal) modal.scrollTop = modalTop;
    Object.keys(saved).forEach(id => { const el = document.getElementById(id); if (el) el.scrollTop = saved[id]; });
  }
  function revealBlock(id) {
    const el = document.querySelector('#questionBlocks [data-block="' + id + '"]');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function _renderBlocksRaw() {
    pel('questionBlocks').innerHTML = blocks.map((b, idx) => `
      <div class="border dark:border-zinc-700 rounded-2xl p-4 space-y-3 bg-white dark:bg-zinc-900" data-block="${b.id}">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-[#cf1717]">Câu ${b.type === 'text' ? '' : (blocks.slice(0, idx + 1).filter(x => x.type !== 'text').length)} — ${typeLabel[b.type]}</span>
          <div class="flex items-center gap-2 text-xs">
            ${b.type !== 'text' ? `<label class="flex items-center gap-1">Điểm: <input type="number" min="0" step="0.5" value="${b.points}" oninput="updateField('${b.id}','points',this.value,true)" class="w-14 p-1 rounded border dark:bg-zinc-800 dark:border-zinc-700"></label>` : ''}
            <button type="button" onclick="moveBlock('${b.id}',-1)" title="Lên"><i class="bi bi-arrow-up"></i></button>
            <button type="button" onclick="moveBlock('${b.id}',1)" title="Xuống"><i class="bi bi-arrow-down"></i></button>
            <button type="button" onclick="removeBlock('${b.id}')" class="text-red-500 font-bold" title="Xóa"><i class="bi bi-trash"></i></button>
          </div>
        </div>

        ${b.type !== 'reading' ? `
        <div>
          <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">${b.type === 'text' ? 'Nội dung' : 'Nội dung câu hỏi'}</label>
          ${b.type === 'text' ? `<label class="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
            <input type="checkbox" ${b.two_col ? 'checked' : ''} onchange="updateField('${b.id}','two_col',this.checked); renderBlocks()"> <i class="bi bi-newspaper"></i> Hiển thị bài đọc chia 2 cột (cho bài dài, dễ đọc hơn với học sinh)
          </label>` : ''}
          ${RUEditor.button(b.id)}<div id="qc-${b.id}" class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 ${b.type === 'text' && b.two_col ? 'qeditor-2col' : ''}" contenteditable="true" oninput="updateField('${b.id}','content',this.innerHTML)">${b.content || ''}</div>
        </div>` : renderReadingBlockBody(b)}

        ${(b.type === 'mcq' || b.type === 'multi' || b.type === 'tf') ? `
          <div class="space-y-2">
            <label class="block text-[10px] font-bold uppercase text-gray-500">Các lựa chọn (tick ✓ vào đáp án đúng)</label>
            ${b.options.map(o => `
              <div class="flex items-center gap-2">
                <input type="${b.type === 'multi' ? 'checkbox' : 'radio'}" name="correct-${b.id}" ${o.correct ? 'checked' : ''}
                  onchange="setCorrect('${b.id}','${o.id}', ${b.type === 'multi'} ? this.checked : true, ${b.type !== 'multi'})">
                <input type="text" value="${esc(o.text)}" placeholder="Nội dung lựa chọn..." ${b.type === 'tf' ? 'readonly' : ''}
                  oninput="setOptionText('${b.id}','${o.id}',this.value)" class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs">
                ${b.type !== 'tf' && b.options.length > 2 ? `<button type="button" onclick="removeOption('${b.id}','${o.id}')" class="text-red-400 text-xs">✕</button>` : ''}
              </div>`).join('')}
            ${b.type !== 'tf' ? `<button type="button" onclick="addOption('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm lựa chọn</button>` : ''}
          </div>` : ''}

        ${b.type === 'fill' ? renderFillGapsUI(b) : ''}

        ${(b.type !== 'text' && b.type !== 'reading') ? `
          <div>
            <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-lightbulb"></i> Đáp án & giải thích (hiện ra sau khi học sinh nộp bài)</label>
            <div class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" contenteditable="true" oninput="updateField('${b.id}','explanation',this.innerHTML)">${b.explanation || ''}</div>
          </div>` : ''}
      </div>`).join('') || '<p class="text-xs text-gray-400 italic text-center py-6">Chưa có câu hỏi nào — bấm nút bên dưới để thêm.</p>';
    pel('questionBlocks').querySelectorAll('textarea[oninput*="updateBlankAnswer"]').forEach(autoGrowTextarea);
  }

  // ---- Render riêng cho khối Reading: chia 2 cột — trái nhập bài văn, phải quản lý câu hỏi con ----
  function renderReadingBlockBody(b) {
    const subCount = (b.sub_blocks || []).length;
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t dark:border-zinc-700 pt-3">
        <div>
          <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-book"></i> Bài văn (Reading passage)</label>
          <label class="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
            <input type="checkbox" ${b.two_col ? 'checked' : ''} onchange="updateField('${b.id}','two_col',this.checked); renderBlocks()"> <i class="bi bi-newspaper"></i> Hiển thị bài đọc chia 2 cột chữ (cho bài dài)
          </label>
          ${RUEditor.button(b.id)}<div id="qc-${b.id}" class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 ${b.two_col ? 'qeditor-2col' : ''}" style="min-height:220px;max-height:420px;overflow-y:auto" contenteditable="true" oninput="updateField('${b.id}','content',this.innerHTML)">${b.content || ''}</div>
        </div>
        <div class="bg-gray-50 dark:bg-zinc-800/40 rounded-lg border dark:border-zinc-700 p-2 flex flex-col" style="max-height:420px">
          <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-question-circle"></i> Câu hỏi thuộc bài đọc này (${subCount})</label>
          <div class="space-y-2 overflow-y-auto flex-1 pr-1" id="subList-${b.id}">
            ${renderSubBlocksHtml(b)}
          </div>
          <div class="flex flex-wrap gap-1 pt-2 border-t dark:border-zinc-700 mt-2">
            ${subBlockTypes.map(([t, label]) => `<button type="button" onclick="addSubBlock('${b.id}','${t}')" class="px-2 py-1 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded text-[10px] font-bold hover:border-[#cf1717] hover:text-[#cf1717] transition">${label}</button>`).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderSubBlocksHtml(rb) {
    const arr = rb.sub_blocks || [];
    if (!arr.length) return '<p class="text-[11px] text-gray-400 italic">Chưa có câu hỏi — bấm nút bên dưới để thêm.</p>';
    return arr.map((b, idx) => `
      <div class="border dark:border-zinc-700 rounded-xl p-2 space-y-2 bg-white dark:bg-zinc-900 text-xs" data-block="${b.id}">
        <div class="flex items-center justify-between">
          <span class="font-extrabold text-[#cf1717]">Câu con ${b.type === 'text' ? '' : (arr.slice(0, idx + 1).filter(x => x.type !== 'text').length)} · ${typeLabel[b.type]}</span>
          <div class="flex items-center gap-1.5">
            ${b.type !== 'text' ? `<label class="flex items-center gap-1">Đ: <input type="number" min="0" step="0.5" value="${b.points}" oninput="updateField('${b.id}','points',this.value,true)" class="w-10 p-0.5 rounded border dark:bg-zinc-800 dark:border-zinc-700"></label>` : ''}
            <button type="button" onclick="moveSubBlock('${rb.id}','${b.id}',-1)" title="Lên"><i class="bi bi-arrow-up"></i></button>
            <button type="button" onclick="moveSubBlock('${rb.id}','${b.id}',1)" title="Xuống"><i class="bi bi-arrow-down"></i></button>
            <button type="button" onclick="removeSubBlock('${rb.id}','${b.id}')" class="text-red-500 font-bold"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        ${RUEditor.button(b.id)}<div id="qc-${b.id}" class="qeditor p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-xs" style="min-height:50px" contenteditable="true" oninput="updateField('${b.id}','content',this.innerHTML)">${b.content || ''}</div>
        ${(b.type === 'mcq' || b.type === 'multi' || b.type === 'tf') ? `
          <div class="space-y-1">
            ${b.options.map(o => `
              <div class="flex items-center gap-1.5">
                <input type="${b.type === 'multi' ? 'checkbox' : 'radio'}" name="correct-${b.id}" ${o.correct ? 'checked' : ''}
                  onchange="setCorrect('${b.id}','${o.id}', ${b.type === 'multi'} ? this.checked : true, ${b.type !== 'multi'})">
                <input type="text" value="${esc(o.text)}" placeholder="Lựa chọn..." ${b.type === 'tf' ? 'readonly' : ''}
                  oninput="setOptionText('${b.id}','${o.id}',this.value)" class="flex-1 p-1 rounded border dark:bg-zinc-800 dark:border-zinc-700">
                ${b.type !== 'tf' && b.options.length > 2 ? `<button type="button" onclick="removeOption('${b.id}','${o.id}')" class="text-red-400">✕</button>` : ''}
              </div>`).join('')}
            ${b.type !== 'tf' ? `<button type="button" onclick="addOption('${b.id}')" class="text-[11px] font-bold text-[#cf1717] hover:underline">+ Thêm lựa chọn</button>` : ''}
          </div>` : ''}
        ${b.type === 'fill' ? renderFillGapsUI(b) : ''}
        ${b.type !== 'text' ? `<div><label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-lightbulb"></i> Giải thích</label>
          <div class="qeditor p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-xs" contenteditable="true" oninput="updateField('${b.id}','explanation',this.innerHTML)">${b.explanation || ''}</div></div>` : ''}
      </div>`).join('');
  }

  function updateField(id, field, value, isNumber) {
    const b = findBlock(id); if (!b) return;
    b[field] = isNumber ? parseFloat(value || 0) : ((field === 'content' || field === 'explanation') ? RUEditor.sanitize(value) : value);
  }
  function setOptionText(bid, oid, val) { const b = findBlock(bid); const o = b.options.find(x => x.id === oid); if (o) o.text = val; }
  function setCorrect(bid, oid, checked, single) {
    const b = findBlock(bid); if (!b) return;
    if (single) b.options.forEach(o => o.correct = (o.id === oid));
    else { const o = b.options.find(x => x.id === oid); if (o) o.correct = checked; }
  }
  function addOption(bid) {
    const b = findBlock(bid); if (!b) return;
    const nextLetter = String.fromCharCode(97 + b.options.length);
    b.options.push({ id: nextLetter + Date.now().toString(36).slice(-3), text: '', correct: false });
    renderBlocks();
  }
  function removeOption(bid, oid) {
    const b = findBlock(bid); if (!b) return;
    b.options = b.options.filter(o => o.id !== oid); renderBlocks();
  }

  // ===== ĐIỀN KHUYẾT NHIỀU CHỖ TRỐNG (1 câu có thể có 1 hoặc nhiều chỗ trống {{1}}, {{2}}...) =====
  function extractGapNumbers(content) {
    const nums = Array.from((content || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => parseInt(m[1]));
    return [...new Set(nums)].sort((a, b) => a - b);
  }
  function renderFillGapsUI(b) {
    const gaps = extractGapNumbers(b.content);
    b.blanks = b.blanks || {};
    if (!gaps.length) {
      return `<div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-[10px] font-bold uppercase text-gray-500">Chỗ trống điền khuyết</label>
          <button type="button" onclick="insertGapAtCursor('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Chèn chỗ trống vào nội dung</button>
        </div>
        <p class="text-[11px] text-amber-500 italic"><i class="bi bi-exclamation-triangle-fill"></i> Đặt con trỏ vào vị trí muốn tạo chỗ trống trong "Nội dung câu hỏi" ở trên, rồi bấm nút này (bấm nhiều lần nếu câu có nhiều chỗ trống).</p>
      </div>`;
    }
    return `<div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="block text-[10px] font-bold uppercase text-gray-500">Đáp án cho từng chỗ trống (${gaps.length} chỗ — nhiều đáp án đúng cách nhau bởi dấu ;)</label>
        <button type="button" onclick="insertGapAtCursor('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm chỗ trống</button>
      </div>
      ${gaps.map(n => `
        <div class="flex items-start gap-2">
          <span class="text-[10px] font-extrabold text-white bg-[#cf1717] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">${n}</span>
          <textarea rows="1" placeholder="VD: cost; costs (nhiều đáp án cách nhau bởi dấu ;)"
            oninput="updateBlankAnswer('${b.id}',${n},this.value); autoGrowTextarea(this)"
            class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs resize-none overflow-hidden leading-relaxed"
            style="min-height:34px">${esc(b.blanks[n] || '')}</textarea>
        </div>`).join('')}
    </div>`;
  }
  function updateBlankAnswer(bid, gapNum, value) {
    const b = findBlock(bid); if (!b) return;
    b.blanks = b.blanks || {};
    b.blanks[gapNum] = value;
  }
  function autoGrowTextarea(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  function insertGapAtCursor(bid) {
    const b = findBlock(bid); if (!b) return;
    const div = pel('qc-' + bid); if (!div) return;
    div.focus();
    const nums = extractGapNumbers(b.content);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    document.execCommand('insertText', false, `{{${next}}}`);
    renderBlocks();
  }

  async function saveAssignment() {
    if (!currentClassForAssignments) return notify('⚠️ Vui lòng chọn lớp trước.');
    const title = pel('asTitle').value.trim();
    if (!title) return notify('⚠️ Vui lòng nhập tiêu đề bài tập.');
    if (!blocks.length) return notify('⚠️ Vui lòng thêm ít nhất 1 câu hỏi.');

    // Kiểm tra mỗi câu điền khuyết (kể cả bên trong Reading) phải có ít nhất 1 chỗ trống đã chèn
    const allFillLeaves = [];
    blocks.forEach(b => {
      if (b.type === 'fill') allFillLeaves.push(b);
      if (b.type === 'reading') (b.sub_blocks || []).forEach(sb => { if (sb.type === 'fill') allFillLeaves.push(sb); });
    });
    for (const fb of allFillLeaves) {
      if (extractGapNumbers(fb.content).length === 0) {
        return notify(`⚠️ Câu điền khuyết chưa có chỗ trống nào — hãy bấm "+ Chèn chỗ trống" trong câu đó trước khi lưu.`);
      }
    }
    if (blocks.some(b => b.type === 'reading' && (!b.sub_blocks || !b.sub_blocks.length))) {
      return notify('⚠️ Có khối "Bài đọc" chưa có câu hỏi con nào — hãy thêm ít nhất 1 câu hỏi cho bài đọc đó.');
    }

    // Chuẩn hoá dữ liệu fill-blank: chuyển blanks (map theo số chỗ trống) -> mảng {gap, accepted_answers} theo thứ tự
    function normalizeFill(nb) {
      if (nb.type === 'fill') {
        const gaps = extractGapNumbers(nb.content);
        nb.blanks = gaps.map(n => ({
          gap: n,
          accepted_answers: ((nb.blanks && nb.blanks[n]) || '').split(';').map(s => s.trim()).filter(Boolean)
        }));
      }
      return nb;
    }
    const finalBlocks = blocks.map(b => {
      const nb = { ...b };
      if (nb.type === 'reading') { nb.sub_blocks = (nb.sub_blocks || []).map(sb => normalizeFill({ ...sb })); return nb; }
      return normalizeFill(nb);
    });
    const sumPoints = arr => arr.reduce((s, b) => s + (b.type === 'text' ? 0 : (b.type === 'reading' ? sumPoints(b.sub_blocks || []) : (parseFloat(b.points) || 0))), 0);
    const total_points = sumPoints(finalBlocks);

    if (pel('asIsTest').checked) {
      if (!pel('asOpenAt').value || !pel('asCloseAt').value) return notify('⚠️ Bài test cần có ngày giờ mở và ngày giờ đóng.');
      if (new Date(pel('asCloseAt').value) <= new Date(pel('asOpenAt').value)) return notify('⚠️ Giờ đóng phải sau giờ mở.');
    }
    const cls = myClasses.find(c => c.id === currentClassForAssignments);
    const editingId = pel('editingAssignmentId').value;
    let token;
    if (editingId) {
      const existing = currentAssignments.find(a => a.id === editingId);
      token = existing ? existing.token : `${slugify(cls.class_code)}-${slugify(title)}`;
    } else {
      token = `${slugify(cls.class_code)}-${slugify(title)}`;
      const { data: dup } = await sbClient.from('assignments').select('id').eq('token', token).maybeSingle();
      if (dup) token += '-' + Math.random().toString(36).slice(2, 6);
    }

    const row = {
      class_id: currentClassForAssignments, teacher_id: currentUser.id, token, title,
      description: pel('asDesc').value.trim() || null,
      time_limit_minutes: pel('asTimeLimit').value ? parseInt(pel('asTimeLimit').value) : null,
      max_attempts: pel('asMaxAttempts').value ? parseInt(pel('asMaxAttempts').value) : null,
      due_date: pel('asDueDate').value || null,
      questions: finalBlocks, total_points, is_published: pel('asPublished').checked,
      is_test: pel('asIsTest').checked,
      open_at: pel('asIsTest').checked && pel('asOpenAt').value ? new Date(pel('asOpenAt').value).toISOString() : null,
      close_at: pel('asIsTest').checked && pel('asCloseAt').value ? new Date(pel('asCloseAt').value).toISOString() : null,
      test_password: pel('asIsTest').checked ? (pel('asTestPass').value.trim() || null) : null,
      show_result: pel('asShowResult').checked, allow_review: pel('asAllowReview').checked,
      updated_at: new Date().toISOString()
    };
    const saveRes = editingId ? await sbClient.from('assignments').update(row).eq('id', editingId).select('id, is_test') : await sbClient.from('assignments').insert([row]).select('id, is_test');
    if (saveRes.error) return notify('❌ Lỗi lưu bài tập: ' + saveRes.error.message);
    // Supabase/RLS có thể "im lặng" không cập nhật dòng nào → báo rõ thay vì hiện "Đã lưu"
    if (!saveRes.data || !saveRes.data.length) return notify('❌ Không lưu được: tài khoản này không có quyền sửa bài này (bị chặn bởi RLS). Chưa có thay đổi nào được ghi.');
    if (saveRes.data[0].is_test !== row.is_test) return notify('⚠️ Máy chủ vẫn giữ is_test = ' + saveRes.data[0].is_test + ' dù bạn đã ' + (row.is_test ? 'tích' : 'bỏ tích') + ' — có trigger/ràng buộc trong Supabase đang ghi đè.');
    notify('🎉 Đã lưu bài tập! Đường dẫn: assignment.html?token=' + token);
    closeBuilder(); cacheDel('assign:' + currentClassForAssignments); loadAssignmentsForClass();
  }

  // =====================================================================
  // 4. KẾT QUẢ BÀI TẬP
  // =====================================================================
  let currentResultsAssignment = null;
  let currentAttemptsList = [];

  function sumManualScores(obj) { return Object.values(obj || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0); }

  async function openResultsModal(assignmentId) {
    const a = currentAssignments.find(x => x.id === assignmentId); if (!a) return;
    currentResultsAssignment = a;
    pel('rmTitle').innerText = a.title;
    pel('rmList').innerHTML = '<p class="text-gray-400 italic">Đang tải...</p>';
    pel('resultsModal').classList.remove('hidden'); pel('resultsModal').classList.add('flex');
    const { data, error } = await sbClient.from('assignment_attempts').select('*, profiles(full_name)').eq('assignment_id', assignmentId).order('submitted_at', { ascending: false });
    if (error) { pel('rmList').innerHTML = `<p class="text-red-500">${esc(error.message)}</p>`; return; }
    currentAttemptsList = data || [];
    pel('rmSearchName').value = ''; pel('rmSort').value = 'latest';
    await loadTestSessions();
    renderScoreDistribution();
    renderResultsList();
    // Bài thi (is_test): tự làm mới mỗi 5 giây để theo dõi học sinh đang làm bài + số lần cảnh báo
    clearInterval(resultsTimer);
    if (a.is_test) resultsTimer = setInterval(refreshResults, 5000);
  }

  // ---- Phiên làm bài của bài thi (đang làm / đã nộp / cảnh báo / làm lại / hủy) ----
  let currentSessions = [], sessionsError = '', resultsTimer = null;
  const MAX_VIOL_SHOWN = 3;
  async function loadTestSessions() {
    const a = currentResultsAssignment; currentSessions = []; sessionsError = '';
    if (!a || !a.is_test) return;
    const { data, error } = await sbClient.rpc('teacher_test_sessions', { p_assignment_id: a.id });
    if (error) { sessionsError = error.message; return; }
    currentSessions = data || [];
  }
  async function refreshResults() {
    const a = currentResultsAssignment;
    if (!a || pel('resultsModal').classList.contains('hidden')) { clearInterval(resultsTimer); return; }
    if (!pel('gradeModal').classList.contains('hidden')) return;      // đang chấm bài → không làm mới nền
    const { data } = await sbClient.from('assignment_attempts').select('*, profiles(full_name)').eq('assignment_id', a.id).order('submitted_at', { ascending: false });
    if (a !== currentResultsAssignment) return;
    if (data) currentAttemptsList = data;
    await loadTestSessions();
    if (a !== currentResultsAssignment) return;
    renderScoreDistribution(); renderResultsList();
  }
  const attemptStudentId = r => r.student_id ?? r.user_id ?? null;
  function sessionOfAttempt(r) { return currentSessions.find(x => x.attempt_id === r.id) || null; }
  // Mỗi học sinh có thể có nhiều lần làm → lấy lần điểm cao nhất của từng học sinh
  function bestAttempts() {
    const m = {};
    currentAttemptsList.forEach(r => { const k = attemptStudentId(r) || r.id; if (!m[k] || scoreOf(r) > scoreOf(m[k])) m[k] = r; });
    return Object.values(m);
  }
  function violBadge(v) {
    const cls = v >= MAX_VIOL_SHOWN ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
              : v > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
              : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400';
    return `<span title="Số lần cảnh báo (rời toàn màn hình / chuyển tab)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${cls}"><i class="bi bi-exclamation-triangle-fill"></i> Cảnh báo ${v}/${MAX_VIOL_SHOWN}</span>`;
  }
  // Xóa kết quả → học sinh được vào làm lại (chỉ 1 lần). Hủy kết quả → bài bị vô hiệu, KHÔNG được làm lại.
  async function testReset(studentId, name) {
    if (!confirm(`Xóa kết quả của "${name}" để học sinh làm lại bài?\n\nBài làm hiện tại sẽ bị xóa. Mỗi học sinh chỉ được cho làm lại 1 lần.`)) return;
    const { error } = await sbClient.rpc('teacher_test_reset', { p_assignment_id: currentResultsAssignment.id, p_student_id: studentId });
    if (error) return notify('❌ ' + error.message);
    notify('✅ Đã xóa kết quả — học sinh có thể làm lại bài.');
    refreshResults();
  }
  async function testCancel(studentId, name) {
    if (!confirm(`HỦY kết quả của "${name}"?\n\nBài làm bị vô hiệu và học sinh KHÔNG thể làm lại.`)) return;
    const { error } = await sbClient.rpc('teacher_test_cancel', { p_assignment_id: currentResultsAssignment.id, p_student_id: studentId });
    if (error) return notify('❌ ' + error.message);
    notify('✅ Đã hủy kết quả làm bài.');
    refreshResults();
  }
  function actionBtns(ss, name) {
    if (!ss) return '';
    const nm = esc(name).replace(/'/g, '&#39;');
    const canRetake = !(ss.retakes >= 1);
    return `<div class="w-full flex flex-wrap items-center gap-2 pt-2 mt-1 border-t dark:border-zinc-700">
      <button ${canRetake ? `onclick="testReset('${ss.student_id}','${nm}')"` : 'disabled'} class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${canRetake ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 cursor-not-allowed'}" title="${canRetake ? 'Xóa kết quả để học sinh làm lại (1 lần)' : 'Đã cho làm lại 1 lần'}"><i class="bi bi-arrow-counterclockwise"></i> ${canRetake ? 'Xóa kết quả (cho làm lại)' : 'Đã cho làm lại 1 lần'}</button>
      ${ss.cancelled_at ? '' : `<button onclick="testCancel('${ss.student_id}','${nm}')" class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400" title="Vô hiệu bài làm, không cho làm lại"><i class="bi bi-slash-circle"></i> Hủy kết quả (không làm lại)</button>`}
    </div>`;
  }
  function renderLiveSummary() {
    const box = pel('rmLive'), a = currentResultsAssignment;
    if (!a || !a.is_test) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (sessionsError) {
      box.innerHTML = `<div class="text-xs rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-amber-800 dark:text-amber-300 p-3"><i class="bi bi-exclamation-triangle-fill"></i> Không tải được danh sách đang làm bài: ${esc(sessionsError)} (cần chạy file <b>teacher_test_sessions.sql</b> trong Supabase).</div>`;
      return;
    }
    const stuSet = f => new Set(currentSessions.filter(f).map(x => x.student_id)).size;   // đếm theo học sinh
    const doing = stuSet(x => !x.submitted_at);
    const done = stuSet(x => x.submitted_at && !x.cancelled_at);
    const canc = stuSet(x => x.cancelled_at);
    const warned = stuSet(x => (x.violations || 0) > 0);
    box.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl px-3 py-2">
        <span class="inline-flex items-center gap-1.5 font-bold text-blue-600"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Đang làm bài: ${doing}</span>
        <span class="inline-flex items-center gap-1 font-bold text-emerald-600"><i class="bi bi-check-circle-fill"></i> Đã nộp: ${done}</span>
        <span class="inline-flex items-center gap-1 font-bold text-amber-600"><i class="bi bi-exclamation-triangle-fill"></i> Có cảnh báo: ${warned}</span>
        ${canc ? `<span class="inline-flex items-center gap-1 font-bold text-red-600"><i class="bi bi-slash-circle"></i> Đã hủy: ${canc}</span>` : ''}
        <span class="ml-auto text-[10px] text-gray-400"><i class="bi bi-arrow-repeat"></i> Tự làm mới mỗi 5 giây</span>
      </div>`;
  }
  function scoreOf(r) { return Math.round(((r.auto_score || 0) + sumManualScores(r.manual_scores)) * 100) / 100; }
  // Mọi điểm hiển thị đều quy về THANG 10 (điểm đạt / tổng điểm bài × 10), bất kể bài có bao nhiêu câu hay tổng bao nhiêu điểm.
  function fmt10(score, total) { const t = Number(total) || 0; if (t <= 0) return '0'; const v = Math.round((Number(score) || 0) / t * 1000) / 100; return String(v); }

  function renderScoreDistribution() {
    const box = pel('rmDist');
    if (!currentAttemptsList.length) { box.classList.add('hidden'); return; }
    const total = currentAttemptsList[0]?.total_points || 1;
    const buckets = [0, 0, 0, 0, 0]; // 0-20% 20-40% 40-60% 60-80% 80-100%
    const bestList = bestAttempts();
    bestList.forEach(r => {
      const pct = total > 0 ? scoreOf(r) / total : 0;
      const idx = Math.min(4, Math.floor(pct * 5));
      buckets[idx]++;
    });
    const max = Math.max(...buckets, 1);
    const labels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl p-3 mb-1">
        <p class="text-[10px] font-bold uppercase text-gray-500 mb-2"><i class="bi bi-bar-chart-fill"></i> Phổ điểm (${bestList.length} học sinh${currentAttemptsList.length > bestList.length ? ' · lấy lần cao nhất, ' + currentAttemptsList.length + ' lượt nộp' : ''})</p>
        <div class="flex items-end gap-2 h-20">
          ${buckets.map((c, i) => `
            <div class="flex-1 flex flex-col items-center justify-end gap-1">
              <span class="text-[10px] font-bold text-gray-500">${c}</span>
              <div class="w-full bg-[#cf1717] rounded-t" style="height:${Math.max(4, (c / max) * 56)}px"></div>
              <span class="text-[9px] text-gray-400">${labels[i]}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function renderResultsList() {
    const search = (pel('rmSearchName').value || '').toLowerCase().trim();
    const sort = pel('rmSort').value;
    // Gộp bài đã nộp + phiên làm bài (đang làm / đã hủy) của bài thi
    const sessByAtt = {}; currentSessions.forEach(x => { if (x.attempt_id) sessByAtt[x.attempt_id] = x; });
    let list = currentAttemptsList.map(r => ({ r, s: sessByAtt[r.id] || null, name: r.profiles?.full_name || 'N/A' }));
    const attIds = new Set(currentAttemptsList.map(r => r.id));
    currentSessions.forEach(x => { if (!x.attempt_id || !attIds.has(x.attempt_id)) list.push({ r: null, s: x, name: x.full_name || 'N/A' }); });
    // Thông tin theo từng học sinh (nhiều lần làm): lần mới nhất giữ nút thao tác, lần cao nhất được đánh dấu
    const perStu = {}; currentSessions.forEach(x => { (perStu[x.student_id] = perStu[x.student_id] || []).push(x); });
    const latestSid = {}; Object.keys(perStu).forEach(k => { latestSid[k] = perStu[k].reduce((m, x) => !m || new Date(x.started_at) > new Date(m.started_at) ? x : m, null).session_id; });
    const bestOf = {}; currentAttemptsList.forEach(r => { const k = attemptStudentId(r); if (k && (!bestOf[k] || scoreOf(r) > scoreOf(bestOf[k]))) bestOf[k] = r; });
    const attTag = (ss, r) => {
      if (!ss) return '';
      const many = (perStu[ss.student_id] || []).length > 1;
      let h = many ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-[10px] font-bold text-gray-600 dark:text-gray-300">Lần ${ss.attempt_no}</span>` : '';
      if (many && r && bestOf[ss.student_id] === r) h += ' <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-[10px] font-bold text-amber-700 dark:text-amber-400"><i class="bi bi-trophy-fill"></i> cao nhất</span>';
      return h;
    };
    renderLiveSummary();
    const tKey = it => it.r ? new Date(it.r.submitted_at).getTime() : Date.now();   // đang làm bài = mới nhất
    list = list.filter(it => !search || it.name.toLowerCase().includes(search));
    list.sort((a, b) => {
      if (sort === 'earliest') return tKey(a) - tKey(b);
      if (sort === 'latest') return tKey(b) - tKey(a);
      if (sort === 'score_desc') return (b.r ? scoreOf(b.r) : -1) - (a.r ? scoreOf(a.r) : -1);
      if (sort === 'score_asc') return (a.r ? scoreOf(a.r) : Infinity) - (b.r ? scoreOf(b.r) : Infinity);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
    const fmtT = d => new Date(d).toLocaleString('vi-VN');
    const rowCls = 'flex items-center justify-between gap-2 flex-wrap bg-gray-50 dark:bg-zinc-800/60 border dark:border-zinc-700 rounded-xl px-3 py-2';
    pel('rmList').innerHTML = list.map(({ r, s: ss, name }) => {
      const warn = ss ? violBadge(ss.violations || 0) : '';
      const retook = ss && ss.retakes >= 1 ? '<span class="text-[10px] font-bold text-blue-500"><i class="bi bi-arrow-repeat"></i> đã làm lại</span>' : '';
      if (!r) {
        const inProg = !ss.submitted_at, cancelled = !!ss.cancelled_at;
        const badge = cancelled
          ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"><i class="bi bi-slash-circle"></i> Đã hủy kết quả</span>'
          : inProg
            ? '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Đang làm bài</span>'
            : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><i class="bi bi-check-circle-fill"></i> Đã nộp</span>';
        return `
      <div class="${rowCls}">
        <div>
          <p class="font-bold text-gray-900 dark:text-white">${esc(name)} ${attTag(ss, null)} ${retook}</p>
          <p class="text-[10px] text-gray-400">${inProg ? 'Bắt đầu lúc ' + fmtT(ss.started_at) : (cancelled ? 'Hủy lúc ' + fmtT(ss.cancelled_at) : 'Đã nộp lúc ' + fmtT(ss.submitted_at))}</p>
        </div>
        <div class="flex items-center gap-3">${warn}${badge}</div>
        ${latestSid[ss.student_id] === ss.session_id ? actionBtns(ss, name) : ''}
      </div>`;
      }
      const finalScore = scoreOf(r);
      return `
      <div class="${rowCls}">
        <div>
          <p class="font-bold text-gray-900 dark:text-white">${esc(name)} ${attTag(ss, r)} ${retook}</p>
          <p class="text-[10px] text-gray-400">${fmtT(r.submitted_at)} ${r.has_essay ? '· có câu tự luận cần chấm tay' : ''}</p>
        </div>
        <div class="flex items-center gap-3">
          ${warn}
          <button onclick="openGradeAttempt('${r.id}')" class="text-[11px] font-bold text-blue-500 hover:underline">${r.has_essay ? '<i class="bi bi-pencil-square"></i> Chấm tự luận' : '<i class="bi bi-eye"></i> Xem bài làm'}</button>
          <span class="font-extrabold text-[#cf1717]">${fmt10(finalScore, r.total_points)}/10</span>
        </div>
        ${ss && latestSid[ss.student_id] === ss.session_id ? actionBtns(ss, name) : ''}
      </div>`;
    }).join('') || '<p class="text-gray-400 italic">Không có học sinh nào khớp với bộ lọc.</p>';
  }
  function closeResultsModal() { clearInterval(resultsTimer); pel('resultsModal').classList.add('hidden'); pel('resultsModal').classList.remove('flex'); }

  // ---- Modal chấm bài chi tiết (xem từng câu + cho điểm câu tự luận) ----
  let currentGradingAttempt = null;

  function openGradeAttempt(attemptId) {
    const r = currentAttemptsList.find(x => x.id === attemptId); if (!r || !currentResultsAssignment) return;
    currentGradingAttempt = r;
    pel('gmStudentName').innerText = r.profiles?.full_name || 'N/A';
    const ses = sessionOfAttempt(r);
    pel('gmWarn').innerHTML = ses ? violBadge(ses.violations || 0) : '';
    let qNo = 0;
    const textBlock = q => `<div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 qeditor text-sm ${q.two_col ? 'qeditor-2col' : ''}">${q.content || ''}</div>`;
    const qCard = q => {
      qNo++;
      const given = r.answers ? r.answers[q.id] : null;
      let bodyHtml = '';
      if (q.type === 'mcq' || q.type === 'tf' || q.type === 'multi') {
        const givenArr = Array.isArray(given) ? given : (given ? [given] : []);
        bodyHtml = (q.options || []).map(o => `<div class="text-sm px-2.5 py-1.5 rounded-lg ${o.correct ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : (givenArr.includes(o.id) ? 'bg-red-50 dark:bg-red-950/40 text-red-600' : '')}">${givenArr.includes(o.id) ? '<i class="bi bi-arrow-right-circle-fill text-[#cf1717]"></i> ' : ''}${esc(o.text)}${o.correct ? ' <i class="bi bi-check-lg"></i>' : ''}</div>`).join('');
      } else if (q.type === 'fill') {
        if (q.blanks && q.blanks.length) {
          const givenObj = (given && typeof given === 'object') ? given : {};
          bodyHtml = q.blanks.map(bl => `<div class="text-sm">Chỗ trống ${bl.gap}: <b>${esc(givenObj[bl.gap] || '(bỏ trống)')}</b> <span class="text-gray-400">(chấp nhận: ${esc((bl.accepted_answers||[]).join(', '))})</span></div>`).join('');
        } else {
          bodyHtml = `<div class="text-sm">Trả lời: <b>${esc(given || '(bỏ trống)')}</b> <span class="text-gray-400">(chấp nhận: ${esc((q.accepted_answers||[]).join(', '))})</span></div>`;
        }
      } else if (q.type === 'essay') {
        const currentVal = (r.manual_scores && r.manual_scores[q.id] !== undefined) ? r.manual_scores[q.id] : '';
        const currentComment = (r.manual_comments && r.manual_comments[q.id]) || '';
        bodyHtml = `
          <div class="p-3 rounded-xl border dark:border-zinc-700 text-sm whitespace-pre-wrap bg-gray-50 dark:bg-zinc-800/60">${esc(given || '(bỏ trống)')}</div>
          <div class="flex items-center gap-2 mt-2">
            <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Điểm giáo viên chấm (tối đa ${q.points}):</label>
            <input type="number" min="0" max="${q.points}" step="0.25" value="${currentVal}" data-essay-score="${q.id}" oninput="updateGmTotal()" class="w-20 p-1.5 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
          </div>
          <div class="mt-2">
            <label class="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1"><i class="bi bi-pencil"></i> Nhận xét của giáo viên (học sinh sẽ thấy sau khi chấm)</label>
            <textarea rows="2" data-essay-comment="${q.id}" placeholder="VD: Bài viết tốt nhưng cần chú ý thì hiện tại..." class="w-full p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-sm">${esc(currentComment)}</textarea>
          </div>`;
      }
      return `
        <div class="border dark:border-zinc-700 rounded-2xl p-3 sm:p-4 space-y-2 bg-white dark:bg-zinc-900">
          <p class="text-xs font-extrabold text-[#cf1717]">Câu ${qNo} · ${q.points} điểm</p>
          <div class="qeditor text-sm" style="min-height:0">${q.content || ''}</div>
          <div class="space-y-1">${bodyHtml}</div>
        </div>`;
    };
    pel('gmList').innerHTML = (currentResultsAssignment.questions || []).map(q => {
      if (q.type === 'reading') {
        const a = qNo + 1;
        const subs = (q.sub_blocks || []).map(sb => sb.type === 'text' ? textBlock(sb) : qCard(sb)).join('');
        const b = qNo;
        const rng = b < a ? 'Câu hỏi' : (a === b ? `Câu ${a}` : `Câu ${a}–${b}`);
        return `<div class="gm-split">
          <div class="gm-pane"><div class="gm-head"><i class="bi bi-book"></i> Bài đọc (Reading)</div><div class="border dark:border-zinc-700 rounded-2xl p-4 bg-white dark:bg-zinc-900 qeditor text-sm">${q.content || ''}</div></div>
          <div class="gm-pane"><div class="gm-head"><i class="bi bi-list-check"></i> ${rng}</div>${subs}</div>
        </div>`;
      }
      return q.type === 'text' ? textBlock(q) : qCard(q);
    }).join('');
    updateGmTotal();
    pel('gradeModal').classList.remove('hidden'); pel('gradeModal').classList.add('flex');
  }
  function updateGmTotal() {
    if (!currentGradingAttempt || !currentResultsAssignment) return;
    let essaySum = 0;
    document.querySelectorAll('[data-essay-score]').forEach(inp => { essaySum += parseFloat(inp.value) || 0; });
    const total = Math.round(((currentGradingAttempt.auto_score || 0) + essaySum) * 100) / 100;
    pel('gmTotalPreview').innerText = `${fmt10(total, currentGradingAttempt.total_points)} / 10`;
  }
  async function saveGrade() {
    if (!currentGradingAttempt) return;
    const manual_scores = { ...(currentGradingAttempt.manual_scores || {}) };
    const manual_comments = { ...(currentGradingAttempt.manual_comments || {}) };
    document.querySelectorAll('[data-essay-score]').forEach(inp => {
      const qid = inp.getAttribute('data-essay-score');
      if (inp.value !== '') manual_scores[qid] = parseFloat(inp.value) || 0;
    });
    document.querySelectorAll('[data-essay-comment]').forEach(ta => {
      const qid = ta.getAttribute('data-essay-comment');
      manual_comments[qid] = ta.value.trim();
    });
    const { error } = await sbClient.from('assignment_attempts').update({ manual_scores, manual_comments }).eq('id', currentGradingAttempt.id);
    if (error) return notify('❌ Lỗi lưu điểm: ' + error.message);
    currentGradingAttempt.manual_scores = manual_scores;
    currentGradingAttempt.manual_comments = manual_comments;
    const idx = currentAttemptsList.findIndex(x => x.id === currentGradingAttempt.id);
    if (idx >= 0) { currentAttemptsList[idx].manual_scores = manual_scores; currentAttemptsList[idx].manual_comments = manual_comments; }
    notify('🎉 Đã lưu điểm & nhận xét!');
    renderResultsList();
    closeGradeModal();
  }
  function closeGradeModal() { pel('gradeModal').classList.add('hidden'); pel('gradeModal').classList.remove('flex'); currentGradingAttempt = null; }

  // =====================================================================
  // ĐIỂM DANH LỚP HỌC (P / L / E / A) + XUẤT EXCEL
  // Cần: bảng class_attendance + hàm get_class_student_emails (file 1_attendance.sql)
  //      thư viện ExcelJS (thẻ <script> ở <head>)
  // =====================================================================
  const ATT_STATUS = {
    P: { name: 'Present — Có mặt',          argb: 'FFC8E6C9', font: 'FF1B5E20' },
    L: { name: 'Late — Muộn',               argb: 'FFFFF3B0', font: 'FF7A5B00' },
    E: { name: 'Excused — Nghỉ có phép',    argb: 'FFBBDEFB', font: 'FF0D47A1' },
    A: { name: 'Absent — Nghỉ không phép',  argb: 'FFFFCDD2', font: 'FFB71C1C' },
  };
  let attClass = null;
  let attStudents = [];   // [{ student_id, full_name, email }]
  let attSessions = [];   // [{ id, session_date, session_time, subject_name, status }]
  let attLocked = new Set(); // session_id đã chốt: sau khi chốt chỉ teacher/admin được sửa
  let attMap = {};        // { 'sessionId|studentId': 'P' | 'L' | 'E' | 'A' }

  // Quyền sửa ô điểm danh:
  //  - teacher/admin: sửa được MỌI buổi, kể cả buổi đã chốt và các ngày đã qua (sửa bù).
  //  - assistant: chỉ sửa được buổi CHƯA chốt (giữ nguyên như cũ).
  function attCanEdit(sessionId) { return isOwnerRole() || !attLocked.has(sessionId); }
  function attKey(sessionId, studentId) { return sessionId + '|' + studentId; }
  function attDateShort(d) { const p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : '--'; }
  function attDateFull(d)  { const p = String(d || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; }

  // Supabase mặc định trả tối đa 1000 dòng/lần → lấy theo từng trang cho đủ
  async function attFetchAll(buildQuery) {
    const size = 1000; let from = 0, all = [];
    while (true) {
      const { data, error } = await buildQuery().range(from, from + size - 1);
      if (error) throw error;
      all = all.concat(data || []);
      if (!data || data.length < size) break;
      from += size;
    }
    return all;
  }

  function openAttendanceModal(classId) {
    const c = myClasses.find(x => x.id === classId); if (!c) return;
    attClass = c; CF.att.f = {}; CF.att.sort = null;
    pel('attClassTitle').innerText = c.class_code + ' — ' + c.title;
    pel('attendanceModal').classList.remove('hidden'); pel('attendanceModal').classList.add('flex');
    loadAttendance();
  }
  function closeAttendanceModal() {
    pel('attendanceModal').classList.add('hidden'); pel('attendanceModal').classList.remove('flex');
    attClass = null; attStudents = []; attSessions = []; attMap = {}; attLocked = new Set();
  }

  async function loadAttendance() {
    if (!attClass) return;
    const myId = attClass.id;
    const cacheKey = 'att:' + myId;
    const cached = cacheGet(cacheKey);
    if (cached) {
      attStudents = cached.students || []; attSessions = cached.sessions || [];
      attMap = cached.map || {}; attLocked = new Set(cached.locked || []);
      renderAttendance();
    } else {
      pel('attTableWrap').innerHTML = '<p class="text-xs text-gray-400 italic p-4">Đang tải...</p>';
    }
    try {
      const [stuRes, sesRes, attRows, lockRes] = await Promise.all([
        sbClient.rpc('get_class_student_emails', { p_class_id: myId }),
        sbClient.from('class_schedule_sessions').select('id, session_date, session_time, subject_name, status')
          .eq('class_id', myId).order('session_date', { ascending: true }).order('session_time', { ascending: true }),
        attFetchAll(() => sbClient.from('class_attendance').select('session_id, student_id, status').eq('class_id', myId).order('id')),
        sbClient.from('class_attendance_locks').select('session_id').eq('class_id', myId),
      ]);
      if (stuRes.error) throw stuRes.error;
      if (sesRes.error) throw sesRes.error;
      if (!attClass || attClass.id !== myId) return; // đã đóng / đổi lớp trong lúc tải

      // Sắp xếp học sinh theo TÊN (từ cuối của họ tên) rồi tới họ tên đầy đủ — thứ tự chuẩn tiếng Việt
      const lastWord = s => (String(s || '').trim().split(/\s+/).pop() || '');
      attStudents = (stuRes.data || []).slice().sort((a, b) =>
        lastWord(a.full_name).localeCompare(lastWord(b.full_name), 'vi') ||
        (a.full_name || '').localeCompare(b.full_name || '', 'vi'));
      attSessions = sesRes.data || [];
      attMap = {};
      attRows.forEach(r => { attMap[attKey(r.session_id, r.student_id)] = r.status; });
      if (lockRes && lockRes.error) console.warn('Không tải được trạng thái chốt:', lockRes.error);
      attLocked = new Set(((lockRes && !lockRes.error && lockRes.data) || []).map(r => r.session_id));
      cacheSet(cacheKey, { students: attStudents, sessions: attSessions, map: attMap, locked: [...attLocked] });
      renderAttendance();
    } catch (err) {
      if (!cached) {
        pel('attTableWrap').innerHTML = `<p class="text-red-500 text-xs p-4">Lỗi tải điểm danh: ${esc(err.message || err)}<br>
          <span class="text-gray-400">Bạn đã chạy file <b>1_attendance.sql</b> trong Supabase chưa?</span></p>`;
      } else {
        console.warn('Làm mới điểm danh thất bại, đang dùng bản đã lưu:', err);
      }
    }
  }

  function attCounts(studentId) {
    const c = { P: 0, L: 0, E: 0, A: 0 };
    attSessions.forEach(s => { const v = attMap[attKey(s.id, studentId)]; if (v && c[v] !== undefined) c[v]++; });
    return c;
  }

  function renderAttendance() {
    const wrap = pel('attTableWrap');
    if (!attStudents.length) { wrap.innerHTML = '<p class="text-xs text-gray-400 italic p-4">Lớp chưa có học sinh nào.</p>'; return; }
    if (!attSessions.length) { wrap.innerHTML = '<p class="text-xs text-gray-400 italic p-4">Lớp chưa có buổi học nào. Hãy thêm lịch học trước (nút <i class="bi bi-calendar-event"></i> Lịch học) rồi quay lại điểm danh.</p>'; return; }

    const sl = wrap.scrollLeft, st = wrap.scrollTop;
    const head = attSessions.map(s => {
      const susp = s.status === 'suspended';
      const locked = attLocked.has(s.id);
      const bs = 'font-size:11px;background:rgba(255,255,255,.2);border-radius:6px;padding:0 6px;margin-top:2px';
      let tools = '';
      if (!susp) {
        if (attCanEdit(s.id)) tools += `<button type="button" onclick="markAllPresent('${s.id}')" title="Đánh dấu P cho các bạn chưa điểm danh" style="${bs}">✔</button>`;
        if (!locked) tools += ` <button type="button" onclick="toggleAttendanceLock('${s.id}')" title="Chốt điểm danh buổi này — học sinh sẽ thấy trạng thái, sau đó chỉ teacher mới sửa được" style="${bs}"><i class="bi bi-unlock-fill"></i></button>`;
        else if (isOwnerRole()) tools += ` <button type="button" onclick="toggleAttendanceLock('${s.id}')" title="Đã chốt — bấm để mở chốt (chỉ teacher)" style="${bs}"><i class="bi bi-lock-fill"></i></button>`;
        else tools += ` <span title="Đã chốt — chỉ giáo viên (teacher) mới sửa được" style="${bs};display:inline-block"><i class="bi bi-lock-fill"></i></span>`;
      }
      return `<th title="${esc(s.subject_name || '')}${susp ? ' (Đã tạm ngưng)' : ''}${locked ? ' (Đã chốt)' : ''}" style="min-width:78px">
        <div>${attDateShort(s.session_date)}${cfBtn('att', 's_' + s.id, 'enum', ATT_OPTS)}</div>
        <div style="font-size:10px;font-weight:600;opacity:.85">${esc(s.session_time || '')}${susp ? ' <i class="bi bi-circle-fill" style="color:#dc2626"></i>' : ''}</div>
        ${tools}
      </th>`;
    }).join('');

    const shown = cfRun('att', attStudents, attGet);
    const rows = shown.map((stu, i) => {
      const cells = attSessions.map(s => {
        const v = attMap[attKey(s.id, stu.student_id)] || '';
        return `<td style="text-align:center"><select class="att-sel att-${v || 'none'}" data-sid="${s.id}" data-stu="${stu.student_id}" ${(s.status === 'suspended' || !attCanEdit(s.id)) ? 'disabled' : ''} onchange="setAttendance(this)">
          ${['', 'P', 'L', 'E', 'A'].map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${o || '·'}</option>`).join('')}
        </select></td>`;
      }).join('');
      const c = attCounts(stu.student_id);
      const sum = ['P', 'L', 'E', 'A'].map(k =>
        `<td id="attsum-${stu.student_id}-${k}" class="att-${k}" style="text-align:center;font-weight:800">${c[k]}</td>`).join('');
      return `<tr>
        <td class="att-sticky1">${i + 1}</td>
        <td class="att-sticky2">${esc(stu.full_name || '(chưa có tên)')}</td>
        <td>${esc(stu.email || '—')}</td>
        ${cells}${sum}
      </tr>`;
    }).join('');

    wrap.innerHTML = `<table id="attTable">
      <thead><tr>
        <th class="att-sticky1">STT</th><th class="att-sticky2">Họ và tên${cfBtn('att', 'name', 'text')}</th><th style="min-width:200px">Email${cfBtn('att', 'email', 'text')}</th>
        ${head}
        <th class="att-P" style="color:#1B5E20">P${cfBtn('att', 'cP', 'num')}</th><th class="att-L" style="color:#7A5B00">L${cfBtn('att', 'cL', 'num')}</th>
        <th class="att-E" style="color:#0D47A1">E${cfBtn('att', 'cE', 'num')}</th><th class="att-A" style="color:#B71C1C">A${cfBtn('att', 'cA', 'num')}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="${3 + attSessions.length + 4}" class="text-gray-400 italic">Không có học sinh nào khớp bộ lọc.</td></tr>`}</tbody></table>`;
    wrap.scrollLeft = sl; wrap.scrollTop = st;
  }

  function attUpdateSummary(studentId) {
    const c = attCounts(studentId);
    ['P', 'L', 'E', 'A'].forEach(k => { const el = pel(`attsum-${studentId}-${k}`); if (el) el.textContent = c[k]; });
  }

  // Lưu 1 ô điểm danh (chọn '·' = xóa)
  async function setAttendance(sel) {
    if (!attClass) return;
    const sid = sel.dataset.sid, stu = sel.dataset.stu, v = sel.value, key = attKey(sid, stu);
    const old = attMap[key] || '';
    if (!attCanEdit(sid)) { sel.value = old; sel.className = 'att-sel att-' + (old || 'none'); return notify('🔒 Buổi này đã chốt — chỉ giáo viên (teacher) mới sửa được.'); }
    sel.className = 'att-sel att-' + (v || 'none');
    sel.disabled = true;
    let error;
    if (!v) {
      ({ error } = await sbClient.from('class_attendance').delete().eq('session_id', sid).eq('student_id', stu));
    } else {
      ({ error } = await sbClient.from('class_attendance').upsert({
        class_id: attClass.id, session_id: sid, student_id: stu, status: v,
        marked_by: currentUser.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,student_id' }));
    }
    sel.disabled = false;
    if (error) { sel.value = old; sel.className = 'att-sel att-' + (old || 'none'); return notify('❌ Lỗi lưu điểm danh: ' + error.message); }
    if (v) attMap[key] = v; else delete attMap[key];
    attUpdateSummary(stu);
    attSyncCache();
  }

  // Chốt / mở chốt điểm danh 1 buổi. Chốt: cả teacher lẫn assistant làm được; mở chốt: chỉ teacher.
  async function toggleAttendanceLock(sessionId) {
    if (!attClass) return;
    const s = attSessions.find(x => x.id === sessionId); if (!s) return;
    const wasLocked = attLocked.has(sessionId);
    if (wasLocked && !isOwnerRole()) return notify('⚠️ Chỉ giáo viên (teacher) mới mở chốt được.');
    if (!wasLocked) {
      const missing = attStudents.filter(st => !attMap[attKey(sessionId, st.student_id)]).length;
      const msg = `Chốt điểm danh ngày ${attDateFull(s.session_date)}?` + (missing ? `\n<i class="bi bi-exclamation-triangle-fill"></i> Còn ${missing} học sinh chưa được điểm danh.` : '') +
        '\nSau khi chốt, học sinh sẽ thấy trạng thái điểm danh và chỉ giáo viên (teacher) mới sửa được.';
      if (!confirm(msg)) return;
    } else if (!confirm(`Mở chốt điểm danh ngày ${attDateFull(s.session_date)}? Học sinh sẽ không thấy trạng thái cho tới khi chốt lại.`)) return;

    let error;
    if (wasLocked) {
      const res = await sbClient.from('class_attendance_locks').delete().eq('session_id', sessionId).select('session_id');
      error = res.error;
      if (!error && !(res.data || []).length) error = { message: 'không xóa được dòng chốt (thiếu quyền RLS hoặc đã được mở trước đó).' };
    } else {
      ({ error } = await sbClient.from('class_attendance_locks').insert([{ class_id: attClass.id, session_id: sessionId }]));
      if (error && error.code === '23505') error = null; // đã chốt từ trước
    }
    if (error) return notify('❌ Lỗi chốt điểm danh: ' + error.message);
    if (wasLocked) attLocked.delete(sessionId); else attLocked.add(sessionId);
    attSyncCache();
    renderAttendance();
    cacheDel('acal:' + currentUser.id); loadAssistantScheduleCalendar();
    notify(wasLocked ? '🔓 Đã mở chốt điểm danh.' : '🔒 Đã chốt điểm danh — học sinh sẽ thấy trạng thái.');
  }

  // Đánh dấu P cho tất cả học sinh CHƯA điểm danh trong 1 buổi
  async function markAllPresent(sessionId) {
    if (!attClass) return;
    const s = attSessions.find(x => x.id === sessionId); if (!s) return;
    if (!attCanEdit(sessionId)) return notify('🔒 Buổi này đã chốt — chỉ giáo viên (teacher) mới sửa được.');
    const rows = attStudents.filter(st => !attMap[attKey(sessionId, st.student_id)]).map(st => ({
      class_id: attClass.id, session_id: sessionId, student_id: st.student_id, status: 'P', marked_by: currentUser.id,
    }));
    if (!rows.length) return notify('ℹ️ Buổi ' + attDateShort(s.session_date) + ' đã điểm danh đủ.');
    if (!confirm(`Đánh dấu P (có mặt) cho ${rows.length} học sinh chưa điểm danh ngày ${attDateFull(s.session_date)}?`)) return;
    const { error } = await sbClient.from('class_attendance').upsert(rows, { onConflict: 'session_id,student_id' });
    if (error) return notify('❌ Lỗi lưu điểm danh: ' + error.message);
    rows.forEach(r => { attMap[attKey(r.session_id, r.student_id)] = 'P'; });
    attSyncCache();
    renderAttendance();
    notify('✅ Đã đánh dấu P cho ' + rows.length + ' học sinh.');
  }

  // Xuất Excel có màu pastel cho từng ô (dùng ExcelJS — SheetJS bản free không tô màu được)
  async function exportAttendanceExcel() {
    if (!attClass) return;
    try { await RUAssets.load('exceljs'); } catch(e) { return notify('❌ Chưa tải được thư viện ExcelJS.'); }
    if (!attStudents.length) return notify('⚠️ Lớp chưa có học sinh.');
    if (!attSessions.length) return notify('⚠️ Lớp chưa có buổi học nào.');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Điểm danh', { views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }] });
    const fixedCols = 3, totalCols = fixedCols + attSessions.length + 4;
    const thin = { style: 'thin', color: { argb: 'FFBDBDBD' } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Dòng 1–2: tiêu đề
    ws.mergeCells(1, 1, 1, totalCols);
    Object.assign(ws.getCell(1, 1), { value: `BẢNG ĐIỂM DANH LỚP ${attClass.class_code} — ${attClass.title}` });
    ws.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FFCF1717' } };
    ws.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;
    ws.mergeCells(2, 1, 2, totalCols);
    ws.getCell(2, 1).value = `ReadUp English · Sĩ số: ${attStudents.length} học sinh · Xuất ngày ${todayStr}`;
    ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF757575' } };
    ws.getCell(2, 1).alignment = { horizontal: 'center' };

    // Dòng 4: tiêu đề cột
    const headers = ['STT', 'Họ và tên', 'Email',
      ...attSessions.map(s => `${attDateFull(s.session_date)}\n${s.session_time || ''}${s.status === 'suspended' ? '\n(Tạm ngưng)' : ''}`),
      'P', 'L', 'E', 'A'];
    const hr = ws.getRow(4);
    headers.forEach((h, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = fill('FFCF1717');
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = border;
    });
    hr.height = 46;

    // Dữ liệu
    attStudents.forEach((stu, idx) => {
      const r = ws.getRow(5 + idx);
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = stu.full_name || '';
      r.getCell(3).value = stu.email || '';
      attSessions.forEach((s, j) => {
        const cell = r.getCell(fixedCols + 1 + j);
        const v = attMap[attKey(s.id, stu.student_id)];
        if (v && ATT_STATUS[v]) {
          cell.value = v;
          cell.fill = fill(ATT_STATUS[v].argb);
          cell.font = { bold: true, color: { argb: ATT_STATUS[v].font } };
        } else if (s.status === 'suspended') {
          cell.fill = fill('FFEEEEEE');
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      const c = attCounts(stu.student_id);
      ['P', 'L', 'E', 'A'].forEach((k, j) => {
        const cell = r.getCell(fixedCols + attSessions.length + 1 + j);
        cell.value = c[k];
        cell.fill = fill(ATT_STATUS[k].argb);
        cell.font = { bold: true, color: { argb: ATT_STATUS[k].font } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      for (let col = 1; col <= totalCols; col++) r.getCell(col).border = border;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { vertical: 'middle' };
      r.getCell(3).alignment = { vertical: 'middle' };
      r.height = 22;
    });

    // Chú thích màu ở cuối bảng
    const legendStart = 5 + attStudents.length + 1;
    ws.getCell(legendStart, 2).value = 'Chú thích';
    ws.getCell(legendStart, 2).font = { bold: true };
    ['P', 'L', 'E', 'A'].forEach((k, i) => {
      const a = ws.getCell(legendStart + 1 + i, 1);
      a.value = k; a.fill = fill(ATT_STATUS[k].argb);
      a.font = { bold: true, color: { argb: ATT_STATUS[k].font } };
      a.alignment = { horizontal: 'center' }; a.border = border;
      ws.getCell(legendStart + 1 + i, 2).value = ATT_STATUS[k].name;
    });

    // Độ rộng cột
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 34;
    attSessions.forEach((_, j) => { ws.getColumn(fixedCols + 1 + j).width = 12; });
    for (let j = 0; j < 4; j++) ws.getColumn(fixedCols + attSessions.length + 1 + j).width = 6;

    try {
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      a.href = url; a.download = `DiemDanh_${slugify(attClass.class_code)}_${ymd}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify('📥 Đã xuất file Excel điểm danh!');
    } catch (err) {
      notify('❌ Lỗi xuất Excel: ' + (err.message || err));
    }
  }

  // =====================================================================
  // QUẢN LÝ ĐIỂM: chuyên cần | Assignment | Test | ĐQT | ĐCK | Tổng kết | Xếp loại | Đạt
  // Cách tính lưu ở bảng class_grade_config (file 2_grades.sql); chưa có bảng thì tạm lưu trong trình duyệt.
  // =====================================================================
  // ---- Bộ lọc cột dùng chung (bảng điểm 'gb' + bảng điểm danh 'att') ----
  const ATT_OPTS = [['P', 'P'], ['L', 'L'], ['E', 'E'], ['A', 'A'], ['', 'Chưa điểm danh']];
  const CF = { gb: { f: {}, sort: null, cols: {}, re: () => renderGradebook() }, att: { f: {}, sort: null, cols: {}, re: () => renderAttendance() } };
  const cfNorm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const cfHas = v => v !== undefined && v !== '';
  function cfOn(sc, k) {
    const f = CF[sc].f[k], s = CF[sc].sort;
    return !!((f && ((f.t || '') !== '' || cfHas(f.min) || cfHas(f.max) || (f.v && f.v.length))) || (s && s.k === k));
  }
  function cfBtn(sc, k, type, opts) {
    CF[sc].cols[k] = { type, opts: opts || [] };
    const on = cfOn(sc, k);
    return `<button type="button" onclick="event.stopPropagation();cfOpen('${sc}','${k}',this)" class="cf-btn${on ? ' on' : ''}" title="Lọc / sắp xếp cột"><i class="bi bi-funnel${on ? '-fill' : ''}"></i></button>`;
  }
  function cfClose() { const p = document.getElementById('cfPop'); if (p) p.remove(); }
  function cfOpen(sc, k, btn) {
    const old = document.getElementById('cfPop'); const same = old && old.dataset.k === sc + k; cfClose(); if (same) return;
    const c = CF[sc].cols[k]; if (!c) return;
    const f = CF[sc].f[k] || {}, s = CF[sc].sort, pop = document.createElement('div');
    pop.id = 'cfPop'; pop.dataset.k = sc + k;
    let h = '';
    if (c.type === 'text') h += `<input type="text" placeholder="Tìm trong cột..." value="${esc(f.t || '')}" oninput="cfSet('${sc}','${k}',{t:this.value})">`;
    else if (c.type === 'num') h += `<div class="cf-row"><input type="number" step="any" placeholder="Từ" value="${f.min == null ? '' : f.min}" oninput="cfSet('${sc}','${k}',{min:this.value})"><input type="number" step="any" placeholder="Đến" value="${f.max == null ? '' : f.max}" oninput="cfSet('${sc}','${k}',{max:this.value})"></div>`;
    else h += c.opts.map(o => `<label><input type="checkbox" value="${esc(o[0])}" ${(f.v || []).includes(o[0]) ? 'checked' : ''} onchange="cfEnum('${sc}','${k}')"> ${esc(o[1])}</label>`).join('');
    h += `<div class="cf-row"><button type="button" class="cf-act ${s && s.k === k && s.dir === 'asc' ? 'on' : ''}" onclick="cfSort('${sc}','${k}','asc')"><i class="bi bi-sort-up"></i> Tăng</button><button type="button" class="cf-act ${s && s.k === k && s.dir === 'desc' ? 'on' : ''}" onclick="cfSort('${sc}','${k}','desc')"><i class="bi bi-sort-down"></i> Giảm</button></div>`;
    h += `<button type="button" class="cf-act" onclick="cfClear('${sc}','${k}')"><i class="bi bi-x-circle"></i> Xóa lọc</button>`;
    pop.innerHTML = h; document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.left = Math.max(6, Math.min(r.left, window.innerWidth - 232)) + 'px';
    pop.style.top = Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 6) + 'px';
    const i = pop.querySelector('input[type=text],input[type=number]'); if (i) i.focus();
  }
  document.addEventListener('mousedown', e => { const p = document.getElementById('cfPop'); if (p && !p.contains(e.target) && !e.target.closest('.cf-btn')) cfClose(); });
  function cfSet(sc, k, patch) { CF[sc].f[k] = Object.assign({}, CF[sc].f[k] || {}, patch); CF[sc].re(); }
  function cfEnum(sc, k) { const v = [...document.querySelectorAll('#cfPop input[type=checkbox]:checked')].map(x => x.value); cfSet(sc, k, { v }); }
  function cfSort(sc, k, dir) {
    const s = CF[sc].sort; CF[sc].sort = (s && s.k === k && s.dir === dir) ? null : { k, dir };
    CF[sc].re(); const b = document.querySelector(`#cfPop`); if (b) { const keep = b.dataset.k; cfClose(); const btn = [...document.querySelectorAll('.cf-btn')].find(x => x.getAttribute('onclick').includes(`'${sc}','${k}'`)); if (btn) { cfOpen(sc, k, btn); } }
  }
  function cfClear(sc, k) { delete CF[sc].f[k]; if (CF[sc].sort && CF[sc].sort.k === k) CF[sc].sort = null; cfClose(); CF[sc].re(); }
  function cfRun(sc, rows, get) {
    const F = CF[sc].f, S = CF[sc].sort, C = CF[sc].cols;
    let out = rows.filter(r => Object.keys(F).every(k => {
      const f = F[k], c = C[k]; if (!c) return true; const v = get(r, k);
      if (c.type === 'text') return !f.t || cfNorm(v).includes(cfNorm(f.t));
      if (c.type === 'num') { if (!cfHas(f.min) && !cfHas(f.max)) return true; if (v == null) return false; return (!cfHas(f.min) || +v >= +f.min) && (!cfHas(f.max) || +v <= +f.max); }
      return !f.v || !f.v.length || f.v.includes(String(v == null ? '' : v));
    }));
    if (S && C[S.k]) {
      const d = S.dir === 'asc' ? 1 : -1, num = C[S.k].type === 'num', lw = s => (String(s || '').trim().split(/\s+/).pop() || '');
      out = out.slice().sort((a, b) => {
        const x = get(a, S.k), y = get(b, S.k);
        if (num) { if (x == null) return 1; if (y == null) return -1; return (x - y) * d; }
        if (S.k === 'name') return (lw(x).localeCompare(lw(y), 'vi') || String(x).localeCompare(String(y), 'vi')) * d;
        return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'vi') * d;
      });
    }
    return out;
  }
  const gbPctLabel = () => (gbCfg.attPct > 0 ? 'ĐD ' + gbCfg.attPct + '% · ' : '') + 'QT ' + gbCfg.qtPct + '% · CK ' + gbCfg.ckPct + '%';
  const gbGet = (r, k) => k === 'name' ? (r.stu.full_name || '') : k === 'pres' ? r.pres : k === 'att' ? r.att10 : k === 'qt' ? r.qt : k === 'ck' ? r.ck : k === 'fin' ? r.fin
    : k === 'rank' ? (r.rank ? r.rank.t : '—') : k === 'pass' ? (r.fin == null ? 'Chưa có' : r.fin >= 7 ? 'Đạt' : 'Không đạt')
    : (v => v === undefined ? null : v)(r.sc(k.slice(3)));
  const attGet = (stu, k) => k === 'name' ? (stu.full_name || '') : k === 'email' ? (stu.email || '') : k.startsWith('s_') ? (attMap[attKey(k.slice(2), stu.student_id)] || '') : attCounts(stu.student_id)[k[1]];

  // ---- Biểu đồ dưới bảng điểm ----
  let gbCharts = [];
  function renderGbCharts(rows) {
    const box = pel('gradeCharts');
    gbCharts.forEach(c => c.destroy()); gbCharts = [];
    if (typeof Chart === 'undefined' || !rows.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#d4d4d8' : '#4b5563';
    const names = ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Kém'], colors = ['#16a34a', '#65a30d', '#2563eb', '#eab308', '#f97316', '#dc2626'];
    const opt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    gbCharts.push(new Chart(pel('gbChartRank'), { type: 'bar', data: { labels: names, datasets: [{ label: 'Số học sinh', data: names.map(n => rows.filter(r => r.rank && r.rank.t === n).length), backgroundColor: colors }] }, options: { ...opt, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }));
    const av = k => { const a = rows.map(r => r[k]).filter(v => v != null); return a.length ? Math.round(gAvg(a) * 100) / 100 : null; };
    gbCharts.push(new Chart(pel('gbChartAvg'), { type: 'bar', data: { labels: ['Điểm danh', 'ĐQT', 'ĐCK', 'Tổng kết'], datasets: [{ label: 'Điểm TB (thang 10)', data: [av('att10'), av('qt'), av('ck'), av('fin')], backgroundColor: ['#0d9488', '#0284c7', '#7c3aed', '#cf1717'] }] }, options: { ...opt, scales: { y: { beginAtZero: true, max: 10 } } } }));
  }

  const GRADE_DEFAULT_CFG = { qtMode: 'all', qtIds: [], ckMode: 'all', ckIds: [], attPct: 0, qtPct: 40, ckPct: 60, missingZero: true, attInQt: false };
  let gbClassId = '', gbData = null, gbCfg = { ...GRADE_DEFAULT_CFG }, gbRows = [];

  function gradeRank(s) {
    if (s == null) return null;
    if (s >= 9) return { t: 'Xuất sắc', c: 'g-rank-xs' };
    if (s >= 8) return { t: 'Giỏi', c: 'g-rank-g' };
    if (s >= 7) return { t: 'Khá', c: 'g-rank-k' };
    if (s >= 5) return { t: 'Trung bình', c: 'g-rank-tb' };
    if (s >= 4) return { t: 'Yếu', c: 'g-rank-y' };
    return { t: 'Kém', c: 'g-rank-km' };
  }
  const gFmt = v => v == null ? '—' : String(Math.round(v * 100) / 100).replace('.', ',');
  const gAvg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  async function loadGradeCfg(classId) {
    let cfg = null;
    try {
      const { data, error } = await sbClient.from('class_grade_config').select('config').eq('class_id', classId).maybeSingle();
      if (!error && data && data.config) cfg = data.config;
    } catch (e) { /* chưa có bảng → dùng bản lưu trong trình duyệt */ }
    if (!cfg) { try { cfg = JSON.parse(localStorage.getItem('gradecfg:' + classId) || 'null'); } catch (e) {} }
    return { ...GRADE_DEFAULT_CFG, ...(cfg || {}) };
  }

  async function loadGradebook(force) {
    const cid = pel('gradeClassFilter').value;
    if (gbClassId !== cid) { CF.gb.f = {}; CF.gb.sort = null; }
    gbClassId = cid;
    ['btnGradeCfg', 'btnGradeReload', 'btnGradeExport'].forEach(id => pel(id).disabled = !cid);
    pel('btnGradeCfg').classList.toggle('hidden', !isOwnerRole());
    const wrap = pel('gradeTableWrap');
    if (!cid) { gbData = null; pel('gradeCharts').classList.add('hidden'); wrap.innerHTML = '<p class="text-gray-400 text-sm p-4"><i class="bi bi-arrow-up-circle"></i> Hãy chọn một lớp ở trên để xem bảng điểm.</p>'; pel('gradeSummaryLine').textContent = ''; return; }
    wrap.innerHTML = '<p class="text-xs text-gray-400 italic p-4"><i class="bi bi-hourglass-split"></i> Đang tải bảng điểm...</p>';
    try {
      const [stuRes, sesRes, attRows, asRes, cfg] = await Promise.all([
        sbClient.rpc('get_class_student_emails', { p_class_id: cid }),
        sbClient.from('class_schedule_sessions').select('id, session_date, status').eq('class_id', cid),
        attFetchAll(() => sbClient.from('class_attendance').select('session_id, student_id, status').eq('class_id', cid).order('id')),
        sbClient.from('assignments').select('id, title, is_test, total_points, created_at').eq('class_id', cid).order('created_at', { ascending: true }),
        loadGradeCfg(cid),
      ]);
      if (stuRes.error) throw stuRes.error; if (sesRes.error) throw sesRes.error; if (asRes.error) throw asRes.error;
      if (gbClassId !== cid) return;
      const assigns = asRes.data || [];
      let attempts = [];
      if (assigns.length) {
        const ids = assigns.map(a => a.id);
        attempts = await attFetchAll(() => sbClient.from('assignment_attempts').select('*').in('assignment_id', ids).order('id'));
      }
      if (gbClassId !== cid) return;
      const lastWord = s => (String(s || '').trim().split(/\s+/).pop() || '');
      const students = (stuRes.data || []).slice().sort((a, b) => lastWord(a.full_name).localeCompare(lastWord(b.full_name), 'vi') || (a.full_name || '').localeCompare(b.full_name || '', 'vi'));
      gbData = { students, sessions: sesRes.data || [], attRows, assigns, attempts };
      gbCfg = cfg;
      renderGradebook();
    } catch (err) {
      wrap.innerHTML = `<p class="text-red-500 text-xs p-4">Lỗi tải bảng điểm: ${esc(err.message || err)}</p>`;
    }
  }

  // Tính toàn bộ bảng điểm từ gbData + gbCfg
  function computeGradebook() {
    const { students, sessions, attRows, assigns, attempts } = gbData;
    const today = acalTodayStr();
    const heldIds = new Set(sessions.filter(s => s.status !== 'suspended' && String(s.session_date).slice(0, 10) <= today).map(s => s.id));
    const totalDays = heldIds.size;
    const presentOf = {};
    attRows.forEach(r => { if (heldIds.has(r.session_id) && (r.status === 'P' || r.status === 'L')) presentOf[r.student_id] = (presentOf[r.student_id] || 0) + 1; });

    const asList = assigns.filter(a => !a.is_test), testList = assigns.filter(a => a.is_test);
    const qtIds = new Set(gbCfg.qtMode === 'pick' ? gbCfg.qtIds : asList.map(a => a.id));
    const ckIds = new Set(gbCfg.ckMode === 'pick' ? gbCfg.ckIds : testList.map(a => a.id));

    // điểm tốt nhất của từng học sinh cho từng bài (thang 10)
    const best = {};
    const totalOf = Object.fromEntries(assigns.map(a => [a.id, a.total_points]));
    attempts.forEach(r => {
      const sid = attemptStudentId(r); if (!sid) return;
      const tp = r.total_points || totalOf[r.assignment_id] || 0; if (!tp) return;
      const v = Math.min(10, scoreOf(r) / tp * 10);
      const k = r.assignment_id + '|' + sid;
      if (best[k] === undefined || v > best[k]) best[k] = v;
    });

    const rows = students.map(stu => {
      const sid = stu.student_id;
      const pres = presentOf[sid] || 0;
      const att10 = totalDays ? pres / totalDays * 10 : null;
      const sc = id => best[id + '|' + sid];
      const pool = (list, ids) => {
        const arr = [];
        list.forEach(a => { if (!ids.has(a.id)) return; const v = sc(a.id); if (v !== undefined) arr.push(v); else if (gbCfg.missingZero) arr.push(0); });
        return arr;
      };
      const qtArr = pool(asList, qtIds);
      const aw = gbCfg.attPct || 0;
      if (gbCfg.attInQt && !aw && att10 != null) qtArr.push(att10);
      const qt = gAvg(qtArr), ck = gAvg(pool(testList, ckIds));
      const fin = (qt != null && ck != null && (!aw || att10 != null)) ? ((aw ? att10 * aw : 0) + qt * gbCfg.qtPct + ck * gbCfg.ckPct) / 100 : null;
      const finR = fin == null ? null : Math.round(fin * 100) / 100;
      return { stu, pres, totalDays, att10, sc, qt, ck, fin: finR, rank: gradeRank(finR) };
    });
    return { rows, asList, testList, qtIds, ckIds, totalDays };
  }

  function renderGradebook() {
    if (!gbData) return;
    const wrap = pel('gradeTableWrap');
    if (!gbData.students.length) { pel('gradeCharts').classList.add('hidden'); wrap.innerHTML = '<p class="text-xs text-gray-400 italic p-4">Lớp chưa có học sinh nào.</p>'; return; }
    const g = computeGradebook(); gbRows = g;
    const sl = wrap.scrollLeft, st = wrap.scrollTop;
    const th = (cls, txt, extra = '') => `<th class="${cls}" ${extra}>${txt}</th>`;
    const hd = (txt, key, type, opts) => `<div style="display:flex;align-items:center;justify-content:center;gap:2px"><span style="overflow:hidden;text-overflow:ellipsis">${txt}</span>${cfBtn('gb', key, type, opts)}</div>`;
    const asH = g.asList.map(a => th('g-h-as', hd(esc(a.title), 'as_' + a.id, 'num'), `title="${esc(a.title)}" style="min-width:90px;max-width:140px;overflow:hidden;text-overflow:ellipsis"`)).join('');
    const teH = g.testList.map(a => th('g-h-test', hd('<i class="bi bi-lock-fill"></i> ' + esc(a.title), 'te_' + a.id, 'num'), `title="${esc(a.title)} (bài Test)" style="min-width:90px;max-width:140px;overflow:hidden;text-overflow:ellipsis"`)).join('');
    const nAs = g.asList.length, nTe = g.testList.length;
    const head1 = `<tr>
      ${th('g-h-fix g-s1', 'STT', 'rowspan="2"')}${th('g-h-fix g-s2', hd('Họ và tên', 'name', 'text'), 'rowspan="2"')}
      ${th('g-h-att', hd('Chuyên cần', 'pres', 'num'), 'rowspan="2" style="min-width:90px"')}
      ${th('g-h-att', hd('Điểm danh<div style="font-size:10px;font-weight:600">(thang 10)</div>', 'att', 'num'), 'rowspan="2" style="min-width:90px"')}
      ${nAs ? th('g-h-as', 'Điểm Assignment', `colspan="${nAs}"`) : ''}
      ${nTe ? th('g-h-test', 'Điểm Test', `colspan="${nTe}"`) : ''}
      ${th('g-h-qt', hd('Điểm quá trình', 'qt', 'num'), 'rowspan="2" style="min-width:80px"')}
      ${th('g-h-ck', hd('Điểm cuối kỳ', 'ck', 'num'), 'rowspan="2" style="min-width:80px"')}
      ${th('g-h-fin', hd(`Điểm tổng kết<div style="font-size:10px;font-weight:600">${gbPctLabel()}</div>`, 'fin', 'num'), 'rowspan="2" style="min-width:100px"')}
      ${th('g-h-fin', hd('Xếp loại', 'rank', 'enum', ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Kém', '—'].map(x => [x, x])), 'rowspan="2" style="min-width:100px"')}
      ${th('g-h-fin', hd('Đạt', 'pass', 'enum', [['Đạt', 'Đạt'], ['Không đạt', 'Không đạt'], ['Chưa có', 'Chưa có điểm']]), 'rowspan="2" style="min-width:60px"')}
    </tr>`;
    const head2 = (nAs || nTe) ? `<tr class="g2">${asH}${teH}</tr>` : '';
    const cell = (v, on) => `<td class="${on ? '' : 'g-off'}" title="${on ? '' : 'Không nằm trong cách tính'}">${gFmt(v)}</td>`;
    const shown = cfRun('gb', g.rows, gbGet);
    const body = shown.map((r, i) => {
      const asC = g.asList.map(a => cell(r.sc(a.id), g.qtIds.has(a.id))).join('');
      const teC = g.testList.map(a => cell(r.sc(a.id), g.ckIds.has(a.id))).join('');
      const pass = r.fin == null ? '<span class="text-gray-400">—</span>'
        : r.fin >= 7 ? '<i class="bi bi-check-circle-fill" title="Đạt" style="color:#166534;font-size:19px"></i>'
                     : '<i class="bi bi-x-circle-fill" title="Không đạt" style="color:#991b1b;font-size:19px"></i>';
      return `<tr>
        <td class="g-s1">${i + 1}</td><td class="g-s2">${esc(r.stu.full_name || '(chưa có tên)')}</td>
        <td title="${r.pres}/${r.totalDays} buổi"><b>${r.pres}/${r.totalDays}</b></td><td class="g-calc">${gFmt(r.att10)}</td>
        ${asC}${teC}
        <td class="g-calc">${gFmt(r.qt)}</td><td class="g-calc">${gFmt(r.ck)}</td><td class="g-calc" style="color:#cf1717">${gFmt(r.fin)}</td>
        <td>${r.rank ? `<span class="g-rank ${r.rank.c}">${r.rank.t}</span>` : '<span class="text-gray-400">—</span>'}</td>
        <td>${pass}</td>
      </tr>`;
    }).join('');
    wrap.innerHTML = `<table id="gradeTable"><thead>${head1}${head2}</thead><tbody>${body || '<tr><td colspan="40" style="text-align:left" class="text-gray-400 italic">Không có học sinh nào khớp bộ lọc.</td></tr>'}</tbody></table>`;
    renderGbCharts(shown);
    wrap.scrollLeft = sl; wrap.scrollTop = st;
    const passN = g.rows.filter(r => r.fin != null && r.fin >= 7).length, graded = g.rows.filter(r => r.fin != null).length;
    pel('gradeSummaryLine').innerHTML = `${shown.length === g.rows.length ? g.rows.length : shown.length + '/' + g.rows.length} học sinh · ${g.totalDays} buổi đã học · ${nAs} bài Assignment · ${nTe} bài Test · đã có điểm tổng kết: ${graded} · đạt (≥ 7,0): <b>${passN}</b>` +
      (!nTe ? ' · <span class="text-amber-600">Lớp chưa có bài Test nên chưa tính được điểm tổng kết.</span>' : '');
  }

  // ---- Màn hình setup cách tính điểm ----
  function openGradeCfg() {
    if (!isOwnerRole()) return notify('⚠️ Chỉ giáo viên (teacher) mới chỉnh được cách tính điểm.');
    if (!gbData) return notify('⚠️ Hãy chọn lớp trước.');
    const c = myClasses.find(x => x.id === gbClassId);
    pel('gcClassTitle').textContent = c ? c.class_code + ' — ' + c.title : '';
    const asList = gbData.assigns.filter(a => !a.is_test), teList = gbData.assigns.filter(a => a.is_test);
    const list = (arr, ids, name) => arr.map(a => `<label class="flex items-center gap-2 text-xs"><input type="checkbox" data-${name}="${a.id}" ${ids.includes(a.id) ? 'checked' : ''}> <span class="truncate">${esc(a.title)}</span></label>`).join('') || '<p class="text-xs text-gray-400 italic">Chưa có bài nào.</p>';
    pel('gcQtList').innerHTML = list(asList, gbCfg.qtIds, 'qt');
    pel('gcCkList').innerHTML = list(teList, gbCfg.ckIds, 'ck');
    document.querySelectorAll('input[name=gcQtMode]').forEach(r => r.checked = r.value === gbCfg.qtMode);
    document.querySelectorAll('input[name=gcCkMode]').forEach(r => r.checked = r.value === gbCfg.ckMode);
    pel('gcAttPct').value = gbCfg.attPct || 0; pel('gcQtPct').value = gbCfg.qtPct; pel('gcCkPct').value = gbCfg.ckPct;
    pel('gcAttInQt').checked = !!gbCfg.attInQt; pel('gcMissingZero').checked = !!gbCfg.missingZero;
    pel('gradeCfgModal').classList.remove('hidden'); pel('gradeCfgModal').classList.add('flex');
  }
  function closeGradeCfg() { pel('gradeCfgModal').classList.add('hidden'); pel('gradeCfgModal').classList.remove('flex'); }
  function gcSyncPct(which) {
    const g = id => { const v = parseFloat(pel(id).value); return isNaN(v) ? 0 : Math.max(0, Math.min(100, v)); };
    if (which === 'ck') pel('gcQtPct').value = Math.max(0, Math.round((100 - g('gcAttPct') - g('gcCkPct')) * 100) / 100);
    else pel('gcCkPct').value = Math.max(0, Math.round((100 - g('gcAttPct') - g('gcQtPct')) * 100) / 100);
  }
  async function saveGradeCfg() {
    const attPct = parseFloat(pel('gcAttPct').value) || 0, qtPct = parseFloat(pel('gcQtPct').value), ckPct = parseFloat(pel('gcCkPct').value);
    if (isNaN(qtPct) || isNaN(ckPct) || Math.abs(attPct + qtPct + ckPct - 100) > 0.001) return notify('⚠️ Tỉ lệ Điểm danh + ĐQT + ĐCK phải bằng đúng 100%.');
    const cfg = {
      qtMode: document.querySelector('input[name=gcQtMode]:checked')?.value || 'all',
      ckMode: document.querySelector('input[name=gcCkMode]:checked')?.value || 'all',
      qtIds: [...document.querySelectorAll('[data-qt]:checked')].map(x => x.dataset.qt),
      ckIds: [...document.querySelectorAll('[data-ck]:checked')].map(x => x.dataset.ck),
      attPct, qtPct, ckPct, missingZero: pel('gcMissingZero').checked, attInQt: attPct > 0 ? false : pel('gcAttInQt').checked,
    };
    if (cfg.qtMode === 'pick' && !cfg.qtIds.length) return notify('⚠️ Chọn ít nhất 1 bài cho điểm quá trình (hoặc chọn "Tất cả").');
    if (cfg.ckMode === 'pick' && !cfg.ckIds.length) return notify('⚠️ Chọn ít nhất 1 bài cho điểm cuối kỳ (hoặc chọn "Tất cả").');
    let saved = false;
    try {
      const { error } = await sbClient.from('class_grade_config').upsert({ class_id: gbClassId, config: cfg, updated_by: currentUser.id, updated_at: new Date().toISOString() }, { onConflict: 'class_id' });
      if (!error) saved = true; else console.warn('Lưu cách tính điểm lên Supabase thất bại:', error.message);
    } catch (e) { console.warn(e); }
    try { localStorage.setItem('gradecfg:' + gbClassId, JSON.stringify(cfg)); } catch (e) {}
    gbCfg = { ...GRADE_DEFAULT_CFG, ...cfg };
    closeGradeCfg(); renderGradebook();
    notify(saved ? '✅ Đã lưu cách tính điểm.' : '⚠️ Mới lưu trên trình duyệt này — hãy chạy file 2_grades.sql trong Supabase để lưu cho mọi thiết bị.');
  }

  // ---- Xuất Excel bảng điểm ----
  async function exportGradebookExcel() {
    if (!gbData || !gbRows.rows) return notify('⚠️ Hãy chọn lớp trước.');
    try { await RUAssets.load('xlsx'); } catch(e) { return notify('❌ Chưa tải được thư viện Excel.'); }
    const g = gbRows, c = myClasses.find(x => x.id === gbClassId);
    const n = v => v == null ? '' : Math.round(v * 100) / 100;
    const header = ['STT', 'Họ và tên', 'Email', 'Chuyên cần (có mặt/tổng)', 'Điểm danh (thang 10)', ...g.asList.map(a => a.title), ...g.testList.map(a => '[Test] ' + a.title),
      'Điểm quá trình', 'Điểm cuối kỳ', `Điểm tổng kết (${gbPctLabel()})`, 'Xếp loại', 'Đạt'];
    const data = g.rows.map((r, i) => [i + 1, r.stu.full_name || '', r.stu.email || '', `${r.pres}/${r.totalDays}`, n(r.att10),
      ...g.asList.map(a => n(r.sc(a.id))), ...g.testList.map(a => n(r.sc(a.id))), n(r.qt), n(r.ck), n(r.fin), r.rank ? r.rank.t : '', r.fin == null ? '' : (r.fin >= 7 ? 'Đạt' : 'Không đạt')]);
    const ws = XLSX.utils.aoa_to_sheet([[`BẢNG ĐIỂM LỚP ${c ? c.class_code + ' — ' + c.title : ''}`], [], header, ...data]);
    ws['!cols'] = header.map((h, i) => ({ wch: i === 1 ? 26 : i === 2 ? 28 : Math.max(10, Math.min(28, String(h).length + 2)) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm');
    XLSX.writeFile(wb, `BangDiem_${slugify(c ? c.class_code : 'lop')}.xlsx`);
    notify('📥 Đã xuất file Excel bảng điểm!');
  }

  window.onload = checkTeacher;

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
