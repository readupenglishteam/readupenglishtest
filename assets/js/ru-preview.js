/* ReadUp teacher/admin question preview: no submissions, no score writes. */
(function (w) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed = new Set('P BR DIV SPAN B STRONG I EM U S SUB SUP H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE HR TABLE THEAD TBODY TFOOT TR TH TD IMG A FONT SMALL BIG CODE PRE MARK SECTION ARTICLE AUDIO SOURCE VIDEO FIGURE FIGCAPTION'.split(' '));
  const drop = new Set('SCRIPT STYLE IFRAME OBJECT EMBED FORM INPUT TEXTAREA BUTTON SELECT OPTION SVG MATH LINK META BASE TEMPLATE'.split(' '));
  const styleOK = /^(color|background-color|font-family|font-size|font-weight|font-style|text-decoration|text-align|line-height|letter-spacing|border|border-color|border-width|border-style|border-radius|padding|padding-left|padding-right|padding-top|padding-bottom|margin|margin-left|margin-right|margin-top|margin-bottom|width|max-width|min-width|height|vertical-align|list-style-type|white-space)$/i;
  function clean(html) {
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    function walk(node) {
      for (const child of Array.from(node.children)) {
        if (drop.has(child.tagName)) { child.remove(); continue; }
        if (!allowed.has(child.tagName)) { walk(child); child.replaceWith(...Array.from(child.childNodes)); continue; }
        for (const a of Array.from(child.attributes)) {
          const k = a.name.toLowerCase(), v = a.value.trim();
          if (k.startsWith('on') || k === 'srcdoc') { child.removeAttribute(a.name); continue; }
          if (k === 'style') {
            const safe = v.split(';').map(x => x.trim()).filter(x => {
              const p = x.split(':'); return p.length === 2 && styleOK.test(p[0].trim()) && !/url\s*\(|expression\s*\(|@import|[<>\\]/i.test(p[1]);
            }).join(';');
            if (safe) child.setAttribute('style', safe); else child.removeAttribute('style');
          } else if (k === 'href' || k === 'src') {
            if (!/^(https?:\/\/|\/[^/]|#|data:image\/(png|jpeg|gif|webp);base64,|data:audio\/(mpeg|mp3|wav|ogg);base64,)/i.test(v)) child.removeAttribute(a.name);
          } else if (!['class','title','alt','width','height','colspan','rowspan','align','target','rel','controls','poster','type','start'].includes(k)) child.removeAttribute(a.name);
        }
        if (child.tagName === 'A') child.setAttribute('rel','noopener noreferrer');
        walk(child);
      }
    }
    walk(doc.body); return doc.body.innerHTML;
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
  w.RUPreview={open,close,setMode,clean};
})(window);
