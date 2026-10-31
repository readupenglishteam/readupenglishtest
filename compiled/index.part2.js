/* Source: assets/js/pages/index.03.js */

  (function(){
    var URL_='https://klovtvjfvfenhkvifujy.supabase.co/rest/v1/posts?select=title,token,thumbnail_url,excerpt,created_at&is_published=eq.true&order=created_at.desc&limit=5';
    var KEY_='sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-';
    var wrap=document.getElementById('ruPostsWrap'), box=document.getElementById('ruPosts');
    if(!wrap||!box) return;
    fetch(URL_,{headers:{apikey:KEY_}}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
      if(!rows||!rows.length) return;
      var max=window.innerWidth<640?70:140, items=[];
      rows.forEach(function(p){
        var a=document.createElement('a'); a.className='ru-post'; a.href='post.html?token='+encodeURIComponent(p.token);
        var th=document.createElement('div'); th.className='ru-post-thumb';
        if(p.thumbnail_url){var im=document.createElement('img'); im.src=p.thumbnail_url; im.alt=p.title||''; im.loading='lazy'; im.draggable=false; th.appendChild(im);} else {th.textContent='\uD83D\uDCF0';}
        var b=document.createElement('div'); b.className='ru-post-body';
        var m=document.createElement('div'); m.className='ru-post-meta';
        var bd=document.createElement('span'); bd.className='ru-post-badge'; bd.textContent='Bài học';
        var dt=document.createElement('span'); dt.className='ru-post-date';
        dt.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
        dt.appendChild(document.createTextNode(new Date(p.created_at).toLocaleDateString('vi-VN')));
        m.appendChild(bd); m.appendChild(dt);
        var t=document.createElement('h3'); t.className='ru-post-title'; t.textContent=p.title||'';
        var ex=document.createElement('p'); ex.className='ru-post-ex';
        var txt=(p.excerpt||'').replace(/\s+/g,' ').trim(); if(txt.length>max) txt=txt.slice(0,max).trim();
        ex.appendChild(document.createTextNode(txt?txt+' ':''));
        var more=document.createElement('span'); more.className='ru-post-more'; more.textContent='đọc thêm \u2192'; ex.appendChild(more);
        b.appendChild(m); b.appendChild(t); b.appendChild(ex);
        a.appendChild(th); a.appendChild(b); box.appendChild(a); items.push(a);
      });
      wrap.style.display=''; items[0].classList.add('active');
      if(items.length<2) return;
      var dotsBox=document.getElementById('ruPostDots'), dots=[], cur=0, paused=false, timer=null, DELAY=4500;
      items.forEach(function(_,i){
        var d=document.createElement('button'); d.className='ru-post-dot'+(i===0?' active':''); d.setAttribute('aria-label','Bài '+(i+1));
        d.addEventListener('click',function(){go(i);start();}); dotsBox.appendChild(d); dots.push(d);
      });
      function go(n){
        n=(n+items.length)%items.length; if(n===cur) return;
        var old=items[cur], nw=items[n];
        old.classList.remove('active'); old.classList.add('leave');
        nw.classList.remove('leave'); nw.classList.add('active');
        dots[cur].classList.remove('active'); dots[n].classList.add('active');
        cur=n; setTimeout(function(){old.classList.remove('leave');},700);
      }
      function start(){ stop(); timer=setInterval(function(){ if(!paused&&!document.hidden) go(cur+1); },DELAY); }
      function stop(){ if(timer){clearInterval(timer);timer=null;} }
      box.addEventListener('mouseenter',function(){paused=true;});
      box.addEventListener('mouseleave',function(){paused=false;});
      box.addEventListener('touchstart',function(){paused=true;},{passive:true});
      box.addEventListener('touchend',function(){setTimeout(function(){paused=false;},2500);},{passive:true});
      document.getElementById('ruPostPrev').addEventListener('click',function(){go(cur-1);start();});
      document.getElementById('ruPostNext').addEventListener('click',function(){go(cur+1);start();});
      var sx=0, sy=0;
      box.addEventListener('touchstart',function(e){sx=e.touches[0].clientX; sy=e.touches[0].clientY;},{passive:true});
      box.addEventListener('touchend',function(e){
        var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
        if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ go(dx<0?cur+1:cur-1); start(); }
      },{passive:true});
      start();
    }).catch(function(){});
  })();
  
;
/* Source: assets/js/pages/index.04.js */

  const stepsData = [
    {
      title: "READ",
      desc: "Đọc bài báo thực tế mỗi ngày được tinh chỉnh theo đúng chuẩn cấu trúc đề thi IELTS & TOEIC."
    },
    {
      title: "LEARN",
      desc: "Tra từ trong ngữ cảnh bài đọc, lưu bộ Collocation chuẩn xác kèm giải thích đáp án chi tiết."
    },
    {
      title: "GROW",
      desc: "Theo dõi sự tăng trưởng tốc độ đọc hiểu và Band điểm qua hệ thống báo cáo trực quan."
    }
  ];

  // Tọa độ 3 vị trí trên đường tròn bán kính R = 95px
  // Vị trí 0 (Đỉnh giữa), Vị trí 1 (Phải dưới), Vị trí 2 (Trái dưới)
  const slots = [
    { x: 0, y: -95, scale: 1.25, opacity: 1 },
    { x: 82, y: 48, scale: 0.85, opacity: 0.5 },
    { x: -82, y: 48, scale: 0.85, opacity: 0.5 }
  ];

  let currentActive = 0;

  function updateCircleLayout() {
    stepsData.forEach((_, index) => {
      const node = document.getElementById(`step-node-${index}`);
      // Tính toán vị trí tương đối của node dựa trên nút đang active
      const slotIndex = (index - currentActive + 3) % 3;
      const pos = slots[slotIndex];

      // Áp dụng vị trí và hiệu ứng phóng to/thu nhỏ
      node.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`;
      node.style.opacity = pos.opacity;

      // Nút ở trên cùng sẽ ưu tiên hiển thị đè lên (z-index)
      if (slotIndex === 0) {
        node.classList.add("z-10");
        node.classList.remove("z-0");
      } else {
        node.classList.add("z-0");
        node.classList.remove("z-10");
      }
    });

    // Cập nhật text nội dung ở hộp bên dưới
    const titleEl = document.getElementById("active-title");
    const descEl = document.getElementById("active-desc");
    
    titleEl.innerText = stepsData[currentActive].title;
    descEl.innerText = stepsData[currentActive].desc;
  }

  function setActiveStep(index) {
    currentActive = index;
    updateCircleLayout();
  }

  // Khởi tạo vị trí ban đầu
  updateCircleLayout();

;
/* Source: assets/js/pages/index.05.js */

    function toggleDarkMode() {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
      }
    }


    document.addEventListener("DOMContentLoaded", function () {
    const reveals = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    }, { threshold: 0.1 });

    reveals.forEach((el) => observer.observe(el));
  });
    
  
;
/* Source: assets/js/pages/index.06.js */

  (function () {
    var slider = document.getElementById('ruSlider');
    var track  = document.getElementById('ruTrack');
    var dots   = document.querySelectorAll('#ruDots .ru-dot');
    var total  = dots.length, idx = 0, timer = null, DELAY = 4000;

    function go(n) {
      idx = (n + total) % total;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }
    function start() { stop(); timer = setInterval(function () { go(idx + 1); }, DELAY); }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }

    document.getElementById('ruPrev').addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); start(); });
    document.getElementById('ruNext').addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); start(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); start(); }); });

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    // Vuốt trên điện thoại (vuốt = chuyển ảnh, chạm = về index)
    var sx = 0, moved = false;
    slider.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; moved = false; stop(); }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { moved = true; go(dx < 0 ? idx + 1 : idx - 1); }
      start();
    });

    // Bấm vào ảnh -> quay về trang index
    slider.addEventListener('click', function () {
      if (moved) { moved = false; return; }
      window.location.href = 'index.html';
    });

    // Chặn chuột phải, kéo thả, chọn, giữ ảnh
    ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(function (ev) {
      slider.addEventListener(ev, function (e) { e.preventDefault(); });
    });

    // Tạm dừng khi chuyển tab để tiết kiệm tài nguyên
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    go(0);
    var loaded = 0;
    document.querySelectorAll('.ru-slide img').forEach(function (im) {
      function done() { if (++loaded === total) start(); }
      if (im.complete && im.naturalWidth) done(); else { im.addEventListener('load', done); im.addEventListener('error', done); }
    });
  })();
  
;
/* Source: assets/js/pages/index.07.js */

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
  
;
/* Source: assets/js/page-loader.js */
/* Màn hình chờ dùng chung. Không sửa đổi hoặc can thiệp vào hàm gốc của từng trang. */
(function () {
  'use strict';
  var overlay = document.getElementById('ru-page-loader');
  if (!overlay) return;
  var pathname = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  var protectedPages = [
    'admin.html', 'dashboard.html', 'editlml.html', 'exam.html',
    'profile.html', 'room.html', 'teacher.html', 'vocab.html', 'gamevocab.html'
  ];
  var isDemo = pathname === 'gamevocab.html' && new URLSearchParams(location.search).has('demo');
  var requiresLogin = protectedPages.indexOf(pathname) !== -1 && !isDemo;
  var dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('ru-page-loader--done');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 190);
  }
  function fail() {
    if (requiresLogin) {
      // Giữ nguyên đích chuyển hướng đăng nhập như các trang hiện tại.
      window.location.replace('index.html');
      return;
    }
    dismiss();
  }
  async function verifyAndReveal() {
    // Các trang công khai không cần đợi Supabase để hiện nội dung.
    if (!requiresLogin) { dismiss(); return; }
    if (typeof sbClient === 'undefined' || !sbClient || !sbClient.auth) {
      // Trang công khai hoặc phòng thi không dùng sbClient.
      if (requiresLogin) { fail(); return; }
      dismiss();
      return;
    }
    try {
      // Dùng lại Supabase client sẵn có của trang; không tạo thêm phiên hay client mới.
      var authResult = await sbClient.auth.getSession();
      var user = authResult && authResult.data && authResult.data.session && authResult.data.session.user;
      if (requiresLogin && !user) { fail(); return; }
      // Trang quyền hạn giáo viên/admin tiếp tục được kiểm tra role bằng logic có sẵn.
      dismiss();
    } catch (error) {
      console.warn('Không kiểm tra được phiên đăng nhập:', error);
      fail();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyAndReveal, { once: true });
  } else {
    verifyAndReveal();
  }
}());
