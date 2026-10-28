import {FACTIONS,OFFICERS,PERSONAS,TYPES,STANCES,newCampaign,loadCampaign,serializeCampaign,city,owned,troops,limit,available,freeOfficers,garrison,income,quoteOrder,orderError,addOrder,cancelOrder,startExecution,tick,armyPosition,storyFor,decideStory,setRecall} from './phase.js';
import {renderMap} from './map.js';
import {portrait} from './experience.js';
import {trace,diagnostics,exportDiagnostics} from './logger.js';

const app=document.querySelector('#app');
const KEY='three-kingdoms-orders-v3',OLD_KEY='three-kingdoms-mandate-v1';
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>`${n>=0?'+':'−'}${fmt(Math.abs(n))}`;
let game=newCampaign('shu'),timer=null,speed=1;
const ui={view:'city',kind:'levy',officer:'',budget:400,target:'',amount:3000,stance:'guard',recruit:'',picking:false,mobile:'map',notice:'도시에서 명령을 예약한 뒤 실행하세요.',newFaction:'shu',confirmNew:false};
try {
  const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY);
  if(raw) {game=loadCampaign(raw);ui.notice=game.phase==='execution'?'이전 실행을 일시정지 상태로 복원했습니다. 계속 ▶ 를 누르세요.':'저장한 천하를 이어갑니다. 새 명령은 예약 후 함께 실행됩니다.';}
}catch(error){trace('save','load.failed',{message:error.message,stack:error.stack},'error');ui.notice='저장을 읽지 못했습니다. 원본 저장은 보존하고 새 원정을 준비했습니다.';}

function save(){
  try{localStorage.setItem(KEY,serializeCampaign(game));trace('save','written',{turn:game.turn,day:game.day,phase:game.phase,orders:game.plans.length,armies:game.armies.length});}
  catch(error){trace('save','write.failed',{message:error.message},'error');ui.notice='자동 저장 실패. 진단 파일로 현재 진행을 보관할 수 있습니다.';}
}
function normalize(){
  const list=freeOfficers(game);
  if(!list.includes(ui.officer)) ui.officer=list.slice().sort((a,b)=>(['levy','march','transfer'].includes(ui.kind)?OFFICERS[b].war-OFFICERS[a].war:OFFICERS[b].int-OFFICERS[a].int))[0]||'';
  const c=city(game,game.selected),targets=c.neighbors.map(id=>city(game,id)).filter(v=>ui.kind==='transfer'?v.owner===game.player:v.owner!==game.player);
  if(!targets.some(v=>v.id===ui.target)) ui.target=targets[0]?.id||'';
  if(!game.pool.includes(ui.recruit)) ui.recruit=game.pool[0]||'';
  ui.amount=Math.max(500,Math.min(ui.amount,Math.floor(Math.max(0,garrison(game,c.id)-1000)/100)*100));
}
function request(){return {city:game.selected,type:ui.kind,officer:ui.officer,budget:ui.budget,...(['march','transfer'].includes(ui.kind)?{target:ui.target,troops:ui.amount,stance:ui.stance}:ui.kind==='hire'?{recruit:ui.recruit}:{})};}
function metrics(c){
  return `<div class="city-numbers"><div><small>주둔 병력</small><strong>${fmt(c.soldiers)}</strong>${garrison(game,c.id)!==c.soldiers?`<em>출진 예약 −${fmt(c.soldiers-garrison(game,c.id))}</em>`:''}</div><div><small>민심</small><strong>${Math.round(c.morale)}<span>/100</span></strong></div></div>`;
}
function cityPanel(){
  const c=city(game,game.selected),f=FACTIONS[c.owner],army=game.armies.find(a=>a.id===ui.army);
  if(army) return armyPanel(army);
  const mine=c.owner===game.player,busy=game.phase==='execution'||game.status!=='playing';
  if(busy&&mine) return `<div class="panel-heading"><h2>${c.name}</h2><span>${f.name} · ${c.terrain}</span></div>${metrics(c)}<div class="execution-city"><h3>${game.phase==='execution'?'배정한 임무':'원정 결과'}</h3>${game.plans.filter(o=>o.city===c.id&&o.faction===game.player).map(o=>`<article><strong>${OFFICERS[o.officer].name} · ${TYPES[o.type]}${o.target?` → ${city(game,o.target).name}`:''}</strong><p>${o.status==='done'?(['march','transfer'].includes(o.type)?'출발 · 이동은 지도에서':'✓ 완료'):o.status==='failed'?'중단':`${Math.round(o.progress*100)}% · ${o.quote.duration}일 소요`}</p></article>`).join('')||'<p>이 도시에는 배정한 임무가 없습니다.</p>'}<p class="note">지도에서 움직이는 부대를 누르면 병력·사기·보급을 확인할 수 있습니다.</p></div>`;
  let q=null,error='';if(mine){try{q=quoteOrder(game,request());error=orderError(game,request());}catch(e){error=e.message;}}
  return `<div class="panel-heading"><h2>${c.name}</h2><button class="text-button" data-view="details">${f.name} · 도시 상세 ↗</button></div>${metrics(c)}${mine?`
    <div class="order-types" aria-label="명령 종류">${Object.entries(TYPES).map(([id,n])=>`<button data-kind="${id}" class="${ui.kind===id?'selected':''}" ${busy?'disabled':''}>${n}</button>`).join('')}</div>
    <div class="command-fields ${['march','transfer'].includes(ui.kind)?'military':''}"><label class="field">담당 장수<select id="officer" ${busy?'disabled':''}>${freeOfficers(game).length?freeOfficers(game).map(id=>`<option value="${id}" ${id===ui.officer?'selected':''}>${OFFICERS[id].name} · 무 ${OFFICERS[id].war} / 지 ${OFFICERS[id].int}</option>`).join(''):'<option value="">배정 가능한 장수 없음</option>'}</select></label>
    ${['march','transfer'].includes(ui.kind)?`<label class="field">목적지 <button data-action="pick" class="text-button">지도 ↗</button><select id="target" ${busy?'disabled':''}>${c.neighbors.map(id=>city(game,id)).filter(v=>ui.kind==='transfer'?v.owner===game.player:v.owner!==game.player).map(v=>`<option value="${v.id}" ${v.id===ui.target?'selected':''}>${v.name} · ${FACTIONS[v.owner].name} · ${fmt(v.soldiers)}명</option>`).join('')}</select></label><label class="slider-label" for="amount">배정 병력 <b id="slider-value">${fmt(ui.amount)}명</b></label><input id="amount" type="range" min="500" max="${Math.max(500,garrison(game,c.id)-1000)}" step="100" value="${ui.amount}" ${busy?'disabled':''}><label class="field compact-field">교전 방침<select id="stance" ${busy?'disabled':''}>${Object.entries(STANCES).map(([id,n])=>`<option value="${id}" ${ui.stance===id?'selected':''}>${n}${id==='guard'?' · 손실 억제':id==='feint'?' · 지력 활용':' · 강한 압박'}</option>`).join('')}</select></label>`:ui.kind==='hire'?`<label class="field">초빙할 인재<select id="recruit" ${busy?'disabled':''}>${game.pool.map(id=>`<option value="${id}" ${ui.recruit===id?'selected':''}>${OFFICERS[id].name} · ${PERSONAS[id].skill}</option>`).join('')}</select></label>`:`<label class="slider-label" for="budget">투자금 <b id="slider-value">금 ${fmt(ui.budget)}</b></label><input id="budget" type="range" min="150" max="1000" step="50" value="${ui.budget}" ${busy?'disabled':''}>`}
    </div><div id="quote">${quotePanel(q,error)}</div>`:`<div class="enemy-detail"><p>아군의 인접 도시에서 장수와 병력을 배정해 공략합니다.</p>${c.neighbors.map(id=>city(game,id)).filter(v=>v.owner===game.player).map(v=>`<button data-attack="${v.id}" data-target="${c.id}" ${busy?'disabled':''}>${v.name}에서 출진 계획 →</button>`).join('')||'<small>아군과 이어진 길이 없습니다.</small>'}</div>`}`;
}
function quotePanel(q,error){
  const result=!q?'장수와 목적지를 선택하세요.':ui.kind==='levy'?`병력 +${fmt(q.troops)}명`:ui.kind==='hire'?`${OFFICERS[ui.recruit]?.name||'인재'} 초빙`:q.field?`${TYPES[ui.kind]} ${Math.round(city(game,game.selected)[q.field])} → ${Math.round(city(game,game.selected)[q.field]+q.gain)}`:`${fmt(q.troops)}명 · ${city(game,ui.target)?.name||'목적지'} 이동`;
  return `<div class="order-preview"><div><strong>${result}</strong><span>${q?q.duration:'—'}일 소요</span></div><p>금 ${q?fmt(q.gold):'—'} · 군량 ${q?fmt(q.food):'—'}</p>${q?`<button data-action="calculation" class="text-button">산출 근거 ↗</button>`:''}</div><button class="reserve-button" data-action="reserve" ${error?'disabled':''}>${game.phase==='execution'?'실행 중 · 명령 잠금':'+ 예약 목록에 추가'}</button><div class="validation" role="status">${esc(error||'아직 실행되지 않습니다. 예약은 취소할 수 있습니다.')}</div>`;
}
function detailsPanel(){
  const c=city(game,game.selected);
  return `<div class="panel-heading"><h2>${c.name} 상세</h2><button data-view="city" class="text-button">← 명령</button></div>${metrics(c)}<dl class="detail-list">${[['인구',fmt(c.population)],['예비 인력',fmt(c.reserve)],['농업',Math.round(c.agriculture)],['상업',Math.round(c.commerce)],['방비',Math.round(c.defense)],['훈련',Math.round(c.training)],['징집 피로',Math.round(c.weariness)],['지형',c.terrain]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="note">징집은 인구와 예비 인력, 민심과 피로에 영향을 받습니다. 개발 수입은 매달 정산됩니다.</p>`;
}
function calculationPanel(){
  let q;try{q=quoteOrder(game,request());}catch(error){return `<p>${esc(error.message)}</p><button data-view="city">← 명령</button>`;}
  const c=city(game,game.selected);
  return `<div class="panel-heading"><h2>${TYPES[ui.kind]} 산출 근거</h2><button data-view="city" class="text-button">← 명령</button></div><dl class="detail-list">${q.notes.map(note=>`<div><dt>${esc(note)}</dt></div>`).join('')}<div><dt>금 / 군량</dt><dd>${fmt(q.gold)} / ${fmt(q.food)}</dd></div><div><dt>소요 일수</dt><dd>${q.duration}일</dd></div>${q.field?`<div><dt>개발 변화</dt><dd>${Math.round(c[q.field])} → ${Math.round(c[q.field]+q.gain)}</dd></div>`:ui.kind==='levy'?`<div><dt>징집량 / 민심</dt><dd>+${fmt(q.troops)} / ${q.gain}</dd></div>`:''}</dl><p class="note">담당 장수와 투자금을 바꾸면 예상 결과가 달라집니다.</p>`;
}
function armyPanel(a){
  const o=OFFICERS[a.officer],p=PERSONAS[a.officer];
  return `<div class="panel-heading"><h2>${o.name} 부대</h2><span>${FACTIONS[a.faction].name}</span></div><div class="army-profile">${portrait(a.officer)}<div><strong>${p.skill}</strong><small>${city(game,a.from).name} → ${city(game,a.target).name}</small></div></div><div class="army-stats"><div>병력<strong>${fmt(a.troops)}</strong></div><div>사기<strong>${Math.round(a.morale)}</strong></div><div>보급<strong>${Math.round(a.supply)}</strong></div></div><div class="army-state"><strong>${{march:'행군 중',siege:'공성 중',duel:'야전 교전',return:'철수 중'}[a.mode]}</strong><p>${STANCES[a.stance]} 방침 · ${Math.round(a.progress*100)}% 이동</p><p>${p.detail.replaceAll('돌격','돌파').replaceAll('방진','신중')}</p></div>${a.faction===game.player?`<button class="reserve-button" data-recall="${a.id}" ${game.phase!=='planning'?'disabled':''}>${a.recall?'철수 예약 취소':'다음 실행에 철수'}</button>`:''}<button class="text-button" data-action="city-view">도시 정보로 돌아가기</button>`;
}
function rosterPanel(){
  const list=game.factions[game.player].officers;
  return `<div class="panel-heading"><h2>장수 ${list.length}</h2></div><div class="roster">${list.map(id=>{const o=OFFICERS[id],p=PERSONAS[id];return `<article>${portrait(id)}<div><h3>${o.name}<small>무 ${o.war} · 지 ${o.int}</small></h3><strong>${p.skill}</strong><p>${p.detail.replaceAll('돌격','돌파').replaceAll('방진','신중')}</p><span>${freeOfficers(game).includes(id)?'배정 가능':'임무 중'} · 신뢰 ${game.trust[id]||0}</span></div></article>`;}).join('')}</div>`;
}
function storyPanel(){
  const story=storyFor(game);
  if(!story) return `<div class="panel-heading"><h2>막사의 이야기</h2></div><div class="quiet-story">${portrait(FACTIONS[game.player].officers[3])}<h3>다음 수를 기다리며</h3><p>장수들이 맡은 일을 수행하고 있습니다. 이전 결단의 소식과 점령한 도시의 이야기는 다음 계획 단계에 도착합니다.</p></div>`;
  return `<div class="panel-heading"><h2>군주의 결단</h2><span>임의 선택</span></div><div class="story-brief">${portrait(story.speaker)}<strong>${story.title}</strong><p>“${story.line}”</p></div><div class="story-options">${story.choices.map((c,i)=>`<button data-story="${i}" ${game.phase!=='planning'?'disabled':''}><strong>${c.title}</strong><small>${c.label}</small></button>`).join('')}</div><small class="note">자원과 신뢰에 영향을 줍니다. 선택하지 않고 계획해도 됩니다.</small>`;
}
function settingsPanel(){
  return `<div class="panel-heading"><h2>원정 설정</h2></div><div class="settings-copy"><h3>계획 → 30일 실행</h3><p>명령을 예약하고 실행하면 양측이 같은 시간에 움직입니다. 진행 중 일시정지와 속도 변경이 가능합니다.</p><p>같은 장수는 한 임무를 맡습니다. 도시는 한 달에 두 임무를 수행합니다.</p><h3>새 원정</h3><select id="new-faction">${['wei','shu','wu'].map(id=>`<option value="${id}" ${ui.newFaction===id?'selected':''}>${FACTIONS[id].name} · ${FACTIONS[id].ruler}</option>`).join('')}</select><button data-action="new" class="reserve-button">${ui.confirmNew?'현재 원정을 덮어쓰고 시작':'새 원정 준비'}</button><small>${ui.confirmNew?'한 번 더 누르면 새 원정을 시작합니다.':'기존 0.2 저장은 별도 키에 보존됩니다.'}</small><button data-action="logs" class="diagnostic-button">상세 진단 로그 내려받기 ↓</button><p class="note">명령·AI·수치·전투·매일의 상태를 최근 5,000건까지 저장합니다. 콘솔에서도 확인할 수 있습니다.</p></div>`;
}
function planPanel(){
  const list=game.plans.filter(o=>o.faction===game.player),n=list.length,recalls=game.armies.filter(a=>a.faction===game.player&&a.recall);
  return `<div class="panel-heading"><h2>${game.phase==='planning'?'예약 명령':'실행 명령'}</h2><span>${n} / ${limit(game)}</span></div><div class="plan-list">${list.map((o,i)=>`<article class="plan ${o.status}"><span class="plan-index">${i+1}</span><div><strong>${city(game,o.city).name} ${TYPES[o.type]} ${o.target?`→ ${city(game,o.target).name}`:''}</strong><small>${OFFICERS[o.officer].name} · ${o.quote.duration}일${o.quote.troops?` · ${fmt(o.quote.troops)}명`:o.quote.gain?` · +${o.quote.gain}`:''}</small><em>${o.status==='done'?(['march','transfer'].includes(o.type)?'출발 · 이동은 지도에서':'✓ 완료'):o.status==='failed'?'중단':game.phase==='planning'?`금 ${fmt(o.quote.gold)} · 군량 ${fmt(o.quote.food)}`:`진행 ${Math.round(o.progress*100)}%`}</em></div>${game.phase==='planning'?`<button data-cancel="${o.id}" aria-label="${city(game,o.city).name} ${TYPES[o.type]} 예약 취소">×</button>`:''}</article>`).join('')}${!n&&!recalls.length?'<div class="empty-plan"><span>令</span><strong>아직 예약한 명령이 없습니다</strong><p>도시와 장수를 골라<br>내정·행군을 계획하세요.</p></div>':''}</div><div class="plan-footer"><span>전장에 아군 ${game.armies.filter(a=>a.faction===game.player).length}개 부대</span><strong>${recalls.length?`철수 예약 ${recalls.length}개`:game.phase==='planning'?'예약은 취소 가능':'양측 동시 진행'}</strong></div>`;
}
function mapOverlay(){
  const ms=Math.round(550/speed),moving=game.phase==='execution'&&!game.paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const planned=game.plans.filter(o=>['march','transfer'].includes(o.type)&&o.status==='queued');
  let markup=`<defs>${['shu','wei','wu'].map(f=>`<marker id="arrow-${f}" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="${FACTIONS[f].color}"/></marker>`).join('')}</defs><g class="planned-routes">${planned.map(o=>{const a=city(game,o.city),b=city(game,o.target);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="${FACTIONS[o.faction].color}" marker-end="url(#arrow-${o.faction})"/>`;}).join('')}</g>`;
  if(ui.picking&&ui.target){const a=city(game,game.selected),b=city(game,ui.target);markup+=`<path class="route-preview" d="M${a.x} ${a.y}L${b.x} ${b.y}" marker-end="url(#arrow-${game.player})"/>`;}
  markup+=game.plans.filter(o=>o.status==='active'&&!['march','transfer'].includes(o.type)).map(o=>{const c=city(game,o.city);return `<g class="work-marker" transform="translate(${c.x} ${c.y})"><circle r="27"/><circle class="work-progress" r="27" stroke-dasharray="170" stroke-dashoffset="${170*(1-o.progress)}"/><text y="-35" text-anchor="middle">${TYPES[o.type]} ${Math.round(o.progress*100)}%</text></g>`;}).join('');
  markup+=game.armies.map((a,i)=>{
    const pos=armyPosition(a),prev=armyPosition(a,true),offset=a.mode==='siege'?25+(i%2)*14:0,color=FACTIONS[a.faction].color;
    return `<g class="map-army ${a.mode==='siege'||a.mode==='duel'?'fighting':''} ${ui.army===a.id?'focused':''}" data-army="${a.id}" role="button" tabindex="0" aria-label="${OFFICERS[a.officer].name} 부대, ${fmt(a.troops)}명, ${a.mode}" transform="translate(${pos.x+offset} ${pos.y})">${moving&&['march','return'].includes(a.mode)?`<animateTransform attributeName="transform" type="translate" from="${prev.x} ${prev.y}" to="${pos.x} ${pos.y}" dur="${ms}ms" fill="freeze"/>`:''}<circle class="army-hit" r="27"/><path class="army-banner" d="M-14-19H13L9-10 13-1H-14Z" fill="${color}"/><path d="M-15-23V14" stroke="${color}" stroke-width="2"/><g class="march-legs"><path d="m-8 5-4 9M0 5l3 9M8 5l5 9" stroke="${color}" stroke-width="3"/><circle cx="0" cy="-4" r="5" fill="${color}"/><path d="M-5 2H6V9H-5Z" fill="${color}"/></g><text class="army-name" y="29" text-anchor="middle">${OFFICERS[a.officer].name}</text><text class="army-count" y="44" text-anchor="middle">${(a.troops/1000).toFixed(1)}천</text>${a.recall?'<text y="-28" class="recall-tag" text-anchor="middle">철수 예약</text>':''}</g>`;
  }).join('');
  markup+=game.effects.map(e=>{
    const c=e.city?city(game,e.city):null,x=e.x??c?.x??0,y=e.y??c?.y??0;
    if(e.kind==='hit') return `<g class="combat-effect" transform="translate(${x} ${y})"><circle r="34"/><path d="m-23-23 46 46M23-23-23 23"/><text y="-42" text-anchor="middle">${e.skill?'고유기! ':''}−${fmt(e.dealt||e.taken||0)}</text></g>`;
    return `<g class="completion-effect" transform="translate(${x} ${y})"><circle r="28"/><text y="-37" text-anchor="middle">${e.kind==='capture'?'점령!':e.kind==='arrival'?'합류':`+${fmt(e.amount||0)}`}</text></g>`;
  }).join('');
  return markup;
}
function render(){
  const began=performance.now();normalize();
  const f=FACTIONS[game.player],funds=available(game),gain=income(game),execution=game.phase==='execution';
  const recent=game.events.filter(e=>e.faction===game.player||['phase','outcome','intercept'].includes(e.kind)).slice(0,3);
  const phase=game.status==='victory'?'천하 통일':game.status==='defeat'?'원정 종료':execution?game.paused?'실행 일시정지':'실행 중':'명령 계획';
  app.innerHTML=`<div class="game-shell" data-mobile="${ui.mobile}"><header class="topbar"><a class="brand" href="#">三國 <span>천명의 시대</span></a><div class="phase-badge ${execution&&!game.paused?'running':''}"><i></i>${phase}</div><div class="calendar">${game.year}년 ${game.month}월 ${execution?`${game.day}일`:''}</div><nav aria-label="보조 메뉴"><button data-view="roster" class="${ui.view==='roster'?'active':''}">장수</button><button data-view="story" class="${ui.view==='story'?'active':''}">이야기${storyFor(game)?'<i class="notification-dot"></i>':''}</button><button data-action="logs" title="명령·AI·전투·오류 진단 로그 다운로드">로그 ↓</button><button data-view="settings">설정</button></nav></header>
    <section class="resources" aria-label="핵심 자원"><div class="faction-id" style="color:${f.color}"><strong>${f.han}</strong><span>${f.ruler}</span></div><div><small>가용 금</small><strong>${fmt(funds.gold)}</strong><span>${funds.reserved.gold?`예약 ${fmt(funds.reserved.gold)}`:`월 +${fmt(gain.gold)}`}</span></div><div><small>가용 군량</small><strong>${fmt(funds.food)}</strong><span>${funds.reserved.food?`예약 ${fmt(funds.reserved.food)}`:`월 ${signed(gain.food)}`}</span></div><div><small>아군 병력</small><strong>${fmt(troops(game))}</strong></div><div><small>도시</small><strong>${owned(game).length}<em>/18</em></strong></div><div class="faction-counts">${['wei','shu','wu','neutral'].map(id=>`<span style="--faction:${FACTIONS[id].color}"><i></i>${FACTIONS[id].name} ${owned(game,id).length}</span>`).join('')}</div></section>
    <div class="mobile-switch"><button data-mobile="map" class="${ui.mobile==='map'?'selected':''}">지도</button><button data-mobile="city" class="${ui.mobile==='city'?'selected':''}">도시 / 장수</button><button data-mobile="plans" class="${ui.mobile==='plans'?'selected':''}">예약 ${game.plans.filter(o=>o.faction===game.player).length}</button></div>
    <main class="board"><aside class="left-panel"><div class="panel-tabs"><button data-view="city" class="${ui.view==='city'?'selected':''}">도시</button><button data-view="roster" class="${ui.view==='roster'?'selected':''}">장수</button><button data-view="story" class="${ui.view==='story'?'selected':''}">이야기${storyFor(game)?' ·':''}</button></div><div class="panel-content">${ui.view==='roster'?rosterPanel():ui.view==='story'?storyPanel():ui.view==='settings'?settingsPanel():ui.view==='details'?detailsPanel():ui.view==='calculation'?calculationPanel():cityPanel()}</div></aside>
    <section class="map-area" aria-label="천하 지도"><div class="map-toolbar"><span>${ui.picking?'인접한 목적지를 지도에서 선택하세요.':execution?'행군과 교전이 지도에서 진행됩니다.':'도시 선택 → 명령 예약 → 실행'}</span>${ui.picking?'<button data-action="stop-pick">선택 종료 ×</button>':'<small>도시를 누르면 명령을 배정합니다</small>'}</div><div class="map-stage">${renderMap(game,{mode:ui.picking?ui.kind==='transfer'?'transfer':'attack':null,source:game.selected,showRoutes:false}).replace('</svg>',mapOverlay()+'</svg>')}</div><div class="map-bottom"><span>출진 ${game.armies.filter(a=>a.mode==='march').length}</span><span>교전 ${game.armies.filter(a=>['siege','duel'].includes(a.mode)).length}</span><span>정비 ${game.plans.filter(o=>o.status==='active'&&!['march','transfer'].includes(o.type)).length}</span><strong>${game.status==='playing'?execution?`${game.day} / 30일`:'시간 정지':phase}</strong></div></section>
    <aside class="right-panel">${planPanel()}</aside></main>
    <section class="execution-dock"><div class="dock-top"><div class="execution-title"><strong>${execution?`${game.day}일째`:'다음 30일'}</strong><span>${execution?game.paused?'잠시 멈췄습니다':'양측 동시 실행':'명령을 정한 뒤 실행하세요'}</span></div><div class="timeline" aria-label="월 진행도"><i style="width:${game.day/30*100}%"></i><span>1</span><span>10</span><span>20</span><span>30</span></div><div class="speed-controls" aria-label="실행 속도">${[1,2,4].map(n=>`<button data-speed="${n}" class="${speed===n?'selected':''}">${n}×</button>`).join('')}</div><button class="execute-button" data-action="execute" ${game.status!=='playing'?'disabled':''}>${execution?game.paused?'계속 ▶':'일시정지 Ⅱ':'명령 실행 ▶'}</button></div>
    <div class="report-rows" aria-live="polite">${recent.length?recent.map(e=>`<div class="report ${e.kind}"><time>${e.turn===game.turn?`${e.day}일`:`지난달 ${e.day}일`}</time><p>${esc(e.text)}</p>${e.quote?`<small>${esc(e.quote)}</small>`:''}</div>`).join(''):'<div class="report idle"><time>대기</time><p>예약한 명령이 이곳에서 진행·완료 보고로 바뀝니다. 상세 로그는 로그 ↓ 에 보관합니다.</p></div>'}</div></section>
    <footer class="status-line" role="status"><span>${esc(ui.notice)}</span><small>자동 저장 · 0.3</small></footer></div>`;
  trace('ui','render',{phase:game.phase,day:game.day,view:ui.view,width:innerWidth,height:innerHeight,durationMs:Math.round((performance.now()-began)*100)/100});
}
function refreshQuote(){
  if(city(game,game.selected).owner!==game.player) return;
  let q,error;try{q=quoteOrder(game,request());error=orderError(game,request());}catch(e){error=e.message;}
  const el=document.querySelector('#quote');if(el) el.innerHTML=quotePanel(q,error);
  const value=document.querySelector('#slider-value');if(value) value.textContent=['march','transfer'].includes(ui.kind)?`${fmt(ui.amount)}명`:`금 ${fmt(ui.budget)}`;
  trace('quote','preview',{request:request(),quote:q,error});
}
function schedule(){
  clearTimeout(timer);
  if(game.phase==='execution'&&!game.paused&&game.status==='playing') timer=setTimeout(()=>{try{tick(game);ui.notice=game.phase==='planning'?game.summary:`${game.day}일 · ${game.armies.length}개 부대 이동·교전 중`;save();render();schedule();}catch(error){game.paused=true;fail(error);render();}},550/speed);
}
function fail(error){ui.notice=error.message;trace('error','action.failed',{message:error.message,stack:error.stack,phase:game.phase,day:game.day},'error');}
function chooseCity(id){
  const c=city(game,id);if(!c) return;
  if(ui.picking&&c.id!==game.selected&&city(game,game.selected).neighbors.includes(id)&&(ui.kind==='march'?c.owner!==game.player:c.owner===game.player)){ui.target=id;ui.picking=false;ui.notice=`${c.name}(으)로 향하는 명령을 예약할 수 있습니다.`;}
  else{game.selected=id;ui.army=null;ui.view='city';ui.picking=false;ui.notice=`${c.name} 선택 · ${FACTIONS[c.owner].name} 세력`;}
  ui.mobile='city';trace('input','city.selected',{id,source:game.selected,target:ui.target,picking:ui.picking});render();
}
app.addEventListener('click',e=>{
  const el=e.target.closest('button,[data-city],[data-army],a.brand');if(!el||el.disabled) return;
  const data={...el.dataset};trace('input','click',{data,phase:game.phase,day:game.day,selected:game.selected});
  try{
    if(el.matches('a.brand')){e.preventDefault();ui.view='city';ui.mobile='map';ui.army=null;}
    if(data.city) return chooseCity(data.city);
    if(data.army){ui.army=data.army;ui.view='city';ui.mobile='city';}
    if(data.view){ui.view=data.view;ui.mobile='city';ui.army=null;ui.picking=false;}
    if(data.mobile) ui.mobile=data.mobile;
    if(data.kind){ui.kind=data.kind;ui.picking=['march','transfer'].includes(data.kind);ui.officer='';normalize();}
    if(data.attack){game.selected=data.attack;ui.view='city';ui.kind='march';ui.target=data.target;ui.picking=false;ui.officer='';}
    if(data.cancel){cancelOrder(game,data.cancel);ui.notice='예약 취소 · 자원과 장수 배정을 해제했습니다.';save();}
    if(data.recall){setRecall(game,data.recall);save();}
    if(data.speed){speed=Number(data.speed);trace('animation','speed.changed',{speed});schedule();}
    if(data.story!==undefined){const result=decideStory(game,Number(data.story));ui.notice=result.after;save();}
    switch(data.action){
      case 'reserve':{const o=addOrder(game,request());ui.notice=`${city(game,o.city).name} ${TYPES[o.type]} 예약 · ${OFFICERS[o.officer].name}, ${o.quote.duration}일. 실행 전 취소할 수 있습니다.`;ui.picking=false;ui.officer='';save();break;}
      case 'execute':
        if(game.phase==='planning'){startExecution(game);ui.notice='시간이 흐릅니다. 양측 명령을 동시에 실행합니다.';ui.picking=false;}
        else{game.paused=!game.paused;ui.notice=game.paused?'일시정지 · 계속 ▶ 로 이어갑니다.':'실행 재개';trace('phase','pause.changed',{paused:game.paused,day:game.day});}
        ui.mobile='map';save();schedule();break;
      case 'pick':ui.picking=true;ui.mobile='map';ui.notice='지도에서 인접한 목적지를 고르세요.';break;
      case 'stop-pick':ui.picking=false;break;
      case 'calculation':ui.view='calculation';ui.picking=false;break;
      case 'city-view':ui.army=null;break;
      case 'new':
        if(!ui.confirmNew){ui.confirmNew=true;break;}
        clearTimeout(timer);game=newCampaign(ui.newFaction);ui.confirmNew=false;ui.view='city';ui.army=null;ui.officer='';ui.notice='새 원정 · 도시와 장수를 선택해 첫 명령을 예약하세요.';save();break;
      case 'logs':{
        trace('diagnostics','export',{entries:diagnostics().length,turn:game.turn,day:game.day});
        const url=URL.createObjectURL(new Blob([exportDiagnostics(game)],{type:'application/json'})),a=document.createElement('a');
        a.href=url;a.download=`three-kingdoms-${game.year}-${game.month}-diagnostics.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        ui.notice='상세 로그와 현재 상태를 진단 파일로 저장했습니다.';break;
      }
    }
    render();
  }catch(error){fail(error);render();}
});
app.addEventListener('change',e=>{
  const key={officer:'officer',target:'target',stance:'stance',recruit:'recruit','new-faction':'newFaction'}[e.target.id];
  if(key){ui[key]=e.target.value;trace('input','field.changed',{key,value:ui[key]});render();}
});
app.addEventListener('input',e=>{if(e.target.id==='budget'||e.target.id==='amount'){ui[e.target.id]=Number(e.target.value);refreshQuote();}});
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-city],[data-army]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.matches('input,select,button,textarea')&&game.phase==='execution'){e.preventDefault();game.paused=!game.paused;save();render();schedule();}});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{trace('ui','resize',{width:innerWidth,height:innerHeight});render();},150);});
trace('boot','ready',{version:'0.3',player:game.player,turn:game.turn,phase:game.phase,day:game.day});
render();
