
/* Bé mèo báo kết quả đăng nhập / đăng ký (đọc thông báo ở #authMsg, không đụng vào logic cũ) */
(function(){
  var wrap=document.getElementById('ruLie'), say=document.getElementById('ruSay'),
      msg=document.getElementById('authMsg'), form=document.getElementById('authForm');
  if(!wrap||!say||!msg)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){
    wrap.querySelectorAll('animateTransform').forEach(function(n){n.remove();});
  }
  var t=null, last='';
  function speak(state,text,ms){
    wrap.classList.remove('ru-alert','ru-ok','ru-pet'); void wrap.offsetWidth;
    wrap.classList.add(state==='ok'?'ru-ok':state==='err'?'ru-alert':'ru-pet');
    say.textContent=text; say.className='ru-say show '+(state==='pet'?'pet':state);
    clearTimeout(t); t=setTimeout(rest,ms||4500);
  }
  function rest(){ wrap.classList.remove('ru-alert','ru-ok','ru-pet'); say.classList.remove('show'); }
  function react(){
    var cls=msg.className||'', txt=(msg.textContent||'').trim();
    if(!txt||/Đang xử lý/.test(txt)){last='';return;}
    var key=cls+'|'+txt; if(key===last)return; last=key;
    if(/text-red-/.test(cls)){
      if(/Vui lòng nhập/.test(txt)) speak('err','Bạn điền thiếu thông tin rồi nè 📝');
      else if(/Email not confirmed/i.test(txt)) speak('err','Email chưa được xác nhận 📧 Kiểm tra hộp thư nhé!');
      else if(/Đăng nhập thất bại|Sai email|Invalid login/i.test(txt)) speak('err','Ối! Sai email hoặc mật khẩu rồi 😿 Thử lại nhé!');
      else if(/đăng ký/i.test(txt)) speak('err','Đăng ký chưa được 😿 Xem thông báo bên dưới nhé!');
      else speak('err','Có lỗi rồi 😿 Xem thông báo bên dưới nhé!');
    } else if(/text-green-/.test(cls)){
      if(/Admin/.test(txt)) speak('ok','Chào Admin! Đăng nhập thành công 🎉',3800);
      else if(/Giảng viên/.test(txt)) speak('ok','Chào thầy/cô! Đăng nhập thành công 🎉',3800);
      else if(/Đăng ký thành công/i.test(txt)) speak('ok','Đăng ký thành công! Chào mừng bạn 🎉',4500);
      else speak('ok','Đăng nhập thành công! Chào mừng bạn trở lại 🎉',3800);
    }
  }
  new MutationObserver(react).observe(msg,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
  if(form)form.addEventListener('submit',function(){last='';},true);
  wrap.addEventListener('click',function(){ speak('pet',['Meo~ 😽','Gừ gừ… 💤','Đăng nhập rồi mình chơi nhé! 🐾'][Math.floor(Math.random()*3)],2200); });
})();
