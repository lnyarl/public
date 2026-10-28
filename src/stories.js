export const OPENINGS = {
  shu: { title:'신야의 마지막 등불', narrator:'북쪽에서 조조의 군세가 움직인다는 소식이 왔다. 성문 밖에는 피난민의 수레가 끝없이 늘어섰다. 유비의 막사에서는 세 개의 목소리가 부딪힌다.', speaker:'liubei', line:'백성을 데려가면 행군이 늦어지오. 그렇다고 두고 가면… 우리가 일으킨 깃발은 무엇이 되겠소?', choices:[
    { id:'people', hero:'liubei', title:'“문을 여시오. 함께 간다.”', line:'유비가 먼저 막사 밖으로 나섰다. 흙 묻은 노인의 손을 잡자, 뒤에 있던 사람들이 하나둘 무릎을 꿇었다.', effect:{food:-1600,moraleAll:10}, label:'군량 −1,600 · 모든 아군 민심 +10 · 유비 신뢰 +1', after:'이 선택의 소식이 피난민들 사이로 퍼집니다.' },
    { id:'arms', hero:'zhangfei', title:'장비에게 후위 병력을 맡긴다', line:'“형님은 백성을 챙기시오. 뒤에서 오는 놈들은 내가 맡겠소!” 장비는 술잔을 밀어 놓고 창을 집어 들었다.', effect:{gold:-300,soldiers:2000}, label:'금 −300 · 본거지 병력 +2,000 · 장비 신뢰 +1', after:'장비가 직접 훈련한 병사들이 주군의 명령을 기다립니다.' },
    { id:'plan', hero:'zhugeliang', title:'제갈량에게 남쪽 보급로를 맡긴다', line:'“먼저 배와 곡식을 모으겠습니다. 백성을 지키려면, 지킬 수 있는 길부터 만들어야지요.” 부채 끝이 강하를 가리켰다.', effect:{gold:-400,food:3200}, label:'금 −400 · 군량 +3,200 · 제갈량 신뢰 +1', after:'강하를 향한 연락선이 밤 강을 건너갑니다.' }
  ]},
  wei: { title:'허창, 누구를 위한 천하인가', narrator:'남정의 지도가 펼쳐졌다. 조조는 붉은 돌을 장강 위에 내려놓았다. 하후돈은 군사를 청했고, 순욱은 백성의 이름이 적힌 장부를 내밀었다.', speaker:'caocao', line:'천하는 기다려 주지 않는다. 하지만 우리가 지나간 자리마저 적이 된다면, 이 많은 군사가 무슨 소용이겠나?', choices:[
    { id:'people', hero:'xunyu', title:'순욱의 둔전과 구휼안을 따른다', line:'순욱은 고개를 깊이 숙였다. “군량은 밭에서 나지만, 밭을 지키는 것은 신뢰입니다.”', effect:{gold:-400,farm:1,moraleAll:6}, label:'금 −400 · 본거지 농업 +1 · 모든 민심 +6 · 순욱 신뢰 +1', after:'둔전의 첫 수확은 두 달 뒤에 도착할 것입니다.' },
    { id:'arms', hero:'xiahoudun', title:'하후돈에게 선봉을 맡긴다', line:'“맹덕, 오래 기다렸지.” 하후돈은 성문 앞에서 투구를 썼다. 병사들은 그의 뒤에서 창끝을 들어 올렸다.', effect:{food:-1400,soldiers:2300}, label:'군량 −1,400 · 본거지 병력 +2,300 · 하후돈 신뢰 +1', after:'노장의 군율이 새 병사들을 바꿉니다.' },
    { id:'plan', hero:'zhangliao', title:'장료의 기습 작전을 지원한다', line:'“대군이 움직이면 적도 준비합니다. 소수가 먼저 길을 열겠습니다.” 조조가 웃으며 군자금을 내밀었다.', effect:{gold:-350,food:2800}, label:'금 −350 · 노획 군량 +2,800 · 장료 신뢰 +1', after:'장료의 기병이 적의 보급로를 향해 사라집니다.' }
  ]},
  wu: { title:'강동의 젊은 군주', narrator:'강물에는 아직 안개가 남아 있었다. 손권이 선대의 검을 내려놓자 주유, 감녕, 노숙이 서로 다른 내일을 말하기 시작했다.', speaker:'sunquan', line:'형님이었다면 망설이지 않았겠지. 하지만 이제 이 강동을 책임질 사람은 나요. 그대들의 말을 듣겠소.', choices:[
    { id:'people', hero:'lusu', title:'노숙의 교역과 구휼안을 택한다', line:'“장강은 장벽이면서 길이기도 합니다.” 노숙은 봉인된 서신을 내밀었다. 싸우지 않고 얻을 수 있는 것이 적혀 있었다.', effect:{gold:-450,market:1,moraleAll:6}, label:'금 −450 · 본거지 상업 +1 · 모든 민심 +6 · 노숙 신뢰 +1', after:'장강 상인들이 새로운 항로를 시험합니다.' },
    { id:'arms', hero:'ganning', title:'감녕의 수군을 지원한다', line:'“예법은 잘 모릅니다. 다만 싸움이라면 맡겨 주십시오.” 방울 소리가 멀어지자 손권의 입가에 처음으로 웃음이 번졌다.', effect:{food:-1200,soldiers:2100}, label:'군량 −1,200 · 본거지 병력 +2,100 · 감녕 신뢰 +1', after:'금범의 군사들이 강물 위에서 합을 맞춥니다.' },
    { id:'plan', hero:'zhouyu', title:'주유에게 강변의 준비를 맡긴다', line:'주유는 적의 선박이 아니라 강가의 갈대밭을 보고 있었다. “도독부에는 기름과 마른 장작을 보내 주십시오.”', effect:{gold:-400,food:3000}, label:'금 −400 · 비축 군량 +3,000 · 주유 신뢰 +1', after:'누군가는 그 준비를 지나친 걱정이라고 부릅니다.' }
  ]}
};

export function storyFor(s) {
  const progress = s.story;
  if (!progress.pending) return null;
  const opening = OPENINGS[s.player];
  if (progress.pending === 'intro') return { ...opening, id:'intro', chapter:'제1장 · 군주의 첫 결단' };
  const branch = opening.choices.find(c=>c.id===progress.branch) || opening.choices[0];
  if (progress.pending === 'echo') {
    const voices = { people:['돌아온 사람들','두 달 전 도왔던 이들이 성문에 다시 나타났다. 이번에는 빈 수레가 아니었다. 곡식과 종자, 그리고 군주의 약속을 기억하는 사람들이 함께였다.','우리가 지킨 것은 한 끼가 아니었군요. 이 사람들은 이제 우리 땅을 자기 땅이라 부릅니다.'], arms:['같은 밥을 먹는 군사들','새로 모인 병사들이 이제 장수의 구령에 한 몸처럼 움직인다. 그러나 군량 담당관은 비어 가는 창고를 걱정한다.','병사들은 잘 싸울 겁니다. 다만 싸운 뒤 돌아와 먹을 밥은 남겨 주십시오.'], plan:['밤 강을 건넌 서신','두 달 전 보낸 연락선이 돌아왔다. 적이 놓친 길이 지도 위에 새로 그어졌다. 계획은 이제 성과가 되어 돌아온다.','기다려 주셨군요. 이제 이 길은 우리 것이 되었습니다. 다음 수를 두실 때입니다.'] };
    const [title,narrator,line]=voices[branch.id];
    return {id:'echo',chapter:'제2장 · 그날의 선택이 돌아오다',title,narrator,speaker:branch.hero,line,choices:[
      {id:'honor',hero:branch.hero,title:'“그대의 판단이 옳았소. 계속 맡기겠소.”',line:'믿음을 확인한 장수는 대답 대신 고개를 숙였다. 이번에는 군주의 명령을 받는 자가 아니라, 같은 길을 고른 사람의 인사였다.',effect:{gold:500,food:1800,trust:2},label:'금 +500 · 군량 +1,800 · 장수 신뢰 +2 (최대 3)',after:'신뢰가 깊어질수록 출진 시 장수의 지휘력이 높아집니다.'},
      {id:'redirect',hero:opening.choices.find(c=>c.id==='arms').hero,title:'“성과는 군비로 돌리겠소.”',line:'장수는 잠시 입을 다물었다가 다시 지도를 펼쳤다. 난세에서는 옳은 선택도 누군가에게는 아쉬움으로 남는다.',effect:{soldiers:1800,food:-600},label:'군량 −600 · 본거지 병력 +1,800 · 선봉 장수 신뢰 +1',after:'군세는 커졌지만 처음의 약속은 다른 방향으로 흐릅니다.'}
    ]};
  }
  const advisors = {shu:['guanyu','zhangfei','zhugeliang'],wei:['caocao','xiahoudun','xunyu'],wu:['lusu','ganning','zhouyu']}[s.player];
  return {id:'conquest',chapter:'외전 · 새 깃발 아래',title:'성문이 열린 뒤',narrator:'성은 함락되었다. 그러나 성문 안에는 승리를 축하하는 사람보다, 내일을 두려워하는 사람이 더 많았다. 포로들과 곳간을 어떻게 할 것인가.',speaker:advisors[0],line:s.player==='shu'?'성을 얻었다고 마음까지 얻은 것은 아니오. 칼을 거둘 때도 의를 지켜야 하오.':s.player==='wei'?'우리가 이곳을 떠난 뒤에도 내 이름이 두려움으로만 남게 할 수는 없지.':'장강의 새 물길 하나를 얻었습니다. 이제 이 사람들이 우리 편이 되게 해야 합니다.',city:progress.conquest,choices:[
    {id:'mercy',hero:advisors[0],title:'포로를 풀어 주고 곳간을 연다',line:'문이 열렸다. 포로들은 믿기지 않는 표정으로 가족에게 달려갔다. 성벽 위의 새 깃발을 바라보는 눈빛이 조금 달라졌다.',effect:{food:-1000,morale:25},label:'군량 −1,000 · 점령 도시 민심 +25 · 장수 신뢰 +1',after:'오늘의 자비는 내일 이 도시를 지키는 이유가 됩니다.'},
    {id:'army',hero:advisors[1],title:'항복한 병사를 아군에 편입한다',line:'승전의 깃발 아래 낯선 창끝들이 모였다. 성의 군세는 커졌지만 백성들은 성문을 조심스럽게 걸어 잠갔다.',effect:{soldiers:2200,morale:-12},label:'점령 도시 병력 +2,200 · 민심 −12 · 장수 신뢰 +1',after:'당장의 전력과 백성의 마음 사이에서 전력을 택했습니다.'},
    {id:'rebuild',hero:advisors[2],title:'상인들을 불러 시장을 다시 연다',line:'전쟁 때문에 멈췄던 저울이 다시 움직였다. 성문으로 들어오는 첫 수레에는 군량 대신 천과 소금이 실려 있었다.',effect:{gold:-300,market:1,morale:8},label:'금 −300 · 점령 도시 상업 +1 · 민심 +8 · 장수 신뢰 +1',after:'전쟁의 흔적 위로 살아가는 소리가 돌아옵니다.'}
  ]};
}
