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


Object.assign(PERSONAL_TALES,{
 duqian:{before:'山下来了几户避兵的人。杜迁搬开寨门前的拒马，叫他们先过，自己站到路中间。',after:'人进齐了，杜迁才闩上寨门。一个孩子落下的草鞋，还挂在他的枪杆上。'},
 songwan:{before:'雨水冲坏了上山的石阶。宋万把绳子拴在树上，让背粮的乡勇攀着走，自己留下断后。',after:'最后一担粮上了坡。宋万扯下断绳，抹去脸上的泥，叫人明早来补石阶。'},
 caozheng:{before:'粮车停在店后，押车的军士却要连店里的米一并搬走。曹正摘下围裙，把门口让给同伴。',after:'车夫领回缰绳，曹正回厨房看锅。灶里的火灭了，还得重新生。'},
 zhufu:{before:'草棚里躺着几个受伤的客人，林边还听得见追赶声。朱富烧了热水，托你守住棚口。',after:'伤者能坐起来了。朱富把剩下的热水倒进碗里，又去找干净的布。'},
 houjian:{before:'护送的人还没上路，衣甲上的绳扣已断了几处。侯健刚穿好针，前头便传来喊声。',after:'侯健沿着旧针脚把裂口缝拢，拉了两下才交还：回去换块整皮，这处撑不久。'},
 shien:{before:'快活林的伙计被堵在林口，扁担和碗碟散了一地。施恩认出领头的，提着短刀追过去。',after:'伙计蹲下收拾碎碗。施恩让他先扶伤者回店，自己留下把路清开。'}
});
Object.assign(PERSONAL_TRAITS,{duqian:'cover',songwan:'brace',caozheng:'shatter',zhufu:'cleanse',houjian:'stitch',shien:'bleed_chase'});
Object.assign(TRAIT_LABELS,{brace:'守住坡口',stitch:'补甲护身',bleed_chase:'趁伤追击'});

Object.assign(GEAR_TRAITS,{
 field_bandage:{name:'重伤救护',kind:'fieldcare',text:'有效治疗后，若受疗者气血仍低于一半，再恢复其最大气血 5%；每 8 秒一次。'},
 watchman_blade:{name:'破隙追击',kind:'press',text:'普攻命中破甲或虚弱的敌人后，追加自身攻击 30% 的伤害；每 5 秒一次。'},
 thorn_coat:{name:'止血脱困',kind:'tenacity',text:'受到直接攻击后气血低于一半且未退阵，清除自身一项毒伤或流血，再获得 10% 护阵 4 秒；每 12 秒一次。'}
});
Object.assign(TRAIT_LABELS,{fieldcare:'重伤救护',press:'破隙追击',tenacity:'止血脱困'});
Object.assign(PERSONAL_TRAITS,{xueyong:'press',xiangchong:'counter',ligun:'cover',songqing:'fieldcare',yuehe:'heal_rally',fanrui:'tenacity'});
Object.assign(PERSONAL_TALES,{
 xueyong:{before:'路边卖艺的家伙被人踢翻了。薛永捡起棍子，叫你拦住那人的退路。',after:'银钱一枚枚拾回盘中。薛永收好棍子，给摔倒的孩子拍去土。'},
 xiangchong:{before:'山口容不得并排走人。项充把团牌向前一横，让搬粮的人贴着他过去。',after:'最后一个粮袋运过山口，项充拔下牌上的断箭，才退了下来。'},
 ligun:{before:'同伴的盾带断了。李衮挪步挡到他身前，叫他先把绳结扎紧。',after:'李衮试了试新扎的盾带，把盾交还同伴，两人一道下山。'},
 songqing:{before:'运粮人倒在车旁，车轮还卡着他的腿。宋清掀开粮袋，腾出一块平地。',after:'伤者终于喝下半碗热水。宋清重新捆好粮车，让他躺在最稳当的一辆上。'},
 yuehe:{before:'牢门外乱了起来，伤者听见脚步就要起身。乐和扶住他，低声叫他等一等。',after:'追兵退远，乐和把门闩抽出来，扶着伤者从侧门离开。'},
 fanrui:{before:'林间有毒蛇出没。樊瑞拾了根长枝拨开草丛，让同伴跟紧脚印。',after:'穿出密林，樊瑞割开染血的袖口，在溪边洗去残毒。'}
});
