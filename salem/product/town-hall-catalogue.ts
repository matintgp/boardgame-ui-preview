/* Only public Town Hall data. A player's hidden Tryal must NEVER be rendered here. */
export type TownHallDefinition={
 id:string; name:string; en:string; description:string; frequency:'permanent'|'triggered'|'once'|'twice';
 portrait:string;
};
const catalogue=[
 ['abigail','ابیگیل ویلیامز','Abigail Williams','پس از اتهام نهایی، اتهام‌های جلوی خودت پاک می‌شوند.','triggered'],
 ['ann','آن پاتنام','Ann Putnam','پس از آخرین اتهام می‌توانی دو کارت اضافی بکشی.','triggered'],
 ['cotton','کاتن مَدر','Cotton Mather','اتهام سه‌تایی روی تو فقط یک اتهام محسوب می‌شود.','permanent'],
 ['giles','جایلز کوری','Giles Corey','با کشیدن دو اتهام تک‌امتیازی، کارت سوم می‌گیری.','triggered'],
 ['george','جورج باروز','George Burroughs','برای افشای Tryal تو اتهام بیشتری لازم است.','permanent'],
 ['john','جان پراکتور','John Proctor','پس از مرگ بازیکن، بخشی از کارت‌های او را به ارث می‌بری.','triggered'],
 ['martha','مارتا کوری','Martha Corey','توانایی بازیکن زنده کناری را به ارث می‌بری.','permanent'],
 ['mary','مری وارن','Mary Warren','از گربه سیاه و Matchmaker مصونی.','permanent'],
 ['rebecca','ربکا نرس','Rebecca Nurse','افشای Tryal دیگران در شرایط مجاز به تو کارت می‌دهد.','triggered'],
 ['samuel','ساموئل پاریس','Samuel Parris','دو بار می‌توانی از دورریز کارت برداری.','twice'],
 ['sarah','سارا گود','Sarah Good','در برابر Robbery و Arson مصونی.','permanent'],
 ['thomas','توماس دنفورث','Thomas Danforth','بعضی Tryalها را با اتهام کمتر افشا می‌کنی.','triggered'],
 ['tituba','تیتوبا','Tituba','یک بار می‌توانی ترتیب دسته کارت را تغییر بدهی.','once'],
 ['will','ویل گریگز','Will Griggs','از Alibi می‌توانی مانند Witness استفاده کنی.','permanent'],
 ['william','ویلیام فیپس','William Phips','یک بار اعتراف بی‌نیاز از افشای Tryal داری.','once']
] as const;
export const townHallCards:readonly TownHallDefinition[]=catalogue.map(([id,name,en,description,frequency])=>({
 id,name,en,description,frequency,portrait:'/salem-art/townhall-art/'+id+'.webp'
}));
export const townHallById:Readonly<Record<string,TownHallDefinition>>=
 Object.fromEntries(townHallCards.map(x=>[x.id,x]));
