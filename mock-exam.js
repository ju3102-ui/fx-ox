(() => {
  'use strict';
  const data=window.FX_MOCK_DATA;
  if(!data)return;
  const questions=data.questions,names=['외환관리실무','외국환거래실무','환리스크관리'];
  const key='cfes1-final-mock-20261120-v1',limit=120*60*1000;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const answered=v=>Number.isInteger(v)&&v>=0&&v<4;
  const fresh=()=>({version:data.version,status:'idle',answers:{},flags:{},index:0,elapsed:0,startedAt:null,submittedAt:null,history:[]});
  let state=fresh(),root=null,active=false,lastTick=0,confirmation='',filter='all',reviewIndex=0,showReview=false;
  function valid(raw){
    const next=fresh();
    if(!raw||raw.version!==data.version)return next;
    next.status=['idle','active','paused','submitted'].includes(raw.status)?raw.status:'idle';
    next.index=Number.isInteger(raw.index)?Math.max(0,Math.min(79,raw.index)):0;
    next.elapsed=Math.max(0,Math.min(limit,Number(raw.elapsed)||0));
    next.startedAt=typeof raw.startedAt==='string'?raw.startedAt:null;
    next.submittedAt=typeof raw.submittedAt==='string'?raw.submittedAt:null;
    next.expired=raw.expired===true;
    for(const q of questions){if(answered(raw.answers?.[q.id]))next.answers[q.id]=raw.answers[q.id];if(raw.flags?.[q.id]===true)next.flags[q.id]=true;}
    if(Array.isArray(raw.history))next.history=raw.history.filter(h=>typeof h.at==='string'&&Number.isFinite(h.score)&&Number.isInteger(h.correct)&&h.correct>=0&&h.correct<=80).slice(-3);
    if(next.status==='active')next.status='paused';
    return next;
  }
  try{state=valid(JSON.parse(localStorage.getItem(key)||'null'));}catch(e){}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(e){const n=document.getElementById('storage-notice');if(n)n.hidden=false;}}
  function count(){return questions.filter(q=>answered(state.answers[q.id])).length;}
  function score(answers=state.answers){
    const subjects=names.map((name,s)=>{const qs=questions.filter(q=>q.subject===s),correct=qs.filter(q=>answers[q.id]===q.answer).length;return {name,total:qs.length,correct,rate:correct/qs.length*100,points:correct/qs.length*[50,30,20][s],weight:[50,30,20][s]};});
    const total=subjects.reduce((a,s)=>a+s.points,0),correct=subjects.reduce((a,s)=>a+s.correct,0);
    return {subjects,total,correct,pass:total>=60&&subjects.every(s=>s.rate>=40)};
  }
  function time(ms){const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function tick(){
    if(state.status!=='active')return;
    const now=Date.now();state.elapsed=Math.min(limit,state.elapsed+Math.max(0,now-lastTick));lastTick=now;
    if(state.elapsed>=limit){submit(true);return;}
    const t=document.getElementById('mock-timer');if(t)t.textContent=time(limit-state.elapsed);
    save();
  }
  function pause(){if(state.status==='active'){tick();if(state.status==='active')state.status='paused';save();}}
  function resume(){state.status='active';state.startedAt=state.startedAt||new Date().toISOString();lastTick=Date.now();save();render();}
  function submit(expired=false){
    if(state.status==='submitted'||state.status==='idle')return;
    state.status='submitted';state.submittedAt=new Date().toISOString();state.expired=expired;confirmation='';showReview=false;save();render();scrollTop();
  }
  function scrollTop(){window.scrollTo({top:0,behavior:'instant'});}
  function card(){
    const label=state.status==='submitted'?'성적과 해설 보기':state.status==='idle'?'최종 모의고사 시작하기':'모의고사 이어서 풀기';
    return `<section class="mock-entry"><div class="mock-entry-top"><span class="mock-tag">11.20 최종 점검</span><span class="mock-entry-count">80<small>문항</small></span></div><h2>실전처럼 풀고,<br>헷갈린 곳까지 정리해요.</h2><p>4지선다형 · 세 과목 · 120분<br>사례와 계산, 보기마다 자세한 해설까지.</p><button class="primary full" data-view="mock">${label}</button>${state.status!=='idle'?`<p class="mock-note">${state.status==='submitted'?`최근 결과 ${score().correct} / 80 정답`:`${count()} / 80 답안 저장 · 남은 시간 ${time(limit-state.elapsed)}`}</p>`:''}</section>`;
  }
  function intro(){
    return `<div class="mock-heading"><span class="mock-tag">FINAL CHECK · 2026.11.20</span><h1>최종 모의고사</h1><p>오늘은 네 개의 보기 중<br>가장 정확한 답 하나를 골라 보세요.</p></div><section class="mock-panel"><div class="mock-facts"><div><b>80</b><span>4지선다 문항</span></div><div><b>120<small>분</small></b><span>풀이 시간</span></div><div><b>3</b><span>전 과목 점검</span></div></div><ol class="mock-subjects">${names.map((n,s)=>`<li><span>${n}</span><b>${[35,25,20][s]}문항</b></li>`).join('')}</ol><button class="primary full" data-mock="start">80문항 시작하기</button></section><section class="mock-panel"><h2>이렇게 풀어 보세요</h2><ul class="mock-instructions"><li>답은 제출 전까지 바꿀 수 있습니다. 정답과 해설은 제출 후 공개됩니다.</li><li>헷갈린 문제는 ★로 표시하고, 답안표에서 원하는 문제로 이동하세요.</li><li>한 시간씩 나눠 풀어도 됩니다. 일시정지하거나 다른 화면으로 이동하면 시간이 멈춥니다. 다시 접속하면 저장된 답안에서 이어집니다.</li><li>활성 풀이 시간이 120분이 되면 자동 제출됩니다. 기록은 이 기기의 현재 브라우저에 저장됩니다.</li></ul></section><section class="mock-basis"><h2>문제와 채점 기준</h2><p>한국금융연수원 공식 공개 샘플의 유형을 참고해 새로 만든 예상 모의고사입니다. 실제 회차별 기출 원문은 아닙니다. 금액·기한은 문항별 현행 공식 자료로 확인했으며, 계산의 환율·금리는 문제에 제시한 가정입니다.</p><p>학습용 점수는 각 과목 정답률에 50·30·20점을 곱해 합산합니다. 실제 문항별 차등배점을 재현한 점수는 아닙니다. 환산 총점 60점 이상이면서 각 과목 정답률 40% 이상이면 ‘기준 충족’으로 표시합니다.</p><a href="https://www.kbi.or.kr/platformWeb/Qual.do?cmd=openPage&p_iQlfn=09&pageName=qualInfo" target="_blank" rel="noopener noreferrer">공식 시험 형식·시간·합격 기준</a></section>`;
  }
  function grid(review=false){
    return `<details class="mock-map"><summary>전체 답안표 · ${review?'정오 확인':`${count()} / 80 응답`}</summary><p class="mock-note">${review?'○ 정답 · × 오답 / 미응답':'초록색은 답한 문제, ★는 다시 볼 문제입니다.'}</p>${names.map((n,s)=>`<h3>${n}</h3><div class="mock-grid">${questions.map((q,i)=>q.subject===s?`<button data-mock="${review?'review-go':'go'}" data-index="${i}" class="${answered(state.answers[q.id])?'filled':''} ${i===(review?reviewIndex:state.index)?'current':''} ${review?(state.answers[q.id]===q.answer?'right':'wrong'):''}" aria-label="${i+1}번 ${answered(state.answers[q.id])?'응답 완료':'미응답'}${state.flags[q.id]?' 다시 볼 문제':''}${review?(state.answers[q.id]===q.answer?' 정답':' 오답'):''}">${i+1}<small>${state.flags[q.id]?'★':review?(state.answers[q.id]===q.answer?'○':'×'):answered(state.answers[q.id])?'✓':'·'}</small></button>`:'').join('')}</div>`).join('')}</details>`;
  }
  function exam(){
    const q=questions[state.index],a=state.answers[q.id];
    return `<div class="mock-status"><div><strong>${state.index+1}<span> / 80</span></strong><p>${names[q.subject]}</p></div><div class="mock-clock"><span>남은 시간</span><b id="mock-timer">${time(limit-state.elapsed)}</b><button data-mock="pause">일시정지</button></div></div><div class="bar"><span style="width:${count()/80*100}%"></span></div><div class="mock-tools"><span>${count()}문항 응답</span><button class="flag" data-mock="flag" aria-pressed="${!!state.flags[q.id]}">${state.flags[q.id]?'★ 다시 볼 문제':'☆ 다시 볼 문제'}</button></div><article class="mock-question"><div class="mock-question-label">문제 ${state.index+1}${/옳지|잘못|틀린|해당하지|아닌/.test(q.stem)?' <span>부정형 발문</span>':''}</div><h1 id="mock-stem">${esc(q.stem)}</h1><div class="mock-choices" role="radiogroup" aria-labelledby="mock-stem">${q.choices.map((c,i)=>`<button class="mock-choice ${a===i?'selected':''}" role="radio" aria-checked="${a===i}" data-mock="answer" data-answer="${i}"><span class="mock-choice-number">${i+1}</span><span>${esc(c)}</span></button>`).join('')}</div><p class="mock-note" aria-live="polite">${answered(a)?`${a+1}번 보기를 선택했습니다. 제출 전까지 바꿀 수 있어요.`:'정답 하나를 선택하세요. 모르면 건너뛸 수 있어요.'}</p></article><div class="mock-nav"><button class="secondary" data-mock="prev" ${state.index===0?'disabled':''}>이전 문제</button><button class="primary" data-mock="${state.index===79?'ask-submit':'next'}">${state.index===79?'답안 제출 확인':'다음 문제'}</button></div>${grid()}<button class="mock-submit secondary full" data-mock="ask-submit">답안 제출하기</button>`;
  }
  function paused(){return `<section class="mock-panel mock-paused"><span class="mock-tag">답안 자동 저장</span><h1>잠시 쉬어 가요.</h1><p>${count()} / 80문항 응답<br>남은 시간 <b>${time(limit-state.elapsed)}</b></p><button class="primary full" data-mock="resume">${state.index+1}번부터 이어서 풀기</button><p class="mock-note">다른 화면으로 이동하거나 화면을 끄면 자동으로 일시정지됩니다.</p></section>`;}
  function confirmPanel(){
    const restart=confirmation==='restart',missing=80-count();
    return `<section class="mock-panel mock-confirm"><h1>${restart?'다시 풀까요?':'답안을 제출할까요?'}</h1><p>${restart?'현재 답안과 상세 해설 기록이 새 풀이로 바뀝니다. 최근 3회의 점수는 남겨 둡니다.':`응답 ${count()}문항 · 미응답 ${missing}문항 · ★ ${Object.keys(state.flags).length}문항`}</p>${!restart&&missing?'<p class="mock-warning">답하지 않은 문제는 오답으로 채점됩니다.</p>':''}<p>${restart?'같은 문제 80개를 처음부터 다시 풉니다.':'제출하면 답안을 수정할 수 없고 정답·해설이 공개됩니다.'}</p><div class="mock-nav"><button class="secondary" data-mock="cancel">${restart?'취소':'계속 풀기'}</button><button class="primary" data-mock="${restart?'restart':'submit'}">${restart?'새로 시작':'제출하고 채점'}</button></div>${!restart?grid():''}</section>`;
  }
  function result(){
    const r=score(),wrong=80-r.correct;
    return `<div class="mock-heading"><span class="mock-tag">${state.expired?'120분 종료 · 자동 제출':'최종 모의고사 · 제출 완료'}</span><h1>이제 해설로<br>마무리할 시간.</h1></div><section class="mock-panel mock-result"><span class="mock-result-label">학습용 환산점수</span><div class="mock-score">${r.total.toFixed(2)}<small> / 100</small></div><p><b>${r.correct} / 80문항 정답</b> · 풀이 ${time(state.elapsed)}</p><p class="mock-verdict ${r.pass?'good':'bad'}">${r.pass?'연습 채점 기준 충족':'보완할 과목을 확인하세요'}</p><p class="mock-note">과목별 정답률 × 50·30·20점의 합산입니다.<br>실제 문항별 차등배점과는 다릅니다.</p><div class="mock-score-table">${r.subjects.map(s=>`<div><strong>${s.name}</strong><p>${s.correct} / ${s.total} 정답 · ${s.rate.toFixed(1)}%${s.rate<40?' <b class="bad">과락 기준 미달</b>':''}</p><span>${s.points.toFixed(2)} / ${s.weight}점</span></div>`).join('')}</div><div class="mock-result-actions"><button class="primary full" data-mock="review-wrong" ${wrong?'':'disabled'}>오답 ${wrong}문항 해설 보기</button><button class="secondary full" data-mock="review-all">80문항 전체 해설 보기</button><button class="secondary full" data-mock="review-flag" ${Object.keys(state.flags).length?'':'disabled'}>★ 표시한 문제 해설 보기</button></div></section><section class="mock-panel"><h2>마지막 복습 순서</h2><ol class="mock-instructions"><li>틀린 보기의 어느 단어·금액·기한이 달랐는지 확인하세요.</li><li>계산문제는 환율의 표시 방법과 매수·매도 방향부터 다시 적어 보세요.</li><li>각 문제의 ‘기억할 핵심’을 가리고 말한 뒤 핵심요약에서 해당 단원을 복습하세요.</li></ol><button class="text-button" data-mock="ask-restart">같은 80문항 다시 풀기</button></section>${state.history.length?`<section class="mock-panel"><h2>이전 풀이 기록</h2><ul class="mock-instructions">${state.history.map(h=>`<li>${esc(h.at.slice(0,10))} · ${h.score.toFixed(2)}점 · ${h.correct} / 80 정답</li>`).join('')}</ul></section>`:''}`;
  }
  function reviewList(){return questions.map((q,i)=>({q,i})).filter(({q})=>filter==='wrong'?state.answers[q.id]!==q.answer:filter==='flag'?state.flags[q.id]:true).map(x=>x.i);}
  function review(){
    const ids=reviewList();if(!ids.includes(reviewIndex))reviewIndex=ids[0];
    if(!ids.length)return `<section class="mock-panel"><h2>이 조건에 맞는 문제가 없어요.</h2><button class="secondary" data-mock="result">성적으로 돌아가기</button></section>`;
    const q=questions[reviewIndex],a=state.answers[q.id],pos=ids.indexOf(reviewIndex);
    return `<div class="mock-review-top"><button class="text-button" data-mock="result">성적 보기</button><span>${filter==='wrong'?'오답':filter==='flag'?'★ 표시':'전체'} 해설 ${pos+1} / ${ids.length}</span></div><div class="mock-filter" aria-label="해설 필터">${[['all','전체'],['wrong','오답'],['flag','★ 표시']].map(([v,label])=>`<button class="chip ${filter===v?'active':''}" data-mock="filter" data-filter="${v}" aria-pressed="${filter===v}">${label}</button>`).join('')}</div><article class="mock-question mock-review"><div class="mock-question-label">${reviewIndex+1}번 · ${names[q.subject]}</div><h1>${esc(q.stem)}</h1><div class="mock-review-verdict ${a===q.answer?'good':'bad'}">${a===q.answer?'정답입니다':'다시 확인하세요'}<span>내 답 ${answered(a)?a+1+'번':'미응답'} · 정답 ${q.answer+1}번</span></div><ol class="mock-explained-choices">${q.choices.map((c,i)=>`<li class="${i===q.answer?'is-answer':''} ${i===a?'is-selected':''}"><div><span class="mock-choice-number">${i+1}</span><strong>${esc(c)}</strong></div><small>${i===q.answer?'정답 보기':'오답 보기'}${i===a?' · 내가 선택함':''}</small><p>${esc(q.choiceExplanations[i])}</p></li>`).join('')}</ol><section class="mock-solution"><h2>왜 이 답일까요?</h2><p>${esc(q.explanation)}</p></section><div class="mock-memory"><strong>기억할 핵심</strong><p>${esc(q.memory)}</p></div><details class="mock-sources"><summary>관련 단원과 공식 근거</summary><p>${esc(q.chapter)} · ${esc(q.topic)}</p>${q.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}<button class="secondary" data-action="mock-guide" data-subject="${q.subject}" data-chapter="${q.chapterNumber}">이 단원 핵심요약 열기</button></details></article><div class="mock-nav"><button class="secondary" data-mock="review-prev" ${pos===0?'disabled':''}>이전 해설</button><button class="primary" data-mock="${pos===ids.length-1?'result':'review-next'}">${pos===ids.length-1?'성적으로 돌아가기':'다음 해설'}</button></div>${grid(true)}`;
  }
  function render(){if(!active||!root)return;root.innerHTML=`<div class="mock-page"><div class="mock-back"><button class="text-button" data-view="home">학습 홈</button><span>4지선다 · 최종 80문항</span></div>${confirmation?confirmPanel():state.status==='idle'?intro():state.status==='paused'?paused():state.status==='submitted'?(showReview?review():result()):exam()}</div>`;}
  function click(e){
    const b=e.target.closest('[data-mock]');if(!b||b.disabled||!active)return;
    const action=b.dataset.mock;
    if(action==='start'||action==='resume')resume();
    else if(action==='pause'){pause();render();}
    else if(action==='answer'&&state.status==='active'&&!confirmation){const n=Number(b.dataset.answer);if(answered(n)){state.answers[questions[state.index].id]=n;save();render();root.querySelector(`[data-answer="${n}"]`)?.focus({preventScroll:true});}}
    else if(action==='flag'&&state.status==='active'){const id=questions[state.index].id;if(state.flags[id])delete state.flags[id];else state.flags[id]=true;save();render();}
    else if(['next','prev','go'].includes(action)&&state.status==='active'){const n=action==='go'?Number(b.dataset.index):state.index+(action==='next'?1:-1);if(Number.isInteger(n)&&n>=0&&n<80){state.index=n;confirmation='';save();render();scrollTop();}}
    else if(action==='ask-submit'&&state.status==='active'){tick();if(state.status==='active'){confirmation='submit';render();scrollTop();}}
    else if(action==='submit'&&confirmation==='submit'){tick();submit();}
    else if(action==='cancel'){confirmation='';render();scrollTop();}
    else if(action==='ask-restart'&&state.status==='submitted'){confirmation='restart';render();scrollTop();}
    else if(action==='restart'&&confirmation==='restart'){const r=score(),history=[...state.history,{at:state.submittedAt,score:r.total,correct:r.correct}].slice(-3);state=fresh();state.history=history;confirmation='';showReview=false;resume();scrollTop();}
    else if(state.status==='submitted'){
      if(action.startsWith('review-')&&['all','wrong','flag'].includes(action.slice(7))){filter=action.slice(7);showReview=true;reviewIndex=reviewList()[0];}
      else if(action==='result')showReview=false;
      else if(action==='filter'){filter=['all','wrong','flag'].includes(b.dataset.filter)?b.dataset.filter:'all';reviewIndex=reviewList()[0];}
      else if(action==='review-go'){const n=Number(b.dataset.index);if(Number.isInteger(n)&&n>=0&&n<80){filter='all';reviewIndex=n;showReview=true;}}
      else if(action==='review-prev'||action==='review-next'){const ids=reviewList(),n=ids.indexOf(reviewIndex)+(action==='review-next'?1:-1);if(n>=0&&n<ids.length)reviewIndex=ids[n];}
      render();scrollTop();
    }
  }
  window.FX_MOCK_UI={card,mount(el){root=el;active=true;render();},unmount(){pause();active=false;confirmation='';},score};
  document.getElementById('app').addEventListener('click',click);
  document.addEventListener('keydown',e=>{if(!active||state.status!=='active'||confirmation||!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key))return;const b=e.target.closest?.('[data-mock="answer"]');if(!b)return;e.preventDefault();const n=(Number(b.dataset.answer)+(['ArrowDown','ArrowRight'].includes(e.key)?1:3))%4;state.answers[questions[state.index].id]=n;save();render();root.querySelector(`[data-answer="${n}"]`)?.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.status==='active'){pause();confirmation='';render();}});
  window.addEventListener('pagehide',pause);
  setInterval(()=>{if(active&&state.status==='active')tick();},1000);
  save();
})();
