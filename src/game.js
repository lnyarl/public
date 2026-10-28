import { PERSONAS, ORDERS, characterLine } from './characters.js';
import { storyFor } from './stories.js';

export const FACTIONS = {
  shu: { name: '촉', han: '蜀', ruler: '유비', color: '#9dbb93', title: '인의로 천하를 품다', quote: '사람을 얻는 자, 천하를 얻는다.', home: 'xinye', gold: 2600, food: 18000, bonus: '민심 +10 · 장수 등용 비용 20% 감소', story: '아직 땅은 작으나 뜻을 함께하는 이들이 있다. 형주에서 다시 한실의 꿈을 일으켜라.', difficulty: '도전', officers: ['liubei', 'guanyu', 'zhangfei', 'zhugeliang'] },
  wei: { name: '위', han: '魏', ruler: '조조', color: '#8ea8bf', title: '난세를 넘어 패업으로', quote: '천하의 재능을 모아, 난세를 평정하리라.', home: 'xuchang', gold: 3800, food: 26000, bonus: '상업 수입 +20%', story: '중원의 옥토와 정예군이 그대의 손에 있다. 남으로 진군하여 천하의 질서를 다시 세워라.', difficulty: '입문', officers: ['caocao', 'xiahoudun', 'zhangliao', 'xunyu'] },
  wu: { name: '오', han: '吳', ruler: '손권', color: '#ca9180', title: '강동에서 천하를 바라보다', quote: '장강을 방패로, 강동을 터전으로.', home: 'jianye', gold: 3000, food: 22000, bonus: '농업 수입 +20% · 방어력 +10%', story: '삼대가 다진 강동의 기틀 위에 새로운 시대를 열어라. 장강 너머에는 기회가 기다린다.', difficulty: '보통', officers: ['sunquan', 'zhouyu', 'ganning', 'lusu'] },
  neutral: { name: '군웅', han: '漢', ruler: '재야 세력', color: '#afa48c' }
};

export const OFFICERS = {
  liubei: { name: '유비', han: '劉備', war: 78, int: 82, role: '군주', trait: '인의' },
  guanyu: { name: '관우', han: '關羽', war: 98, int: 76, role: '무장', trait: '무신' },
  zhangfei: { name: '장비', han: '張飛', war: 97, int: 45, role: '무장', trait: '용맹' },
  zhugeliang: { name: '제갈량', han: '諸葛亮', war: 45, int: 100, role: '군사', trait: '와룡' },
  caocao: { name: '조조', han: '曹操', war: 86, int: 95, role: '군주', trait: '패도' },
  xiahoudun: { name: '하후돈', han: '夏侯惇', war: 91, int: 63, role: '무장', trait: '강건' },
  zhangliao: { name: '장료', han: '張遼', war: 95, int: 81, role: '무장', trait: '기습' },
  xunyu: { name: '순욱', han: '荀彧', war: 28, int: 98, role: '군사', trait: '왕좌' },
  sunquan: { name: '손권', han: '孫權', war: 71, int: 87, role: '군주', trait: '수성' },
  zhouyu: { name: '주유', han: '周瑜', war: 78, int: 97, role: '군사', trait: '화공' },
  ganning: { name: '감녕', han: '甘寧', war: 94, int: 68, role: '무장', trait: '돌격' },
  lusu: { name: '노숙', han: '魯肅', war: 54, int: 94, role: '군사', trait: '통찰' },
  zhaoyun: { name: '조운', han: '趙雲', war: 96, int: 78, role: '무장', trait: '상산' },
  pangtong: { name: '방통', han: '龐統', war: 35, int: 98, role: '군사', trait: '봉추' },
  huangzhong: { name: '황충', han: '黃忠', war: 93, int: 65, role: '무장', trait: '명궁' },
  machao: { name: '마초', han: '馬超', war: 96, int: 52, role: '무장', trait: '금마' },
  xuhuang: { name: '서황', han: '徐晃', war: 91, int: 74, role: '무장', trait: '침착' },
  luxun: { name: '육손', han: '陸遜', war: 70, int: 96, role: '군사', trait: '심모' },
  huangyueying: { name: '황월영', han: '黃月英', war: 36, int: 93, role: '군사', trait: '기재' },
  taishici: { name: '태사자', han: '太史慈', war: 93, int: 66, role: '무장', trait: '신의' }
};

// A compact fictional campaign, inspired by the Three Kingdoms era.
export const CITIES = [
  { id: 'wuwei', name: '무위', region: '서량', x: 145, y: 112, owner: 'neutral', soldiers: 4200, farm: 2, market: 1, fort: 2, terrain: '산악', neighbors: ['changan', 'hanzhong'] },
  { id: 'changan', name: '장안', region: '옹주', x: 310, y: 215, owner: 'wei', soldiers: 6200, farm: 2, market: 3, fort: 3, terrain: '산악', neighbors: ['wuwei', 'luoyang', 'hanzhong'] },
  { id: 'luoyang', name: '낙양', region: '사예', x: 455, y: 215, owner: 'wei', soldiers: 5200, farm: 2, market: 3, fort: 2, terrain: '평야', neighbors: ['changan', 'ye', 'xuchang', 'xinye'] },
  { id: 'ye', name: '업', region: '기주', x: 585, y: 115, owner: 'wei', soldiers: 5800, farm: 3, market: 2, fort: 2, terrain: '평야', neighbors: ['luoyang', 'beiping', 'xuchang', 'xiapi'] },
  { id: 'beiping', name: '북평', region: '유주', x: 740, y: 88, owner: 'wei', soldiers: 3600, farm: 2, market: 1, fort: 2, terrain: '평야', neighbors: ['ye', 'xiapi'] },
  { id: 'xuchang', name: '허창', region: '예주', x: 590, y: 290, owner: 'wei', soldiers: 8500, farm: 3, market: 3, fort: 3, terrain: '평야', neighbors: ['luoyang', 'ye', 'xiapi', 'xinye', 'jiangxia'] },
  { id: 'xiapi', name: '하비', region: '서주', x: 760, y: 285, owner: 'wei', soldiers: 4500, farm: 3, market: 2, fort: 2, terrain: '평야', neighbors: ['beiping', 'ye', 'xuchang', 'jianye'] },
  { id: 'hanzhong', name: '한중', region: '양주', x: 275, y: 335, owner: 'neutral', soldiers: 4000, farm: 2, market: 2, fort: 3, terrain: '산악', neighbors: ['wuwei', 'changan', 'chengdu', 'yongan', 'xinye'] },
  { id: 'xinye', name: '신야', region: '형주', x: 455, y: 355, owner: 'shu', soldiers: 12000, farm: 3, market: 2, fort: 2, terrain: '평야', neighbors: ['luoyang', 'xuchang', 'hanzhong', 'xiangyang', 'jiangxia'] },
  { id: 'xiangyang', name: '양양', region: '형주', x: 420, y: 440, owner: 'neutral', soldiers: 3400, farm: 3, market: 2, fort: 2, terrain: '평야', neighbors: ['xinye', 'jiangxia', 'jiangling', 'yongan'] },
  { id: 'jiangxia', name: '강하', region: '형주', x: 575, y: 435, owner: 'shu', soldiers: 7500, farm: 2, market: 2, fort: 2, terrain: '수변', neighbors: ['xinye', 'xuchang', 'xiangyang', 'jiangling', 'chaisang'] },
  { id: 'chengdu', name: '성도', region: '익주', x: 145, y: 470, owner: 'neutral', soldiers: 5000, farm: 4, market: 3, fort: 3, terrain: '산악', neighbors: ['hanzhong', 'yongan'] },
  { id: 'yongan', name: '영안', region: '익주', x: 285, y: 515, owner: 'neutral', soldiers: 2600, farm: 2, market: 1, fort: 2, terrain: '산악', neighbors: ['hanzhong', 'chengdu', 'xiangyang', 'jiangling'] },
  { id: 'jiangling', name: '강릉', region: '형주', x: 425, y: 540, owner: 'neutral', soldiers: 2800, farm: 3, market: 2, fort: 2, terrain: '수변', neighbors: ['xiangyang', 'jiangxia', 'yongan', 'changsha'] },
  { id: 'changsha', name: '장사', region: '형주', x: 525, y: 632, owner: 'neutral', soldiers: 3000, farm: 3, market: 2, fort: 2, terrain: '평야', neighbors: ['jiangling', 'chaisang'] },
  { id: 'chaisang', name: '시상', region: '양주', x: 705, y: 525, owner: 'wu', soldiers: 10000, farm: 3, market: 2, fort: 2, terrain: '수변', neighbors: ['jiangxia', 'changsha', 'jianye', 'wujun'] },
  { id: 'jianye', name: '건업', region: '양주', x: 805, y: 410, owner: 'wu', soldiers: 9500, farm: 3, market: 3, fort: 3, terrain: '수변', neighbors: ['xiapi', 'chaisang', 'wujun'] },
  { id: 'wujun', name: '오군', region: '양주', x: 870, y: 545, owner: 'wu', soldiers: 6500, farm: 3, market: 3, fort: 2, terrain: '수변', neighbors: ['jianye', 'chaisang'] }
];

export const ACTIONS = {
  farm: { name: '농업 개발', cost: 350, subtitle: '농업 +1 · 민심 +3', icon: 'grain' },
  market: { name: '상업 진흥', cost: 400, subtitle: '상업 +1 · 민심 +2', icon: 'coin' },
  levy: { name: '병사 징집', cost: 450, food: 1200, subtitle: '병력 +2,500 · 민심 −5', icon: 'troops' },
  fort: { name: '성벽 보수', cost: 350, subtitle: '성벽 +1 · 방어력 증가', icon: 'castle' },
  recruit: { name: '장수 등용', cost: 600, subtitle: '인재를 직접 만나 영입 · 새로운 고유기', icon: 'officer' }
};

export function createGame(player = 'shu', seed = Date.now()) {
  if (!['shu', 'wei', 'wu'].includes(player)) throw new Error('세력을 선택해 주세요.');
  const factions = Object.fromEntries(['shu', 'wei', 'wu'].map(id => [id, {
    gold: FACTIONS[id].gold, food: FACTIONS[id].food, officers: [...FACTIONS[id].officers]
  }]));
  return {
    version: 1, player, year: 208, month: 9, turn: 1, ap: 3, seed: seed >>> 0,
    selected: FACTIONS[player].home, status: 'playing', factions,
    trust: {}, usedOfficers: [], battle: null,
    story: { pending:'intro', branch:null, due:0, done:[], conquest:null },
    cities: CITIES.map(c => ({ ...c, neighbors: [...c.neighbors], morale: c.owner === 'shu' ? 85 : 75, acted: false })),
    pool: ['zhaoyun', 'pangtong', 'huangzhong', 'machao', 'xuhuang', 'luxun', 'huangyueying', 'taishici'],
    log: [{ turn: 1, type: 'notice', text: `208년 9월, ${FACTIONS[player].ruler}의 새로운 이야기가 시작됩니다.` }]
  };
}

export const cityById = (s, id) => s.cities.find(c => c.id === id);
export const ownedCities = (s, faction = s.player) => s.cities.filter(c => c.owner === faction);
export const totalSoldiers = (s, faction = s.player) => ownedCities(s, faction).reduce((n, c) => n + c.soldiers, 0) + (s.battle && faction === s.player ? s.battle.troops : 0);
export const recruitCost = (faction) => faction === 'shu' ? 480 : 600;
export function income(s, faction = s.player) {
  const cities = ownedCities(s, faction);
  return {
    gold: cities.reduce((n, c) => n + Math.round((120 + c.market * 95) * (faction === 'wei' ? 1.2 : 1)), 0),
    food: cities.reduce((n, c) => n + Math.round((500 + c.farm * 450) * (faction === 'wu' ? 1.2 : 1)), 0) - Math.ceil(totalSoldiers(s, faction) * .11)
  };
}
function random(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function log(s, text, type = 'notice') {
  s.log.unshift({ turn: s.turn, type, text });
  s.log = s.log.slice(0, 50);
}
function ensureTurn(s) {
  if (s.status !== 'playing') throw new Error('종료된 게임입니다. 새 천하를 시작해 주세요.');
  if (s.battle) throw new Error('진행 중인 전투를 먼저 마쳐 주세요.');
  if (s.ap <= 0) throw new Error('명령서를 모두 사용했습니다. 다음 달로 진행해 주세요.');
}
export function actionError(s, cityId, action) {
  if (s.status !== 'playing') return '종료된 게임';
  if (s.battle) return '전투 진행 중';
  const c = cityById(s, cityId);
  if (!c || c.owner !== s.player) return '아군 도시에서만 실행 가능';
  if (!ACTIONS[action]) return '알 수 없는 명령';
  if (!s.ap) return '명령서 부족';
  if (c.acted) return '이 도시는 이번 달 명령 완료';
  if (['farm', 'market', 'fort'].includes(action) && c[action] >= 5) return '최고 단계 도달';
  if (action === 'recruit' && !s.pool.length) return '등용할 재야 장수 없음';
  if (action === 'levy' && c.morale < 30) return '민심 30 이상 필요';
  const cost = action === 'recruit' ? recruitCost(s.player) : ACTIONS[action].cost;
  if (s.factions[s.player].gold < cost) return '금 부족';
  if (s.factions[s.player].food < (ACTIONS[action].food || 0)) return '군량 부족';
  return '';
}
export function performAction(s, cityId, action, officerId = null) {
  const error = actionError(s, cityId, action);
  if (error) throw new Error(error);
  if (action === 'recruit' && officerId && !s.pool.includes(officerId)) throw new Error('이미 등용했거나 만날 수 없는 장수입니다.');
  const c = cityById(s, cityId);
  const f = s.factions[s.player];
  const cost = action === 'recruit' ? recruitCost(s.player) : ACTIONS[action].cost;
  f.gold -= cost;
  f.food -= ACTIONS[action].food || 0;
  c.acted = true;
  s.ap--;
  if (action === 'farm' || action === 'market' || action === 'fort') {
    c[action]++;
    c.morale = Math.min(100, c.morale + (action === 'farm' ? 3 : action === 'market' ? 2 : 0));
    log(s, `${c.name} ${ACTIONS[action].name} 완료. ${action === 'farm' ? '농업' : action === 'market' ? '상업' : '성벽'} ${c[action]}단계.`, 'domestic');
  } else if (action === 'levy') {
    c.soldiers += 2500;
    c.morale = Math.max(0, c.morale - 5);
    log(s, `${c.name}에서 병사 2,500명을 징집했습니다.`, 'domestic');
  } else {
    const index = officerId ? s.pool.indexOf(officerId) : Math.floor(random(s) * s.pool.length);
    const [id] = s.pool.splice(index, 1);
    f.officers.push(id);
    log(s, `${OFFICERS[id].name}, ${FACTIONS[s.player].ruler}의 뜻에 함께하기로 하다.`, 'officer');
    return { officer: id };
  }
  return {};
}

export function attackError(s, fromId, toId, troops, faction = s.player) {
  const from = cityById(s, fromId), to = cityById(s, toId);
  if (!from || !to || from.owner !== faction) return '출진 도시를 확인해 주세요.';
  if (to.owner === faction) return '아군 도시는 공격할 수 없습니다.';
  if (!from.neighbors.includes(toId)) return '인접한 도시만 공격할 수 있습니다.';
  if (from.acted) return '이 도시는 이번 달 명령을 완료했습니다.';
  if (!Number.isInteger(troops) || troops < 1000 || troops > from.soldiers - 1000) return '1,000명 이상 출진하고 수비병 1,000명을 남겨야 합니다.';
  if (s.factions[faction].food < Math.ceil(troops * .2)) return '출진에 필요한 군량이 부족합니다.';
  return '';
}
export function power(s, troops, faction, defendingCity) {
  const officers = s.factions[faction]?.officers || [];
  const best = Math.max(65, ...officers.map(id => OFFICERS[id].war));
  let value = troops * (0.85 + best / 200);
  if (defendingCity) {
    value *= 1 + defendingCity.fort * .10 + (defendingCity.terrain === '산악' ? .12 : 0) + (faction === 'wu' ? .1 : 0);
  }
  return Math.round(value);
}
export function forecast(s, fromId, toId, troops) {
  const from = cityById(s, fromId), to = cityById(s, toId);
  const ratio = power(s, troops, from.owner) / Math.max(1, power(s, to.soldiers, to.owner, to));
  return { ratio, label: ratio >= 1.35 ? '아군 우세' : ratio >= 1.05 ? '접전 예상' : '아군 열세', food: Math.ceil(troops * .2) };
}
export function resolveAttack(s, fromId, toId, troops, faction = s.player) {
  if (faction === s.player) ensureTurn(s);
  const error = attackError(s, fromId, toId, troops, faction);
  if (error) throw new Error(error);
  const from = cityById(s, fromId), to = cityById(s, toId);
  const defender = to.owner;
  const attackPower = power(s, troops, faction) * (.90 + random(s) * .20);
  const defensePower = power(s, to.soldiers, defender, to) * (.90 + random(s) * .20);
  s.factions[faction].food -= Math.ceil(troops * .2);
  from.soldiers -= troops;
  from.acted = true;
  if (faction === s.player) s.ap--;
  const won = attackPower > defensePower;
  let survivors;
  if (won) {
    survivors = Math.max(500, Math.round(troops * (1 - Math.min(.68, defensePower / attackPower * .48))));
    to.owner = faction;
    to.soldiers = survivors;
    to.morale = Math.max(40, to.morale - 15);
    to.fort = Math.max(1, to.fort - 1);
    to.acted = true;
  } else {
    survivors = Math.round(troops * .38);
    from.soldiers += survivors;
    to.soldiers = Math.max(500, to.soldiers - Math.round(troops * .42));
  }
  log(s, `${FACTIONS[faction].name}군, ${from.name}에서 ${to.name}(으)로 진군. ${won ? `${to.name} 함락!` : '공략 실패, 잔여 병력 퇴각.'}`, 'battle');
  checkOutcome(s);
  return { won, from: from.name, to: to.name, faction, defender, sent: troops, survivors, lost: troops - survivors };
}
export function transfer(s, fromId, toId, troops) {
  ensureTurn(s);
  const from = cityById(s, fromId), to = cityById(s, toId);
  if (!from || !to || from.owner !== s.player || to.owner !== s.player || !from.neighbors.includes(toId)) throw new Error('인접 아군 도시로만 수송할 수 있습니다.');
  if (from.acted) throw new Error('이 도시는 이번 달 명령을 완료했습니다.');
  if (!Number.isInteger(troops) || troops < 1000 || troops > from.soldiers - 1000) throw new Error('수비병 1,000명을 남겨야 합니다.');
  from.soldiers -= troops;
  to.soldiers += troops;
  from.acted = true;
  s.ap--;
  log(s, `${from.name} → ${to.name}, 병력 ${troops.toLocaleString('ko-KR')}명 수송.`, 'domestic');
}

function checkOutcome(s) {
  const count = ownedCities(s).length;
  if (!count) s.status = 'defeat';
  else if (count === s.cities.length) s.status = 'victory';
}
function aiTurn(s, faction) {
  const f = s.factions[faction];
  if (!ownedCities(s, faction).length) return;
  // Three commands, just like the player. Captured cities cannot act again this month.
  let actions = 3;
  const borders = ownedCities(s, faction).filter(c => c.neighbors.some(id => cityById(s, id).owner !== faction));
  for (const from of borders.sort((a, b) => b.soldiers - a.soldiers)) {
    if (!actions || from.acted) continue;
    const targets = from.neighbors.map(id => cityById(s, id)).filter(c => c.owner !== faction).sort((a, b) => a.soldiers - b.soldiers);
    const troops = Math.floor((from.soldiers - 1000) / 100) * 100;
    const target = targets.find(to => !attackError(s, from.id, to.id, troops, faction) && forecast(s, from.id, to.id, troops).ratio >= 1.3);
    if (target) { resolveAttack(s, from.id, target.id, troops, faction); actions--; }
  }
  for (const c of ownedCities(s, faction).filter(c => !c.acted).sort((a, b) => a.soldiers - b.soldiers)) {
    if (!actions) break;
    const border = c.neighbors.some(id => cityById(s, id).owner !== faction);
    if (border && f.gold >= 450 && f.food >= 1200 && c.morale >= 30) {
      f.gold -= 450; f.food -= 1200; c.soldiers += 2500; c.morale -= 5;
    } else if (c.market < 5 && f.gold >= 400) {
      f.gold -= 400; c.market++;
    } else continue;
    c.acted = true;
    actions--;
  }
}
export function endTurn(s) {
  if (s.status !== 'playing') throw new Error('종료된 게임입니다.');
  if (s.battle) throw new Error('진행 중인 전투를 먼저 마쳐 주세요.');
  // Reset AI commands before its turn, preserving captures made by the player.
  for (const c of s.cities) if (c.owner !== s.player) c.acted = false;
  for (const faction of ['wei', 'shu', 'wu']) {
    if (faction !== s.player && s.status === 'playing') aiTurn(s, faction);
  }
  if (s.status !== 'playing') return;
  s.turn++;
  if (++s.month > 12) { s.month = 1; s.year++; }
  for (const faction of ['wei', 'shu', 'wu']) {
    const gain = income(s, faction);
    const f = s.factions[faction];
    f.gold += gain.gold;
    f.food += gain.food;
    if (f.food < 0) {
      f.food = 0;
      for (const c of ownedCities(s, faction)) c.soldiers = Math.max(500, Math.floor(c.soldiers * .85));
      if (faction === s.player) log(s, '군량이 바닥나 병사 15%가 이탈했습니다. 농업을 개발하세요.', 'battle');
    }
  }
  for (const c of s.cities) { c.acted = false; c.morale = Math.min(100, c.morale + 2); }
  s.ap = 3;
  s.usedOfficers = [];
  queueStory(s);
  log(s, `${s.year}년 ${s.month}월. 세금과 수확이 들어왔습니다. 새로운 명령을 내리십시오.`, 'season');
  checkOutcome(s);
}

export function serialize(s) { return JSON.stringify(s); }
export function deserialize(raw) {
  const s = JSON.parse(raw);
  if (!s || s.version !== 1 || !['shu', 'wei', 'wu'].includes(s.player) || !['playing', 'victory', 'defeat'].includes(s.status)) throw new Error('저장 파일을 읽을 수 없습니다.');
  if (!Number.isInteger(s.ap) || s.ap < 0 || s.ap > 3 || !Number.isInteger(s.month) || s.month < 1 || s.month > 12 || !Number.isInteger(s.year) || !Number.isInteger(s.turn) || !Number.isInteger(s.seed)) throw new Error('저장 데이터가 올바르지 않습니다.');
  if (!Array.isArray(s.cities) || s.cities.length !== CITIES.length || new Set(s.cities.map(c => c.id)).size !== CITIES.length || !Array.isArray(s.log) || !Array.isArray(s.pool)) throw new Error('저장 데이터가 올바르지 않습니다.');
  for (const id of ['shu', 'wei', 'wu']) {
    const f = s.factions?.[id];
    if (!f || !Number.isFinite(f.gold) || f.gold < 0 || !Number.isFinite(f.food) || f.food < 0 || !Array.isArray(f.officers) || f.officers.some(o => !OFFICERS[o])) throw new Error('세력 데이터를 읽을 수 없습니다.');
  }
  for (const c of s.cities) {
    const original = CITIES.find(o => o.id === c.id);
    if (!original || !Object.hasOwn(FACTIONS, c.owner) || !Number.isInteger(c.soldiers) || c.soldiers < 0 || !Number.isFinite(c.morale) || c.morale < 0 || c.morale > 100 || ['farm', 'market', 'fort'].some(k => !Number.isInteger(c[k]) || c[k] < 1 || c[k] > 5)) throw new Error('도시 데이터를 읽을 수 없습니다.');
    Object.assign(c, { name: original.name, region: original.region, x: original.x, y: original.y, neighbors: [...original.neighbors], terrain: original.terrain, acted: Boolean(c.acted) });
  }
  if (!cityById(s, s.selected) || s.pool.some(id => !OFFICERS[id])) throw new Error('저장 데이터가 올바르지 않습니다.');
  s.log = s.log.filter(l => typeof l.text === 'string' && typeof l.type === 'string').slice(0, 50);
  // Additive migration: campaigns saved before stories and battles remain playable.
  s.trust ??= {};
  s.usedOfficers ??= [];
  s.battle ??= null;
  s.story ??= {pending:'intro',branch:null,due:0,done:[],conquest:null};
  if (typeof s.trust!=='object' || Array.isArray(s.trust) || Object.entries(s.trust).some(([id,n])=>!Object.hasOwn(OFFICERS,id)||!Number.isInteger(n)||n<0||n>3) || !Array.isArray(s.usedOfficers) || s.usedOfficers.some(id=>!s.factions[s.player].officers.includes(id))) throw new Error('장수 기록이 올바르지 않습니다.');
  if (![null,'intro','echo','conquest'].includes(s.story.pending) || ![null,'people','arms','plan'].includes(s.story.branch) || !Number.isInteger(s.story.due) || !Array.isArray(s.story.done) || s.story.done.some(id=>!['intro','echo','conquest'].includes(id)) || (s.story.conquest && !cityById(s,s.story.conquest))) throw new Error('이야기 기록이 올바르지 않습니다.');
  if (s.battle) {
    const b=s.battle, from=cityById(s,b.from), to=cityById(s,b.to);
    if (s.status!=='playing'||!from||!to||from.owner!==s.player||to.owner!==b.owner||b.owner===s.player||!from.neighbors.includes(to.id)||!s.factions[s.player].officers.includes(b.commander)||!s.usedOfficers.includes(b.commander)||(b.defender!==null&&!Object.hasOwn(OFFICERS,b.defender))||!Object.hasOwn(ORDERS,b.intent)||!Array.isArray(b.history)||b.history.length>5) throw new Error('전투 기록이 올바르지 않습니다.');
    for(const key of ['sent','troops','enemy','initialEnemy','round','focus','morale','enemyMorale']) if(!Number.isInteger(b[key])||b[key]<0) throw new Error('전투 수치가 올바르지 않습니다.');
    if(b.sent<1000||b.troops>b.sent||b.enemy>b.initialEnemy||b.initialEnemy<1||b.round<1||b.round>5||b.focus>2||b.morale>100||b.enemyMorale>100||b.enemy!==to.soldiers||typeof b.skillUsed!=='boolean') throw new Error('전투 수치가 올바르지 않습니다.');
  }
  return s;
}

export function availableCommanders(s) {
  return s.factions[s.player].officers.filter(id => !s.usedOfficers.includes(id));
}

function nextEnemyOrder(s) {
  return ['charge','feint','guard'][Math.floor(random(s) * 3)];
}

export function beginBattle(s, fromId, toId, troops, commander) {
  ensureTurn(s);
  const error = attackError(s, fromId, toId, troops);
  if (error) throw new Error(error);
  if (!availableCommanders(s).includes(commander)) throw new Error('이번 달 출진 가능한 장수를 선택해 주세요.');
  const from = cityById(s,fromId), to = cityById(s,toId);
  const defender = s.factions[to.owner]?.officers.slice().sort((a,b)=>OFFICERS[b].war-OFFICERS[a].war)[0] || null;
  from.soldiers -= troops;
  from.acted = true;
  s.ap--;
  s.factions[s.player].food -= Math.ceil(troops * .2);
  s.usedOfficers.push(commander);
  s.battle = {from:fromId,to:toId,commander,defender,owner:to.owner,sent:troops,troops,enemy:to.soldiers,initialEnemy:to.soldiers,morale:85,enemyMorale:80,focus:2,skillUsed:false,round:1,intent:nextEnemyOrder(s),history:[]};
  log(s, `${OFFICERS[commander].name}, ${from.name}에서 ${to.name}(으)로 출진. “${PERSONAS[commander].voice}”`, 'battle');
  return s.battle;
}

export function battleOrder(s, order) {
  const b = s.battle;
  if (!b || s.status !== 'playing') throw new Error('진행 중인 전투가 없습니다.');
  if (!Object.hasOwn(ORDERS,order) && order !== 'hero' && order !== 'retreat') throw new Error('전술을 선택해 주세요.');
  if (order === 'retreat') return finishBattle(s,false,true);
  if (order === 'hero' && b.skillUsed) throw new Error('고유기는 전투당 한 번 사용할 수 있습니다.');
  if (order === 'feint' && !b.focus) throw new Error('계략이 부족합니다. 방진으로 정비하세요.');
  const leader = OFFICERS[b.commander], persona = PERSONAS[b.commander];
  const enemy = OFFICERS[b.defender] || {name:'수비대장',war:72,int:68};
  const target = cityById(s,b.to);
  const chosen = order === 'hero' ? persona.order : order;
  const tactic = ORDERS[chosen], enemyTactic = ORDERS[b.intent];
  const counter = tactic.beats === b.intent, countered = enemyTactic.beats === chosen;
  const skill = order === 'hero';
  const before = {troops:b.troops,enemy:b.enemy,morale:b.morale,enemyMorale:b.enemyMorale};
  if (skill) {b.skillUsed=true;b.morale=Math.min(100,b.morale+persona.rally);}
  else if (order === 'feint') b.focus--;
  else if (order === 'guard') {b.focus=Math.min(2,b.focus+1);b.morale=Math.min(100,b.morale+8);}
  const stat = chosen === 'feint' ? leader.int : leader.war;
  const enemyStat = b.intent === 'feint' ? enemy.int : enemy.war;
  const trust = s.trust[b.commander] || 0;
  const boost = skill ? persona.burst : 1 + (chosen === persona.order ? persona.bonus : 0);
  const cover = 1 + target.fort * .07 + (target.terrain === '산악' ? .10 : 0) + (target.owner === 'wu' ? .10 : 0);
  const attack = b.troops * (.65+stat/100) * tactic.rate * boost * (counter?1.4:countered?.8:1) * (.65+b.morale/150) * (1+trust*.05) * (.93+random(s)*.14) * (b.intent==='guard'&&chosen!=='feint'?.5:1) / cover;
  const defense = b.enemy * (.65+enemyStat/100) * enemyTactic.rate * (countered?1.3:counter?.85:1) * (.65+b.enemyMorale/150) * (skill?persona.shield:tactic.shield) * (.93+random(s)*.14);
  const dealt = Math.min(b.enemy,Math.max(1,Math.round(attack)));
  const received = Math.min(b.troops,Math.max(1,Math.round(defense)));
  b.enemy -= dealt;
  b.troops -= received;
  b.enemyMorale = Math.max(0,b.enemyMorale-Math.round(dealt/b.initialEnemy*55)-(counter?7:0)-(skill?b.commander==='zhangfei'?22:12:0));
  b.morale = Math.max(0,b.morale-Math.round(received/b.sent*55)-(countered?7:0));
  const label = skill ? persona.skill : tactic.name;
  const line = skill ? `${leader.name}의 ${persona.skill}! “${characterLine(b.commander,'hero')}”` : counter ? `${leader.name}의 ${label}, 적의 ${enemyTactic.name}을 간파했다!` : countered ? `${enemy.name}의 ${enemyTactic.name}에 ${leader.name}의 진형이 흔들린다.` : `${leader.name}의 ${label}. 양군이 정면으로 맞부딪쳤다.`;
  b.history.unshift({round:b.round,order,label,line,dealt,received,counter,countered});
  b.last = {before,dealt,received,label,line};
  cityById(s,b.to).soldiers = b.enemy;
  const won = b.enemy <= b.initialEnemy*.1 || b.enemyMorale <= 15;
  const lost = b.troops <= b.sent*.1 || b.morale <= 15;
  if (won || lost || b.round >= 5) {
    const advantage = b.troops*(.65+leader.war/100)*(.5+b.morale/100) > b.enemy*cover*(.65+enemy.war/100)*(.5+b.enemyMorale/100);
    return finishBattle(s,!lost && (won || (b.round>=5 && advantage && b.enemy < b.initialEnemy*.7)));
  }
  b.round++;
  b.intent = nextEnemyOrder(s);
  return {finished:false,...b.last};
}

function finishBattle(s,won,retreated=false) {
  const b=s.battle, from=cityById(s,b.from), to=cityById(s,b.to);
  let survivors=b.troops;
  if (retreated) survivors=Math.floor(survivors*.95);
  if (won) {
    to.owner=s.player;to.soldiers=survivors;to.morale=Math.max(40,to.morale-15);to.fort=Math.max(1,to.fort-1);to.acted=true;
    s.factions[s.player].gold+=250;
    s.trust[b.commander]=Math.min(3,(s.trust[b.commander]||0)+1);
    if (!s.story.conquest) s.story.conquest=to.id;
  } else {
    from.soldiers+=survivors;
    to.soldiers=b.enemy;
  }
  const result={finished:true,won,retreated,from:from.name,to:to.name,faction:s.player,defender:b.owner,sent:b.sent,survivors,lost:b.sent-survivors,commander:b.commander,history:b.history,loot:won?250:0};
  log(s,`${OFFICERS[b.commander].name}의 ${to.name} 전투 ${won?'승리! 전리품 금 250, 신뢰 +1.':retreated?'철수. 잔존 병력 95% 귀환.':'패배. 생존 병력 귀환.'}`,'battle');
  s.battle=null;
  checkOutcome(s);
  queueStory(s);
  return result;
}

function queueStory(s) {
  if (s.story.pending || s.status!=='playing') return;
  if (s.story.branch && s.turn>=s.story.due && !s.story.done.includes('echo')) s.story.pending='echo';
  else if (s.story.conquest && !s.story.done.includes('conquest')) s.story.pending='conquest';
}
export function storyChoiceError(s,index) {
  if(s.status!=='playing') return '종료된 게임입니다.';
  if(s.battle) return '진행 중인 전투를 먼저 마쳐 주세요.';
  const choice=storyFor(s)?.choices[index];
  if(!choice) return '선택할 수 없는 이야기입니다.';
  const f=s.factions[s.player];
  if(f.gold+(choice.effect.gold||0)<0) return '금이 부족합니다.';
  if(f.food+(choice.effect.food||0)<0) return '군량이 부족합니다.';
  return '';
}
export function chooseStory(s,index) {
  const error=storyChoiceError(s,index);
  if(error) throw new Error(error);
  const chapter=storyFor(s), choice=chapter.choices[index], effect=choice.effect;
  const f=s.factions[s.player];
  const destination=cityById(s,chapter.city||FACTIONS[s.player].home);
  const city=destination.owner===s.player?destination:ownedCities(s)[0];
  f.gold+=effect.gold||0;f.food+=effect.food||0;
  city.soldiers+=effect.soldiers||0;
  for(const key of ['farm','market','fort']) city[key]=Math.min(5,city[key]+(effect[key]||0));
  city.morale=Math.max(0,Math.min(100,city.morale+(effect.morale||0)));
  if(effect.moraleAll) for(const c of ownedCities(s)) c.morale=Math.min(100,c.morale+effect.moraleAll);
  s.trust[choice.hero]=Math.min(3,(s.trust[choice.hero]||0)+(effect.trust||1));
  s.story.done.push(chapter.id);
  s.story.pending=null;
  if(chapter.id==='intro') {s.story.branch=choice.id;s.story.due=s.turn+2;}
  log(s,`${chapter.title} — ${choice.title} ${OFFICERS[choice.hero].name}의 신뢰가 깊어졌다.`,'officer');
  queueStory(s);
  return {...choice,chapter:chapter.title,city:city.id};
}
