import { useEffect, useId, useRef } from 'react';
import { advanceRestTime, restPose } from '../../services/restAnimation';

interface RestSceneProps { playing: boolean; speed: number; compact: boolean }
const fireflies = [[414, 471], [508, 395], [1114, 461], [1201, 526], [605, 684], [359, 604], [1070, 690], [956, 352], [1288, 622], [292, 521]];

export default function RestScene({ playing, speed, compact }: RestSceneProps) {
  const svgRef = useRef<SVGSVGElement>(null), elapsed = useRef(0);
  const uid = 'rest-' + useId().replace(/:/g, '');
  const id = (name: string) => uid + '-' + name;
  const paint = (name: string) => 'url(#' + id(name) + ')';
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parts = new Map(Array.from(svg.querySelectorAll<SVGElement>('[data-part]')).map(node => [node.dataset.part, node]));
    const transform = (name: string, value: string) => parts.get(name)?.setAttribute('transform', value);
    const draw = () => {
      const t = elapsed.current, pose = restPose(t);
      svg.dataset.sceneTime = t.toFixed(3);
      transform('boat', 'translate(0 ' + pose.boatY + ') rotate(' + pose.boatAngle + ')');
      transform('paddle', 'translate(112 -98) rotate(' + pose.paddleAngle + ')');
      transform('tail', 'rotate(' + pose.tailAngle + ' -35 -58)');
      transform('lantern', 'rotate(' + pose.lanternAngle + ' -198 -105)');
      transform('clouds', 'translate(' + pose.cloudX + ' 0)');
      transform('mist', 'translate(' + pose.mistX + ' 0)');
      transform('water', 'translate(' + pose.waterX + ' 0)');
      transform('reeds-left', 'rotate(' + pose.reedAngle + ' 153 820)');
      transform('reeds-right', 'rotate(' + -pose.reedAngle + ' 1302 820)');
      transform('ripple', 'translate(' + pose.rippleX + ' ' + pose.rippleY + ') scale(' + pose.rippleScale + ' 1)');
      parts.get('ripple')?.setAttribute('opacity', String(pose.rippleOpacity));
      fireflies.forEach(([x, y], index) => {
        transform('fly-' + index, 'translate(' + (x + Math.sin(t * 0.34 + index) * 17) + ' ' + (y + Math.cos(t * 0.48 + index * 2) * 12) + ')');
        parts.get('fly-' + index)?.setAttribute('opacity', String(0.35 + (Math.sin(t * 0.7 + index) + 1) * 0.23));
      });
    };
    draw();
    if (!playing) return;
    let frame = 0, last: number | null = null;
    function tick(timestamp: number) {
      if (last === null) last = timestamp;
      if (timestamp - last >= 1000 / 30) {
        elapsed.current = advanceRestTime(elapsed.current, timestamp - last, speed);
        last = timestamp;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  return <svg ref={svgRef} className="rest-art" viewBox={compact ? '0 0 1440 900' : '0 0 1440 820'} preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby={id('title') + ' ' + id('description')}>
    <title id={id('title')}>小狐狸的月光泛舟</title>
    <desc id={id('description')}>围着绿色围巾的小狐狸，提着一盏暖灯，在远山环绕的湖面慢慢划船。月光落在水上，芦苇轻摇，萤火虫浮在晚风中。</desc>
    <defs>
      <linearGradient id={id('sky')} x2="0" y2="1"><stop stopColor="#b8d2ce" /><stop offset=".7" stopColor="#e3e2c9" /><stop offset="1" stopColor="#f3e7c9" /></linearGradient>
      <linearGradient id={id('lake')} x2=".3" y2="1"><stop stopColor="#83aaa4" /><stop offset=".52" stopColor="#a8c7b6" /><stop offset="1" stopColor="#648f86" /></linearGradient>
      <linearGradient id={id('wood')} x2="0" y2="1"><stop stopColor="#d4af79" /><stop offset="1" stopColor="#b58e64" /></linearGradient>
      <linearGradient id={id('reflection')} x2="0" y2="1"><stop stopColor="#faf0bd" stopOpacity=".48" /><stop offset="1" stopColor="#faf0bd" stopOpacity="0" /></linearGradient>
      <radialGradient id={id('glow')}><stop stopColor="#ffecc0" stopOpacity=".7" /><stop offset="1" stopColor="#ffecc0" stopOpacity="0" /></radialGradient>
      <pattern id={id('grain')} width="43" height="37" patternUnits="userSpaceOnUse"><circle cx="6" cy="9" r=".7" fill="#456b60" opacity=".075" /><circle cx="31" cy="23" r=".6" fill="#fffbe8" opacity=".35" /><circle cx="19" cy="34" r=".55" fill="#456b60" opacity=".08" /></pattern>
      <g id={id('cloud')} fill="#f5f1da"><path d="M0 30C-12 9 16-7 36 1 42-30 91-35 108-4c28-12 58 5 57 28Z" /><path d="M-28 42h193" stroke="#f5f1da" strokeWidth="4" strokeLinecap="round" opacity=".45" /></g>
      <g id={id('waves')} stroke="#e7e8cb" fill="none" strokeLinecap="round" strokeWidth="2">
        <path d="M24 517h69m34 0h19m113 47h77m28 0h13m55-55h94m24 0h16m391 34h72m18 0h14m88 39h93m15 0h25M55 699h116m15 0h19m170 58h89m25 0h15m243-18h54m289 10h96m22 0h14m115-74h64" />
        <path d="M63 599h34m303 37h43m736-11h26m-142-123h42m-475 206h41" opacity=".6" />
      </g>
      <g id={id('pine')}><path d="m0-65-26 44h14L-34 4h21L-43 35h86L14 4h20L12-21h14Z" /><path d="M0 26v37" fill="none" stroke="currentColor" strokeWidth="5" /></g>
      <g id={id('star')} fill="none" stroke="#fff4d2" strokeWidth="1.8" strokeLinecap="round"><path d="M0-6V6M-6 0H6" /></g>
    </defs>
    <path d="M0 0h1440v820H0Z" fill={paint('sky')} />
    <g className="rest-moon">
      <circle cx="1177" cy="160" r="104" fill={paint('glow')} opacity=".5" />
      <circle cx="1177" cy="160" r="62" fill="#f6ebc5" opacity=".28" />
      <circle cx="1177" cy="160" r="48" fill="#fbf0d0" />
      <circle cx="1163" cy="143" r="8" fill="#e4d9b9" opacity=".4" /><circle cx="1193" cy="174" r="12" fill="#e4d9b9" opacity=".27" />
      <path d="m1100 426 152 0 164 394H918Z" fill={paint('reflection')} opacity=".3" />
    </g>
    <g opacity=".7">
      <use href={'#' + id('star')} x="880" y="93" /><use href={'#' + id('star')} x="1267" y="287" /><use href={'#' + id('star')} x="640" y="125" />
      <circle cx="753" cy="227" r="2" fill="#fff4d2" /><circle cx="1003" cy="275" r="1.8" fill="#fff4d2" /><circle cx="1318" cy="104" r="1.8" fill="#fff4d2" />
    </g>
    <g data-part="clouds" opacity=".52"><use href={'#' + id('cloud')} x="629" y="227" /><use href={'#' + id('cloud')} x="1265" y="333" transform="translate(385 85) scale(.72)" /><use href={'#' + id('cloud')} x="173" y="331" transform="translate(0 25) scale(.65)" /></g>
    <path d="M-40 453c138-31 172-170 258-175 101-5 120 142 235 153 77 7 78-103 163-122 89-21 109 92 182 102 127 18 123-166 229-169 91-2 135 151 185 164 105 27 131-87 260-62v193H-40Z" fill="#b2c4b6" />
    <path d="M-55 493c81-99 157-126 214-97 61 32 92 79 160 42 69-38 114-92 197-63 60 21 112 92 212 77 104-15 124-94 217-93 90 1 122 99 208 87 96-13 156-56 337-9v117H-55Z" fill="#8fad9f" />
    <path d="M-43 470c100-25 172-38 230-14 94 39 124 23 207 11m642-3c112-40 199-30 443 27" fill="none" stroke="#6c9288" strokeWidth="3" opacity=".4" />
    <g fill="#769b8d" color="#769b8d">
      <use href={'#' + id('pine')} transform="translate(110 390) scale(.63)" /><use href={'#' + id('pine')} transform="translate(155 414) scale(.42)" />
      <use href={'#' + id('pine')} transform="translate(1246 415) scale(.53)" /><use href={'#' + id('pine')} transform="translate(1283 420) scale(.38)" />
    </g>
    <path d="M0 486q296-13 718-1t722-5v420H0Z" fill={paint('lake')} />
    <path d="M0 486q296-13 718-1t722-5" fill="none" stroke="#ecedd4" strokeWidth="2.5" opacity=".5" />
    <g data-part="mist" fill="#eff0d9" opacity=".2"><path d="M-20 476q125-27 392-4t501 2 598 1v9H-20Z" /><path d="M-40 465q108-11 267-1t308-3" fill="none" stroke="#eff0d9" strokeWidth="10" strokeLinecap="round" /></g>
    <g data-part="water" opacity=".38"><use href={'#' + id('waves')} /><use href={'#' + id('waves')} x="1440" /></g>
    <g className="rest-boat-anchor">
      <ellipse cx="-6" cy="83" rx="285" ry="17" fill="#305a55" opacity=".16" />
      <path d="M-170 113h82m19 0h111m29 0h99M-115 131H31m24 0h50" stroke="#dfe3bb" strokeWidth="2" opacity=".35" strokeLinecap="round" />
      <g data-part="boat">
        <path d="M-283-13Q-8-72 284-42L240 6H-244Z" fill="#776d53" stroke="#506a57" strokeWidth="3" />
        <path d="m-243-18 25 51m457-51-22 44M-134-39l13 50m113-57v48m131-45-12 46" stroke="#ad946d" strokeWidth="4" strokeLinecap="round" />
        <g data-part="tail">
          <path d="M-29-48c-6-64-67-144-123-132-89 20-123 104-54 135 33 15 63 1 88 19 42 26 73 14 89-22Z" fill="#ce9465" stroke="#796449" strokeWidth="3.5" />
          <path d="M-190-163c-52 32-64 90-20 115 17 10 37 12 60 7l-14-13 10-7-21-9 7-13-21-4 4-15-18-1 12-17-13-6 13-16Z" fill="#f4e8ca" />
          <path d="M-62-52q-36-37-93-21" fill="none" stroke="#b57f55" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M-90-31c-15-55-13-141 29-168 33-20 84-5 107 29C70-135 90-77 89-28Z" fill="#d99b69" stroke="#796449" strokeWidth="3.5" />
        <path d="M-50-174c-24 43-21 93-6 132l71 5c10-36 7-99-23-141Z" fill="#f7eccc" />
        <path d="M-54-39q-44-11-46 3-4 12 39 13m68-6q36-20 56-7 12 11-36 15" fill="#d99b69" stroke="#796449" strokeWidth="3" strokeLinecap="round" />
        <g transform="translate(6 -187)">
          <path d="M-69-15c-20-22-18-61 4-85l-11-68 67 46q25-4 42 1l58-47-3 83c14 23 22 36 49 49l24 5q-8 33-61 50C35 40-30 36-69-15Z" fill="#dc9d69" stroke="#796449" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="m-63-144 8 44 30-16Z" fill="#ba7960" /><path d="m76-144-33 30 29 15Z" fill="#ba7960" />
          <path d="M-70-21q22 7 35-24l15 21 14-8q20 44 65 24c25-11 44-28 79-21-14 24-46 44-83 49-55 8-101-4-125-41Z" fill="#f7edcf" />
          <path d="M39-55q11 13 23 0" fill="none" stroke="#665c49" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="139" cy="-31" rx="10" ry="6.5" fill="#4a5d4e" transform="rotate(9 139 -31)" />
          <path d="M129-19q-5 11-19 11" fill="none" stroke="#876c4d" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="69" cy="-28" rx="11" ry="5" fill="#cb8368" opacity=".45" />
          <path d="m-63-68 10 4m-12 3 9 3" fill="none" stroke="#bd835d" strokeWidth="2" strokeLinecap="round" />
        </g>
        <path d="M-60-163q39 25 90 13l6 21q-65 20-105-12Z" fill="#5c8979" stroke="#4e7566" strokeWidth="3" />
        <path d="m-52-144-36 53 20 4 9 16q30-27 34-65Z" fill="#6f9986" stroke="#4e7566" strokeWidth="3" strokeLinejoin="round" />
        <path d="m-47-132-25 40" fill="none" stroke="#aac1a0" strokeWidth="3" strokeLinecap="round" />
        <g transform="translate(-142 -26) rotate(-6)"><rect x="-13" y="-50" width="32" height="49" rx="7" fill="#7a9c88" stroke="#506e5d" strokeWidth="3" /><path d="M-5-50v-9H12v9" fill="#c3b88d" stroke="#506e5d" strokeWidth="2.5" /><path d="M-4-33H9" stroke="#c9d5b2" strokeWidth="3" strokeLinecap="round" /></g>
        <g data-part="lantern">
          <circle cx="-198" cy="-60" r="73" fill={paint('glow')} opacity=".75" />
          <path d="M-207-92v-16q9-13 18 0v16" fill="none" stroke="#6d7052" strokeWidth="3" />
          <path d="m-220-84 7-10h32l7 10v52h-46Z" fill="#f5dfa0" stroke="#7f7650" strokeWidth="3" />
          <path d="M-215-84h36v44h-36Z" fill="#f9e6ae" /><path d="M-198-79v32" stroke="#fff8d7" strokeWidth="9" strokeLinecap="round" />
          <path d="M-220-84h46m-47 47h48M-212-84v47m28-47v47" fill="none" stroke="#8a7c51" strokeWidth="3" strokeLinecap="round" />
          <rect x="-224" y="-35" width="52" height="8" rx="4" fill="#758065" />
        </g>
        <path d="M-306-15q87 23 155 21h255q105-1 193-49c-38 79-74 107-136 115H-110q-125-7-196-87Z" fill={paint('wood')} stroke="#566d58" strokeWidth="4" strokeLinejoin="round" />
        <path d="M-283 0q104 31 229 25h184q78-5 144-43M-231 34q89 24 158 21h205q42-2 73-14" fill="none" stroke="#efe0b0" strokeWidth="3" opacity=".6" />
        <path d="m-200 10 26 46m63-36 11 46m177-46-4 46m123-65-16 48" stroke="#8c7b54" strokeWidth="2" opacity=".65" />
        <path d="M-305-16q102 27 176 24h229q113-2 196-51" fill="none" stroke="#edcf98" strokeWidth="7" strokeLinecap="round" />
        <g data-part="paddle" transform="translate(112 -98) rotate(-12)">
          <path d="M0-43V169" stroke="#596e59" strokeWidth="12" strokeLinecap="round" />
          <path d="M0-43V169" stroke="#c9aa72" strokeWidth="7" strokeLinecap="round" />
          <path d="M-12 120q12-10 24 0l7 57q1 26-19 33-20-7-19-33Z" fill="#c4a46b" stroke="#596e59" strokeWidth="3" />
          <path d="M0 132v62" stroke="#e7cf96" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M24-130q39 23 82 27" fill="none" stroke="#796449" strokeWidth="25" strokeLinecap="round" />
        <path d="M24-130q39 23 82 27" fill="none" stroke="#dc9d69" strokeWidth="18" strokeLinecap="round" />
        <path d="M101-112q22-6 25 10 2 11-20 12" fill="#f1dfb9" stroke="#796449" strokeWidth="3" strokeLinecap="round" />
        <path d="m116-108 1 7m-8-7 1 8" stroke="#bfac88" strokeWidth="2" strokeLinecap="round" />
        <path d="M221 55q23-7 43-24" fill="none" stroke="#647d64" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g data-part="ripple" transform="translate(152 94)" fill="none" stroke="#edf0d3" strokeWidth="2"><ellipse rx="53" ry="8" /><path d="M-68 10q71 21 140-2" /></g>
    </g>
    <path d="M0 765c101-40 171-10 252 25l66 30v80H0Zm1440-46c-101 2-173 54-246 101v80h246Z" fill="#5a8071" opacity=".8" />
    <g fill="none" stroke="#41685c" strokeWidth="4" strokeLinecap="round">
      <g data-part="reeds-left">
        <path d="M124 825q4-91-25-155m41 155q35-101 82-123m-62 123q-2-56-37-89m21 89q-4-129 36-186M75 820q-6-70-35-105" />
        <path d="M145 765q32-32 57-31M132 801q-30-15-40-39m50-45q-24-24-33-46" stroke="#507a65" strokeWidth="12" />
        <path d="m178 642 9-31m-88 62-10-31m134 60 19-18" stroke="#abac7c" strokeWidth="10" />
      </g>
      <g data-part="reeds-right">
        <path d="M1306 827q-2-84-45-130m20 125q29-119 81-162m-62 167q-43-63-100-76m91 68q18-79 68-109M1363 825q21-98 60-132" />
        <path d="M1322 729q-4-36 18-62m-60 128q-38-29-53-30m84 14q45-30 62-35" stroke="#507a65" strokeWidth="13" />
        <path d="m1262 698-23-29m125-9 22-22m-183 113-21-2m242-58 16-17" stroke="#bdba88" strokeWidth="10" />
      </g>
    </g>
    {fireflies.map((_, index) => <g key={index} data-part={'fly-' + index} opacity=".6"><circle r="12" fill={paint('glow')} /><circle r="2.5" fill="#fae7a3" /><circle r="1" fill="#fff8d8" /></g>)}
    <path d="M0 0h1440v900H0Z" fill={paint('grain')} pointerEvents="none" />
  </svg>;
}
