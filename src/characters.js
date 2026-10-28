// Original dialogue written for this fictional campaign.
export const PERSONAS = {
  liubei: { bio:'패업보다 사람을 먼저 보는 군주. 그 선택의 대가는 늘 자신이 치른다.', voice:'성을 잃으면 다시 얻으면 되오. 사람을 잃으면 무엇으로 천하를 세우겠소.', skill:'인의의 깃발', order:'guard', bonus:.18, burst:1.3, shield:.4, rally:25, detail:'방진 피해 +18%. 고유기: 아군 사기 +25, 받는 피해 60% 감소.' },
  guanyu: { bio:'한 번 한 약속은 목숨보다 무겁다. 단단한 적진일수록 먼저 말을 달린다.', voice:'이 관운장이 앞을 열겠소. 형님은 뒤를 부탁드리오.', skill:'청룡언월', order:'charge', bonus:.25, burst:2.1, shield:.85, rally:8, detail:'돌격 피해 +25%. 고유기: 강력한 일격으로 적 사기를 무너뜨린다.' },
  zhangfei: { bio:'성미는 불같으나 백성을 버리자는 말에는 누구보다 먼저 화를 낸다.', voice:'누가 감히 우리 형님 앞을 막느냐! 나 장익덕이 여기 있다!', skill:'장판의 호통', order:'charge', bonus:.2, burst:1.6, shield:.7, rally:18, detail:'돌격 피해 +20%. 고유기: 아군 사기 +18, 적 사기 추가 감소.' },
  zhugeliang: { bio:'칼을 뽑기 전 이미 퇴로와 군량, 내일의 바람까지 살핀다.', voice:'병력이 적다는 것이 패할 이유는 아닙니다. 싸울 곳을 우리가 고르면 됩니다.', skill:'팔진도', order:'feint', bonus:.35, burst:1.9, shield:.3, rally:12, detail:'계략 피해 +35%. 고유기: 팔진도로 공격하고 받는 피해 70% 감소.' },
  caocao: { bio:'난세의 재능이라면 출신을 묻지 않는다. 주저할 때조차 다음 수를 계산한다.', voice:'의심할 것이면 쓰지 않고, 쓸 것이면 맡긴다. 이번 판은 그대에게 맡기지.', skill:'패왕의 군령', order:'charge', bonus:.15, burst:1.6, shield:.6, rally:20, detail:'돌격 피해 +15%. 고유기: 군령으로 사기 +20, 공방을 함께 강화.' },
  xiahoudun: { bio:'조조를 향한 믿음은 흔들리지 않는다. 물러설 때도 가장 뒤에 남는다.', voice:'맹덕, 여기는 내가 지킨다. 뒤를 돌아보지 마라.', skill:'독안의 결의', order:'guard', bonus:.3, burst:1.5, shield:.2, rally:15, detail:'방진 피해 +30%. 고유기: 받는 피해 80% 감소, 사기 +15.' },
  zhangliao: { bio:'적이 진형을 다 갖추기 전, 한 줌의 기병으로 전장의 속도를 바꾼다.', voice:'적이 많다고? 그래서 선봉부터 꺾는 것이다.', skill:'질풍 기습', order:'charge', bonus:.3, burst:2.0, shield:.65, rally:10, detail:'돌격 피해 +30%. 고유기: 기습으로 적진을 깊게 관통.' },
  xunyu: { bio:'조조의 패업과 한실의 미래 사이에서, 말 한마디에도 무게를 싣는다.', voice:'이기는 것만으로는 부족합니다. 이긴 뒤에 무엇을 남길지 보셔야 합니다.', skill:'왕좌의 책', order:'feint', bonus:.3, burst:1.7, shield:.4, rally:16, detail:'계략 피해 +30%. 고유기: 보급과 진형을 정비하며 적을 압박.' },
  sunquan: { bio:'아버지와 형이 남긴 강동. 젊은 군주는 지키는 법과 나아가는 법을 배운다.', voice:'강동은 내 한 사람의 것이 아니오. 함께 지켰으니, 함께 결정하겠소.', skill:'강동의 결속', order:'guard', bonus:.25, burst:1.5, shield:.35, rally:22, detail:'방진 피해 +25%. 고유기: 사기 +22, 강동의 진형을 결속.' },
  zhouyu: { bio:'자존심 높은 젊은 도독. 장강의 바람과 적의 망설임을 함께 읽는다.', voice:'동풍만 기다리는 줄 아셨습니까? 적이 기다리게 만드는 것도 계책이지요.', skill:'적벽의 불씨', order:'feint', bonus:.35, burst:2.2, shield:.65, rally:10, detail:'계략 피해 +35%. 고유기: 화공으로 큰 피해와 사기 충격.' },
  ganning: { bio:'거친 말투와 방울 소리. 정식 군령보다 위험한 틈을 먼저 알아본다.', voice:'백 명이면 됩니다. 시끄럽게 돌아올 테니 성문이나 열어 두십시오.', skill:'금범의 야습', order:'charge', bonus:.3, burst:2.0, shield:.55, rally:8, detail:'돌격 피해 +30%. 고유기: 야습으로 적의 허를 찌른다.' },
  lusu: { bio:'싸움 밖에서 이길 길을 찾는다. 동맹과 보급도 그에게는 하나의 전장이다.', voice:'지금 베어 버릴 적과, 내일 손을 잡을 사람을 구별해야 합니다.', skill:'장강의 연환', order:'feint', bonus:.25, burst:1.5, shield:.35, rally:20, detail:'계략 피해 +25%. 고유기: 사기 +20, 아군 손실을 억제.' },
  zhaoyun: { bio:'말수가 적고, 맡은 이를 끝까지 데려온다. 위험한 퇴로에서 더 빛나는 창.', voice:'주공께 돌아가겠다고 약속했습니다. 이 창이 꺾이기 전에는 누구도 남겨 두지 않습니다.', skill:'일신시담', order:'guard', bonus:.3, burst:1.8, shield:.25, rally:15, detail:'방진 피해 +30%. 고유기: 공방을 함께 지키는 구원 돌파.' },
  pangtong: { bio:'옷차림과 태도는 초라해도, 남들이 당연히 여기는 길을 먼저 의심한다.', voice:'정면 길이 훌륭하군요. 그래서 저는 다른 길을 쓰겠습니다.', skill:'봉추의 연계', order:'feint', bonus:.4, burst:2.0, shield:.45, rally:8, detail:'계략 피해 +40%. 고유기: 연계로 적진을 교란.' },
  huangzhong: { bio:'늙었다는 말을 들으면 활시위를 먼저 당긴다. 한 발을 쏠 때는 서두르지 않는다.', voice:'이 활을 당길 수 있는 동안은, 내 나이를 묻지 마시오.', skill:'백보천양', order:'charge', bonus:.25, burst:2.2, shield:.75, rally:8, detail:'돌격 피해 +25%. 고유기: 명궁의 일격으로 적 지휘부 타격.' },
  machao: { bio:'서량의 바람처럼 거칠고 빠르다. 기다리는 싸움보다 한 번의 돌파를 택한다.', voice:'고삐를 놓아라. 서량 기병은 멈춰 서서 싸우지 않는다.', skill:'서량 철기', order:'charge', bonus:.35, burst:2.1, shield:.8, rally:12, detail:'돌격 피해 +35%. 고유기: 철기로 적 전열을 압도.' },
  xuhuang: { bio:'호통보다 진형, 감정보다 군율. 쉽게 흔들리지 않는 도끼와 같은 장수.', voice:'서두를 필요 없다. 대열을 맞춰라. 빈틈은 그다음에 온다.', skill:'불동의 진', order:'guard', bonus:.35, burst:1.6, shield:.2, rally:12, detail:'방진 피해 +35%. 고유기: 받는 피해 80% 감소.' },
  luxun: { bio:'젊다는 이유로 무시당해도, 적이 지칠 때까지 기다릴 수 있는 인내가 있다.', voice:'지금 불을 놓으면 작은 승리입니다. 조금만 더 기다리십시오.', skill:'연영화계', order:'feint', bonus:.35, burst:2.0, shield:.5, rally:10, detail:'계략 피해 +35%. 고유기: 이어진 적진을 화계로 무너뜨린다.' },
  huangyueying: { bio:'남들이 이상하다고 부르는 물건에서 성을 열 방법을 찾아낸다.', voice:'힘으로 밀지 마세요. 저 경첩 하나가 병사 천 명의 일을 해 줄 겁니다.', skill:'기교 공성', order:'feint', bonus:.4, burst:1.9, shield:.4, rally:12, detail:'계략 피해 +40%. 고유기: 공성 기구로 적을 교란.' },
  taishici: { bio:'받은 은혜와 맺은 약속을 잊지 않는다. 활과 창 모두에 자신이 있다.', voice:'돌아오겠다고 했으니 돌아왔습니다. 이제 어느 성문을 열면 되겠습니까?', skill:'신의의 선봉', order:'charge', bonus:.3, burst:1.9, shield:.5, rally:15, detail:'돌격 피해 +30%. 고유기: 사기 +15, 선봉 돌파.' }
};

export const ORDERS = {
  charge: { name:'돌격', han:'突', description:'무력으로 압박 · 계략에 강함', beats:'feint', rate:.24, shield:1.12 },
  feint: { name:'계략', han:'謀', description:'지력으로 교란 · 방진에 강함 · 계략 1회 소모', beats:'guard', rate:.22, shield:1 },
  guard: { name:'방진', han:'陣', description:'피해 절반 · 돌격 저지 · 사기·계략 회복', beats:'charge', rate:.13, shield:.5 }
};

const BATTLE_LINES = {
  liubei:{hero:'쓰러진 이를 두고 가지 마시오. 대열을 다시 세우시오.',win:'이 성을 지킨 사람들도 이제 우리의 백성이오. 칼을 거두시오.',lose:'내가 앞장서겠소. 살아 있는 병사부터 데려갑시다.'},
  guanyu:{hero:'청룡도 앞에서 물러서지 않는 자, 이 관운장이 기억하겠소!',win:'성문은 열었소. 이제 우리가 한 약속을 지킬 차례요.',lose:'잠시 창을 거두겠소. 이 빚은 다음 전장에서 갚으리다.'},
  zhangfei:{hero:'겁먹지 마라! 나 장익덕이 너희 앞에 있다!',win:'하하! 형님께 전하라. 성문은 이 아우가 열었다고!',lose:'먼저 가라! 뒤따라오는 놈들은 내가 막는다!'},
  zhugeliang:{hero:'진문이 닫혔습니다. 적이 강한 곳과 싸울 이유가 없지요.',win:'성 하나가 전부는 아닙니다. 이제 이곳을 다음 수의 시작으로 삼겠습니다.',lose:'이번 판단은 제 잘못입니다. 병사들을 거두고 다른 길을 찾겠습니다.'},
  caocao:{hero:'전군, 군령을 들어라. 오늘 이 한 수로 천하의 판을 바꾼다!',win:'문을 열어 준 자를 찾게. 성보다 쓸 만한 사람을 얻고 싶군.',lose:'좋다. 오늘 이긴 자가 내일도 이긴다는 법은 없지.'},
  xiahoudun:{hero:'내 눈이 하나라고 빈틈까지 보이지 않을 줄 알았느냐!',win:'맹덕에게 전해라. 뒤는 걱정하지 말라고.',lose:'대열을 지켜라. 한 놈이라도 더 데려간다.'},
  zhangliao:{hero:'따라올 자만 따라와라. 적이 돌아보기 전에 끝낸다!',win:'병력의 수가 아니라 움직이는 때가 승부를 갈랐군.',lose:'흩어지지 마라. 다음 기습을 위해 살아 돌아간다.'},
  xunyu:{hero:'상대가 바라는 싸움을 해 줄 필요는 없습니다. 진형을 바꾸십시오.',win:'공을 다투기 전에 군량부터 챙기겠습니다. 다음 달도 싸워야 하니까요.',lose:'급히 쓰지 못할 병력을 보존한 것에도 의미는 있습니다.'},
  sunquan:{hero:'선대의 깃발이 여기 있다. 강동의 군사들이여, 대열을 지켜라!',win:'오늘의 승리를 형님께서도 보셨겠지. 하지만 이제부터는 내 책임이오.',lose:'더는 병사를 잃지 않겠소. 물러날 때를 내가 결정하리다.'},
  zhouyu:{hero:'불씨는 이미 적진에 들어갔다. 이제 바람을 보아라!',win:'불길이 멎으면 적의 백성도 구하라. 도독의 승리는 거기까지다.',lose:'바람이 우리 편인 날만 싸울 수는 없지. 군을 돌린다.'},
  ganning:{hero:'방울 소리가 들리느냐? 늦었다. 금범은 이미 네 뒤에 있다!',win:'주공, 약속대로 시끄럽게 돌아왔습니다!',lose:'살아 돌아가면 또 싸울 수 있다. 배를 돌려라!'},
  lusu:{hero:'적의 길을 끊고 우리의 길을 열겠습니다. 지금 진형을 잇지요.',win:'승리 다음에는 교섭이 옵니다. 사신을 보낼 준비를 하겠습니다.',lose:'다리까지 태우지는 맙시다. 다음에는 다른 방법도 있습니다.'}
};
export function characterLine(id,scene) {
  return BATTLE_LINES[id]?.[scene] || PERSONAS[id].voice;
}

export function domesticLine(faction,action,city) {
  const lines={
    shu:{farm:`${city}의 밭이 살아나면, 병사도 백성도 굶지 않습니다. 전쟁보다 먼저 지킬 일이 있지요.`,market:`${city}의 장터가 다시 열렸습니다. 백성이 머물 이유가 하나 더 생겼군요.`,levy:'병사들 이름부터 외워 두겠소. 목숨을 맡긴 이들을 숫자로만 부를 수야 없지.',fort:`${city}의 성벽을 보강했습니다. 하지만 성문 밖의 사람들도 잊지 마십시오.`},
    wei:{farm:`${city}의 둔전이 자리를 잡았습니다. 백성이 내년에도 씨를 뿌릴 수 있어야 패업도 이어집니다.`,market:'돈을 거두는 것보다 장부에 없는 부담을 없애는 일이 먼저입니다. 상인들과 약속부터 지켰습니다.',levy:'새로 온 병사들은 내가 훈련하마. 첫 전장에 나가기 전에는 쓰러지지 않는 법부터 가르치지.',fort:`${city}의 방비가 단단해졌습니다. 이 수비대 덕분에 다른 군사가 움직일 수 있겠군요.`},
    wu:{farm:`${city}의 수로를 정비했습니다. 장강의 물을 적에게만 쓸 이유는 없지요.`,market:'장강의 뱃길을 상인들에게도 열었습니다. 싸우지 않고 국력을 키울 길입니다.',levy:'새로 온 녀석들, 배 멀미부터 고쳐 놓겠습니다. 강동의 군사는 강 위에서도 서야 하니까요.',fort:`${city}의 방비를 살폈습니다. 버틸 성이 있으면 기다릴 계책도 세울 수 있습니다.`}
  };
  return lines[faction][action];
}
