
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
  