
  (function () {
    const tab = document.getElementById('assignmentSideTab');
    if (!tab) return;

    // Luôn hiển thị tab
    tab.classList.add('show');
    // Khách chưa đăng nhập -> chuyển tới login
    sbClient.auth.getSession().then(({data:{session}})=>{ if(!session?.user) tab.href='login.html'; });

    // Sơ đồ sự kiện click giữ nguyên
    tab.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const r = tab.getBoundingClientRect();
      if (window.readupFireworks && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.readupFireworks(r.left - 100, r.top + r.height / 2);
        setTimeout(function () { location.href = tab.href; }, 1100);
      } else {
        location.href = tab.href;
      }
    });
  })();
