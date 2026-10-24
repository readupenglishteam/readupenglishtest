
/* Bé mèo trên header Dashboard: trò chuyện vui + giới thiệu chức năng */
(function(){
  var cat=document.getElementById('ruLie'), say=document.getElementById('ruSay');
  if(!cat||!say)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
    cat.querySelectorAll('animateTransform').forEach(function(n){n.remove();});
  }
  var t=null, timer=null, curGo=null, bag=[];
  function userName(){
    var w=document.getElementById('welcomeUser'), m=((w&&w.textContent)||'').match(/Chào,\s*(.+)$/);
    if(!m)return ''; var p=m[1].trim().split(/\s+/); return p[p.length-1];
  }
  function greet(){
    var h=new Date().getHours(), n=userName();
    var p=h<11?'Chào buổi sáng ☀️':h<14?'Chào buổi trưa 🍜':h<18?'Chào buổi chiều 🌤️':'Chào buổi tối 🌙';
    return {t:p+(n?', '+n:'')+'! Hôm nay mình học gì nào? 🐾'};
  }
  var FEAT=[
    {t:'Làm thử một bài Reading hôm nay nhé? Danh sách bài thi ở đây nè 📖',go:'section-bai-thi'},
    {t:'Từ vựng nhớ lâu hơn khi gõ đáp án. Vào "Từ Vựng Của Tôi" ôn vài từ nha 🧠',go:'vocab.html'},
    {t:'Mình là fan của AI Speaking Assistant đó, luyện nói đi bạn ơi 🎤',go:'section-speaking'},
    {t:'Luyện Phát Âm có biểu đồ tiến bộ, nhìn là mê luôn! 📈',go:'section-luyen-am'},
    {t:'Rủ bạn bè luyện tập cùng, thi đấu vui hơn nhiều 👯',go:'section-nhom'},
    {t:'Xem Lịch Học để không lỡ bài thi nào nha 📅',go:'section-lich-hoc'},
    {t:'Có tin tức và thông báo mới đó, ghé xem chút nhé 📰',go:'section-tin-tuc'},
    {t:'Xem lại Lịch Sử & Kết Quả để biết mình tiến bộ cỡ nào 📊',go:'section-lich-su'},
    {t:'Bài tập VIP đang chờ bạn ở trang Assignment ⭐',go:'assignment.html'},
    {t:'Kẹt chỗ nào cứ bấm Hỗ trợ trực tuyến, có người giúp liền 🙋',go:'fn:openSupportModal'}
  ];
  var FUN=[
    {t:'Meo~ uống nước chưa? Học 25 phút nghỉ 5 phút nha 💧'},
    {t:'Mỗi ngày một bài Reading, giỏi lên thấy rõ! 🔥'},
    {t:'Menu 3 gạch bên phải có lối tắt tới mọi mục đó, thử xem! ☰'},
    {t:'Gặp từ mới thì ghi lại liền, đừng để não nó trốn mất ✍️'},
    {t:'Mình ngủ gật hoài nhưng vẫn cổ vũ bạn hết mình 💤'},
    {t:'Cố lên, bạn làm được mà! Mình canh ở đây nè 💪'},
    {t:'Đọc câu hỏi trước rồi mới đọc bài, mẹo nhỏ nè 😼'},
    {t:'Bạn học giỏi lắm rồi, thư giãn một chút cũng được 🌈'}
  ];
  function next(){
    if(!bag.length){ bag=FEAT.concat(FUN).sort(function(){return Math.random()-.5;}); }
    for(var i=0;i<bag.length;i++){ var c=bag[i]; if(canGo(c)){ bag.splice(i,1); return c; } }
    return bag.shift();
  }
  function canGo(c){
    if(!c.go)return true;
    if(/^section-/.test(c.go)){ var e=document.getElementById(c.go); return !!(e&&e.offsetParent!==null); }
    if(/^fn:/.test(c.go)) return typeof window[c.go.slice(3)]==='function';
    return true;
  }
  function place(){
    var r=cat.getBoundingClientRect(), w=say.offsetWidth, sx=Math.min(0,innerWidth-10-(r.left+w));
    sx=Math.max(sx,10-r.left); say.style.left=sx+'px'; say.style.setProperty('--ax',Math.max(16,Math.min(w-16,r.width/2-sx))+'px');
  }
  function speak(c,ms){
    var go=c.go&&canGo(c)?c.go:null; curGo=go;
    say.textContent=c.t;
    if(go){ var m=document.createElement('span'); m.className='ru-more'; m.textContent='Xem ngay ›'; say.appendChild(m); }
    say.className='ru-say pet'+(go?' go':''); place(); void say.offsetWidth;
    cat.classList.remove('ru-pet'); void cat.offsetWidth; cat.classList.add('ru-pet'); say.classList.add('show');
    clearTimeout(t); t=setTimeout(rest,ms||(go?5000:3800));
  }
  function rest(){ cat.classList.remove('ru-pet'); say.classList.remove('show'); curGo=null; }
  function menusOpen(){
    return ['sectionNavMenu','userDropdownMenu'].some(function(id){var e=document.getElementById(id);return e&&!e.classList.contains('hidden');});
  }
  function go(){
    var g=curGo; if(!g)return; rest();
    if(/^section-/.test(g)){ var e=document.getElementById(g); if(e)window.scrollTo({top:e.getBoundingClientRect().top+pageYOffset-80,behavior:'smooth'}); }
    else if(/^fn:/.test(g)){ try{window[g.slice(3)]();}catch(err){} }
    else location.href=g;
  }
  say.addEventListener('click',go);
  say.addEventListener('mouseenter',function(){clearTimeout(t);});
  say.addEventListener('mouseleave',function(){clearTimeout(t);t=setTimeout(rest,1800);});
  /* Nói thưa: nghỉ khoảng 8-10 giây sau khi bong bóng tắt mới nói câu tiếp theo */
  function cycle(extra){
    timer=setTimeout(function(){
      var spoke=false;
      if(!document.hidden&&!menusOpen()){ speak(next()); spoke=true; }
      cycle(spoke?5000:0);
    },(extra||0)+8000+Math.random()*2000);
  }
  setTimeout(function(){ if(!menusOpen())speak(greet(),4800); },2200);
  cycle(7000);
  cat.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); speak(Math.random()<.5?FUN[Math.floor(Math.random()*FUN.length)]:next(),4400); });
  window.addEventListener('resize',function(){ if(say.classList.contains('show'))place(); });
})();
