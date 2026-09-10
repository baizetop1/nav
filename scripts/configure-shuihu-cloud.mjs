import {readFileSync,writeFileSync} from 'node:fs';
const value=process.argv[2];
if(!value)throw new Error('用法：node scripts/configure-shuihu-cloud.mjs https://你的存档服务域名（停用传 off）');
let origin='';if(value!=='off'){
  const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('只接受不含凭据、路径、查询的 HTTPS 来源。');origin=url.origin;
}
const htmlFile=new URL('../public/game/index.html',import.meta.url),configFile=new URL('../public/game/cloud-config.json',import.meta.url);
const html=readFileSync(htmlFile,'utf8');if(!/connect-src [^;]+;/.test(html))throw new Error('找不到 CSP connect-src，请手动检查。');
writeFileSync(htmlFile,html.replace(/connect-src [^;]+;/,`connect-src 'self'${origin?' '+origin:''};`));
writeFileSync(configFile,JSON.stringify({baseUrl:origin},null,2)+'\n');
console.log(origin?'已配置游戏云端地址和精确 CSP 来源；请构建后推送导航仓库。':'已停用云端；本机存档与文件流转不受影响。');
