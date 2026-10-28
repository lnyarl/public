import {city,strongholds,routeCost,clamp} from './world.js';
import {hasEconomy,changeStock,laborAvailable,stockWeight} from './economy.js';
import {EMPTY_STOCK,SITE_RULES,PARTY_STATES} from './economy-rules.js';
import {civilPath} from './resource-sites.js';
import {commandError,spendCommandPoints,COMMAND_COSTS} from './command-points.js';

export function gatheringError(s,hubId,siteId,faction=s.player,automatic=false){
 if(!hasEconomy(s))return '이 세계는 기존 경제 규칙을 사용합니다.';
 if(s.status!=='playing')return '종료된 게임입니다.';
 const h=city(s,hubId),site=s.economy.sites.find(v=>v.id===siteId);
 if(!h?.major||h.owner!==faction||!site||city(s,site.region).owner!==faction)return '아군 거점과 자원지를 선택하세요.';
 if(laborAvailable(s,hubId)<100)return '채집에 배정할 주민 100명이 부족합니다.';
 if(s.economy.parties.filter(p=>p.homeHub===hubId&&p.phase!=='done').length>=2)return '이 거점의 작업대 두 개가 활동 중입니다.';
 if(s.economy.parties.some(p=>p.siteId===siteId&&p.phase!=='done'))return '이 자원지에 작업대가 배정되어 있습니다.';
 if(!civilPath(s,hubId,site.region,faction))return '자원지까지 이어지는 아군 길이 없습니다.';
 const apError=commandError(s,automatic?0:COMMAND_COSTS.gather,faction);if(apError)return apError;
 return '';
}

function travel(s,p,path,phase){
 p.path=[...path];p.phase=phase;p.reason='';p.progress=0;p.legFrom=p.atRegion;p.legTo=p.path.shift()??null;
 p.duration=p.legTo?clamp(Math.ceil(routeCost(city(s,p.legFrom),city(s,p.legTo))/40),4,18):1;
}

export function startGathering(s,hubId,siteId,{repeat=false,faction=s.player,automatic=false}={}){
 const error=gatheringError(s,hubId,siteId,faction,automatic);if(error)throw new Error(error);
 spendCommandPoints(s,automatic?0:COMMAND_COSTS.gather,'채집 파견',faction);
 const p={id:`worker-${++s.serial}`,owner:faction,homeHub:hubId,siteId,workers:100,phase:'outbound',atRegion:hubId,legFrom:hubId,legTo:null,path:[],progress:0,duration:1,worked:0,cargo:EMPTY_STOCK(),repeat:!!repeat,returnRequested:false,reason:''};
 if(automatic)p.automatic=true;
 const site=s.economy.sites.find(v=>v.id===siteId);travel(s,p,civilPath(s,hubId,site.region,faction),'outbound');
 s.economy.parties=s.economy.parties.filter(v=>v.phase!=='done').concat(s.economy.parties.filter(v=>v.phase==='done').slice(-19),p);return p;
}

function returnHome(s,p){
 p.returnRequested=true;
 const options=strongholds(s,p.owner).map(c=>({c,path:civilPath(s,p.atRegion,c.id,p.owner,true)})).filter(v=>v.path!==null).sort((a,b)=>(a.c.id===p.homeHub?-1:b.c.id===p.homeHub?1:a.path.length-b.path.length)||a.c.id.localeCompare(b.c.id));
 if(!options.length){p.phase='waiting';p.legTo=null;p.path=[];p.reason='귀환 가능한 아군 거점과 길을 기다립니다.';return;}
 p.destination=options[0].c.id;travel(s,p,options[0].path,'returning');if(!p.legTo)p.phase='unloading';
}

export function recallParty(s,id,faction=s.player){
 const p=s.economy?.parties.find(v=>v.id===id&&v.owner===faction&&v.phase!=='done');if(!p)throw new Error('활동 중인 아군 작업대가 없습니다.');
 p.repeat=false;p.returnRequested=true;if(!p.legTo&&p.phase!=='unloading')returnHome(s,p);
}

function unload(s,p){
 const h=city(s,p.atRegion);if(!h.major||h.owner!==p.owner){returnHome(s,p);return;}
 for(const key of Object.keys(p.cargo))if(p.cargo[key]>0)p.cargo[key]=Math.max(0,p.cargo[key]-changeStock(s,h.id,key,p.cargo[key],'채집물 입고'));
 if(stockWeight(p.cargo)>1e-7){p.phase='unloading';p.reason='창고에 자리가 날 때까지 하역을 기다립니다.';return;}
 if(p.homeHub!==h.id){const former=city(s,p.homeHub);former.population-=p.workers;former.reserve=Math.min(former.reserve,former.population*.12);h.population+=p.workers;p.homeHub=h.id;}
 if(p.repeat){const site=s.economy.sites.find(v=>v.id===p.siteId),path=site&&civilPath(s,p.atRegion,site.region,p.owner);if(path&&city(s,site.region).owner===p.owner){p.returnRequested=false;p.worked=0;travel(s,p,path,'outbound');return;}}
 p.phase='done';p.reason='채집물을 거점에 전달했습니다.';p.legTo=null;p.path=[];p.progress=0;
}

export function advanceWorkParties(s){
 for(const p of s.economy.parties){
  if(p.phase==='done')continue;
  if(p.phase==='unloading'){unload(s,p);continue;}
  if(p.phase==='waiting'){returnHome(s,p);continue;}
  if(p.legTo){
   p.progress=Math.min(1,p.progress+1/p.duration);if(p.progress<1)continue;p.atRegion=p.legTo;p.legTo=null;
   if(p.returnRequested&&p.phase==='outbound'||city(s,p.atRegion).owner!==p.owner){returnHome(s,p);continue;}
   if(p.path.length){const next=p.path[0];if(city(s,next).owner!==p.owner){returnHome(s,p);continue;}travel(s,p,p.path,p.phase);continue;}
   if(p.phase==='returning'){p.phase='unloading';unload(s,p);}else{p.phase='working';p.worked=0;p.progress=0;}continue;
  }
  if(p.phase==='working'){
   const site=s.economy.sites.find(v=>v.id===p.siteId);if(!site||city(s,site.region).owner!==p.owner||p.returnRequested){returnHome(s,p);continue;}
   const hostile=s.armies.some(a=>a.faction!==p.owner&&a.target===p.atRegion&&['march','siege','field'].includes(a.mode));
   if(hostile){p.reason='적군 접근으로 작업을 중단합니다.';returnHome(s,p);continue;}
   const season=site.kind==='food'?(s.month>=9&&s.month<=11?1.35:s.month<=2||s.month===12?.7:1):1,weight=site.kind==='food'?.05:1;
   const amount=Math.min(site.stock,SITE_RULES[site.kind].rate*site.richness*season,Math.max(0,60-stockWeight(p.cargo))/weight);
   site.stock-=amount;p.cargo[site.kind]+=amount;p.worked++;
   if(p.worked>=4||stockWeight(p.cargo)>=60-1e-7||site.stock<=1e-7)returnHome(s,p);
  }
 }
 for(const site of s.economy.sites)site.stock=Math.min(site.stockMax,site.stock+site.regen);
}

export function partyPosition(s,p){
 const a=city(s,p.legFrom),b=city(s,p.legTo||p.atRegion);if(!p.legTo)return {x:b.x,y:b.y,offset:0};
 const u=1-p.progress,bend=a.roads?.[b.id];return bend?{x:u*u*a.x+2*u*p.progress*bend.x+p.progress*p.progress*b.x,y:u*u*a.y+2*u*p.progress*bend.y+p.progress*p.progress*b.y,offset:0}:{x:a.x+(b.x-a.x)*p.progress,y:a.y+(b.y-a.y)*p.progress,offset:0};
}

export function validateWorkParties(s){
 const fail=()=>{throw new Error('작업대 저장을 읽을 수 없습니다.');},activeSites=new Set();
 for(const p of s.economy.parties){
  if(p.automatic!==undefined&&typeof p.automatic!=='boolean')fail();
  if(typeof p.id!=='string'||!s.factions[p.owner]||!city(s,p.homeHub)?.major||!s.economy.sites.some(v=>v.id===p.siteId)||!Object.hasOwn(PARTY_STATES,p.phase)||p.workers!==100||!city(s,p.atRegion)||!city(s,p.legFrom)||!Array.isArray(p.path)||typeof p.repeat!=='boolean'||typeof p.returnRequested!=='boolean'||!Number.isFinite(p.progress)||p.progress<0||p.progress>1||!Number.isInteger(p.duration)||p.duration<1||p.duration>18||!Number.isInteger(p.worked)||p.worked<0||p.worked>4||!p.cargo)fail();
  if(Object.keys(p.cargo).some(k=>!['food','timber','goods'].includes(k)))fail();for(const k of ['food','timber','goods'])if(!Number.isFinite(p.cargo[k])||p.cargo[k]<0)fail();if(stockWeight(p.cargo)>60+1e-6||p.phase==='done'&&stockWeight(p.cargo)>1e-7)fail();
  let previous=p.legTo||p.atRegion;if(p.legTo&&(!city(s,p.legTo)||!city(s,p.legFrom).neighbors.includes(p.legTo)))fail();
  for(const next of p.path){if(!city(s,next)||!city(s,previous).neighbors.includes(next))fail();previous=next;}
  if(p.phase!=='done'){if(activeSites.has(p.siteId))fail();activeSites.add(p.siteId);}
 }
}
