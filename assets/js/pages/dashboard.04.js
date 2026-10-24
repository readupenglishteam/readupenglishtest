
        (function () {
          const btn = document.getElementById('btnLearnNow');
          if (!btn) return;

          function fireworks(cx, cy) {
            cx = Math.max(160, Math.min(innerWidth - 160, cx));
            cy = Math.max(140, Math.min(innerHeight - 60, cy));
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
            const dpr = window.devicePixelRatio || 1;
            canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7ff', '#af52de', '#ffffff'];
            const parts = [];
            function burst(x, y) {
              const color = colors[Math.floor(Math.random() * colors.length)];
              for (let i = 0; i < 70; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 1.5 + Math.random() * 5.5;
                parts.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                             life: 1, decay: 0.012 + Math.random() * 0.014,
                             size: 2 + Math.random() * 2.5,
                             color: Math.random() < .25 ? '#ffffff' : color });
              }
            }
            // Nhiều quả pháo nổ liên tiếp quanh ô bấm
            const spots = [
              [cx, cy], [cx - 140, cy - 90], [cx + 150, cy - 110],
              [cx - 60, cy - 170], [cx + 80, cy - 40], [cx, cy - 130]
            ];
            spots.forEach((p, i) => setTimeout(() => burst(p[0], p[1]), i * 130));

            let last = performance.now();
            (function frame(now) {
              const dt = Math.min(2, (now - last) / 16.67); last = now;
              ctx.clearRect(0, 0, innerWidth, innerHeight);
              for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.vy += 0.09 * dt; p.vx *= 0.99;
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.life -= p.decay * dt;
                if (p.life <= 0) { parts.splice(i, 1); continue; }
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life + .5, 0, Math.PI * 2); ctx.fill();
              }
              ctx.globalAlpha = 1;
              if (parts.length || performance.now() - last < 900) requestAnimationFrame(frame);
              else canvas.remove();
            })(last);
            setTimeout(() => canvas.remove(), 3500);
          }

          window.readupFireworks = fireworks;

          btn.addEventListener('click', function (e) {
            // Cho phép Ctrl/Cmd+click, chuột giữa mở tab mới như link bình thường
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            const r = btn.getBoundingClientRect();
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              fireworks(r.left + r.width / 2, r.top + r.height / 2);
              setTimeout(() => { location.href = btn.href; }, 1100);
            } else {
              location.href = btn.href;
            }
          });
        })();
      