  /* BoardGame Mafia V7 — a strictly local, single-human social deduction demo.
     Other players are AI-controlled illustrative agents; no WebSocket, voice, matchmaking or online claims. */
  const mafiaRoles={
    citizen:{label:'شهروند',team:'town',symbol:'✧',description:'شب فعالیتی نداری؛ روز با تحلیل رفتارها مافیا را پیدا کن.'},
    detective:{label:'کارآگاه',team:'town',symbol:'◇',description:'هر شب می‌توانی یک نفر را استعلام کنی. نتیجه فقط برای تو نمایش داده می‌شود.'},
    doctor:{label:'دکتر',team:'town',symbol:'✚',description:'هر شب یک نفر، حتی خودت را از حذف شبانه محافظت کن.'},
    mafia:{label:'مافیا',team:'mafia',symbol:'♠',description:'شب یک قربانی از تیم شهر انتخاب کن و روز هویتت را مخفی نگه دار.'}
  };
  const mafiaNames=['آرش','نیلوفر','کاوه','رها','مهسا','بردیا','سام','ترانه','پارسا'];
  const mafiaFaces=['♛','◆','♟','♜','♧','♣','♢','✦','♠'];
  let mafiaSettings={size:8,role:'citizen',roundTime:60};
  let mafiaGame=null,mafiaInterval=null;
  const mfStore='boardgame-mafia-v7-local-match';
  const mfSafe=s=>esc2(String(s??''));
  const mfNow=()=>new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
  const mfSave=()=>{try{if(mafiaGame)localStorage.setItem(mfStore,JSON.stringify(mafiaGame));else localStorage.removeItem(mfStore);}catch(_){}};
  const mfRead=()=>{try{let x=JSON.parse(localStorage.getItem(mfStore));if(x?.version===7&&Array.isArray(x.players)&&x.players.length>=8&&x.players.length<=10&&typeof x.phase==='string'&&Array.isArray(x.log))return x;}catch(_){}return null;};
  const mfShuffle=arr=>{arr=[...arr];for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[j],arr[i]]=[arr[i],arr[j]];}return arr;};
  const mfMe=()=>mafiaGame?.players?.[0];
  const mfLiving=()=>mafiaGame.players.filter(p=>p.alive);
  const mfOthers=()=>mfLiving().filter(p=>p.id!==0);
  const mfPlayer=id=>mafiaGame.players.find(p=>p.id===Number(id));
  const mfMafia=()=>mfLiving().filter(p=>p.role==='mafia');
  const mfTown=()=>mfLiving().filter(p=>p.role!=='mafia');
  const mfAvatar=(p,size='')=>`<span class="avatar ${size}" aria-hidden="true">${mfSafe(p.name.substring(0,2))}</span>`;
  const mfPhaseLabel=p=>({night:'شب',day:'گفت‌وگوی روز',vote:'رأی‌گیری',reveal:'نتیجه رأی‌گیری',end:'پایان مسابقه'})[p]||'آماده';
  const mfPhaseSymbol=p=>({night:'☾',day:'☀',vote:'✦',reveal:'⚖',end:'✶'})[p]||'♠';
  const mfPhaseTime=()=>mafiaGame.phase==='day'||mafiaGame.phase==='vote';
  const mfTimerText=()=>`${String(Math.floor(mafiaGame.seconds/60)).padStart(2,'0')}:${String(Math.floor(mafiaGame.seconds%60)).padStart(2,'0')}`;
  const mfLog=(text,type='')=>{mafiaGame.log.unshift({text,time:mfNow(),type});mafiaGame.log=mafiaGame.log.slice(0,80);};
  const mfWinCheck=()=>{
    let m=mfMafia().length,t=mfTown().length;
    if(m===0){mafiaGame.winner='town';mafiaGame.phase='end';mfLog('همه اعضای مافیا حذف شدند؛ شهر پیروز شد.','urgent');return true;}
    if(m>=t){mafiaGame.winner='mafia';mafiaGame.phase='end';mfLog('تعداد مافیا به شهروندان رسیده؛ مافیا پیروز شد.','urgent');return true;}
    return false;
  };
  const mfRenderLanding=()=>{
    $('detail-content').innerHTML=`<div class="mf-wrap mf-fade"><section class="mf-hero"><div class="mf-hero-content"><a href="#games" class="breadcrumb" style="font-size:11px;color:#e9c996">${icon2('arrow')} بازگشت به بازی‌ها</a><div class="mf-kicker">THE MAFIA ROOM • SOCIAL DEDUCTION</div><h1>مافیا؛ <em>یک شب، هزار راز.</em></h1><p>به شهری خوش آمدی که حقیقت و دروغ کنار یک میز می‌نشینند. نقش مخفی خودت را بگیر، گفت‌وگو کن و در رأی‌گیری سرنوشت شهر را تغییر بده.</p><div class="mf-tags"><span class="mf-tag">۸ یا ۱۰ بازیکن</span><span class="mf-tag">شب و روز</span><span class="mf-tag">استنتاج و بلوف</span></div><div class="mf-hero-buttons"><button class="btn btn-primary" data-mf-nav="lobby">ورود به لابی مافیا ${icon2('arrow')}</button><button class="btn btn-secondary" data-mf-nav="play">تجربه دموی بازی</button><button class="btn btn-ghost" data-detail-guide="mafia">قوانین بازی</button></div></div></section><div class="mf-main-grid"><section class="mf-panel"><h2>این بار، هر تصمیم یک سرنخ است</h2><p class="mf-muted">برخلاف شطرنج، مهم‌ترین عنصر این بازی تعامل اجتماعی است. طراحی مافیا بر خوانایی نقش‌ها، نمایش مرحله، بازیکنان زنده، رأی‌ها و رویدادهای بازی تمرکز دارد.</p><div class="mf-mode-cards"><button class="mf-mode-card" data-mf-nav="lobby"><span class="mf-symbol">♠</span><strong>لابی اختصاصی</strong><small>تنظیم تعداد بازیکن، مشاهده اتاق‌ها و شروع بازی محلی</small></button><button class="mf-mode-card" data-mf-nav="play"><span class="mf-symbol">☾</span><strong>میز بازی</strong><small>چرخه شب و روز، رأی‌گیری، اکشن نقش و نتیجه مسابقه</small></button></div></section><aside class="mf-panel"><h2>نقش‌های اصلی</h2><div class="mf-roles">${Object.values(mafiaRoles).map(r=>`<div class="mf-role-card"><span class="mf-role-icon">${r.symbol}</span><div><strong>${r.label}</strong><small>${r.team==='mafia'?'تیم مافیا':'تیم شهر'}</small></div></div>`).join('')}</div><p class="mf-muted" style="margin-bottom:0;margin-top:12px">این نسخه یک دموی تک‌نفره با شخصیت‌های شبیه‌سازی‌شده است؛ بازی گروهی واقعی و چت صوتی هنوز متصل نیست.</p></aside></div></div>`;
  };
  const mfRenderLobby=()=>{
    let existing=mfRead();
    $('detail-content').innerHTML=`<div class="mf-wrap mf-fade"><section class="mf-hero"><div class="mf-hero-content"><a href="#game/mafia" class="breadcrumb" style="font-size:11px;color:#e9c996">${icon2('arrow')} معرفی بازی مافیا</a><div class="mf-kicker">MAFIA LOBBY / 01</div><h1>جمع <em>مافیا</em> رو کامل کن</h1><p>اتاقت رو انتخاب کن، نقش‌های بازی رو بشناس و وارد یک مسابقه نمایشی محلی شو. اینجا همه چیز برای تصمیم‌های شب و رأی‌های روز آماده شده.</p><div class="mf-tags"><span class="mf-tag">تنظیم نقش و تعداد نفرات</span><span class="mf-tag">طراحی مخصوص موبایل</span><span class="mf-tag">دموی آفلاین</span></div></div></section><div class="mf-main-grid"><div class="mf-stack"><section class="mf-panel"><div class="mf-row"><div><h2>ساخت مسابقه آزمایشی</h2><div class="mf-muted">برای تست همه امکانات، نقش خودت را انتخاب کن.</div></div><span class="mf-tag">PRIVATE DEMO</span></div><h3 style="margin-top:19px">تعداد بازیکنان</h3><div class="mf-split"><button class="mf-pick" data-mf-size="8" aria-pressed="${mafiaSettings.size===8}">۸ نفر · ۲ مافیا</button><button class="mf-pick" data-mf-size="10" aria-pressed="${mafiaSettings.size===10}">۱۰ نفر · ۳ مافیا</button></div><h3 style="margin-top:20px">نقش شما در دمو</h3><div class="mf-split">${Object.entries(mafiaRoles).map(([id,r])=>`<button class="mf-pick" data-mf-role="${id}" aria-pressed="${mafiaSettings.role===id}">${r.symbol} ${r.label}</button>`).join('')}</div><p class="mf-muted">در بازی واقعی نقش‌ها تصادفی و محرمانه تقسیم می‌شوند. انتخاب نقش اینجا فقط برای تست تجربه کاربری است.</p><h3 style="margin-top:14px">زمان هر مرحله</h3><div class="mf-split"><button class="mf-pick" data-mf-time="45" aria-pressed="${mafiaSettings.roundTime===45}">۴۵ ثانیه</button><button class="mf-pick" data-mf-time="60" aria-pressed="${mafiaSettings.roundTime===60}">۶۰ ثانیه</button><button class="mf-pick" data-mf-time="120" aria-pressed="${mafiaSettings.roundTime===120}">۲ دقیقه</button></div><div class="mf-hero-buttons mf-lobby-bottom" style="margin-top:22px"><button class="btn btn-primary" data-mf-start="1">شروع بازی با بازیکنان شبیه‌سازی‌شده ${icon2('arrow')}</button>${existing?'<button class="btn btn-secondary" data-mf-continue="1">ادامه آخرین بازی</button>':''}</div></section><section class="mf-panel"><div class="mf-row"><h2>اتاق‌های پیشنهادی</h2><span class="mf-muted">صرفاً نمونه طراحی</span></div>${[{name:'شب‌های مرموز',num:'۷ / ۸',tag:'کلاسیک'},{name:'باشگاه کارآگاه‌ها',num:'۹ / ۱۰',tag:'حرفه‌ای'},{name:'دورهمی آخر هفته',num:'۴ / ۸',tag:'دوستانه'}].map(r=>`<div class="mf-room"><div><strong>${r.name}</strong><small>${r.tag} · ${r.num} نفر · اتاق نمونه</small></div><button class="btn btn-secondary btn-sm" data-mf-sample-room="1">مشاهده</button></div>`).join('')}<div class="mf-note">این اتاق‌ها به هیچ سروری وصل نیستند. می‌توانی برای تست، یک مسابقه محلی شروع کنی.</div></section></div><aside class="mf-stack"><section class="mf-panel"><div class="mf-row"><h2>صندلی‌های میز</h2><span class="mf-tag" id="mf-seatcount">${mafiaSettings.size} نفر</span></div><div class="mf-lobby-seats" id="mf-seat-preview">${Array.from({length:mafiaSettings.size},(_,i)=>`<div class="mf-seat"><span class="avatar">${i===0?mfSafe((settings.name||'شما').slice(0,2)):mfSafe(mafiaNames[i-1].slice(0,2))}</span><span>${i===0?'شما':mafiaNames[i-1]}</span></div>`).join('')}</div><p class="mf-muted" style="margin:15px 0 0">ترکیب نقش‌ها بعد از شروع مشخص می‌شود؛ فقط نقش خودت قابل مشاهده است.</p></section><section class="mf-panel"><h2>نقش‌های این سناریو</h2><div class="mf-roles">${Object.entries(mafiaRoles).map(([key,r])=>`<div class="mf-role-card"><span class="mf-role-icon">${r.symbol}</span><div><strong>${r.label}</strong><small>${key==='mafia'?(mafiaSettings.size===8?'۲':'۳')+' نفر':key==='citizen'?(mafiaSettings.size===8?'۴':'۵')+' نفر':'۱ نفر'}</small></div></div>`).join('')}</div></section></aside></div></div>`;
  };
  const mfStart=()=>{
    const size=mafiaSettings.size,roles=Array.from({length:size},(_,i)=>i<(size===8?2:3)?'mafia':i===(size===8?2:3)?'doctor':i===(size===8?3:4)?'detective':'citizen');
    roles.splice(roles.indexOf(mafiaSettings.role),1);
    const distributed=[mafiaSettings.role,...mfShuffle(roles)];
    const players=Array.from({length:size},(_,id)=>({id,name:id===0?(settings.name||'بازیکن مهمان'):mafiaNames[id-1],role:distributed[id],alive:true}));
    mafiaGame={version:7,players,day:1,phase:'night',selected:null,privateNote:'',nightChoice:null,nightReport:'',voteCounts:{},lastEliminated:null,lastVoteMessage:'',winner:null,seconds:0,totalSeconds:mafiaSettings.roundTime,roundTime:mafiaSettings.roundTime,chat:[],log:[],revealed:[],lastAction:''};
    mfLog('نقش‌های مخفی تقسیم شدند. شب اول آغاز شد.','night');
    mfSave();location.hash='game/mafia/play';mfRenderPlay();mfEnsureTicker();
  };
  const mfNightResolve=()=>{
    if(!mafiaGame||mafiaGame.phase!=='night')return;
    const me=mfMe(),town=mfTown(),m=mfMafia();
    const available=town.filter(x=>x.alive),mafiaTarget=me.alive&&me.role==='mafia'&&mafiaGame.nightChoice!=null?mfPlayer(mafiaGame.nightChoice):available[Math.floor(Math.random()*available.length)];
    const doctor=mfLiving().find(p=>p.role==='doctor');
    const protectedId=doctor?.id===0&&me.alive?mafiaGame.nightChoice:null;
    const docSave=doctor?(doctor.id===0 && me.alive?protectedId:mfLiving()[Math.floor(Math.random()*mfLiving().length)].id):null;
    let saved=!!mafiaTarget && mafiaTarget.id===docSave;
    if(mafiaTarget&&!saved){mafiaTarget.alive=false;mafiaGame.nightReport=`امشب ${mafiaTarget.name} از بازی حذف شد.`;mfLog(mafiaGame.nightReport,'urgent');}
    else {mafiaGame.nightReport='دیشب هیچ بازیکنی حذف نشد.';mfLog(mafiaGame.nightReport,'night');}
    if(me.alive&&me.role==='detective'&&mafiaGame.nightChoice!=null){const target=mfPlayer(mafiaGame.nightChoice);mafiaGame.privateNote=`استعلام محرمانه: ${target.name} ${target.role==='mafia'?'عضو مافیا است.':'عضو مافیا نیست.'}`;}
    mafiaGame.selected=null;mafiaGame.nightChoice=null;
    if(mfWinCheck()){}else{mafiaGame.phase='day';mafiaGame.seconds=mafiaGame.roundTime;mafiaGame.totalSeconds=mafiaGame.roundTime;mfLog(`روز ${mafiaGame.day} آغاز شد. بازیکنان درباره اتفاقات شب گفت‌وگو می‌کنند.`);mafiaGame.chat=mfShuffle(mfOthers()).slice(0,3).map((p,i)=>({name:p.name,text:['باید درباره اتفاقات شب فکر کنیم؛ کسی سرنخی داره؟','عجله نکنیم، بهتره دلیل رأی‌ها رو بشنویم.','من ترجیح می‌دم قبل رأی‌گیری همه صحبت کنن.'][i]}));}
    mfSave();mfRenderPlay();
  };
  const mfDiscussion=()=>{
    if(!mafiaGame||mafiaGame.phase!=='day')return;
    mafiaGame.phase='vote';mafiaGame.selected=null;mafiaGame.seconds=Math.max(35,Math.round(mafiaGame.roundTime*.65));mafiaGame.totalSeconds=mafiaGame.seconds;
    mfLog('بحث تمام شد؛ اکنون هر بازیکن یک رأی دارد.');mfSave();mfRenderPlay();
  };
  const mfVoteResolve=()=>{
    if(!mafiaGame||mafiaGame.phase!=='vote')return;
    const living=mfLiving(),votes={};living.forEach(x=>votes[x.id]=0);
    for(const voter of living){
      let target;
      if(voter.id===0){target=mafiaGame.selected==null?null:mfPlayer(mafiaGame.selected);}
      else {
        const viable=living.filter(p=>p.id!==voter.id);
        // Visual demo: AI votes are simulated, not actual human reasoning.
        target=viable[Math.floor(Math.random()*viable.length)];
      }
      if(target?.alive)votes[target.id]=(votes[target.id]||0)+1;
    }
    mafiaGame.voteCounts=votes;
    let entries=Object.entries(votes).sort((a,b)=>b[1]-a[1]);
    let top=entries[0],tied=entries.filter(x=>x[1]===top[1]);
    mafiaGame.lastEliminated=tied.length===1?Number(top[0]):null;
    if(mafiaGame.lastEliminated!=null){const eliminated=mfPlayer(mafiaGame.lastEliminated);eliminated.alive=false;mafiaGame.revealed.push(eliminated.id);mafiaGame.lastVoteMessage=`${eliminated.name} با ${top[1]} رأی حذف شد؛ نقش او ${mafiaRoles[eliminated.role].label} بود.`;}
    else mafiaGame.lastVoteMessage='آرا برابر شدند؛ کسی از بازی حذف نشد.';
    mfLog(mafiaGame.lastVoteMessage,'urgent');
    mafiaGame.selected=null;mafiaGame.phase='reveal';mafiaGame.seconds=0;mfWinCheck();mfSave();mfRenderPlay();
  };
  const mfNextNight=()=>{
    if(!mafiaGame||mafiaGame.phase!=='reveal')return;
    mafiaGame.day++;mafiaGame.phase='night';mafiaGame.privateNote='';mafiaGame.nightReport='';mafiaGame.lastEliminated=null;mafiaGame.voteCounts={};mafiaGame.selected=null;mafiaGame.seconds=0;mfLog(`شب ${mafiaGame.day} فرا رسید. همه چشم‌ها را ببندند.`,'night');mfSave();mfRenderPlay();
  };
  const mfClockUpdate=()=>{
    if(!mafiaGame||!mfPhaseTime())return;
    mafiaGame.seconds=Math.max(0,mafiaGame.seconds-1);
    const t=$('mf-timer');if(t){t.textContent=mfTimerText();t.classList.toggle('danger',mafiaGame.seconds<15);}
    const progress=$('mf-progress-fill');if(progress)progress.style.width=`${Math.max(0,100*mafiaGame.seconds/mafiaGame.totalSeconds)}%`;
    if(mafiaGame.seconds===0){mafiaGame.phase==='day'?mfDiscussion():mfVoteResolve();}else if(mafiaGame.seconds%5===0)mfSave();
  };
  const mfEnsureTicker=()=>{if(mafiaInterval)return;mafiaInterval=setInterval(()=>{if(location.hash==='#game/mafia/play')mfClockUpdate();},1000);};
  const mfRolePanel=()=>{
    const me=mfMe(),role=mafiaRoles[me.role],partners=me.role==='mafia'?mfMafia().filter(x=>x.id!==0).map(x=>x.name).join('، '):'';
    return `<section class="mf-role-reveal"><div class="mf-role-icon">${role.symbol}</div><div><span class="mf-muted">کارت نقش شما · محرمانه</span><h3>${role.label} <span class="mf-tag" style="margin-right:7px">${role.team==='mafia'?'تیم مافیا':'تیم شهر'}</span></h3><p>${role.description}</p>${partners?`<span class="mf-secret">هم‌تیمی‌های تو: ${mfSafe(partners)}</span>`:''}</div></section>`;
  };
  const mfPlayerCards=()=>{
    if(!mafiaGame)return '';
    const phase=mafiaGame.phase,me=mfMe(),v=mafiaGame.voteCounts;
    const eligible=phase==='night'&&me.alive&&me.role!=='citizen'||phase==='vote'&&me.alive;
    const targets=mfLiving().filter(p=>phase==='vote'?p.id!==0:me.role==='mafia'?p.role!=='mafia':me.role==='detective'?p.id!==0:true).map(p=>p.id);
    return mafiaGame.players.map((p,i)=>{
      const allowed=p.alive&&eligible&&targets.includes(p.id);
      const isSelf=i===0;
      const revealed=phase==='end'||mafiaGame.revealed.includes(i)||(me.role==='mafia'&&p.role==='mafia');
      return `<button type="button" class="mf-player ${p.alive?'':'dead'} ${mafiaGame.selected===i?'selected':''}" data-mf-target="${i}" ${allowed?'':'disabled'} aria-pressed="${mafiaGame.selected===i}" aria-label="${mfSafe(p.name)} ${p.alive?'زنده':'حذف‌شده'}"><span class="avatar">${mfSafe(p.name.slice(0,2))}</span>${isSelf?'<span class="mf-badge-me">شما</span>':''}<strong>${mfSafe(p.name)}</strong><small>${p.alive?(revealed?mafiaRoles[p.role].label:'نقش مخفی'):(revealed?mafiaRoles[p.role].label:'حذف‌شده')}</small>${phase==='reveal'?`<span class="mf-vote-count">${v[i]||0} رأی</span>`:''}</button>`;
    }).join('');
  };
  const mfActions=()=>{
    const p=mafiaGame.phase,me=mfMe(),hasPick=mafiaGame.selected!=null;
    if(p==='end')return `<div class="mf-result-spot"><h3>پایان مسابقه</h3><p class="mf-muted">${mafiaGame.winner==='town'?'شهروندان پیروز شدند.':'مافیا پیروز شد.'} نقش همه بازیکنان در کارت‌ها مشخص شده است.</p></div><div class="mf-action-btns"><button class="btn btn-primary" data-mf-new="1">بازی جدید</button><button class="btn btn-secondary" data-mf-nav="lobby">بازگشت به لابی</button></div>`;
    if(p==='reveal')return `<div class="mf-result-spot"><strong>نتیجه رأی‌گیری روز ${mafiaGame.day}</strong><p class="mf-muted" style="margin:6px 0 0">${mfSafe(mafiaGame.lastVoteMessage)}</p></div><button class="btn btn-primary" data-mf-next="1">ورود به شب بعدی ${icon2('arrow')}</button>`;
    if(p==='day')return `<h3>گفت‌وگوی روز و پیدا کردن سرنخ‌ها</h3><p class="mf-instruction">${mfSafe(mafiaGame.nightReport||'شب پایان یافت.')} ${me.alive?'پیام خودت را بنویس یا گفت‌وگو را به رأی‌گیری ببر.':'از بازی حذف شده‌ای؛ فقط می‌توانی ادامه را تماشا کنی.'}</p><div class="mf-chat" role="log" aria-label="گفت‌وگوی آزمایشی">${(mafiaGame.chat||[]).map(c=>`<div class="mf-chat-line"><strong>${mfSafe(c.name)}</strong><span>${mfSafe(c.text)}</span></div>`).join('')}</div><div class="mf-chat-controls"><input id="mf-chat-text" type="text" maxlength="140" placeholder="پیام محلی خودت رو بنویس…" autocomplete="off" aria-label="پیام گفت‌وگو" ${me.alive?'':'disabled'}><button class="btn btn-secondary btn-sm" data-mf-send="1" ${me.alive?'':'disabled'}>ارسال</button></div><div class="mf-action-btns" style="margin-top:13px"><button class="btn btn-primary" data-mf-discuss="1">پایان بحث و شروع رأی‌گیری ${icon2('arrow')}</button><button class="btn btn-secondary" disabled title="چت صوتی به سرور متصل نیست">میکروفون · غیرفعال</button></div><p class="mf-muted">پیام‌ها فقط داخل همین مرورگرند؛ کاربران دیگر آن‌ها را نمی‌بینند.</p>`;
    if(p==='vote')return `<h3>انتخاب مظنون</h3><p class="mf-instruction">${me.alive?'روی یکی از بازیکنان زنده کلیک کن تا رأی تو ثبت شود. انتخابت فقط بعد از تأیید اعمال می‌شود.':'از بازی حذف شده‌ای و رأی نمی‌دهی؛ ادامه روند را می‌توانی ببینی.'}</p><div class="mf-action-btns"><button class="btn btn-primary" data-mf-vote="1" ${me.alive&&!hasPick?'disabled':''}>${hasPick?`تأیید رأی به ${mfSafe(mfPlayer(mafiaGame.selected).name)}`:'ادامه رأی‌گیری'}</button><button class="btn btn-secondary" data-mf-skipvote="1">${me.alive?'رأی ممتنع':'نمایش نتیجه'}</button></div>`;
    if(!me.alive||me.role==='citizen')return `<h3>شهر در خواب است</h3><p class="mf-instruction">${me.alive?'شهروند در شب اکشنی ندارد؛ برای آغاز روز منتظر پایان شب باش.':'از بازی حذف شده‌ای؛ ادامه روایت را ببین.'}</p><button class="btn btn-primary" data-mf-night="1">گذر از شب و دیدن اتفاقات ${icon2('arrow')}</button>`;
    let title=me.role==='doctor'?'چه کسی را نجات می‌دهی؟':me.role==='detective'?'هویت چه کسی را بررسی می‌کنی؟':'چه کسی هدف مافیا باشد؟';
    return `<h3>${title}</h3><p class="mf-instruction">${me.role==='mafia'?'بازیکنی از تیم شهر را انتخاب کن. هم‌تیمی‌های تو برایت مشخص‌اند.':me.role==='doctor'?'یک نفر را برای محافظت انتخاب کن؛ خودت هم مجاز هستی.':'یک بازیکن زنده را انتخاب کن تا نقش تیم او فقط به تو اعلام شود.'}</p><div class="mf-action-btns"><button class="btn btn-primary" data-mf-night="1" ${hasPick?'':'disabled'}>${hasPick?`تأیید انتخاب ${mfSafe(mfPlayer(mafiaGame.selected).name)}`:'ابتدا یک بازیکن انتخاب کن'}</button></div>`;
  };
  const mfRenderPlay=()=>{
    if(!mafiaGame)mafiaGame=mfRead(); if(!mafiaGame){mfRenderLobby();return;}
    const me=mfMe(),live=mfLiving().length,phase=mafiaGame.phase;
    $('detail-content').innerHTML=`<div class="mf-wrap mf-fade mf-${phase}"><section class="mf-status-band"><div class="mf-phase"><span class="mf-phase-icon" aria-hidden="true">${mfPhaseSymbol(phase)}</span><div><strong>${mfPhaseLabel(phase)} ${phase==='end'?'':mafiaGame.day}</strong><div class="mf-muted">${live} نفر زنده از ${mafiaGame.players.length} بازیکن · مسابقه تک‌نفره محلی</div></div></div><div class="mf-phase-meta"><span class="mf-tag">${phase==='night'?'نقش‌ها محرمانه':phase==='vote'?'وقت تصمیم':phase==='end'?'اتمام مسابقه':'سناریوی کلاسیک'}</span>${mfPhaseTime()?`<span class="mf-timer" id="mf-timer" aria-live="off">${mfTimerText()}</span>`:''}<button class="btn btn-ghost btn-sm" data-mf-nav="lobby">لابی</button></div>${mfPhaseTime()?`<div class="mf-progress" aria-hidden="true"><i id="mf-progress-fill" style="width:${100*mafiaGame.seconds/mafiaGame.totalSeconds}%"></i></div>`:''}</section><div class="mf-game-grid"><main class="mf-stack"><section class="mf-panel"><div class="mf-row"><div><h2>میز بازی مافیا</h2><div class="mf-muted">${phase==='night'?'شب، زمان تصمیم‌های پنهانی است.':phase==='vote'?'برای انتخاب هدف رأی روی کارت او بزن.':phase==='reveal'?'نتیجه شمارش رأی را مشاهده کن.':'کارت بازیکنان و وضعیت بازی'}</div></div><span class="mf-tag">${live} / ${mafiaGame.players.length} زنده</span></div><div class="mf-players" id="mf-players">${mfPlayerCards()}</div><div class="mf-actions" id="mf-actions">${mfActions()}</div></section><section class="mf-panel"><div class="mf-row"><h3>روند بازی</h3><span class="mf-muted">رویدادهای عمومی</span></div><div class="mf-log" aria-live="polite">${mafiaGame.log.map(l=>`<div class="mf-log-entry ${mfSafe(l.type)}"><time>${mfSafe(l.time)}</time>${mfSafe(l.text)}</div>`).join('')}</div></section></main><aside class="mf-stack"><section class="mf-panel">${mfRolePanel()}${mafiaGame.privateNote?`<div class="mf-note" style="border-color:#9a7952;color:#ebd6bb">${mfSafe(mafiaGame.privateNote)}</div>`:''}<div class="mf-note"><strong>توجه: دمو تک‌نفره</strong><div>سایر بازیکنان ربات‌های شبیه‌سازی‌شده‌اند. نقش‌های آن‌ها برای شما مخفی می‌ماند؛ چت صوتی و رأی بازیکنان واقعی در این نسخه فعال نیست.</div></div></section><section class="mf-panel"><h3>آمار فعلی شهر</h3><div class="mf-result-grid"><div class="mf-result-item"><strong>${mfMafia().length} نفر</strong><small>مافیای باقی‌مانده (فقط اطلاعات دمو)</small></div><div class="mf-result-item"><strong>${mfTown().length} نفر</strong><small>اعضای شهر</small></div><div class="mf-result-item"><strong>${mafiaGame.day}</strong><small>روز بازی</small></div><div class="mf-result-item"><strong>${mafiaGame.revealed.length}</strong><small>نقش‌های افشاشده</small></div></div></section><section class="mf-panel"><h3>راهنما و کنترل‌ها</h3><div class="mf-action-btns"><button class="btn btn-secondary btn-sm" data-mf-guide="1">راهنمای نقش‌ها</button><button class="btn btn-ghost btn-sm" data-mf-reset="1">شروع دوباره</button></div><details class="mf-disclosure"><summary>این نسخه چطور کار می‌کند؟</summary><p>فاز شب برای مافیا، پزشک و کارآگاه اکشن دارد. روز گفت‌وگو، بعد رأی‌گیری و سپس حذف بازیکن انجام می‌شود. شمارش رأی ربات‌ها خودکار و نمایشی است.</p></details></section></aside></div></div>`;
  };
  const mfNav=part=>{markVisited('mafia');location.hash=part?'game/mafia/'+part:'game/mafia';};
  const mfRoute=hash=>{
    if(!/^game\/mafia(?:\/(?:lobby|play))?$/.test(hash))return false;
    $('home').hidden=true;$('game-screen').hidden=false;window.scrollTo({top:0,behavior:'instant'});
    detailGame='mafia';
    if(hash==='game/mafia/play') {document.title='بازی مافیا | بردگیم';mfRenderPlay();mfEnsureTicker();}
    else if(hash==='game/mafia/lobby'){document.title='لابی مافیا | بردگیم';mfRenderLobby();}
    else{document.title='مافیا | بردگیم';mfRenderLanding();}
    return true;
  };
  const mfAct=b=>{
    const d=b.dataset;
    if(d.mfNav!=null){mfNav(d.mfNav);return true;}
    if(d.mfSize){mafiaSettings.size=Number(d.mfSize);mfRenderLobby();return true;}
    if(d.mfRole){mafiaSettings.role=d.mfRole;mfRenderLobby();return true;}
    if(d.mfTime){mafiaSettings.roundTime=Number(d.mfTime);mfRenderLobby();return true;}
    if(d.mfStart){mfStart();return true;}
    if(d.mfContinue){mafiaGame=mfRead();if(mafiaGame)mfNav('play');else toast('بازی ذخیره‌شده پیدا نشد.','warning');return true;}
    if(d.mfSampleRoom){modal('اتاق نمایشی',`${infoBanner('این اتاق فقط یک نمونه طراحی است و بازیکن واقعی ندارد.')}<p>برای تجربه مرحله‌های روز و شب، بازی محلی را از لابی شروع کن.</p><div class="modal-actions"><button class="btn btn-primary" id="mf-modal-play">شروع مسابقه محلی</button></div>`,()=>{$('mf-modal-play').onclick=()=>{closeModal();mfStart();};});return true;}
    if(d.mfTarget!=null){if(!mafiaGame||!mfMe().alive)return true;mafiaGame.selected=Number(d.mfTarget);mfSave();mfRenderPlay();return true;}
    if(d.mfNight){if(mafiaGame.phase==='night'){mafiaGame.nightChoice=mafiaGame.selected;mfNightResolve();}return true;}
    if(d.mfSend){if(mafiaGame?.phase==='day'&&mfMe().alive){const input=$('mf-chat-text'),msg=input?.value.trim();if(msg){mafiaGame.chat.push({name:mfMe().name,text:msg.substring(0,140)});mfSave();mfRenderPlay();toast('پیام به گفت‌وگوی محلی اضافه شد.');}}return true;}
    if(d.mfDiscuss){mfDiscussion();return true;}
    if(d.mfVote||d.mfSkipvote){if(d.mfSkipvote)mafiaGame.selected=null;mfVoteResolve();return true;}
    if(d.mfNext){mfNextNight();return true;}
    if(d.mfNew){mfNav('lobby');return true;}
    if(d.mfReset){modal('شروع مجدد مافیا',`<p>بازی جاری از ابتدا با ترکیب جدید بازیکنان آغاز شود؟</p><div class="modal-actions"><button class="btn btn-primary" id="mf-confirm-reset">شروع دوباره</button><button class="btn btn-secondary" id="mf-cancel-reset">انصراف</button></div>`,()=>{$('mf-confirm-reset').onclick=()=>{closeModal();mfStart();};$('mf-cancel-reset').onclick=closeModal;});return true;}
    if(d.mfGuide){openGuide('mafia');return true;}
    return false;
  };
