const builtin={'2048':'game-2048',Snake:'game-snake','Tic Tac Toe':'game-tic-tac-toe'};
const multiplayer=[{name:'skribbl.io',url:'https://skribbl.io/'},{name:'Gartic Phone',url:'https://garticphone.com/'}];
sources.multiplayer={label:'Multiplayer'};
const idOf=g=>JSON.stringify([g.source,g.name]);
const lite=g=>({source:g.source,name:g.name});
const validGame=g=>g && Object.hasOwn(sources,g.source) && typeof g.name==='string' && g.name.length>0 && g.name.length<=160;
function storedGames(key){const list=read(key,[]);return Array.isArray(list)?list.filter(validGame).map(lite):[];}
let recent=storedGames('goop-recent-games'), favorites=storedGames('goop-favorite-games');
function storeGames(){try{localStorage.setItem('goop-recent-games',JSON.stringify(recent));localStorage.setItem('goop-favorite-games',JSON.stringify(favorites));}catch{}}
function btn(label,fn){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.onclick=()=>Promise.resolve().then(fn).catch(e=>toast(e.message));return b;}
function remember(g){recent=[lite(g),...recent.filter(it=>idOf(it)!==idOf(g))].slice(0,5);storeGames();drawShelf();}
function savedGame(g){return g.source==='offline' && ['2048','Tic Tac Toe'].includes(g.name) && !!read('goop-save:'+builtin[g.name],null);}
function drawShelf(){
  for(const [id,items] of [['recents',recent],['favorites',favorites]]){
    const region=$(id);region.hidden=!items.length;
    region.querySelector('.shelf').replaceChildren(...items.map(g=>btn((savedGame(g)?'Resume ':'')+g.name,()=>openGame(g))));
  }
}
function isFavorite(g){return favorites.some(x=>idOf(x)===idOf(g));}
function toggleFavorite(g){
  favorites=isFavorite(g)?favorites.filter(it=>idOf(it)!==idOf(g)):[...favorites,lite(g)];
  storeGames();drawShelf();playerAccount.localChange();refreshStars();
}
function refreshStars(){
  for(const b of document.querySelectorAll('[data-favorite-game]')){
    const on=favorites.some(g=>idOf(g)===b.dataset.favoriteGame);
    b.textContent=on?'Remove favorite':'Favorite';b.setAttribute('aria-pressed',String(on));
  }
}
function openDialog(title){
  const d=$('playerDialog');document.body.append(d);$('playerTitle').textContent=title;$('playerNotice').textContent='';
  const body=$('playerBody');body.inviteRequest=null;body.replaceChildren();if(!d.open)d.showModal();return body;
}
function gameTools(host,g,error=()=>''){
  const bar=document.createElement('div');bar.className='gameActions';
  const star=btn('Favorite',()=>toggleFavorite(g));star.dataset.favoriteGame=idOf(g);
  bar.append(star,btn('Invite to Chat',()=>beginGameAction('invite',g)),btn('Report game',()=>beginGameAction('report',g,error())));
  host.prepend(bar);refreshStars();
}
let waiting=null;
function beginGameAction(kind,g,error=''){
  if(!playerAccount.account){
    waiting={kind,g,error};goopNavigate('chat');toast('Sign in to '+(kind==='invite'?'share this game.':'send the game report.'));return;
  }
  if(kind==='invite')void invite(g);else reportGame(g,error);
}
function actionButton(body,label,run){
  const control=btn(label,async()=>{control.disabled=true;try{await run();}catch(e){$('playerNotice').textContent=e.message;}finally{control.disabled=false;}});body.append(control);
}
function field(body,label,el){
  const wrap=document.createElement('label');wrap.textContent=label;wrap.append(el);body.append(wrap);return el;
}
async function invite(g){
  const body=openDialog('Invite to '+g.name), account=playerAccount.account;
  const request=Symbol();body.inviteRequest=request;
  try{
    const data=await account.api('home');if(body.inviteRequest!==request||!body.isConnected||!$('playerDialog').open||playerAccount.account!==account)return;
    const choices=[...data.rooms.filter(r=>r.kind==='text'&&(!r.lockOwner||(data.user.admin&&r.lockOwner===data.user.id))),...data.dms];
    const select=field(body,'Channel or direct message',document.createElement('select'));
    for(const room of choices){const opt=document.createElement('option');opt.value=room.id;opt.textContent=room.kind?'# '+room.name:'@ '+(room.handle||room.label);select.append(opt);}
    let input;if(g.source==='multiplayer'){input=field(body,'Room invitation link (optional)',document.createElement('input'));input.type='url';input.placeholder='Paste the invite from the game';}
    const nonce=crypto.randomUUID();
    actionButton(body,'Send invitation',async()=>{
      if(!select.value)throw Error('Choose a channel or start a DM in Chat.');
      await account.api('messages/'+select.value,{nonce,invite:{...lite(g),roomUrl:input?.value.trim()||''}});
      $('playerDialog').close();toast('Invitation sent.');
    });
  }catch(e){$('playerNotice').textContent=e.message;}
}
function reportGame(g,error){
  const body=openDialog('Report '+g.name),account=playerAccount.account;
  const info=document.createElement('p');info.textContent=sources[g.source].label;body.append(info);
  const input=field(body,'What went wrong?',document.createElement('textarea'));input.maxLength=500;
  if(error && /error|failed|unavailable|could not|timed out|cannot/i.test(error)){const detected=document.createElement('p');detected.textContent='Player error: '+error.slice(0,220);body.prepend(detected);}else error='';
  input.placeholder='For example, the game stays on a blank screen.';
  actionButton(body,'Send report',async()=>{
    const detail=[error.slice(0,220),input.value.trim()].filter(Boolean).join(' · ').slice(0,500)||'Player reported a problem. No error was available from the game.';
    await account.api('game-report',{game:lite(g),detail});$('playerDialog').close();toast('Report sent to the Goop admins.');
  });
}
async function openGame(g,roomUrl=''){
  if(!validGame(g))throw Error('This game is unavailable.');
  if(g.source==='offline'){
    if(!Object.hasOwn(builtin,g.name))throw Error('Unknown built-in game.');
    goopNavigate(builtin[g.name]);return;
  }
  const list=g.source==='multiplayer'?multiplayer:await catalog(g.source);
  const game=list.find(it=>it.name===g.name);if(!game)throw Error('This game is no longer in its catalog.');
  if(roomUrl && (g.source!=='multiplayer'||new URL(roomUrl).origin!==new URL(game.url).origin))throw Error('Invalid room link.');
  remember(g);
  if(g.source==='fourgames'){
    goopNavigate('games');gameSource='fourgames';$('categoryTools').querySelector('select').value=gameSource;
    await goopPlayFourGame(game);return;
  }
  const url=roomUrl||urlForGame(g.source,game.url);if(!url)throw Error('This game has no playable address.');navigate(url,lite(g));
}
const catalogJobs=new Map();
function catalog(key){
  if(key==='multiplayer')return Promise.resolve(multiplayer);
  if(!catalogJobs.has(key))catalogJobs.set(key,getGames(key).catch(e=>{catalogJobs.delete(key);throw e;}));
  return catalogJobs.get(key);
}
const results=$('universalResults');let lookup=0,debounce,abort;
function hideResults(){++lookup;clearTimeout(debounce);abort?.abort();results.replaceChildren();results.hidden=true;}
function suggest(){
  hideResults();
  const query=$('homeSearch').value.trim();if(query.length<2||active!=='home')return;
  const seq=lookup,term=query.toLowerCase(),groups=new Map();abort=new AbortController();const signal=abort.signal;
  function put(group,entries){
    if(seq!==lookup||signal.aborted||active!=='home')return;
    groups.set(group,entries);
    results.replaceChildren();for(const [label,rows] of groups)if(rows.length){
      const section=document.createElement('div'),h=document.createElement('strong');h.textContent=label;section.append(h);
      for(const [title,fn] of rows.slice(0,4))section.append(btn(title,()=>{hideResults();return fn();}));results.append(section);
    }results.hidden=!results.children.length;
  }
  function games(key,list){put(sources[key].label,list.filter(x=>x.name.toLowerCase().includes(term)).map(g=>[g.name,()=>openGame({source:key,name:g.name})]));}
  games('offline',standaloneGames);games('multiplayer',multiplayer);
  debounce=setTimeout(()=>{
    for(const key of Object.keys(sources).filter(k=>!['offline','multiplayer'].includes(k)))void catalog(key).then(list=>games(key,list)).catch(()=>{});
    for(const [type,path] of [['movies','api/search/multi?query='],['manga',settings.mangaSource==='pill'?'pill/search?title=':'mangadex/search?title=']]){
      const base=apiBase(type+'Base');if(!base)continue;
      void fetch(new URL(path+encodeURIComponent(query),base.replace(/\/?$/,'/')),{signal:AbortSignal.any([signal,AbortSignal.timeout(14000)])})
        .then(r=>r.ok?r.json():{}).then(data=>{
          const list=Array.isArray(data)?data:(data.results||data.items||data.data?.results||data.data?.items||[]);
          if(!Array.isArray(list))return;
          put(type==='movies'?'Movies & TV':'Manga',list.filter(i=>i&&typeof (i.title||i.name)==='string').map(i=>[i.title||i.name,()=>type==='movies'?goopOpenMovie(i):goopOpenManga(i)]));
        }).catch(()=>{});
    }
  },350);
}
$('homeSearch').addEventListener('input',suggest);$('homeSearch').addEventListener('keydown',e=>{if(e.key==='Escape')hideResults();});
$('homeSearchForm').addEventListener('submit',hideResults);
playerAccount.bind({
  get:()=>[...bookmarks.map(b=>({...b,kind:'bookmark'})),...favorites.map(g=>({...lite(g),kind:'favorite'}))],
  apply(items){
    bookmarks=cleanBookmarks(items.filter(x=>x.kind==='bookmark'));favorites=items.filter(x=>x.kind==='favorite'&&validGame(x)).map(lite);
    try{localStorage.setItem('goop-bookmarks',JSON.stringify(bookmarks));}catch{}
    storeGames();renderBookmarks();drawShelf();refreshStars();
  }
});
function updateAccount(){
  $('syncState').textContent=playerAccount.status;
  $('syncToggle').textContent=playerAccount.account?(playerAccount.enabled?'Turn off sync':'Merge this device and enable sync'):'Sign in to Chat';
  if(playerAccount.account && waiting){const action=waiting;waiting=null;beginGameAction(action.kind,action.g,action.error);}
}
$('syncToggle').onclick=()=>{if(playerAccount.account)playerAccount.toggle();else goopNavigate('chat');};
playerAccount.listen(updateAccount);updateAccount();drawShelf();
