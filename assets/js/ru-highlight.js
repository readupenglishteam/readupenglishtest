/* Shared highlighting and dictionary panel for reading & assignment. */
(function (w) {
  'use strict';
  const colors={yellow:'#fff176',green:'#c8e6c9',blue:'#bbdefb',pink:'#f8bbd0',orange:'#ffe0b2',purple:'#e1bee7'};
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let range=null,mark=null,selectionText='',latestTerm='';
  const menu=document.getElementById('textSelectionMenu');
  if(!menu)return;
  menu.className='ruhl-menu hidden';
  const swatches=Object.entries(colors).map(([name,value])=>`<button type="button" class="ruhl-color" data-ruhl-color="${name}" style="background:${value}">${name[0].toUpperCase()+name.slice(1)}</button>`).join('');
  menu.innerHTML=`<h3>Highlight color</h3><div class="ruhl-swatches">${swatches}</div><div class="ruhl-actions"><button type="button" data-ruhl-action="copy">▢ Copy</button><button type="button" data-ruhl-action="lookup">▣ Look up</button><button type="button" data-ruhl-action="note">▤ Note</button><button type="button" id="btnRemoveHighlight" data-ruhl-action="remove">⌫ Remove highlight</button><button type="button" data-ruhl-action="clear">♜ Clear all highlights</button></div>`;
  const dialog=document.createElement('div');dialog.id='ruhlDialog';dialog.className='ruhl-modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Tra cứu và dịch từ vựng');
  dialog.innerHTML=`<div class="ruhl-panel"><div class="ruhl-modalhead"><strong>▣ Look up / Translate</strong><button type="button" data-ruhl-close aria-label="Đóng">✕</button></div><div class="ruhl-modalbody"><textarea id="ruhlTerm" rows="2" placeholder="Nhập từ hoặc cụm từ tiếng Anh"></textarea><div class="ruhl-translatebar"><select id="ruhlLanguage" aria-label="Ngôn ngữ đích"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="fr">Français</option><option value="ja">日本語</option><option value="ko">한국어</option></select><button type="button" data-ruhl-search>⌕ Look up</button></div><p class="ruhl-caption">Meaning / translation</p><div id="ruhlMeaning" class="ruhl-meaning" aria-live="polite">Chọn từ để tra cứu.</div><div class="ruhl-links" id="ruhlLinks"></div><div class="ruhl-modalfoot"><button type="button" data-ruhl-copy>▢ Copy</button><button type="button" data-ruhl-addnote>▤ Add to note</button></div><p class="ruhl-privacy">Dịch nhanh sử dụng dịch vụ bên thứ ba (MyMemory). Không gửi đoạn văn nếu bạn chưa chọn tra cứu.</p></div></div>`;
  document.body.append(dialog);
  function validSelection(sel) {
    if(!sel || sel.isCollapsed || !sel.rangeCount) return false;
    const node=sel.getRangeAt(0).commonAncestorContainer;
    const elem=node.nodeType===3?node.parentElement:node;
    return !!elem?.closest?.('[data-rd-passage], #passageContent, #questionsForm, #questionArea');
  }
  function getRange(){const s=w.getSelection();if(validSelection(s))return s.getRangeAt(0).cloneRange();return range;}
  function remember(){const s=w.getSelection();if(validSelection(s)){range=s.getRangeAt(0).cloneRange();selectionText=range.toString().trim();mark=null;}}
  document.addEventListener('selectionchange',remember);
  function getText(){return mark?.textContent?.trim()||selectionText||range?.toString().trim()||'';}
  function hide(){menu.classList.add('hidden');}
  function paint(color){
    if(mark && mark.isConnected){mark.style.backgroundColor=colors[color];mark.dataset.ruhlColor=color;hide();return;}
    const r=getRange();if(!r || r.collapsed){hide();return;}
    const el=document.createElement('mark');el.className='highlight-item';el.dataset.ruhlColor=color;el.style.backgroundColor=colors[color];el.style.color='#18202c';el.style.borderRadius='3px';el.style.padding='0 2px';
    try {el.appendChild(r.extractContents());r.insertNode(el);mark=el;selectionText=el.textContent.trim();w.getSelection()?.removeAllRanges();range=null;}catch(e){console.warn('[ReadUp] Không thể tô vùng lựa chọn này',e);}
    hide();
  }
  function selectedMarkFromEvent(e){const m=e.target.closest?.('mark.highlight-item');if(m){
    mark=m;selectionText=m.textContent.trim();range=null;
    const rect=m.getBoundingClientRect(),h=menu.offsetHeight||320,width=menu.offsetWidth||370;
    menu.classList.remove('hidden');
    menu.style.top=Math.max(10,rect.top-h-12)+'px';
    if(rect.top-h<12)menu.style.top=Math.min(window.innerHeight-h-12,rect.bottom+10)+'px';
    menu.style.left=Math.min(window.innerWidth-width/2-12,Math.max(width/2+12,rect.left+rect.width/2))+'px';
    document.getElementById('btnRemoveHighlight')?.classList.remove('hidden');
  }}
  document.addEventListener('click',selectedMarkFromEvent);
  function unwrap(m){if(!m||!m.isConnected)return;const p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);m.remove();p.normalize();}
  function remove(){if(mark){unwrap(mark);mark=null;}hide();}
  function clear(){const area=document.querySelector('#passageContent') || document.querySelector('#questionArea');if(!area)return;
     const wraps=[...document.querySelectorAll('#passageContent mark.highlight-item, #questionsForm mark.highlight-item, #questionArea mark.highlight-item, [data-rd-passage] mark.highlight-item')];
     if(wraps.length && !w.confirm('Xóa tất cả phần đã highlight trên trang này?'))return;
     wraps.reverse().forEach(unwrap);mark=null;hide();}
  function copy(t){if(!t)return; if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t));else fallbackCopy(t);hide();}
  function fallbackCopy(t){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();document.execCommand('copy');a.remove();}
  function note(){const t=getText();if(!t)return;const existing=mark?.dataset.ruhlNote||'';const content=w.prompt('Ghi chú cho: '+t,existing);if(content===null)return;
    if(!mark && range && !range.collapsed)paint('yellow');
    if(mark && mark.isConnected){mark.dataset.ruhlNote=content;mark.title=content||'';}
    const key='readup-notes:'+location.pathname+location.search;
    try{const data=JSON.parse(localStorage.getItem(key)||'{}');if(content)data[t]=content;else delete data[t];localStorage.setItem(key,JSON.stringify(data));}catch(e){}
    hide();}
  function openLookup(){const t=getText();if(!t)return;latestTerm=t;dialog.classList.add('ruhl-open');document.getElementById('ruhlTerm').value=t;hide();lookup();}
  function closeLookup(){dialog.classList.remove('ruhl-open');}
  let requestId=0;
  async function lookup(){const term=document.getElementById('ruhlTerm').value.trim().slice(0,400);if(!term)return;
    latestTerm=term;const lang=document.getElementById('ruhlLanguage').value;const result=document.getElementById('ruhlMeaning');result.textContent='Đang tra cứu…';
    const urls=[['Oxford',`https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(term)}`],['Cambridge',`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(term)}`],['Cambridge EN–VI',`https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(term)}`],['Google Translate',`https://translate.google.com/?sl=en&tl=${encodeURIComponent(lang)}&text=${encodeURIComponent(term)}&op=translate`],['DeepL',`https://www.deepl.com/translator#en/${encodeURIComponent(lang)}/${encodeURIComponent(term)}`]];
    document.getElementById('ruhlLinks').innerHTML=urls.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">↗ ${esc(name)}</a>`).join('');
    const run=++requestId, controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
    try {
      const pair=(lang==='en'?'vi|en':'en|'+lang);
      const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(term)}&langpair=${encodeURIComponent(pair)}`,{signal:controller.signal});
      if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(run!==requestId)return;
      const translated=data?.responseData?.translatedText;
      result.textContent=translated&&String(translated).trim() ? String(translated) : 'Không có bản dịch. Bạn có thể chọn từ điển bên dưới.';
    }catch(e){if(run===requestId)result.textContent='Chưa tải được bản dịch tự động. Hãy dùng các từ điển bên dưới.';}finally{clearTimeout(timer);}
  }
  menu.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
  menu.addEventListener('click',e=>{
    const color=e.target.closest('[data-ruhl-color]');if(color){paint(color.dataset.ruhlColor);return;}
    const btn=e.target.closest('[data-ruhl-action]');if(!btn)return;
    ({copy:()=>copy(getText()),lookup:openLookup,note,remove,clear})[btn.dataset.ruhlAction]?.();
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-ruhl-close]'))closeLookup();if(e.target.closest('[data-ruhl-search]'))lookup();if(e.target.closest('[data-ruhl-copy]'))copy(document.getElementById('ruhlMeaning').textContent);if(e.target.closest('[data-ruhl-addnote]')){selectionText=latestTerm;note();closeLookup();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLookup();hide();}});
  // Old highlight event handlers still place the floating menu for passages. Extend selection to question text as well.
  document.addEventListener('mouseup',e=>{
    if(e.target.closest?.('#textSelectionMenu,#ruhlDialog'))return;
    const s=w.getSelection();if(!validSelection(s))return;
    remember();const rect=s.getRangeAt(0).getBoundingClientRect();if(!rect.width)return;
    menu.classList.remove('hidden');const h=menu.offsetHeight||330,wid=menu.offsetWidth||360;
    menu.style.top=Math.max(12,rect.top-h-12)+'px';
    if(rect.top-h<12)menu.style.top=Math.min(window.innerHeight-h-12,rect.bottom+10)+'px';
    menu.style.left=Math.min(window.innerWidth-wid/2-12,Math.max(wid/2+12,rect.left+rect.width/2))+'px';
  });
  w.RUHighlight={lookup,paint,remove,clear};
})(window);
