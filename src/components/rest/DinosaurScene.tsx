import { useCallback } from 'react';
import { dinosaurLegPose } from '../../services/dinosaurMotion';
import { fadePart, movePart, useRestMotion, useSceneryId, type RestSceneryProps, type SceneryParts } from './RestScenery';

// The supplied HTML artwork is native SVG here: no iframe, injected scripts or external requests.
// Shared rest controls own playback, speed, visibility, reduced motion and rotation.
function drawDinosaur(parts: SceneryParts, time: number, compact: boolean) {
  const crank = time * Math.PI * 2 / 1.7;
  const bounce = Math.sin(crank * 2) * 1.1;
  const scale = compact ? .66 : 1;
  movePart(parts, 'rider', compact ? `translate(208 ${214 + bounce}) scale(.66)` : `translate(0 ${bounce})`);
  const shadow = parts.get('shadow');
  shadow?.setAttribute('cx', compact ? '668' : '697');
  shadow?.setAttribute('cy', compact ? '675' : '695');
  shadow?.setAttribute('rx', String((compact ? 167 : 252) + bounce));
  for (const side of ['far', 'near'] as const) {
    const { path, pedal, ankle } = dinosaurLegPose(time, side);
    parts.get(side + '-leg-outline')?.setAttribute('d', path);
    parts.get(side + '-leg')?.setAttribute('d', path);
    parts.get(side + '-crank')?.setAttribute('d', `M678 580L${pedal.x} ${pedal.y}`);
    parts.get(side + '-pedal')?.setAttribute('d', `M${pedal.x - 16} ${pedal.y + 2}h39`);
    movePart(parts, side + '-foot', `translate(${ankle.x} ${ankle.y})`);
  }
  const wheelDegrees = (time * 260 / 106 * 180 / Math.PI) % 360;
  movePart(parts, 'rear-wheel', `rotate(${wheelDegrees})`);
  movePart(parts, 'front-wheel', `rotate(${wheelDegrees})`);
  movePart(parts, 'tail', `rotate(${Math.sin(time * 2.4) * 2.6} 596 382)`);
  movePart(parts, 'scarf', `rotate(${Math.sin(time * 5.2) * 3.4} 671 309)`);
  const blink = time % 5.7;
  const eyeScale = blink > 5.34 && blink < 5.5 ? .13 : 1;
  movePart(parts, 'eye', `translate(0 ${244 * (1 - eyeScale)}) scale(1 ${eyeScale})`);
  movePart(parts, 'clouds', `translate(${-Math.sin(time * .028) * 75} 0)`);
  movePart(parts, 'pterosaur', `translate(${930 + Math.sin(time * .19) * 23} ${129 + Math.sin(time * 1.1) * 6}) rotate(${Math.sin(time * .8) * 3})`);
  movePart(parts, 'mountains', `translate(${-(time * 12 % 1300)} 0)`);
  movePart(parts, 'volcano', `translate(${1470 - ((time * 12 + 422) % 1680)} 416)`);
  movePart(parts, 'verges', `translate(${-(time * 190 * scale % 1300)} 0)`);
  movePart(parts, 'road', `translate(${-(time * 260 * scale % 1300)} 0)`);
  movePart(parts, 'foreground', `translate(${-(time * 310 * scale % 1300)} 0)`);
  fadePart(parts, 'wind', compact ? 0 : .35 + Math.sin(time * 3) * .13);
  movePart(parts, 'wind', `translate(${Math.sin(time * 3) * 6} 0)`);
}

export default function DinosaurScene({ playing, speed, compact }: RestSceneryProps) {
  const draw = useCallback((parts: SceneryParts, time: number) => drawDinosaur(parts, time, compact), [compact]);
  const ref = useRestMotion(playing, speed, draw), id = useSceneryId();
  const paint = (name: string) => 'url(#' + id(name) + ')';
  return <svg ref={ref} className="rest-art rest-dinosaur-art" viewBox="0 0 1300 760" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby={id('art-title') + ' ' + id('art-desc')}>
<title id={id('art-title')}>戴橙色头盔的绿色小恐龙骑着自行车穿过史前山谷</title>
<desc id={id('art-desc')}>小恐龙交替踩动踏板，两只车轮旋转，长尾巴和围巾随风摆动。沿途有蕨类植物、远山、火山和飞过天空的翼龙。</desc>
<defs>
<linearGradient id={id('sky')} x2="0" y2="1"><stop stopColor="#f2f0dc"/><stop offset="1" stopColor="#e2ecd7"/></linearGradient>
<linearGradient id={id('road-color')} x2="0" y2="1"><stop stopColor="#e7d7b2"/><stop offset="1" stopColor="#f0e0be"/></linearGradient>
<linearGradient id={id('dino-color')} x2=".8" y2="1"><stop stopColor="#99c3a6"/><stop offset="1" stopColor="#79aa91"/></linearGradient>
<pattern id={id('grain')} width="33" height="29" patternUnits="userSpaceOnUse"><circle cx="4" cy="9" r=".65" fill="#566747" opacity=".11"/><circle cx="22" cy="24" r=".7" fill="#fff" opacity=".3"/></pattern>
<g id={id('cloud')} fill="#fffbed"><path d="M0 25C-4 11 12 5 24 10 31-10 61-6 65 11 81 4 98 12 94 25Z"/></g>
<g id={id('mountain-strip')}><path d="M0 460c100-44 112-103 203-74 91 28 140 84 222 30 123-81 180-82 289-23 134 73 158-34 274-35 126-1 208 116 312 102v145H0Z" fill="#c1d1b2"/><path d="M0 502c112-50 181-28 283-4 130 31 208-74 317-51 94 20 151 65 260 18 129-56 257 32 440 37v119H0Z" fill="#a9c3a1"/></g>
<g id={id('fern')}>
<path d="M0 0q-3-42 12-75" fill="none" stroke="#6d8e66" strokeWidth="3" strokeLinecap="round"/>
<path d="M2-13q-24-4-27-23 22 4 27 23m-2-12q24-5 30-23-22 3-30 23m2-16q-17-3-20-18 19 3 20 18m3-13q20-1 26-18-20 3-26 18m3-11q-11-6-8-19 13 5 8 19" fill="#7e9d73"/>
</g>
<g id={id('small-grass')} fill="none" stroke="#859f70" strokeWidth="3" strokeLinecap="round"><path d="M0 0q-4-16-13-21M0 0q2-22 12-29M0 0q11-13 21-13"/></g>
<g id={id('verge-strip')}><path d="M0 626q121-12 250 0t275 0 265 0 270 0 240 0v18H0Z" fill="#c0cca1"/><use href={'#' + id('fern')} transform="translate(140 630) scale(.65)"/><use href={'#' + id('small-grass')} x="436" y="632"/><use href={'#' + id('small-grass')} x="793" y="630"/><use href={'#' + id('fern')} transform="translate(1115 632) scale(.8)"/><g fill="#d4b17d"><ellipse cx="329" cy="633" rx="13" ry="4"/><ellipse cx="992" cy="634" rx="9" ry="4"/></g></g>
<g id={id('lane-strip')} stroke="#fff0ce" strokeWidth="4" strokeLinecap="round"><path d="M18 692h86m131 0h86m131 0h86m131 0h86m131 0h86m131 0h86"/></g>
<g id={id('foreground-strip')}><use href={'#' + id('fern')} transform="translate(138 790) scale(1.2) rotate(-10)"/><use href={'#' + id('fern')} transform="translate(1139 783) scale(.95) rotate(13)"/><path d="M283 722h10m170 15h15m301-16h8m253 18h10" stroke="#c7b58e" strokeWidth="3" strokeLinecap="round"/></g>
<g id={id('spokes')} stroke="#9aa79a" strokeWidth="1.7"><path d="M-91 0H91M0-91V91M-64.35-64.35 64.35 64.35M-64.35 64.35 64.35-64.35M-84.07-34.82 84.07 34.82M-34.82-84.07 34.82 84.07M-84.07 34.82 84.07-34.82M-34.82 84.07 34.82-84.07"/><path d="m58 58 7 7" stroke="#d8ab62" strokeWidth="6" strokeLinecap="round"/><path d="M-7-90H7" stroke="#fff5dc" strokeWidth="4" strokeLinecap="round"/></g>
</defs>
<path d="M0 0h1300v760H0Z" fill={paint('sky')}/>
<circle cx="1042" cy="192" r="74" fill="#ecd69c" opacity=".38"/><circle cx="1042" cy="192" r="55" fill="#e9c883"/>
<g id={id('clouds')} data-part="clouds" opacity=".74"><use href={'#' + id('cloud')} x="460" y="98"/><use href={'#' + id('cloud')} x="1142" y="277"/><use href={'#' + id('cloud')} x="139" y="350"/></g>
<g id={id('pterosaur')} data-part="pterosaur" transform="translate(930 129)" fill="#93a88e"><path d="M0 0q-19-26-43-17l31 13-7 9 17-1 5 12 4-14 19-2-8-9 31-17Q20-33 0 0Z"/><path d="m-2 0 6-10 9 5-9 3Z"/></g>
<g id={id('mountains')} data-part="mountains"><use href={'#' + id('mountain-strip')}/><use href={'#' + id('mountain-strip')} x="1300"/></g>
<g id={id('volcano')} data-part="volcano" transform="translate(1048 416)"><path d="m-104 41 72-107 26 4 32-5L128 41Z" fill="#aabca1"/><path d="m-43-49 11-17 26 4 32-5 21 23-25-5-15 8-14-7-16 4Z" fill="#d4d6b9"/><path d="m-32-66 26 4 32-5" fill="none" stroke="#98ad96" strokeWidth="3"/><g fill="#f5f0db" opacity=".66"><ellipse cx="4" cy="-91" rx="14" ry="8"/><ellipse cx="19" cy="-114" rx="21" ry="10"/><ellipse cx="5" cy="-141" rx="27" ry="11"/></g></g>
<path d="M0 557q166-37 318-4t332-5 342 5 308-1v95H0Z" fill="#cfdbb6"/>
<path d="M0 639h1300v121H0Z" fill={paint('road-color')}/>
<g id={id('verges')} data-part="verges"><use href={'#' + id('verge-strip')}/><use href={'#' + id('verge-strip')} x="1300"/></g>
<g id={id('road')} data-part="road"><use href={'#' + id('lane-strip')}/><use href={'#' + id('lane-strip')} x="1300"/></g>
<ellipse id={id('shadow')} data-part="shadow" cx="697" cy="695" rx="252" ry="13" fill="#8d8a64" opacity=".17"/>
{/* A single rigid bicycle assembly receives a subtle vertical bob. */}
<g id={id('rider')} data-part="rider">
<g fill="none"><circle cx="525" cy="580" r="100" stroke="#3f514a" strokeWidth="12"/><circle cx="865" cy="580" r="100" stroke="#3f514a" strokeWidth="12"/><circle cx="525" cy="580" r="91" stroke="#f9edcd" strokeWidth="5"/><circle cx="865" cy="580" r="91" stroke="#f9edcd" strokeWidth="5"/></g>
<g transform="translate(525 580)"><g id={id('rear-wheel')} data-part="rear-wheel"><use href={'#' + id('spokes')}/></g></g>
<g transform="translate(865 580)"><g id={id('front-wheel')} data-part="front-wheel"><use href={'#' + id('spokes')}/></g></g>
<g fill="none" stroke="#b78b6d" strokeWidth="5" strokeLinecap="round"><path d="M420 568a106 106 0 0 1 205-25M769 535a106 106 0 0 1 201 33"/></g>
{/* Tail and its small golden plates swing together around the hip. */}
<g id={id('tail')} data-part="tail">
<path d="m444 350-14-26-10 15m60 29-7-29-20 18m65 23-1-26-21 22m60 10 7-25-23 17" fill="#d8bc79" stroke="#879674" strokeWidth="2.5" strokeLinejoin="round"/>
<path d="M598 365C535 391 457 361 400 326L354 299q8 63 77 95c58 27 126 36 182 5Z" fill="#83b29a" stroke="#486859" strokeWidth="3.5" strokeLinejoin="round"/>
<path d="M355 301q42 74 126 91 63 18 121-7l11 14c-56 31-124 22-182-5-69-32-77-95-77-95Z" fill="#aec89f"/>
<path d="M383 338q68 65 161 66" fill="none" stroke="#91b28e" strokeWidth="2" strokeLinecap="round"/>
<g fill="#6c9c84" opacity=".65"><ellipse cx="491" cy="380" rx="8" ry="5" transform="rotate(15 491 380)"/><ellipse cx="514" cy="386" rx="5" ry="4"/><ellipse cx="537" cy="388" rx="7" ry="4"/></g>
</g>
{/* Far leg passes behind the frame. */}
<g fill="none" strokeLinecap="round" strokeLinejoin="round"><path id={id('far-leg-outline')} data-part="far-leg-outline" d="M622 400 587 491 644 573" stroke="#486859" strokeWidth="23"/><path id={id('far-leg')} data-part="far-leg" d="M622 400 587 491 644 573" stroke="#78a68b" strokeWidth="17"/></g>
<path id={id('far-crank')} data-part="far-crank" d="M678 580h-34" stroke="#7b8878" strokeWidth="7" strokeLinecap="round"/>
<g id={id('far-foot')} data-part="far-foot" transform="translate(641 573)"><path d="M-12-9q7-10 17-2l21 5q9 3 7 12H-10q-8-2-2-15Z" fill="#82ad8d" stroke="#486859" strokeWidth="2.5"/><path d="m14 1 2 4m7-4 2 4" stroke="#e9dfb7" strokeWidth="3" strokeLinecap="round"/></g>
<path id={id('far-pedal')} data-part="far-pedal" d="M629 582h37" stroke="#41574c" strokeWidth="6" strokeLinecap="round"/>
{/* Terracotta frame with cream highlights. */}
<g fill="none" strokeLinecap="round" strokeLinejoin="round">
<path d="M525 580 613 427 678 580 525 580M613 427H789L678 580M778 394 865 580" stroke="#855c4b" strokeWidth="14"/>
<path d="M525 580 613 427 678 580 525 580M613 427H789L678 580M778 394 865 580" stroke="#cc886a" strokeWidth="8"/>
<path d="M628 427h101m-106 16 43 108m143-88 41 92" stroke="#e5b497" strokeWidth="2.4"/>
<path d="m613 427-8-27" stroke="#718374" strokeWidth="8"/>
<path d="m778 394-7-17q-6-14 10-14h28" stroke="#677c6b" strokeWidth="7"/>
<path d="M797 363h24" stroke="#9b7752" strokeWidth="11"/>
<path d="M810 370q34 8 23 41l-18 42" stroke="#718371" strokeWidth="2"/>
<path d="M525 574 678 566q20 0 20 14t-20 14l-153-8q-11-1-11-6t11-6Z" stroke="#88917b" strokeWidth="2"/>
</g>
<path d="M582 397q26 2 56-3 13-2 16 6 1 8-19 10l-50 2q-15-2-14-8 1-8 11-7Z" fill="#97744f" stroke="#606149" strokeWidth="3"/>
<circle cx="525" cy="580" r="8" fill="#dab87d" stroke="#697e66" strokeWidth="3"/><circle cx="865" cy="580" r="8" fill="#dab87d" stroke="#697e66" strokeWidth="3"/>
<circle cx="678" cy="580" r="24" fill="#e7dab5" stroke="#78856f" strokeWidth="3"/><circle cx="678" cy="580" r="16" fill="none" stroke="#b5b28f" strokeWidth="2"/>
<path d="m752 474-16 26" stroke="#f3e2bf" strokeWidth="12" strokeLinecap="round"/><path d="m754 470-4 7" stroke="#a47a55" strokeWidth="9" strokeLinecap="round"/>
{/* Near leg, ankle and pedal stay linked by inverse kinematics. */}
<g fill="none" strokeLinecap="round" strokeLinejoin="round"><path id={id('near-leg-outline')} data-part="near-leg-outline" d="M642 409 601 514 712 573" stroke="#486859" strokeWidth="26"/><path id={id('near-leg')} data-part="near-leg" d="M642 409 601 514 712 573" stroke="#93bb99" strokeWidth="20"/></g>
<path id={id('near-crank')} data-part="near-crank" d="M678 580h34" stroke="#667b68" strokeWidth="7" strokeLinecap="round"/><circle cx="678" cy="580" r="5" fill="#fff0d1"/>
<path id={id('near-pedal')} data-part="near-pedal" d="M696 582h38" stroke="#41574c" strokeWidth="6" strokeLinecap="round"/>
<g id={id('near-foot')} data-part="near-foot" transform="translate(709 573)"><path d="M-13-9q8-10 19-2l24 5q9 3 6 12H-11q-8-2-2-15Z" fill="#a6c7a0" stroke="#486859" strokeWidth="2.5"/><path d="m14 1 2 4m7-4 2 4m6-4 1 4" stroke="#f2e4ba" strokeWidth="3" strokeLinecap="round"/></g>
{/* Golden plates follow the back, separate from the green body. */}
<path d="m630 287-24-10 7 29m-13 13-25-7 9 27m-7 5-20 4 19 20m3 10-16 16 25 8" fill="#dfc180" stroke="#849471" strokeWidth="2.5" strokeLinejoin="round"/>
<path d="M612 304c17-19 29-29 32-49 1-33 23-57 53-56 28-1 47 15 52 27 19-8 69-10 87 11 26 26 14 56-13 66-38 15-80 7-108-4l-11 39c12 35-19 76-53 85-32 8-66-13-72-41-11-29 3-58 33-78Z" fill={paint('dino-color')} stroke="#486859" strokeWidth="3.5" strokeLinejoin="round"/>
<path d="M695 314c10 36-15 80-47 96-14 7-27 4-38-8 38-9 47-49 44-73l20-28Z" fill="#d6dbad"/>
<path d="M717 283q59 28 111-3c-7 16-22 26-45 27-27 2-50-2-68-8Z" fill="#c2d2a7"/>
<g fill="#6a9d83" opacity=".6"><ellipse cx="604" cy="343" rx="9" ry="12" transform="rotate(27 604 343)"/><ellipse cx="595" cy="366" rx="5" ry="7"/><ellipse cx="617" cy="370" rx="6" ry="8" transform="rotate(20 617 370)"/><ellipse cx="623" cy="325" rx="4" ry="6"/></g>
{/* Scarf knot is fixed while the loose end ripples. */}
<g id={id('scarf')} data-part="scarf"><path d="M673 307c-40-29-69 2-108-19l6 15-17 7c37 24 72-3 115 12Z" fill="#d69775" stroke="#aa795d" strokeWidth="2.5" strokeLinejoin="round"/><path d="M666 313q-31 10-49 35l20-5 3 12q29-19 43-37Z" fill="#c78869" stroke="#aa795d" strokeWidth="2.5" strokeLinejoin="round"/><path d="M661 310q-46-12-84-7" fill="none" stroke="#e7b798" strokeWidth="3" strokeLinecap="round"/></g>
<path d="m662 292 44 15-5 18q-25-4-48-18Z" fill="#e0a17d" stroke="#aa795d" strokeWidth="2.5"/><path d="m664 300 33 13" stroke="#f1c5a1" strokeWidth="3" strokeLinecap="round"/>
{/* One forelimb reaches the handlebar. */}
<path d="M678 333q13-12 26 3l21 20q18 8 37 5l36-3q19-1 20 11-2 12-20 9l-47-1q-27-1-41-12l-28-17" fill="#91ba9c" stroke="#486859" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M790 360q4 6 1 16l8 2q17 2 19-9-1-12-20-11Z" fill="#a9c9a3"/>
<path d="m800 363 1 10m6-10 1 9" stroke="#5f8a70" strokeWidth="1.7" strokeLinecap="round"/>
{/* Friendly profile, a smile and tiny cream teeth. */}
<ellipse cx="704" cy="244" rx="14" ry="17" fill="#eef0d4"/>
<g id={id('eye')} data-part="eye"><ellipse cx="709" cy="244" rx="6" ry="8" fill="#365246"/><circle cx="711" cy="241" r="2.2" fill="#fffbea"/></g>
<path d="M692 222q11-6 21 0" fill="none" stroke="#60866d" strokeWidth="3" strokeLinecap="round"/>
<ellipse cx="828" cy="258" rx="4" ry="3" transform="rotate(17 828 258)" fill="#587d63"/>
<ellipse cx="777" cy="280" rx="13" ry="7" fill="#c8b68b" opacity=".65"/>
<path d="M763 285q39 17 69-10" fill="none" stroke="#486859" strokeWidth="2.6" strokeLinecap="round"/>
<path d="m795 291 5 8 4-10m10-4 5 6 3-9" fill="#fff1cf" stroke="#486859" strokeWidth="1.4" strokeLinejoin="round"/>
{/* Rounded orange cycling helmet. */}
<path d="m660 219 14 43 22 16 23-20" fill="none" stroke="#657260" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
<rect x="693" y="270" width="10" height="9" rx="2" fill="#d4b47c" stroke="#687661" strokeWidth="1.5"/>
<path d="M649 216c-1-29 22-44 50-44 29 0 50 16 57 43Z" fill="#d8906f" stroke="#8d6f52" strokeWidth="3"/>
<path d="M689 174q-17 17-16 39h15q-1-24 15-40Z" fill="#edc69b" opacity=".8"/>
<path d="m713 186 13 7m-3 9 15 6" stroke="#a97357" strokeWidth="6" strokeLinecap="round"/>
<path d="M644 215h114q10 0 10 6H646q-7-1-2-6Z" fill="#e8ae87" stroke="#8d6f52" strokeWidth="2.5"/>
{/* Little brass bell. */}
<path d="M780 357v-7" stroke="#647966" strokeWidth="3"/><path d="M770 353a10 10 0 0 1 20 0Z" fill="#d8b777" stroke="#8c8964" strokeWidth="2"/>
</g>
<g id={id('wind')} data-part="wind" fill="none" stroke="#8ea380" strokeWidth="2.3" strokeLinecap="round" opacity=".5"><path d="M421 432h28m-47 15h30m-39 36h29"/></g>
<g id={id('foreground')} data-part="foreground"><use href={'#' + id('foreground-strip')}/><use href={'#' + id('foreground-strip')} x="1300"/></g>
<path d="M0 0h1300v760H0Z" fill={paint('grain')} pointerEvents="none"/>
</svg>;
}
