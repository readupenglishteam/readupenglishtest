/* Source: assets/js/pages/exam.03.js */

    const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
    const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
    const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let currentExam = null;
    let currentUser = null;
    let timerInterval = null;
    let timeSpentSeconds = 0;

    /* ====== HỖ TRỢ CÂU HỎI DẠNG KHỐI (admin/teacher): mcq, multi, tf, fill, essay, text ====== */
    const BLOCK_TYPES = ['mcq', 'multi', 'tf', 'fill', 'essay', 'text'];
    function isBlockQ(q) {
      return !!q && typeof q === 'object' && q.question === undefined && BLOCK_TYPES.includes(q.type);
    }
    function escHTML(s) {
      return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // Chuẩn hoá danh sách câu hỏi: parse JSON, làm phẳng khối reading, gán _key (khoá lưu bài làm) và _num (số câu hiển thị)
    function normalizeQuestions(raw) {
      let arr = raw;
      if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (e) { arr = []; } }
      if (!Array.isArray(arr)) arr = [];
      const flat = [];
      arr.forEach(q => {
        if (q && q.type === 'reading' && Array.isArray(q.sub_blocks)) {
          if (q.content) flat.push({ id: (q.id || 'reading') + '_txt', type: 'text', content: q.content, points: 0 });
          q.sub_blocks.forEach(sb => flat.push(sb));
        } else flat.push(q);
      });
      let n = 0; const seen = {};
      return flat.filter(q => q && typeof q === 'object').map((q, idx) => {
        if (isBlockQ(q)) {
          let key = String(q.id || ('q' + idx));
          if (seen[key]) key += '_' + idx;
          seen[key] = true; q._key = key;
          if (q.type !== 'text') { n++; q._num = n; }
        } else { n++; q._num = n; q._key = 'câu_' + (idx + 1); }
        return q;
      });
    }
    function isTextBlock(q) { return isBlockQ(q) && q.type === 'text'; }
    function blockBlanks(q) {
      if (Array.isArray(q.blanks)) return q.blanks.map(b => ({ gap: String(b.gap), accepted: b.accepted_answers || [] }));
      const m = q.blanks || {};
      return Object.keys(m).map(g => ({ gap: String(g), accepted: String(m[g] || '').split(';').map(s => s.trim()).filter(Boolean) }));
    }
    function gapNumbers(content) {
      return [...new Set(Array.from(String(content || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map(m => m[1]))];
    }
    // Điểm mỗi câu quy về thang 10 theo trọng số "points" của admin (câu text không tính điểm)
    function computePointsMap(questions) {
      const scorable = questions.filter(q => !isTextBlock(q));
      let ws = scorable.map(q => { if (!isBlockQ(q)) return 1; const p = Number(q.points); return isFinite(p) && p > 0 ? p : 0; });
      let total = ws.reduce((a, b) => a + b, 0);
      if (total <= 0) { ws = ws.map(() => 1); total = ws.length; }
      const map = new Map();
      scorable.forEach((q, i) => map.set(q, total > 0 ? 10 * ws[i] / total : 0));
      return map;
    }
    function readAnswerFromDOM(q, idx) {
      const t = isBlockQ(q) ? q.type : null;
      if (t === 'multi') return Array.from(document.querySelectorAll(`input[name="q_idx_${idx}"]:checked`)).map(i => i.value);
      if (t === 'mcq' || t === 'tf') { const r = document.querySelector(`input[name="q_idx_${idx}"]:checked`); return r ? r.value : ''; }
      if (t === 'essay') { const e = document.querySelector(`textarea[name="q_idx_${idx}"]`); return e ? e.value.trim() : ''; }
      const blanks = document.querySelectorAll(`input[name^="q_idx_${idx}_blank_"]`);
      if (blanks.length) { const o = {}; blanks.forEach(i => { o[i.getAttribute('data-blank')] = i.value.trim(); }); return o; }
      if (t === 'fill') return {};
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        const radio = document.querySelector(`input[name="q_idx_${idx}"]:checked`);
        return radio ? radio.value.trim() : '';
      }
      const el = document.querySelector(`textarea[name="q_idx_${idx}"], input[name="q_idx_${idx}"]`);
      return el ? el.value.trim() : '';
    }
    // Chấm điểm chung cho cả lúc nộp bài (đọc từ ô nhập) và lúc xem lại (đọc từ dữ liệu đã lưu)
    function gradeQuestions(questions, getVal) {
      const ptsMap = computePointsMap(questions);
      let totalScore = 0; const answers = {};
      questions.forEach((q, idx) => {
        if (isTextBlock(q)) { q.status = 'text'; return; }
        const pts = ptsMap.get(q) || 0;
        let val = getVal(q, idx);
        let earned = 0, status = 'wrong';

        if (isBlockQ(q)) {
          if (q.type === 'essay') {
            val = val == null ? '' : String(val);
            q.status = 'essay'; q.isCorrect = null; q.earnedPoints = 0; q.userSelected = val;
            answers[q._key] = val; return;
          }
          if (q.type === 'mcq' || q.type === 'tf') {
            val = val == null ? '' : String(val);
            const c = (q.options || []).find(o => o.correct);
            if (c && val !== '' && val === String(c.id)) { earned = pts; status = 'correct'; }
          } else if (q.type === 'multi') {
            val = Array.isArray(val) ? val.map(String) : (val ? [String(val)] : []);
            const correctIds = (q.options || []).filter(o => o.correct).map(o => String(o.id));
            const good = val.filter(v => correctIds.includes(v)).length;
            const bad = val.length - good;
            const net = Math.max(0, good - bad);
            q.correctSubCount = net; q.totalBlanks = correctIds.length;
            if (correctIds.length && good === correctIds.length && bad === 0) { earned = pts; status = 'correct'; }
            else if (net > 0) { earned = pts * net / correctIds.length; status = 'partial'; }
          } else if (q.type === 'fill') {
            val = (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
            const blanks = blockBlanks(q);
            let ok = 0;
            blanks.forEach(b => { if (checkSingleMatch(val[b.gap], b.accepted)) ok++; });
            q.correctSubCount = ok; q.totalBlanks = blanks.length;
            if (blanks.length) earned = pts * ok / blanks.length;
            status = (blanks.length && ok === blanks.length) ? 'correct' : (ok > 0 ? 'partial' : 'wrong');
          }
        } else {
          // ---- Định dạng cũ (question / options dạng chuỗi / answer) ----
          const isEssay = q.is_essay || q.type === 'essay' || (!q.answer && (!q.options || q.options.length === 0));
          if (isEssay) {
            val = val || '';
            q.status = 'essay'; q.isCorrect = null; q.earnedPoints = 0; q.userSelected = val;
            answers[q._key] = val; return;
          }
          if (typeof val === 'object' && val !== null) {
            const correctObj = q.answer || {};
            const keys = Object.keys(correctObj);
            let ok = 0;
            keys.forEach(k => { if (checkSingleMatch(val[k], correctObj[k])) ok++; });
            q.correctSubCount = ok; q.totalBlanks = keys.length;
            earned = keys.length > 0 ? pts * ok / keys.length : 0;
            status = (ok === keys.length && keys.length > 0) ? 'correct' : (ok > 0 ? 'partial' : 'wrong');
          } else if (q.options && Array.isArray(q.options) && q.options.length > 0) {
            const userKey = (val || '').toString().trim().charAt(0).toLowerCase();
            const correctKey = (q.answer || '').toString().trim().charAt(0).toLowerCase();
            if (userKey !== '' && userKey === correctKey) { earned = pts; status = 'correct'; }
          } else if (checkSingleMatch(val, q.answer)) { earned = pts; status = 'correct'; }
        }

        totalScore += earned;
        q.status = status; q.isCorrect = status === 'correct';
        q.earnedPoints = Number(earned.toFixed(2)); q.userSelected = val;
        answers[q._key] = val;
      });
      return { totalScore, answers };
    }

    /* ---- Hiển thị câu hỏi dạng khối ---- */
    // Question header: fixed-size "Question N:" label + normalized content (aligned on the same line)
    const qHead = (num, inner, size) => `<div class="qhead font-bold ${size || 'text-xs sm:text-sm'} text-gray-900 dark:text-white"><div class="qnum text-[#cf1717] dark:text-red-400 font-extrabold mb-1 whitespace-nowrap">Question ${num}:</div><div class="qcontent min-w-0">${inner}</div></div>`;
    function renderBlockQuestionHTML(q, idx) {
      const box = 'p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-2 sm:space-y-3';
      if (q.type === 'text') {
        return `<div class="qcontent p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs sm:text-sm text-gray-800 dark:text-gray-200">${q.content || ''}</div>`;
      }
      const head = inner => qHead(q._num, inner);
      if (q.type === 'essay') {
        return `<div class="${box}">${head(q.content || '')}
          <textarea name="q_idx_${idx}" rows="4" placeholder="Write your essay answer here..." class="w-full p-2.5 text-xs sm:text-sm rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#cf1717]"></textarea></div>`;
      }
      if (q.type === 'fill') {
        const html = String(q.content || '').replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) =>
          `<input type="text" name="q_idx_${idx}_blank_${n}" data-qidx="${idx}" data-blank="${n}" placeholder="(${n})" autocomplete="off" class="fill-auto inline-block mx-1 px-2 py-0.5 text-xs sm:text-sm rounded border border-gray-300 dark:border-zinc-600 border-b-2 border-b-[#cf1717] bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#cf1717]">`);
        return `<div class="${box}">${head(html)}</div>`;
      }
      const type = q.type === 'multi' ? 'checkbox' : 'radio';
      const hint = q.type === 'multi' ? '<p class="text-[11px] text-gray-400 italic">(Select all correct answers)</p>' : '';
      return `<div class="${box}">${head(q.content || '')}${hint}
        <div class="space-y-1.5 sm:space-y-2">
          ${(q.options || []).map(o => `
            <label class="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm p-2 sm:p-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition">
              <input type="${type}" name="q_idx_${idx}" value="${escHTML(o.id)}" class="accent-[#cf1717]">
              <span>${escHTML(o.text)}</span>
            </label>`).join('')}
        </div></div>`;
    }

    /* ---- Hiển thị kết quả câu hỏi dạng khối ---- */
    function renderBlockResult(q) {
      if (q.type === 'text') {
        return `<div class="qcontent p-3 sm:p-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs mb-4">${q.content || ''}</div>`;
      }
      const status = q.status || 'wrong';
      let badge, style;
      if (status === 'essay') {
        badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><i class="bi bi-pencil mr-1"></i>Essay (Recorded)</span>`;
        style = 'bg-blue-50/30 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40';
      } else if (status === 'correct') {
        badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><i class="bi bi-check-lg mr-1"></i>Correct</span>`;
        style = 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
      } else if (status === 'partial') {
        badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"><i class="bi bi-lightning-charge-fill mr-1"></i>Correct ${q.correctSubCount || 0}/${q.totalBlanks || 0} items (+${q.earnedPoints || 0} pts)</span>`;
        style = 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60';
      } else {
        badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><i class="bi bi-x-lg mr-1"></i>Wrong</span>`;
        style = 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
      }
      let contentHTML = q.content || '', body = '';
      const userVal = q.userSelected;
      if (q.type === 'essay') {
        body = `<div class="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-xs">
          <span class="text-gray-400 font-bold block mb-1">Your essay answer:</span>
          <p class="text-gray-800 dark:text-gray-200 whitespace-pre-line font-medium">${escHTML(userVal) || 'No answer entered.'}</p></div>`;
      } else if (q.type === 'fill') {
        contentHTML = contentHTML.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => `<b class="text-[#cf1717]">(${n})</b> ______`);
        const u = (userVal && typeof userVal === 'object') ? userVal : {};
        body = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">` + blockBlanks(q).map(b => {
          const ok = checkSingleMatch(u[b.gap], b.accepted);
          return `<div class="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-xs space-y-1">
            <div class="font-bold text-[#cf1717] dark:text-red-400">Blank (${escHTML(b.gap)}):</div>
            <div><span class="text-gray-400">Your answer:</span> <strong class="${ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${escHTML(u[b.gap]) || 'Not answered'}</strong></div>
            <div><span class="text-gray-400">Correct answer:</span> <strong class="text-green-600 dark:text-green-400">${escHTML(b.accepted.join(' / '))}</strong></div></div>`;
        }).join('') + `</div>`;
      } else {
        const picked = Array.isArray(userVal) ? userVal.map(String) : (userVal ? [String(userVal)] : []);
        body = (q.options || []).map(o => {
          const isPicked = picked.includes(String(o.id));
          let cls = 'text-gray-600 dark:text-gray-400 p-1.5 rounded-lg';
          if (o.correct) cls = 'font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 p-1.5 rounded-lg';
          else if (isPicked) cls = 'font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg line-through';
          return `<div class="${cls}">${isPicked ? '<i class="bi bi-hand-index-thumb-fill mr-1"></i>' : ''}${escHTML(o.text)}${o.correct ? ' <i class="bi bi-check-lg"></i>' : ''}</div>`;
        }).join('');
      }
      const exp = (typeof q.explanation === 'string' && q.explanation.replace(/<[^>]*>|&nbsp;/g, '').trim()) ? `
        <div class="mt-3 pt-3 border-t border-gray-200/60 dark:border-zinc-700/60 text-xs">
          <div class="flex items-center gap-1 text-[#cf1717] dark:text-red-400 font-bold mb-1"><i class="bi bi-lightbulb-fill"></i><span>Detailed explanation:</span></div>
          <div class="qcontent text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">${q.explanation}</div>
        </div>` : '';
      return `<div class="p-4 sm:p-5 rounded-2xl border ${style} space-y-3 mb-4">
        <div class="flex justify-between items-start gap-2">
          <div class="min-w-0 flex-1">${qHead(q._num, contentHTML, 'text-sm')}</div>
          ${badge}
        </div>
        <div class="space-y-1.5 text-xs">${body}</div>
        ${exp}
      </div>`;
    }

    async function initExam() {
      const { data: { user } } = await sbClient.auth.getUser();
      if (!user) { window.location.href = 'index.html'; return; }
      currentUser = user;

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (!token) { window.location.href = 'dashboard.html'; return; }

      const { data: exam } = await sbClient.from('exams').select('*').eq('token', token).single();
      if (!exam) { window.location.href = 'dashboard.html'; return; }

      exam.questions = normalizeQuestions(exam.questions);
      currentExam = exam;
      renderExamData();

      // [BỔ SUNG] Nếu đây là phòng đã nộp bài rồi -> Hiển thị luôn Đáp Án & Giải Thích từ dữ liệu đã lưu, KHÔNG bắt làm lại / KHÔNG chạy lại giờ đếm ngược
      const roomCode = urlParams.get('room_code');
      const resultId = urlParams.get('result_id');

      // [FIX] Mở từ "Lịch sử & kết quả thi" (?result_id=...) -> xem lại đúng lượt nộp đó, KHÔNG bắt làm lại
      if (resultId) {
        const reviewedById = await renderReviewByResultId(resultId, exam);
        if (reviewedById) return;
      }

      // Mở từ "Lịch sử phòng thi" (?room_code=...) -> xem lại bài đã nộp trong phòng
      if (roomCode) {
        const alreadyReviewed = await checkAndRenderRoomReview(roomCode, exam);
        if (alreadyReviewed) return;
      }

      startTimer(exam.time_limit || 60);
    }

    // [FIX] Hiển thị chế độ xem lại (Đáp Án & Giải Thích) từ bài làm đã lưu - dùng chung cho cả 2 luồng (result_id / room_code)
    function showSavedReview(exam, savedResult, participant) {
      renderReviewFromSavedAnswers(exam.questions || [], savedResult.answers || {});

      const finalScoreVal = (savedResult.score ?? participant?.score ?? 0);
      const scoreElem = document.getElementById('finalScore');
      if (scoreElem) scoreElem.innerText = finalScoreVal + '/10 points';

      const timeVal = savedResult.time_spent ?? participant?.completion_time ?? 0;
      const timeElem = document.getElementById('finalTime');
      if (timeElem) timeElem.innerText = Math.floor(timeVal / 60) + 'm ' + (timeVal % 60) + 's';

      const timerElem = document.getElementById('timerDisplay');
      if (timerElem) timerElem.innerHTML = '<i class="bi bi-check-circle-fill mr-1"></i>Submitted';

      disableSubmitBtn();

      const resultModal = document.getElementById('resultModal');
      if (resultModal) resultModal.classList.remove('hidden');
    }

    // [FIX] Xem lại bài đã nộp theo id lượt làm bài (exam_results.id) - dùng cho nút "Xem đáp án" ở Lịch sử & kết quả thi
    async function renderReviewByResultId(resultId, exam) {
      try {
        const { data: saved, error } = await sbClient
          .from('exam_results')
          .select('*')
          .eq('id', resultId)
          .eq('user_id', currentUser.id)
          .eq('exam_id', exam.id)
          .maybeSingle();

        if (error || !saved) {
          console.error('Không tìm thấy kết quả đã nộp:', error);
          return false;
        }
        showSavedReview(exam, saved, null);
        return true;
      } catch (err) {
        console.error('Lỗi xem lại bài theo result_id:', err);
        return false;
      }
    }

    // Kiểm tra người dùng đã nộp bài trong phòng này chưa.
    // [FIX] Có bài nộp gắn đúng room_code trong exam_results -> coi là ĐÃ NỘP (không phụ thuộc room_participants.is_finished).
    // Bản ghi cũ chưa có room_code -> chỉ fallback theo đề thi khi phòng đã đánh dấu is_finished.
    // Trả về true nếu đã hiển thị chế độ xem lại thành công (để initExam() không khởi động giờ làm bài mới).
    async function checkAndRenderRoomReview(roomCode, exam) {
      try {
        const { data: participant } = await sbClient
          .from('room_participants')
          .select('is_finished, score, completion_time')
          .eq('room_code', roomCode)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        let savedResult = null;

        // 1) Tìm chính xác theo room_code
        try {
          const { data: exactResults, error: exactErr } = await sbClient
            .from('exam_results')
            .select('*')
            .eq('exam_id', exam.id)
            .eq('user_id', currentUser.id)
            .eq('room_code', roomCode)
            .order('submitted_at', { ascending: false })
            .limit(1);
          if (!exactErr && exactResults && exactResults.length > 0) savedResult = exactResults[0];
        } catch (e) { /* Cột room_code có thể chưa tồn tại -> dùng fallback bên dưới */ }

        // 2) Fallback cho bản ghi cũ: chỉ dùng khi phòng đã đánh dấu hoàn thành
        if (!savedResult && participant && participant.is_finished) {
          const { data: results, error } = await sbClient
            .from('exam_results')
            .select('*')
            .eq('exam_id', exam.id)
            .eq('user_id', currentUser.id)
            .order('submitted_at', { ascending: false })
            .limit(1);
          if (!error && results && results.length > 0) savedResult = results[0];
        }

        if (!savedResult) return false; // Chưa nộp bài trong phòng này -> cho làm bài bình thường

        showSavedReview(exam, savedResult, participant);
        return true;
      } catch (err) {
        console.error("Lỗi kiểm tra bài đã nộp trong phòng:", err);
        return false;
      }
    }

    // [BỔ SUNG] Chấm lại & hiển thị Đáp Án + Giải Thích dựa trên dữ liệu ĐÃ LƯU (answers từ exam_results),
    // dùng lại cùng logic chấm điểm như submitExam() nhưng lấy giá trị từ dữ liệu đã nộp thay vì từ các ô input trên màn hình.
    function renderReviewFromSavedAnswers(questions, savedAnswers) {
      const saved = savedAnswers || {};
      gradeQuestions(questions, q => saved[q._key]);
      renderResultMode(questions);
    }

    function renderPassageWithVocab(passageHTML, vocabData = []) {
      if (!passageHTML) return '';

      let vocabList = vocabData;
      if (typeof vocabList === 'string') {
        try { vocabList = JSON.parse(vocabList); } catch (e) { vocabList = []; }
      }

      if (!Array.isArray(vocabList) || vocabList.length === 0) return passageHTML;

      const sortedVocab = [...vocabList]
        .filter(v => v && (v.word || v.term))
        .sort((a, b) => ((b.word || b.term).length - (a.word || a.term).length));

      if (sortedVocab.length === 0) return passageHTML;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = passageHTML;

      function highlightTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue;
          if (!text || !text.trim()) return;

          let hasMatch = false;
          let htmlResult = text;

          sortedVocab.forEach(item => {
            const wordStr = item.word || item.term;
            if (!wordStr) return;

            const escapedWord = wordStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');

            if (regex.test(htmlResult)) {
              hasMatch = true;
              const encodedData = encodeURIComponent(JSON.stringify(item));
              const spanHTML = `<span class="vocab-item cursor-pointer border-b-2 border-dotted border-[#cf1717] dark:border-red-400 bg-red-500/10 dark:bg-red-500/20 px-0.5 rounded font-semibold text-gray-900 dark:text-gray-100 hover:bg-red-500/20" data-vocab="${encodedData}">$1</span>`;
              htmlResult = htmlResult.replace(regex, spanHTML);
            }
          });

          if (hasMatch) {
            const spanWrapper = document.createElement('span');
            spanWrapper.innerHTML = htmlResult;
            node.parentNode.replaceChild(spanWrapper, node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && !node.classList.contains('vocab-item')) {
            Array.from(node.childNodes).forEach(highlightTextNodes);
          }
        }
      }

      Array.from(tempDiv.childNodes).forEach(highlightTextNodes);
      return tempDiv.innerHTML;
    }

    // Highlight & dictionary interactions are now owned by assets/js/ru-highlight.js.
    // Do not bind legacy mouse/touch/selection listeners here: they conflict with the shared menu.

    document.addEventListener('mouseover', function(e) {
      const vocabTarget = e.target.closest('.vocab-item');
      if (vocabTarget) {
        try {
          const item = JSON.parse(decodeURIComponent(vocabTarget.getAttribute('data-vocab')));
          showVocabTooltip(vocabTarget, item);
        } catch(err) {}
      }
    });

    document.addEventListener('mouseout', function(e) {
      if (e.target.closest('.vocab-item')) {
        hideVocabTooltip();
      }
    });

    function showVocabTooltip(target, item) {
      const tooltip = document.getElementById('vocabTooltip');
      if (!tooltip) return;

      document.getElementById('tooltipWord').innerText = item.word || item.term || '';
      
      const typeStr = item.type ? '(' + item.type + ')' : '';
      document.getElementById('tooltipIpaType').innerText = ((item.ipa || '') + ' ' + typeStr).trim();
      
      const mElem = document.getElementById('tooltipMeaning');
      mElem.innerHTML = item.meaning ? '<i class="bi bi-arrow-right-circle mr-1"></i>' + item.meaning : '';
      mElem.style.display = item.meaning ? 'block' : 'none';

      const cElem = document.getElementById('tooltipContext');
      cElem.innerHTML = item.context ? 'Context: ' + item.context : '';
      cElem.style.display = item.context ? 'block' : 'none';

      const colElem = document.getElementById('tooltipColloc');
      colElem.innerHTML = item.collocation ? 'Collocation: ' + item.collocation : '';
      colElem.style.display = item.collocation ? 'block' : 'none';

      tooltip.classList.remove('hidden');
      tooltip.classList.remove('opacity-0');

      const rect = target.getBoundingClientRect();
      let top = rect.top - tooltip.offsetHeight - 8;
      let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);

      if (top < 10) top = rect.bottom + 8;
      if (left < 10) left = 10;
      if (left + tooltip.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltip.offsetWidth - 10;
      }

      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
    }

    function hideVocabTooltip() {
      const tooltip = document.getElementById('vocabTooltip');
      if (tooltip) {
        tooltip.classList.add('opacity-0');
        tooltip.classList.add('hidden');
      }
    }

    function renderExamData() {
      const headerTitle = document.getElementById('examHeaderTitle');
      if (headerTitle) headerTitle.innerText = currentExam.title || '';

      const topicTag = document.getElementById('examTopicTag');
      if (topicTag) topicTag.innerText = currentExam.topic || 'General';

      const passageBox = document.getElementById('passageContent');
      if (passageBox) {
        const rawPassage = currentExam.passage_html || currentExam.passage || '<p>No passage content.</p>';
        const vocabList = currentExam.vocab_list || currentExam.vocab || currentExam.vocabularies || currentExam.vocabulary || [];
        passageBox.innerHTML = renderPassageWithVocab(rawPassage, vocabList);
      }

      const questions = currentExam.questions || [];
      const countTag = document.getElementById('questionCountTag');
      if (countTag) countTag.innerText = questions.filter(q => !isTextBlock(q)).length + ' questions';

      const form = document.getElementById('questionsForm');
      if (!form) return;
      form.onsubmit = e => e.preventDefault();
      // Auto-size fill-in inputs to their text (min width = default box)
      const fitInput = inp => {
        const probe = fitInput.probe || (fitInput.probe = document.createElement('span'));
        const cs = getComputedStyle(inp);
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0;font:' + cs.font + ';letter-spacing:' + cs.letterSpacing;
        probe.textContent = inp.value || '';
        document.body.appendChild(probe);
        const w = probe.offsetWidth + 12;
        document.body.removeChild(probe);
        inp.style.width = Math.max(112, w) + 'px';
      };
      form.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('fill-auto')) fitInput(e.target); });

      form.innerHTML = questions.map((q, idx) => {
        if (isBlockQ(q)) return renderBlockQuestionHTML(q, idx);
        const qNum = q._num || (idx + 1);
        const isEssay = q.is_essay || q.type === 'essay';

        if (isEssay) {
          return `
            <div class="p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-2 sm:space-y-3">
              ${qHead(qNum, q.question)}
              <textarea name="q_idx_${idx}" rows="4" placeholder="Write your essay answer here..." class="w-full p-2.5 text-xs sm:text-sm rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#cf1717]"></textarea>
            </div>`;
        }

        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          return `
            <div class="p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-2 sm:space-y-3">
              ${qHead(qNum, q.question)}
              <div class="space-y-1.5 sm:space-y-2">
                ${q.options.map(opt => `
                  <label class="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm p-2 sm:p-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition">
                    <input type="radio" name="q_idx_${idx}" value="${opt}" class="accent-[#cf1717]">
                    <span>${opt}</span>
                  </label>
                `).join('')}
              </div>
            </div>`;
        } 
        
        const matches = [...String(q.question || '').matchAll(/\((\d+)\)/g)];
        const blankNumbers = [...new Set(matches.map(m => m[1]))];

        if (blankNumbers.length > 0) {
          return `
            <div class="p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-3">
              ${qHead(qNum, q.question)}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1">
                ${blankNumbers.map(num => `
                  <div class="flex items-center gap-2 bg-white dark:bg-zinc-800/80 p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <span class="font-black text-xs sm:text-sm text-[#cf1717] min-w-[28px] text-center">(${num})</span>
                    <input type="text" 
                           name="q_idx_${idx}_blank_${num}" 
                           data-qidx="${idx}" 
                           data-blank="${num}"
                           placeholder="Enter answer for (${num})..." 
                           class="w-full text-xs sm:text-sm bg-transparent focus:outline-none dark:text-white">
                  </div>
                `).join('')}
              </div>
            </div>`;
        }

        return `
          <div class="p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-2 sm:space-y-3">
            ${qHead(qNum, q.question)}
            <input type="text" name="q_idx_${idx}" placeholder="Type your answer..." class="w-full p-2 sm:p-2.5 text-xs sm:text-sm rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#cf1717]">
          </div>`;
      }).join('');
    }

    function cleanIELTSAnswer(str) {
      if (!str) return '';
      return str.toString().trim().toLowerCase().replace(/[.,!?;:]+$/g, '').replace(/\s+/g, ' ').trim();
    }

    function checkSingleMatch(userVal, correctAns) {
      const cleanU = cleanIELTSAnswer(userVal);
      if (Array.isArray(correctAns)) {
        return correctAns.some(ans => cleanIELTSAnswer(ans) === cleanU);
      }
      return cleanU === cleanIELTSAnswer(correctAns);
    }

    async function submitExam() {
      clearInterval(timerInterval);
      const questions = currentExam.questions || [];
      const graded = gradeQuestions(questions, readAnswerFromDOM);
      const userAnswers = graded.answers;
      const finalScore10 = Number(graded.totalScore.toFixed(2));

      // [BỔ SUNG] Lấy room_code trên URL (nếu đang làm bài trong phòng) để lưu kèm vào exam_results
      const submitUrlParams = new URLSearchParams(window.location.search);
      const submitRoomCode = submitUrlParams.get('room_code') || null;

      const payload = {
        exam_id: currentExam.id,
        user_id: currentUser.id,
        score: finalScore10,
        answers: userAnswers,
        time_spent: timeSpentSeconds,
        room_code: submitRoomCode // [BỔ SUNG] Liên kết chính xác lượt nộp bài này với đúng phòng đấu
      };

      const { data, error } = await sbClient.from('exam_results').insert([payload]);

      if (error) {
        alert("Error saving result: " + error.message);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      const roomCode = urlParams.get('room_code');
      if (roomCode && currentUser) {
        localStorage.setItem('last_active_room', roomCode);
        await sbClient
          .from('room_participants')
          .update({
            score: finalScore10,
            completion_time: timeSpentSeconds,
            is_finished: true
          })
          .eq('room_code', roomCode)
          .eq('user_id', currentUser.id);
      }

      await rewardXPAndStreak(20);
      renderResultMode(questions);

      const scoreElem = document.getElementById('finalScore');
      if (scoreElem) scoreElem.innerText = finalScore10 + '/10 points';
      
      const timeElem = document.getElementById('finalTime');
      if (timeElem) timeElem.innerText = Math.floor(timeSpentSeconds / 60) + 'm ' + (timeSpentSeconds % 60) + 's';
      
      const resultModal = document.getElementById('resultModal');
      if (resultModal) resultModal.classList.remove('hidden');
      disableSubmitBtn();
    }

    function renderResultMode(questions) {
      const questionBox = document.getElementById('questionsForm'); 
      if (!questionBox) return;

      const htmlContent = questions.map((q, idx) => {
        if (isBlockQ(q)) return renderBlockResult(q);
        const status = q.status || (q.isCorrect ? 'correct' : 'wrong');
        const userVal = q.userSelected;
        const correctVal = q.answer;

        let badgeHTML = '';
        let containerStyle = '';

        if (status === 'essay') {
          badgeHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><i class="bi bi-pencil mr-1"></i>Essay (Recorded)</span>`;
          containerStyle = 'bg-blue-50/30 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40';
        } else if (status === 'correct') {
          badgeHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><i class="bi bi-check-lg mr-1"></i>Correct</span>`;
          containerStyle = 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
        } else if (status === 'partial') {
          const earned = q.earnedPoints !== undefined ? q.earnedPoints : 0;
          badgeHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"><i class="bi bi-lightning-charge-fill mr-1"></i>Correct ${(q.correctSubCount || 0)}/${(q.totalBlanks || 0)} items (+${earned} pts)</span>`;
          containerStyle = 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60';
        } else {
          badgeHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><i class="bi bi-x-lg mr-1"></i>Wrong</span>`;
          containerStyle = 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
        }

        let bodyHTML = '';

        if (status === 'essay') {
          bodyHTML = `
            <div class="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-xs">
              <span class="text-gray-400 font-bold block mb-1">Your essay answer:</span>
              <p class="text-gray-800 dark:text-gray-200 whitespace-pre-line font-medium">${userVal || 'No answer entered.'}</p>
            </div>`;
        } else if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          bodyHTML = q.options.map(opt => {
            const optKey = opt.trim().charAt(0).toLowerCase();
            const correctKey = (correctVal || '').toString().trim().charAt(0).toLowerCase();
            const userKey = (userVal || '').toString().trim().charAt(0).toLowerCase();

            let style = "text-gray-600 dark:text-gray-400 p-1.5 rounded-lg";
            if (optKey === correctKey) {
              style = "font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 p-1.5 rounded-lg";
            } else if (optKey === userKey && status !== 'correct') {
              style = "font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg line-through";
            }
            return `<div class="${style}">${opt}</div>`;
          }).join('');

        } else {
          const isMultiBlank = (typeof correctVal === 'object' && correctVal !== null && !Array.isArray(correctVal)) || 
                               (typeof userVal === 'object' && userVal !== null);

          if (isMultiBlank) {
            const keys = Array.from(new Set([
              ...Object.keys(correctVal || {}),
              ...Object.keys(userVal || {})
            ])).sort((a, b) => Number(a) - Number(b));

            const subItemsHTML = keys.map(key => {
              const uSubAns = (userVal && userVal[key]) ? userVal[key] : 'Not answered';
              let cSubAns = correctVal ? correctVal[key] : '';
              if (Array.isArray(cSubAns)) cSubAns = cSubAns.join(' / ');

              const isSubCorrect = checkSingleMatch(uSubAns, correctVal ? correctVal[key] : '');

              return `
                <div class="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-xs space-y-1">
                  <div class="font-bold text-[#cf1717] dark:text-red-400">Blank (${key}):</div>
                  <div><span class="text-gray-400">Your answer:</span> <strong class="${isSubCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${uSubAns}</strong></div>
                  <div><span class="text-gray-400">Correct answer:</span> <strong class="text-green-600 dark:text-green-400">${cSubAns}</strong></div>
                </div>`;
            }).join('');

            bodyHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">${subItemsHTML}</div>`;
          } else {
            let displayCorrect = correctVal;
            if (Array.isArray(displayCorrect)) displayCorrect = displayCorrect.join(' / ');

            bodyHTML = `
              <div class="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 space-y-1 text-xs">
                <div><span class="text-gray-400">Your answer:</span> <strong class="${status === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${userVal || 'Not answered'}</strong></div>
                <div><span class="text-gray-400">Correct answer:</span> <strong class="text-green-600 dark:text-green-400">${displayCorrect}</strong></div>
              </div>`;
          }
        }

        let explanationHTML = '';
        if (q.explanation) {
          if (typeof q.explanation === 'string') {
            explanationHTML = `
              <div class="mt-3 pt-3 border-t border-gray-200/60 dark:border-zinc-700/60 text-xs">
                <div class="flex items-center gap-1 text-[#cf1717] dark:text-red-400 font-bold mb-1">
                  <i class="bi bi-lightbulb-fill"></i>
                  <span>Detailed explanation:</span>
                </div>
                <div class="text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                  ${q.explanation}
                </div>
              </div>`;
          } else if (typeof q.explanation === 'object') {
            const expItemsHTML = Object.keys(q.explanation).map(key => {
              return '<div class="text-gray-700 dark:text-gray-300 leading-relaxed border-b border-gray-100 dark:border-zinc-700/50 last:border-none pb-1.5 last:pb-0">' +
                     '<span class="font-black text-[#cf1717] dark:text-red-400">Blank (' + key + '):</span> ' + q.explanation[key] +
                     '</div>';
            }).join('');

            explanationHTML = `
              <div class="mt-3 pt-3 border-t border-gray-200/60 dark:border-zinc-700/60 text-xs">
                <div class="flex items-center gap-1 text-[#cf1717] dark:text-red-400 font-bold mb-2">
                  <i class="bi bi-lightbulb-fill"></i>
                  <span>Detailed explanation for each blank:</span>
                </div>
                <div class="space-y-2 bg-white dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                  ${expItemsHTML}
                </div>
              </div>`;
          }
        }

        return `
          <div class="p-4 sm:p-5 rounded-2xl border ${containerStyle} space-y-3 mb-4">
            <div class="flex justify-between items-start gap-2">
              <div class="min-w-0 flex-1">${qHead(idx + 1, q.question || q.title || '', 'text-sm')}</div>
              ${badgeHTML}
            </div>

            <div class="space-y-1.5 text-xs">
              ${bodyHTML}
            </div>

            ${explanationHTML}
          </div>`;
      }).join('');

      questionBox.innerHTML = htmlContent;
    }

function triggerPDFPrint() {
  if (!currentExam) {
    alert("Loading exam data, please wait a moment!");
    return;
  }

  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  const title = currentExam.title || 'READING PRACTICE TEST';
  const passageHTML = currentExam.passage_html || currentExam.passage || '';
  const questions = currentExam.questions || [];
  const imageURL = currentExam.image_url || currentExam.image || '';
  const imageCaption = currentExam.image_caption || '';
  const vocabList = currentExam.vocab_list || currentExam.vocab || currentExam.vocabularies || currentExam.vocabulary || [];

  // Tạo HTML câu hỏi
  const questionsPDFHTML = questions.map((q, idx) => {
    if (isBlockQ(q)) {
      if (q.type === 'text') return '<div class="pdf-question-item">' + (q.content || '') + '</div>';
      let body = q.content || '', bopts = '', note = '';
      if (q.type === 'fill') body = body.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => '<b>(' + n + ')</b> ________');
      if (['mcq', 'multi', 'tf'].includes(q.type) && Array.isArray(q.options)) {
        bopts = '<div class="pdf-options">' + q.options.map((o, oi) => '<div class="pdf-option"><b>' + (q.type === 'multi' ? '&#9744;' : String.fromCharCode(65 + oi) + '.') + '</b> ' + escHTML(o.text) + '</div>').join('') + '</div>';
      }
      if (q.type === 'multi') note = '<div class="pdf-multi-note">(Choose ALL correct answers)</div>';
      return '<div class="pdf-question-item"><div class="pdf-question-title"><span class="qnum">Question ' + q._num + ':</span><div class="qbody">' + body + '</div></div>' + note + bopts + '</div>';
    }
    let opts = '';
    if (q.options && Array.isArray(q.options)) {
      opts = '<div class="pdf-options">' + 
        q.options.map(o => '<div class="pdf-option">' + o + '</div>').join('') + 
      '</div>';
    }
    return '<div class="pdf-question-item">' +
      '<div class="pdf-question-title"><span class="qnum">Question ' + (q._num || idx + 1) + ':</span><div class="qbody">' + (q.question || '') + '</div></div>' +
      opts +
    '</div>';
  }).join('');

  // Tạo HTML ảnh minh họa nếu có
  let imageHTML = '';
  if (imageURL) {
    imageHTML = `
      <div class="pdf-image-box">
        <img src="${imageURL}" alt="Illustration">
        ${imageCaption ? `<div class="pdf-caption">${imageCaption}</div>` : ''}
      </div>`;
  }

  // Tạo HTML Bảng từ vựng
  let vocabPDFHTML = '';
  let parsedVocab = vocabList;
  if (typeof parsedVocab === 'string') {
    try { parsedVocab = JSON.parse(parsedVocab); } catch(e) { parsedVocab = []; }
  }

  if (Array.isArray(parsedVocab) && parsedVocab.length > 0) {
    const rows = parsedVocab.map(v => {
      const w = v.word || v.term || '';
      const ipa = v.ipa || '';
      const type = v.type ? '(' + v.type + ')' : '';
      const meaning = v.meaning || '';
      return '<tr><td><strong>' + w + '</strong></td><td>' + ipa + ' ' + type + '</td><td>' + meaning + '</td></tr>';
    }).join('');

    vocabPDFHTML = `
      <div class="pdf-vocab-container">
        <div class="pdf-vocab-head">VOCABULARY & KEY TERMS</div>
        <table class="pdf-vocab-table">
          <thead>
            <tr>
              <th style="width: 30%;">Vocabulary</th>
              <th style="width: 30%;">Pronunciation / Part of speech</th>
              <th style="width: 40%;">Vietnamese Meaning</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  printArea.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-brand">
        <img src="https://i.ibb.co/wrPLDMMH/Xanh-Tr-ng-n-Gi-n-Bi-u-T-ng-Logo.png" alt="ReadUp Logo">
        <div class="pdf-brand-text">READ UP<br><span style="color:#000">ENGLISH</span></div>
      </div>
      <div class="pdf-header-title">${title}</div>
    </div>

    <div class="pdf-grid">
      <div class="pdf-passage-col">
        <div class="pdf-passage-title"><i class="bi bi-book-half"></i> Reading Passage</div>
        <div class="pdf-passage">${passageHTML}</div>
      </div>
      <div class="pdf-questions-col">
        ${imageHTML}
        <div class="pdf-passage-title"><i class="bi bi-pencil-square"></i> Questions</div>
        ${questionsPDFHTML}
      </div>
    </div>

    ${vocabPDFHTML}
  `;

  window.print();
}

    function closeResultModal() {
      const resultModal = document.getElementById('resultModal');
      if (resultModal) resultModal.classList.add('hidden');
    }

    function switchMobileTab(tab) {
      const reading = document.getElementById('readingSection');
      const questions = document.getElementById('questionsSection');
      const btnR = document.getElementById('mobileTabReading');
      const btnQ = document.getElementById('mobileTabQuestions');

      if (!reading || !questions || !btnR || !btnQ) return;

      if (tab === 'reading') {
        reading.classList.remove('hidden');
        questions.classList.add('hidden');
        btnR.className = "w-1/2 py-2.5 text-center font-bold text-xs text-[#cf1717] border-b-2 border-[#cf1717]";
        btnQ.className = "w-1/2 py-2.5 text-center font-bold text-xs text-gray-400";
      } else {
        reading.classList.add('hidden');
        questions.classList.remove('hidden');
        questions.classList.add('block');
        btnQ.className = "w-1/2 py-2.5 text-center font-bold text-xs text-[#cf1717] border-b-2 border-[#cf1717]";
        btnR.className = "w-1/2 py-2.5 text-center font-bold text-xs text-gray-400";
      }
    }

    function startTimer(minutes) {
      let remaining = minutes * 60;
      timerInterval = setInterval(() => {
        remaining--;
        timeSpentSeconds++;
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        const timerElem = document.getElementById('timerDisplay');
        if (timerElem) timerElem.innerText = `${m}:${s}`;
        if (remaining <= 0) {
          clearInterval(timerInterval);
          submitExam();
        }
      }, 1000);
    }

    function confirmSubmitExam() {
      if (confirm("Are you sure you want to submit the exam?")) {
        submitExam();
      }
    }

    function disableSubmitBtn() {
      const btn = document.getElementById('submitBtn');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Submitted';
        btn.className = 'px-3 sm:px-4 py-2 bg-gray-400 dark:bg-zinc-700 text-gray-200 dark:text-gray-400 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed opacity-75 shadow-none pointer-events-none';
      }
    }

    function updateThemeIcon() {
      const icon = document.getElementById('themeIcon');
      if (!icon) return;
      const isDark = document.documentElement.classList.contains('dark');
      // Light mode -> moon (click to go dark); dark mode -> sun (click to go light)
      icon.className = 'bi ' + (isDark ? 'bi-sun-fill text-amber-400' : 'bi-moon-stars-fill');
    }
    function toggleDarkMode() {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
      }
      updateThemeIcon();
    }
    document.addEventListener('DOMContentLoaded', updateThemeIcon);

    async function rewardXPAndStreak(addedXp = 20) {
      if (!currentUser) return;

      const todayStr = new Date().toISOString().split('T')[0];
      
      let { data: stat } = await sbClient.from('user_stats').select('*').eq('user_id', currentUser.id).maybeSingle();
      
      if (!stat) {
        await sbClient.from('user_stats').insert([{ 
          user_id: currentUser.id, 
          streak_count: 1, 
          total_xp: addedXp, 
          last_study_date: todayStr 
        }]);
        return;
      }

      let currentStreak = stat.streak_count || 0;
      let lastDate = stat.last_study_date;
      let newXp = (stat.total_xp || 0) + addedXp;

      if (lastDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      }

      await sbClient.from('user_stats').update({
        streak_count: currentStreak,
        total_xp: newXp,
        last_study_date: todayStr,
        updated_at: new Date()
      }).eq('user_id', currentUser.id);
    }

    window.onload = initExam;

// ================= XỬ LÝ NỘP BÀI TRONG PHÒNG =================
async function submitExamInRoom(score, totalQuestions, timeTakenSeconds) {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room_code');

  // 1. Hiển thị Kết quả & Giải thích chi tiết trên màn hình exam.html
  displayExamResultAndExplanation(score, totalQuestions);

  // 2. Nếu đang làm trong phòng -> Cập nhật kết quả lên Supabase
  if (roomCode && currentUser) {
    const { error } = await sbClient
      .from('room_participants')
      .update({
        score: score,
        completion_time: timeTakenSeconds,
        is_finished: true
      })
      .eq('room_code', roomCode)
      .eq('user_id', currentUser.id);

    if (!error) {
      console.log("Đã cập nhật kết quả phòng thành công!");
    }
  }
}

// XỬ LÝ KHI BẤM NÚT "TRỞ VỀ DASHBOARD"
function exitToDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room_code') || localStorage.getItem('last_active_room');
  
  if (roomCode) {
    window.location.href = `dashboard.html?active_room=${roomCode}`;
  } else {
    window.location.href = `dashboard.html`;
  }
}

    // 1. TỰ ĐỘNG GỌI HÀM NÀY KHI BÀI THI HOÀN THÀNH / NỘP BÀI
async function onExamFinished(score, totalQuestions, timeInSeconds) {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room_code');

  if (roomCode && currentUser) {
    // Ghi nhớ mã phòng vào bộ nhớ trình duyệt
    localStorage.setItem('last_active_room', roomCode);

    // Cập nhật trạng thái "Đã làm xong" + Điểm + Thời gian lên Supabase
    await sbClient
      .from('room_participants')
      .update({
        score: score,
        completion_time: timeInSeconds,
        is_finished: true
      })
      .eq('room_code', roomCode)
      .eq('user_id', currentUser.id);
  }
}



  
;
/* Source: assets/js/ru-highlight.js */
/* ReadUp highlight & dictionary: a single event owner for both exam.html and assignment.html. */
(function (w) {
  'use strict';
  const palette = {yellow:'#fff176',green:'#c8e6c9',blue:'#bbdefb',pink:'#f8bbd0',orange:'#ffe0b2',purple:'#e1bee7'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name) => `<i class="bi bi-${name}" aria-hidden="true"></i>`;
  const menu = document.getElementById('textSelectionMenu');
  if (!menu) return;
  // All old selection handlers in the two page scripts have been retired; this is the only owner.
  menu.className = 'ruhl-menu hidden';
  menu.setAttribute('role','toolbar'); menu.setAttribute('aria-label','Tô màu và tra cứu văn bản');
  const swatches=Object.entries(palette).map(([name,color]) => `<button type="button" class="ruhl-swatch" data-ruhl-color="${name}" title="Tô màu ${name}" aria-label="Tô màu ${name}"><span class="ruhl-color-dot" style="background:${color}"></span>${name[0].toUpperCase()+name.slice(1)}</button>`).join('');
  menu.innerHTML=`<div class="ruhl-title">${icon('highlighter')} <strong>Highlight</strong><button type="button" class="ruhl-x" data-ruhl-action="hide" title="Đóng">${icon('x-lg')}</button></div><div class="ruhl-swatches">${swatches}</div><div class="ruhl-actions"><button type="button" data-ruhl-action="copy">${icon('clipboard')} <span>Copy</span></button><button type="button" data-ruhl-action="lookup">${icon('translate')} <span>Tra cứu</span></button><button type="button" data-ruhl-action="note">${icon('chat-left-text')} <span>Ghi chú</span></button><button type="button" id="btnRemoveHighlight" data-ruhl-action="remove">${icon('eraser')} <span>Bỏ tô</span></button><button type="button" class="ruhl-clear" data-ruhl-action="clear">${icon('trash3')} <span>Xóa tất cả</span></button></div>`;
  const panel=document.createElement('aside');panel.className='ruhl-lookup hidden';panel.id='ruhlLookup';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Tra cứu và dịch văn bản');
  panel.innerHTML=`<div class="ruhl-pophead"><strong>${icon('translate')} Tra cứu / Dịch</strong><button type="button" class="ruhl-x" data-ruhl-close title="Đóng">${icon('x-lg')}</button></div><div class="ruhl-popbody"><label for="ruhlTerm">Từ hoặc cụm từ</label><textarea id="ruhlTerm" rows="2" maxlength="400"></textarea><div class="ruhl-translatebar"><select id="ruhlLanguage" aria-label="Ngôn ngữ dịch"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="fr">Français</option><option value="ja">日本語</option><option value="ko">한국어</option></select><button type="button" class="ruhl-primary" data-ruhl-search>${icon('search')} Tra</button></div><div id="ruhlMeaning" class="ruhl-meaning" aria-live="polite">Chọn từ cần tra cứu</div><div id="ruhlLinks" class="ruhl-links"></div><div class="ruhl-popfoot"><button type="button" data-ruhl-copy>${icon('clipboard')} Sao chép</button><button type="button" data-ruhl-addnote>${icon('journal-plus')} Lưu ghi chú</button></div><small>Dịch nhanh qua MyMemory; liên kết mở trang từ điển ngoài.</small></div>`;
  const notes=document.createElement('div');notes.className='ruhl-note hidden';notes.id='ruhlNote';notes.setAttribute('role','dialog');notes.setAttribute('aria-label','Ghi chú văn bản');
  notes.innerHTML=`<div class="ruhl-pophead"><strong>${icon('chat-left-text')} Ghi chú</strong><button type="button" class="ruhl-x" data-ruhl-noteclose>${icon('x-lg')}</button></div><div class="ruhl-popbody"><div id="ruhlNoteQuote" class="ruhl-notequote"></div><textarea id="ruhlNoteText" rows="3" placeholder="Ghi chú hoặc nghĩa của từ…"></textarea><div class="ruhl-popfoot"><button type="button" data-ruhl-noteclose>Hủy</button><button type="button" class="ruhl-primary" data-ruhl-notesave>${icon('check2')} Lưu</button></div></div>`;
  document.body.append(panel,notes);
  let selectedRange=null, currentMark=null, selectedText='', anchorRect=null, requestId=0;
  const isOpen=el=>!el.classList.contains('hidden');
  function targetFromNode(node){const el=node && (node.nodeType===3?node.parentElement:node);return el?.closest?.('[data-rd-passage],#passageContent,#questionsForm,#questionArea');}
  function selection(){const s=w.getSelection();if(!s||s.isCollapsed||!s.rangeCount||!s.toString().trim())return null;const r=s.getRangeAt(0);const target=targetFromNode(r.commonAncestorContainer);if(!target || target.closest('[contenteditable="true"],input,textarea'))return null;return r;}
  function capture(){const r=selection();if(!r)return false;selectedRange=r.cloneRange();selectedText=r.toString().trim();currentMark=null;const boxes=r.getClientRects();anchorRect=(boxes.length?boxes[0]:r.getBoundingClientRect());return true;}
  function chosenText(){return currentMark?.textContent?.trim()||selectedText||selectedRange?.toString().trim()||'';}
  function closeMenu(){menu.classList.add('hidden');}
  function closePanel(){panel.classList.add('hidden');requestId++;}
  function closeNote(){notes.classList.add('hidden');}
  // Place the UI away from the selection. Side positions take priority; never center it on the text.
  function place(el, rect, preferSide=true){
    if(!rect)return;
    el.classList.remove('hidden');
    const gap=12,margin=10,VW=w.innerWidth,VH=w.innerHeight;
    const width=el.offsetWidth||260,height=el.offsetHeight||240;
    let left,top;
    if(preferSide && VW-rect.right-gap-margin>=width){left=rect.right+gap;top=rect.top-16;}
    else if(preferSide && rect.left-gap-margin>=width){left=rect.left-width-gap;top=rect.top-16;}
    else if(rect.top-gap-margin>=height){left=rect.left;top=rect.top-height-gap;}
    else if(VH-rect.bottom-gap-margin>=height){left=rect.left;top=rect.bottom+gap;}
    else if(VW-rect.right-gap-margin>=width){left=rect.right+gap;top=rect.top;}
    else {left=Math.max(margin,Math.min(VW-width-margin,rect.left));top=rect.bottom+gap;}
    left=Math.min(Math.max(margin,left),Math.max(margin,VW-width-margin));
    top=Math.min(Math.max(margin,top),Math.max(margin,VH-height-margin));
    el.style.left=Math.round(left)+'px';el.style.top=Math.round(top)+'px';
  }
  function openMenu(){if(!anchorRect)return;closePanel();closeNote();menu.querySelector('[data-ruhl-action="remove"]').hidden=!currentMark;place(menu,anchorRect,true);}
  function paint(color){
    if(!palette[color])return;
    if(currentMark?.isConnected){currentMark.style.backgroundColor=palette[color];currentMark.dataset.ruhlColor=color;closeMenu();return;}
    const r=selectedRange;if(!r || r.collapsed)return;
    const m=document.createElement('mark');m.className='highlight-item';m.dataset.ruhlColor=color;m.style.backgroundColor=palette[color];m.style.color='#18202c';m.style.padding='0 2px';m.style.borderRadius='3px';
    try{m.appendChild(r.extractContents());r.insertNode(m);currentMark=m;selectedText=m.textContent.trim();selectedRange=null;w.getSelection()?.removeAllRanges();}catch(e){console.warn('[ReadUp] Highlight không áp dụng cho vùng DOM này:',e);}
    closeMenu();
  }
  function unwrap(m){if(!m?.isConnected)return;const parent=m.parentNode;while(m.firstChild)parent.insertBefore(m.firstChild,m);m.remove();parent.normalize();}
  function remove(){unwrap(currentMark);currentMark=null;closeMenu();}
  function clear(){const marks=[...document.querySelectorAll('#passageContent mark.highlight-item,#questionsForm mark.highlight-item,#questionArea mark.highlight-item,[data-rd-passage] mark.highlight-item')];if(!marks.length){closeMenu();return;}if(!w.confirm('Xóa toàn bộ highlight trên trang?'))return;marks.reverse().forEach(unwrap);currentMark=null;closeMenu();}
  function fallbackCopy(t){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();document.execCommand('copy');a.remove();}
  function copy(t){if(!t)return;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t));else fallbackCopy(t);closeMenu();}
  function noteKey(){return 'readup-notes:'+location.pathname+location.search;}
  function storedNotes(){try{return JSON.parse(localStorage.getItem(noteKey())||'{}');}catch{return {};}}
  function openNote(initial){const text=chosenText();if(!text)return;closeMenu();closePanel();document.getElementById('ruhlNoteQuote').textContent=text;document.getElementById('ruhlNoteText').value=initial??currentMark?.dataset.ruhlNote??storedNotes()[text]??'';place(notes,anchorRect||{left:20,right:20,top:20,bottom:20},true);}
  function saveNote(){const text=chosenText(),value=document.getElementById('ruhlNoteText').value.trim();if(!text)return;const data=storedNotes();if(value)data[text]=value;else delete data[text];try{localStorage.setItem(noteKey(),JSON.stringify(data));}catch{}
    if(!currentMark&&selectedRange)paint('yellow');if(currentMark?.isConnected){currentMark.dataset.ruhlNote=value;currentMark.title=value;}closeNote();}
  function makeLinks(term,lang){const q=encodeURIComponent(term),urls=[['Oxford',`https://www.oxfordlearnersdictionaries.com/search/english/?q=${q}`],['Cambridge',`https://dictionary.cambridge.org/dictionary/english/${q}`],['Cambridge EN–VI',`https://dictionary.cambridge.org/dictionary/english-vietnamese/${q}`],['Google Dịch',`https://translate.google.com/?sl=en&tl=${encodeURIComponent(lang)}&text=${q}&op=translate`],['DeepL',`https://www.deepl.com/translator#en/${encodeURIComponent(lang)}/${q}`]];document.getElementById('ruhlLinks').innerHTML=urls.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${icon('box-arrow-up-right')} ${esc(name)}</a>`).join('');}
  function openLookup(){const t=chosenText();if(!t)return;closeMenu();closeNote();document.getElementById('ruhlTerm').value=t;place(panel,anchorRect||{left:12,right:12,top:12,bottom:12},true);lookup();}
  async function lookup(){const term=document.getElementById('ruhlTerm').value.trim().slice(0,400);if(!term)return;const lang=document.getElementById('ruhlLanguage').value,result=document.getElementById('ruhlMeaning');result.textContent='Đang tra cứu…';makeLinks(term,lang);const run=++requestId, controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);try{const pair=lang==='en'?'vi|en':'en|'+lang;const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(term)}&langpair=${encodeURIComponent(pair)}`,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(run===requestId)result.textContent=String(data?.responseData?.translatedText||'Không có nghĩa phù hợp; dùng từ điển phía dưới.');}catch(e){if(run===requestId)result.textContent='Chưa lấy được bản dịch, hãy dùng liên kết từ điển bên dưới.';}finally{clearTimeout(timer);}}
  menu.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
  menu.addEventListener('click',e=>{const c=e.target.closest('[data-ruhl-color]');if(c){paint(c.dataset.ruhlColor);return;}const a=e.target.closest('[data-ruhl-action]');if(!a)return;({hide:closeMenu,copy:()=>copy(chosenText()),lookup:openLookup,note:()=>openNote(),remove,clear})[a.dataset.ruhlAction]?.();});
  panel.addEventListener('click',e=>{if(e.target.closest('[data-ruhl-close]'))closePanel();else if(e.target.closest('[data-ruhl-search]'))lookup();else if(e.target.closest('[data-ruhl-copy]'))copy(document.getElementById('ruhlMeaning').textContent);else if(e.target.closest('[data-ruhl-addnote]'))openNote(document.getElementById('ruhlMeaning').textContent);});
  notes.addEventListener('click',e=>{if(e.target.closest('[data-ruhl-noteclose]'))closeNote();else if(e.target.closest('[data-ruhl-notesave]'))saveNote();});
  document.getElementById('ruhlTerm').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();lookup();}});
  document.addEventListener('pointerup',e=>{if(e.target.closest?.('#textSelectionMenu,#ruhlLookup,#ruhlNote'))return;
    const hit=e.target.closest?.('mark.highlight-item');if(hit&&targetFromNode(hit)){currentMark=hit;selectedText=hit.textContent.trim();selectedRange=null;anchorRect=hit.getBoundingClientRect();openMenu();return;}
    // pointerup is fired for mouse, pen and touch, including scrollable reading panes.
    if(capture()){openMenu();return;}
    closeMenu();
  });
  document.addEventListener('click',e=>{if(e.target.closest?.('#textSelectionMenu,#ruhlLookup,#ruhlNote'))return;if(!e.target.closest?.('mark.highlight-item')&&!selection()){closeMenu();closePanel();closeNote();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closePanel();closeNote();}});
  w.RUHighlight={paint,remove,clear,lookup:openLookup};
})(window);

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
