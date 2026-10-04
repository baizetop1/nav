export const GEAR_TRAITS = {
 bastion_spear:{name:'护阵反击',kind:'counter',text:'身有护阵并承受直接攻击后，反击攻击者，造成自身攻击 40% 的伤害；每 4 秒一次。'},
 bastion_armor:{name:'稳步结阵',kind:'guard',text:'每第三次普攻后，为自己施加 15% 护阵，持续 4 秒。'},
 bastion_mirror:{name:'护住后排',kind:'cover',text:'身有护阵并承受直接攻击后，为气血比例最低的同伴施加 12% 护阵，持续 4 秒；每 6 秒一次。'},
 skirmish_blade:{name:'截势追击',kind:'follow',text:'本人成功打断首领蓄势后，追加自身攻击 70% 的伤害；每 6 秒一次。'},
 skirmish_coat:{name:'借隙调息',kind:'recover',text:'本人成功打断首领蓄势后，恢复自身 6% 最大气血；每 6 秒一次。'},
 skirmish_tally:{name:'传令抢攻',kind:'rally',text:'本人成功打断首领蓄势后，全队存活者怒气 +6；每 6 秒一次。'},
 furnace_hammer:{name:'击碎护阵',kind:'shatter',text:'普攻命中带护阵的敌人后，移除其护阵；每 8 秒一次。'},
 reed_medicine_case:{name:'施药解毒',kind:'cleanse',text:'本人有效治疗后，清除受疗者一项中毒或流血，并给予 8% 护阵，持续 4 秒；每 6 秒一次。'},
 vault_strategy:{name:'断令乱阵',kind:'weaken',text:'本人成功打断首领蓄势后，使该敌攻击降低 20%，持续 6 秒；每 6 秒一次。'}
};
export const BUILD_GUIDES = {
 counter:{name:'护阵反击',roles:'前排护阵 · 反击兵器 · 治疗同伴',heroes:['linchong','luzhishen','baisheng'],gear:['bastion_armor','bastion_spear','bastion_mirror'],trial:'minechief',text:'让前排承伤时保持护阵，借来敌的攻击反击。敌人伤害较低时收益有限；面对中毒仍需解毒。'},
 interrupt:{name:'打断追击',roles:'打断招式 · 追击兵器 · 集火收尾',heroes:['linchong','yanqing','baisheng'],gear:['skirmish_blade','skirmish_coat','skirmish_tally'],trial:'ruinsvault',text:'开战后在军令中选“保留打断招式”，等首领蓄势再出手，截住治疗并追击。首领没有蓄势时不会触发装备效果。'},
 cleanse:{name:'治疗解毒',roles:'有效治疗 · 解毒药匣 · 前排护卫',heroes:['linchong','andaoquan','baisheng'],gear:['reed_medicine_case','bastion_armor','bastion_mirror'],trial:'marshnest',text:'让治疗跟上毒伤。药匣只在实际恢复气血时触发，满血施招无效；伤害不足时仍可能久战不下。'}
};
export const PERSONAL_TALES = {
 songjiang:{before:'渡口挤着逃难的乡人，后面的追兵已到堤上。宋江把马让给伤者，叫众人先上船。',after:'最后一条船离岸，宋江才解下沾血的外袍。船家把桨递来，他接过便撑。'},
 yanqing:{before:'院墙外响了三声哨。燕青压住你的手：先别动，等守门人换岗。',after:'锁舌轻响，院门开了。燕青把钥匙放回守门人的腰间，领众人从后巷离去。'},
 xuning:{before:'马蹄声从坡下逼近。徐宁蹲下来压住枪杆，叫后排看准马腿，不要抢先探身。',after:'骑兵冲不过枪阵，只得退回坡下。徐宁拾起一杆折枪，给新兵重讲落钩的位置。'},
 liutang:{before:'押粮车陷在路口，拦路的人正伸手解粮袋。刘唐提刀赶上，叫车夫把缰绳攥稳。',after:'车轮重新转动。刘唐把散在地上的粮食拢回袋里，扎了两道绳结。'},
 ruanxiaoer:{before:'水面起了雾，前船迟迟不回。阮小二收起渔网，让同伴贴着芦根划过去。',after:'接应的船挨到岸边，阮小二先扶伤者下船，最后才来拴自己的缆绳。'},
 ruanxiaowu:{before:'追船堵住了窄汊。阮小五把外衣往船头一扔，叫掌舵的看见浪花再转向。',after:'敌船撞进苇丛。阮小五攀住船沿，把湿透的外衣拧干，回头数齐了人。'}
};
export const PERSONAL_TRAITS={songjiang:'heal_rally',yanqing:'follow',xuning:'counter',liutang:'shatter',ruanxiaoer:'cover',ruanxiaowu:'guard'};
export const TRAIT_LABELS={heal_rally:'救伤鼓气',counter:'护阵反击',guard:'稳步结阵',cover:'护住后排',follow:'截势追击',recover:'借隙调息',rally:'传令抢攻',shatter:'击碎护阵',cleanse:'施药解毒',weaken:'断令乱阵'};
export const traitText=e=>GEAR_TRAITS[e.item]?GEAR_TRAITS[e.item].text+((e.refine||0)>0?(GEAR_TRAITS[e.item].kind==='shatter'?' 精修 '+e.refine+' 阶：实际间隔 '+(8/(1+.15*e.refine)).toFixed(2)+' 秒。':' 精修 '+e.refine+' 阶：数值效果提高 '+(e.refine*15)+'%，触发次数和间隔不变。'):''):'';

