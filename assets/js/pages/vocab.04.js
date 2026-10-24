
/* Bé mèo nằm trên thẻ "Nhiệm vụ hôm nay": thỉnh thoảng thức dậy nói chuyện với người học */
(function(){
  var wrap=document.getElementById('ruLie'), say=document.getElementById('ruSay'), card=document.getElementById('dailyCard');
  if(!wrap||!say)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
    wrap.querySelectorAll('animateTransform').forEach(function(n){n.remove();});
  }
  var t=null, timer=null;
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function speak(text,ms){
    wrap.classList.remove('ru-pet'); void wrap.offsetWidth; wrap.classList.add('ru-pet');
    say.textContent=text; say.className='ru-say show pet';
    clearTimeout(t); t=setTimeout(rest,ms||3400);
  }
  function rest(){ wrap.classList.remove('ru-pet'); say.classList.remove('show'); }
  var GEN=['Mỗi ngày vài từ thôi, nhớ lâu hơn nè 🧠','Gõ đáp án thay vì đọc lướt nha ⌨️','Meo~ cố lên nhé! 🐾','Nhớ ôn đúng lúc sắp quên nha ⏰','Từ nào khó thì ôn lại nhiều lần nhé 💪'];
  function ctxTip(){
    var tx=card?card.textContent:'', m;
    if(/hoàn thành ôn tập/.test(tx)) return pick(['Giỏi quá! Hôm nay bạn ôn xong rồi 🎉','Hôm nay làm tốt lắm, mai gặp lại nhé! 🌟']);
    m=tx.match(/(\d+)\s*từ đến hạn/);
    if(m&&+m[1]>0) return 'Có '+m[1]+' từ đến hạn rồi, ôn thôi nào! 📚';
    if(/thêm từ vựng đầu tiên/.test(tx)) return 'Thêm từ vựng đầu tiên của bạn đi nào ✍️';
    return pick(GEN);
  }
  function inView(){ var r=wrap.getBoundingClientRect(); return r.bottom>0&&r.top<innerHeight; }
  function cycle(){
    timer=setTimeout(function(){ if(!document.hidden&&inView())speak(Math.random()<.55?ctxTip():pick(GEN)); cycle(); },6500+Math.random()*3500);
  }
  setTimeout(function(){ if(inView())speak('Meo~ Chào bạn! Mình cùng ôn từ vựng nhé 🐾',3600); },1500);
  cycle();
  wrap.addEventListener('click',function(){ speak(pick(['Meo~ 😽','Gừ gừ… 💤','Ôn từ vựng rồi mình chơi nhé! 🐾',ctxTip()]),2600); });
})();
