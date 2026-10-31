/* Dual WYSIWYG / HTML editor, shared by teacher question blocks and admin exam questions. */
(function (w) {
 'use strict';
 const escape = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function button(id,prefix='qc-') {
   const selector=prefix+id;
   return `<div class="rue-tabs" data-rue-for="${escape(selector)}"><button type="button" data-rue-visual="${escape(selector)}" onclick="RUEditor.toggle('${escape(selector)}','visual')" class="rue-selected">✎ Trực quan</button><button type="button" data-rue-html="${escape(selector)}" onclick="RUEditor.toggle('${escape(selector)}','html')">&lt;/&gt; HTML</button><span>Đổi chế độ để thiết kế bố cục, bảng, màu sắc, hình ảnh…</span></div>`;
 }
 function sanitize(html) { return w.RUPreview?.clean ? w.RUPreview.clean(html) : String(html || ''); }
 function fieldUpdate(id,kind,value) {
   if(kind==='qb' && typeof w.qbUpdate==='function') w.qbUpdate(id,'content',value);
   if(kind==='qb' && typeof w.qbUpdate!=='function') return;
   if(kind==='qc' && typeof w.updateField==='function') w.updateField(id,'content',value);
 }
 function toggle(selector,mode) {
   const visual=document.getElementById(selector),tabs=document.querySelector(`[data-rue-for="${CSS.escape(selector)}"]`);
   if(!visual || !tabs) return;
   let ta=visual.nextElementSibling;
   if(!ta || !ta.matches('textarea.rue-source')) { ta=document.createElement('textarea');ta.className='rue-source';ta.setAttribute('aria-label','Nội dung câu hỏi bằng HTML');ta.spellcheck=false;visual.insertAdjacentElement('afterend',ta); }
   if(mode==='html') {
      ta.value=sanitize(visual.innerHTML);
      visual.style.display='none';ta.style.display='block';
   } else {
      const html=sanitize(ta.value);visual.innerHTML=html;
      visual.style.display='';ta.style.display='none';
      fieldUpdate(selector.slice(3),selector.slice(0,2),html);
      visual.dispatchEvent(new Event('input',{bubbles:true}));
   }
   tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('rue-selected',!!b.dataset[mode==='html'?'rueHtml':'rueVisual']));
   ta.oninput=()=>fieldUpdate(selector.slice(3),selector.slice(0,2),sanitize(ta.value));
 }
 w.RUEditor={button,toggle,sanitize};
})(window);
