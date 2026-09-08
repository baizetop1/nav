import { fadePart, movePart, SceneryFrame, useRestMotion, useSceneryId, type RestSceneryProps, type SceneryParts } from './RestScenery';

function draw(parts: SceneryParts, t: number) {
  for (let i = 0; i < 5; i++) fadePart(parts, 'stars-' + i, .4 + (Math.sin(t / 3 + i) + 1) * .25);
  movePart(parts, 'bear', `translate(-227 18) scale(1 ${1 + Math.sin(t * 1.1) * .012})`);
  movePart(parts, 'grass', `rotate(${Math.sin(t / 2) * 1.8} 1180 820)`);
  movePart(parts, 'flag', `rotate(${Math.sin(t * .8) * 3} -14 -212)`);
  fadePart(parts, 'light', .55 + (Math.sin(t / 2) + 1) * .12);
  const flight = t % 18;
  movePart(parts, 'shooting-star', `translate(${flight * 76} ${flight * 24})`);
  fadePart(parts, 'shooting-star', flight < 2.8 ? Math.sin(flight / 2.8 * Math.PI) * .7 : 0);
  for (let i = 0; i < 6; i++) {
    movePart(parts, 'fly-' + i, `translate(${415 + i * 124 + Math.sin(t / 3 + i) * 13} ${654 + i % 3 * 36 + Math.cos(t / 4 + i) * 9})`);
    fadePart(parts, 'fly-' + i, .35 + (Math.sin(t / 2 + i) + 1) * .25);
  }
}
export default function CampScene({ playing, speed, compact }: RestSceneryProps) {
  const ref = useRestMotion(playing, speed, draw), id = useSceneryId();
  const paint = (name: string) => 'url(#' + id(name) + ')';
  return <SceneryFrame svgRef={ref} id={id} compact={compact} title="小熊的星河露营" description="小熊在帐篷旁安静看书，暖灯照着草地，夜空的星星缓缓闪烁，偶尔有一颗流星划过，萤火虫在林间飘动。">
    <defs>
      <linearGradient id={id('night')} x2=".1" y2="1"><stop stopColor="#354f60" /><stop offset="1" stopColor="#8ba29a" /></linearGradient>
      <linearGradient id={id('ground')} x2="0" y2="1"><stop stopColor="#6c8876" /><stop offset="1" stopColor="#3d645b" /></linearGradient>
      <linearGradient id={id('tent-light')} x2="0" y2="1"><stop stopColor="#9f9069" /><stop offset="1" stopColor="#edc381" /></linearGradient>
    </defs>
    <path d="M0 0h1440v900H0Z" fill={paint('night')} />
    <g color="#f6e4b8">
      {Array.from({ length: 5 }, (_, group) => <g key={group} data-part={'stars-' + group}>{Array.from({ length: 7 }, (_, i) => {
        const x = 70 + (group * 317 + i * 161) % 1300, y = 54 + (group * 107 + i * 43) % 336;
        return i % 3 ? <circle key={i} cx={x} cy={y} r={i % 2 ? 1.8 : 2.4} fill="#f6e4b8" /> : <use key={i} href={'#' + id('star')} transform={`translate(${x} ${y}) scale(.7)`} />;
      })}</g>)}
    </g>
    <g className="rest-camp-moon"><circle cx="1180" cy="151" r="97" fill={paint('glow')} opacity=".26" /><path d="M1194 99a49 49 0 1 0 41 80 46 46 0 0 1-41-80Z" fill="#f3e2b8" /></g>
    <g data-part="shooting-star" opacity="0"><path d="m775 122 81 25" stroke="#e9e0bd" strokeWidth="2" strokeLinecap="round" opacity=".6" /><circle cx="856" cy="147" r="3" fill="#fff0c9" /></g>
    <path d="M0 509c119-19 187-149 271-146 100 5 130 142 241 102 125-45 133-163 243-142 84 15 90 117 188 127 111 11 141-143 228-148 102-6 172 192 269 160v201H0Z" fill="#536f72" />
    <path d="M0 559c113-67 144-69 239-20 110 57 182-91 286-44 147 66 218-48 304-5 114 57 177-30 307-15 105 12 178 61 304-4v235H0Z" fill="#4a6c67" />
    <g fill="#3d6059" color="#3d6059"><use href={'#' + id('pine')} transform="translate(1257 493) scale(1.55)" /><use href={'#' + id('pine')} transform="translate(1330 536) scale(1.05)" /><use href={'#' + id('pine')} transform="translate(182 550) scale(1.15)" /><use href={'#' + id('pine')} transform="translate(256 573) scale(.7)" /></g>
    <path d="M0 666q270-99 482-44t443-20 515 39v259H0Z" fill={paint('ground')} />
    <g className="rest-camp-anchor">
      <ellipse cx="14" cy="138" rx="349" ry="35" fill="#254d48" opacity=".24" />
      <path d="m-14-212 205 52 159 264-189-3Z" fill="#96a58a" stroke="#446556" strokeWidth="4" strokeLinejoin="round" />
      <path d="m-14-212-195 311h370Z" fill="#d4ba82" stroke="#516b59" strokeWidth="4" strokeLinejoin="round" />
      <path d="m-15-153-122 251H105Z" fill={paint('tent-light')} stroke="#8a8d66" strokeWidth="3" />
      <path d="m-15-153-99 217-73 35 173-311Z" fill="#e4c990" stroke="#a1a079" strokeWidth="2.5" />
      <path d="m-15-153 82 217 73 35-154-311Z" fill="#cbb17c" stroke="#a1a079" strokeWidth="2.5" />
      <path d="M-128 99h240M-14-212l184 315m20-263 160 264" stroke="#e7d2a0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="m-15-212-274 325m480-273 243 287" stroke="#a8b296" strokeWidth="2" fill="none" /><path d="m-297 112 2 24m145-39-2 30m287-32 4 29m300 0-2 25" stroke="#35594f" strokeWidth="7" strokeLinecap="round" />
      <path d="M-14-239v28" stroke="#637c65" strokeWidth="4" /><path data-part="flag" d="m-14-236 67 7-22 14-45-4Z" fill="#bdbb8a" stroke="#637c65" strokeWidth="2" />
      <path d="M-327 87h168v31h-168Z" fill="#8e8d6b" stroke="#4e6a55" strokeWidth="3" /><ellipse cx="-325" cy="102" rx="13" ry="17" fill="#b5a880" stroke="#4e6a55" strokeWidth="3" /><path d="M-319 103h155m-94-8 48-1" stroke="#b3a881" strokeWidth="2" />
      <g data-part="bear" transform="translate(-227 18)">
        <path d="M-52 62c-13-53 6-97 44-100 45-4 70 43 53 102Z" fill="#b99b73" stroke="#63705a" strokeWidth="3.5" />
        <circle cx="-43" cy="-64" r="21" fill="#bb9c71" stroke="#63705a" strokeWidth="3" /><circle cx="45" cy="-63" r="21" fill="#bb9c71" stroke="#63705a" strokeWidth="3" /><circle cx="-43" cy="-64" r="11" fill="#988767" /><circle cx="45" cy="-63" r="11" fill="#988767" />
        <path d="M-57-49c-5-55 108-64 113-7 12 77-106 81-113 7Z" fill="#c9ac81" stroke="#63705a" strokeWidth="3.5" />
        <ellipse cx="3" cy="-27" rx="25" ry="17" fill="#ebd9ae" /><path d="M-29-39q7 8 15 0m29 0q7 8 15 0" fill="none" stroke="#627059" strokeWidth="3" strokeLinecap="round" /><ellipse cx="4" cy="-30" rx="7" ry="5" fill="#66715b" /><path d="M4-26v7m-8 0q8 7 16 0" fill="none" stroke="#847c5e" strokeWidth="2" strokeLinecap="round" />
        <path d="M-40 0q43 19 80-3l5 15q-49 21-89 3Z" fill="#c09065" stroke="#927c59" strokeWidth="2.5" /><path d="m-33 12-9 37 19 3 12-38Z" fill="#d4aa7c" stroke="#927c59" strokeWidth="2.5" />
        <path d="m-40 70 36 4m15 0 31-4" stroke="#a08464" strokeWidth="18" strokeLinecap="round" /><path d="M-52 27q11 31 23 20m80-20q-11 31-23 20" fill="none" stroke="#b99b73" strokeWidth="18" strokeLinecap="round" />
        <path d="M-43 24q26-4 46 9 17-12 45-10v49q-26-3-45 9-19-13-46-9Z" fill="#ecdfb9" stroke="#77856a" strokeWidth="3" /><path d="M3 34v42m-36-41 25 9m-25 3 25 8m22-12 25-9m-25 21 25-9" fill="none" stroke="#b9b699" strokeWidth="2" />
      </g>
      <g transform="translate(249 76)">
        <circle data-part="light" cy="-24" r="124" fill={paint('glow')} /><ellipse cx="0" cy="31" rx="85" ry="11" fill="#e3c58c" opacity=".22" />
        <path d="M-11-60v-20q11-13 22 0v20" fill="none" stroke="#d1c48e" strokeWidth="3" /><path d="m-24-47 8-14h32l8 14v61h-48Z" fill="#e7cb8a" stroke="#657958" strokeWidth="3" /><path d="M-18-43h36V9h-36Z" fill="#f7dfa0" /><path d="M0-33V-2" stroke="#fff0bf" strokeWidth="10" strokeLinecap="round" /><path d="M-24-47h48m-49 57h50m-42-55V9m33-54V9" stroke="#a49360" strokeWidth="3" /><rect x="-28" y="13" width="56" height="9" rx="4" fill="#a9a273" />
      </g>
    </g>
    <g data-part="grass" fill="none" stroke="#355e52" strokeWidth="4" strokeLinecap="round"><path d="M1167 844q13-86-33-130m33 130q4-45 56-65m-38 59q21-101 70-142m-58 149q-20-44-49-47" /><path d="M1199 784q-7-43 17-60m-50 81q-32-27-50-27" stroke="#4a7360" strokeWidth="13" /></g>
    <path d="M46 787q59-13 118 0m322 37h105m-373 25h72m1023-49h54" fill="none" stroke="#92a087" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
    {Array.from({ length: 6 }, (_, i) => <g key={i} data-part={'fly-' + i}><circle r="13" fill={paint('glow')} /><circle r="2" fill="#f8dc97" /></g>)}
  </SceneryFrame>;
}
