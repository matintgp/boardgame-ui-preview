/* Town Hall data (15 original Salem 1692 characters). Frontend simulation only. */
(()=>{
'use strict';
const base='assets/portraits/portrait-';
const raw=[
 ['abigail','Abigail Williams','ابیگیل ویلیامز',11,'کودک','trigger','اگر آخرین اتهام را برای افشای Tryal ثبت کنی، تمام اتهام‌های مقابل خودت را پاک می‌کنی.',1],
 ['ann','Ann Putnam','آن پاتنام',13,'دانش‌آموز','trigger','اگر اتهام نهایی را ثبت کنی، می‌توانی قبل از افشای Tryal دو کارت بکشی و در همان نوبت استفاده کنی.',7],
 ['cotton','Cotton Mather','کاتن مَدر',29,'کشیش','passive','کارت Evidence با ارزش ۳، هنگام بازی روی تو فقط ۱ اتهام محسوب می‌شود.',4],
 ['giles','Giles Corey','جایلز کوری',71,'مالک زمین','trigger','اگر در نوبت کشیدن، دو کارت Accusation تک‌اتهامی بکشی، کارت سوم هم می‌کشی.',5],
 ['george','George Burroughs','جورج باروز',40,'روحانی','passive','برای افشای یکی از Tryalهای تو به ۸ اتهام نیاز است، نه ۷.',6],
 ['john','John Proctor','جان پراکتور',60,'کشاورز','trigger','با مرگ بازیکنی دیگر، کارت‌های دست و کارت‌های آبیِ جلوی او را برمی‌داری.',6],
 ['martha','Martha Corey','مارتا کوری',72,'خیاط','passive','قابلیت اولین بازیکن زنده در سمت راستت را به ارث می‌بری.',3],
 ['mary','Mary Warren','مری وارن',17,'خدمتکار','passive','از اثر منفی گربه سیاه و کارت Matchmaker مصونی.',2],
 ['rebecca','Rebecca Nurse','ربکا نرس',71,'خانه‌دار','trigger','پس از افشای Tryal بازیکنی دیگر به دلیل اتهام یا توطئه، یک کارت می‌کشی؛ نه هنگام مرگ یا اعتراف.',3],
 ['samuel','Samuel Parris','ساموئل پاریس',39,'کشیش','twice','دو بار در کل بازی، می‌توانی به‌جای دسته اصلی، حداکثر دو کارت از دورریز برداری و نوبتت را تمام کنی.',4],
 ['sarah','Sarah Good','سارا گود',39,'گدا','passive','کارت‌های Robbery و Arson روی تو اثری ندارند و دور ریخته می‌شوند.',8],
 ['thomas','Thomas Danforth','توماس دنفورث',69,'قاضی','trigger','اگر اتهام ششم را روی هدف قرار بدهی، می‌توانی یک Tryal او را افشا کنی (جز استثناهای کارت‌ها).',5],
 ['tituba','Tituba','تیتوبا',35,'قصه‌گو','once','یک بار در بازی، در نوبت خود و قبل از کشیدن، می‌توانی دسته کارت‌ها را ببینی و چیدمان آن را عوض کنی.',2],
 ['will','Will Griggs','ویل گریگز',47,'پزشک','passive','می‌توانی از Alibi به‌عنوان Witness با ارزش ۷ اتهام استفاده کنی.',1],
 ['william','William Phips','ویلیام فیپس',42,'فرماندار','once','یک بار در بازی می‌توانی هنگام اعتراف، بدون افشای هیچ Tryal، از حمله شبانه مصون شوی.',6]
];
const all=raw.map(([id,en,fa,age,job,type,description,portrait])=>Object.freeze({
 id,en,fa,age,job,type,description,
 // Historical mood paintings adapted for demo; official commercial card artwork is not copied.
 image:'assets/townhall-art/'+id+'.webp',
 initialCharges:type==='once'?1:type==='twice'?2:null
}));
const byId=Object.fromEntries(all.map(c=>[c.id,c]));
function shuffle(input,random=Math.random){
 const items=[...input];
 for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
 return items;
}
function deal(n,random=Math.random){
 const offered=n<=7?2:1;
 const picked=shuffle(all,random);
 if(offered*n>picked.length)throw Error('Not enough unique Town Hall cards');
 const hands=Array.from({length:n},(_,i)=>picked.slice(i*offered,(i+1)*offered).map(x=>x.id));
 return {hands,offered,unused:picked.slice(n*offered).map(x=>x.id)};
}
window.SalemTownHall=Object.freeze({all,byId,deal,shuffle});
})();