(() => {
  'use strict';
  const data = window.FX_DATA;
  const questions = data.rows.map(([id,subject,topic,text,answer,explanation,memory,source,ref]) => ({id,subject,topic,text,answer,explanation,memory,source,ref}));
  const byId = new Map(questions.map(q=>[q.id,q]));
  const names = ['외환관리실무','외국환거래실무','환리스크관리'];
  const counts = [50,30,20];
  const key = 'cfes1-ox-study-v1';
  const app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const range = (a,b) => questions.filter(q=>q.id>=a&&q.id<=b).map(q=>q.id);
  const dayParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type => dayParts.find(p=>p.type===type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const daysLeft = Math.round((Date.parse(data.examDate+'T00:00:00+09:00')-Date.parse(today+'T00:00:00+09:00'))/86400000);
  document.getElementById('exam-badge').textContent = daysLeft>0?`D-${daysLeft} · 11.21` : daysLeft===0?'오늘 시험':'11.21 시험 대비';
  const plan = [
    {date:'2026-11-11',title:'거주자·기본개념·지급',ids:range(1,20)},
    {date:'2026-11-12',title:'제3자 지급·상계·차입',ids:range(21,35)},
    {date:'2026-11-13',title:'해외투자·부동산',ids:range(36,50)},
    {date:'2026-11-14',title:'환거래·환율·계산',ids:range(51,65)},
    {date:'2026-11-15',title:'포지션·자금·수표',ids:range(66,80)},
    {date:'2026-11-16',title:'환위험·헤지·파생상품',ids:range(81,100)},
    {date:'2026-11-17',title:'법규 50문항 다시 풀기',ids:range(1,50)},
    {date:'2026-11-18',title:'거래·환리스크 50문항 복습',ids:range(51,100)},
    {date:'2026-11-19',title:'전 과목 100문항 섞어 풀기',ids:range(1,100),shuffle:true},
    {date:'2026-11-20',title:'오답·헷갈린 문제 최종 복습',review:true}
  ];
  let state = {version:1,records:{},session:null};
  let view='home', reviewSubject=-1;
  function validRecords(records) {
    const out={};
    if(!records||typeof records!=='object') return out;
    for(const q of questions){const r=records[q.id]; if(r&&typeof r.answer==='boolean') out[q.id]={answer:r.answer,correct:r.answer===q.answer,flag:r.flag===true,tries:Math.max(1,Math.min(Number(r.tries)||1,100000)),at:typeof r.at==='string'?r.at.slice(0,30):''};}
    return out;
  }
  function validSession(s){
    if(!s||!Array.isArray(s.ids)||s.ids.length<1||s.ids.length>100||!s.ids.every(id=>byId.has(id))) return null;
    const ids=[...new Set(s.ids)];const answers={};
    for(const id of ids) if(typeof s.answers?.[id]==='boolean')answers[id]=s.answers[id];
    return {ids,index:Math.max(0,Math.min(Number.isInteger(s.index)?s.index:0,ids.length-1)),answers,title:typeof s.title==='string'?s.title.slice(0,100):'학습',done:s.done===true};
  }
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===1){state.records=validRecords(saved.records);state.session=validSession(saved.session);}}catch(e){}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(e){document.getElementById('storage-notice').hidden=false;}}
  function needsReview(id){const r=state.records[id];return r&&(!r.correct||r.flag);}
  function reviewIds(subject=-1){return questions.filter(q=>(subject===-1||q.subject===subject)&&needsReview(q.id)).map(q=>q.id);}
  function shuffled(ids){const a=[...ids];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function setView(next,scroll=true){view=next;document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();if(scroll)window.scrollTo({top:0,behavior:'instant'});}
  function start(ids,title,shuffle=false){if(!ids.length){setView('review');return;}state.session={ids:shuffle?shuffled(ids):[...ids],index:0,answers:{},title,done:false};save();setView('quiz');}
  function startDay(index){const p=plan[index];const ids=p.review?reviewIds():p.ids;start(ids,p.title,p.shuffle||false);}
  function todayIndex(){const i=plan.findIndex(p=>p.date===today);return i<0?(today<plan[0].date?0:9):i;}
  function render(){if(view==='quiz'){if(!state.session){setView('home');return;}state.session.done?renderResult():renderQuiz();}else if(view==='review')renderReview();else if(view==='summary')renderSummary();else if(view==='about')renderAbout();else renderHome();}
  function renderHome(){
    const records=Object.values(state.records),done=records.length,correct=records.filter(r=>r.correct).length,wrong=reviewIds().length;
    const pi=todayIndex(),p=plan[pi],n=p.review?wrong:p.ids.length;
    const active=state.session&&!state.session.done;
    app.innerHTML=`<div class="stack">
      <section class="hero"><div class="eyebrow">ONE HOUR, ONE STEP</div><h1>매일 한 시간,<br>외환의 핵심을 내 것으로.</h1><p>O/X로 기억을 꺼내고, 짧은 해설로 빈틈을 채우세요.<br>외환전문역 1종 · 과목별 100문항</p><button class="primary full" data-action="today">${p.review?'마지막 오답 복습':`오늘의 ${n}문제 시작`} <span aria-hidden="true">→</span></button><p class="small">${esc(p.title)} · 하루 60분 학습</p></section>
      ${active?`<section class="resume"><p><b>풀던 문제 이어서</b>${esc(state.session.title)} · ${state.session.index+1}/${state.session.ids.length}</p><button class="primary" data-action="resume">이어서 풀기</button></section>`:''}
      <section class="stats" aria-label="누적 학습 현황"><div class="stat"><b>${done}<small> / 100</small></b><span>풀어본 문제</span></div><div class="stat"><b>${correct}</b><span>최근 정답</span></div><div class="stat"><b>${wrong}</b><span>복습할 문제</span></div></section>
      <section><div class="section-top"><h2>과목별로 차근차근</h2><span class="small muted">50 : 30 : 20</span></div><div class="subjects">${names.map((name,s)=>{const nd=questions.filter(q=>q.subject===s&&state.records[q.id]).length;return `<article class="subject"><div class="row"><div><div class="number">SUBJECT 0${s+1} · ${counts[s]}문항</div><h3>${name}</h3><p class="mini">${s===0?'거주자 · 신고 · 투자':s===1?'환거래 · 환율 · 자금':'헤지 · 선물 · 옵션'}</p></div><button class="secondary" data-action="subject" data-subject="${s}">문제 풀기 →</button></div><div class="bar" aria-label="${name} ${nd}문항 학습"><span style="width:${nd/counts[s]*100}%"></span></div><p class="mini">${nd} / ${counts[s]}문항 학습</p></article>`}).join('')}</div></section>
      <details class="plan"><summary>11월 21일까지 · 하루 1시간 학습표</summary><div class="plan-list">${plan.map((d,i)=>`<div class="plan-day ${d.date===today?'today':''}"><time datetime="${d.date}">${d.date.slice(5).replace('-','/')}</time><span>${d.title}<br><small class="muted">${d.review?'오답·표시한 문항':`${d.ids.length}문항`}${d.date===today?' · 오늘':''}</small></span><button data-action="day" data-index="${i}" aria-label="${d.date} 학습 시작">→</button></div>`).join('')}<p class="routine">10분 어제 오답 → 20분 풀이 → 20분 해설 → 10분 다시 설명하기</p></div></details>
      <p class="note">공식 샘플 주제와 법규를 바탕으로 새로 만든 학습문제입니다. 실제 회차별 기출 원문은 아닙니다. 법규 확인: 2026.11.11. 시험 적용 교재·정오표가 우선입니다.</p>
    </div>`;
  }
  function renderQuiz(){
    const s=state.session,q=byId.get(s.ids[s.index]),selected=s.answers[q.id],answered=typeof selected==='boolean',r=state.records[q.id];
    const ok=selected===q.answer,src=data.sources[q.source],complete=Object.keys(s.answers).length;
    app.innerHTML=`<div class="question-top row"><button class="text-button" data-action="home">← 학습 홈</button><span class="quiz-progress">${s.index+1} / ${s.ids.length}</span></div><div class="bar" role="progressbar" aria-label="이번 풀이 진행률" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${complete}"><span style="width:${complete/s.ids.length*100}%"></span></div>
      <div class="question-meta"><span class="tag">${names[q.subject]}</span><span class="tag">${esc(q.topic)}</span><span class="small muted">${esc(s.title)}</span></div>
      <article class="question-card"><div class="question-id">Q${String(q.id).padStart(3,'0')} · ${q.ref.includes('공식 샘플')?'공식 샘플 주제 확장':'자체 학습문항'}</div><h1 id="question-text">${esc(q.text)}</h1>
      <div class="answers" role="group" aria-labelledby="question-text">${[true,false].map(a=>`<button class="answer-button ${answered&&selected===a?'selected':''} ${answered&&q.answer===a?'correct-choice':''}" data-action="answer" data-answer="${a}" aria-label="${a?'O, 맞다':'X, 틀리다'}" ${answered?'disabled':''}>${a?'O':'X'}<small>${a?'맞다':'틀리다'}</small></button>`).join('')}</div>
      <section class="feedback" id="feedback" aria-live="polite" ${answered?'':'hidden'}>${answered?`<p class="verdict ${ok?'good':'bad'}">${ok?'정답이에요':'다시 기억해 볼까요?'} <span>· 정답 ${q.answer?'O':'X'}</span></p><p class="explanation">${esc(q.explanation)}</p><div class="memory"><small>이 한 줄은 꼭</small>${esc(q.memory)}</div><a class="source-link" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">근거: ${esc(q.ref)} ↗</a>`:''}</section>
      </article><div class="quiz-actions"><button class="text-button" data-action="prev" ${s.index===0?'disabled':''}>← 이전</button>${answered?`<button class="flag" data-action="flag" aria-pressed="${r?.flag===true}">${r?.flag?'★ 복습에 담음':'☆ 맞혔어도 헷갈려요'}</button><button class="primary" data-action="next">${s.index===s.ids.length-1?'결과 보기':'다음 문제'} →</button>`:'<span class="small muted">답을 고르면 해설이 보여요</span>'}</div><p class="quiz-footer">${answered?'틀린 문제는 오답에 자동 저장됩니다.':'천천히 읽고, 틀린 문장을 바르게 고쳐 보세요.'}</p>`;
  }
  function answer(value){const s=state.session;if(!s||s.done)return;const id=s.ids[s.index];if(typeof s.answers[id]==='boolean')return;const q=byId.get(id),old=state.records[id];s.answers[id]=value;state.records[id]={answer:value,correct:value===q.answer,flag:old?.flag===true,tries:(old?.tries||0)+1,at:new Date().toISOString()};save();renderQuiz();}
  function renderResult(){const s=state.session;const done=s.ids.filter(id=>typeof s.answers[id]==='boolean');const correct=done.filter(id=>s.answers[id]===byId.get(id).answer).length;const wrong=s.ids.filter(id=>typeof s.answers[id]==='boolean'&&s.answers[id]!==byId.get(id).answer);app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">SESSION COMPLETE</div><h1>오늘도 한 걸음 더.</h1></div><section class="result-box"><h2>${esc(s.title)}</h2><div class="result-number">${correct}<small> / ${s.ids.length}</small></div><p>이번 풀이 ${done.length}문항 · 정답 ${correct} · 오답 ${wrong.length}</p><p>O/X 정답률은 실제 시험 점수와 다릅니다.<br>틀린 문장을 설명할 수 있으면 한 번 더 익힌 거예요.</p><div class="result-buttons">${wrong.length?'<button class="primary" data-action="session-wrong">이번 오답 다시 풀기</button>':''}<button class="secondary" data-action="home">학습 홈으로</button></div></section>`;}
  function renderReview(){const ids=reviewIds(reviewSubject),total=reviewIds().length;app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">RECALL & REPEAT</div><h1>헷갈림을 확신으로.</h1><p>최근에 틀린 문제와 직접 표시한 문제 ${total}개.<br>다시 맞히면 오답에서 빠지고, ★ 표시는 직접 해제할 수 있어요.</p></div><div class="chips" aria-label="복습 과목">${['전체',...names].map((n,i)=>`<button class="chip ${reviewSubject===i-1?'active':''}" data-action="review-filter" data-subject="${i-1}" aria-pressed="${reviewSubject===i-1}">${n}</button>`).join('')}</div>${ids.length?`<button class="primary full" data-action="review-start">${ids.length}문제 복습 시작 →</button><div class="review-list">${ids.map(id=>{const q=byId.get(id),r=state.records[id];return `<button class="review-item" data-action="one-review" data-id="${id}"><small>Q${String(id).padStart(3,'0')} · ${names[q.subject]} · ${esc(q.topic)}</small><p>${esc(q.text)}</p><span class="cause">${!r.correct?'최근 오답':''}${!r.correct&&r.flag?' · ':''}${r.flag?'★ 헷갈린 문제':''}</span></button>`}).join('')}</div>`:`<div class="empty"><h2>${total?'이 과목은 복습할 문제가 없어요':'아직 복습할 문제가 없어요'}</h2><p>문제를 풀고 나면 틀린 문제를 여기에 모아 드립니다.</p><button class="primary" data-action="home">학습하러 가기</button></div>`}`;}
  function renderSummary(){
    const blocks=[
      ['01 · 거주성은 국적과 다릅니다',['외국기업 국내지점 = 거주자 / 국내기업 해외지점 = 비거주자','우리 재외공관 = 거주자 / 국내 외국정부 공관 = 비거주자','일반 기준: 외국인 국내 체재 6개월, 국민 해외 체재 2년, 비거주자 국민 귀국 후 3개월. 외교관 등 별도 예외를 함께 확인.']],
      ['02 · 지급·상계는 예외부터',['제3자 지급: 다른 예외가 없을 때 5천 달러 이하 예외 / 5천 초과~1만 이하 은행 / 1만 초과 한국은행. 분할금액 합산.','일반 양자간 상계: 은행 사전신고 또는 1개월 이내 사후보고. 다자간·상계센터는 한국은행. 상계 증빙 5년 보관.','무증빙 지급 ≠ 원인거래 신고 면제. 현행 연간 10만 달러는 기관 합산이며 적용대상·거래요건을 충족해야 함.']],
      ['03 · 직접투자·부동산',['해외직접투자: 경영참여 지분 10% 이상. 10% 미만도 임원 파견 등 요건으로 해당 가능. 기존 투자법인 대부는 1년 이상.','해외부동산 취득보고: 취득대금 송금 후 3개월. 처분보고: 처분 후 3개월, 그 안에 대금을 받으면 받은 시점.','현행 일반 영리법인 외화차입 장관 신고 기준: 5천만 달러 초과. 구샘플의 3천만 달러와 구별.']],
      ['04 · 환율의 방향',['원/달러 ↑ = 달러 강세 · 원화 약세. EUR/USD ↑ = 유로 강세.','은행 관점의 매입·매도: 고객이 달러를 사면 은행 매도. 원화로 송금 보낼 때 전신환매도 / 받은 달러를 원화로 바꿀 때 전신환매입.','환율우대는 스프레드 감면. 매수 적용환율 = 기준율 + 스프레드 × (1-우대율).']],
      ['05 · 헤지 방향 4개',['받을 달러 → 선물환 매도 또는 달러 풋옵션 매수','지급할 달러 → 선물환 매입 또는 달러 콜옵션 매수','달러 매입초과(Long) → 환율 상승 유리 / 매도초과(Short) → 환율 상승 불리','통화스왑: 달러 변동부채는 달러 변동 수취·원화 고정 지급. 달러 변동자산은 그 반대. 원금·만기 일치도 확인.']],
      ['06 · 계산은 단위부터',['원화금액 = 달러금액 × 원/달러 환율','원/100엔 = (원/달러 ÷ 엔/달러) × 100','달러선물 1계약 = 10,000달러. 1틱 0.1원 × 10,000 = 1,000원.','만기 콜 매수 순익 = max(S-K,0) - 프리미엄. 풋 매수 순익 = max(K-S,0) - 프리미엄. S=만기 현물환율, K=행사가격.','단순 금리평가: F = S × (1+원화금리×기간)/(1+달러금리×기간). 기간은 연 단위, 금리는 소수. 실제 시장가격과 차이가 날 수 있음.']]
    ];app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">LAST MINUTE NOTES</div><h1>시험 전, 이 여섯 가지.</h1><p>암기문장을 읽고 이유를 소리 내어 설명해 보세요.<br>법규는 문제의 조건과 예외를 함께 확인하세요.</p></div>${blocks.map(([t,items])=>`<section class="summary-block"><h3>${t}</h3><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}<p class="note" style="margin-top:20px">2026.11.11. 확인. 최신 시행 규정과 실제 시험 적용 교재의 기준일이 다를 수 있으므로 한국금융연수원 해당 회차 공지·교재 정오표를 우선하세요. 요약은 개별 문제의 조건을 대체하지 않습니다.</p>`;}
  function renderAbout(){app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">ABOUT THIS STUDY SET</div><h1>자료의 기준을 분명하게.</h1><p>출처와 학습기록 안내</p></div><div class="stack"><section class="info-card"><h2>문제의 성격</h2><p>한국금융연수원의 공개 샘플 15문항에서 확인한 주제를 참고하고, 현행 법규와 기본원리를 바탕으로 새로 작성한 O/X 100문항입니다. <strong>실제 회차별 기출 원문이나 공식 정답집이 아닙니다.</strong></p><p>샘플 주제를 확장한 문제는 해당 번호를 해설의 근거에 표시했습니다. 출제빈도를 분석한 자료는 아니며 전 범위를 빠짐없이 대체하는 교재도 아닙니다.</p><p>실제 시험은 객관식 4지선다, 120분입니다. 배점은 외환관리실무 50점, 외국환거래실무 30점, 환리스크관리 20점. 과목별 40% 이상과 총점 60점 이상을 모두 충족해야 합니다. 예: 35/50 + 21/30 + 14/20 = 총점 70점.</p></section>
      <section class="info-card"><h2>법규 기준일 · 2026.11.11.</h2><p>외국환거래규정은 2026.11.2. 시행본을 확인했습니다. 공식 구샘플의 외화차입 3천만 달러, 부동산 정기 보유보고 문구 등은 현행 조문과 구별하여 설명했습니다.</p><p>이 자료의 현행 법규 기준이 시험 적용 기준일과 같다고 확인된 것은 아닙니다. 해당 회차 공지와 시험용 교재·정오표의 적용기준을 우선하세요. 일반적인 원칙을 묻는 문항도 적힌 예외·조건을 함께 읽어 주세요.</p><p>계산문제의 환율·금리·프리미엄은 학습용 가정이며 실제 시세가 아닙니다.</p></section>
      <section class="info-card"><h2>휴대폰에서 이어서 공부하기</h2><p>학습기록은 이 주소를 연 <strong>현재 브라우저에만</strong> 저장됩니다. 같은 휴대폰에서도 다른 브라우저를 쓰거나 사이트 데이터를 지우면 기록이 이어지지 않습니다. 서버로 답안을 보내지 않습니다.</p><p>아이폰 Safari: 공유 → 홈 화면에 추가.<br>안드로이드 Chrome: 메뉴 → 홈 화면에 추가 또는 앱 설치.<br>처음 한 번 온라인으로 연 뒤에는 캐시가 준비된 경우 오프라인에서도 사용할 수 있습니다.</p><div class="backup-row"><button class="secondary" data-action="export">학습기록 백업</button><button class="secondary" data-action="import">백업 불러오기</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div><p id="backup-status" class="backup-status" aria-live="polite"></p></section>
      <section class="info-card"><h2>확인한 공식·1차 자료</h2><ul class="source-list">${Object.values(data.sources).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></li>`).join('')}</ul><p class="note">공식 샘플 PDF는 한국금융연수원 시험안내의 ‘샘플문제 다운로드’에서 확인할 수 있습니다. 원본 PDF는 이 사이트에 재게시하지 않았습니다.</p></section></div>`;}
  document.querySelector('.bottom-nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view);});
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();setView('home');});
  app.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action;
    if(action==='home')setView('home');
    else if(action==='today')startDay(todayIndex());
    else if(action==='day')startDay(Number(b.dataset.index));
    else if(action==='subject'){const subject=Number(b.dataset.subject);start(questions.filter(q=>q.subject===subject).map(q=>q.id),names[subject]);}
    else if(action==='resume')setView('quiz');
    else if(action==='answer')answer(b.dataset.answer==='true');
    else if(action==='prev'){if(state.session.index>0){state.session.index--;save();setView('quiz');}}
    else if(action==='next'){const s=state.session;if(typeof s.answers[s.ids[s.index]]!=='boolean')return;if(s.index<s.ids.length-1)s.index++;else s.done=true;save();setView('quiz');}
    else if(action==='flag'){const id=state.session.ids[state.session.index];if(state.records[id]){state.records[id].flag=!state.records[id].flag;save();renderQuiz();}}
    else if(action==='session-wrong'){const s=state.session;start(s.ids.filter(id=>typeof s.answers[id]==='boolean'&&s.answers[id]!==byId.get(id).answer),'이번 풀이 오답 복습');}
    else if(action==='review-filter'){reviewSubject=Number(b.dataset.subject);renderReview();}
    else if(action==='review-start')start(reviewIds(reviewSubject),'오답·헷갈린 문제 복습');
    else if(action==='one-review')start([Number(b.dataset.id)],'한 문제 집중 복습');
    else if(action==='export'){
      const blob=new Blob([JSON.stringify({app:'cfes1-ox',version:1,exportedAt:new Date().toISOString(),records:state.records},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`외환OX-학습기록-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('backup-status').textContent='백업 파일 다운로드를 요청했습니다. 파일 앱에서 보관해 주세요.';
    }else if(action==='import')document.getElementById('backup-file').click();
  });
  app.addEventListener('change',async e=>{
    if(e.target.id!=='backup-file'||!e.target.files?.[0])return;
    const status=document.getElementById('backup-status');
    try{const f=e.target.files[0];if(f.size>1024*1024)throw new Error('size');const backup=JSON.parse(await f.text());if(backup.app!=='cfes1-ox'||backup.version!==1||!backup.records||typeof backup.records!=='object')throw new Error('format');const incoming=validRecords(backup.records);for(const [id,r] of Object.entries(incoming)){const old=state.records[id];if(!old||r.at>=old.at)state.records[id]=r;}save();status.textContent=`${Object.keys(incoming).length}개 기록을 확인해 더 최근 기록과 합쳤습니다.`;}catch(err){status.textContent='불러오지 못했습니다. 이 사이트에서 내보낸 JSON 백업을 선택해 주세요.';}
  });
  document.addEventListener('keydown',e=>{if(view!=='quiz'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='o')answer(true);else if(e.key.toLowerCase()==='x')answer(false);});
  render();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
