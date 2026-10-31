/* Identical primary menu order across ReadUp pages; preserve section links. */
(function(){
 'use strict';
 const main=[['post.html','bi-book','Bài Học (Post)','post'],['assignment.html','bi-star-fill','Assignment (VIP)','assignment'],['lml.html','bi-collection-fill','Learning Materials Library','lml'],['vocab.html','bi-translate','Vocabulary','vocab']];
 const page=location.pathname.split('/').pop().toLowerCase();
 const items=()=>main.map(([url,icon,label,tone])=>`<a class="ru-nav-item ru-nav-${tone}${page===url?' ru-nav-current':''}" href="${url}"${page===url?' aria-current="page"':''}><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('');
 const home=()=>page!=='dashboard.html'?'<div class="ru-nav-sep"></div><a class="ru-nav-item ru-nav-home" href="dashboard.html"><i class="bi bi-house-door"></i><span>Trang chủ Dashboard</span></a>':'';
 function init(){
  document.body.classList.add('ru-refined');
  let menu=document.getElementById('sectionNavMenu');
  if(menu){
   const local=Array.from(menu.children).filter(el=>{
     if(el.matches('p') || (el.matches('div')&&el.classList.contains('border-t')))return false;
     if(el.matches('a[href]')){const href=el.getAttribute('href');if(main.some(([u])=>href===u)||href==='dashboard.html')return false;}
     return true;
   });
   menu.replaceChildren();menu.insertAdjacentHTML('beforeend','<p class="ru-nav-label">Điều hướng chính</p>'+items()+home());
   if(local.length){menu.insertAdjacentHTML('beforeend','<div class="ru-nav-sep"></div><p class="ru-nav-label">Trong trang này</p>');local.forEach(el=>{el.classList.add('ru-nav-local');menu.appendChild(el);});}
   menu.classList.add('ru-nav-menu');menu.setAttribute('aria-label','Điều hướng ReadUp');return;
  }
  if(!['teacher.html','admin.html','lml.html','editlml.html','room.html'].includes(page))return;
  const header=document.querySelector('header');const bar=header?.querySelector('.max-w-7xl');const controls=bar?.lastElementChild;if(!controls)return;
  const wrap=document.createElement('div');wrap.className='ru-nav-holder';wrap.innerHTML='<button type="button" class="ru-nav-trigger" aria-label="Mở menu" aria-expanded="false"><i class="bi bi-list"></i><span>Menu</span></button><div class="ru-nav-menu ru-nav-flyout hidden"><p class="ru-nav-label">Điều hướng chính</p>'+items()+home()+'</div>';controls.prepend(wrap);
  const button=wrap.querySelector('button'),fly=wrap.querySelector('.ru-nav-flyout');
  button.addEventListener('click',e=>{e.stopPropagation();const opened=fly.classList.toggle('hidden')===false;button.setAttribute('aria-expanded',String(opened));});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target)){fly.classList.add('hidden');button.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){fly.classList.add('hidden');button.setAttribute('aria-expanded','false');}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
