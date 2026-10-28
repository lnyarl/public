// Reused across the army list, officer roster and detail panel.
export const ARMY_STATES={stationed:'주둔 중',march:'이동 중',return:'철수 중',siege:'성 공격',field:'야외 전투',duel:'야외 전투'};
export const TERRAIN_NAMES={산악:'산지',수변:'강가',구릉:'언덕',평야:'평야',숲:'숲'};
const NEWS_CATEGORIES={
 march:['이동','➜'],arrival:['도착','⚑'],retreat:['철수','↩'],
 engage:['교전 시작','⚔'],hit:['전투','⚔'],intercept:['부대 조우','⚔'],defeat:['부대 전멸','⚠'],
 capture:['영지 점령','⚑'],supply:['보급 부족','⚠'],trade:['교역','⇄'],diplomacy:['외교','✉'],
 policy:['방침 변경','⚙'],project:['사업','⚒'],work:['사업 완료','✓'],hire:['지휘관 합류','♟'],
 calendar:['달력','◷'],world:['세계 안내','◎'],outcome:['왕국의 운명','♛']
};
export function newsCategory(event,player){
 const [label,icon]=event.kind==='capture'&&event.other===player?['영지 상실','⚠']:NEWS_CATEGORIES[event.kind]||['기타 소식','◆'];
 return {label,icon};
}
// Existing saves retain their original reports; only their displayed vocabulary changes.
export function reportText(text){
 return String(text??'').replace(/군량|공성|야전|공방|초빙|징집 피로|예비 인력|방비|구휼|농본|통상|안민|장수|군주|천하/g,word=>({군량:'식량',공성:'성 공격',야전:'야외 전투',공방:'전투',초빙:'등용','징집 피로':'모병 피로','예비 인력':'모병 가능 인구',방비:'방어',구휼:'구호',농본:'식량 중심',통상:'수입 중심',안민:'민심 중심',장수:'지휘관',군주:'영주',천하:'세계'}[word]));
}
export const STAT_LABELS={agriculture:'농업',commerce:'상업',defense:'방어',morale:'민심'};
export const PROJECT_HELP={farm:'거점과 주변 땅의 식량 생산을 늘립니다.',market:'거점과 주변 땅의 금 수입을 늘립니다.',fort:'거점의 방어력을 높입니다.',relief:'식량을 나눠 민심을 회복하고 모병 피로를 줄입니다.',levy:'인구와 식량을 사용해 병사를 모집합니다.'};
