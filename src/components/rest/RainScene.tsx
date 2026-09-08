import { fadePart, movePart, SceneryFrame, useRestMotion, useSceneryId, type RestSceneryProps, type SceneryParts } from './RestScenery';

function draw(parts: SceneryParts, t: number) {
  movePart(parts, 'rain', `translate(0 ${t * 78 % 132})`);
  movePart(parts, 'cat', `translate(8 142) scale(${1 + Math.sin(t * 1.2) * .008} ${1 + Math.sin(t * 1.2) * .017})`);
  movePart(parts, 'steam', `translate(${Math.sin(t / 2) * 3} ${-4 - Math.sin(t / 2) * 7})`);
  fadePart(parts, 'steam', .27 + (Math.sin(t / 2) + 1) * .11);
  movePart(parts, 'plant', `rotate(${Math.sin(t / 3) * 1.5} 240 161)`);
  movePart(parts, 'branch', `rotate(${Math.sin(t / 4) * .8} -210 173)`);
}
export default function RainScene({ playing, speed, compact }: RestSceneryProps) {
  const ref = useRestMotion(playing, speed, draw), id = useSceneryId();
  const paint = (name: string) => 'url(#' + id(name) + ')';
  return <SceneryFrame svgRef={ref} id={id} compact={compact} title="小猫的雨窗小憩" description="雨点沿着拱形窗户滑落。橘猫蜷在软垫上缓慢呼吸，热茶升起淡淡的蒸汽，窗边的绿叶轻轻摇动。画面没有声音。">
    <defs>
      <linearGradient id={id('wall')} x2="0" y2="1"><stop stopColor="#dfdfd5" /><stop offset="1" stopColor="#e8dec7" /></linearGradient>
      <linearGradient id={id('glass')} x2="0" y2="1"><stop stopColor="#9cafb0" /><stop offset="1" stopColor="#c1cdc1" /></linearGradient>
      <clipPath id={id('window')}><path d="M-305 163v-258c0-264 610-264 610 0v258Z" /></clipPath>
    </defs>
    <path d="M0 0h1440v900H0Z" fill={paint('wall')} />
    <g fill="none" stroke="#c6caba" strokeWidth="2" opacity=".28"><path d="M82 417q32-46 65 0m48-58q32-46 65 0m-52 189q32-46 65 0m1015-141q32-46 65 0M98 647q32-46 65 0" /><path d="M150 342v12m298 170v12m-80-346v12m946 365v12m-52-334v12" /></g>
    <path d="M0 744q685-33 1440 0v156H0Z" fill="#c5b999" /><path d="M0 758q685-33 1440 0" fill="none" stroke="#ede2c5" strokeWidth="3" />
    <g className="rest-rain-anchor">
      <path d="M-338 199v-294c0-308 676-308 676 0v294Z" fill="#c0baa1" opacity=".3" transform="translate(15 13)" />
      <path d="M-329 187v-282c0-291 658-291 658 0v282Z" fill="#e6d2aa" stroke="#a2987b" strokeWidth="4" />
      <path d="M-305 163v-258c0-264 610-264 610 0v258Z" fill={paint('glass')} stroke="#aaab95" strokeWidth="4" />
      <g clipPath={paint('window')}>
        <path d="M-380 138c150-165 189-83 274-155 79-67 160 60 232 24 138-70 177-66 263-7v211H-380Z" fill="#91a8a0" opacity=".5" />
        <path d="M-352 122q118-51 195 9 84-101 179-53 95-23 121 45 91-51 188-14v96H-352Z" fill="#73988c" opacity=".55" />
        <g data-part="branch" fill="none" stroke="#648b7e" strokeWidth="7" strokeLinecap="round"><path d="M-212 212q1-144-74-274m68 182q76-113 129-114m-145 72q-40-28-75-36" /><path d="M-199 79q42-67 88-62m-164-47q15 64 47 77" stroke="#80a393" strokeWidth="19" /></g>
        <g data-part="rain" fill="none" stroke="#e6efe4" strokeWidth="2.5" strokeLinecap="round" opacity=".55">
          {Array.from({ length: 22 }, (_, col) => Array.from({ length: 6 }, (_, row) => <path key={col + '-' + row} d={`m${-365 + col * 36} ${-455 + row * 132 + (col * 37 % 113)} -6 ${13 + col % 4 * 5}`} />))}
        </g>
        <path d="M-255-252-85 170M-232-279-47 176M221-239 303-35" fill="none" stroke="#eff0df" strokeWidth="22" opacity=".12" />
      </g>
      <path d="M0-293v455M-305-68h610" fill="none" stroke="#9a9a83" strokeWidth="15" /><path d="M-3-290v450M-303-72h606" fill="none" stroke="#ecdbb8" strokeWidth="10" />
      <path d="M-305 163v-258c0-264 610-264 610 0v258" fill="none" stroke="#a2997d" strokeWidth="4" />
      <rect x="-348" y="168" width="696" height="33" rx="6" fill="#d0b890" stroke="#a28c6b" strokeWidth="3" /><path d="M-336 178h672" stroke="#edddba" strokeWidth="4" />
      <ellipse cx="8" cy="171" rx="154" ry="30" fill="#839b87" stroke="#6d8876" strokeWidth="3" /><path d="M-120 176q125 27 255-2" fill="none" stroke="#afbaa0" strokeWidth="3" />
      <g data-part="cat" transform="translate(8 142)">
        <path d="M-103 16c-21-65 38-119 96-98 60-3 120 55 104 98Z" fill="#d6a376" stroke="#8f7c5f" strokeWidth="3" />
        <path d="M-92-27q-61 5-40 48 18 34 80 10c37-14 36-42 10-44-22-2-26 18-13 23" fill="#ddb385" stroke="#8f7c5f" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M10-31-6-81l39 13 31-23 11 56c27 40 5 66-36 60-38-5-57-18-29-56Z" fill="#dfb68a" stroke="#8f7c5f" strokeWidth="3" strokeLinejoin="round" />
        <path d="m6-69 10 28 14-15m31-20-19 16 20 14" fill="#cc9d82" />
        <path d="M5-7q22 22 42 3 5 9 23 5-1 24-29 22C19 23 7 11 5-7Z" fill="#efe2c3" />
        <path d="M16-16q7 8 15 0m18 0q7 8 15 0" fill="none" stroke="#776c55" strokeWidth="2.6" strokeLinecap="round" /><path d="m34-4 7 5 6-5" fill="#ad8c76" /><path d="m2-3-24-6m24 14-22 1m87-8 22-5m-22 12 20 3" stroke="#a18b6b" strokeWidth="2" strokeLinecap="round" />
        <path d="m-49-68 16 25m7-32 12 25m-93 48 18 7m-27 10 18 5M30-63l3 18m12-21-1 18" stroke="#b88c65" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g transform="translate(-230 167)"><ellipse cx="0" cy="0" rx="43" ry="8" fill="#bbaa89" opacity=".6" /><path d="M24-47c35-5 35 41 1 32" fill="none" stroke="#758e80" strokeWidth="8" /><path d="M-30-52h61l-4 42q-27 15-53 0Z" fill="#9caf94" stroke="#718879" strokeWidth="3" /><ellipse cx="0" cy="-52" rx="30" ry="7" fill="#ddd2ad" stroke="#718879" strokeWidth="2.5" /><ellipse cx="0" cy="-52" rx="23" ry="4" fill="#9a8864" /><path d="M-19-37v22" stroke="#c4cfaf" strokeWidth="4" strokeLinecap="round" /><g data-part="steam" fill="none" stroke="#f9f0da" strokeWidth="4" strokeLinecap="round"><path d="M-10-72q-17-21 0-38t0-37M9-65q19-23 2-45" /></g></g>
      <g data-part="plant" stroke="#73856a" strokeWidth="3"><path d="M242 164q-7-81 19-136m-21 120q-26-52-53-66" fill="none" /><path d="M247 99q-51-3-43-38 37 0 43 38m6-30q-16-39 11-58 18 32-11 58m-11 54q21-43 51-23-14 29-51 23m-20 6q-52 0-46-29 32-7 46 29" fill="#99ab86" strokeLinejoin="round" /></g>
      <path d="M208 142h70l-10 40h-49Z" fill="#cda686" stroke="#a0896b" strokeWidth="3" /><path d="M211 153h64" stroke="#e8c4a0" strokeWidth="3" />
      <path d="M-351 202h702v16H-351Z" fill="#b69e7b" /><path d="M-296 219v22m592-22v22" stroke="#9f8c6e" strokeWidth="12" />
    </g>
    <path d="M-10 822h163m14 0h51m818-36h212m-83 48h211" fill="none" stroke="#e8d9b7" strokeWidth="3" opacity=".5" strokeLinecap="round" />
  </SceneryFrame>;
}
