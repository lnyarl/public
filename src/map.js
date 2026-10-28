import { CITIES, FACTIONS, cityById } from './game.js';

export const LAND = [[55,70],[155,37],[262,72],[360,65],[450,90],[544,45],[638,38],[703,20],[798,45],[842,110],[813,160],[855,220],[836,290],[898,340],[883,398],[926,445],[944,525],[915,609],[854,647],[761,646],[691,686],[589,710],[500,697],[408,675],[338,622],[230,624],[154,587],[98,531],[66,446],[96,354],[54,280],[80,202],[38,153]];

function clip(points, a, b, limit) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    const dp = p[0] * a + p[1] * b - limit, dq = q[0] * a + q[1] * b - limit;
    if (dp <= .001) result.push(p);
    if ((dp < 0) !== (dq < 0)) {
      const t = dp / (dp - dq);
      result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return result;
}
const provinces = new Map(CITIES.map(c => {
  let points = LAND;
  for (const other of CITIES) {
    if (other === c) continue;
    const a = other.x - c.x, b = other.y - c.y;
    points = clip(points, a, b, (other.x ** 2 + other.y ** 2 - c.x ** 2 - c.y ** 2) / 2);
  }
  return [c.id, points.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')];
}));

function mountain(x, y, size, opacity = .5) {
  return `<g transform="translate(${x} ${y}) scale(${size})" opacity="${opacity}"><path d="M-28 16 -5-27 4-14 12-36 42 17Z" fill="#454a3c" stroke="#737363" stroke-width=".7"/><path d="m-5-27 5 28 12-37 7 34 23 19M-28 16-9 7 0 13 15 3 27 16" fill="none" stroke="#999581" stroke-width=".7"/><path d="m12-36-5 24 6-4 6 8" fill="#92907b" opacity=".5"/></g>`;
}
function trees(x, y) {
  return `<g fill="#7c8567" opacity=".24" transform="translate(${x} ${y})"><path d="m0-10-6 12h12ZM0-5-8 13H8ZM18-15 10 0h16ZM18-7 8 13h20ZM-18-6-24 6h12Z"/></g>`;
}

export function renderMap(s, { mode = null, source = null, showRoutes = false, feedback = null } = {}) {
  if (feedback && Date.now()-feedback.at>2200) feedback=null;
  const selected = cityById(s, s.selected);
  const origin = cityById(s, source || s.selected);
  const edges = [];
  for (const c of s.cities) for (const id of c.neighbors) {
    if (c.id > id) continue;
    const to = cityById(s, id);
    const active = c.id === origin.id || to.id === origin.id;
    edges.push(`<path class="route ${active ? 'route-active' : ''}" d="M${c.x} ${c.y}Q${(c.x+to.x)/2+12} ${(c.y+to.y)/2-9} ${to.x} ${to.y}"/>`);
  }
  const mountains = [[116,154,1.15],[182,181,.9],[218,154,.7],[229,248,.75],[186,267,.9],[115,292,.8],[200,344,.85],[151,365,.65],[103,418,.65],[195,512,.7],[228,554,.6],[326,453,.6],[352,281,.55],[375,146,.55],[446,120,.45],[510,80,.4],[613,62,.4],[666,210,.4],[330,587,.5]];
  return `<svg id="campaign-map" viewBox="0 0 980 740" role="group" aria-label="천하 지도. 도시를 선택하면 정보와 명령을 확인할 수 있습니다.">
    <defs>
      <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".10"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
      <radialGradient id="ocean"><stop stop-color="#424d43"/><stop offset="1" stop-color="#292f2b"/></radialGradient>
      <radialGradient id="land"><stop stop-color="#787962"/><stop offset="1" stop-color="#5b6150"/></radialGradient>
      <linearGradient id="river"><stop stop-color="#77958b"/><stop offset="1" stop-color="#a8b2a0"/></linearGradient>
      <clipPath id="land-clip"><polygon points="${LAND.map(p => p.join(',')).join(' ')}"/></clipPath>
      <pattern id="water" width="32" height="24" patternUnits="userSpaceOnUse"><path d="M0 12q8-4 16 0t16 0" fill="none" stroke="#a6b2a4" opacity=".08" stroke-width=".7"/></pattern>
    </defs>
    <rect width="980" height="740" fill="url(#ocean)"/>
    <rect width="980" height="740" fill="url(#water)"/>
    <polygon points="${LAND.map(p => p.join(',')).join(' ')}" fill="url(#land)" stroke="#a8a38b" stroke-width="1.6"/>
    <g clip-path="url(#land-clip)">
      ${s.cities.map(c => `<polygon class="province ${c.id === selected.id ? 'province-selected' : ''}" points="${provinces.get(c.id)}" fill="${FACTIONS[c.owner].color}" fill-opacity="${c.id === selected.id ? '.33' : '.13'}" stroke="${c.id === selected.id ? '#e8d2a3' : '#b4b399'}" stroke-opacity="${c.id === selected.id ? '.8' : '.28'}" stroke-width="${c.id === selected.id ? 1.8 : .8}"/>`).join('')}
      <g filter="url(#paper)"><rect width="980" height="740" fill="#b5ab86" opacity=".13"/></g>
      <g class="terrain">${mountains.map(p => mountain(...p)).join('')}${[[350,370],[330,520],[468,590],[605,560],[655,590],[740,600],[805,492],[645,345],[720,350],[550,340],[488,265],[530,150]].map(p => trees(...p)).join('')}</g>
      <path d="M80 195C174 178 209 236 283 241S359 179 414 198 486 265 535 243 640 205 668 233 728 244 842 210" fill="none" stroke="#3d544e" stroke-width="7" opacity=".6"/>
      <path d="M80 195C174 178 209 236 283 241S359 179 414 198 486 265 535 243 640 205 668 233 728 244 842 210" fill="none" stroke="url(#river)" stroke-width="2.4" opacity=".75"/>
      <path d="M85 488C160 535 180 439 245 477S336 579 398 515 496 495 545 502 599 469 649 480 738 443 780 453 850 395 904 390" fill="none" stroke="#364d48" stroke-width="10" opacity=".7"/>
      <path d="M85 488C160 535 180 439 245 477S336 579 398 515 496 495 545 502 599 469 649 480 738 443 780 453 850 395 904 390" fill="none" stroke="url(#river)" stroke-width="3.3" opacity=".85"/>
      <path d="M400 296Q360 375 418 466T400 515" fill="none" stroke="#9cab99" stroke-width="1.8" opacity=".6"/>
    </g>
    <g class="geography"><text x="192" y="426" transform="rotate(-10 192 426)">巴 蜀</text><text x="480" y="165">中 原</text><text x="640" y="626">江 東</text><text class="river-name" x="317" y="233" transform="rotate(-12 317 233)">黃 河</text><text class="river-name" x="610" y="478" transform="rotate(-8 610 478)">長 江</text><text class="sea-name" x="900" y="270" writing-mode="vertical-rl">東 海</text></g>
    <g class="routes ${showRoutes || mode ? 'routes-visible' : ''}">${edges.join('')}</g>
    ${s.cities.map(c => {
      const f = FACTIONS[c.owner];
      const target = mode && c.id !== origin.id && origin.neighbors.includes(c.id) && (mode === 'attack' ? c.owner !== s.player : c.owner === s.player);
      const isSelected = c.id === selected.id;
      return `<g class="city ${isSelected ? 'selected' : ''} ${target ? 'target' : ''} ${c.acted ? 'acted' : ''} ${feedback?.city === c.id ? 'city-changed' : ''}" data-city="${c.id}" role="button" tabindex="0" aria-label="${c.name}, ${f.name} 세력, 병력 ${c.soldiers}명${target ? ', 출진 대상' : ''}" aria-pressed="${isSelected}" transform="translate(${c.x} ${c.y})" style="--city-color:${f.color}">
        <circle class="city-hit" r="33" fill="transparent"/>
        ${feedback?.city === c.id ? `<circle class="city-feedback-ring" r="24"/><text class="city-feedback-label" y="-40" text-anchor="middle">${feedback.mapText || '명령 완료'}</text>` : ''}
        ${isSelected ? '<circle class="selection-ring" r="26"/><path class="selection-ticks" d="M-31 0h7M24 0h7M0-31v7M0 24v7"/>' : ''}
        ${target ? '<circle class="target-ring" r="26"/>' : ''}
        <path class="city-base" d="m0-19 18 10v20L0 21-18 11V-9Z"/>
        <path class="city-castle" d="M-10 7V-5h4v4h4v-7h4v7h4v-4h4V7H3V2H-3V7Z"/>
        <path class="city-flag" d="M3-9V-24h13l-3 5 3 5H4"/>
        <text class="flag-han" x="9" y="-16">${f.han}</text>
        <rect class="city-label-bg" x="-30" y="28" width="60" height="22" rx="2"/>
        <text class="city-name" y="43" text-anchor="middle">${c.name}${c.acted ? ' ·' : ''}</text>
        <text class="city-troops" y="64" text-anchor="middle">${(c.soldiers / 1000).toFixed(1)}천</text>
      </g>`;
    }).join('')}
    <g class="compass" transform="translate(70 650)"><circle r="27"/><path d="m0-35 7 28-7-5-7 5ZM0 35-7 7l7 5 7-5ZM-35 0l28-7-5 7 5 7ZM35 0 7 7l5-7-5-7Z"/><text y="-43" text-anchor="middle">北</text></g>
    <g class="map-scale" transform="translate(789 695)"><path d="M0-4v8M0 0h100M50-4v8M100-4v8"/><text x="0" y="21">0</text><text x="77" y="21">五百里</text></g>
  </svg>`;
}
