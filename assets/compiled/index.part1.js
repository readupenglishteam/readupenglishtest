/* Source: assets/js/pages/index.01.js */
(function(){
  var d=document.documentElement; d.classList.add('ri-js');
  try{
    var t=localStorage.theme;
    if(t==='dark'||(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark');}
  }catch(e){}
})();

;
/* Source: assets/js/pages/index.02.js */


  /* Mèo ReadUp: chỉ chào 1 lần mỗi phiên (thêm ?intro=1 vào link để xem lại) */
  (function(){try{
    var seen=sessionStorage.getItem('ruCatSeen'),re=/[?&]intro=1/.test(location.search);
    var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if((!seen||re)&&!rm)document.documentElement.classList.add('ru-intro');
  }catch(e){}})();
