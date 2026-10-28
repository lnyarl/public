export const MATERIALS={food:{name:'식량',weight:.05},timber:{name:'목재',weight:1},goods:{name:'생활용품',weight:2}};
export const MATERIAL_IDS=Object.keys(MATERIALS);
export const EMPTY_STOCK=()=>({food:0,timber:0,goods:0});
export const SITE_RULES={food:{name:'식량지',rate:150,max:1200,regen:50},timber:{name:'벌목지',rate:8,max:5000,regen:4}};
export const PARTY_STATES={outbound:'현장으로 이동',working:'채집 중',returning:'귀환 중',unloading:'하역 대기',waiting:'경로 대기',done:'귀환 완료'};
export const RESOURCE_POLICIES={
 balanced:{name:'균형 운영',description:'식량과 목재를 고르게 확보',foodDays:30,timber:240},
 food:{name:'식량 비축',description:'먹을거리를 넉넉히 비축',foodDays:45,timber:0},
 timber:{name:'목재 확보',description:'식량을 지키며 목재를 우선 확보',foodDays:7,timber:360},
 rest:{name:'인력 보전',description:'새 채집을 멈추고 작업대를 귀환',foodDays:0,timber:0}
};
