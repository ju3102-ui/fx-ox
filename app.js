(() => {
  'use strict';
  const data = window.FX_DATA;
  const names = ['외환관리실무', '외국환거래실무', '환리스크관리'];
  const unpack = ([id,subject,topic,text,answer,explanation,memory,source,ref]) => ({id,subject,topic,text,answer,explanation,memory,source,ref});
  const questions = data.rows.map(unpack);
  const byId = new Map(questions.map(q=>[q.id,q]));
  const known = new Map([...questions,...(data.archivedRows||[]).map(unpack)].map(q=>[q.id,q]));
  const chapters = data.chapters;
  const chapterById = new Map(chapters.flatMap(c=>c.ids.map(id=>[id,c])));
  const order = chapters.flatMap(c=>c.ids);
  const totals = names.map((_,s)=>questions.filter(q=>q.subject===s).length);
  const sampleCount = data.sampleGroups.flatMap(g=>g.ids).length;
  const key = 'cfes1-ox-study-v1';
  const app = document.getElementById('app');
  const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type=>dayParts.find(p=>p.type===type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const daysLeft = Math.round((Date.parse(data.examDate+'T00:00:00+09:00')-Date.parse(today+'T00:00:00+09:00'))/86400000);
  document.getElementById('exam-badge').textContent = daysLeft>0?`D-${daysLeft} · 11.21`:daysLeft===0?'오늘 시험':'11.21 시험 대비';
  let state = {version:1,curriculumVersion:data.curriculumVersion,records:{},session:null,courseSession:null};
  let view='home', selectedSubject=0, reviewSubject=-1, migrated=false;

  function validRecords(records) {
    const out={};
    if(!records||typeof records!=='object'||Array.isArray(records))return out;
    for(const [id,q] of known){const r=records[id];if(r&&typeof r.answer==='boolean')out[id]={answer:r.answer,correct:r.answer===q.answer,flag:r.flag===true,tries:Math.max(1,Math.min(Math.floor(Number(r.tries)||1),100000)),at:typeof r.at==='string'?r.at.slice(0,30):''};}
    return out;
  }
  function validSession(s) {
    if(!s||s.curriculumVersion!==data.curriculumVersion||!Array.isArray(s.ids)||!s.ids.length||s.ids.length>questions.length||!s.ids.every(id=>byId.has(id)))return null;
    const ids=[...new Set(s.ids)],answers={};
    for(const id of ids)if(typeof s.answers?.[id]==='boolean')answers[id]=s.answers[id];
    const kind=['course','chapter','review'].includes(s.kind)?s.kind:'chapter';
    return {curriculumVersion:data.curriculumVersion,ids,answers,index:Math.max(0,Math.min(Number.isInteger(s.index)?s.index:0,ids.length-1)),title:typeof s.title==='string'?s.title.slice(0,100):'학습',kind,done:s.done===true&&ids.every(id=>typeof answers[id]==='boolean')};
  }
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved?.version===1){state.records=validRecords(saved.records);state.session=validSession(saved.session);state.courseSession=validSession(saved.courseSession);migrated=Object.keys(state.records).length>0&&saved.curriculumVersion!==data.curriculumVersion;if(state.session?.kind==='course')state.courseSession=state.session;}
  } catch(e) {}
  function save() {
    if(state.session?.kind==='course')state.courseSession=state.session;
    try{localStorage.setItem(key,JSON.stringify(state));}catch(e){document.getElementById('storage-notice').hidden=false;}
  }
  function reviewed(id){const r=state.records[id];return r&&(!r.correct||r.flag);}
  function reviewIds(subject=-1){return order.filter(id=>(subject===-1||byId.get(id).subject===subject)&&reviewed(id));}
  function remaining(){return order.filter(id=>!state.records[id]);}
  function doneCount(ids=order){return ids.filter(id=>state.records[id]).length;}
  function setView(next,scroll=true){view=next;document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===(next==='quiz'?'home':next==='summary'?'about':next))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();if(scroll)window.scrollTo({top:0,behavior:'instant'});}
  function start(ids,title,kind='chapter') {
    if(!ids.length){setView('review');return;}
    state.session={curriculumVersion:data.curriculumVersion,ids:[...ids],index:0,answers:{},title,kind,done:false};save();setView('quiz');
  }
  function continueCourse() {
    if(state.courseSession&&!state.courseSession.done){state.session=state.courseSession;save();setView('quiz');return;}
    const ids=remaining().slice(0,34);
    if(ids.length)start(ids,'교재 순서 학습','course');else setView('review');
  }
  function startChapter(id) {const c=chapters.find(c=>c.id===id);if(c)start(c.ids,`${names[c.subject]} · ${c.number}장`,'chapter');}
  function render(){if(view==='quiz'){if(!state.session){setView('home');return;}state.session.done?renderResult():renderQuiz();}else if(view==='course')renderCourse();else if(view==='review')renderReview();else if(view==='about')renderAbout();else if(view==='summary')renderSummary();else renderHome();}
  function progress(ids){return `<div class="bar" aria-label="${doneCount(ids)} / ${ids.length}문항 학습"><span style="width:${doneCount(ids)/ids.length*100}%"></span></div>`;}
  function renderHome() {
    const done=doneCount(),wrong=reviewIds().length;
    const active=state.courseSession&&!state.courseSession.done;
    const nextId=active?state.courseSession.ids[state.courseSession.index]:remaining()[0];
    const next=chapterById.get(nextId);
    app.innerHTML=`<div class="stack">
      <section class="hero"><div class="eyebrow">하루 한 시간 · O/X ${questions.length}문항</div><h1>처음부터,<br>순서대로.</h1><p>외환관리실무 총론부터 환리스크 옵션까지.<br>교재 24개 단원의 핵심을 한 흐름으로 공부해요.</p><div class="hero-next"><small>${next?names[next.subject]:'1회독 완료'}</small><strong>${next?`${next.number}장 · ${esc(next.title)}`:'오답으로 한 번 더 확인하세요'}</strong></div><button class="primary full" data-action="continue">${next?(done||active?'이어서 공부하기':'첫 문제 시작하기'):'오답 복습하기'} <span aria-hidden="true">→</span></button><p class="hero-note">${active?`풀던 묶음 ${state.courseSession.index+1} / ${state.courseSession.ids.length}문항`:next?'한 번에 최대 34문항 · 중간에 나가도 저장돼요':'목차에서 원하는 단원을 다시 풀 수 있어요'}</p></section>
      ${migrated?'<p class="notice">기존 답안·오답·★ 기록은 보관했습니다. 교체한 핵심 문항은 새 문제로 시작합니다.</p>':''}
      <section class="stats" aria-label="학습 현황"><div><b>${done}<small> / ${questions.length}</small></b><span>풀어본 문제</span></div><div><b>${Math.round(done/questions.length*100)}<small>%</small></b><span>1회독 진행</span></div><button data-view="review"><b>${wrong}</b><span>복습할 문제 →</span></button></section>
      <section><div class="section-top"><h2>내 학습 과정</h2><button class="text-button" data-view="course">전체 목차 →</button></div><div class="subjects">${names.map((n,s)=>{const ids=chapters.filter(c=>c.subject===s).flatMap(c=>c.ids);return `<button class="subject" data-action="subject" data-subject="${s}"><div class="row"><span class="subject-number">0${s+1}</span><span class="small muted">${s===0?12:6}개 단원 · ${totals[s]}문항</span></div><h3>${n}<span aria-hidden="true">↗</span></h3>${progress(ids)}<p>${doneCount(ids)} / ${ids.length}문항 학습</p></button>`}).join('')}</div></section>
      <section class="routine"><h2>한 시간의 공부 순서</h2><ol><li><b>10분</b> 어제 오답 떠올리기</li><li><b>40분</b> 새 문제와 해설, 한 줄 암기</li><li><b>10분</b> 틀린 문장을 바르게 말하기</li></ol><p class="note">11/11~11/19: 하루 약 34문항 · 11/20: 오답 총복습</p></section>
      <p class="note">공식 샘플 연계 ${sampleCount}문항 + 자체 예상·기본 ${questions.length-sampleCount}문항. 실제 회차별 기출 원문은 아닙니다. 각 해설에서 근거를 확인할 수 있어요.</p>
    </div>`;
  }
  function renderCourse() {
    const cs=chapters.filter(c=>c.subject===selectedSubject);
    app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">3과목 · 24개 단원</div><h1>교재 순서 그대로.</h1><p>기초부터 차례로 풀거나, 필요한 단원을 골라 복습하세요. 단원은 처음 문제부터 시작합니다.</p></div><div class="subject-tabs" aria-label="과목 선택">${names.map((n,s)=>`<button class="chip ${s===selectedSubject?'active':''}" data-action="subject" data-subject="${s}" aria-pressed="${s===selectedSubject}"><small>0${s+1}</small>${n}</button>`).join('')}</div><div class="section-top"><h2>${names[selectedSubject]}</h2><span class="small muted">${totals[selectedSubject]}문항</span></div><div class="chapter-list">${cs.map(c=>`<button class="chapter" data-action="chapter" data-chapter="${c.id}"><span class="chapter-number">${String(c.number).padStart(2,'0')}</span><span class="chapter-info"><strong>${esc(c.title)}</strong><small>${esc(c.focus)}</small><span class="chapter-count">${doneCount(c.ids)} / ${c.ids.length}문항 학습</span></span><span class="chapter-arrow" aria-hidden="true">${doneCount(c.ids)===c.ids.length?'✓':'→'}</span></button>`).join('')}</div><p class="note after-note">한국금융연수원 공식 교재 목차 기준으로 핵심 문제를 배치했습니다. 세부 항목 전체를 대체하는 교재는 아닙니다.</p>`;
  }
  function renderQuiz() {
    const s=state.session,q=byId.get(s.ids[s.index]),c=chapterById.get(q.id),selected=s.answers[q.id],answered=typeof selected==='boolean',r=state.records[q.id],link=data.sampleLinks[q.id];
    app.innerHTML=`<div class="question-top row"><button class="text-button" data-view="home">← 학습 홈</button><span class="small muted">이번 묶음 ${s.index+1} / ${s.ids.length}</span></div><div class="bar" role="progressbar" aria-label="이번 묶음 진행" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${Object.keys(s.answers).length}"><span style="width:${Object.keys(s.answers).length/s.ids.length*100}%"></span></div><div class="question-meta"><span>${names[q.subject]}</span><strong>${c.number}장 · ${esc(c.title)}</strong></div>
      <article class="question-card"><div class="question-id">${esc(q.topic)} <span>· ${link?`공식 샘플 ${link.number}번 연계`:'자체 예상·기본'}</span></div><h1 id="question-text">${esc(q.text)}</h1><div class="answers" role="group" aria-labelledby="question-text">${[true,false].map(a=>`<button class="answer-button ${answered&&selected===a?'selected':''} ${answered&&q.answer===a?'correct-choice':''}" data-action="answer" data-answer="${a}" aria-label="${a?'O, 맞다':'X, 틀리다'}" ${answered?'disabled':''}>${a?'O':'X'}<small>${a?'맞다':'틀리다'}</small></button>`).join('')}</div><section class="feedback" id="feedback" aria-live="polite" ${answered?'':'hidden'}>${answered?`<p class="verdict ${selected===q.answer?'good':'bad'}">${selected===q.answer?'정답이에요':'다시 기억해 볼까요?'}<span>정답 ${q.answer?'O':'X'}</span></p><p class="explanation">${esc(q.explanation)}</p><div class="memory"><small>이 한 줄은 꼭</small>${esc(q.memory)}</div><details class="source-detail"><summary>근거와 출처 확인</summary><a href="${esc(data.sources[q.source].url)}" target="_blank" rel="noopener noreferrer">${esc(q.ref)} ↗</a>${link?`<p>공식 샘플 ${link.number}번의 ${esc(link.kind)}. O/X 문장과 해설은 새로 작성했습니다.</p>`:'<p>공식·1차 자료를 토대로 새로 작성한 학습용 문제입니다.</p>'}</details>`:''}</section></article>
      <div class="quiz-actions"><button class="text-button" data-action="prev" ${s.index===0?'disabled':''}>← 이전</button>${answered?`<button class="flag" data-action="flag" aria-pressed="${r?.flag===true}">${r?.flag?'★ 복습에 담음':'☆ 헷갈려요'}</button><button class="primary" data-action="next">${s.index===s.ids.length-1?'묶음 완료':'다음 문제'} →</button>`:'<span class="small muted">답을 고르면 해설이 보여요</span>'}</div><p class="quiz-footer">${answered?'오답은 자동 저장됩니다. 맞혔어도 헷갈리면 ☆를 눌러 주세요.':'틀린 문장이라면 어느 부분인지도 생각해 보세요.'}</p>`;
  }
  function answer(value) {
    const s=state.session;if(!s||s.done)return;const id=s.ids[s.index];if(typeof s.answers[id]==='boolean')return;
    const q=byId.get(id),old=state.records[id];s.answers[id]=value;state.records[id]={answer:value,correct:value===q.answer,flag:old?.flag===true,tries:(old?.tries||0)+1,at:new Date().toISOString()};save();renderQuiz();document.getElementById('feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function renderResult() {
    const s=state.session,correct=s.ids.filter(id=>s.answers[id]===byId.get(id).answer).length,wrong=s.ids.filter(id=>s.answers[id]!==byId.get(id).answer);
    const nextChapter=s.kind==='chapter'?chapters[chapters.indexOf(chapterById.get(s.ids[0]))+1]:null;
    app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">한 묶음 완료</div><h1>배운 내용을<br>한 번 더 떠올려요.</h1></div><section class="result-box"><p>${esc(s.title)}</p><div class="result-number">${correct}<small> / ${s.ids.length}</small></div><p>정답 ${correct}개 · 오답 ${wrong.length}개<br>O/X 정답률은 실제 시험 점수와 다릅니다.</p><div class="result-buttons">${s.kind==='chapter'&&nextChapter?`<button class="primary" data-action="chapter" data-chapter="${nextChapter.id}">다음 단원 이어서 →</button>`:remaining().length?'<button class="primary" data-action="continue">이어서 공부하기 →</button>':'<button class="primary" data-view="review">오답 모아보기 →</button>'}${wrong.length?'<button class="secondary" data-action="session-wrong">이번 오답 다시 풀기</button>':''}<button class="text-button" data-view="home">오늘은 여기까지</button></div></section>`;
  }
  function renderReview() {
    const ids=reviewIds(reviewSubject),total=reviewIds().length;
    app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">틀린 문제 + ★ 표시</div><h1>헷갈린 곳만,<br>한 번 더.</h1><p>복습할 문제 ${total}개. 다시 맞히면 오답에서 빠지고, ★ 표시는 직접 해제할 수 있어요.</p></div><div class="chips" aria-label="복습 과목">${['전체',...names].map((n,i)=>`<button class="chip ${reviewSubject===i-1?'active':''}" data-action="review-filter" data-subject="${i-1}" aria-pressed="${reviewSubject===i-1}">${n}</button>`).join('')}</div>${ids.length?`<button class="primary full" data-action="review-start">${ids.length}문항 복습 시작 →</button><div class="review-list">${ids.map(id=>{const q=byId.get(id),c=chapterById.get(id),r=state.records[id];return `<button class="review-item" data-action="one-review" data-id="${id}"><small>${names[q.subject]} · ${c.number}장 · ${esc(q.topic)}</small><p>${esc(q.text)}</p><span>${!r.correct?'최근 오답':''}${!r.correct&&r.flag?' · ':''}${r.flag?'★ 헷갈린 문제':''}</span></button>`}).join('')}</div>`:`<section class="empty"><h2>복습할 문제가 없어요</h2><p>틀린 문제는 여기에 자동으로 모입니다.</p><button class="primary" data-action="continue">이어서 공부하기</button></section>`}`;
  }
  function renderAuditCard() {
    const a=data.audit;if(!a)return '';
    return `<section class="info-card"><h2>최종 검수 · ${esc(a.date)}</h2><p>기존 300문항을 대조해 <strong>${a.correctedIds.length}개 문항의 조건·해설·출처를 보완</strong>하고, 반복 쟁점 ${a.retiredIds.length}개를 빠진 핵심 ${a.addedIds.length}개로 교체했습니다. 현재 학습 문항은 300개입니다.</p><button class="secondary full" data-action="audit-review">수정·보강 ${a.correctedIds.length+a.addedIds.length}문항 먼저 복습 →</button><ul class="source-list">${a.highlights.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><details><summary>수정한 내용과 근거 보기</summary><ul class="source-list">${a.corrections.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><ul class="source-list">${a.evidence.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></li>`).join('')}</ul></details><p class="note">검수 범위: 공식 교재 목차·정오표, 공식 샘플, 법령·공식 교육자료. 교재 본문 전체와 실제 회차별 기출 원문을 확보한 검수는 아닙니다.</p></section>`;
  }
  function renderAbout() {
    app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">학습자료와 기록</div><h1>무엇으로 공부하나요?</h1></div><div class="stack"><button class="secondary full" data-view="summary">시험 전 핵심요약 읽기 →</button>${renderAuditCard()}<section class="info-card"><h2>${questions.length}문항 · 교재 순서로 재구성</h2><p>외환관리실무 ${totals[0]}개, 외국환거래실무 ${totals[1]}개, 환리스크관리 ${totals[2]}개입니다. 총론부터 시작해 세 과목의 24개 장에 문제를 배치했습니다. 모든 문제에 정답·해설·한 줄 암기·근거를 붙였습니다.</p><p><strong>공식 공개 샘플 15문항에서 연결한 ${sampleCount}개</strong>와 자체 예상·기본 ${questions.length-sampleCount}개로 구성했습니다. 회차별 실제 기출 원문은 확보하지 못했으며, 샘플 연계 ${sampleCount}개는 실제 기출 ${sampleCount}개라는 뜻이 아닙니다. 교재의 세부 항목 전부나 출제빈도를 분석한 자료는 아닙니다.</p><details><summary>공식 샘플과 연결된 주제</summary><ul class="source-list">${data.sampleGroups.map(g=>`<li>${g.number}번 · ${esc(g.title)} (${g.ids.length}문항)</li>`).join('')}</ul></details></section><section class="info-card"><h2>법규 확인 · 2026.11.11.</h2><p>외국환거래규정은 2026.11.2. 시행본을 확인했습니다. 공개 구샘플의 외화차입 기준금액·부동산 보고 등은 현행 규정에 맞춰 구별했습니다. 2026.12.3. 시행 예정 조문은 적용하지 않았습니다.</p><p>제57회 공식 공지에서는 시험일인 11월 21일까지 시행된 개정내용도 시험범위에 포함한다고 안내합니다. 11월 2일 시행 규정을 반영했으며, 시험 전 추가 공지와 교재 정오표도 확인하세요. 계산문제의 환율·금리는 학습용 가정입니다.</p></section><section class="info-card"><h2>기록을 이어서 쓰려면</h2><p>기록은 <strong>이 기기의 현재 브라우저</strong>에 저장됩니다. 다른 기기나 브라우저로 옮길 때는 백업을 내려받아 불러오세요. 기존 버전의 답안·오답·★는 유지되며, 교체·통합한 문항의 과거 기록도 백업에 보관됩니다. 현재 진도와 오답에는 지금 학습하는 300문항만 집계합니다.</p><p>아이폰 Safari: 공유 → 홈 화면에 추가.<br>안드로이드 Chrome: 메뉴 → 홈 화면에 추가.<br>처음 온라인 접속 후 캐시가 준비되면 오프라인에서도 풀 수 있습니다.</p><div class="backup-row"><button class="secondary" data-action="export">학습기록 백업</button><button class="secondary" data-action="import">백업 불러오기</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div><p id="backup-status" aria-live="polite"></p></section><section class="info-card"><h2>교재 목차와 출처</h2><ul class="source-list">${data.books.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">한국금융연수원 · ${esc(s.name)} 교재 ↗</a></li>`).join('')}</ul><details><summary>문항 작성에 확인한 공식·1차 자료</summary><ul class="source-list">${Object.values(data.sources).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></li>`).join('')}</ul></details><p class="note">공식 샘플 PDF는 한국금융연수원 시험안내에서 내려받을 수 있습니다. 원본 PDF는 재게시하지 않았습니다.</p></section></div>`;
  }
  function renderSummary(){
    const blocks=[
      ['01 · 거주성은 국적과 다릅니다',['외국기업 국내지점 = 거주자 / 국내기업 해외지점 = 비거주자','우리 재외공관 = 거주자 / 국내 외국정부 공관 = 비거주자','일반 기준: 외국인 국내 체재 6개월, 국민 해외 체재 2년, 비거주자 국민 귀국 후 3개월. 외교관 등 별도 예외를 함께 확인.']],
      ['02 · 지급·상계는 예외부터',['제3자 지급: 다른 예외가 없을 때 5천 달러 이하 예외 / 5천 초과~1만 이하 은행 / 1만 초과 한국은행. 분할금액 합산.','일반 양자간 상계: 은행 사전신고 또는 1개월 이내 사후보고. 다자간·상계센터는 한국은행. 상계 증빙 5년 보관.','무증빙 지급 ≠ 원인거래 신고 면제. 현행 연간 10만 달러는 기관 합산이며 적용대상·거래요건을 충족해야 함.']],
      ['03 · 직접투자·부동산',['해외직접투자: 경영참여 지분 10% 이상. 10% 미만도 임원 파견 등 요건으로 해당 가능. 해외직접투자 관계가 있는 외국법인 대부는 1년 이상 요건 확인.','사후보고 대상 해외부동산: 취득보고는 취득대금 송금 후 3개월. 처분보고는 처분 후 3개월, 그 안에 대금을 받으면 받은 시점. 적용제외·유예 별도.','현행 일반 영리법인 외화차입 장관 신고 기준: 과거 1년 누적 포함 5천만 달러 초과(현지금융 산입 제외). 구샘플의 3천만 달러와 구별.']],
      ['04 · 환율의 방향',['원/달러 ↑ = 달러 강세 · 원화 약세. EUR/USD ↑ = 유로 강세.','은행 관점의 매입·매도: 고객이 달러를 사면 은행 매도. 원화로 송금 보낼 때 전신환매도 / 받은 달러를 원화로 바꿀 때 전신환매입.','환율우대는 스프레드 감면. 고객의 달러 매수 적용환율 = 기준율 + 스프레드 × (1-우대율).']],
      ['05 · 헤지 방향 4개',['받을 달러 → 선물환 매도 또는 달러 풋옵션 매수','지급할 달러 → 선물환 매입 또는 달러 콜옵션 매수','달러 매입초과(Long) → 환율 상승 유리 / 매도초과(Short) → 환율 상승 불리','통화스왑: 달러 변동부채는 달러 변동 수취·원화 고정 지급. 달러 변동자산은 그 반대. 원금·만기 일치도 확인.']],
      ['06 · 계산은 단위부터',['원화금액 = 달러금액 × 원/달러 환율','원/100엔 = (원/달러 ÷ 엔/달러) × 100','달러선물 1계약 = 10,000달러. 1틱 0.1원 × 10,000 = 1,000원.','만기 콜 매수 순익 = max(S-K,0) - 프리미엄. 풋 매수 순익 = max(K-S,0) - 프리미엄. S=만기 현물환율, K=행사가격.','단순 금리평가: F = S × (1+원화금리×기간)/(1+달러금리×기간). 기간은 연 단위, 금리는 소수. 실제 시장가격과 차이가 날 수 있음.']],
      ['07 · MX 전문과 외화예금',['MX는 ISO 20022·XML 기반. Business Area는 pacs·pain·camt처럼 4글자. MT 숫자 3자리와 구별.','pacs.008은 고객송금의 은행 간 전달에 사용. pain은 지급 개시, camt는 현금관리 영역.','외화예금도 거주성·자금 성격에 따라 계정을 구분한다. 예금계정의 용도와 신고예외를 혼동하지 않는다.']],
      ['08 · 옵션전략과 초단기 스왑',['스트래들 매수: 같은 행사가격·만기의 콜+풋. 두 프리미엄을 회수할 만큼 큰 환율 움직임 필요.','수출기업 칼라: 풋 매수+콜 매도. 최초 순프리미엄 0이라도 상승 이익에는 상한. 녹아웃은 조건 충족 시 권리 소멸 가능.','결제 영업일 기준 O/N은 오늘→다음 날, T/N은 다음 날→그다음 날. 휴일을 함께 확인.']]
    ];app.innerHTML=`<div class="page-intro"><div class="eyebrow muted">LAST MINUTE NOTES</div><h1>시험 전, 이 여덟 가지.</h1><p>암기문장을 읽고 이유를 소리 내어 설명해 보세요.<br>법규는 문제의 조건과 예외를 함께 확인하세요.</p></div>${blocks.map(([t,items])=>`<section class="summary-block"><h3>${t}</h3><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}<p class="note" style="margin-top:20px">2026.11.11. 확인. 제57회 공식 공지에 따라 11월 21일까지 시행된 개정내용도 시험범위에 포함됩니다. 해당 회차 공지·교재 정오표를 함께 확인하세요. 요약은 개별 문제의 조건을 대체하지 않습니다.</p>`;}
  function handleClick(e) {
    const b=e.target.closest('[data-action],[data-view]');if(!b||b.disabled)return;
    if(b.dataset.view){setView(b.dataset.view);return;}
    const action=b.dataset.action;
    if(action==='continue')continueCourse();
    else if(action==='audit-review'){const ids=new Set([...data.audit.correctedIds,...data.audit.addedIds]);start(order.filter(id=>ids.has(id)),'최종 검수 반영 문항','review');}
    else if(action==='subject'){selectedSubject=Number(b.dataset.subject);setView('course');}
    else if(action==='chapter')startChapter(b.dataset.chapter);
    else if(action==='answer')answer(b.dataset.answer==='true');
    else if(action==='prev'){if(state.session.index>0){state.session.index--;save();setView('quiz');}}
    else if(action==='next'){const s=state.session;if(typeof s.answers[s.ids[s.index]]!=='boolean')return;if(s.index<s.ids.length-1)s.index++;else s.done=true;save();setView('quiz');}
    else if(action==='flag'){const id=state.session.ids[state.session.index];if(state.records[id]){state.records[id].flag=!state.records[id].flag;save();renderQuiz();}}
    else if(action==='session-wrong'){const s=state.session;start(s.ids.filter(id=>s.answers[id]!==byId.get(id).answer),'이번 풀이 오답','review');}
    else if(action==='review-filter'){reviewSubject=Number(b.dataset.subject);renderReview();}
    else if(action==='review-start')start(reviewIds(reviewSubject),'오답·헷갈린 문제 복습','review');
    else if(action==='one-review')start([Number(b.dataset.id)],'한 문제 복습','review');
    else if(action==='export'){
      const blob=new Blob([JSON.stringify({app:'cfes1-ox',version:1,exportedAt:new Date().toISOString(),records:state.records},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`외환OX-학습기록-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('backup-status').textContent='백업 다운로드를 요청했습니다. 파일 앱에서 보관해 주세요.';
    }else if(action==='import')document.getElementById('backup-file').click();
  }
  document.querySelector('.bottom-nav').addEventListener('click',handleClick);
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();setView('home');});
  app.addEventListener('click',handleClick);
  app.addEventListener('change',async e=>{
    if(e.target.id!=='backup-file'||!e.target.files?.[0])return;
    const status=document.getElementById('backup-status');
    try{const f=e.target.files[0];if(f.size>1024*1024)throw new Error('size');const backup=JSON.parse(await f.text());if(backup.app!=='cfes1-ox'||backup.version!==1||!backup.records||typeof backup.records!=='object')throw new Error('format');const incoming=validRecords(backup.records);for(const [id,r] of Object.entries(incoming)){const old=state.records[id];if(!old||r.at>=old.at)state.records[id]=r;}save();status.textContent=`${Object.keys(incoming).length}개 기록을 확인해 더 최근 기록과 합쳤습니다.`;}catch(err){status.textContent='불러오지 못했습니다. 이 사이트에서 내보낸 JSON 백업을 선택해 주세요.';}
  });
  document.addEventListener('keydown',e=>{if(view!=='quiz'||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='o')answer(true);else if(e.key.toLowerCase()==='x')answer(false);});
  save();render();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
