
  (function(){
    var cat=document.getElementById('ruCat'), slot=document.getElementById('ruCatSlot'),
        ov=document.getElementById('ruIntro'), bub=document.getElementById('ruBubble'), root=document.documentElement;
    if(!cat||!slot)return;
    var tip=null, tipT=null, idleT=null, running=false, docked=false;
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TIPS=['Chào bạn! Hôm nay luyện Reading nhé 📖','Cố lên, bạn làm được mà! 💪','Mỗi ngày một bài, giỏi lên thấy rõ! 🔥',
              'Gặp từ mới thì ghi lại nha ✍️','Meow~ mình ở đây cổ vũ bạn! 🐾','Sẵn sàng chưa? Bấm "Vào Luyện Tập" nào! 🚀'];

    function showTip(t,ms){
      if(!tip)return; tip.textContent=t; tip.classList.add('show');
      clearTimeout(tipT); tipT=setTimeout(hideTip,ms||3600);
    }
    function hideTip(){ if(tip)tip.classList.remove('show'); }
    function randTip(){ return TIPS[Math.floor(Math.random()*TIPS.length)]; }
    function hop(){
      if(running||!cat.animate)return;
      cat.animate([{transform:'translateY(0)'},{transform:'translateY(-14px) rotate(-4deg)'},{transform:'translateY(0)'},
                   {transform:'translateY(-6px) rotate(3deg)'},{transform:'translateY(0)'}],{duration:650,easing:'ease-out'});
    }
    function schedule(){
      idleT=setTimeout(function(){ if(!running&&!document.hidden){showTip(randTip(),3400);hop();} schedule(); },13000+Math.random()*8000);
    }
    function reset(){
      running=false;
      if(cat.getAnimations)cat.getAnimations().forEach(function(x){x.cancel();});
    }

    function dock(){
      root.classList.remove('ru-intro','ru-lock');
      /* QUAN TRỌNG: huỷ mọi animation còn "dính" (fill:forwards) để mèo về đúng kích thước/vị trí trong header */
      if(cat.getAnimations)cat.getAnimations().forEach(function(x){x.cancel();});
      cat.classList.remove('floating'); cat.removeAttribute('style'); slot.appendChild(cat);
      if(bub)bub.remove(); if(ov)ov.remove();
      docked=true;
      tip=document.createElement('div'); tip.className='ru-tip'; cat.appendChild(tip);
      setTimeout(function(){ showTip('Chào bạn! Sẵn sàng luyện Reading chưa? 📖',4200); },1200);
      schedule();
    }

    /* Tương tác với mèo trong header */
    cat.addEventListener('click',function(){ if(!docked||running)return; showTip(randTip(),3200); hop(); });
    cat.addEventListener('mouseenter',function(){ if(!docked||running)return; if(!tip.classList.contains('show'))showTip(randTip(),2800); });

    /* Bấm "Vào Luyện Tập": mèo chạy dọc header tới nút rồi mới chuyển trang */
    var btn=document.querySelector('header a[href="login.html"]');
    if(btn){
      btn.addEventListener('click',function(e){
        if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        if(!docked||reduce||!cat.animate)return;
        e.preventDefault(); if(running)return; running=true;
        var href=btn.href; clearTimeout(idleT);
        var go=function(){location.href=href;}; setTimeout(go,3000);
        try{
          var cr=cat.getBoundingClientRect(), br=btn.getBoundingClientRect();
          var dx=Math.max(24,br.left-cr.width-8-cr.left);
          var n=Math.max(2,Math.min(9,Math.round(dx/80))), kf=[];
          for(var i=0;i<n;i++){
            kf.push({transform:'translate('+(dx*i/n)+'px,0)',offset:i/n});
            kf.push({transform:'translate('+(dx*(i+.5)/n)+'px,-13px)',offset:(i+.5)/n});
          }
          kf.push({transform:'translate('+dx+'px,0)',offset:1});
          showTip('Đi thôi! Mình dẫn bạn vào luyện tập 🚀',2600);
          cat.animate(kf,{duration:Math.min(1700,550+dx*1.1),easing:'ease-in-out',fill:'forwards'}).finished.then(function(){
            btn.animate([{transform:'scale(1)'},{transform:'scale(.9)'},{transform:'scale(1.07)'},{transform:'scale(1)'}],{duration:380});
            setTimeout(go,380);
          }).catch(go);
        }catch(err){go();}
      });
    }
    /* Quay lại trang bằng nút Back (bfcache): đưa mèo về chỗ cũ */
    window.addEventListener('pageshow',function(ev){ if(ev.persisted&&docked){reset(); hideTip(); schedule();} });

    if(!root.classList.contains('ru-intro')||!cat.animate){dock();return;}
    try{sessionStorage.setItem('ruCatSeen','1');}catch(e){}
    var skip=false, wake=null, skipP=new Promise(function(r){wake=r;});
    ov.addEventListener('click',function(){skip=true;wake();});
    function sleep(ms){return Promise.race([new Promise(function(r){setTimeout(r,ms);}),skipP]);}
    try{
      var vw=innerWidth, vh=innerHeight, W=Math.round(Math.min(280,Math.min(vw,vh)*0.58));
      var cx=(vw-W)/2, cy=(vh-W)/2+30;
      document.body.appendChild(cat); cat.classList.add('floating');
      cat.style.width=cat.style.height=W+'px';
      var T=function(x,y,s){return 'translate('+x+'px,'+y+'px) scale('+(s||1)+')';};
      var enter=cat.animate([
        {transform:T(-W-40,cy),offset:0},
        {transform:T(cx*.28,cy-38),offset:.2},
        {transform:T(cx*.5,cy),offset:.36},
        {transform:T(cx*.76,cy-30),offset:.56},
        {transform:T(cx,cy),offset:.76},
        {transform:T(cx,cy-16),offset:.88},
        {transform:T(cx,cy),offset:1}
      ],{duration:1800,easing:'ease-in-out',fill:'forwards'});
      enter.finished.catch(function(){}).then(function(){
        if(skip)return;
        bub.style.fontSize=Math.max(12,Math.round(W*.055))+'px';
        bub.classList.add('show');
        return sleep(2600);
      }).then(function(){
        bub.classList.remove('show'); bub.classList.add('hide');
        var r=slot.getBoundingClientRect(), s=r.width/W, ms=(1+s)/2;
        var mx=(cx+r.left)/2, my=Math.max(10,Math.min(cy,r.top)-70);
        ov.animate([{opacity:1},{opacity:0}],{duration:900,easing:'ease-in-out',fill:'forwards'});
        return cat.animate([
          {transform:T(cx,cy,1),offset:0},
          {transform:T(mx,my,ms),offset:.5},
          {transform:T(r.left,r.top,s),offset:1}
        ],{duration:1200,easing:'cubic-bezier(.6,0,.3,1)',fill:'forwards'}).finished;
      }).then(function(){
        dock();
        cat.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:450,easing:'ease-out'});
      }).catch(dock);
    }catch(e){dock();}
  })();
  