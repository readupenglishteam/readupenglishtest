
        (function () {
          const tab = document.getElementById('assignmentSideTab');
          const mainBtn = document.getElementById('btnLearnNow');
          if (!tab || !mainBtn) return;

          // Ô "Vào Học Ngay" khuất khỏi màn hình -> trượt tab ASSIGNMENT ra cạnh phải
          new IntersectionObserver(function (entries) {
            tab.classList.toggle('show', !entries[0].isIntersecting);
          }, { threshold: 0 }).observe(mainBtn);

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
      