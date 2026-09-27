import assert from 'node:assert/strict';
import {fixture,d} from './shuihu-campaign-fixtures.mjs';
import {render,esc} from '../public/game/js/ui.js';
import {inventorySelection} from '../public/game/js/inventory-ui.js';
import {inventoryEntry} from '../public/game/js/provisions-ui.js';
const s=fixture();for(const i of d.items)s.inventory[i.id]=3;const before=JSON.stringify(s);
const groups=['招贤','养成','材料与线索'];
const first=inventorySelection(s,d,groups,{pageSize:2});assert.equal(first.visible.length,2);assert.ok(first.pages>1);
const second=inventorySelection(s,d,groups,{pageSize:2,page:1});assert.equal(second.visible.some(i=>first.visible.includes(i)),false);
assert.equal(inventorySelection(s,d,groups,{page:-5}).page,0);
const last=inventorySelection(s,d,groups,{page:99999});assert.equal(last.page,last.pages-1);
assert.equal(inventorySelection(s,d,groups,{query:'经验丹'}).visible[0].id,'exp_pill');
assert.equal(inventorySelection(s,d,groups,{query:'没有的东西'}).list.length,0);
for(const tab of ['attributes','ability','develop']){const html=render({state:s,data:d,view:'heroes',pageSections:{heroes:'profile'},roster:{selected:'linchong',dossierTab:tab}});assert.equal((html.match(/class="dossier-panel" hidden/g)||[]).length,2);assert.ok(html.includes('枪阵先护'));assert.ok(html.includes('林冲'));assert.ok(html.includes('data-theme-toggle'));}
const unknown=render({state:s,data:d,view:'heroes',pageSections:{heroes:'profile'},roster:{selected:'chaogai'}});assert.ok(unknown.includes('尚未入寨'));assert.ok(unknown.includes('外传人物 · 不占正册座次'));
const malicious='\"><img src=x onerror=alert(1)>';const bag=render({state:s,data:d,view:'bag',gear:{inventory:{query:malicious}}});assert.ok(!bag.includes('<img src=x'));assert.ok(bag.includes(esc(malicious)));
const btn=(label,c)=>'<button data-command="'+esc(JSON.stringify(c))+'">'+esc(label)+'</button>';
for(const id of ['wine','exp_pill','material_choice','medical_crate','iron']){const html=inventoryEntry(s,d,d.by.items[id],esc,btn);assert.ok(html.includes(d.by.items[id].name));assert.ok(html.includes('data-command'));}
assert.equal(JSON.stringify(s),before,'UI browsing does not mutate a save');
console.log('Folio PASS: read-only rendering, bounded inventory paging/search, escaped search, three hero panels, unowned/external identity, existing item actions preserved.');
