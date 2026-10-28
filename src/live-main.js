import {createNewsReadState} from './news-read.js';
import {diplomacyColumns} from './diplomacy-panel.js';
import {createCampaignClient} from './campaign-client.js';
import {canSeeRegion,canSeePoint} from './fog-of-war.js';
import {armyPosition} from './realtime.js';
import {WORLD,FACTIONS,POLICIES,PROJECTS,DOCTRINES,PERSONAS,MAP_SIZES,serializeCampaign,city,officer,strongholds,governingHub,hinterland,TERRAINS,regionalYield,forecast,quote,projectError,activeProject,stationedTroops} from './realtime.js';
import {createWorldMap} from './world-map.js';
import {inspectNode} from './node-inspection.js';
import {GENERAL_ACTIONS} from './general-ai.js';
import {createAudio} from './audio.js';
import {createFeedback,collectThreats} from './feedback.js';
import {portrait} from './fantasy.js';
import {trace,diagnostics,exportDiagnostics} from './logger.js';
import {icon} from './map-art.js';
import {setHTML} from './dom.js';
import {initSelectControls,refreshSelectControls} from './select-control.js';
import {ARMY_STATES,TERRAIN_NAMES,STAT_LABELS,PROJECT_HELP,reportText,newsCategory} from './labels.js';
import {foodStock} from './realtime.js';
import {hasEconomy,hubEconomy,materialTotal} from './economy.js';
import {MATERIALS,PARTY_STATES,SITE_RULES,RESOURCE_POLICIES} from './economy-rules.js';
import {resourceOperations} from './resource-policy.js';
import {commandStatus,commandError,COMMAND_COSTS,COMMAND_RECOVERY_AMOUNT} from './command-points.js';

const DAY_MS=3000;
const app=document.querySelector('#app'),KEY='three-kingdoms-living-world-v4';
initSelectControls(app);
const fmt=n=>Math.round(n).toLocaleString('ko-KR'),signed=n=>`${n>=0?'+':'−'}${fmt(Math.abs(n))}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const simulation=createCampaignClient();
const newsRead=createNewsReadState(localStorage);
function markNewsRead(events){if(!newsRead.mark(game,events))ui.notice='읽음 상태를 저장하지 못했습니다.';}
let game,speed=1,timer=null,map=null,nextTick=0,remaining=1,noticeTimer=null,lastNotice='',saveBlocked=false,scheduleVersion=0;
const ui={diplomacyScreen:'home',diplomacyTrail:[],diplomacyOffer:null,diplomacyFocus:false,diplomacyTo:'',diplomacyType:'trade',diplomacyResource:'food',diplomacyAmount:2000,diplomacyPrice:400,diplomacyDuration:20,warTarget:'',panel:'none',view:'city',kind:'farm',budget:400,recruit:'zhaoyun',tab:'forces',news:'own',newSeed:'',newMapSize:'small',army:null,node:null,notice:'거점을 눌러 내정을 시작하세요. 드래그로 세계를 둘러볼 수 있습니다.'};
function newWorldFields(){return `<label class="field">맵 크기<select id="new-map-size" aria-describedby="map-size-help">${Object.entries(MAP_SIZES).map(([id,size])=>`<option value="${id}" ${ui.newMapSize===id?'selected':''}>${size.name}${id==='small'?' · 기본 전장':' · 넓은 변경 포함'}</option>`).join('')}</select></label><p class="note" id="map-size-help">${Object.values(MAP_SIZES).map(size=>`${size.name}: ${size.description}`).join('<br>')}<br>두 크기의 왕국과 거점 수는 같습니다.</p><label class="field">세계 번호 <input id="new-seed" type="text" inputmode="numeric" maxlength="10" placeholder="비워 두면 무작위" value="${esc(ui.newSeed)}"></label>`;}
function newWorldRequest(){
 if(ui.newSeed!==''&&(!/^\d+$/.test(ui.newSeed)||Number(ui.newSeed)>4294967295))throw new Error('세계 번호는 0부터 4294967295 사이의 정수로 입력하세요.');
 return {player:['shu','wei','wu'][Math.floor(Math.random()*3)],seed:ui.newSeed===''?Date.now():Number(ui.newSeed),mapSize:ui.newMapSize};
}
function chooseFirstWorld(){
 setHTML('app',`<main class="start-screen"><form class="start-card" id="world-setup"><small>새로운 왕국의 시작</small><h1>왕관과 대지</h1><p>맵 크기를 고르면 무작위 영주로 시작합니다.</p>${newWorldFields()}<p class="validation" id="setup-error" role="alert"></p><button type="submit" class="primary">세계 시작 →</button></form></main>`);
 return new Promise(resolve=>document.getElementById('world-setup').addEventListener('submit',e=>{
  e.preventDefault();ui.newMapSize=document.getElementById('new-map-size').value;ui.newSeed=document.getElementById('new-seed').value.trim();
  try{const request=newWorldRequest();app.textContent='세계를 준비하고 있습니다…';resolve(request);}catch(error){document.getElementById('setup-error').textContent=error.message;}
 }));
}
app.textContent='세계를 준비하고 있습니다…';
try{
 const raw=localStorage.getItem(KEY)||localStorage.getItem('three-kingdoms-orders-v3')||localStorage.getItem('three-kingdoms-mandate-v1');
 if(raw){
  const old=JSON.parse(raw);
  for(const [needed,suffix] of [[!old.generalRules,'generals'],[old.economyRules===1&&!old.kingdomRules,'kingdoms'],[!old.mapSize&&old.worldScale!==10,'large-world'],[!old.mapSize&&!old.frontier,'frontier'],[!old.landRules,'land']])if(needed&&!localStorage.getItem(KEY+'-before-'+suffix)){
   try{localStorage.setItem(KEY+'-before-'+suffix,raw);}catch(error){saveBlocked=true;trace('save','backup.failed',{message:error.message},'warn');}
  }
  await simulation.run('load',{raw});ui.notice='저장한 게임을 불러왔습니다. ▶ 계속을 누르면 시간이 흐릅니다.';
 }else await simulation.run('new',await chooseFirstWorld());
}catch(error){ui.notice='저장을 읽지 못해 새 세계를 열었습니다. 원본 저장은 보존했습니다.';trace('save','load.failed',{message:error.message,stack:error.stack},'error');await simulation.run('new',{player:'shu',seed:42});}
game=simulation.state;ui.newMapSize=game.mapSize||(game.frontier?'large':'small');await simulation.readyTerrain();simulation.onTerrain(()=>map?.invalidateTerrain());
const audio=createAudio();let feedback=createFeedback(game);
function presentFeedback(){const next=feedback.update(game);map?.setFeedback(next);if(next.sound)audio.play(next.sound);}
function audioPanel(){const p=audio.preferences;return `<div class="sound-settings"><label class="slider-label" for="music-volume">배경 음악 <b id="music-value">${p.music}%</b></label><input id="music-volume" type="range" min="0" max="100" step="5" value="${p.music}"><label class="slider-label" for="effects-volume">효과음 <b id="effects-value">${p.effects}%</b></label><input id="effects-volume" type="range" min="0" max="100" step="5" value="${p.effects}"><button data-intent="select" data-action="mute" aria-pressed="${p.muted}">${p.muted?'소리 켜기':'모든 소리 끄기'}</button></div>`;}
function threatNotices(type){const threats=collectThreats(game).filter(t=>t.type===type);if(!threats.length)return '';
 return `<section class="menu-alerts" data-alert-type="${type}" aria-label="${type==='food'?'식량 경고':'내 영지의 위협'}"><div class="watch-heading"><span aria-hidden="true">✉</span> ${type==='food'?'식량 경고':'영지 경계'} <small>${threats.length}건</small></div>${threats.map(t=>{
  const name=t.city?city(game,t.city).name:'식량';
  const detail=t.type==='invasion'?`${t.label} · 적 ${fmt(t.troops)}명`:t.city?t.label.slice(name.length+1):t.label;
  const description=detail.replace(/^식량 약 (\d+)일분$/,'식량 부족 · 약 $1일 후 고갈');
  return `<button ${t.city?`data-threat="${t.city}"`:`data-resource="food"`} class="watch-row" data-level="${t.level}" aria-label="${esc(name+' · '+description+' 위치 보기')}"><span class="watch-seal" aria-hidden="true">${t.type==='food'?'!':t.level==='danger'?'⚔':'!'}</span><span><strong>${esc(name)}</strong><small>${esc(description)}</small></span><span aria-hidden="true">↗</span></button>`;
 }).join('')}</section>`;
}
function paintFeedback(){const threats=collectThreats(game),invasion=threats.filter(t=>t.type==='invasion'),food=threats.find(t=>t.type==='food');
 for(const el of document.querySelectorAll('[data-resource=food]')){el.classList.toggle('resource-warning',!!food);if(food)el.title=food.label;}
 document.querySelector('.game-shell').dataset.danger=String(invasion.some(t=>t.level==='danger'));audio.setScene({danger:threats.length>0,isPaused:game.paused});}
function save(){if(saveBlocked){ui.notice='변환 전 저장의 백업 공간이 부족해 자동 저장을 보류했습니다. 로그 저장으로 현재 게임을 보관하세요.';return;}const began=performance.now();try{localStorage.setItem(KEY,simulation.savedAt===game.elapsed&&simulation.raw?simulation.raw:serializeCampaign(game));trace('save','written',{elapsed:game.elapsed,cities:game.cities.length,ms:Math.round((performance.now()-began)*100)/100});}catch(error){ui.notice='자동 저장 실패 · 게임 메뉴의 로그 저장으로 현재 상태를 보관하세요.';trace('save','write.failed',{message:error.message},'error');}}
function normalize(){normalizePanelPath();if(ui.node&&!canSeeRegion(game,ui.node)){ui.node=null;ui.panel='none';}if(ui.army){const a=game.armies.find(a=>a.id===ui.army);if(a&&a.faction!==game.player){const p=armyPosition(a);if(!canSeePoint(game,p.x,p.y)){ui.army=null;ui.panel='none';}}}if(!canSeeRegion(game,game.selected)){game.selected=strongholds(game,game.player)[0]?.id||game.selected;ui.panel='none';}if(!game.pool.includes(ui.recruit))ui.recruit=game.pool[0]||'';if(ui.army&&!game.armies.some(a=>a.id===ui.army)){const event=game.events.find(e=>e.army===ui.army&&['arrival','capture','defeat'].includes(e.kind));if(event)ui.notice=reportText(event.text);ui.army=null;if(ui.node){ui.view='garrison';}}}
function request(state=ui){return {city:(state.selected??game.selected),type:state.kind,budget:state.budget,recruit:state.recruit};}
function metrics(c){return `<div class="city-numbers"><div><small>인구</small><strong>${fmt(c.population/1000)}<span>천</span></strong></div><div><small title="백성들의 만족도. 높을수록 개발과 모병에 유리합니다.">민심</small><strong>${fmt(c.morale)}<span>/100</span></strong></div><div><small>주둔 병력</small><button data-intent="open" class="garrison-link" data-inspect="${c.id}" aria-label="${esc(c.name)} 주둔 부대 보기"><strong>${fmt(stationedTroops(game,c))}</strong></button></div></div>`;}
function projectCard(p){return `<article class="live-job" data-project="${p.id}"><div><strong>${city(game,p.city).name} · ${PROJECTS[p.type]}</strong><span>${p.automatic?'지휘관 판단':'내정 투자'}</span></div><div class="progress"><i style="width:${p.progress*100}%"></i></div><small>${Math.round(p.progress*100)}% · ${Math.max(0,Math.ceil(p.duration*(1-p.progress)-1e-8))}일 남음</small><button data-intent="danger" data-cancel="${p.id}" title="남은 투자금의 60% 반환" aria-label="${city(game,p.city).name} 명령 중단">중단</button></article>`;}
function quotePanel(state=ui){let q,error;try{q=quote(game,request(state));error=projectError(game,request(state));}catch(e){error=e.message;}
 const c=city(game,(state.selected??game.selected)),result=!q?'명령을 선택하세요':state.kind==='hire'?`${officer(game,state.recruit).name} 등용`:state.kind==='levy'?`모병 +${fmt(q.troops)}명`:`${STAT_LABELS[q.field]} ${fmt(c[q.field])} → ${fmt(c[q.field]+q.gain)}`;
 return `<div class="order-preview"><small class="order-stage">실행할 명령</small><div><strong>${result}</strong><span>${q?.duration||'—'}일</span></div><p>금 ${q?fmt(q.gold):'—'} · 식량 ${q?fmt(q.food):'—'} <button data-intent="open" class="text-button" data-view="calculation">상세</button></p></div><button data-intent="execute" class="primary" data-action="invest" ${error?'disabled':''}>${PROJECTS[state.kind]} 시작</button><div class="validation" role="status">${esc(error||'')}</div>`;
}
function localStock(c){
 if(!hasEconomy(game)||!c.major||c.owner!==game.player)return '';
 const h=game.economy.hubs[c.id];
 return `<section class="local-stock" data-stock-hub="${c.id}" aria-label="${esc(c.name)} 현지 재고"><h3>현지 재고</h3><dl>${Object.entries(MATERIALS).map(([key,m])=>`<div data-stock-material="${key}"><dt>${icon(key)}${m.name}</dt><dd>${fmt(h.stock[key])}</dd></div>`).join('')}</dl></section>`;
}
function cityPanel(state=ui){const c=city(game,(state.selected??game.selected)),f=FACTIONS[c.owner],p=activeProject(game,c.id),mine=c.owner===game.player;
 return `<div class="city-title"><span class="city-stamp" style="color:${f.color}">${f.han}</span><div><small>${c.region} · ${TERRAIN_NAMES[c.terrain]||c.terrain}</small><h2>${c.name}</h2></div><button data-intent="open" class="text-button" data-view="details">거점 정보</button></div>${metrics(c)}${localStock(c)}${hasEconomy(game)?'<button data-intent="open" class="primary" data-view="economy">자원 운영</button>':''}${mine?`<label class="field">거점 정책<select id="policy">${Object.entries(POLICIES).map(([id,p])=>`<option value="${id}" ${c.policy===id?'selected':''}>${p.name} · ${p.description}</option>`).join('')}</select></label>${p?`${projectCard(p)}<p class="note">이 거점의 명령을 진행하고 있습니다.<br>다른 거점에도 명령을 내릴 수 있습니다.</p>`:`<div class="order-caption"><strong>명령 선택</strong><small>선택 후 아래에서 실행</small></div><div class="order-types" aria-label="국정 명령">${['farm','market','fort','relief','levy'].map(id=>`<button data-intent="select" data-kind="${id}" title="${PROJECT_HELP[id]}" class="${state.kind===id?'selected':''}" aria-pressed="${state.kind===id}">${icon(id)}<span>${PROJECTS[id]}</span></button>`).join('')}</div><label class="slider-label" for="budget">투자금 <b id="budget-value">금 ${fmt(state.budget)}</b></label><input id="budget" type="range" min="150" max="1200" step="50" value="${state.budget}"><div id="quote">${quotePanel(state)}</div>`}`:`<div class="foreign-city"><strong>${f.ruler}의 영지</strong><p>아군 지휘관들이 전선과 보급을 살피며 진격을 준비합니다.</p><button data-intent="locate" data-action="territory">내 영지로 이동</button></div>`}`;
}
function commandsPanel(state=ui){
 const status=commandStatus(game);if(!status)return cityPanel(state);
 const names={...PROJECTS,policy:'거점 정책 변경',doctrine:'군사 방침 변경',economy:'자원 운영 방침 변경'};
 return `<div class="panel-heading"><h2>왕국 행동력</h2><strong>${status.points} / ${status.max}</strong></div><p class="note">${status.recoveryIn===null?'행동력이 가득 찼습니다.':`게임 속 ${status.recoveryIn}일 뒤 ${COMMAND_RECOVERY_AMOUNT} 회복합니다.`} 매일 ${COMMAND_RECOVERY_AMOUNT}씩 회복하며, 일시정지 동안에는 회복하지 않습니다.</p><dl class="detail-list">${Object.entries(COMMAND_COSTS).filter(([key])=>key!=='gather').map(([key,cost])=>`<div><dt>${names[key]}</dt><dd>${cost}</dd></div>`).join('')}</dl><p class="note">명령이 성공했을 때 한 번 사용합니다. 방침에 따른 작업대 운영과 지휘관의 자율 이동·자동 모병에는 추가로 쓰지 않습니다. 취소·귀환과 정보 조회는 무료이며, 사용한 행동력은 취소해도 돌아오지 않습니다.</p>`;
}
function economyPanel(state=ui){
 const c=city(game,(state.selected??game.selected));if(!hasEconomy(game)||!c.major)return cityPanel(state);
 const plan=resourceOperations(game,c.id),h=plan.q.hub,mine=c.owner===game.player,error=commandError(game,COMMAND_COSTS.economy),workers=plan.parties.filter(p=>p.owner===c.owner).length*100;
 return `<section class="resource-policy-panel"><p class="government-scope">${esc(c.name)}</p><div class="panel-heading"><h2>자원 운영</h2></div><p class="resource-policy-intro">무엇을 비축할지 정하면 거점이 작업대를 자동으로 배정합니다.</p><div class="resource-summary"><div><small>식량 비축</small><strong>${fmt(plan.foodDays)}<span>일분</span></strong></div><div><small>목재</small><strong>${fmt(h.stock.timber)}</strong></div><div><small>운영 인력</small><strong>${fmt(workers)}<span>명</span></strong></div></div><div class="order-caption"><strong>운영 방침</strong></div><div class="resource-policy-choices" aria-label="거점 자원 운영 방침">${Object.entries(RESOURCE_POLICIES).map(([id,p])=>`<button data-intent="select" data-resource-policy="${id}" aria-pressed="${plan.policy===id}" ${!mine||error&&plan.policy!==id?'disabled':''}><strong>${p.name}</strong><small>${p.description}</small></button>`).join('')}</div>${mine&&error?`<p class="validation" role="status">${esc(error)}</p>`:''}<div class="resource-operation-status" role="status"><strong>${plan.rule.name}</strong><p>${esc(plan.reason)}</p></div><button data-intent="open" class="text-button" data-view="economy-details">자원·작업 현황 자세히</button></section>`;
}
function economyDetailsPanel(state=ui){
 const c=city(game,(state.selected??game.selected));if(!hasEconomy(game)||!c.major)return cityPanel(state);
 const plan=resourceOperations(game,c.id),q=plan.q,h=q.hub,parties=game.economy.parties.filter(p=>p.owner===c.owner&&p.homeHub===c.id&&p.phase!=='done'),sites=game.economy.sites.filter(v=>governingHub(game,v.region)?.id===c.id);
 return `<div class="panel-heading"><h2>자원 현황</h2></div><p class="note">${esc(c.name)}의 비축과 작업 상황입니다. 식량 일수는 현재 주민·수비병 소비량을 기준으로 합니다.</p><dl class="detail-list">${Object.entries(MATERIALS).map(([key,v])=>`<div><dt>${v.name}</dt><dd>${fmt(h.stock[key])}</dd></div>`).join('')}<div><dt>식량 비축 목표</dt><dd>${plan.rule.foodDays}일분</dd></div><div><dt>목재 비축 목표</dt><dd>${fmt(plan.targets.timber)}</dd></div><div><dt>식량 생산 / 소비</dt><dd>${fmt(q.production)} / ${fmt(q.foodDemand)} · 하루</dd></div><div><dt>최근 식량 정산</dt><dd>${signed(h.lastFlow.food)} / 일</dd></div><div><dt>가용 노동</dt><dd>${fmt(q.laborAvailable)}명</dd></div></dl><h3>관할 자원지</h3><div class="economy-sites">${sites.map(v=>`<article><strong>${SITE_RULES[v.kind].name} · ${esc(city(game,v.region).name)}</strong><small>남은 자원 ${fmt(v.stock)} · 풍요 ${v.richness.toFixed(1)}</small><button data-intent="locate" class="text-button" data-focus-site="${v.region}">지도에서 보기</button></article>`).join('')||'<p class="note">관할에 확인된 자원지가 없습니다.</p>'}</div><h3>활동 작업대</h3>${parties.map(p=>`<article class="economy-party"><strong>${PARTY_STATES[p.phase]} · ${SITE_RULES[game.economy.sites.find(v=>v.id===p.siteId).kind].name}</strong><small>${Object.entries(p.cargo).filter(([,n])=>n>.01).map(([k,n])=>`${MATERIALS[k].name} ${fmt(n)}`).join(' · ')||'적재물 없음'}</small>${p.reason?`<small>${esc(p.reason)}</small>`:''}</article>`).join('')||'<p class="note">활동 중인 작업대가 없습니다.</p>'}`;
}
function detailsPanel(state=ui){const c=city(game,(state.selected??game.selected)),lands=hinterland(game,c),income=regionalYield(game,c),counts={};for(const t of lands)counts[TERRAIN_NAMES[t.terrain]]=(counts[TERRAIN_NAMES[t.terrain]]||0)+1;
 return `<div class="panel-heading"><h2>${c.name} 상세</h2></div>${localStock(c)}<dl class="detail-list">${[['인구 / 모병 가능',`${fmt(c.population)} / ${fmt(c.reserve)}`],['농업 / 상업',`${fmt(c.agriculture)} / ${fmt(c.commerce)}`],['방어 / 훈련',`${fmt(c.defense)} / ${fmt(c.training)}`],['민심 / 모병 피로',`${fmt(c.morale)} / ${fmt(c.weariness)}`],['자동 관리하는 땅',Object.entries(counts).map(([name,n])=>`${name} ${n}`).join(' · ')||'없음'],['거점과 주변 땅의 금',`${signed(income.gold)} / 일`],['거점과 주변 땅의 식량',`${signed(income.food)} / 일`]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><p class="note">거점의 농업·상업과 정책이 주변 땅에도 적용됩니다. 지형에 따라 생산과 이동·방어 효과가 달라집니다. 이동 중인 부대의 식량은 별도로 소비합니다.</p>`;}
function calculationPanel(state=ui){let q;try{q=quote(game,request(state));}catch(e){return `<p>${esc(e.message)}</p>`;}return `<div class="panel-heading"><h2>${PROJECTS[state.kind]} 계산</h2></div><dl class="detail-list">${q.notes.map(n=>`<div><dt>${esc(n)}</dt></div>`).join('')}<div><dt>금 / 식량</dt><dd>${fmt(q.gold)} / ${fmt(q.food)}</dd></div><div><dt>소요 시간</dt><dd>${q.duration}일</dd></div><div><dt>반영 방식</dt><dd>매일 점진적으로 반영</dd></div></dl>`;}
function armyPanel(a){const o=officer(game,a.officer),p=PERSONAS[a.officer];return `<div class="panel-heading"><h2>${o.name}</h2></div><div class="army-profile">${portrait(a.officer)}<div><strong>${FACTIONS[a.faction].name} · ${o.role}</strong><small>무력 ${o.war} · 지력 ${o.int}</small><small>${p?.skill||'변경의 수호자'}</small><small>${Object.entries({aggression:'공세',caution:'신중',cooperation:'협동'}).map(([key,label])=>label+' '+((o.traits?.[key]??.5)>.66?'높음':(o.traits?.[key]??.5)<.34?'낮음':'보통')).join(' · ')}</small></div></div><div class="army-stats"><div>병력<strong>${fmt(a.troops)}</strong></div><div>사기<strong>${fmt(a.morale)}</strong></div><div>보급<strong>${fmt(a.supply)}%</strong></div></div><div class="army-state"><strong>${a.mode==='stationed'?(GENERAL_ACTIONS[a.order?.action]||ARMY_STATES[a.mode]):ARMY_STATES[a.mode]} · ${city(game,a.target).name}</strong><p>${esc(reportText(a.reason))}</p>${p?`<p class="character-voice">“${p.voice}”</p>`:''}</div><button data-intent="locate" data-focus-army="${a.id}" class="primary">지도에서 부대 보기</button>`;}
function nodeStateIcon(row){
 const paths={defend:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z',attack:'m5 3 15 15m-3-1 4 4m-6-2 4-4M19 3 4 18m3-1-4 4m6-2-4-4',watch:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',food:'M12 21V4m0 5C5 9 5 3 5 3s7 0 7 6Zm0 6c-7 0-7-6-7-6s7 0 7 6Zm0-6c7 0 7-6 7-6s-7 0-7 6Zm0 6c7 0 7-6 7-6s-7 0-7 6Z',gather:'M5 3h14M5 21h14M7 3v5l10 8v5M17 3v5L7 16v5',recover:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',support:'M4 21V3m0 1h15l-3 5 3 5H4',advance:'m5 12h14m-7-7 7 7-7 7',incoming:'M4 4v16m16-8H8m6-6-6 6 6 6',outgoing:'M20 4v16M4 12h12m-6-6 6 6-6 6',withdraw:'M5 5v7h7M5 12l5-5c7-7 15 7 6 12',empty:'M4 4l16 16M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z'};
 const description=[row.state||row.label,reportText(row.reason||row.detail)].filter(Boolean).join(' — ');
 return `<button type="button" class="node-state-icon" data-state="${esc(row.icon)}" data-node-tooltip="${esc(description)}" aria-label="${esc(description)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[row.icon]||paths.gather}"/></svg></button>`;
}
function garrisonPanel(state=ui){
 const n=inspectNode(game,state.node),c=n.city,f=FACTIONS[c.owner];
 const rows=list=>list.map(row=>`<article class="node-unit"><div class="node-unit-title">${row.army?`<button data-intent="open" class="node-unit-open" data-army="${esc(row.army)}"><strong>${esc(row.title)}</strong></button>`:`<strong>${esc(row.title)}</strong>`}<b>${fmt(row.troops)}명</b>${nodeStateIcon(row)}</div><p class="node-unit-meta"><span style="color:${FACTIONS[row.faction].color}">${FACTIONS[row.faction].name}</span>${row.days!==undefined&&row.days!==null?(row.days===0?' · 도착 임박':' · 도착까지 약 '+row.days+'일'):''} · ${esc(row.detail)}</p></article>`).join('');
 return `<section class="node-inspection"><div class="node-heading"><small>${f.name} · ${TERRAINS[c.terrain].name}</small><h2 title="${esc(c.name)}">${esc(c.name)}</h2></div>${localStock(c)}<div class="node-totals"><span>주둔 병력<strong>${fmt(stationedTroops(game,c))}명</strong></span></div><section class="node-group"><h3>주둔 중 <small>${n.present.length}</small></h3>${rows(n.present)||'<p class="node-empty">주둔 중인 병력이 없습니다.</p>'}</section><section class="node-group"><h3>이동 중 <small>${n.movement.length}</small></h3>${rows(n.movement)||'<p class="node-empty">오가고 있는 부대가 없습니다.</p>'}</section>${c.major?`<button data-intent="open" class="text-button node-admin" data-node-admin="${c.id}">거점 내정</button>`:''}</section>`;
}
function rosterPanel(){const list=game.factions[game.player].officers;return `<div class="panel-heading"><h2>지휘관 ${list.length}명</h2><button data-intent="open" class="text-button" data-view="hire">지휘관 등용</button></div><div class="roster">${list.map(id=>{const o=officer(game,id),a=game.armies.find(a=>a.officer===id);return `<article>${portrait(id)}<div><h3>${o.name}<small>무력 ${o.war} · 지력 ${o.int}</small></h3><span>${a?`${city(game,a.target).name} ${ARMY_STATES[a.mode]}`:`${city(game,o.location)?.name||'위치 확인 중'} · 출진 대기`}</span></div></article>`;}).join('')}</div>`;}
function hirePanel(state=ui){const c=city(game,(state.selected??game.selected));return `<div class="panel-heading"><h2>지휘관 등용</h2></div><p class="note">${c.name}에서 등용합니다. 합류한 지휘관은 이 거점에서 부대를 편성합니다.</p><label class="field">등용할 지휘관<select id="recruit">${game.pool.map(id=>`<option value="${id}" ${state.recruit===id?'selected':''}>${officer(game,id).name}</option>`).join('')}</select></label>${state.recruit?`<div class="hire-profile">${portrait(state.recruit)}</div>`:''}<div id="quote">${quotePanel(state)}</div>`;}
function settingsPanel(){return `<div class="panel-heading"><h2>게임 메뉴</h2></div><p class="note settings-intro">왕관과 대지</p><nav class="settings-menu" aria-label="설정 항목">${[['new-game','새 게임','지도 크기와 세계 번호'],['sound','사운드','음악 · 효과음 · 음소거'],['language','언어','화면에 표시할 언어']].map(([view,title,description])=>`<button class="settings-choice" data-intent="open" data-view="${view}"><strong>${title}</strong><small>${description}</small></button>`).join('')}</nav><div class="settings-secondary"><button class="text-button" data-intent="open" data-view="game-guide">게임 안내</button><p class="note">진행 상황은 자동으로 저장됩니다.</p></div>`;}
function newGamePanel(){return `<div class="panel-heading"><h2>새 게임</h2></div><p class="note">새로 시작할 세계를 설정하세요. 영주는 무작위로 정해집니다.</p>${newWorldFields()}<button class="primary" data-intent="open" data-action="review-new">시작 설정 확인</button>`;}
function newGameReviewPanel(){return `<div class="panel-heading"><h2>새 게임 시작 확인</h2></div><dl class="detail-list"><div><dt>지도 크기</dt><dd>${MAP_SIZES[ui.newMapSize].name}</dd></div><div><dt>세계 번호</dt><dd>${esc(ui.newSeed||'무작위')}</dd></div><div><dt>영주</dt><dd>무작위</dd></div></dl><p class="note">새 게임을 시작하면 현재 진행이 새 세계로 바뀝니다.</p><button class="primary" data-intent="danger" data-action="new">새 게임 시작</button>`;}
function soundPanel(){return `<div class="panel-heading"><h2>사운드</h2></div>${audioPanel()}`;}
function languagePanel(){return `<div class="panel-heading"><h2>언어</h2></div><div class="language-current"><strong>한국어</strong><span>✓ 사용 중</span></div><p class="note">현재 게임은 한국어를 지원합니다.<br>다른 언어는 아직 지원하지 않습니다.</p>`;}
function gameGuidePanel(){return `<div class="panel-heading"><h2>게임 안내</h2></div><div class="settings-copy"><h3>내정과 자율 전쟁</h3><p>거점에서 내정을 합니다. 주변 땅은 자동으로 관리됩니다. 기본 속도에서는 3초에 하루가 흐릅니다. 지휘관들이 전쟁과 식량 거래를 자동으로 판단합니다. 지도는 드래그로 이동하고 휠로 확대합니다. 새 세계를 만들 때 맵 크기를 선택할 수 있습니다. 내 영지와 맞닿은 주변 영지는 보이며, 아군 부대가 이동하면 시야가 열립니다. 탐사 후 시야를 벗어난 땅은 어둡게 남습니다.</p><h3>현재 세계</h3><p class="note">${MAP_SIZES[game.mapSize||(game.frontier?'large':'small')].name} · 세계 번호 ${game.worldSeed}</p><button data-action="logs">로그 저장 ↓</button></div>`;}

function newsItems(){return (ui.news==='own'?game.reports:game.events).filter(e=>{const age=Number.isFinite(e.at)?game.elapsed-e.at:((game.year-e.year)*12+game.month-e.month)*30+game.day-e.day;return age<30&&(e.faction===game.player||e.other===game.player||(e.city?canSeeRegion(game,e.city):Number.isFinite(e.x)&&Number.isFinite(e.y)?canSeePoint(game,e.x,e.y):['world','calendar','outcome'].includes(e.kind)))&&e.kind!=='project'&&(e.kind!=='capture'||city(game,e.city)?.major);});}
function newsPanel(){
 const rows=newsItems(),unread=rows.filter(e=>!newsRead.has(game,e)).length;
 return `<section class="news-panel"><div class="panel-heading"><h2>전령의 소식</h2><span>안 읽음 ${unread} / ${rows.length}건</span></div><p class="note news-retention">최근 게임 시간 30일의 소식만 표시합니다.</p><button class="news-read-all" data-read-all ${unread?'':'disabled'}>모두 읽음으로 표시</button><div class="right-tabs" aria-label="소식 범위"><button data-intent="select" data-news="own" class="${ui.news==='own'?'selected':''}" aria-pressed="${ui.news==='own'}">아군 소식</button><button data-intent="select" data-news="world" class="${ui.news==='world'?'selected':''}" aria-pressed="${ui.news==='world'}">세계 소식</button></div><div class="news-list">${rows.map(e=>{const category=newsCategory(e,game.player),read=newsRead.has(game,e);return `<article class="news-report" data-read="${read}" data-kind="${esc(e.kind)}"><span class="news-category-icon" aria-hidden="true">${category.icon}</span><div class="news-report-content"><div class="news-report-meta"><strong class="news-category">${category.label}</strong><span class="news-read-status">${read?'읽음':'안 읽음'}</span><time>${e.year}년 ${e.month}월 ${e.day}일</time></div><p>${esc(reportText(e.text))}</p><button class="text-button news-read-toggle" data-read-news="${e.id}" ${read?'disabled':''}>${read?'✓ 읽음':'읽음으로 표시'}</button>${e.city?`<button data-read-location="${e.id}" data-intent="locate" data-focus="${e.city}" class="text-button" aria-label="${esc(reportText(e.text))} 위치 보기">위치 보기</button>`:''}</div></article>`;}).join('')||'<p class="quiet-news">최근 30일 동안 표시할 소식이 없습니다.</p>'}</div></section>`;
}
function resourcesPanel(state=ui){
 if(['timber','goods'].includes(state.view)){
  const key=state.view,label=MATERIALS[key].name,hubs=hasEconomy(game)?strongholds(game,game.player):[];
  return `<div class="panel-heading"><h2>${label} 보관 현황</h2><span>왕국 합계 ${fmt(materialTotal(game,key))}</span></div><p class="note">각 거점의 창고에 보관된 물자입니다. 운반 중인 물자는 도착 후 재고에 포함됩니다.</p><div class="material-stocks">${hubs.map(c=>`<article data-material-hub="${c.id}"><div><strong>${esc(c.name)}</strong><b>${fmt(game.economy.hubs[c.id].stock[key])}</b></div><button data-intent="locate" class="text-button" data-focus-site="${c.id}">${esc(c.name)} 지도에서 보기</button></article>`).join('')||'<p class="note">보유한 거점이 없습니다.</p>'}</div>`;
 }

 const key=state.view,label=key==='gold'?'금':'식량',f=game.factions[game.player],gain=forecast(game)[key],rows=(game.resourceLog||[]).filter(e=>Math.abs(e[key])>=.5);
 return `<div class="panel-heading"><h2>${label} 변동 내역</h2><span>현재 ${fmt(key==='food'?foodStock(game):f[key])}</span></div><div class="resource-forecast"><span>정기 변화 예상</span><strong class="${gain<0?'negative':''}">${signed(gain)} / 일</strong></div><p class="note">매일 수입과 소비를 정산합니다.<br>모병·이동·거래가 추가로 반영됩니다.</p><div class="resource-history">${rows.map(e=>`<article><div><time>${e.month}/${e.day}</time><span>${esc(e.reason)}</span></div><strong class="${e[key]<0?'negative':''}">${signed(e[key])}</strong></article>`).join('')||'<p class="note">다음 자원 변화부터 기록합니다.</p>'}</div>`;
}
function leftPanel(state=ui){if(state.view==='garrison'&&state.node)return garrisonPanel(state);if(state.army){const a=game.armies.find(a=>a.id===state.army);if(a)return armyPanel(a);}return ({diplomacy:()=>diplomacyColumns(game,state),commands:commandsPanel,economy:economyPanel,'economy-details':economyDetailsPanel,news:newsPanel,gold:resourcesPanel,food:resourcesPanel,timber:resourcesPanel,goods:resourcesPanel,details:detailsPanel,calculation:calculationPanel,roster:rosterPanel,hire:hirePanel,settings:settingsPanel,'new-game':newGamePanel,'new-game-review':newGameReviewPanel,sound:soundPanel,language:languagePanel,'game-guide':gameGuidePanel}[state.view]||cityPanel)(state);}
function rightPanel(state=ui){const f=game.factions[game.player];let rows=[];
 if(state.tab==='projects')rows=game.projects.filter(p=>p.faction===game.player).map(p=>projectCard(p));
 else rows=game.armies.filter(a=>a.faction===game.player).map(a=>`<button data-intent="open" class="army-row" data-army="${a.id}"><span class="small-seal">${icon('forces')}</span><div><strong>${officer(game,a.officer).name}<em>${fmt(a.troops)}명</em></strong><small>${city(game,a.target).name} · ${ARMY_STATES[a.mode]}</small><p>${esc(reportText(a.reason))}</p></div></button>`);
 if(state.tab==='forces')rows.push(...game.cities.filter(c=>!c.major&&c.owner===game.player&&c.soldiers>=.5).map(c=>`<button data-intent="open" class="army-row" data-inspect="${c.id}"><span class="small-seal">⚑</span><div><strong>합류 대기<em>${fmt(c.soldiers)}명</em></strong><small>${c.name}</small><p>지휘관 부대와 현지에서 합류합니다.</p></div></button>`));
 return `<div class="panel-heading"><h2>${{forces:'군사 방침',projects:'진행 현황'}[state.tab]}</h2>${state.tab==='forces'?'':`<span>${rows.length}건</span>`}</div>${state.tab==='forces'?`<div class="field"><select id="doctrine" aria-label="군사 방침">${Object.entries(DOCTRINES).map(([id,d])=>`<option value="${id}" ${f.doctrine===id?'selected':''}>${d.name}</option>`).join('')}</select></div>`:''}<div class="activity-list">${rows.join('')||`<div class="empty-state">${state.tab==='forces'?'지휘관들이 전선과 보급을 검토하고 있습니다.':'진행 중인 명령이 없습니다. 거점에서 새 명령을 내리세요.'}</div>`}</div>${state.tab==='forces'?`<p class="commander-note">${esc(reportText(f.reason))}</p>`:''}`;
}
const panelKeys=['panel','view','kind','budget','recruit','tab','army','node','news'];
let panelTrail=[],panelFocus=false;
function panelState(){return {...Object.fromEntries(panelKeys.map(key=>[key,ui[key]])),selected:game.selected};}
function restorePanel(state){for(const key of panelKeys)ui[key]=state[key];game.selected=state.selected;}
function panelIdentity(state){return state.panel==='right'?state.tab:state.army?'army:'+state.army:state.node?'garrison:'+state.node:state.view+':'+state.selected;}
function noticeRoute(state=panelState()){return state.panel==='left'&&state.view==='diplomacy'?'diplomacy:'+ui.diplomacyScreen:panelIdentity(state);}
function menuNotice(state){return ui.menuNotice?.route===noticeRoute(state)?`<p class="menu-notice" role="status">${esc(ui.menuNotice.text)}</p>`:'';}
function navigatePanel(patch,nested=false){
 const current=panelState(),next={...current,...patch},path=nested&&ui.panel!=='none'?[...panelTrail,current]:[];
 const existing=path.findIndex(state=>panelIdentity(state)===panelIdentity(next));
 panelTrail=existing<0?path:path.slice(0,existing);restorePanel(existing<0?next:path[existing]);panelFocus=true;
}
function normalizePanelPath(){
 if(ui.panel==='none'||ui.view==='diplomacy')return;
 const path=[...panelTrail,panelState()],invalid=path.findIndex(state=>{
  if(!canSeeRegion(game,state.selected)||state.node&&!canSeeRegion(game,state.node))return true;
  if(!state.army)return false;
  const army=game.armies.find(a=>a.id===state.army);if(!army)return true;
  const position=armyPosition(army);return army.faction!==game.player&&!canSeePoint(game,position.x,position.y);
 });
 if(invalid<0)return;
 panelTrail=path.slice(0,invalid);
 if(panelTrail.length)restorePanel(panelTrail.pop());else{ui.panel='none';ui.army=null;ui.node=null;}
 panelFocus=true;
}
function activatePanelColumn(target){
 const column=target.closest('[data-menu-column],[data-panel-source]');if(!column)return false;
 const index=Number(column.dataset.menuColumn??column.dataset.panelSource);if(index===panelTrail.length)return false;
 restorePanel(panelTrail[index]);panelTrail=panelTrail.slice(0,index);return true;
}
function panelTitle(state){return state.panel==='right'?{forces:'군사',projects:'진행 현황'}[state.tab]:state.army?'부대 상세':({city:'국정',details:'거점 정보',economy:'자원 운영','economy-details':'자원 현황',calculation:'투자 상세',roster:'지휘관',hire:'지휘관 등용',garrison:'주둔지',commands:'행동력',gold:'금 변동 내역',food:'식량 변동 내역',timber:'목재 보관 현황',goods:'생활용품 보관 현황',news:'소식',settings:'게임 메뉴','new-game':'새 게임','new-game-review':'시작 확인',sound:'사운드',language:'언어','game-guide':'게임 안내'}[state.view]||'정보');}
function menuColumns(){
 const path=[...panelTrail,panelState()];
 return `<div class="menu-columns" aria-label="메뉴 창 · 가로로 이동">${path.map((state,index)=>{
  let content=state.panel==='right'?rightPanel(state):leftPanel(state);
  if(state.panel==='left'&&state.view==='city'&&!state.army)content+='<button data-intent="open" class="text-button" data-tab="projects">진행 중인 일</button>';
  return `<section class="menu-column" data-menu-column="${index}" data-menu-route="${esc(panelIdentity(state))}" aria-label="${panelTitle(state)}"><header class="drawer-bar"><span>${panelTitle(state)}</span><button data-close-column="${index}" aria-label="${panelTitle(state)} 창 닫기">×</button></header><div class="menu-column-body">${content}</div></section>`;
 }).join('')}</div>`;
}
function mount(){app.innerHTML=`<div class="game-shell" data-panel="${ui.panel}"><main class="map-area"><div class="map-stage"><canvas id="world-map" tabindex="0" aria-label="세계 지도. 거점을 클릭해 내정, 드래그와 방향키로 이동, 휠로 확대합니다."></canvas><div class="map-vignette"></div><div class="map-calligraphy" aria-hidden="true">왕관과 대지<small>CROWN &amp; EARTH</small></div></div></main><header class="topbar"><section id="resources" class="resources" aria-label="왕국 자원 합계와 소식"></section><nav class="command-dock" aria-label="영주 명령">${[['city','국정'],['roster','지휘관'],['diplomacy','외교'],['forces','군사']].map(([id,label])=>`<button data-intent="open" ${['city','roster','diplomacy'].includes(id)?`data-view="${id}"`:`data-tab="${id}"`} data-command="${id}">${id==='diplomacy'?'<img class="game-icon diplomacy-icon" src="assets/art/ui/hud/diplomacy-icon.webp" alt="" aria-hidden="true" width="64" height="64">':icon(id)}<span class="command-label">${label}<i class="menu-open-cue" aria-hidden="true">›</i>${id==='diplomacy'?'<b id="diplomacy-badge"></b>':''}</span></button>`).join('')}</nav><section class="time-hud" aria-label="시간 조작"><div id="date" class="calendar"></div><div class="time-actions"><button id="pause" class="execute-button" data-action="pause"></button><div class="speed-controls">${[.5,1,2,4].map(n=>`<button data-speed="${n}" aria-label="${n}배속">${n}×</button>`).join('')}</div></div></section><button data-intent="open" class="menu-button" data-view="settings" data-toggle="true" aria-controls="left" aria-expanded="false" aria-label="게임 메뉴">⚙</button></header><section id="diplomacy-alert" class="diplomacy-alert" aria-label="응답을 기다리는 외교 요청" aria-live="polite" hidden></section><section id="threat-watch" class="threat-watch" aria-label="내 영지의 위협" hidden></section><aside class="left-panel context-panel" aria-label="메뉴와 상세 정보"><div id="left" class="panel-content"></div></aside><div id="region-dock" class="region-dock" hidden></div><div id="node-tooltip" class="node-tooltip" role="tooltip" hidden></div><button class="world-overview" data-action="overview" aria-label="전체 지도 보기"><canvas id="world-overview-canvas" width="144" height="104" aria-hidden="true"></canvas><span>전체 지도</span></button><footer class="status-line" role="status"><span id="notice"></span></footer></div>`;
 map?.destroy();map=createWorldMap(document.querySelector('#world-map'),game,selectCity,selectArmy,selectLand,document.querySelector('#world-overview-canvas'));map.setSpeed(DAY_MS/speed);feedback=createFeedback(game);presentFeedback();remaining=1;nextTick=performance.now()+DAY_MS/speed;paint(true);schedule();}
let previousDiplomacyOffers=new Set();
function paintDiplomacyRequests(){
 const pending=(game.diplomacy?.offers||[]).filter(o=>o.to===game.player&&o.status==='pending'&&o.expires>game.elapsed),badge=document.getElementById('diplomacy-badge'),button=document.querySelector('[data-command="diplomacy"]');
 if(pending.some(o=>!previousDiplomacyOffers.has(o.id)))audio.play('complete');previousDiplomacyOffers=new Set(pending.map(o=>o.id));
 badge.textContent=pending.length?String(pending.length):'';badge.hidden=!pending.length;button.classList.toggle('awaiting-response',!!pending.length);button.setAttribute('aria-label',pending.length?`외교 · 응답할 요청 ${pending.length}건`:'외교');
}
function paint(force=false){normalize();paintDiplomacyRequests();const began=performance.now(),f=game.factions[game.player],command=commandStatus(game);
 if(ui.notice!==lastNotice){lastNotice=ui.notice;ui.menuNotice=ui.panel==='none'?null:{route:noticeRoute(),text:ui.notice};clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{ui.menuNotice=null;paint();},6000);}
 setHTML('resources',`<button data-intent="locate" class="faction-id" data-action="territory" title="${esc(f.name)} · 내 영지로 이동" aria-label="${esc(f.name)} · 내 영지로 이동" style="--faction:${FACTIONS[game.player].color}"><strong>${FACTIONS[game.player].han}</strong><span>${f.name}<small class="resource-scope">왕국 합계</small></span></button>${[['gold','금'],...Object.entries(MATERIALS).map(([id,m])=>[id,m.name])].map(([id,name])=>{const total=id==='gold'?f.gold:materialTotal(game,id);return `<button data-intent="open" data-resource="${id}" aria-controls="left" aria-label="${name} 왕국 합계 ${fmt(total)}, ${id==='gold'||id==='food'?'변동 내역':'거점별 보관 현황'}"><small>${icon(id)}${name}</small><strong>${fmt(total)}</strong></button>`;}).join('')}${command?`<button data-intent="open" class="command-meter" data-view="commands" data-empty="${command.points===0}" title="${command.recoveryIn===null?'행동력이 가득 찼습니다':`${command.recoveryIn}일 뒤 ${COMMAND_RECOVERY_AMOUNT} 회복`}" aria-label="왕국 행동력 ${command.points}/${command.max}"><small>행동력</small><strong>${command.points}<span>/${command.max}</span></strong></button>`:''}<button data-intent="open" class="news-button" data-view="news" data-toggle="true" aria-controls="left" aria-expanded="false" aria-label="읽지 않은 소식 ${newsItems().filter(e=>!newsRead.has(game,e)).length}건"><small>소식</small><strong>${newsItems().filter(e=>!newsRead.has(game,e)).length}<span>건</span></strong></button>`);
 setHTML('date',`${game.year}년 ${game.month}월 ${game.day}일`);
 document.getElementById('pause').textContent=game.paused?'▶ 계속':'Ⅱ 일시정지';document.getElementById('pause').disabled=game.status!=='playing';
 const focused=document.activeElement,editing=focused?.matches('input,select')&&document.getElementById('left').contains(focused);
 if(ui.panel!=='none'&&(force||!editing))setHTML('left',ui.view==='diplomacy'&&ui.panel==='left'?diplomacyColumns(game,ui):menuColumns());
 const root=panelTrail[0]||panelState();
 const path=[...panelTrail,panelState()],regionIndex=path.findIndex(state=>state.panel==='left'&&state.view==='city'&&!state.army),regionDock=document.getElementById('region-dock');
 regionDock.hidden=ui.panel==='none'||regionIndex<0;document.querySelector('.game-shell').dataset.regionDock=String(!regionDock.hidden);
 if(!regionDock.hidden&&document.activeElement?.id!=='city-jump'){
  const selected=path[regionIndex].selected;
  setHTML('region-dock',`<select id="city-jump" data-panel-source="${regionIndex}" aria-label="거점 이동">${[...new Set([selected,...strongholds(game,game.player).map(c=>c.id)])].map(id=>`<option value="${id}" ${id===selected?'selected':''}>${esc(city(game,id).name)} ★</option>`).join('')}</select>`);
 }
 document.getElementById('notice').textContent=ui.notice;if(ui.notice!==lastNotice){lastNotice=ui.notice;const line=document.querySelector('.status-line');line.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{line.hidden=true;},6000);}document.querySelector('.game-shell').dataset.panel=ui.panel;document.querySelector('.game-shell').dataset.view=ui.panel==='right'?ui.tab:ui.army?'army':ui.view; for(const el of document.querySelectorAll('.resources>button[data-resource],.resources>button[data-view]'))el.setAttribute('aria-expanded',String(ui.panel==='left'&&(el.dataset.resource?ui.view===el.dataset.resource:ui.view===el.dataset.view)));
 for(const el of document.querySelectorAll('[data-command]')){const active=ui.panel!=='none'&&(root.panel==='left'?el.dataset.command===root.view:el.dataset.command===root.tab);el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));}
 for(const el of document.querySelectorAll('[data-toggle]')){const active=ui.panel!=='none'&&root.panel==='left'&&el.dataset.view===root.view;el.classList.toggle('selected',active);el.setAttribute('aria-expanded',String(active));}
 for(const el of document.querySelectorAll('[data-speed]'))el.classList.toggle('selected',Number(el.dataset.speed)===speed);for(const el of document.querySelectorAll('[data-news]'))el.classList.toggle('selected',el.dataset.news===ui.news);
 if(ui.view==='diplomacy'&&ui.panel==='left'){
  const path=[...ui.diplomacyTrail,ui.diplomacyScreen];
  for(const column of document.querySelectorAll('[data-diplomacy-column]'))for(const button of column.querySelectorAll('.diplomacy-choice')){const d=button.dataset,next=path[Number(column.dataset.diplomacyColumn)+1],chosen=!!next&&(d.diplomacyRealm?next==='realm'&&d.diplomacyRealm===ui.diplomacyTo:d.diplomacyKind?next==='compose'&&d.diplomacyKind===ui.diplomacyType:d.diplomacyOffer?next==='offer'&&d.diplomacyOffer===ui.diplomacyOffer:d.diplomacyWar?next==='war'&&d.diplomacyWar===ui.diplomacyTo:d.diplomacyScreen===next);button.classList.toggle('selected',chosen);button.setAttribute('aria-expanded',String(chosen));}
  if(ui.diplomacyFocus){const last=document.querySelector('.diplomacy-panel:last-child');last?.scrollIntoView({block:'nearest',inline:'end',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});last?.querySelector('h2')?.focus({preventScroll:true});ui.diplomacyFocus=false;}
 }
 if(ui.view!=='diplomacy'||ui.panel==='right'){
  const path=[...panelTrail,panelState()];
  for(const column of document.querySelectorAll('[data-menu-column]')){
   const next=path[Number(column.dataset.menuColumn)+1];
   for(const button of column.querySelectorAll('[data-view],[data-inspect],[data-army],[data-node-admin]')){
    const d=button.dataset,chosen=!!next&&(d.army?next.army===d.army:d.inspect?next.node===d.inspect&&!next.army:d.nodeAdmin?next.view==='city'&&!next.army&&next.selected===d.nodeAdmin:next.view===d.view&&!next.army);
    button.classList.toggle('selected',chosen);button.setAttribute('aria-expanded',String(chosen));
   }
  }
  if(panelFocus&&ui.panel!=='none'){const last=document.querySelector(`[data-menu-column="${panelTrail.length}"]`);last?.scrollIntoView({block:'nearest',inline:'end',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const heading=last?.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});panelFocus=false;}
 }
 if(nodeTooltipTarget){if(nodeTooltipTarget.isConnected&&ui.panel!=='none')showNodeTooltip(nodeTooltipTarget);else hideNodeTooltip();}
 refreshSelectControls(app);paintFeedback();map?.inspect(ui.panel==='left'?ui.node:null);map?.repaint();trace('ui','paint',{elapsed:game.elapsed,editing,ms:Math.round((performance.now()-began)*100)/100});}
function openNode(id,nested=false){if(!canSeeRegion(game,id))return;if(!city(game,id))return;navigatePanel({node:id,army:null,view:'garrison',panel:'left'},nested);ui.notice=`${city(game,id).name} · 부대 현황`;paint(true);}
function selectLand(id){if(!canSeeRegion(game,id))return;panelTrail=[];audio.play('select');if(hasEconomy(game)&&game.economy.sites.some(v=>v.region===id)){const hub=governingHub(game,id);if(hub){game.selected=hub.id;ui.army=null;ui.node=null;ui.view='economy';ui.panel='left';ui.notice='자원지를 선택했습니다. 출발 거점에서 작업대를 보내세요.';paint(true);return;}}if(city(game,id).soldiers>=.5||game.armies.some(a=>a.troops>0&&(a.target===id||a.from===id))){openNode(id);return;}const c=city(game,id),hub=governingHub(game,c);ui.panel='none';ui.army=null;ui.notice=`${TERRAINS[c.terrain].name} · ${FACTIONS[c.owner].name} 영토 · ${hub?hub.name+'에서 자동 관리':'관할 거점 없음'} · ${TERRAINS[c.terrain].description}${c.soldiers>=.5?' · 주둔 '+fmt(c.soldiers)+'명':''}`;paint();}
function selectCity(id,nested=false){if(!city(game,id)||!canSeeRegion(game,id))return;audio.play('select');if(!city(game,id).major){selectLand(id);return;}navigatePanel({selected:id,army:null,node:null,view:'city',panel:'left',kind:ui.kind==='hire'?'farm':ui.kind},nested);ui.notice=`${city(game,id).name} 선택 · ${FACTIONS[city(game,id).owner].name}`;paint(true);}
function selectArmy(id,nested=false){const target=game.armies.find(a=>a.id===id);if(!target)return;const p=armyPosition(target);if(target.faction!==game.player&&!canSeePoint(game,p.x,p.y))return;audio.play('select');if(!game.armies.some(a=>a.id===id))return;navigatePanel({army:id,node:null,view:'city',panel:'left'},nested);paint(true);}
function schedule(){
 clearTimeout(timer);const version=++scheduleVersion;if(game.paused||game.status!=='playing')return;
 timer=setTimeout(async()=>{try{
  await simulation.run('tick');game=simulation.state;if(version!==scheduleVersion)return;
  map.update(game);presentFeedback();paint();if(game.elapsed%5===0){save();trace('render','map.stats',map.stats());}
  nextTick+=DAY_MS/speed;if(nextTick<performance.now())nextTick=performance.now()+DAY_MS/speed;schedule();
 }catch(error){game.paused=true;fail(error);paint();}},Math.max(0,nextTick-performance.now()));
}
function openDiplomacy(screen,replace=false){if(screen==='home')ui.diplomacyTrail=[];else if(!replace&&screen!==ui.diplomacyScreen)ui.diplomacyTrail.push(ui.diplomacyScreen);ui.diplomacyScreen=screen;ui.diplomacyFocus=true;}
function activateDiplomacyColumn(target){const column=target.closest('[data-diplomacy-column]');if(!column)return false;const index=Number(column.dataset.diplomacyColumn),path=[...ui.diplomacyTrail,ui.diplomacyScreen];if(index===path.length-1)return false;ui.diplomacyScreen=path[index];ui.diplomacyTrail=path.slice(0,index);return true;}
function pauseClock(){remaining=Math.max(0,Math.min(1,(nextTick-performance.now())/(DAY_MS/speed)));game.paused=true;}
function fail(error){ui.notice=error.message;audio.play('error');map?.feedback(game.selected,'명령을 실행할 수 없습니다','warning');trace('error','action.failed',{message:error.message,stack:error.stack,elapsed:game.elapsed},'error');}
async function togglePause(){audio.play(game.paused?'resume':'pause');const paused=!game.paused;clearTimeout(timer);scheduleVersion++;if(game.paused){game.paused=false;nextTick=performance.now()+remaining*DAY_MS/speed;}else pauseClock();await simulation.run('pause',{paused});game=simulation.state;map.update(game);ui.notice=game.paused?'시간 일시정지 · 내정과 정책은 그대로 조작할 수 있습니다.':'시간이 다시 흐릅니다.';save();map.repaint();schedule();}
let nodeTooltipTimer=null,nodeTooltipTarget=null;
function hideNodeTooltip(){clearTimeout(nodeTooltipTimer);nodeTooltipTarget?.removeAttribute('aria-describedby');nodeTooltipTarget=null;const tip=document.getElementById('node-tooltip');if(tip)tip.hidden=true;}
function showNodeTooltip(target){
 if(!target.isConnected)return;
 const tip=document.getElementById('node-tooltip');nodeTooltipTarget=target;tip.textContent=target.dataset.nodeTooltip;tip.hidden=false;target.setAttribute('aria-describedby','node-tooltip');
 const box=target.getBoundingClientRect(),height=tip.offsetHeight;
 tip.style.left=`${Math.max(12,Math.min(box.right-tip.offsetWidth,innerWidth-tip.offsetWidth-12))}px`;
 tip.style.top=`${Math.max(12,Math.min(box.bottom+8+height<=innerHeight-12?box.bottom+8:box.top-height-8,innerHeight-height-12))}px`;
}
app.addEventListener('pointerover',e=>{const target=e.target.closest('[data-node-tooltip]');if(!target||target.contains(e.relatedTarget))return;hideNodeTooltip();nodeTooltipTimer=setTimeout(()=>showNodeTooltip(target),650);});
app.addEventListener('pointerout',e=>{const target=e.target.closest('[data-node-tooltip]');if(target&&!target.contains(e.relatedTarget)&&!e.relatedTarget?.closest('#node-tooltip'))hideNodeTooltip();if(e.target.closest('#node-tooltip')&&!e.relatedTarget?.closest('#node-tooltip,[data-node-tooltip]'))hideNodeTooltip();});
app.addEventListener('focusin',e=>{if(e.target.matches('[data-node-tooltip]')){hideNodeTooltip();requestAnimationFrame(()=>{if(document.activeElement===e.target)showNodeTooltip(e.target);});}});
app.addEventListener('focusout',e=>{if(e.target.matches('[data-node-tooltip]'))hideNodeTooltip();});
app.addEventListener('scroll',()=>{
 if(nodeTooltipTarget&&document.activeElement===nodeTooltipTarget){
  const box=nodeTooltipTarget.getBoundingClientRect(),panel=nodeTooltipTarget.closest('.menu-column-body').getBoundingClientRect();
  if(box.bottom>panel.top&&box.top<panel.bottom&&box.right>panel.left&&box.left<panel.right){showNodeTooltip(nodeTooltipTarget);return;}
 }
 hideNodeTooltip();
},true);
window.addEventListener('resize',hideNodeTooltip);
let mapPeekTimer=null;
function locateOnMap(target){
 const shell=document.querySelector('.game-shell'),canvas=document.getElementById('world-map'),box=canvas.getBoundingClientRect();
 const columns=document.querySelector('.menu-columns,.diplomacy-columns'),menu=ui.panel!=='none'?columns?.getBoundingClientRect():null;
 const top=parseFloat(getComputedStyle(shell).getPropertyValue('--content-top'))||118;
 clearTimeout(mapPeekTimer);delete shell.dataset.mapPeek;
 let x=box.width/2,y=(top+box.height-90)/2;
 if(menu){
  const right=Math.min(box.width,menu.right-box.left);
  if(box.width-right>=260)x=(right+box.width-24)/2;
  else{
   const peekTop=Math.max(top+150,Math.min(box.height*.53,box.height-220));
   shell.style.setProperty('--map-peek-top',`${peekTop}px`);shell.dataset.mapPeek='true';
   y=(top+peekTop)/2;
   mapPeekTimer=setTimeout(()=>{delete shell.dataset.mapPeek;},3300);
  }
 }
 if(!map.locate(target,{x,y})){delete shell.dataset.mapPeek;clearTimeout(mapPeekTimer);ui.notice='현재 시야에서 위치를 확인할 수 없습니다.';paint();}
}
app.addEventListener('click',async e=>{const status=e.target.closest('[data-node-tooltip]');if(status){hideNodeTooltip();showNodeTooltip(status);return;}const el=e.target.closest('button');if(!el||el.disabled)return;hideNodeTooltip();const d={...el.dataset};if(!['invest','pause','mute'].includes(d.action))audio.play('click');el.classList.remove('command-feedback');void el.offsetWidth;el.classList.add('command-feedback');trace('input','click',{data:d,elapsed:game.elapsed});try{
 if(d.readNews||d.readLocation){const event=newsItems().find(e=>String(e.id)===String(d.readNews||d.readLocation));if(event)markNewsRead([event]);}if(d.readAll!==undefined)markNewsRead(newsItems());
 if(d.focusArmy||d.focusSite||d.focus){if(d.readLocation)paint(true);locateOnMap(d.focusArmy?{army:d.focusArmy}:{city:d.focusSite||d.focus});return;}
 const root=panelTrail[0]||panelState(),nested=!!el.closest('[data-menu-column]');
 activatePanelColumn(el);activateDiplomacyColumn(el);
 if(d.closeColumn!==undefined){if(panelTrail.length)restorePanel(panelTrail.pop());else ui.panel='none';panelFocus=true;}
 if(d.diplomacyCloseColumn!==undefined){if(Number(d.diplomacyCloseColumn)===0)ui.panel='none';else{ui.diplomacyScreen=ui.diplomacyTrail.pop()||'home';ui.diplomacyFocus=true;}}
 if(d.openDiplomacyOffer||d.openDiplomacyInbox!==undefined){panelTrail=[];ui.panel='left';ui.view='diplomacy';ui.army=null;ui.node=null;ui.diplomacyTrail=['home'];if(d.openDiplomacyOffer){ui.diplomacyOffer=d.openDiplomacyOffer;ui.diplomacyTrail.push('inbox');openDiplomacy('offer',true);}else openDiplomacy('inbox',true);}
 if(d.diplomacyScreen)openDiplomacy(d.diplomacyScreen);if(d.diplomacyRealm){ui.diplomacyTo=d.diplomacyRealm;ui.warTarget='';openDiplomacy('realm');}if(d.diplomacyKind){ui.diplomacyType=d.diplomacyKind;openDiplomacy('compose');}if(d.diplomacyOffer){ui.diplomacyOffer=d.diplomacyOffer;openDiplomacy('offer');}if(d.diplomacyWar){ui.diplomacyTo=d.diplomacyWar;openDiplomacy('war');}if(d.peaceWith){ui.diplomacyTo=d.peaceWith;ui.diplomacyType='peace';openDiplomacy('compose');}if(d.withdrawWar){await simulation.run('withdraw-war',{other:d.withdrawWar});save();}if(d.offerAccept||d.offerReject){await simulation.run('diplomacy-response',{id:d.offerAccept||d.offerReject,accept:!!d.offerAccept});ui.notice=d.offerAccept?'외교 제안을 수락했습니다.':'외교 제안을 거절했습니다.';save();}
 if(d.resourcePolicy){await simulation.run('resource-policy',{hub:game.selected,policy:d.resourcePolicy});audio.play('confirm');ui.notice=`${city(game,game.selected).name} · ${RESOURCE_POLICIES[d.resourcePolicy].name} 방침을 적용했습니다.`;save();}if(d.resource){const close=el.closest('.resources')&&ui.panel!=='none'&&root.panel==='left'&&root.view===d.resource;navigatePanel({view:d.resource,panel:close?'none':'left',army:null,node:null},nested);}
 if(d.inspect){openNode(d.inspect,nested);map.focus(d.inspect);}if(d.nodeAdmin)selectCity(d.nodeAdmin,nested);
 if(d.view){const close=(d.command||d.toggle)&&ui.panel!=='none'&&root.panel==='left'&&root.view===d.view;navigatePanel({node:null,panel:close?'none':'left',view:d.view,army:null,kind:d.view==='hire'?'hire':d.view==='city'&&ui.kind==='hire'?'farm':ui.kind},nested);if(d.view==='diplomacy')ui.diplomacyFocus=true;}if(d.kind){ui.kind=d.kind;ui.view='city';}if(d.tab){const close=d.command&&ui.panel!=='none'&&root.panel==='right'&&root.tab===d.tab;navigatePanel({node:null,army:null,panel:close?'none':'right',view:'city',tab:d.tab},nested);}if(d.news)ui.news=d.news;if(d.army)selectArmy(d.army,nested);
 if(d.threat){openNode(d.threat);map.focus(d.threat);}if(d.speed){if(!game.paused)remaining=Math.max(0,Math.min(1,(nextTick-performance.now())/(DAY_MS/speed)));speed=Number(d.speed);nextTick=performance.now()+remaining*DAY_MS/speed;map.setSpeed(DAY_MS/speed);schedule();}if(d.cancel){audio.play('confirm');const refund=await simulation.run('cancel',{id:d.cancel});ui.notice=`명령 중단 · 금 ${fmt(refund)} 반환. 진행한 개발은 남습니다.`;save();}
 switch(d.action){case 'review-diplomacy':{const fields=[...document.querySelectorAll('.diplomacy-panel input')];if(fields.some(field=>{field.required=true;return !field.reportValidity();}))break;openDiplomacy('review');break;}case 'send-diplomacy':{const to=ui.diplomacyTo;const offer=await simulation.run('diplomacy-offer',{to,type:ui.diplomacyType,resource:ui.diplomacyResource,amount:Number(ui.diplomacyAmount),price:ui.diplomacyType==='demand'?0:Number(ui.diplomacyPrice),duration:Number(ui.diplomacyDuration)});ui.diplomacyOffer=offer.id;openDiplomacy('offer');ui.notice='제안을 보냈습니다. 시간이 흐르면 답변이 도착합니다.';save();break;}case 'declare-war':await simulation.run('declare-war',{target:document.getElementById('war-target').value});ui.notice='제한전을 선언했습니다. 방침·전쟁에서 손실과 철수를 관리하세요.';openDiplomacy('war');save();break;case 'mute':audio.set('muted',!audio.preferences.muted);if(!audio.preferences.muted)audio.play('select');break;case 'invest':{const p=await simulation.run('project',{request:request()});audio.play('confirm');map.feedback(p.city,`${PROJECTS[p.type]} 시작 · 금 −${fmt(p.gold)}`);ui.notice=`${city(game,p.city).name} ${PROJECTS[p.type]} 시작 · 금 −${fmt(p.gold)}, 식량 −${fmt(p.food)}`;save();break;}case 'pause':await togglePause();break;
 case 'overview':map.overview();ui.panel='none';ui.notice='전체 세계 · 밝은 부분이 현재 시야입니다. 왼쪽 위 왕국 문장을 누르면 내 영지로 돌아갑니다.';break;
 case 'territory':{const current=city(game,game.selected),capital=city(game,FACTIONS[game.player].capital),target=current.major&&current.owner===game.player?current:capital.owner===game.player?capital:strongholds(game,game.player)[0];if(target){game.selected=target.id;ui.army=null;ui.view='city';ui.panel='none';map.focusTerritory();ui.notice='금빛 경계 안이 내 영지입니다. 거점을 누르면 내정을 시작합니다.';}else if(map.focusTerritory()){ui.panel='none';ui.notice='현재 아군 거점은 없지만 남은 영토와 부대를 볼 수 있습니다.';}else ui.notice='현재 통치하는 땅이 없습니다.';break;}
 case 'review-new':newWorldRequest();navigatePanel({view:'new-game-review'},true);break;
 case 'new':newWorldRequest();app.inert=true;clearTimeout(timer);scheduleVersion++;saveBlocked=false;await simulation.run('new',newWorldRequest());game=simulation.state;newsRead.reset(game);await simulation.readyTerrain();panelTrail=[];ui.diplomacyScreen='home';ui.diplomacyTrail=[];ui.diplomacyTo='';ui.diplomacyOffer=null;ui.view='city';ui.panel='none';ui.army=null;ui.node=null;ui.kind='farm';ui.tab='forces';ui.notice='새 세계가 움직이기 시작했습니다. 거점을 눌러 내정을 시작하세요.';save();mount();app.inert=false;break;
 case 'logs':{trace('diagnostics','export',{entries:diagnostics().length,map:map.stats()});const url=URL.createObjectURL(new Blob([exportDiagnostics(game)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`crown-and-earth-${game.year}-${game.month}-${game.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);ui.notice='AI 판단·전투·성능 로그와 현재 세계를 저장했습니다.';break;}}
 paint(true);
 }catch(error){app.inert=false;fail(error);paint(true);}});
app.addEventListener('change',async e=>{if(['music-volume','effects-volume'].includes(e.target.id)){audio.play('select');return;}try{activatePanelColumn(e.target);activateDiplomacyColumn(e.target);switch(e.target.id){case 'kingdom-policy':await simulation.run('kingdom-policy',{policy:e.target.value});save();break;case 'kingdom-priority':await simulation.run('kingdom-policy',{priority:e.target.value});save();break;case 'diplomacy-resource':ui.diplomacyResource=e.target.value;ui.diplomacyAmount=e.target.value==='food'?2000:40;ui.diplomacyPrice=e.target.value==='food'?400:200;break;case 'war-target':ui.warTarget=e.target.value;break;case 'city-jump':selectCity(e.target.value);map.focus(e.target.value);break;case 'policy':await simulation.run('policy',{city:game.selected,policy:e.target.value});audio.play('confirm');map.feedback(game.selected,`${POLICIES[e.target.value].name} 정책 적용`);ui.notice=`${city(game,game.selected).name} 정책 변경 · ${POLICIES[e.target.value].description}`;save();break;case 'doctrine':await simulation.run('doctrine',{doctrine:e.target.value});audio.play('confirm');map.feedback(game.selected,`${DOCTRINES[e.target.value].name} 적용`);save();break;case 'recruit':ui.recruit=e.target.value;break;case 'new-seed':ui.newSeed=e.target.value.trim();break;case 'new-map-size':ui.newMapSize=e.target.value;break;default:return;}paint(true);}catch(error){fail(error);paint(true);}});
app.addEventListener('input',e=>{const fields={'diplomacy-amount':'diplomacyAmount','diplomacy-price':'diplomacyPrice','diplomacy-duration':'diplomacyDuration'};if(fields[e.target.id]){ui[fields[e.target.id]]=e.target.value;if(activateDiplomacyColumn(e.target))paint(true);return;}if(['music-volume','effects-volume'].includes(e.target.id)){const kind=e.target.id==='music-volume'?'music':'effects';audio.set(kind,Number(e.target.value));document.getElementById(`${kind}-value`).textContent=`${e.target.value}%`;return;}if(e.target.id==='new-seed'){const branched=activatePanelColumn(e.target);ui.newSeed=e.target.value.trim();if(branched)paint(true);return;}if(e.target.id==='budget'){const branched=activatePanelColumn(e.target);ui.budget=Number(e.target.value);document.getElementById('budget-value').textContent=`금 ${fmt(ui.budget)}`;if(branched)paint(true);else setHTML('quote',quotePanel());trace('input','investment.preview',{budget:ui.budget,city:game.selected});}});
document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true});
document.addEventListener('keydown',async e=>{if(!e.repeat)audio.unlock();if(e.code==='Escape'){if(nodeTooltipTarget){hideNodeTooltip();return;}ui.panel='none';paint();document.querySelector('#world-map').focus();}if(e.code==='Space'&&!e.target.matches('input,select,button')){e.preventDefault();await togglePause();paint();}});
audio.setHidden(document.hidden);
document.addEventListener('visibilitychange',()=>audio.setHidden(document.hidden));
window.addEventListener('pagehide',()=>{audio.setHidden(true);save();});
window.addEventListener('pageshow',()=>audio.setHidden(document.hidden));let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>paint(true),120);});
trace('boot','living-world.ready',{version:4,cities:WORLD.count,factions:Object.keys(FACTIONS).length});mount();
