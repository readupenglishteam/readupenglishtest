/* Source: assets/js/pages/test.03.js */

const SB = supabase.createClient("https://klovtvjfvfenhkvifujy.supabase.co","sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-");
const MAX_VIOL = 3;               // quá 3 lần (lần thứ 4) → tự động nộp
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let me = JSON.parse(sessionStorage.getItem('rt_me')||'null'), cls = null, tests = [], offset = 0, ticker = null;
let X = null; // trạng thái phòng thi

function toast(m,ic){const d=document.createElement('div');d.className='pointer-events-auto bg-white dark:bg-zinc-800 border-l-4 border-[#cf1717] shadow-xl rounded-xl px-4 py-3 text-sm font-bold flex items-start gap-2';if(ic){const i=document.createElement('i');i.className='bi bi-'+ic+' text-[#cf1717] mt-0.5';d.appendChild(i);}const t=document.createElement('span');t.textContent=m;d.appendChild(t);$('toast').appendChild(d);setTimeout(()=>d.remove(),4500);}
const nowMs = () => Date.now() + offset;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'], DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function fmt(iso){const d=new Date(iso);let h=d.getHours(),ap=h>=12?'PM':'AM';h=h%12||12;return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2,'0')} ${ap}`;}
function openModal(h){$('modalBox').innerHTML=h;$('modal').classList.remove('hidden');$('modal').classList.add('flex');}
function closeModal(){$('modal').classList.add('hidden');$('modal').classList.remove('flex');}
const logo = `<div class="flex flex-col items-center mb-6"><div class="w-20 h-20 rounded-full bg-[#cf1717] flex items-center justify-center shadow-lg"><img src="https://i.ibb.co/9m1LMnz3/Xanh-Tr-ng-n-Gi-n-Bi-u-T-ng-Logo-1.png" class="h-14"></div><div class="mt-3 text-3xl font-black text-[#cf1717]">ReadUp <span class="text-xs font-bold text-white bg-[#cf1717] px-2 py-0.5 rounded-full align-middle">Test</span></div></div>`;
const card = 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl';
const inp = 'w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#cf1717]';

/* ---------- MÀN 1: THÔNG TIN ---------- */
function screenInfo(){
  clearInterval(ticker);
  $('app').classList.add('info-wide');
  $('app').innerHTML = `<div class="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center">
    <div class="hidden lg:flex justify-center items-center"><img src="https://i.ibb.co/YFwT790Y/Nh-m-h-c-ti-ng-Anh-Read-Up-n-ng-ng.png" alt="Học tiếng Anh cùng Read Up English" loading="lazy" draggable="false" class="w-full max-w-[34rem] max-h-[80vh] object-contain pointer-events-none select-none drop-shadow-2xl"></div>
    <div class="lg:pl-6">${logo}<div class="${card} p-6 sm:p-8 max-w-md mx-auto">
    <h1 class="text-center text-xl sm:text-2xl font-black text-[#cf1717] uppercase tracking-wide leading-snug mb-4">HỆ THỐNG PHÒNG LÀM BÀI KIỂM TRA</h1>
    <h2 class="text-base font-extrabold mb-1">Thông tin thí sinh</h2>
    <p class="text-xs text-gray-500 mb-5">Nhập đúng họ tên và email đã đăng ký với trung tâm để hệ thống tìm lớp của bạn.</p>
    <div class="space-y-3">
      <input id="inName" class="${inp}" placeholder="Họ và tên" value="${esc(me?.name||'')}" autocomplete="name">
      <input id="inEmail" type="email" class="${inp}" placeholder="Email của bạn" value="${esc(me?.email||'')}" autocomplete="email">
      <button id="btnFind" onclick="findClasses()" class="w-full py-3 rounded-xl bg-[#cf1717] text-white font-extrabold hover:bg-red-700 transition">Tìm lớp của tôi</button>
    </div></div></div></div>`;
}
async function findClasses(){
  const name=$('inName').value.trim(), email=$('inEmail').value.trim();
  if(!name||!/^\S+@\S+\.\S+$/.test(email)) return toast('Vui lòng nhập họ tên và email hợp lệ','exclamation-triangle-fill');
  $('btnFind').disabled=true; $('btnFind').textContent='Đang tìm...';
  const {data,error}=await SB.rpc('test_find_classes',{p_name:name,p_email:email});
  if(error){toast(error.message,'x-circle-fill');return screenInfo();}
  me={name,email}; sessionStorage.setItem('rt_me',JSON.stringify(me));
  if(!data||!data.length){toast('Không tìm thấy lớp nào khớp họ tên + email này');return screenInfo();}
  screenClasses(data);
}

/* ---------- MÀN 2: CHỌN LỚP ---------- */
const meChip=()=>me?`<span class="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 max-w-full"><i class="bi bi-person-badge"></i><span class="truncate">${esc(me.name)} · ${esc(me.email)}</span></span>`:'';
function screenClasses(list){
  $('app').classList.remove('info-wide'); clearInterval(ticker); sessionStorage.setItem('rt_classes',JSON.stringify(list)); sessionStorage.removeItem('rt_cls');
  $('app').innerHTML = `${logo}<div class="max-w-xl mx-auto">
    <div class="flex justify-between items-center mb-3"><h1 class="text-lg font-extrabold"><i class="bi bi-person-circle text-[#cf1717]"></i> Xin chào, ${esc(me.name)}</h1><button onclick="logout()" class="text-xs font-bold text-[#cf1717] hover:underline">Đổi thí sinh</button></div>
    <div class="mb-3">${meChip()}</div>
    <p class="text-sm text-gray-500 mb-4">Chọn lớp để xem bài thi:</p>
    <div class="space-y-3">${list.map((c,i)=>`<button onclick='pickClass(${JSON.stringify(c).replace(/'/g,"&#39;")})' class="${card} w-full text-left p-5 hover:border-[#cf1717] hover:-translate-y-0.5 transition">
      <div class="text-xs font-black text-[#cf1717] uppercase">${esc(c.class_code)}</div>
      <div class="font-extrabold text-lg">${esc(c.title)}</div>
      <div class="text-sm text-gray-500 mt-1">${esc(c.info||'')}</div></button>`).join('')}</div></div>`;
  window._classes=list;
}
function logout(){['rt_me','rt_classes','rt_cls'].forEach(k=>sessionStorage.removeItem(k));me=null;screenInfo();}

/* ---------- MÀN 3: BÀI THI CỦA LỚP ---------- */
async function pickClass(c){
  $('app').classList.remove('info-wide'); cls=c; sessionStorage.setItem('rt_cls',JSON.stringify(c)); $('app').innerHTML=`${logo}<p class="text-center text-gray-500">Đang tải bài thi...</p>`;
  const {data,error}=await SB.rpc('test_list',{p_class_id:c.id,p_name:me.name,p_email:me.email});
  if(error||!data){toast(error?.message||'Không có quyền truy cập lớp','x-circle-fill');return screenClasses(window._classes);}
  offset=new Date(data.now).getTime()-Date.now(); tests=data.tests; renderTests();
  clearInterval(ticker); ticker=setInterval(renderTests,1000);
}
function renderTests(){
  if(!$('testList')) $('app').innerHTML=`${logo}<div class="max-w-xl mx-auto">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-3"><button onclick="screenClasses(window._classes)" class="text-xs font-bold text-[#cf1717] hover:underline"><i class="bi bi-arrow-left"></i> Chọn lớp khác</button>${meChip()}</div>
    <div class="${card} p-5 mb-4"><div class="text-xs font-black text-[#cf1717] uppercase">${esc(cls.class_code)}</div><div class="text-xl font-extrabold">${esc(cls.title)}</div><div class="text-sm text-gray-500">${esc(cls.info||'')}</div></div>
    <div id="testList" class="space-y-3"></div></div>`;
  $('testList').innerHTML = tests.length ? tests.map(testCard).join('') : '<p class="text-center text-gray-400 italic py-8">Lớp này chưa có bài thi nào.</p>';
}
/* Mọi điểm hiển thị đều quy về THANG 10 (điểm / tổng điểm × 10), bất kể bài có bao nhiêu câu hay tổng bao nhiêu điểm. */
const g10=(score,total)=>{const t=Number(total)||0;return t>0?Math.round((Number(score)||0)/t*1000)/100:0;};
const xTotal=()=>{const lf=q=>q.type==='reading'?(q.sub_blocks||[]).flatMap(lf):(q.type==='text'?[]:[q]);return (X&&X.q?X.q.flatMap(lf):[]).reduce((s,q)=>s+(parseFloat(q.points)||0),0);};
function testCard(t){
  const n=nowMs(), op=new Date(t.open_at).getTime(), cl=new Date(t.close_at).getTime();
  const hasAtt='attempts_used' in t, used=+t.attempts_used||0, max=+t.max_attempts||0, left=!max||used<max;   // max = 0 / null → không giới hạn
  const hasBest=t.best_score!=null, bestTxt=hasBest?((t.best_total??t.total_points)?`${g10(t.best_score,t.best_total??t.total_points)} / 10`:`${t.best_score}`):'';
  const inProg=!!t.in_progress||(t.started&&!t.submitted);
  const gradeBadge=hasBest?`<span class="badge"><i class="bi bi-award-fill text-amber-500"></i> Your grade: <b class="text-[#cf1717]">${esc(bestTxt)}</b>${!max&&used>1?' (highest)':''}</span>`:'';
  let act='';
  if(t.cancelled){ act='<span class="badge" style="color:#ef4444"><i class="bi bi-slash-circle"></i> Result cancelled — no retake</span>'; }
  else if(n<op){ const s=Math.ceil((op-n)/1000); act=`<span class="badge"><i class="bi bi-hourglass-split"></i> Mở sau ${s>86400?Math.floor(s/86400)+' ngày ':''}${String(Math.floor(s%86400/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}</span>`; }
  else if(inProg&&n<cl){ act=`<button onclick="askPass('${t.id}')" class="btn">Tiếp tục làm bài</button>`; }
  else if(t.submitted||used>0){
    if(n>=cl) act = t.show_result?`<button onclick="showResult('${t.id}')" class="btn">View grade</button>`:(gradeBadge||`<span class="badge">Submitted</span>`);
    else act = `<div class="flex flex-col items-end gap-2">${(!max&&gradeBadge)||`<span class="badge"><i class="bi bi-check-circle-fill text-emerald-500"></i> Submitted</span>`}${left&&hasAtt?`<button onclick="askPass('${t.id}')" class="btn">Làm lại bài</button>`:''}<span class="text-[11px] text-gray-400">${max?'You can view your grade when the test closes.':'Answers are shown when the test closes.'}</span></div>`;
  }
  else if(n>=cl){ act='<span class="badge" style="color:#ef4444"><i class="bi bi-x-octagon-fill"></i> Bạn chưa nộp bài — đề đã đóng</span>'; }
  else act=`<button onclick="askPass('${t.id}')" class="btn">${t.started?'Tiếp tục làm bài':'Vào làm bài'}</button>`;
  const attTxt=!hasAtt?'':(max?`Attempts: <b>${used} / ${max}</b>`:`Attempts: <b>${used}</b> · Unlimited — highest grade counts`);
  const note=String(t.note??t.description??'').trim();
  return `<div class="${card} p-5 flex flex-wrap items-center gap-4">
    <div class="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center text-white text-2xl flex-shrink-0"><i class="bi bi-ui-checks"></i></div>
    <div class="flex-1 min-w-[12rem]"><div class="text-lg font-semibold">${esc(t.title)}</div>
      <div class="text-sm"><b>Đã mở:</b> ${fmt(t.open_at)}</div><div class="text-sm"><b>Đã đóng:</b> ${fmt(t.close_at)}</div>
      ${t.time_limit?`<div class="text-xs text-gray-500 mt-1">Thời gian làm bài: ${t.time_limit} phút</div>`:''}
      ${attTxt?`<div class="text-xs text-gray-500 mt-0.5"><i class="bi bi-arrow-repeat"></i> ${attTxt}</div>`:''}</div>
    <div>${act}</div>
    ${note?`<div class="w-full basis-full rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50 dark:bg-pink-950/20 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line"><i class="bi bi-info-circle-fill text-pink-500"></i> ${esc(note)}</div>`:''}</div>
    <style>.btn{padding:.6rem 1.1rem;border-radius:12px;background:#cf1717;color:#fff;font-weight:800;font-size:.85rem}.btn:hover{background:#b01212}.badge{font-size:.78rem;font-weight:700;color:#6b7280}</style>`;
}

/* ---------- MẬT KHẨU + NỘI QUY ---------- */
function askPass(id){
  const t=tests.find(x=>x.id===id);
  openModal(`<h2 class="text-lg font-extrabold text-[#cf1717] mb-1">${esc(t.title)}</h2>
    <ul class="text-xs text-gray-500 list-disc pl-4 mb-4 space-y-1"><li>Bài thi chạy ở chế độ <b>toàn màn hình</b>.</li><li>Thoát toàn màn hình / chuyển tab / chuyển cửa sổ bị tính là vi phạm. Quá <b>${MAX_VIOL} lần</b> hệ thống tự động nộp bài.</li><li>Không thể sao chép đề bài, không chuột phải, không dán nội dung.</li></ul>
    <div class="relative mb-3"><input id="pw" type="password" class="${inp} pr-11" placeholder="Mật khẩu vào thi" onkeydown="if(event.key==='Enter')enter('${id}')"><button type="button" id="pwEye" onmousedown="event.preventDefault()" onclick="togglePw()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#cf1717] text-lg leading-none" aria-label="Hiện/ẩn mật khẩu"><i class="bi bi-eye"></i></button></div>
    <div class="flex gap-2"><button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl border font-bold text-sm">Huỷ</button>
    <button id="pwBtn" onclick="enter('${id}')" class="flex-1 py-2.5 rounded-xl bg-[#cf1717] text-white font-extrabold text-sm">Vào làm bài</button></div>`);
  setTimeout(()=>$('pw').focus(),50);
}
function togglePw(){const i=$('pw'),show=i.type==='password';i.type=show?'text':'password';$('pwEye').innerHTML=`<i class="bi bi-eye${show?'-slash':''}"></i>`;i.focus();}
async function enter(id){
  const pw=$('pw').value; if(!pw) return toast('Nhập mật khẩu');
  // yêu cầu fullscreen NGAY trong thao tác click của người dùng
  try{ await document.documentElement.requestFullscreen(); }catch(e){ return toast('Trình duyệt không cho bật toàn màn hình — hãy dùng Chrome/Edge/Firefox trên máy tính','x-circle-fill'); }
  $('pwBtn').disabled=true;
  const {data,error}=await SB.rpc('test_start',{p_assignment_id:id,p_name:me.name,p_email:me.email,p_password:pw});
  if(error){ if(document.fullscreenElement) document.exitFullscreen(); $('pwBtn').disabled=false; return toast(error.message,'x-circle-fill'); }
  closeModal(); startExam(data);
}

/* ---------- PHÒNG THI ---------- */
function startExam(d){
  offset=new Date(d.now).getTime()-Date.now();
  const key='rt_ans_'+d.session_id;
  X={sid:d.session_id,q:normQs(d.questions),deadline:new Date(d.deadline).getTime(),viol:d.violations||0,ans:JSON.parse(sessionStorage.getItem(key)||'{}'),key,active:true,lock:false,last:0,done:false};
  $('exTitle').textContent=d.title; $('exWho').textContent=`${me.name} • ${me.email}`; $('exDesc').textContent=d.description||'';
  let n=0; const nx=()=>++n; nx.cur=()=>n; $('exQs').innerHTML=X.q.map(q=>qHtml(q,nx)).join('');
  $('exam').classList.toggle('reading-mode',X.q.some(q=>q.type==='reading'));
  $('exam').classList.remove('hidden'); $('exam').scrollTop=0; updViol();
  initTestReadingSplits($('exQs'));
  examEmptyNotice(typeof d.questions==='string'?(()=>{try{return JSON.parse(d.questions);}catch(e){return [];}})():d.questions);
  restoreAnswers(); tick(); X.timer=setInterval(tick,500);
}
const rng=(a,b)=>b<a?'Questions':(a===b?`Question ${a}`:`Questions ${a}–${b}`);
// Khung kéo chia cột bài đọc: dùng chung lúc làm bài và khi xem kết quả.
const rsplitHtml=(content,qs,a,b)=>`<div class="rsplit-frame" data-test-reading-split>
  <div class="r-reading-tabs" role="tablist" aria-label="Reading passage and questions">
    <button type="button" class="r-reading-tab active" aria-selected="true" onclick="switchTestReadingTab(this,'passage')"><i class="bi bi-book"></i> Reading passage</button>
    <button type="button" class="r-reading-tab" aria-selected="false" onclick="switchTestReadingTab(this,'questions')"><i class="bi bi-list-check"></i> ${rng(a,b)}</button>
  </div>
  <div class="rsplit">
    <div class="pane r-passage r-is-active"><div class="rhead"><i class="bi bi-book"></i> Reading passage</div><div class="${card} p-5 qc">${content||''}</div></div>
    <div class="r-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize reading passage and questions" aria-valuemin="25" aria-valuemax="75" aria-valuenow="50"></div>
    <div class="pane r-questions"><div class="rhead"><i class="bi bi-list-check"></i> ${rng(a,b)}</div>${qs}</div>
  </div>
</div>`;
function switchTestReadingTab(button, which){
  const frame=button.closest('[data-test-reading-split]');
  if(!frame) return;
  frame.querySelectorAll('.r-reading-tab').forEach(tab=>{
    const selected=tab===button;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-selected',String(selected));
  });
  frame.querySelector('.r-passage').classList.toggle('r-is-active',which==='passage');
  frame.querySelector('.r-questions').classList.toggle('r-is-active',which==='questions');
}
function initTestReadingSplits(root){
  root.querySelectorAll('.r-resizer').forEach(resizer=>{
    if(resizer.dataset.bound) return;
    resizer.dataset.bound='1';
    const frame=resizer.closest('.rsplit');
    const passage=frame.querySelector('.r-passage');
    let dragging=false;
    function setPercent(pct){
      pct=Math.max(25,Math.min(75,pct));
      passage.style.flex=`0 0 ${pct}%`;
      resizer.setAttribute('aria-valuenow',String(Math.round(pct)));
    }
    function setFromPointer(e){
      const rect=frame.getBoundingClientRect();
      if(rect.width) setPercent((e.clientX-rect.left)/rect.width*100);
    }
    resizer.addEventListener('pointerdown',e=>{
      if(window.matchMedia('(max-width: 860px)').matches) return;
      dragging=true;
      resizer.setPointerCapture(e.pointerId);
      e.preventDefault();
      setFromPointer(e);
    });
    resizer.addEventListener('pointermove',e=>{ if(dragging) setFromPointer(e); });
    const stop=()=>{dragging=false;};
    resizer.addEventListener('pointerup',stop);
    resizer.addEventListener('pointercancel',stop);
    resizer.addEventListener('lostpointercapture',stop);
    resizer.addEventListener('keydown',e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
      e.preventDefault();
      setPercent(Number(resizer.getAttribute('aria-valuenow'))+(e.key==='ArrowRight'?5:-5));
    });
  });
}

const GAPRE=/\{\{(\d+)\}\}/g;
/* --- Chuẩn hoá dữ liệu đề do máy chủ trả về: chịu được JSON dạng chuỗi, tên trường khác (text/html/question...) --- */
const _s=v=>typeof v==='string'?v:(typeof v==='number'?String(v):'');
const _pick=(o,ks)=>{ if(!o||typeof o!=='object') return ''; for(const k of ks){ if(_s(o[k]).trim()) return _s(o[k]); } return ''; };
const CONTENT_KEYS=['content','text','html','question','stem','body','prompt','q','title'];
const OPT_KEYS=['text','content','label','html','title','value','answer','name'];
function normQ(q){
  if(!q||typeof q!=='object') return q;
  const src=(q.data&&typeof q.data==='object')?{...q.data,...q}:q, o={...q};
  o.content=_pick(src,CONTENT_KEYS);
  const opts=src.options||src.choices||src.answers;
  if(Array.isArray(opts)) o.options=opts.map((x,i)=>typeof x==='string'?{id:String.fromCharCode(97+i),text:x}:{...x,id:x.id??String.fromCharCode(97+i),text:_pick(x,OPT_KEYS)});
  const sb=src.sub_blocks||src.subBlocks||src.children||src.items;
  if(Array.isArray(sb)) o.sub_blocks=sb.map(normQ);
  return o;
}
function normQs(a){ if(typeof a==='string'){ try{a=JSON.parse(a);}catch(e){a=[];} } return Array.isArray(a)?a.map(normQ):[]; }
function examEmptyNotice(raw){
  const leaf=q=>q.type==='reading'?(q.sub_blocks||[]).flatMap(leaf):[q];
  const filled=X.q.some(q=>(q.type==='text'||q.type==='reading')&&_s(q.content).trim()) || X.q.flatMap(leaf).some(q=>q.type!=='text'&&(_s(q.content).trim()||(q.options||[]).some(o=>_s(o.text).trim())));
  if(filled||!X.q.length) return;
  const f=(Array.isArray(raw)?raw[0]:null)||{}, fo=(Array.isArray(f.options)&&f.options[0])||{};
  console.warn('[ReadUp] Máy chủ không trả nội dung câu hỏi. Mẫu khối đầu tiên:',JSON.stringify(f).slice(0,600));
  $('exQs').insertAdjacentHTML('afterbegin',`<div class="nrm rounded-xl border-2 border-amber-400 bg-amber-50 text-amber-900 p-4 text-sm font-semibold mb-3"><i class="bi bi-exclamation-triangle-fill"></i> Chưa nhận được nội dung câu hỏi từ máy chủ. Hãy chụp màn hình khung này gửi giáo viên.<div class="text-xs font-normal mt-1 break-all">Trường nhận được ở khối: ${esc(Object.keys(f).join(', ')||'(rỗng)')} · ở đáp án: ${esc(Object.keys(fo).join(', ')||'(không có)')}</div></div>`);
}
function qHtml(q,next,sub){
  const N=sub?'':'nrm ';
  if(q.type==='text') return `<div class="${N}${card} p-5 qc ${q.two_col?'two':''}">${q.content||''}</div>`;
  if(q.type==='reading'){ const a=next.cur()+1, qs=(q.sub_blocks||[]).map(s=>qHtml(s,next,true)).join(''), b=next.cur();
    return rsplitHtml(q.content,qs,a,b); }
  const no=next(); let body='';
  if(q.type==='mcq'||q.type==='tf') body=(q.options||[]).map(o=>`<label class="opt" data-q="${q.id}" data-o="${o.id}"><input type="radio" name="r_${q.id}" class="mt-1 accent-[#cf1717]" onchange="setAns('${q.id}','${o.id}')"><span class="qc">${o.text}</span></label>`).join('');
  else if(q.type==='multi') body=(q.options||[]).map(o=>`<label class="opt" data-q="${q.id}" data-o="${o.id}"><input type="checkbox" class="mt-1 accent-[#cf1717]" onchange="setMulti('${q.id}')"><span class="qc">${o.text}</span></label>`).join('');
  else if(q.type==='essay') body=`<textarea rows="6" class="${inp}" data-essay="${q.id}" oninput="setAns('${q.id}',this.value)" onpaste="return false" placeholder="Nhập câu trả lời..."></textarea>`;
  else if(q.type==='fill') body=''; 
  const content = q.type==='fill' ? (q.content||'').replace(GAPRE,(m,g)=>`<span contenteditable="true" role="textbox" class="gap" data-fq="${q.id}" data-g="${g}" spellcheck="false" autocapitalize="off" onpaste="return false" ondrop="return false" onkeydown="if(event.key==='Enter')return false" oninput="setGap('${q.id}','${g}',this.textContent)"></span>`) : (q.content||'');
  return `<div class="${N}${card} p-5"><div class="flex items-center gap-2 mb-2"><span class="text-xs font-extrabold text-[#cf1717]">Question ${no}</span><span class="text-[11px] text-gray-400">(${g10(q.points||0,xTotal())} ${g10(q.points||0,xTotal())===1?'point':'points'})</span></div>
    <div class="qc mb-3">${content}</div><div class="space-y-2">${body}</div></div>`;
}
function save(){ sessionStorage.setItem(X.key,JSON.stringify(X.ans)); }
function setAns(q,v){ X.ans[q]=v; if(document.querySelector(`[data-q="${q}"]`)) document.querySelectorAll(`[data-q="${q}"]`).forEach(l=>l.classList.toggle('sel',l.dataset.o===v)); save(); }
function setMulti(q){ const v=[...document.querySelectorAll(`[data-q="${q}"]`)].filter(l=>l.querySelector('input').checked).map(l=>(l.classList.add('sel'),l.dataset.o)); document.querySelectorAll(`[data-q="${q}"]`).forEach(l=>l.classList.toggle('sel',l.querySelector('input').checked)); X.ans[q]=v; save(); }
function setGap(q,g,v){ if(typeof X.ans[q]!=='object'||Array.isArray(X.ans[q])) X.ans[q]={}; X.ans[q][g]=v; save(); }
function restoreAnswers(){
  for(const [q,v] of Object.entries(X.ans)){
    document.querySelectorAll(`[data-q="${q}"]`).forEach(l=>{const i=l.querySelector('input'),on=Array.isArray(v)?v.includes(l.dataset.o):v===l.dataset.o;i.checked=on;l.classList.toggle('sel',on);});
    if(v&&typeof v==='object'&&!Array.isArray(v)) Object.entries(v).forEach(([g,t])=>{const e=document.querySelector(`[data-fq="${q}"][data-g="${g}"]`);if(e)e.textContent=t;});
    const ta=document.querySelector(`[data-essay="${q}"]`); if(ta&&typeof v==='string') ta.value=v;
  }
}
function tick(){
  if(!X||X.done) return;
  const s=Math.max(0,Math.ceil((X.deadline-nowMs())/1000)), m=Math.floor(s/60);
  $('exTimer').textContent=`${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  $('exTimer').style.background = s<=300?'#b45309':'#cf1717';
  if(s<=0) submit(true,'Hết giờ — hệ thống đã tự động nộp bài.');
}
function updViol(){ $('exViol').textContent=`Cảnh báo ${Math.min(X.viol,MAX_VIOL)}/${MAX_VIOL}`; }

/* ---------- PHÁT HIỆN VI PHẠM ---------- */
function violation(reason){
  if(!X||X.done||!X.active) return;
  const t=Date.now(); if(t-X.last<1500) return; X.last=t;   // gộp các sự kiện đồng thời
  X.viol++; updViol(); SB.rpc('test_violation',{p_session_id:X.sid,p_count:X.viol});
  if(X.viol>MAX_VIOL) return submit(true,`Bạn đã vi phạm quá ${MAX_VIOL} lần — hệ thống tự động nộp bài.`);
  X.lock=true;
  openModal(`<div class="text-center"><div class="text-5xl mb-2 text-amber-500"><i class="bi bi-exclamation-triangle-fill"></i></div><h2 class="text-lg font-extrabold text-[#cf1717] mb-2">Cảnh báo ${X.viol}/${MAX_VIOL}</h2>
    <p class="text-sm mb-4">${esc(reason)}.<br>Nếu vi phạm thêm ${MAX_VIOL-X.viol+1} lần nữa, bài thi sẽ được <b>tự động nộp</b>.</p>
    <button onclick="resume()" class="w-full py-3 rounded-xl bg-[#cf1717] text-white font-extrabold">Quay lại làm bài (toàn màn hình)</button></div>`);
  $('modal').style.zIndex=99999;
}
async function resume(){ try{await document.documentElement.requestFullscreen();}catch(e){return toast('Hãy cho phép toàn màn hình để tiếp tục');} X.lock=false; closeModal(); $('modal').style.zIndex=''; }
document.addEventListener('fullscreenchange',()=>{ if(X&&!X.done&&!document.fullscreenElement) violation('Bạn đã thoát chế độ toàn màn hình'); });
document.addEventListener('visibilitychange',()=>{ if(X&&!X.done&&document.hidden) violation('Bạn đã chuyển tab / thu nhỏ trình duyệt'); });
window.addEventListener('blur',()=>{ if(X&&!X.done) setTimeout(()=>{ if(!document.hasFocus()) violation('Bạn đã chuyển sang cửa sổ khác'); },200); });

/* ---------- NỘP BÀI ---------- */
function confirmSubmit(){
  const total=X.q.reduce((s,q)=>s+cnt(q),0), done=Object.values(X.ans).filter(v=>v&&(typeof v!=='object'||Object.values(v).some(Boolean)||v.length)).length;
  openModal(`<h2 class="text-lg font-extrabold mb-2">Nộp bài?</h2><p class="text-sm text-gray-500 mb-4">Bạn đã trả lời ${done}/${total} questions. Sau khi nộp sẽ không thể sửa.</p>
    <div class="flex gap-2"><button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl border font-bold text-sm">Làm tiếp</button><button onclick="submit(false)" class="flex-1 py-2.5 rounded-xl bg-[#cf1717] text-white font-extrabold text-sm">Nộp bài</button></div>`);
}
const cnt=q=>q.type==='text'?0:q.type==='reading'?(q.sub_blocks||[]).reduce((s,x)=>s+cnt(x),0):1;
async function submit(auto,msg){
  if(!X||X.done) return; X.done=true; clearInterval(X.timer);
  const {error}=await SB.rpc('test_submit',{p_session_id:X.sid,p_answers:X.ans,p_violations:X.viol,p_auto:!!auto});
  if(error){ X.done=false; X.timer=setInterval(tick,500); return toast('Nộp lỗi: '+error.message+' (thử lại)','x-circle-fill'); }
  sessionStorage.removeItem(X.key); X.active=false;
  if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{});
  $('exam').classList.add('hidden'); X=null;
  openModal(`<div class="text-center"><div class="text-5xl mb-2 text-emerald-500"><i class="bi bi-check-circle-fill"></i></div><h2 class="text-lg font-extrabold mb-2">Đã nộp bài</h2><p class="text-sm text-gray-500 mb-4">${esc(msg||'Bài làm của bạn đã được ghi nhận.')}<br>Your grade appears in the test list. Answers will be shown when the test closes.</p><button onclick="closeModal();pickClass(cls)" class="w-full py-2.5 rounded-xl bg-[#cf1717] text-white font-extrabold">Về danh sách bài thi</button></div>`);
}

/* ---------- KẾT QUẢ (chỉ sau giờ đóng) ---------- */
async function showResult(id){
  const {data,error}=await SB.rpc('test_result',{p_assignment_id:id,p_name:me.name,p_email:me.email});
  if(error) return toast(error.message,'exclamation-triangle-fill');
  if(data.hidden) return toast('The teacher has not released the grade for this test yet');
  $('app').classList.add('info-wide');
  const given=data.answers||{}; let n=0;
  const rq=(q,sub)=>{
    const N=sub?'':'nrm ';
    if(q.type==='text') return `<div class="${N}${card} p-4 qc">${q.content||''}</div>`;
    if(q.type==='reading'){ const a=n+1, qs=(q.sub_blocks||[]).map(x=>rq(x,true)).join(''); return rsplitHtml(q.content,qs,a,n); }
    n++; const g=given[q.id]; let b='';
    if(['mcq','tf','multi'].includes(q.type)){const ga=Array.isArray(g)?g:(g?[g]:[]);b=(q.options||[]).map(o=>`<div class="opt ${o.correct?'ok':(ga.includes(o.id)?'bad':'')}" style="cursor:default"><span class="qc">${ga.includes(o.id)?'<i class="bi bi-arrow-right-circle-fill text-[#cf1717]"></i> ':''}${o.text}</span></div>`).join('');}
    else if(q.type==='fill'){const go=(g&&typeof g==='object')?g:{};b=(q.blanks||[]).map(bl=>`<div class="text-sm">Blank ${bl.gap}: <b>${esc(go[bl.gap]||'(left blank)')}</b> <span class="text-emerald-600">(answer: ${esc((bl.accepted_answers||[]).join(' / '))})</span></div>`).join('');}
    else b=`<div class="text-sm whitespace-pre-wrap p-3 rounded-xl bg-gray-50 dark:bg-zinc-800">${esc(g||'(left blank)')}</div>${data.comments?.[q.id]?`<div class="text-xs mt-2 text-indigo-600"><i class="bi bi-chat-left-text"></i> ${esc(data.comments[q.id])}</div>`:''}`;
    return `<div class="${N}${card} p-5"><div class="text-xs font-extrabold text-[#cf1717] mb-1">Question ${n}</div><div class="qc mb-2">${q.type==='fill'?(q.content||'').replace(GAPRE,'[$1]'):(q.content||'')}</div><div class="space-y-2">${b}</div>${q.explanation?`<div class="text-xs mt-2 text-gray-500"><i class="bi bi-lightbulb-fill text-amber-500"></i> ${q.explanation}</div>`:''}</div>`;
  };
  $('app').innerHTML=`${logo}<div class="max-w-6xl mx-auto"><button onclick="pickClass(cls)" class="text-xs font-bold text-[#cf1717] mb-3 hover:underline"><i class="bi bi-arrow-left"></i> Danh sách bài thi</button>
    <div class="nrm ${card} p-6 text-center mb-4"><div class="text-sm text-gray-500">Your grade</div><div class="text-5xl font-black text-[#cf1717]">${g10(data.score,data.total)}<span class="text-xl text-gray-400"> / 10</span></div>
    ${(data.attempts||0)>1?`<div class="text-xs text-gray-500 mt-1">Highest of ${data.attempts} attempts</div>`:''}
    <div class="text-xs text-gray-500 mt-2">Warnings: ${data.violations||0} • Essay grade (if any) is marked by the teacher</div></div>
    <div class="space-y-4">${data.review&&data.questions?normQs(data.questions).map(q=>rq(q,false)).join(''):'<p class="nrm text-center text-gray-400 italic">The teacher has not allowed reviewing the detailed answers.</p>'}</div></div>`;
  initTestReadingSplits($('app'));
  clearInterval(ticker); scrollTo(0,0); $('exam').classList.remove('reading-mode');
}

/* ---------- CHỐNG SAO CHÉP ---------- */
const inField=e=>{const t=e.target&&e.target.nodeType===1?e.target:e.target&&e.target.parentElement;return !!(t&&t.matches&&t.matches('input[type=text],textarea,input[type=password],input[type=email],.gap'));};
['copy','cut','dragstart','selectstart'].forEach(ev=>document.addEventListener(ev,e=>{ if(!inField(e)||ev==='copy'&&X) e.preventDefault(); }));
document.addEventListener('paste',e=>{ if(X) e.preventDefault(); });
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(e.key==='F12'||e.key==='PrintScreen'||(e.ctrlKey||e.metaKey)&&['c','x','a','p','s','u','v'].includes(k)&&!(inField(e)&&!X&&['c','x','a','v'].includes(k))||(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k))){
    e.preventDefault(); if(e.key==='PrintScreen') navigator.clipboard?.writeText('').catch(()=>{});
  }
});
window.addEventListener('beforeunload',e=>{ if(X&&!X.done){e.preventDefault();e.returnValue='';} });

/* ---------- KHÔI PHỤC MÀN HÌNH KHI TẢI LẠI TRANG ---------- */
(function restore(){
  try{
    const list=JSON.parse(sessionStorage.getItem('rt_classes')||'null'), c=JSON.parse(sessionStorage.getItem('rt_cls')||'null');
    if(me&&me.name&&me.email&&Array.isArray(list)&&list.length){
      window._classes=list;
      if(c) return pickClass(c);      // đang ở danh sách bài thi của lớp → quay lại đúng chỗ đó
      return screenClasses(list);      // đang ở màn chọn lớp
    }
  }catch(e){}
  screenInfo();
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
