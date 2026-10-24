
/* ============ TRÌNH SOẠN CÂU HỎI THEO DẠNG (giống teacher.html, không có dạng Reading chia đôi) ============ */
let qbBlocks = [], qbMode = 'blocks', qbFocus = null, qbRange = null;
const qbEl = id => document.getElementById(id);
const qbEsc = s => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const qbNewId = () => 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const QB_TYPES = ['mcq', 'multi', 'tf', 'fill', 'essay', 'text'];
const QB_LABEL = { mcq: '<i class="bi bi-check2-square"></i> Trắc nghiệm 1 đáp án', multi: '<i class="bi bi-check2-square"></i><i class="bi bi-check2-square"></i> Trắc nghiệm nhiều đáp án', tf: '<i class="bi bi-check-circle-fill"></i><i class="bi bi-x-circle-fill"></i> Đúng/Sai', fill: '<i class="bi bi-pencil-fill"></i> Điền khuyết', essay: '<i class="bi bi-file-earmark-text-fill"></i> Tự luận', text: '<i class="bi bi-pin-angle-fill"></i> Văn bản / hướng dẫn' };
function qbNote(msg) { const p = qbEl('qbStatus'); if (p) p.innerHTML = msg || ''; }

/* ---------- Thanh định dạng ---------- */
document.addEventListener('focusin', e => {
  if (e.target.classList && e.target.classList.contains('qeditor') && e.target.closest('#qbBlocks')) qbFocus = e.target;
});
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !qbFocus) return;
  const r = sel.getRangeAt(0);
  if (qbFocus.contains(r.commonAncestorContainer)) qbRange = r.cloneRange();
});
document.addEventListener('paste', e => {
  const t = e.target;
  if (!t.classList || !t.classList.contains('qeditor') || !t.closest('#qbBlocks')) return;
  const h = e.clipboardData.getData('text/html'); if (!h) return;
  e.preventDefault(); document.execCommand('insertHTML', false, typeof pasClean === 'function' ? pasClean(h) : h);
});
function qbFocusOk() { return qbFocus && document.body.contains(qbFocus); }
function qbCmd(cmd, value) {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước.');
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand(cmd, false, value === undefined || value === '' ? null : value);
}
function qbClearFormat() {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích và bôi đen đoạn cần xóa định dạng trước.');
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('removeFormat', false, null);
  document.execCommand('unlink', false, null);
  // Gỡ luôn danh sách nếu đoạn đang là list
  if (document.queryCommandState('insertUnorderedList')) document.execCommand('insertUnorderedList', false, null);
  if (document.queryCommandState('insertOrderedList')) document.execCommand('insertOrderedList', false, null);
  // Xóa màu/cỡ chữ còn sót dạng <font> hoặc style inline trong vùng đang chọn
  const sel = window.getSelection();
  if (sel.rangeCount && !sel.isCollapsed) {
    const r = sel.getRangeAt(0);
    qbFocus.querySelectorAll('font, span[style]').forEach(el => {
      if (r.intersectsNode(el)) {
        if (el.tagName === 'FONT') { while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el); el.remove(); }
        else { el.removeAttribute('style'); }
      }
    });
  }
}
async function qbInsertImage(input) {
  const file = input.files[0]; input.value = '';
  if (!file) return;
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước, rồi chọn ảnh.');
  const target = qbFocus; qbNote('<i class="bi bi-hourglass-split"></i> Đang tải ảnh...');
  let url = null;
  try { url = await pasUpload(file); } catch (e) {}
  if (!url) url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  target.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('insertHTML', false, `<img src="${url}" alt="">`);
  qbNote('<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh!');
}
function qbInsertTable() {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước.');
  const rows = parseInt(prompt('Bảng bao nhiêu HÀNG?', '2')) || 2;
  const cols = parseInt(prompt('Bảng bao nhiêu CỘT?', '2')) || 2;
  let html = '<table><tbody>';
  for (let r = 0; r < Math.max(1, rows); r++) { html += '<tr>'; for (let c = 0; c < Math.max(1, cols); c++) html += '<td>&nbsp;</td>'; html += '</tr>'; }
  html += '</tbody></table><p><br></p>';
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('insertHTML', false, html);
}
function qbInsertAudio(input) {
  const file = input.files[0]; input.value = '';
  if (!file || !qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước, sau đó chọn file âm thanh.');
  if (file.size > 8 * 1024 * 1024) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> File âm thanh quá 8MB, hãy nén nhỏ hơn rồi thử lại.');
  const target = qbFocus, reader = new FileReader();
  reader.onload = () => {
    target.focus();
    if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
    document.execCommand('insertHTML', false, `<audio controls src="${reader.result}"></audio><p><br></p>`);
  };
  reader.readAsDataURL(file);
}

/* ---------- Thêm / xóa / di chuyển khối ---------- */
function qbAdd(type) {
  const base = { id: qbNewId(), type, content: '', points: 1, explanation: '' };
  if (type === 'mcq' || type === 'multi') base.options = [{ id: 'a', text: '', correct: type === 'mcq' }, { id: 'b', text: '', correct: false }];
  if (type === 'tf') base.options = [{ id: 'true', text: 'True', correct: true }, { id: 'false', text: 'False', correct: false }];
  if (type === 'fill') base.blanks = {};
  if (type === 'text') base.points = 0;
  qbBlocks.push(base); qbRender();
}
function qbRemove(id) { qbBlocks = qbBlocks.filter(b => b.id !== id); qbRender(); }
function qbMove(id, dir) {
  const i = qbBlocks.findIndex(b => b.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= qbBlocks.length) return;
  [qbBlocks[i], qbBlocks[j]] = [qbBlocks[j], qbBlocks[i]]; qbRender();
}
const qbFind = id => qbBlocks.find(b => b.id === id) || null;
function qbUpdate(id, field, value, isNumber) { const b = qbFind(id); if (b) b[field] = isNumber ? parseFloat(value || 0) : value; }
function qbSetOptText(bid, oid, val) { const b = qbFind(bid); const o = b && b.options.find(x => x.id === oid); if (o) o.text = val; }
function qbSetCorrect(bid, oid, checked, single) {
  const b = qbFind(bid); if (!b) return;
  if (single) b.options.forEach(o => o.correct = (o.id === oid));
  else { const o = b.options.find(x => x.id === oid); if (o) o.correct = checked; }
}
function qbAddOpt(bid) {
  const b = qbFind(bid); if (!b) return;
  b.options.push({ id: String.fromCharCode(97 + b.options.length) + Date.now().toString(36).slice(-3), text: '', correct: false }); qbRender();
}
function qbRemoveOpt(bid, oid) { const b = qbFind(bid); if (!b) return; b.options = b.options.filter(o => o.id !== oid); qbRender(); }

/* ---------- Điền khuyết nhiều chỗ trống {{1}} {{2}} ---------- */
function qbGaps(content) {
  const nums = Array.from((content || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => parseInt(m[1]));
  return [...new Set(nums)].sort((a, b) => a - b);
}
function qbGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function qbUpdBlank(bid, n, v) { const b = qbFind(bid); if (!b) return; b.blanks = b.blanks || {}; b.blanks[n] = v; }
function qbInsertGap(bid) {
  const b = qbFind(bid); if (!b) return;
  const div = qbEl('qb-' + bid); if (!div) return;
  div.focus();
  const nums = qbGaps(b.content);
  document.execCommand('insertText', false, `{{${nums.length ? Math.max(...nums) + 1 : 1}}}`);
  b.content = div.innerHTML; qbRender();
}
function qbFillUI(b) {
  const gaps = qbGaps(b.content); b.blanks = b.blanks || {};
  if (!gaps.length) return `<div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="block text-[10px] font-bold uppercase text-gray-500">Chỗ trống điền khuyết</label>
      <button type="button" onclick="qbInsertGap('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Chèn chỗ trống vào nội dung</button>
    </div>
    <p class="text-[11px] text-amber-500 italic"><i class="bi bi-exclamation-triangle-fill"></i> Đặt con trỏ vào vị trí muốn tạo chỗ trống trong "Nội dung câu hỏi" ở trên, rồi bấm nút này (bấm nhiều lần nếu câu có nhiều chỗ trống).</p>
  </div>`;
  return `<div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="block text-[10px] font-bold uppercase text-gray-500">Đáp án cho từng chỗ trống (${gaps.length} chỗ — nhiều đáp án đúng cách nhau bởi dấu ;)</label>
      <button type="button" onclick="qbInsertGap('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm chỗ trống</button>
    </div>
    ${gaps.map(n => `
      <div class="flex items-start gap-2">
        <span class="text-[10px] font-extrabold text-white bg-[#cf1717] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">${n}</span>
        <textarea rows="1" placeholder="VD: cost; costs (nhiều đáp án cách nhau bởi dấu ;)" oninput="qbUpdBlank('${b.id}',${n},this.value); qbGrow(this)"
          class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs resize-none overflow-hidden leading-relaxed" style="min-height:34px">${qbEsc(b.blanks[n] || '')}</textarea>
      </div>`).join('')}
  </div>`;
}

/* ---------- Vẽ danh sách khối ---------- */
function qbRender() {
  qbEl('qbBlocks').innerHTML = qbBlocks.map((b, idx) => `
    <div class="border dark:border-zinc-700 rounded-2xl p-4 space-y-3 bg-white dark:bg-zinc-900" data-block="${b.id}">
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold text-[#cf1717]">Câu ${b.type === 'text' ? '' : qbBlocks.slice(0, idx + 1).filter(x => x.type !== 'text').length} — ${QB_LABEL[b.type]}</span>
        <div class="flex items-center gap-2 text-xs">
          ${b.type !== 'text' ? `<label class="flex items-center gap-1">Điểm: <input type="number" min="0" step="0.5" value="${b.points}" oninput="qbUpdate('${b.id}','points',this.value,true)" class="w-14 p-1 rounded border dark:bg-zinc-800 dark:border-zinc-700"></label>` : ''}
          <button type="button" onclick="qbMove('${b.id}',-1)" title="Lên"><i class="bi bi-arrow-up"></i></button>
          <button type="button" onclick="qbMove('${b.id}',1)" title="Xuống"><i class="bi bi-arrow-down"></i></button>
          <button type="button" onclick="qbRemove('${b.id}')" class="text-red-500 font-bold" title="Xóa"><i class="bi bi-trash3-fill"></i></button>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">${b.type === 'text' ? 'Nội dung' : 'Nội dung câu hỏi'}</label>
        <div id="qb-${b.id}" class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" contenteditable="true" oninput="qbUpdate('${b.id}','content',this.innerHTML)">${b.content || ''}</div>
      </div>
      ${(b.type === 'mcq' || b.type === 'multi' || b.type === 'tf') ? `
        <div class="space-y-2">
          <label class="block text-[10px] font-bold uppercase text-gray-500">Các lựa chọn (tick <i class="bi bi-check-lg"></i> vào đáp án đúng)</label>
          ${b.options.map(o => `
            <div class="flex items-center gap-2">
              <input type="${b.type === 'multi' ? 'checkbox' : 'radio'}" name="qbcorrect-${b.id}" ${o.correct ? 'checked' : ''}
                onchange="qbSetCorrect('${b.id}','${o.id}', ${b.type === 'multi'} ? this.checked : true, ${b.type !== 'multi'})">
              <input type="text" value="${qbEsc(o.text)}" placeholder="Nội dung lựa chọn..." ${b.type === 'tf' ? 'readonly' : ''}
                oninput="qbSetOptText('${b.id}','${o.id}',this.value)" class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs">
              ${b.type !== 'tf' && b.options.length > 2 ? `<button type="button" onclick="qbRemoveOpt('${b.id}','${o.id}')" class="text-red-400 text-xs"><i class="bi bi-x-lg"></i></button>` : ''}
            </div>`).join('')}
          ${b.type !== 'tf' ? `<button type="button" onclick="qbAddOpt('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm lựa chọn</button>` : ''}
        </div>` : ''}
      ${b.type === 'fill' ? qbFillUI(b) : ''}
      ${b.type !== 'text' ? `
        <div>
          <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-lightbulb-fill"></i> Đáp án & giải thích (hiện ra sau khi học sinh nộp bài)</label>
          <div class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" contenteditable="true" oninput="qbUpdate('${b.id}','explanation',this.innerHTML)">${b.explanation || ''}</div>
        </div>` : ''}
    </div>`).join('') || '<p class="text-xs text-gray-400 italic text-center py-6">Chưa có câu hỏi nào — bấm nút bên dưới để thêm.</p>';
  qbEl('qbBlocks').querySelectorAll('textarea[oninput*="qbUpdBlank"]').forEach(qbGrow);
}

/* ---------- Dữ liệu <-> JSON ---------- */
function qbCompatible(arr) {
  return Array.isArray(arr) && arr.every(q => q && typeof q === 'object' && QB_TYPES.includes(q.type) &&
    (!['mcq', 'multi', 'tf'].includes(q.type) || (Array.isArray(q.options) && q.options.every(o => o && typeof o === 'object'))) &&
    (q.type !== 'fill' || qbGaps(q.content).length > 0));
}
function qbDenorm(arr) {
  return JSON.parse(JSON.stringify(arr)).map(b => {
    if (!b.id) b.id = qbNewId();
    if (b.options) b.options.forEach((o, i) => { if (!o.id) o.id = String.fromCharCode(97 + i); o.correct = !!o.correct; });
    if (b.type === 'fill' && Array.isArray(b.blanks)) {
      const map = {}; b.blanks.forEach(bl => { map[bl.gap] = (bl.accepted_answers || []).join('; '); }); b.blanks = map;
    }
    if (b.type === 'fill' && !b.blanks) b.blanks = {};
    if (b.points == null) b.points = b.type === 'text' ? 0 : 1;
    return b;
  });
}
function qbNormalize(b) {
  const nb = JSON.parse(JSON.stringify(b)); delete nb._needsCheck;
  if (nb.type === 'fill') {
    nb.blanks = qbGaps(nb.content).map(n => ({ gap: n, accepted_answers: ((b.blanks && b.blanks[n]) || '').split(';').map(s => s.trim()).filter(Boolean) }));
  }
  return nb;
}
function qbGetData() {
  if (qbMode === 'json') return JSON.parse(qbEl('examQuestions').value.trim() || '[]');
  return qbBlocks.map(qbNormalize);
}
function qbValidate() {
  if (qbMode !== 'blocks') return '';
  for (const b of qbBlocks) if (b.type === 'fill' && !qbGaps(b.content).length)
    return '<i class="bi bi-exclamation-triangle-fill"></i> Có câu điền khuyết chưa có chỗ trống nào — hãy bấm "+ Chèn chỗ trống" trong câu đó trước khi lưu.';
  return '';
}
function qbApplyMode(m) {
  qbMode = m;
  qbEl('qbPanel').classList.toggle('hidden', m !== 'blocks');
  qbEl('examQuestions').classList.toggle('hidden', m !== 'json');
  qbEl('qbTabBlocks').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'blocks' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
  qbEl('qbTabJson').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'json' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
}
function qbSetMode(m) {
  if (m === qbMode) return;
  if (m === 'json') {
    const err = qbValidate(); if (err) return alert(err);
    qbEl('examQuestions').value = JSON.stringify(qbGetData(), null, 2);
    qbApplyMode('json'); qbNote('');
  } else {
    let data;
    try { data = JSON.parse(qbEl('examQuestions').value.trim() || '[]'); } catch (e) { return alert('JSON đang bị lỗi cú pháp, hãy sửa trước khi chuyển sang chế độ soạn theo dạng.'); }
    if (!qbCompatible(data)) return alert('JSON này có định dạng khác trình soạn (dạng câu hỏi không nằm trong: mcq, multi, tf, fill, essay, text). Để tránh mất dữ liệu, hãy tiếp tục sửa ở chế độ JSON.');
    qbBlocks = qbDenorm(data); qbApplyMode('blocks'); qbRender(); qbNote('');
  }
}
function qbLoad(data) {
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = null; } }
  if (!Array.isArray(data)) data = [];
  qbEl('examQuestions').value = JSON.stringify(data, null, 2);
  if (qbCompatible(data)) { qbBlocks = qbDenorm(data); qbApplyMode('blocks'); qbRender(); qbNote(''); }
  else { qbBlocks = []; qbRender(); qbApplyMode('json'); qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Bài này có định dạng câu hỏi khác trình soạn theo dạng, nên được giữ ở chế độ JSON để không mất dữ liệu.'); }
}

/* ---------- Nhập câu hỏi từ Word (.docx) ---------- */
async function qbImportWord(input) {
  const file = input.files[0]; input.value = ''; if (!file) return;
  if (!window.mammoth) return qbNote('<i class="bi bi-x-circle-fill"></i> Không tải được thư viện đọc file Word, hãy tải lại trang và thử lại.');
  qbNote('<i class="bi bi-hourglass-split"></i> Đang đọc file Word...');
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const nb = qbParseWord(result.value);
    if (!nb.length) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Không nhận diện được câu hỏi nào. Mỗi câu phải bắt đầu bằng thẻ [MCQ] [MULTI] [TF] [FILL] hoặc [ESSAY].');
    qbBlocks.push(...nb); qbRender();
    const skipped = nb.filter(b => b._needsCheck).length;
    qbNote(`<i class="bi bi-stars"></i> Đã nhập ${nb.length} câu từ Word!${skipped ? ` (${skipped} câu chưa rõ đáp án đúng — đã tạm đánh dấu đáp án A, hãy kiểm tra lại)` : ''}`);
  } catch (err) { qbNote('<i class="bi bi-x-circle-fill"></i> Lỗi đọc file Word: ' + escapeHtml(err.message || 'không xác định')); }
}
function qbParseWord(text) {
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tagRe = /^\[(MCQ|MULTI|TF|FILL|ESSAY)\]\s*(.*)/i, pointsRe = /^Điểm\s*:\s*([\d.]+)/i, explainRe = /^Giải thích\s*:\s*(.*)/i,
    fillAnsRe = /^Đáp án\s*(\d+)?\s*:\s*(.*)/i, optRe = /^([A-Da-d])[\.\)]\s+(.*)/;
  const out = []; let cur = null, explainMode = false;
  function push() {
    if (!cur) return;
    if (cur.type === 'mcq' || cur.type === 'tf' || cur.type === 'multi') {
      const c = cur.options.filter(o => o.correct).length;
      if (c === 0 && cur.options.length) { cur.options[0].correct = true; cur._needsCheck = true; }
      if (cur.type !== 'multi' && c > 1) { let kept = false; cur.options.forEach(o => { if (o.correct) { if (kept) o.correct = false; else kept = true; } }); }
    }
    out.push(cur); cur = null; explainMode = false;
  }
  rawLines.forEach(line => {
    const tm = line.match(tagRe);
    if (tm) {
      push(); const type = tm[1].toLowerCase();
      cur = { id: qbNewId(), type, content: qbEsc(tm[2] || ''), points: type === 'essay' ? 5 : 1, explanation: '' };
      if (type === 'mcq' || type === 'multi' || type === 'tf') cur.options = [];
      if (type === 'fill') cur.blanks = {};
      return;
    }
    if (!cur) return;
    const pm = line.match(pointsRe); if (pm) { cur.points = parseFloat(pm[1]) || cur.points; explainMode = false; return; }
    const em = line.match(explainRe); if (em) { cur.explanation = qbEsc(em[1] || ''); explainMode = true; return; }
    if (explainMode) { cur.explanation += ' ' + qbEsc(line); return; }
    const fm = line.match(fillAnsRe);
    if (fm && cur.type === 'fill') { const g = qbGaps(cur.content); cur.blanks[fm[1] ? parseInt(fm[1]) : (g[0] || 1)] = fm[2].trim(); return; }
    if (cur.type === 'mcq' || cur.type === 'multi' || cur.type === 'tf') {
      const om = line.match(optRe); let t = om ? om[2] : line, correct = false;
      if (/\*\s*$/.test(t)) { correct = true; t = t.replace(/\*\s*$/, '').trim(); }
      cur.options.push({ id: (om ? om[1].toLowerCase() : String.fromCharCode(97 + cur.options.length)) + Math.random().toString(36).slice(2, 6), text: qbEsc(t), correct });
      return;
    }
    cur.content += ' ' + qbEsc(line);
  });
  push();
  return out.filter(b => (b.options ? b.options.length >= 2 : true) && (b.type !== 'fill' || qbGaps(b.content).length > 0));
}
document.addEventListener('DOMContentLoaded', () => { qbRender(); });

