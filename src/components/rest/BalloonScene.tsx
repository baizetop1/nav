import { movePart, SceneryFrame, useRestMotion, useSceneryId, type RestSceneryProps, type SceneryParts } from './RestScenery';

function draw(parts: SceneryParts, t: number) {
  movePart(parts, 'balloon', `translate(${Math.sin(t / 8) * 9} ${Math.sin(t / 3) * 11}) rotate(${Math.sin(t / 5) * 1.8})`);
  movePart(parts, 'clouds-far', `translate(${Math.sin(t / 28) * 50} 0)`);
  movePart(parts, 'clouds-near', `translate(${Math.sin(t / 16) * 75} 0)`);
  movePart(parts, 'scarf', `rotate(${Math.sin(t * 1.2) * 5} 14 163)`);
  movePart(parts, 'birds', `translate(${Math.sin(t / 12) * 35} ${Math.sin(t / 3) * 5})`);
}
export default function BalloonScene({ playing, speed, compact }: RestSceneryProps) {
  const ref = useRestMotion(playing, speed, draw), id = useSceneryId();
  const paint = (name: string) => 'url(#' + id(name) + ')';
  return <SceneryFrame svgRef={ref} id={id} compact={compact} title="小兔子的云海漫游" description="戴蓝色围巾的小兔子乘着杏色热气球，在奶油色的云海上缓缓漂浮；远处的小鸟掠过，围巾随风轻摆。">
    <defs>
      <linearGradient id={id('sky')} x2="0" y2="1"><stop stopColor="#ecd4bc" /><stop offset="1" stopColor="#f2ebce" /></linearGradient>
      <linearGradient id={id('silk')} x2=".8" y2="1"><stop stopColor="#edc996" /><stop offset="1" stopColor="#dca17f" /></linearGradient>
      <linearGradient id={id('cloud-sea')} x2="0" y2="1"><stop stopColor="#faf0d5" /><stop offset="1" stopColor="#c6c5ab" /></linearGradient>
    </defs>
    <path d="M0 0h1440v900H0Z" fill={paint('sky')} />
    <g className="rest-balloon-sun"><circle cx="1190" cy="178" r="94" fill="#faf0c9" opacity=".3" /><circle cx="1190" cy="178" r="58" fill="#faf0c9" opacity=".65" /><circle cx="1190" cy="178" r="44" fill="#fff1c9" /></g>
    <g data-part="clouds-far" opacity=".6"><use href={'#' + id('cloud')} transform="translate(578 232) scale(.65)" /><use href={'#' + id('cloud')} transform="translate(1160 480) scale(.82)" /><use href={'#' + id('cloud')} transform="translate(180 375) scale(.65)" /></g>
    <g data-part="birds" fill="none" stroke="#ae9177" strokeWidth="3" strokeLinecap="round"><path d="M1174 329q13-13 26 0 13-13 26 0m-115 21q8-8 17 0 9-8 17 0" /></g>
    <path d="M0 670c150-40 193-132 296-112 116 23 135 125 263 98 190-40 190-94 325-53 160 47 257-64 556-77v374H0Z" fill="#c1c2a6" opacity=".5" />
    <path d="M0 696c145-65 212 24 359-28 137-48 204 56 323 20 183-57 307-31 398-24 112 8 194-47 360-7v243H0Z" fill="#e5dfbd" />
    <g className="rest-balloon-anchor"><g data-part="balloon">
      <path d="m-84 72 22 130m146-130-22 130M-131 32l62 174M131 32 69 206" fill="none" stroke="#827e63" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M0-300c-207 0-223 190-86 386q87 28 172 0C223-110 207-300 0-300Z" fill={paint('silk')} stroke="#8e8568" strokeWidth="3.5" />
      <path d="M0-300C-113-293-129-114-44 97l-42-11C-191-68-213-262 0-300Z" fill="#f4dfae" />
      <path d="M0-300C113-293 129-114 44 97l42-11C191-68 213-262 0-300Z" fill="#f4dfae" />
      <path d="M0-300c-48 88-50 226-21 403h42C50-74 48-212 0-300Z" fill="#e2b489" opacity=".7" />
      <path d="M0-300C-207-300-223-110-86 86q87 28 172 0C223-110 207-300 0-300ZM0-300c-111 10-129 182-44 397M0-300c111 10 129 182 44 397M0-300v401" fill="none" stroke="#aa916f" strokeWidth="2.5" />
      <path d="M-162-37q164 38 324 0M-102 66q101 25 204 0" fill="none" stroke="#f9e7be" strokeWidth="6" />
      <path d="M-165-35q37 83 81 0 45 88 84 6 41 79 82-6 44 80 82 0" fill="none" stroke="#9e8c6c" strokeWidth="3" />
      <g fill="#b49a6b"><circle cx="-82" cy="39" r="6" /><circle cx="0" cy="48" r="6" /><circle cx="82" cy="39" r="6" /></g>
      <rect x="-47" y="100" width="94" height="11" rx="5" fill="#b1956c" stroke="#8c8264" strokeWidth="3" />
      <g fill="#f7ebd3" stroke="#897f67" strokeWidth="3.2">
        <path d="M-32 128C-72 78-67 18-47 24c15 5 30 66 30 99m24 2C7 71 30 25 44 35c18 13-3 66-17 99" />
        <path d="M-34 161q-24 27-16 56h100q7-34-22-57Z" fill="#89a6a0" />
        <path d="M-45 141c-2-33 28-42 50-39 26-1 47 19 44 44-3 33-91 41-94-5Z" />
      </g>
      <path d="M-45 48q15 31 18 54m65-45q-12 30-14 47" fill="none" stroke="#d9b8a6" strokeWidth="6" strokeLinecap="round" />
      <path d="M-27 136q7 7 14 0m28 0q7 7 14 0" fill="none" stroke="#786f5c" strokeWidth="3" strokeLinecap="round" />
      <path d="m-3 145 5 4 5-4m-5 4v5" fill="none" stroke="#aa8877" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="-31" cy="148" rx="7" ry="3" fill="#debea6" /><ellipse cx="33" cy="148" rx="7" ry="3" fill="#debea6" />
      <path d="M-29 169q30 11 61-4l4 12q-38 18-69 4Z" fill="#658e91" stroke="#6b8380" strokeWidth="2.5" />
      <path data-part="scarf" d="m16 169 60-1-7 13 6 11q-41 9-63-12Z" fill="#86aba7" stroke="#6b8380" strokeWidth="2.5" />
      <path d="M-79 198H79l-15 78H-61Z" fill="#c9aa79" stroke="#8b8263" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M-73 215H74m-70 20h67m-64 20h60M-48 204l6 65m29-66 2 68m29-68-2 68m31-68-6 66" fill="none" stroke="#a28d63" strokeWidth="2.5" />
      <path d="M-64 220H64m-125 20H60m-58 20h55" stroke="#e8d19e" strokeWidth="2" opacity=".65" />
      <rect x="-85" y="191" width="170" height="17" rx="8" fill="#d9bd8a" stroke="#8b8263" strokeWidth="3" />
      <ellipse cx="-38" cy="188" rx="12" ry="8" fill="#f7ebd3" stroke="#897f67" strokeWidth="2.5" /><ellipse cx="38" cy="188" rx="12" ry="8" fill="#f7ebd3" stroke="#897f67" strokeWidth="2.5" />
      <path d="M-41 215q-2 21 41 22 41-1 41-22" fill="none" stroke="#eee0b6" strokeWidth="5" />
    </g></g>
    <g className="rest-balloon-foreground"><g data-part="clouds-near">
      <path d="M-120 773q-34-79 44-94 54-83 132-24 57-9 75 45 98-8 99 73Zm1006 16c-17-76 56-120 114-92 27-86 160-91 189-5 95-47 174 17 183 97Z" fill="#f6edcf" opacity=".9" />
      <path d="M-100 790q218-66 424-2 185-49 302-2 164-42 319 0 199-78 595-4v118H-100Z" fill={paint('cloud-sea')} />
      <path d="M100 819h196m615-20h206m-796 66h145m608-16h118" fill="none" stroke="#fff4dc" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </g></g>
  </SceneryFrame>;
}
