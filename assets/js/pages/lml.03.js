
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const pel = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------- Toast ----------
  function notify(msg, title) {
    const container = pel('toastContainer'); if (!container) return;
    const t = title || (/lỗi|thất bại|không thể/i.test(msg) ? 'Lỗi' : 'Thông báo');
    const id = 'toast-' + Date.now() + Math.random().toString(36).slice(2, 6);
    container.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="pointer-events-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 translate-x-full opacity-0">
        <div class="p-3.5 flex items-start gap-3">
          <div class="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/80 flex-shrink-0 flex items-center justify-center text-[#cf1717]"><i class="bi bi-bell-fill"></i></div>
          <div class="flex-1 pr-4"><h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">${esc(t)}</h4><p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${esc(msg)}</p></div>
          <button onclick="this.closest('[id^=toast-]').remove()" class="text-gray-400 hover:text-gray-600 p-1"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="h-1 bg-red-100 dark:bg-zinc-800"><div class="h-full bg-[#cf1717] animate-toast-bar"></div></div>
      </div>`);
    const el = pel(id);
    setTimeout(() => el.classList.remove('translate-x-full', 'opacity-0'), 50);
    setTimeout(() => { el.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => el.remove(), 300); }, 5000);
  }
  function toggleDarkMode() {
    const d = document.documentElement.classList.toggle('dark');
    localStorage.theme = d ? 'dark' : 'light';
  }
  async function handleLogout() { await sbClient.auth.signOut(); window.location.href = 'lml.html'; }

  // ---------- Trạng thái ----------
  let currentUser = null, isAdmin = false;
  let topics = [], materials = [];
  let activeTopic = '';      // '' = tất cả
  let page = 1;
  const PAGE_SIZE = 8;
  let currentMaterial = null;
  let histPage = 1, histRows = [];
  const HIST_SIZE = 6;
  let bestByMaterial = {};

  async function init() {
    const { data: { session } } = await sbClient.auth.getSession();
    currentUser = session ? session.user : null;
    pel('loginLink').classList.toggle('hidden', !!currentUser);
    pel('logoutBtn').classList.toggle('hidden', !currentUser);
    if (currentUser) {
      const { data: prof } = await sbClient.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      isAdmin = prof && String(prof.role || '').toLowerCase() === 'admin';
      if (isAdmin) { pel('adminLink').classList.remove('hidden'); pel('adminLink').classList.add('flex'); }
    }
    const params = new URLSearchParams(location.search);
    activeTopic = params.get('topic') || '';
    await loadLibrary();
    const token = params.get('token');
    if (token) { openMaterialByToken(token); return; }
    renderTopics(); renderList();
    loadHistory();
  }

  async function loadLibrary() {
    const [t, m] = await Promise.all([
      sbClient.from('lml_topics').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      sbClient.from('lml_materials').select('id, token, title, description, topic_id, total_points, created_at').eq('is_published', true).order('created_at', { ascending: false })
    ]);
    if (t.error || m.error) { notify('Lỗi tải thư viện: ' + (t.error || m.error).message + ' (đã chạy lml_setup.sql chưa?)'); }
    topics = t.data || []; materials = m.data || [];
    if (currentUser) {
      const { data } = await sbClient.from('lml_attempts').select('material_id, auto_score, total_points').eq('user_id', currentUser.id);
      bestByMaterial = {};
      (data || []).forEach(a => {
        const v = a.total_points ? Math.round(a.auto_score / a.total_points * 1000) / 100 : 0;
        if (bestByMaterial[a.material_id] === undefined || v > bestByMaterial[a.material_id]) bestByMaterial[a.material_id] = v;
      });
    }
  }

  // ---------- Danh sách ----------
  function countOf(tid) { return materials.filter(m => m.topic_id === tid).length; }
  function renderTopics() {
    const btn = (id, name, n, icon) => `<button class="topic-btn ${activeTopic === id ? 'active' : ''}" onclick="selectTopic('${id}')"><i class="bi ${icon} text-[#cf1717]"></i><span class="flex-1">${esc(name)}</span><span class="text-[10px] text-gray-400">${n}</span></button>`;
    pel('topicList').innerHTML = btn('', 'Tất cả chủ đề', materials.length, 'bi-collection') +
      topics.map(t => btn(t.id, t.name, countOf(t.id), 'bi-bookmark-fill')).join('') ||
      '<p class="text-xs text-gray-400 italic p-4">Chưa có chủ đề nào.</p>';
  }
  function selectTopic(id) {
    activeTopic = id; page = 1;
    history.replaceState(null, '', id ? 'lml.html?topic=' + id : 'lml.html');
    renderTopics(); renderList();
  }
  function filtered() { return activeTopic ? materials.filter(m => m.topic_id === activeTopic) : materials; }
  function renderList() {
    const list = filtered();
    const tp = topics.find(t => t.id === activeTopic);
    pel('listTitle').innerHTML = tp ? `<i class="bi bi-bookmark-fill"></i> ${esc(tp.name)}` : '<i class="bi bi-stars"></i> Bài mới';
    pel('listCount').innerText = list.length + ' bài';
    pel('matEmpty').classList.toggle('hidden', !!list.length);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const items = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    pel('matGrid').innerHTML = items.map(m => {
      const tn = (topics.find(t => t.id === m.topic_id) || {}).name || '';
      const best = bestByMaterial[m.id];
      return `<a href="lml.html?token=${encodeURIComponent(m.token)}" class="group block bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-3 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">
        <div class="aspect-[3/4] rounded-xl bg-gradient-to-br from-[#cf1717] via-red-500 to-orange-500 flex flex-col items-center justify-center text-white p-3 mb-3 shadow-inner">
          <i class="bi bi-journal-richtext text-4xl mb-2"></i>
          <span class="text-[10px] font-bold uppercase tracking-wider opacity-90 line-clamp-2">${esc(tn)}</span>
        </div>
        <h4 class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#cf1717] transition-colors">${esc(m.title)}</h4>
        <p class="text-[11px] text-gray-400 italic mt-1">${m.total_points || 0} điểm · ${new Date(m.created_at).toLocaleDateString('vi-VN')}</p>
        ${best !== undefined ? `<span class="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">Cao nhất: ${best}/10</span>` : ''}
      </a>`;
    }).join('');
    pel('pager').innerHTML = pagerHtml(page, totalPages, 'goPage');
  }
  function pagerHtml(cur, total, fn) {
    if (total <= 1) return '';
    let h = '';
    for (let i = 1; i <= total; i++) h += `<button onclick="${fn}(${i})" class="w-8 h-8 rounded-lg text-xs font-bold transition ${i === cur ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'}">${i}</button>`;
    return h;
  }
  function goPage(p) { page = p; renderList(); }

  // ---------- Lịch sử điểm ----------
  async function loadHistory() {
    const box = pel('historyBox');
    if (!currentUser) {
      box.innerHTML = '<p class="text-xs text-gray-400 italic"><i class="bi bi-info-circle"></i> <a href="index.html" class="font-bold text-[#cf1717] hover:underline">Đăng nhập</a> để lưu và xem lịch sử điểm các bài đã làm.</p>';
      pel('histPager').innerHTML = ''; return;
    }
    const { data, error } = await sbClient.from('lml_attempts').select('id, auto_score, total_points, has_essay, submitted_at, lml_materials(title, token, topic_id)').eq('user_id', currentUser.id).order('submitted_at', { ascending: false }).limit(200);
    if (error) { box.innerHTML = `<p class="text-xs text-red-500">Lỗi: ${esc(error.message)}</p>`; return; }
    histRows = data || []; renderHistory();
  }
  function renderHistory() {
    const box = pel('historyBox');
    if (!histRows.length) { box.innerHTML = '<p class="text-xs text-gray-400 italic">Bạn chưa làm bài nào.</p>'; pel('histPager').innerHTML = ''; return; }
    const total = Math.ceil(histRows.length / HIST_SIZE);
    if (histPage > total) histPage = total;
    const rows = histRows.slice((histPage - 1) * HIST_SIZE, histPage * HIST_SIZE);
    box.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-xs">
      <thead><tr class="bg-[#cf1717] text-white text-left"><th class="p-2.5 rounded-tl-xl">Bài</th><th class="p-2.5">Chủ đề</th><th class="p-2.5 text-center">Điểm</th><th class="p-2.5">Thời gian</th><th class="p-2.5 rounded-tr-xl"></th></tr></thead><tbody>` +
      rows.map(r => {
        const m = r.lml_materials || {};
        const tn = (topics.find(t => t.id === m.topic_id) || {}).name || '—';
        const s10 = r.total_points ? Math.round(r.auto_score / r.total_points * 1000) / 100 : 0;
        return `<tr class="border-b dark:border-zinc-800 hover:bg-red-50/40 dark:hover:bg-zinc-800/40">
          <td class="p-2.5 font-bold">${esc(m.title || '(bài đã bị xóa)')}</td><td class="p-2.5 text-gray-500">${esc(tn)}</td>
          <td class="p-2.5 text-center"><b class="text-[#cf1717]">${r.auto_score}/${r.total_points}</b> <span class="text-gray-400">(${s10}/10)</span>${r.has_essay ? '<i class="bi bi-file-earmark-text text-amber-500 ml-1" title="Có câu tự luận không chấm điểm"></i>' : ''}</td>
          <td class="p-2.5 text-gray-400">${new Date(r.submitted_at).toLocaleString('vi-VN')}</td>
          <td class="p-2.5 text-right">${m.token ? `<a href="lml.html?token=${encodeURIComponent(m.token)}" class="font-bold text-[#cf1717] hover:underline whitespace-nowrap">Làm lại</a>` : ''}</td></tr>`;
      }).join('') + '</tbody></table></div>';
    pel('histPager').innerHTML = pagerHtml(histPage, total, 'goHist');
  }
  function goHist(p) { histPage = p; renderHistory(); }

  // ---------- Làm bài ----------
  async function openMaterialByToken(token) {
    let { data: m, error } = await sbClient.from('lml_materials').select('*').eq('token', token).eq('is_published', true).maybeSingle();
    if (error || !m) { notify('Không tìm thấy bài hoặc bài chưa xuất bản.'); renderTopics(); renderList(); loadHistory(); return; }
    currentMaterial = m;
    const tp = topics.find(t => t.id === m.topic_id);
    const back = 'lml.html' + (m.topic_id ? '?topic=' + m.topic_id : '');
    pel('backLink1').href = back; pel('backLink2').href = back;
    pel('atTopic').innerText = tp ? tp.name : 'LML';
    pel('atTitle').innerText = m.title;
    pel('atDesc').innerText = m.description || '';
    pel('listView').classList.add('hidden'); pel('resultView').classList.add('hidden'); pel('attemptView').classList.remove('hidden');
    pel('submitBtn').disabled = false; pel('submitBtn').innerHTML = '<i class="bi bi-check-circle-fill"></i> Nộp Bài';
    const counter = { n: 0 };
    pel('questionArea').innerHTML = (m.questions || []).map(q => renderBlock(q, counter, 'attempt')).join('');
    window.scrollTo({ top: 0 });
  }
  function retryMaterial() { if (currentMaterial) openMaterialByToken(currentMaterial.token); }

  function renderBlock(q, counter, mode, answers) {
    if (q.type === 'text') return `<div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 qcontent text-sm ${q.two_col ? 'qcontent-2col' : ''}">${q.content || ''}</div>`;
    if (q.type === 'reading') {
      const inner = (q.sub_blocks || []).map(sb => renderBlock(sb, counter, mode, answers)).join('<div class="h-3"></div>');
      return `<div class="rd-split"><div class="rd-pane qcontent text-sm ${q.two_col ? 'qcontent-2col' : ''}">${q.content || ''}</div><div class="rd-pane space-y-3">${inner}</div></div>`;
    }
    counter.n++;
    return mode === 'attempt' ? renderInput(q, counter.n) : renderReview(q, counter.n, answers);
  }

  function renderInput(q, n) {
    let body = '';
    if (q.type === 'fill') {
      let c;
      if (q.blanks && q.blanks.length) {
        c = (q.content || '').replace(/\{\{(\d+)\}\}/g, (m, g) => {
          const bl = q.blanks.find(b => String(b.gap) === g);
          const len = (bl && bl.accepted_answers && bl.accepted_answers.length) ? Math.max(...bl.accepted_answers.map(a => String(a).length)) : 6;
          return `<textarea id="ans-${q.id}-${g}" rows="1" placeholder="…" oninput="growFill(this)" style="width:${Math.min(Math.max(len + 3, 5), 28)}ch" class="fillbox mx-1 px-2 py-1 rounded-lg border-2 border-[#cf1717]/40 dark:bg-zinc-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#cf1717]"></textarea>`;
        });
      } else c = `${q.content || ''}<div class="mt-3"><textarea id="ans-${q.id}" rows="2" class="w-full p-2.5 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 text-sm" placeholder="Nhập câu trả lời..."></textarea></div>`;
      return card(q, n, `<div class="qcontent text-sm leading-loose">${c}</div>`);
    }
    if (q.type === 'mcq' || q.type === 'tf' || q.type === 'multi') {
      const t = q.type === 'multi' ? 'checkbox' : 'radio';
      body = (q.options || []).map(o => `<label class="flex items-center gap-2 p-2.5 border dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#cf1717] transition"><input type="${t}" name="ans-${q.id}" value="${esc(o.id)}"> <span class="text-sm">${esc(o.text)}</span></label>`).join('');
    } else if (q.type === 'essay') body = `<textarea id="ans-${q.id}" rows="5" placeholder="Viết câu trả lời của bạn..." class="w-full p-2.5 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 text-sm"></textarea>`;
    return card(q, n, `<div class="qcontent text-sm">${q.content || ''}</div><div class="space-y-2">${body}</div>`);
  }
  const card = (q, n, inner, extra) => `<div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm" data-q="${q.id}"><div class="flex items-center justify-between"><p class="text-xs font-bold text-[#cf1717]">Câu ${n} · ${q.points} điểm</p>${extra || ''}</div>${inner}</div>`;
  function growFill(el) { const l = Math.max(...el.value.split('\n').map(x => x.length), 5); el.style.width = Math.min(Math.max(l + 3, 5), 34) + 'ch'; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

  function flatQs(list) { const out = []; (list || []).forEach(q => { if (q.type === 'reading') (q.sub_blocks || []).forEach(s => out.push(s)); else out.push(q); }); return out; }
  const norm = x => String(x ?? '').toLowerCase().trim();

  // Điểm 1 câu (essay không chấm tự động -> null)
  function earnedOf(q, g) {
    const pts = parseFloat(q.points) || 0;
    if (q.type === 'mcq' || q.type === 'tf') { const c = (q.options || []).find(o => o.correct); return g && c && g === c.id ? pts : 0; }
    if (q.type === 'multi') { const ids = (q.options || []).filter(o => o.correct).map(o => o.id).sort(); const gv = Array.isArray(g) ? [...g].sort() : []; return ids.length && JSON.stringify(ids) === JSON.stringify(gv) ? pts : 0; }
    if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) { const go = (g && typeof g === 'object') ? g : {}; let ok = 0; q.blanks.forEach(bl => { const v = norm(go[bl.gap]); if (v && (bl.accepted_answers || []).map(norm).includes(v)) ok++; }); return pts / q.blanks.length * ok; }
      const v = norm(g); return v && (q.accepted_answers || []).map(norm).includes(v) ? pts : 0;
    }
    return null;
  }
  function readAnswer(q) {
    if (q.type === 'mcq' || q.type === 'tf') { const e = document.querySelector(`input[name="ans-${q.id}"]:checked`); return e ? e.value : null; }
    if (q.type === 'multi') return Array.from(document.querySelectorAll(`input[name="ans-${q.id}"]:checked`)).map(x => x.value);
    if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) { const o = {}; q.blanks.forEach(bl => { o[bl.gap] = (pel(`ans-${q.id}-${bl.gap}`)?.value || '').trim(); }); return o; }
      return (pel('ans-' + q.id)?.value || '').trim();
    }
    if (q.type === 'essay') return pel('ans-' + q.id)?.value || '';
    return null;
  }

  async function submitMaterial() {
    const m = currentMaterial; if (!m) return;
    const btn = pel('submitBtn'); btn.disabled = true; btn.innerText = 'Đang nộp...';
    const answers = {}; let score = 0, hasEssay = false;
    flatQs(m.questions).forEach(q => {
      if (q.type === 'text') return;
      answers[q.id] = readAnswer(q);
      const e = earnedOf(q, answers[q.id]);
      if (e === null) hasEssay = true; else score += e;
    });
    score = Math.round(score * 100) / 100;
    const total = m.total_points || 0;
    let saved = false;
    if (currentUser) {
      const { error } = await sbClient.from('lml_attempts').insert([{ material_id: m.id, user_id: currentUser.id, answers, auto_score: score, total_points: total, has_essay: hasEssay }]);
      if (error) notify('Không lưu được điểm: ' + error.message); else saved = true;
      if (saved) { const v = total ? Math.round(score / total * 1000) / 100 : 0; if (bestByMaterial[m.id] === undefined || v > bestByMaterial[m.id]) bestByMaterial[m.id] = v; }
    }
    showResult(m, answers, score, total, hasEssay, saved);
  }

  function showResult(m, answers, score, total, hasEssay, saved) {
    pel('attemptView').classList.add('hidden'); pel('resultView').classList.remove('hidden');
    pel('rsTitle').innerText = m.title;
    pel('rsScore').innerText = `${score} / ${total}`;
    const notes = [];
    if (hasEssay) notes.push('Câu tự luận không được chấm điểm — hãy tự đối chiếu với đáp án/giải thích.');
    if (!currentUser) notes.push('Bạn chưa đăng nhập nên điểm không được lưu vào lịch sử.');
    pel('rsNote').classList.toggle('hidden', !notes.length); pel('rsNote').innerText = notes.join(' ');
    const counter = { n: 0 };
    pel('reviewArea').innerHTML = (m.questions || []).map(q => renderBlock(q, counter, 'review', answers)).join('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderReview(q, n, answers) {
    const g = answers[q.id];
    const pts = parseFloat(q.points) || 0;
    const e = earnedOf(q, g);
    let chip = 'bg-gray-100 text-gray-500', txt = `Tự luận / ${pts}`;
    if (e !== null) { const r = Math.round(e * 100) / 100; txt = `${r} / ${pts}`; chip = r >= pts ? 'bg-emerald-100 text-emerald-700' : r > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'; }
    let body = '';
    if (q.type === 'mcq' || q.type === 'tf' || q.type === 'multi') {
      const ga = Array.isArray(g) ? g : (g ? [g] : []);
      body = (q.options || []).map(o => `<div class="p-2.5 rounded-xl border text-sm ${o.correct ? 'opt-correct' : (ga.includes(o.id) ? 'opt-wrong' : 'dark:border-zinc-700')}">${ga.includes(o.id) ? '<i class="bi bi-arrow-right-circle-fill"></i> ' : ''}${esc(o.text)}${o.correct ? ' <span class="text-emerald-600 font-bold text-xs">(Đáp án đúng)</span>' : ''}</div>`).join('');
    } else if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) {
        const go = (g && typeof g === 'object') ? g : {};
        body = q.blanks.map(bl => { const v = (go[bl.gap] || '').trim(); const ok = (bl.accepted_answers || []).map(norm).includes(norm(v)); return `<div class="p-2.5 rounded-xl border text-sm ${ok ? 'opt-correct' : 'opt-wrong'}">Chỗ trống ${bl.gap}: bạn trả lời <b>${esc(v || '(bỏ trống)')}</b><span class="block text-xs text-gray-500">Đáp án chấp nhận: ${esc((bl.accepted_answers || []).join(', '))}</span></div>`; }).join('');
      } else body = `<div class="p-2.5 rounded-xl border text-sm">Bạn trả lời: <b>${esc(g || '(bỏ trống)')}</b></div>`;
    } else if (q.type === 'essay') body = `<div class="p-2.5 rounded-xl border dark:border-zinc-700 text-sm whitespace-pre-wrap">${esc(g || '(bỏ trống)')}</div>`;
    const expl = q.explanation ? `<div class="pt-2 border-t dark:border-zinc-800"><p class="text-[10px] font-bold uppercase text-gray-400 mb-1"><i class="bi bi-lightbulb"></i> Giải thích</p><div class="qcontent text-xs text-gray-600 dark:text-gray-300">${q.explanation}</div></div>` : '';
    return card(q, n, `<div class="qcontent text-sm">${q.content || ''}</div><div class="space-y-2">${body}</div>${expl}`, `<span class="text-[11px] font-extrabold px-2.5 py-1 rounded-full ${chip}">${txt} điểm</span>`)
      .replace(`Câu ${n} · ${q.points} điểm`, `Câu ${n}`);
  }

  window.onload = init;
