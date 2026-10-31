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
