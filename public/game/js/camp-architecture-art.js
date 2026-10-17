// Native SVG illustrations for the camp. Decorative only; no game state is read or changed.
const HALL = `
<ellipse class="art-shadow" cx="2" cy="24" rx="56" ry="8"/>
<path class="art-stone" d="M-45 13 23 22 50 9 50 16 23 31-45 21Z"/>
<path class="art-stone-top" d="m-45 13 26-13 69 9-27 13Z"/>
<path class="art-wall" d="M-35-6 23 1V22l-58-8Z"/>
<path class="art-wall-side" d="m23 1 22-12v22L23 22Z"/>
<path class="art-wood" d="m-35-7 58 8v5l-58-8Zm1 4 4 1v16l-4-1Zm19 3 4 1v16l-4-1Zm36 4 4-1v20l-4 2Z"/>
<path class="art-door" d="m-6 3 17 2v15l-17-2Z"/>
<path class="art-window" d="m-26 2 9 1v8l-9-1Zm54 3 10-5v8l-10 5Z"/>
<path class="art-lattice" d="m-22 3 0 7m-4-4 9 1m16-2v13m34-16v8m-5-3 9-5"/>
<path class="art-roof" d="M-55-7q8 0 13-4l20-20 62 8 10 17 8 2L23 8-36 0Z"/>
<path class="art-roof-side" d="m23 8 35-12-8-2-10-17-18 20Z"/>
<path class="art-eave" d="M-55-7-36 0 23 8 58-4M-22-31l62 8"/>
<path class="art-roof-lines" d="m-30-10 14-15m-3 18 14-16M-7-5 7-21M6-4 20-19M18-2l14-15M-37-7l60 8m-53-13 60 8m8-21 8 15m-2-20 8 14"/>
<path class="art-material-tile" d="m-31-12 12 2m29 4 20 3m-62-3 56 8m-51-14 7 1m38 5 9 2m-14-22 4 7m3-3 4 6"/>
<path class="art-wall" d="m-21-27 31 4v10l-31-4Z"/>
<path class="art-wall-side" d="m10-23 16-8v12l-16 6Z"/>
<path class="art-roof" d="M-36-27q7 1 10-3l13-14 35 5 7 11 7 1-25 10-34-5Z"/>
<path class="art-roof-side" d="m11-17 25-10-7-1-7-11-11 13Z"/>
<path class="art-eave" d="m-36-27 13 5 34 5 25-10m-49-17 35 5"/>
<path class="art-roof-lines" d="m-20-28 10-11m1 13 9-11m0 12 9-10"/>
<path class="art-material-tile" d="m-23-31 12 2m-15 3 34 5m-32-6 3 6m9-4 3 6m9-5 3 6"/>
<path class="art-sign" d="m-9-19 16 2v5l-16-2Z"/>
<path class="art-sign-mark" d="m-5-16 7 1"/>
<path class="art-stone-top" d="m-8 20 20 3-6 5-20-3Zm-6 5 20 3-6 5-20-3Z"/>
<path class="art-line" d="m-14 25 20 3m-26 2 20 3M-40 21v-7m78 4v-7"/>

<path class="art-material-wood" d="m-32-1 0 12m4-1 1-8m-10-10 17 2m18 11 0 12m7-11 0 11m-37-6 3 0m14 5 3 0m-4-4 0 2m15 2 0 2"/><path class="art-material-stone" d="m-38 16 0 6m13-4 0 6m14-4 0 5m12-4 0 6m13-4 0 5m13-7 0 5m11-11 0 5m6-5 0 4m-51 7 18 3m-22 2 18 3"/>
`;
const LUMBER = `
<ellipse class="art-shadow" cx="-1" cy="21" rx="53" ry="8"/>
<path class="art-earth" d="m-49 12 28-14 70 14-26 17Z"/>
<path class="art-wood" d="m-38-13 4 1v29l-4-1Zm45 8 4-1v30l-4 2Zm27-14 4-2v29l-4 2Z"/>
<path class="art-beam" d="m-38-9 47 8 29-15M-34 9-21-7M11 16 27-9"/>
<path class="art-roof" d="m-52-13 27-22 59 10 12 17L11 5-39-5Z"/>
<path class="art-roof-side" d="M11 5 46-8 34-25 10-9Z"/>
<path class="art-eave" d="m-52-13 13 8L11 5 46-8m-71-27 59 10"/>
<path class="art-roof-lines" d="m-32-13 14-16m-2 19 13-16m-1 18 13-16M8-7l13-15m-54 14 42 8"/>
<path class="art-material-tile" d="m-30-24 56 10m-59-1 53 10m-56-1 51 10m-30-25 2 6m10-4 2 6m10-3 2 6m-42-3 2 6m10-4 2 6m10-3 2 6"/>
<path class="art-log" d="m-34 6 27 4v6l-27-4Zm1-7 29 5v6l-29-5Zm6-6 26 5v6l-26-5Z"/>
<path class="art-log-end" d="M-7 10c5 0 5 7 0 6s-5-7 0-6Zm3-6c5 1 5 7 0 6s-5-7 0-6Zm3-6c4 1 4 7 0 6s-4-7 0-6Z"/>
<path class="art-grain" d="m-28 9 15 2m-15-9 16 3m-11-8 14 2"/>
<path class="art-plank" d="m17 7 30 6-12 5-30-7Z"/>
<path class="art-beam" d="m13 11-7 12m15-10 5 13m10-10 4 10m6-13 7 11"/>
<path class="art-saw" d="m10 3 31-11 2 3-29 12Z"/>
<path class="art-wood" d="m6 2 7-2 2 6-7 2Z"/>
<path class="art-log" d="m-49 16 22 4v7l-22-4Zm4-7 25 5v7l-25-5Z"/>
<path class="art-log-end" d="M-27 20c5 1 5 8 0 7s-5-8 0-7Zm7-6c5 1 5 8 0 7s-5-8 0-7Z"/>
<path class="art-line" d="m-41 15 15 3m-18 2 10 2"/>

<path class="art-material-wood" d="m-36-8 0 18m45-10 0 16m27-32 0 16m-62 4 18 3m-14-8 15 3m-10-9 10 2m-37 22 14 3m-9-8 13 3m30-2 20 4m-20-2 13 3"/><path class="art-material-ring" d="M-7 12a1.3 1.8 0 1 0 0 .1m3-6a1.3 1.8 0 1 0 0 .1m3-6a1.2 1.7 0 1 0 0 .1m-26 22a1.3 1.8 0 1 0 0 .1m7-6a1.3 1.8 0 1 0 0 .1"/>
`;
const BARRACKS = `
<ellipse class="art-shadow" cx="1" cy="22" rx="55" ry="8"/>
<path class="art-earth" d="m-51 10 28-14 75 16-29 17Z"/>
<path class="art-wall" d="m-32-10 42 6v25l-42-6Z"/>
<path class="art-wall-side" d="m10-4 29-14V8L10 21Z"/>
<path class="art-wood" d="m-31-10 3 1v24l-3-1ZM8-4l3 1v24l-3 1Z"/>
<path class="art-door" d="m-22 0 12 2v14l-12-2Z"/>
<path class="art-window" d="m-4-1 9 2v8l-9-2Zm20 0 14-7v8L16 8Z"/>
<path class="art-lattice" d="m0 1 0 6m-4-3 9 2m18-8v7m-7-1 14-7"/>
<path class="art-roof" d="m-46-10 26-25 50 9 17 19L10 6-34-2Z"/>
<path class="art-roof-side" d="M10 6 47-7 30-26 8-9Z"/>
<path class="art-eave" d="m-46-10 12 8 44 8L47-7m-67-28 50 9"/>
<path class="art-roof-lines" d="m-28-11 13-17m-2 19 14-17M-6-7 8-24M7-6l12-16m-45 17 34 6"/>
<path class="art-material-tile" d="m-26-22 48 9m-52 2 46 8m-48 1 44 8m-25-28 2 6m10-4 2 6m-26-1 2 6m10-3 2 6m10-3 2 6"/>
<path class="art-wood" d="M-48-6h3v28h-3Zm-5 7 23 4v3l-23-4Z"/>
<path class="art-iron" d="m-41 4 2-23 1 23Zm7 1 1-21 1 22Z"/>
<path class="art-spear" d="m-41-19 2-6 2 7-2 2Zm6 3 2-6 2 7-2 2Z"/>
<path class="art-beam" d="m-46 20-6 8m6-8 8 8m73-28 0 28m-5-24 13 3"/>
<path class="art-shield" d="m31 7 8 1v11l-4 5-4-5Z"/>
<path class="art-line" d="m35 10v9m10-13v20"/>
<path class="art-banner" d="M37-17v-22m0 1 17 3-5 6-12-2Z"/>
<path class="art-wood" d="m-10 20 20 3-7 4-20-3Z"/>

<path class="art-material-wood" d="m-29-5 0 17m38-11 0 16m-28-13 0 11m4-11 0 12m-18 7 18 3m-37-14 12 2m-9-1 0 4m3-3 0 4"/><path class="art-material-stone" d="m-30 16 39 6 18-9m-48 5 0 4m12-2 0 4m12-2 0 4m15-9 0 4m-57-4 6 1m46-21 7-3"/>
`;
const FARM = `
<ellipse class="art-shadow" cx="-2" cy="22" rx="54" ry="7"/>
<path class="art-earth" d="m-55 10 30-16 75 17-28 18Z"/>
<path class="art-wall" d="m-43-3 32 6v21l-32-7Z"/>
<path class="art-wall-side" d="m-11 3 20-13v22l-20 12Z"/>
<path class="art-door" d="m-35 4 10 2v14l-10-2Z"/>
<path class="art-window" d="m-19 6 5 1v6l-5-1Z"/>
<path class="art-straw" d="m-54-4 22-25 33 8L18-4-11 9-45 2Z"/>
<path class="art-straw-side" d="M-11 9 18-4 1-21-12-8Z"/>
<path class="art-thatch-lines" d="m-40-6 11-16m-3 19 10-16m-2 18 10-16m-2 18 8-15m1 11 3-7m2 4 3-6M-50-1l7 3m3-1 6 3m2-1 6 3m2-1 6 3m2-1 6 3m4-1 6-3m2-1 6-3"/>
<path class="art-wood" d="m21-9 19 4V8L21 4Z"/>
<path class="art-wood-side" d="m40-5 11-6V2L40 8Z"/>
<path class="art-straw" d="m16-10 13-15 19 4 9 11-17 9Z"/>
<path class="art-thatch-lines" d="m23-11 7-10m0 12 7-10m0 11 7-10"/>
<path class="art-beam" d="m23 4-1 9m15-6 1 10m7-11 1 8"/>
<path class="art-bale" d="m10 12 13 3v9l-13-3Zm21 2 13 3v9l-13-3Zm-2 9 10 2v5l-10-2Z"/>
<path class="art-grain" d="m13 14 0 6m3-5v6m3-5v6m15-5v6m4-5v6"/>
<path class="art-line" d="m-51 21 13 3m-9 1 15 3m24-19 12 3m-12-1 12 3m2-15 0 12"/>
<path class="art-iron" d="m7-4 6 1-1 4-6-1Z"/>

<path class="art-material-thatch" d="m-39-15 5 2m2 1 5 2m2 0 5 2m2 0 4 1m-31 0 6 2m2 0 6 2m2 0 6 2m2 0 5 1m-34 0 6 2m2 0 5 2m2 0 5 2m2 0 6 2m13-15 4-3m-1 9 5-3m-3 8 5-3m18-16 5 1m-13 4 5 1m2 1 5 1m-16 3 4 1m2 1 5 1m2 1 4 1"/><path class="art-material-wood" d="m-32 7 0 11m4-10 0 11m51-24 0 7m5-6 0 7m5-6 0 7m5-5 0 7m7-11 0 8m-21 4 11 2m-24 10 8 1m15-3 9 2"/><path class="art-material-stone" d="m-42 18 28 6m-24-5 0 3m9-1 0 3m9-1 0 3"/>
`;
const CLINIC = `
<ellipse class="art-shadow" cx="0" cy="23" rx="54" ry="8"/>
<path class="art-stone-top" d="m-50 10 28-16 75 15-27 21Z"/>
<path class="art-wall" d="m-35-7 46 7v21l-46-7Z"/>
<path class="art-wall-side" d="m11 0 25-14V7L11 21Z"/>
<path class="art-door" d="m-17 1 13 2v15l-13-2Z"/>
<path class="art-window" d="m-30 0 8 1v8l-8-1Zm29 4 7 1v8l-7-1Zm18-4 10-6v8l-10 6Z"/>
<path class="art-lattice" d="m-26 1v7m-4-4 8 1m25 1v6m19-14v7m-5-1 10-6"/>
<path class="art-roof" d="m-48-8 28-24 47 8 17 18L11 6-36-1Z"/>
<path class="art-roof-side" d="M11 6 44-6 27-24 9-8Z"/>
<path class="art-eave" d="m-48-8 12 7 47 7L44-6m-64-26 47 8"/>
<path class="art-roof-lines" d="m-31-9 14-17m-1 19 13-17m-1 18L9-22M7-5 20-20m-49 16 36 6"/>
<path class="art-material-tile" d="m-26-19 48 8m-53 3 47 8m-50-1 47 8m-25-27 2 6m9-4 2 6m-26 0 2 6m10-4 2 6m10-4 2 6"/>
<path class="art-wood" d="m-31-1 4 1v17l-4-1Zm39 6 3 1v17l-3-1Z"/>
<path class="art-sign" d="m-17-4 14 2v5l-14-2Z"/>
<path class="art-sign-mark" d="m-13-1 6 1"/>
<path class="art-wall" d="m-49 11 23 5v11l-23-5Zm66 13 34-18v10L17 34Z"/>
<path class="art-stone-top" d="m-51 10 24 4 3 3-25-4Zm67 13L50 5l3 2-35 19Z"/>
<path class="art-beam" d="m24-6 0 25m20-34 0 24m-20-8 20-10"/>
<path class="art-drying" d="m22 7 27-12 3 4L25 11Zm0 6L49 1l3 4-27 12Z"/>
<path class="art-herbs" d="m27 7 7-3m5-2 6-3m-17 14 7-3m5-2 6-3"/>
<path class="art-pot" d="M-17 23q-4 8 2 8t3-8Zm7 1q-4 8 2 8t3-8Z"/>
<path class="art-herb-stem" d="m-14 24 0-6m0 3-3-2m3 0 3-2m3 8 0-5m0 3 3-3"/>

<path class="art-material-wood" d="m-29 1 0 14m39-7 0 12m-24-15 0 11m4-10 0 11m35-20 0 20m-20-9 0 14"/><path class="art-material-stone" d="m-47 12 19 4m-15-4 0 3m8-1 0 3m-15 3 23 5m-15-3 0 4m11-1 0 4m54-14 0 3m9-8 0 3m8-8 0 3m-15 6 0 7m10-13 0 7m-31 10 20-11"/><path class="art-material-herb" d="m29 5 0 2m4-4 1 2m7-6 0 3m4-4 1 2m-16 10 0 2m5-4 1 2m6-6 0 3m4-4 1 2"/>
`;
const MARKET = `
<ellipse class="art-shadow" cx="0" cy="23" rx="57" ry="8"/>
<path class="art-earth" d="m-55 13 32-17 78 18-29 18Z"/>
<path class="art-wall" d="m8-9 29 5v21L8 12Z"/>
<path class="art-wall-side" d="m37-4 17-10V7L37 17Z"/>
<path class="art-roof" d="m-1-10 19-20 27 6 16 15-24 12-29-5Z"/>
<path class="art-roof-side" d="M37 3 61-9 45-24 36-9Z"/>
<path class="art-eave" d="m-1-10 9 8 29 5L61-9m-43-21 27 6"/>
<path class="art-roof-lines" d="m12-11 9-14m0 16 9-14m1 16 8-13"/>
<path class="art-material-tile" d="m14-19 29 6m-32 3 28 5m-13-20 1 5m-6 4 2 5m9-4 1 6"/>
<path class="art-brick" d="m38-21 8 2v-24l-8-2Z"/>
<path class="art-brick-side" d="m46-19 6-4v-24l-6 4Z"/>
<path class="art-stone-top" d="m36-45 7-4 11 2-8 5Z"/>
<path class="art-line" d="m39-37 6 1m-6 5 6 1m-6 5 6 1"/>
<path class="art-door" d="m21 1 11 2v13l-11-2Z"/>
<path class="art-furnace" d="M39 12v-6q0-7 5-7t6 9v7Z"/>
<path class="art-furnace-mouth" d="m43 7 4 1v6l-4-1Z"/>
<path class="art-wood" d="M-47-4h3v25h-3Zm35 6 3 1v25l-3-1Zm18-12 3-1v27l-3 1Z"/>
<path class="art-canopy" d="m-54-7 21-19L7-18 17-5-10 8-44 1Z"/>
<path class="art-canopy-side" d="M-10 8 17-5 7-18-12-8Z"/>
<path class="art-canopy-stripe" d="m-41-7 16-16 8 2-16 17Zm16 3 15-16 8 1-15 17Z"/>
<path class="art-line" d="m-54-7 10 8 34 7L17-5m-60 6v4m8-2v4m9-2v4m9-2v4"/>
<path class="art-plank" d="m-47 12 33 6 17-8-33-6Z"/>
<path class="art-wood-side" d="m-47 12 33 6v9l-33-7Zm33 6 17-8v9l-17 8Z"/>
<path class="art-basket" d="M-37 7q-5 0-3 7l8 1q3-7-1-7Zm15 2q-5 0-3 7l8 1q3-7-1-7Z"/>
<path class="art-pot" d="M-4 18q-5 10 2 10t4-9Zm9-2q-4 10 2 10t4-9Z"/>
<path class="art-iron" d="m20 24 8-4 8 2-8 4Zm-1 0 9 2v4l-9-2Z"/>
<path class="art-beam" d="m23 27-2 6m9-5 3 5"/>

<path class="art-material-cloth" d="m-47-1q5 3 9 1m2 1q5 3 9 1m2 1q5 3 9 1m7 0q5 0 9-4m2-1q5-1 9-5m-31-1 15-14"/><path class="art-material-wood" d="m-45 15 29 6m-27-4 0 5m10-3 0 4m9-3 0 4m20-28 0 19m-7-10 0 19m16-7 0 5m10-21 0 13m5-12 0 13m-39 0 5 1"/><path class="art-material-stone" d="m40-42 5 1m-5 5 5 1m-5 5 5 1m-5 5 5 1m-3-15v3m0 8v3m6-11 3-2m-3 9 3-2m-12 29 10 2m-9-7 2 0m-1-5 4 1m-31 6 17 3m-10-1 0 3"/>
`;
const ART = Object.freeze({hall:HALL,lumber:LUMBER,barracks:BARRACKS,farm:FARM,clinic:CLINIC,market:MARKET});

// x/y locate the centre of each building's ground plane in the shared map coordinates.
export function campBuildingArt(id,x,y,built=true){
 const body=ART[id];if(!body)return '';
 return '<g class="camp-architecture '+(built?'architecture-built':'architecture-unbuilt')+'" transform="translate('+Number(x)+' '+Number(y)+')">'+body+'</g>';
}

export function campFacilityArt(id){
 if(!ART[id])return '';
 return '<svg class="camp-architecture-detail" viewBox="0 0 360 90" aria-hidden="true" focusable="false"><path class="art-detail-ground" d="M22 81h316M47 86h61m143 0h36"/><g transform="translate(180 52) scale(1.1)">'+campBuildingArt(id,0,0)+'</g><path class="art-detail-grass" d="m49 79-3-6m3 6 3-9m-3 9 5-3m251 3-3-6m3 6 3-9m-3 9 5-3"/></svg>';
}
