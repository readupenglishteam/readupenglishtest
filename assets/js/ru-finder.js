/* ReadUp Floating Dictionary v4: shared across every HTML page. No external JS dependency. */
(function () {
  'use strict';
  if (window.RUFinder) return;
  const tr = (en, vi) => window.RULang?.current() === 'vi' ? vi : en;
  // Inline, Bootstrap-like SVG icons keep this new tool readable even when the CDN is unavailable.
  const paths = {
    translate: '<rect x="2.5" y="2.5" width="13" height="15" rx="2"/><rect x="9" y="8.5" width="12.5" height="13" rx="2" fill="currentColor" stroke="none"/><text x="9" y="13.6" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor" stroke="none">A</text><text x="15.2" y="18.5" text-anchor="middle" font-size="8.4" font-weight="800" fill="white" stroke="none">文</text>',
    search: '<circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/>',
    'x-lg':'<path d="M5 5l14 14M19 5 5 19"/>',
    clipboard:'<rect x="5" y="4" width="15" height="18" rx="2"/><path d="M9 4.5V3h7v3H9z"/>',
    'journal-plus':'<rect x="5" y="3" width="16" height="19" rx="2"/><path d="M2 7h6M2 12h6M11 13h7M14.5 9.5v7"/>',
    'volume-up':'<path d="M3 10v5h4l5 4V5L7 10H3zM15 9c2 2 2 5 0 7M18 6c4 4 4 9 0 13"/>',
    'box-arrow-up-right':'<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M11 4h10v10M21 4 10 15"/>'
  };
  const icon = name => `<svg class="ru-dict-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.search}</svg>`;
  const state = { term: '', token: 0, audio: null, results: null, controller: null };
  let root, panel, input, target, output, button;
  const safeURL = url => {try {const u = new URL(url, location.href); return u.protocol === 'https:' ? u.href : null;} catch {return null;}};
  const text = (selector, value) => {const e = root.querySelector(selector); if(e) e.textContent = value;};

  function init() {
    if (document.getElementById('ru-dictionary-root')) return;
    root = document.createElement('div');
    root.id = 'ru-dictionary-root';
    root.setAttribute('data-ru-i18n-skip', 'true');
    root.innerHTML = `
      <aside id="ru-dictionary-panel" class="ru-dict-panel" role="dialog" aria-modal="false" aria-labelledby="ru-dict-title" hidden>
        <header class="ru-dict-head"><div class="ru-dict-heading">${icon('translate')}<strong id="ru-dict-title"></strong></div><button class="ru-dict-iconbtn" type="button" id="ru-dict-close" aria-label="Close">${icon('x-lg')}</button></header>
        <div class="ru-dict-body">
          <form id="ru-dict-form" class="ru-dict-search" autocomplete="off"><label class="ru-dict-sr" for="ru-dict-term">Word or phrase</label><div class="ru-dict-field"><input id="ru-dict-term" type="search" maxlength="250" spellcheck="false" placeholder="Type or select a word..."></div><button class="ru-dict-primary" type="submit">${icon('search')}<span id="ru-dict-lookuplabel"></span></button></form>
          <div class="ru-dict-row"><label for="ru-dict-target" id="ru-dict-targetlabel"></label><select id="ru-dict-target"><option value="vi">Vietnamese</option><option value="en">English</option><option value="fr">French</option><option value="ja">Japanese</option><option value="ko">Korean</option></select></div>
          <div id="ru-dict-result" class="ru-dict-result" aria-live="polite"></div>
          <div class="ru-dict-links" id="ru-dict-links"></div>
          <div class="ru-dict-actions"><button type="button" id="ru-dict-copy">${icon('clipboard')}<span></span></button><button type="button" id="ru-dict-note" class="ru-dict-primary">${icon('journal-plus')}<span></span></button></div>
        </div>
      </aside>
      <button type="button" id="ru-dictionary-fab" class="ru-dict-fab" aria-label="Open dictionary" title="Open dictionary" aria-expanded="false" aria-controls="ru-dictionary-panel">${icon('translate')}<span class="ru-dict-dot" aria-hidden="true" hidden></span></button>`;
    document.body.append(root);
    panel = root.querySelector('#ru-dictionary-panel');
    button = root.querySelector('#ru-dictionary-fab');
    input = root.querySelector('#ru-dict-term');
    target = root.querySelector('#ru-dict-target');
    output = root.querySelector('#ru-dict-result');
    button.addEventListener('click', () => panel.hidden ? open() : close());
    root.querySelector('#ru-dict-close').addEventListener('click', close);
    root.querySelector('#ru-dict-form').addEventListener('submit', e => {e.preventDefault(); lookup();});
    target.addEventListener('change', () => {if(input.value.trim()) lookup();});
    root.querySelector('#ru-dict-copy').addEventListener('click', copy);
    root.querySelector('#ru-dict-note').addEventListener('click', saveNote);
    root.addEventListener('click', e => {const b=e.target.closest('[data-ru-audio]');if(b) pronounce();});
    document.addEventListener('keydown', e => {if(e.key==='Escape' && !panel.hidden)close();});
    // Remember selected text, but never obscure the selection with a modal.
    document.addEventListener('pointerup', e => {
      if(e.target.closest?.('#ru-dictionary-root,#textSelectionMenu,[contenteditable],input,textarea,select'))return;
      setTimeout(() => {
        const s = window.getSelection();
        const value = s && !s.isCollapsed ? s.toString().trim() : '';
        if(value && value.length < 251) prefill(value);
      }, 0);
    });
    window.addEventListener('ru-language-change', updateLabels);
    updateLabels();
  }
  function updateLabels(){
    if(!root)return;
    text('#ru-dict-title', tr('Look up / Translate','Tra cứu / Dịch'));
    text('#ru-dict-lookuplabel', tr('Look up','Tra cứu'));
    text('#ru-dict-targetlabel', tr('Translate to','Dịch sang'));
    root.querySelector('#ru-dict-term').placeholder=tr('Type or select a word...','Nhập hoặc chọn từ...');
    root.querySelector('#ru-dictionary-fab').setAttribute('aria-label',tr('Open dictionary','Mở từ điển'));
    root.querySelector('#ru-dictionary-fab').title=tr('Open dictionary','Mở từ điển');
    root.querySelector('#ru-dict-copy span').textContent=tr('Copy','Sao chép');
    root.querySelector('#ru-dict-note span').textContent=tr('Add to note','Lưu ghi chú');
    root.querySelector('#ru-dict-close').setAttribute('aria-label',tr('Close','Đóng'));
    const names={vi:tr('Vietnamese','Tiếng Việt'),en:tr('English','Tiếng Anh'),fr:tr('French','Tiếng Pháp'),ja:tr('Japanese','Tiếng Nhật'),ko:tr('Korean','Tiếng Hàn')};
    Array.from(target.options).forEach(o=>o.textContent=names[o.value]);
    if(!state.results && !input.value)renderStatus(tr('Select a word in a reading passage or type a word above.','Chọn từ trong bài đọc hoặc nhập từ vào ô phía trên.'));
  }
  function prefill(term){
    const clean=String(term||'').trim().replace(/\s+/g,' ').slice(0,250);
    if(!clean)return;
    state.term=clean;
    if(!panel.hidden && input.value !== clean){input.value=clean;lookup();}
    button.querySelector('.ru-dict-dot').hidden=false;
  }
  function open(term){
    if(!root)init();
    const supplied=String(term || '').trim();if(supplied)prefill(supplied);
    panel.hidden=false;button.setAttribute('aria-expanded','true');
    if(state.term)input.value=state.term;
    if(input.value.trim() && (!state.results || state.results.term!==input.value.trim())) lookup();
    else if(!input.value.trim())renderStatus(tr('Select a word in the text or type a word to look it up.','Chọn từ trong văn bản hoặc nhập từ để tra cứu.'));
    if(!input.value) input.focus({preventScroll:true});
  }
  function close(){
    panel.hidden=true;button.setAttribute('aria-expanded','false');
    if(state.controller)state.controller.abort();state.token++;
    button.focus({preventScroll:true});
  }
  function renderStatus(message){output.replaceChildren();const el=document.createElement('p');el.className='ru-dict-status';el.textContent=message;output.append(el);}
  function create(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;}
  function makeLinks(term,lang){
    const q=encodeURIComponent(term), isEn=/^[\p{Script=Latin}\s'’-]+$/u.test(term);
    const links=[
      ['Oxford',`https://www.oxfordlearnersdictionaries.com/search/english/?q=${q}`],
      ['Cambridge',`https://dictionary.cambridge.org/dictionary/english/${q}`],
      ['Cambridge EN–VI',`https://dictionary.cambridge.org/dictionary/english-vietnamese/${q}`],
      ['Google Translate',`https://translate.google.com/?sl=auto&tl=${encodeURIComponent(lang)}&text=${q}&op=translate`],
      ['DeepL',`https://www.deepl.com/translator#auto/${encodeURIComponent(lang)}/${q}`]
    ];
    const holder=root.querySelector('#ru-dict-links');holder.replaceChildren();
    links.forEach(([name,url])=>{const a=create('a','ru-dict-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.innerHTML=icon('box-arrow-up-right');a.append(document.createTextNode(' '+name));holder.append(a);});
  }
  async function fetchJson(url, signal){const r=await fetch(url,{signal});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
  async function lookup(){
    const term=input.value.trim().replace(/\s+/g,' ').slice(0,250);if(!term)return;
    state.term=term;state.results=null;state.audio=null;
    button.querySelector('.ru-dict-dot').hidden=true;
    const lang=target.value, token=++state.token;
    if(state.controller)state.controller.abort();
    const ac=new AbortController();state.controller=ac;
    const timeout=setTimeout(()=>ac.abort(),8500);
    renderStatus(tr('Looking up word and meaning…','Đang tra cứu từ và nghĩa…'));
    makeLinks(term,lang);
    const single=/^[a-zA-Z][a-zA-Z'’-]{0,55}$/.test(term);
    const enToVi=lang==='vi', vietnameseInput=/[ăâđêôơưĂÂĐÊÔƠƯ\u0300-\u036f]/.test(term);
    const pair=lang==='en'&&vietnameseInput?'vi|en':`en|${lang}`;
    // Independent requests: English definitions still render even if translation service is unavailable.
    const jobs=[fetchJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(term.slice(0,450))}&langpair=${encodeURIComponent(pair)}`,ac.signal).catch(()=>null),
      single?fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`,ac.signal).catch(()=>null):Promise.resolve(null)];
    const [translated, dictionary] = await Promise.all(jobs).catch(()=>[null,null]);
    clearTimeout(timeout);
    if(token!==state.token || panel.hidden)return;
    const translation = typeof translated?.responseData?.translatedText === 'string' && Number(translated?.responseStatus) < 400 ? translated.responseData.translatedText.trim() : '';
    const entry=Array.isArray(dictionary) ? dictionary[0] : null;
    state.results={term,lang,translation,entry};
    renderResults(state.results);
  }
  function renderResults(data){
    output.replaceChildren();
    const {term,lang,translation,entry}=data;
    output.append(create('div','ru-dict-caption',tr('Meaning / translation','Nghĩa / bản dịch')));
    output.append(create('div','ru-dict-meaning',translation||tr('Translation temporarily unavailable','Chưa lấy được bản dịch')));
    if(entry){
      const name=create('div','ru-dict-wordline');
      const word=create('strong','',entry.word||term);name.append(word);
      const phonetic=entry.phonetic||entry.phonetics?.find(p=>p.text)?.text;
      if(phonetic)name.append(create('span','ru-dict-ipa',phonetic));
      state.audio=safeURL(entry.phonetics?.find(p=>p.audio)?.audio?.replace(/^\/\//,'https://'));
      const speaker=create('button','ru-dict-audio');speaker.type='button';speaker.dataset.ruAudio='true';speaker.title=tr('Pronounce','Phát âm');speaker.setAttribute('aria-label',tr('Pronounce','Phát âm'));speaker.innerHTML=icon('volume-up');name.append(speaker);output.append(name);
      const meaningful=(entry.meanings||[]).slice(0,3);
      meaningful.forEach(group=>{
        output.append(create('div','ru-dict-part',group.partOfSpeech||''));
        const list=create('ol','ru-dict-definitions');
        (group.definitions||[]).slice(0,2).forEach(d=>{
          const item=create('li','',d.definition||'');
          if(d.example)item.append(create('em','ru-dict-example',d.example));
          list.append(item);
        });
        output.append(list);
      });
    } else {
      output.append(create('p','ru-dict-status',tr('English definitions may not be available for this phrase. Use the dictionary links below.','Có thể không có định nghĩa tiếng Anh cho cụm từ này. Hãy dùng các liên kết từ điển bên dưới.')));
    }
    if(!translation){output.append(create('p','ru-dict-status',tr('Translation service may be unavailable or rate-limited. External dictionaries still work.','Dịch vụ dịch có thể bị gián đoạn hoặc giới hạn lượt dùng. Các liên kết từ điển vẫn hoạt động.')));}
  }
  function pronounce(){
    if(state.audio){const audio=new Audio(state.audio);audio.play().catch(()=>speak());}else speak();
  }
  function speak(){
    if(!('speechSynthesis' in window))return;
    const u=new SpeechSynthesisUtterance(state.results?.term||input.value);u.lang='en-US';u.rate=.9;
    window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
  }
  function copy(){
    const data=state.results;
    const value=data ? `${data.term} — ${data.translation||''}\n${(data.entry?.meanings||[]).slice(0,1).flatMap(g=>(g.definitions||[]).slice(0,2).map(d=>d.definition)).join('\n')}` : input.value;
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).catch(()=>fallbackCopy(value));else fallbackCopy(value);
  }
  function fallbackCopy(value){const a=create('textarea');a.value=value;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();document.execCommand('copy');a.remove();}
  function saveNote(){
    const data=state.results;const term=data?.term||input.value.trim();if(!term)return;
    const key='readup-notes:'+location.pathname+location.search;
    try { const existing=JSON.parse(localStorage.getItem(key)||'{}');existing[term]=`${data?.translation||''}${data?.entry?.meanings?.[0]?.definitions?.[0]?.definition?' — '+data.entry.meanings[0].definitions[0].definition:''}`.trim();localStorage.setItem(key,JSON.stringify(existing));text('#ru-dict-note span',tr('Saved!','Đã lưu!'));setTimeout(updateLabels,1300); }
    catch{ text('#ru-dict-note span',tr('Cannot save','Không lưu được')); }
  }
  window.RUFinder={open,close,prefill,lookup:term=>{open(term);lookup();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
