window.goopPrograms["home"] = function(root, goopNavigate) {


let homeController;
(()=>{'use strict';
const $=id=>root.querySelector("#"+id) || document.getElementById(id), defaults={engine:'https:\/\/lite.duckduckgo.com/lite/?q=',wisp:'wss:\/\/itcode.vip/api/',customWisp:'',preferProxy:true,gameHost:'',moviesBase:'',musicBase:'',mangaBase:'',bloxBase:'',mangaSource:'mangadex',transport:'libcurl'};
const sources={ugs:{label:'UGS',owner:'gmshelf',file:'ugs.json'},seraph:{label:'Seraph',owner:'gmshelf',file:'seraph.json'},truffled:{label:'Truffled',owner:'gmshelf',file:'truffled.json'},ckv:{label:'CKV',owner:'gmshelf',file:'ckv.json'},fourgames:{label:'4Games',owner:'electricxmaxx',repo:'mathassignments',file:'math.json'}};
const cats=[['games','Games','',''],['movies','Movies','',''],['music','Music','',''],['manga','Manga','',''],['blox','GoopBlox','',''],['ai','AI','',''],['chat','Chat','',''],['settings','Settings','','']];
let settings={...defaults,...read('goop-settings',{})};if(!settings.noswMigration){if(settings.wisp==='wss:\/\/wisp.mercurywork.shop/')settings.wisp=defaults.wisp;settings.noswMigration=true;}if(settings.engine==='https:\/\/duckduckgo.com/?q=')settings.engine='https:\/\/lite.duckduckgo.com/lite/?q=';const defaultBookmarks = [...$('bookmarks').querySelectorAll('[data-bookmark-url]')].map(b=>({name:b.textContent,url:b.dataset.bookmarkUrl}));
let bookmarks=cleanBookmarks(read('goop-bookmarks',null)) ?? cleanBookmarks(defaultBookmarks);let active='home',gameSource='ugs',gameCache={};
if(!['libcurl','epoxy'].includes(settings.transport))settings.transport=defaults.transport;
function read(key,fallback){try{let value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}}
function save(){playerAccount.localChange();try{localStorage.setItem('goop-settings',JSON.stringify(settings));localStorage.setItem('goop-bookmarks',JSON.stringify(bookmarks))}catch{toast('Changes are available for this visit.')}}
function safeUrl(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function validBase(s){return safeUrl(s?.trim()||'')}
function toast(s){const el=$('toast');el.textContent=s;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),3500)}
function view(v){
 const changed=active!==v;
 if(currentGame && v!=='category')closeCatalogGame();
 if(v!=='home')hideResults();
 
 active=v;
 highlightSection(v==='home'||v==='settings'?v:'');
 if(v!=='category'){
   $('goopCommunity')?.remove();
   $('goopAIChat')?.remove();
 }
 const views={home:'home',category:'categoryView',settings:'settingsView'};
 for(const id of Object.values(views))$(id).classList.toggle('hidden',id!==views[v]);
 window.scrollTo(0,0);
 if((changed || v==='category' || v==='browser') && !matchMedia('(prefers-reduced-motion: reduce)').matches){
   const panel=$(views[v]);
   (panel.getAnimations?.() || []).filter(a=>a.id==='goop-view-entry').forEach(a=>a.cancel());
   panel.animate?.([{opacity:0.84,translate:'0 3px'},{opacity:1,translate:'0 0'}],
     {id:'goop-view-entry',duration:140,easing:'ease-out'});
 }
}
function home(){goopNavigate('home');}$('homeBtn').onclick=home;$('brandHome').onclick=home;$('brandHome').onkeydown=e=>{if(e.key==='Enter')home()};document.querySelectorAll('[data-home]').forEach(b=>b.onclick=home);$('settingsBtn').onclick=()=>{goopNavigate('settings')};
function cleanBookmarks(list) {
  if (!Array.isArray(list)) return null;
  return list.flatMap(item => {
    const url = typeof item === 'string' ? item : item?.url || item?.href;
    const href = typeof url === 'string' && safeUrl(url);
    if (!href) return [];
    const label = typeof item === 'object' && (item.name || item.title);
    return [{name: String(label || new URL(href).hostname).slice(0, 55), url:href}];
  });
}
function renderBookmarks() {
  const list = $('bookmarks');
  const elements = bookmarks.map((item, i) => {
    const row = document.createElement('div');
    row.className = 'bookmark';
    const open = document.createElement('button');
    open.className = 'bookmark-name'; open.type='button'; open.textContent = item.name;
    open.onclick = () => navigate(item.url);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove'; remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ' + item.name);
    remove.onclick = () => {bookmarks.splice(i,1); save(); renderBookmarks();};
    row.append(open,remove);
    return row;
  });
  if (!elements.length) {
    const empty = document.createElement('p');
    empty.className = 'small'; empty.textContent = 'Your saved bookmarks will appear here.';
    elements.push(empty);
  }
  list.replaceChildren(...elements);
}
const editor = $('bookmarkEditor');
function editBookmark(url='') {
  document.body.append(editor);
  $('bookmarkForm').reset();
  $('bookmarkUrl').value = url;
  $('bookmarkName').value = url ? new URL(url).hostname : '';
  editor.showModal();
  $(url?'bookmarkName':'bookmarkUrl').focus();
}
$('bookmarkUrl').oninput = () => $('bookmarkUrl').setCustomValidity('');
$('bookmarkCancel').onclick = () => editor.close();
$('bookmarkForm').onsubmit = event => {
  event.preventDefault();
  const entered = $('bookmarkUrl').value.trim();
  const url = safeUrl(entered.includes(':') ? entered : 'https:\/\/'+entered);
  if (!url) {
    $('bookmarkUrl').setCustomValidity('Enter an http or https web address.');
    $('bookmarkUrl').reportValidity();return;
  }
  const name = $('bookmarkName').value.trim() || new URL(url).hostname;
  bookmarks.push({name:name.slice(0,55),url});
  editor.close(); save(); renderBookmarks();
};
$('addBookmark').onclick = () => editBookmark();
$('importBookmarks').onchange = async event => {
  const input = event.target, file = input.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const entries = cleanBookmarks(Array.isArray(data)?data:data.bookmarks);
    if (!entries) throw Error();
    const urls = new Set(bookmarks.map(b=>b.url));
    const fresh = entries.filter(b=>{if(urls.has(b.url))return false;urls.add(b.url);return true;});
    bookmarks.push(...fresh); renderBookmarks(); save();
    $('importStatus').textContent = fresh.length + ' bookmark' + (fresh.length===1?'':'s') + ' added.';
  } catch { $('importStatus').textContent = 'Choose a Goop bookmarks backup (.json).'; }
  finally { input.value = ''; }
};

function highlightSection(id){
 for(const b of $('goopNav').children){if(b.dataset.goopSection===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
}
function resolveSearch(s){s=s.trim();if(!s)return null;if(/^https?:[/][/]/i.test(s))return safeUrl(s);if(/^localhost(:\d+)?(\/|$)/i.test(s))return 'http:\/\/'+s;if(/^(?:[\w-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s))return safeUrl('https:\/\/'+s);return settings.engine+encodeURIComponent(s)}
$('homeSearchForm').onsubmit=e=>{e.preventDefault();const u=resolveSearch($('homeSearch').value);if(u)navigate(u)};
/* YOUTUBE GUARD */
/* WEB TABS */
function goopBrowserPermissions(){
 const js=true;
 let storage=false, firstPartyCookie=false;
 try{const key='goop-browser-session-test';localStorage.setItem(key,'1');storage=localStorage.getItem(key)==='1';localStorage.removeItem(key);}catch{}
 try{
   const key='goop_cookie_check';
   document.cookie=key+'=1; path=/; SameSite=Lax; max-age=60';
   firstPartyCookie=document.cookie.split(';').some(x=>x.trim()===key+'=1');
   document.cookie=key+'=; path=/; SameSite=Lax; max-age=0';
 }catch{}
 return {js,storage,firstPartyCookie};
}
function goopBrowsingMessage(){
 const p=goopBrowserPermissions();
 if(!p.storage)return 'JavaScript active · browser site storage blocked (sessions may reset)';
 if(!p.firstPartyCookie)return 'JavaScript active · site cookies restricted; NoSW may still use its own storage';
 return 'JavaScript active · site storage and first-party cookies available';
}
function localWisp() {
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  if(local)return (location.protocol==='https:'?'wss:\/\/':'ws:\/\/')+location.host+'/wisp/';
  return 'ws:\/\/localhost:3000/wisp/';
}
function wispAddress(raw,mode) {
  let u;
  try { u=new URL(raw); } catch { throw Error('Enter a full Wisp WebSocket address.'); }
  const loopback=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if ((u.protocol!=='wss:' && !(loopback && u.protocol==='ws:')) || u.username || u.password || u.hash)
    throw Error('Use wss:\/\/ for a remote server or ws:\/\/ for localhost.');
  if (mode==='libcurl' && !u.href.endsWith('/')) {
    if(u.search)throw Error('Libcurl needs a Wisp address ending in /. Select Epoxy to use this address as entered.');
    if(!u.pathname.endsWith('/'))u.pathname+='/';
  }
  return u.href;
}
function draftWisp() {
  const choice=$('wisp').value;
  return choice==='custom'?$('customWisp').value.trim():choice==='local'?localWisp():choice;
}
function wispFeedback(message) { $('wispStatus').textContent=message; }
function syncBrowserSettings() {
  $('transport').value=settings.transport;
  $('preferProxy').checked=settings.preferProxy;
  const presets=Array.from($('wisp').options,o=>o.value);
  const current=settings.wisp;
  const preset=presets.find(value=>value===current);
  $('wisp').value=preset||(current===localWisp()?'local':'custom');
  $('customWisp').value=$('wisp').value==='custom'?current:(settings.customWisp||'');
  $('customWisp').disabled=$('wisp').value!=='custom';
  $('jsCookieStatus').textContent=goopBrowsingMessage();
}
function commitConnection(showStatus=true) {
  const mode=$('transport').value;
  try { wispAddress(draftWisp(),mode); }
  catch(error){wispFeedback(error.message);return false;}
  settings.transport=mode;
  settings.wisp=draftWisp();
  if($('wisp').value==='custom')settings.customWisp=settings.wisp;
  save();
  if(showStatus)wispFeedback('Saved. New pages will use '+(mode==='libcurl'?'Libcurl':'Epoxy')+'.');
  return true;
}
let cancelSocketTest=()=>{};
function startSocketTest() {
  cancelSocketTest();
  let url,socket;
  try {url=wispAddress(draftWisp(),$('transport').value);socket=new WebSocket(url);}
  catch(error) {wispFeedback(error.message);return;}
  wispFeedback('Connecting…');
  let settled=false;
  function finish(message) {
    if(settled)return;
    settled=true;clearTimeout(timer);socket.onopen=socket.onclose=socket.onerror=null;
    try{socket.close();}catch{}
    cancelSocketTest=()=>{};
    if(message)wispFeedback(message);
  }
  const timer=setTimeout(()=>finish('The socket test timed out.'),7000);
  cancelSocketTest=()=>finish('');
  socket.onopen=()=>finish('WebSocket connected. Use a search to test page loading.');
  socket.onerror=socket.onclose=()=>finish('Could not connect to this Wisp server.');
}
$('transport').onchange=()=>{cancelSocketTest();commitConnection();};
$('wisp').onchange=()=>{
  cancelSocketTest();
  const custom=$('wisp').value==='custom';
  $('customWisp').disabled=!custom;
  if(custom && !$('customWisp').value.trim()){wispFeedback('Enter a custom Wisp address.');$('customWisp').focus();return;}
  commitConnection();
};
$('customWisp').onchange=()=>{cancelSocketTest();commitConnection();};
$('applyWisp').onclick=()=>{cancelSocketTest();commitConnection();};
$('testWisp').onclick=startSocketTest;
$('preferProxy').onchange=()=>{settings.preferProxy=$('preferProxy').checked;save();};

function notice(message){const n=$('categoryNotice');n.textContent=message;n.classList.remove('hidden')}
function clearNotice(){$('categoryNotice').classList.add('hidden')}
function makeResult(title,subtitle,emoji,cover,onClick){const b=document.createElement('button');b.className='result';const p=document.createElement('div');p.className='poster';p.textContent='';if(cover&&safeUrl(cover)){const img=document.createElement('img');img.src=cover;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();p.append(img)}const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=subtitle||'';b.append(p,strong,small);b.onclick=onClick;return b}
function toolSearch(placeholder='Search…'){const input=document.createElement('input');input.className='field';input.placeholder=placeholder;input.setAttribute('aria-label',placeholder);return input}
function apiBase(id){
  const manual=validBase(settings[id]);
  if(manual)return manual;
  // One operator-configured backend URL serves everyone; visitors never configure APIs.
  const backend=(window.GOOP_BACKEND_URL || (/^amazonaws\.com$/i.test(location.hostname.split('.').slice(-2).join('.'))?'':((location.protocol==='http:'||location.protocol==='https:')?location.origin:''))).replace(/\/$/,'');
  const paths={moviesBase:'/movies/',musicBase:'/music/',mangaBase:'/manga/',gameHost:'/games/'};
  return backend&&paths[id]?validBase(backend+paths[id]):null;
}
function gameCoverURL(key,ref){
  const direct=safeUrl(ref);
  if(direct)return direct;
  try{const file=gameFile(key,ref);return file.custom||file.cdn;}catch{return null;}
}
async function getGames(key){
  if(gameCache[key])return gameCache[key];
  const source=sources[key];
  if(!source)throw Error('Unknown game catalog');
  const repo=source.repo||key;
  const catalog=("https:\/\/raw.githubusercontent.com/" + String(source.owner) + "/" + String(repo) + "/main/" + String(source.file));
  const response=await fetch(catalog,{cache:'no-store',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Catalog request failed: HTTP '+response.status);
  const data=await response.json();
  const items=Array.isArray(data)?data:(data?.games||data?.items||[]);
  if(!Array.isArray(items))throw Error('Invalid game catalog');
  // math.json: { title, url, image }; gmshelf: { name, url, img }.
  return gameCache[key]=items.map(g=>({
    name:typeof (g?.name??g?.title)==='string'?String(g.name??g.title).trim():'',
    url:typeof g?.url==='string'?g.url.trim():'',
    img:typeof (g?.img??g?.image??g?.cover)==='string'?String(g.img??g.image??g.cover):''
  })).filter(g=>g.name&&g.url);
}

/* CATALOG PLAYER */
$('goopGameFullscreen').onclick=async()=>{
 try{
   const stage=$('goopGameStage');
   if(document.fullscreenElement)await document.exitFullscreen();
   else if(stage.requestFullscreen)await stage.requestFullscreen();
 }catch(e){gameStatus('Fullscreen was blocked: '+(e?.message||e))}
};


async function showGames(q=''){
  
  const n=$('categoryResults');n.replaceChildren();clearNotice();
  const sourceKey=gameSource;
  const loading=goopElement('p','Loading '+sources[sourceKey].label+' games…','muted');
  n.append(loading);
  try{
    const list=sourceKey==='multiplayer'?multiplayer:await catalog(sourceKey);
    if(gameSource!==sourceKey||active!=='category'||!loading.isConnected)return;
    const term=q.toLowerCase().trim();
    const matches=list.filter(g=>g.name.toLowerCase().includes(term));
    const limit=sourceKey==='fourgames'?350:140;
    const shown=matches.slice(0,limit);
    n.replaceChildren();
    if(!shown.length){notice('No games match your search.');return}
    shown.forEach(g=>{
      const cover=g.img&&!g.img.includes('placeholder')?gameCoverURL(sourceKey,g.img):null;
      const card=makeResult(g.name,sources[sourceKey].label,'',cover,
        ()=>void openGame({source:sourceKey,name:g.name}).catch(e=>toast(e.message)));
      n.append(card);
    });
    if(matches.length>limit&&!term)notice('Showing '+limit+' of '+matches.length+' games — search for more.');
  }catch(e){
    if(gameSource!==sourceKey||active!=='category'||!loading.isConnected)return;
    n.replaceChildren();
    notice('Could not load '+sources[sourceKey].label+' games: '+e.message+'. Try again later.');
  }
}
const goopWarmJobs=new Map(),goopWarmUntil=new Map();
const goopWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function goopReady(service,onProgress=()=>{}){
 if((goopWarmUntil.get(service)||0)>Date.now())return;
 onProgress('Starting '+service+' server… Render may need up to 2 minutes.');
 if(goopWarmJobs.has(service))return goopWarmJobs.get(service);
 const job=(async()=>{
  const gateway=String(window.GOOP_BACKEND_URL||'').replace(/\/$/,'');
  if(!gateway)throw Error('Gateway is not configured');
  const deadline=Date.now()+120000;
  while(Date.now()<deadline){
   try{
    const r=await fetch(gateway+'/api/ready?service='+encodeURIComponent(service),{cache:'no-store',signal:AbortSignal.timeout(Math.min(18000,Math.max(1,deadline-Date.now())))});
    if(r.ok){const data=await r.json();if(data.status==='online'){goopWarmUntil.set(service,Date.now()+60000);return;}}
    if(r.status===404)throw Error('Gateway update required');
   }catch(e){if(e.message==='Gateway update required')throw e;}
   if(Date.now()<deadline)await goopWait(2500);
  }
  throw Error('Server did not become ready within 2 minutes. Try again.');
 })();
 goopWarmJobs.set(service,job);
 try{await job}finally{goopWarmJobs.delete(service)}
}
async function fetchJson(url){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(35000)});
   if(r.ok)return await r.json();
   last=Error('HTTP '+r.status);
   if(![500,502,503,504].includes(r.status))throw Object.assign(last,{permanent:true});
   await r.body?.cancel().catch(()=>{});
  }catch(e){if(e.permanent)throw e;last=e;}
  if(attempt<2)await goopWait(1500*(attempt+1));
 }
 throw last;
}
/* Goop movie details/player. Uses the clicked TMDB ID, never the Movies homepage. */
let goopMovieOverlay=null,goopMovieHls=null,goopMovieRequest=0;
function goopMoviePanel(){
 if(goopMovieOverlay)return goopMovieOverlay;
 const css=document.createElement('style');css.textContent=[
    "",
    " #goopMoviePanel{position:fixed;inset:0;z-index:99999;background:#030b07f5;color:#eef9ee;overflow:auto;padding:28px 14px;font-family:Lexend,system-ui,sans-serif}",
    " #goopMoviePanel .moviebox{width:min(860px,100%);margin:0 auto;background:#0d1b12;border:1px solid #32523b;border-radius:17px;padding:22px;box-shadow:0 0 45px #00d54c1b}",
    " #goopMoviePanel .moviehead{display:flex;gap:22px;align-items:flex-start}",
    " #goopMoviePanel img{width:150px;max-width:35%;border-radius:11px;object-fit:cover}",
    " #goopMoviePanel h2{margin:0 0 12px;font-size:26px}",
    " #goopMoviePanel p{line-height:1.6;color:#b6cdbc}",
    " #goopMoviePanel button,#goopMoviePanel select{font:inherit;padding:10px 15px;background:#193725;color:#ebf8ef;border:1px solid #497b55;border-radius:9px;cursor:pointer}",
    " #goopMoviePanel button:hover{background:#245333}",
    " #goopMoviePanel .movieactions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}",
    " #goopMoviePanel .movieplayer{width:100%;max-height:65vh;min-height:230px;background:#000;border-radius:11px;margin-top:16px}",
    " #goopMoviePanel .movieoptions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}",
    " #goopMoviePanel .moviemsg{font-size:13px;color:#b4d3b8;white-space:pre-wrap}",
    " @media(max-width:520px){#goopMoviePanel .moviehead{flex-direction:column}#goopMoviePanel img{max-width:130px}}",
    " "
  ].join('\n');document.head.append(css);
 goopMovieOverlay=document.createElement('div');goopMovieOverlay.id='goopMoviePanel';goopMovieOverlay.className='hidden';
 goopMovieOverlay.innerHTML='<div class="moviebox"><div style="display:flex;justify-content:flex-end"><button id="goopMovieClose">Close</button></div><div id="goopMovieDetails"></div><div id="goopMovieControls"></div><video id="goopMovieVideo" class="movieplayer hidden" controls="" playsinline=""></video><p id="goopMovieMessage" class="moviemsg" role="status"></p></div>';
 document.body.append(goopMovieOverlay);
 goopMovieOverlay.querySelector('#goopMovieClose').onclick=goopCloseMovie;
 return goopMovieOverlay;
}
function goopCloseMovie(){++goopMovieRequest;goopStopMovie();goopMovieOverlay?.classList.add('hidden')}
function goopStopMovie(){if(goopMovieHls){goopMovieHls.destroy();goopMovieHls=null;}const video=document.getElementById('goopMovieVideo');if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden')}}
function goopMovieMessage(message){const el=document.getElementById('goopMovieMessage');if(el)el.textContent=message}
function goopElement(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function goopMovieAPI(path){const base=apiBase('moviesBase');if(!base)throw Error('Movies backend is not configured');return new URL(path.replace(/^[/]/,''),base.endsWith('/')?base:base+'/').href}
async function goopOpenMovie(item){
 const type=item.media_type==='tv'||(!item.media_type&&item.first_air_date)?'tv':'movie';const id=Number(item.id);
 if(!Number.isSafeInteger(id)||id<1){toast('This title has no valid movie ID');return}
 const request=++goopMovieRequest;const panel=goopMoviePanel();panel.classList.remove('hidden');goopStopMovie();
 const info=panel.querySelector('#goopMovieDetails'),controls=panel.querySelector('#goopMovieControls');info.replaceChildren();controls.replaceChildren();
 info.append(goopElement('h2',item.title||item.name||'Movie'));
 goopMovieMessage('Loading movie details…');
 try{
   const data=await fetchJson(goopMovieAPI(("/api/" + String(type) + "/" + String(id))));if(request!==goopMovieRequest)return;
   info.replaceChildren();const head=goopElement('div',undefined,'moviehead');
   if(data.poster_path){const poster=document.createElement('img');poster.src='https:\/\/image.tmdb.org/t/p/w342'+data.poster_path;poster.alt='';head.append(poster)}
   const meta=document.createElement('div');meta.append(goopElement('h2',data.title||data.name||item.title||item.name));
   meta.append(goopElement('p',[(data.release_date||data.first_air_date||'').slice(0,4),type==='tv'?'TV series':'Movie',data.runtime?data.runtime+' min':''].filter(Boolean).join(' · ')));
   meta.append(goopElement('p',data.overview||'No description available.'));
   head.append(meta);info.append(head);
   const actions=goopElement('div',undefined,'movieactions');controls.append(actions);
   const where=goopElement('button','Where to watch');
   where.title='Find official viewing options for this title';
   where.onclick=()=>{const title=data.title||data.name||item.title||item.name||'';
     const href='https:\/\/www.justwatch.com/us/search?q='+encodeURIComponent(title);
     window.open(href,'_blank','noopener,noreferrer');
   };
   actions.append(where);
   if(type==='movie'){
     const play=goopElement('button','Play movie');play.onclick=()=>goopPlayMovie(("/api/stream/movie/" + String(id)));actions.append(play);
   }else{
     const season=goopElement('select');season.setAttribute('aria-label','Season');const episode=goopElement('select');episode.setAttribute('aria-label','Episode');const play=goopElement('button','Play episode');play.disabled=true;let seasonLoad=0;
     (data.seasons||[]).filter(x=>x.season_number>=0).forEach(x=>{const o=new Option(x.name||'Season '+x.season_number,String(x.season_number));season.add(o)});
     season.onchange=async()=>{
       episode.replaceChildren();play.disabled=true;const load=++seasonLoad;goopMovieMessage('Loading episodes…');
       try{const d=await fetchJson(goopMovieAPI(("/api/tv/" + String(id) + "/season/" + String(encodeURIComponent(season.value)))));if(request!==goopMovieRequest||load!==seasonLoad)return;
       (d.episodes||[]).forEach(x=>episode.add(new Option((String(x.episode_number) + ". " + String(x.name||'Episode')),String(x.episode_number))));play.disabled=episode.options.length===0;goopMovieMessage(play.disabled?'This season has no available episodes.':'Select an episode and press Play')}
       catch(e){if(load===seasonLoad)goopMovieMessage('Could not load episodes: '+e.message)}
     };
     play.onclick=()=>{if(!season.value||!episode.value)return;goopPlayMovie(("/api/stream/tv/" + String(id) + "/" + String(encodeURIComponent(season.value)) + "/" + String(encodeURIComponent(episode.value))))};
     actions.append(season,episode,play);if(season.options.length)season.onchange();
   }
   goopMovieMessage(type==='movie'?'Ready. Press Play to look for available sources.':'Select a season and episode.');
 }catch(e){goopMovieMessage('Movie details could not load: '+e.message+'. Search is working, but this request failed.');}
}
async function goopLoadHls(){
 if(window.Hls)return;
 await new Promise((ok,fail)=>{const sc=document.createElement('script');sc.src='https:\/\/cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';sc.onload=ok;sc.onerror=()=>fail(Error('HLS playback library could not load'));document.head.append(sc)});
}
async function goopPlayMovie(path){
 const request=++goopMovieRequest;
 goopStopMovie();
 goopMovieMessage('Checking available playback sources…');
 let streams=[];
 try{
   const isTV=path.includes('/api/stream/tv/');
   let raw=[];
   const attempts=isTV?2:1;
   for(let attempt=0;attempt<attempts;attempt++){
     const response=await fetch(goopMovieAPI(path),{cache:'no-store'});
     if(!response.ok){
       let detail='';
       try{const body=await response.json();detail=body.error||body.detail||''}catch{}
       throw Error('Stream lookup returned HTTP '+response.status+(detail?' — '+detail:''));
     }
     const data=await response.json();
     if(request!==goopMovieRequest)return;
     raw=Array.isArray(data.streams)?data.streams:[];
     if(raw.length||attempt===attempts-1)break;
     goopMovieMessage('No episode sources on the first request. Retrying once…');
     await new Promise(resolve=>setTimeout(resolve,1800));
     if(request!==goopMovieRequest)return;
   }
   // The x8rr Movies API uses type: 'file' for direct media as well as 'hls'.
   // Older Goop builds mistakenly discarded every 'file' result.
   streams=raw.filter(item=>item&&typeof item.url==='string'&&/^https?:[/][/]/i.test(item.url))
      .filter(item=>['hls','mp4','file'].includes(String(item.type||'').toLowerCase()))
      .map(item=>({...item,type:String(item.type).toLowerCase()==='file'?'mp4':String(item.type).toLowerCase()}));
   if(!streams.length){
     const types=[...new Set(raw.map(item=>String(item?.type||'unspecified')))].join(', ');
     goopMovieMessage(raw.length
       ?("The TV API returned " + String(raw.length) + " source(s), but none are supported HLS or direct video files. Returned types: " + String(types) + ".")
       :isTV
         ?'No streams found for this TV episode. The episode details are working, but the Movies backend returned an empty streams list even after a retry. Try a different episode or use Where to watch.'
         :'No streams found for this movie. The Movies backend returned an empty streams list.');
     return;
   }
 }catch(e){
   if(request===goopMovieRequest)goopMovieMessage('Stream lookup failed: '+e.message);
   return;
 }
 const controls=document.getElementById('goopMovieControls');
 let picker=controls.querySelector('#goopStreamSelect');
 if(picker)picker.remove();
 picker=goopElement('select');picker.id='goopStreamSelect';
 picker.setAttribute('aria-label','Playback source');
 streams.forEach((s,i)=>picker.add(new Option((s.providerName||'Source '+(i+1))+' '+(s.quality||''),String(i))));
 controls.append(picker);
 const probe=goopElement('button','Check source response');
 probe.title='Inspect status and content type from the video proxy';
 controls.append(probe);
 probe.onclick=async()=>{
   const stream=streams[Number(picker.value)||0];
   if(!stream)return;
   const url=goopMovieAPI('/api/proxy?url='+encodeURIComponent(stream.url)+(stream.headers?'&headers='+encodeURIComponent(JSON.stringify(stream.headers)):''));
   const ac=new AbortController();const timeout=setTimeout(()=>ac.abort(),12000);
   goopMovieMessage('Checking video response…');
   try{
     const response=await fetch(url,{method:'GET',signal:ac.signal,cache:'no-store'});
     const mime=(response.headers.get('content-type')||'(not provided)').toLowerCase();
     const reader=response.body?.getReader();
     let sample='';
     if(reader){
       let pieces=[],size=0;
       try{
         for(let i=0;i<12 && size<65536;i++){
           const part=await reader.read();if(part.done)break;
           if(part.value){pieces.push(part.value);size+=part.value.byteLength;}
           const head=new TextDecoder().decode(part.value||new Uint8Array());
           if(i>0 && head.includes('#EXTM3U'))break;
         }
         const prefix=new Uint8Array(Math.min(size,65536));let offset=0;
         for(const piece of pieces){const part=piece.subarray(0,prefix.length-offset);prefix.set(part,offset);offset+=part.length;if(offset===prefix.length)break;}
         sample=new TextDecoder().decode(prefix).replace(/^\uFEFF/,'').trimStart();
       }finally{await reader.cancel().catch(()=>{});}
     }
     let verdict='';
     const isPlaylist=sample.startsWith('#EXTM3U');
     if(!response.ok)verdict='Upstream or Gateway rejected this request.';
     else if(mime.includes('text/html')||/^<!doctype|^<html/i.test(sample))verdict='HTML was returned instead of video.';
     else if(isPlaylist){
       const wrongRoot=/(^|["'=])\/api\/proxy\?/m.test(sample);
       const corrected=sample.includes('/movies/api/proxy?');
       verdict=wrongRoot?'Valid HLS playlist, but segment URLs point at /api/proxy rather than /movies/api/proxy. Update the Gateway HLS route.':
         ('Valid HLS playlist. '+(corrected?'Gateway segment paths look correct. ':'')+'Playback may still fail due to segments or codecs.');
     }else if(stream.type==='hls')verdict='The response has an HLS content type but does not begin with #EXTM3U. This could be an upstream error, truncated response or non-playlist content.';
     else verdict='The response is not an HLS playlist; check video codec and Range support.';
     goopMovieMessage('Source: '+(stream.providerName||'unknown')+' | HTTP '+response.status+' | Content-Type: '+mime+' | '+verdict);
   }catch(e){goopMovieMessage('Source check failed: '+(e.name==='AbortError'?'timed out':e.message))}
   finally{clearTimeout(timeout)}
 };
 const video=document.getElementById('goopMovieVideo');
 const reasons=[];
 let playbackToken=0;
 const shortError=(e)=>String(e?.message||e||'Unknown error').slice(0,180);
 async function trySource(index,automatic=false){
   const thisToken=++playbackToken;
   if(request!==goopMovieRequest)return;
   if(index>=streams.length){
     goopStopMovie();
     const details=reasons.slice(-4).join(' | ');
     goopMovieMessage('All '+streams.length+' sources failed. '+details+'. This usually means providers reject streaming requests, the movie proxy fails, or no playable source is available.');
     return;
   }
   picker.value=String(index);
   const stream=streams[index],label=stream.providerName||'Source '+(index+1);
   goopStopMovie();
   video.classList.remove('hidden');
   let settled=false;
   let timer;
   let hls=null;
   const cleanup=()=>{clearTimeout(timer);video.onplaying=null;video.onerror=null;if(hls){hls.destroy();if(goopMovieHls===hls)goopMovieHls=null;hls=null}};
   const fail=(reason)=>{
     if(settled||thisToken!==playbackToken||request!==goopMovieRequest)return;
     settled=true;
     cleanup();
     reasons.push(label+': '+reason);
     goopMovieMessage(label+' failed ('+reason+'). '+(index+1<streams.length?'Trying next source…':'No more sources.'));
     trySource(index+1,true);
   };
   video.onplaying=()=>{
     if(thisToken!==playbackToken||request!==goopMovieRequest)return;
     settled=true;clearTimeout(timer);
     goopMovieMessage('Playing from '+label);
   };
   video.onerror=()=>{
     const errorCode=video.error?.code||'unknown';
     fail('video error '+errorCode);
   };
   goopMovieMessage('Loading '+label+' ('+(index+1)+'/'+streams.length+')…');
   timer=setTimeout(()=>fail('no playback started within 18 seconds'),18000);
   try{
     const url=goopMovieAPI('/api/proxy?url='+encodeURIComponent(stream.url)+(stream.headers?'&headers='+encodeURIComponent(JSON.stringify(stream.headers)):''));
     if(stream.type==='hls'&&!video.canPlayType('application/vnd.apple.mpegurl')){
       await goopLoadHls();
       if(thisToken!==playbackToken||request!==goopMovieRequest)return;
       if(!window.Hls?.isSupported())throw Error('HLS playback unsupported in this browser');
       hls=new Hls({maxBufferLength:20});
       goopMovieHls=hls;
       hls.on(Hls.Events.ERROR,(_event,data)=>{
         if(data?.fatal)fail('HLS '+(data.type||'error')+': '+(data.details||'unknown'));
       });
       hls.on(Hls.Events.MANIFEST_PARSED,()=>{
         video.play().catch(e=>{
           if(e.name==='NotAllowedError'){
             clearTimeout(timer);
             goopMovieMessage('Playback is ready from '+label+'. Press the video Play button to start.');
           }else fail(shortError(e));
         });
       });
       hls.loadSource(url);hls.attachMedia(video);
     } else {
       video.src=url;
       video.play().catch(e=>{
         if(e.name==='NotAllowedError'){
           clearTimeout(timer);
           goopMovieMessage('Playback is ready from '+label+'. Press the video Play button to start.');
         }else fail(shortError(e));
       });
     }
   }catch(e){fail(shortError(e))}
 }
 picker.onchange=()=>{reasons.length=0;trySource(Number(picker.value)||0)};
 await trySource(0);
}

/* Manga reader: title -> chapter list -> pages, entirely within Goop. */
let goopMangaOverlay=null,goopMangaSession=0,goopMangaChapters=[],goopMangaCurrent=null;
function goopMangaBase(){const base=apiBase('mangaBase');if(!base)throw Error('Manga backend not configured');return base.endsWith('/')?base:base+'/'}
function goopMangaEndpoint(route){return new URL(route.replace(/^[/]/,''),goopMangaBase()).href}
function goopMangaImageURL(raw){
 if(typeof raw!=='string'||!raw.trim())return '';
 try{
   const url=raw.startsWith('/img?')||raw.startsWith('img?')?goopMangaEndpoint(raw):new URL(raw,goopMangaBase()).href;
   return /^https?:[/][/]/i.test(url)?url:'';
 }catch{return ''}
}
function goopMangaNode(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el}
function goopMangaPanel(){
 if(goopMangaOverlay)return goopMangaOverlay;
 const css=document.createElement('style');css.textContent=[
    "",
    " #goopMangaPanel{position:fixed;inset:0;z-index:99998;background:rgba(3,12,7,.98);color:#e7f6e9;overflow:auto;overscroll-behavior:contain;font-family:Lexend,system-ui,sans-serif;padding:20px 14px}",
    " #goopMangaPanel *{box-sizing:border-box}",
    " #goopMangaPanel .manga-wrap{width:min(100%,990px);margin:0 auto}",
    " #goopMangaPanel .manga-top{display:flex;align-items:center;justify-content:space-between;gap:15px;position:sticky;top:-20px;background:rgba(6,20,11,.97);padding:13px 0;z-index:3;border-bottom:1px solid #32563a}",
    " #goopMangaPanel button{font:inherit;cursor:pointer;padding:9px 13px;border:1px solid #41684a;background:#173320;color:#e2f9e7;border-radius:9px}",
    " #goopMangaPanel button:hover{background:#245234;border-color:#79bb87}",
    " #goopMangaPanel button:disabled{opacity:.45;cursor:default}",
    " #goopMangaPanel h2{font-size:clamp(19px,3vw,27px);margin:8px 0 18px}",
    " #goopMangaPanel .manga-detail{display:flex;gap:20px;padding:22px 0 10px;align-items:flex-start}",
    " #goopMangaPanel .manga-cover{max-width:155px;width:29%;border-radius:9px;flex-shrink:0}",
    " #goopMangaPanel .manga-description{font-size:13px;line-height:1.75;color:#a8bea9;white-space:pre-wrap;max-height:210px;overflow:auto}",
    " #goopMangaPanel .manga-label{color:#b2d5b8;font-size:12px;margin:12px 0}",
    " #goopMangaPanel .manga-chapters{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:10px;margin:15px 0 26px}",
    " #goopMangaPanel .manga-chapters button{display:block;text-align:left;min-height:58px;word-break:break-word}",
    " #goopMangaPanel .manga-reader-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}",
    " #goopMangaPanel .manga-reader{max-width:860px;margin:0 auto 40px;text-align:center}",
    " #goopMangaPanel .manga-reader img{width:100%;height:auto;display:block;margin:0 auto;object-fit:contain;background:#0d2113;min-height:50px}",
    " #goopMangaPanel .manga-reader img+img{margin-top:4px}",
    " #goopMangaPanel .manga-message{color:#acd3b5;font-size:13px;line-height:1.7;padding:14px;border:1px solid #355943;background:#0c2416;border-radius:10px;margin:12px 0}",
    " #goopMangaPanel .manga-page-fail{padding:18px 10px;color:#f4b3b3;font-size:12px;border:1px solid #7f3b3b}",
    " @media(max-width:550px){#goopMangaPanel .manga-cover{width:100px}#goopMangaPanel .manga-chapters{grid-template-columns:1fr}#goopMangaPanel .manga-detail{gap:12px}}",
    " "
  ].join('\n');document.head.append(css);
 const panel=goopMangaNode('section',undefined);panel.id='goopMangaPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Goop Manga Reader');
 const wrap=goopMangaNode('div',undefined,'manga-wrap');
 const bar=goopMangaNode('div',undefined,'manga-top');
 const caption=goopMangaNode('strong','Manga');caption.id='goopMangaCaption';
 const close=goopMangaNode('button','Close');close.onclick=goopCloseManga;
 bar.append(caption,close);
 const content=goopMangaNode('div');content.id='goopMangaContent';
 wrap.append(bar,content);panel.append(wrap);document.body.append(panel);goopMangaOverlay=panel;
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&goopMangaOverlay)goopCloseManga()});
 return panel;
}
function goopCloseManga(){goopMangaSession++;if(goopMangaOverlay){goopMangaOverlay.remove();goopMangaOverlay=null}document.body.style.overflow=goopMangaOverlay? 'hidden':goopMangaBeforeOverflow}
let goopMangaBeforeOverflow='';
function goopMangaMessage(text){const content=document.getElementById('goopMangaContent');if(content){content.replaceChildren(goopMangaNode('div',text,'manga-message'))}}
function goopMangaRoute(type,id,kind){
 if(type==='mangadex'){
   if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid MangaDex title ID');
   return '/mangadex/'+id+(kind==='chapters'?'/chapters':'');
 }
 const m=String(id).match(/^(\d{1,7})\/([a-z0-9-]{1,200})$/i);
 if(!m)throw Error('Invalid MangaPill title ID');
 return '/pill/title/'+m[1]+'/'+m[2]+(kind==='chapters'?'/chapters':'');
}
function goopMangaPageRoute(type,id){
 if(type==='mangadex'){
   if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid chapter ID');
   return '/mangadex/chapter/'+id+'/pages';
 }
 const m=String(id).match(/^(\d{1,7}-\d{1,12})\/([a-z0-9-]{1,200})$/i);
 if(!m)throw Error('Invalid MangaPill chapter ID');
 return '/pill/chapter/'+m[1]+'/'+m[2]+'/pages';
}
async function goopOpenManga(item){
 const id=String(item.id||'');const type=settings.mangaSource==='pill'?'pill':'mangadex';
 const ticket=++goopMangaSession;goopMangaCurrent={id,type,title:item.title||item.name||'Manga'};goopMangaChapters=[];
 goopMangaPanel();goopMangaBeforeOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 document.getElementById('goopMangaCaption').textContent=goopMangaCurrent.title;
 goopMangaMessage('Loading manga details and chapters…');
 try{
  const [detail,listing]=await Promise.all([
    fetchJson(goopMangaEndpoint(goopMangaRoute(type,id,'detail'))),
    fetchJson(goopMangaEndpoint(goopMangaRoute(type,id,'chapters')))
  ]);
  if(ticket!==goopMangaSession)return;
  const chapters=Array.isArray(listing.chapters)?listing.chapters:[];
  goopMangaChapters=chapters;const content=document.getElementById('goopMangaContent');content.replaceChildren();
  const heading=goopMangaNode('h2',detail.title||goopMangaCurrent.title);content.append(heading);
  const intro=goopMangaNode('div',undefined,'manga-detail');
  const cover=goopMangaImageURL(detail.cover||item.cover);
  if(cover){const img=goopMangaNode('img');img.src=cover;img.alt=detail.title||'Manga cover';img.className='manga-cover';img.loading='lazy';intro.append(img)}
  const info=goopMangaNode('div');info.append(goopMangaNode('p',[detail.status,detail.year].filter(Boolean).join(' · '),'manga-label'));
  info.append(goopMangaNode('div',detail.description||'Select a chapter to begin reading.','manga-description'));
  intro.append(info);content.append(intro);
  content.append(goopMangaNode('h3','Chapters ('+chapters.length+')'));
  if(!chapters.length){content.append(goopMangaNode('p','No chapters were returned. Try switching Manga source in Settings.','manga-message'));return}
  const grid=goopMangaNode('div',undefined,'manga-chapters');
  chapters.forEach((chapter,i)=>{
   const button=goopMangaNode('button','Chapter '+(chapter.chapter||String(i+1))+(chapter.title?' · '+chapter.title:''));
   button.onclick=()=>goopReadMangaChapter(i);grid.append(button);
  });content.append(grid);goopMangaOverlay.scrollTop=0;
 }catch(e){if(ticket===goopMangaSession)goopMangaMessage('Unable to load manga details: '+e.message+'. If searches work, check title and chapter routes on the Manga backend.')}
}
async function goopReadMangaChapter(index){
 if(!goopMangaCurrent||!goopMangaChapters[index])return;
 const ticket=++goopMangaSession,chapter=goopMangaChapters[index],current=goopMangaCurrent;
 goopMangaMessage('Loading chapter '+(chapter.chapter||index+1)+'…');
 try{
  const response=await fetchJson(goopMangaEndpoint(goopMangaPageRoute(current.type,String(chapter.id))));
  if(ticket!==goopMangaSession)return;
  const pages=Array.isArray(response.pages)?response.pages:[];
  const content=document.getElementById('goopMangaContent');content.replaceChildren();
  const controls=goopMangaNode('div',undefined,'manga-reader-bar');
  const back=goopMangaNode('button','All chapters');back.onclick=()=>goopOpenManga({id:current.id,title:current.title});controls.append(back);
  const previous=goopMangaNode('button','Previous chapter');previous.disabled=index===0;previous.onclick=()=>goopReadMangaChapter(index-1);controls.append(previous);
  const next=goopMangaNode('button','Next chapter');next.disabled=index>=goopMangaChapters.length-1;next.onclick=()=>goopReadMangaChapter(index+1);controls.append(next);
  content.append(goopMangaNode('h2',current.title+' — Chapter '+(chapter.chapter||index+1)));content.append(controls);
  if(!pages.length){content.append(goopMangaNode('p','This chapter returned no readable pages. Try another chapter or source.','manga-message'));return}
  content.append(goopMangaNode('p',pages.length+' pages · Scroll to read','manga-label'));
  const reader=goopMangaNode('div',undefined,'manga-reader');
  pages.forEach((raw,i)=>{
   const url=goopMangaImageURL(raw);
   if(!url){reader.append(goopMangaNode('div','Page '+(i+1)+' has an invalid image URL.','manga-page-fail'));return}
   const img=goopMangaNode('img');img.src=url;img.alt='Page '+(i+1);img.loading=i<2?'eager':'lazy';img.decoding='async';
   img.onerror=()=>{const err=goopMangaNode('div','Page '+(i+1)+' could not load. The Manga image host or proxy may be blocking the request.','manga-page-fail');img.replaceWith(err)};
   reader.append(img);
  });content.append(reader);
  const bottom=controls.cloneNode(true);bottom.querySelectorAll('button').forEach((btn,i)=>{btn.onclick=i===0?()=>goopOpenManga({id:current.id,title:current.title}):i===1?()=>goopReadMangaChapter(index-1):()=>goopReadMangaChapter(index+1)});content.append(bottom);
  goopMangaOverlay.scrollTop=0;
 }catch(e){if(ticket===goopMangaSession)goopMangaMessage('Chapter failed to load: '+e.message+'. Check the Manga gateway chapter/pages endpoint.')}
}

let goopYouTubePlayer=null;
let goopMusicGeneration=0;
let goopYTReadyPromise=null;
const GOOP_VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
function goopMusicText(tag,value){
 const el=document.createElement(tag);
 el.textContent=String(value??'');
 return el;
}
function goopMusicURL(path){
 const base=apiBase('musicBase');
 if(!base)throw Error('Music backend is not configured');
 return new URL(path.replace(/^\/+/,''),base.replace(/\/?$/,'/')).href;
}
function goopCloseMusic(){
 ++goopMusicGeneration;
 if(goopYouTubePlayer){
  try{goopYouTubePlayer.destroy()}catch{}
  goopYouTubePlayer=null;
 }
 document.getElementById('goopMusicOverlay')?.remove();
}
function goopLoadYTAPI(){
 if(window.YT&&typeof window.YT.Player==='function')return Promise.resolve(window.YT);
 if(goopYTReadyPromise)return goopYTReadyPromise;
 goopYTReadyPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  let done=false;
  const timer=setTimeout(()=>finish(false,Error('YouTube player script timed out')),14000);
  function finish(success,err){
   if(done)return;done=true;clearTimeout(timer);
   if(success)resolve(window.YT);
   else{goopYTReadyPromise=null;reject(err);}
  }
  window.onYouTubeIframeAPIReady=()=>{
   try{if(typeof previous==='function')previous()}catch{}
   finish(true);
  };
  const script=document.createElement('script');
  script.src='https://www.youtube.com/iframe_api';
  script.async=true;
  script.onerror=()=>finish(false,Error('YouTube IFrame API could not be loaded'));
  document.head.append(script);
 });
 return goopYTReadyPromise;
}
function goopNormalizeSong(s){
 return String(s||'').normalize('NFKD').toLowerCase()
   .replace(/\([^)]*\b(?:official|audio|video|lyric)\b[^)]*\)/g,'')
   .replace(/[^a-z0-9]+/g,' ').trim();
}
async function goopResolveYouTubeVideo(track,title,artist){
 let id=String(track?.id??track?.track?.id??'').trim();
 if(GOOP_VIDEO_ID.test(id))return id;
 // Tidal catalog results have numeric IDs. Look for a matching YouTube Music entry.
 const q=(title+' '+artist).trim();
 const response=await fetch(goopMusicURL('/api/music/search?q='+encodeURIComponent(q)+'&source=ytm&limit=15'),{cache:'no-store'});
 if(!response.ok)throw Error('YouTube Music search failed (HTTP '+response.status+')');
 const data=await response.json();
 const items=Array.isArray(data.items)?data.items:[];
 const targetTitle=goopNormalizeSong(title),targetArtist=goopNormalizeSong(artist);
 const match=items.find(row=>{
   const sameTitle=goopNormalizeSong(row.title||row.name)===targetTitle;
   const foundArtist=goopNormalizeSong(typeof row.artist==='string'?row.artist:row.artist?.name);
   return sameTitle && (foundArtist===targetArtist||foundArtist.includes(targetArtist)||targetArtist.includes(foundArtist));
 });
 if(match&&GOOP_VIDEO_ID.test(String(match.id)))return String(match.id);
 throw Error('No matching YouTube Music video was found for this catalog entry');
}
async function goopOpenMusic(track){
 goopCloseMusic();
 const generation=++goopMusicGeneration;
 const title=String(track?.title||track?.name||track?.track?.title||'Untitled');
 const artist=String(typeof track?.artist==='string'?track.artist:(track?.artist?.name||track?.track?.artist||'Unknown artist'));
 const overlay=document.createElement('div');
 overlay.id='goopMusicOverlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Goop Music player');
 overlay.style.cssText='position:fixed;inset:0;z-index:10002;background:rgba(2,12,5,.94);overflow-y:auto;display:flex;align-items:center;justify-content:center;padding:22px';
 const card=document.createElement('section');
 card.style.cssText='background:#0d2416;border:1px solid #3c7549;box-shadow:0 0 38px rgba(29,255,92,.1);border-radius:16px;padding:24px;width:min(690px,100%);display:grid;gap:13px';
 const top=document.createElement('div');
 top.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px';
 top.append(goopMusicText('h2','Music'));
 const close=goopMusicText('button','Close');close.type='button';close.className='btn';close.onclick=goopCloseMusic;
 top.append(close);card.append(top);
 const song=goopMusicText('strong',title);song.style.cssText='font-size:19px';card.append(song);
 card.append(goopMusicText('span',artist));
 const viewport=document.createElement('div');
 viewport.style.cssText='aspect-ratio:16/9;width:100%;background:#030903;border-radius:10px;overflow:hidden;position:relative;';
 const mount=document.createElement('div');
 mount.id='goopYouTubeMount';
 mount.style.cssText='width:100%;height:100%';
 viewport.append(mount);card.append(viewport);
 const info=goopMusicText('p','Preparing YouTube player…');
 info.setAttribute('role','status');
 info.style.cssText='font-size:12px;color:#b5debd;line-height:1.6;min-height:18px';
 card.append(info);
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
 const retry=goopMusicText('button','Retry player');
 retry.type='button';retry.className='btn';
 const external=goopMusicText('a','Open on YouTube');
 external.target='_blank';external.rel='noopener noreferrer';
 external.className='btn';
 external.style.cssText='text-decoration:none;display:inline-flex;align-items:center';
 external.hidden=true;
 actions.append(retry,external);
 card.append(actions);
 overlay.append(card);
 document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)goopCloseMusic()});
 const current=()=>generation===goopMusicGeneration && document.getElementById('goopMusicOverlay')===overlay;
 let videoId='';
 async function start(){
  if(!current())return;
  info.textContent='Finding the YouTube video…';
  try{
   videoId=await goopResolveYouTubeVideo(track,title,artist);
   if(!current())return;
   external.href='https://www.youtube.com/watch?v='+encodeURIComponent(videoId);
   external.hidden=false;
   info.textContent='Loading YouTube player…';
   const YT=await goopLoadYTAPI();
   if(!current())return;
   if(goopYouTubePlayer){try{goopYouTubePlayer.destroy()}catch{}goopYouTubePlayer=null;}
   viewport.replaceChildren();
   const holder=document.createElement('div');
   holder.id='goopYouTubeMount';
   holder.style.cssText='width:100%;height:100%';
   viewport.append(holder);
   goopYouTubePlayer=new YT.Player(holder,{
     width:'100%',height:'100%',videoId,
     playerVars:{playsinline:1,controls:1,rel:0},
     events:{
      onReady:()=>{
       if(current())info.textContent='Player ready. Press Play to listen.';
      },
      onStateChange:event=>{
       if(!current())return;
       if(event.data===YT.PlayerState.PLAYING)info.textContent='Playing through YouTube';
       else if(event.data===YT.PlayerState.PAUSED)info.textContent='Paused';
      },
      onError:event=>{
       if(!current())return;
       const message=event.data===101||event.data===150
        ? 'This video does not allow embedding. Use Open on YouTube.'
        : 'YouTube could not play this video (error '+event.data+'). Try another song.';
       info.textContent=message;
      }
     }
   });
  }catch(e){
   if(current())info.textContent='Player unavailable: '+(e.message||e);
  }
 }
 retry.onclick=()=>{if(current())start()};
 start();
}
function displayMedia(items,id){let n=$('categoryResults');n.replaceChildren();let data=Array.isArray(items)?items:(items?.results||items?.items||items?.data?.results||items?.data?.items||items?.tracks||[]);if(!Array.isArray(data)||!data.length){notice('No results returned. Try a different search.');return}data.slice(0,80).forEach(i=>{const title=i.title||i.name||i.attributes?.title||i.track?.title||'Untitled';const cover=i.cover||i.poster||i.poster_path&&('https:\/\/image.tmdb.org/t/p/w342'+i.poster_path)||i.image||i.artwork;const subtitle=i.release_date||i.artist?.name||i.artist||i.year||id;const card=makeResult(title,typeof subtitle==='string'?subtitle:id,id==='movies'?'':id==='music'?'':'',id==='manga'?goopMangaImageURL(cover):cover,()=>{if(id==='movies'){goopOpenMovie(i)}else if(id==='music'){goopOpenMusic(i)}else if(id==='manga'){goopOpenManga(i)}});n.append(card)})}
let goopSearchSequence=0;
async function mediaSearch(id,term){if(active!=='category'||$('categoryTitle').textContent!==cats.find(c=>c[0]===id)[1])return;const sequence=++goopSearchSequence;const current=()=>sequence===goopSearchSequence&&active==='category'&&$('categoryTitle').textContent===cats.find(c=>c[0]===id)[1];let b=apiBase(id+'Base'),n=$('categoryResults');n.replaceChildren();clearNotice();if(!b){notice('This section needs the Goop backend to be deployed. Amazon S3 cannot run the '+id+' API. The site owner needs to set goop-config.js once; visitors do not configure servers.');return}let path=id==='movies'?'/api/search/multi?query='+encodeURIComponent(term||'popular'):id==='music'?'/api/music/search?q='+encodeURIComponent(term||'popular')+'&source=ytm':settings.mangaSource==='pill'?'/pill/search?title='+encodeURIComponent(term):'/mangadex/search?title='+encodeURIComponent(term);try{await goopReady(id,msg=>{if(current())notice(msg)});if(!current())return;notice('Loading '+id+'…');let data=await fetchJson(new URL(path.replace(/^[/]/,''),b.endsWith('/')?b:b+'/').href);if(!current())return;clearNotice();displayMedia(data,id)}catch(e){if(!current())return;notice('Could not access the '+id+' backend ('+e.message+'). '+(id==='music'?'Test the /music/api/music/search route in your Gateway and check Render logs.':'Check URL, server status, HTTPS and CORS settings.'))}}
function openCategory(id){if(currentGame)closeCatalogGame();++goopSearchSequence;view('category');highlightSection(id);$('categoryTitle').textContent=cats.find(c=>c[0]===id)[1];$('categoryDesc').textContent=cats.find(c=>c[0]===id)[3];$('categoryTools').replaceChildren();$('categoryResults').replaceChildren();clearNotice();if(id==='chat'||id==='ai'){goopNavigate(id);return;}
if(id==='games'){gameSource='ugs';const sel=document.createElement('select');sel.className='field';Object.entries(sources).forEach(([k,s])=>sel.add(new Option(s.label,k)));sel.value=gameSource;sel.onchange=()=>{gameSource=sel.value;showGames(search.value)};const search=toolSearch('Find a game…');search.oninput=()=>showGames(search.value);$('categoryTools').append(sel,search);showGames();return}if(id==='blox'){
 const info=goopElement('p','Checking GoopBlox server…');
 info.className='muted';
 $('categoryTools').append(info);
 const play=goopElement('button','Launch GoopBlox');
 play.className='btn primary';play.disabled=true;
 const entry=toolSearch('Roblox place ID or game URL (optional)');
 entry.title='Enter a Roblox game link or place ID, or leave blank for the launcher';
 entry.style.minWidth='min(310px,100%)';
 const go=goopElement('button','Join game');
 go.className='btn';go.disabled=true;
 $('categoryTools').append(entry,play,go);
 function parsePlaceId(value){
   const v=value.trim();
   if(!v)return '';
   if(/^\d{1,15}$/.test(v))return v;
   try{
     const u=new URL(v);
     if(!/(^|\.)roblox\.com$/i.test(u.hostname))return null;
     const match=u.pathname.match(/\/games\/(\d+)/i);
     const id=match?.[1]||u.searchParams.get('placeId');
     return id&&/^\d{1,15}$/.test(id)?id:null;
   }catch{return null}
 }
 let bloxUrl='';
 async function getBloxUrl(){
   // Owner-configured URL takes priority; visitors never need to enter a URL.
   const configured=validBase(window.GOOP_BLOX_URL);
   if(configured)return configured;
   const gateway=String(window.GOOP_BACKEND_URL||'').replace(/\/$/,'');
   if(gateway){
     try{
       const response=await fetch(gateway+'/goop-backend-config.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});
       if(response.ok){
         const json=await response.json();
         const url=validBase(json.bloxBase);
         if(url&&new URL(url).origin!==new URL(gateway).origin)return url;
       }
     }catch(e){console.warn('GoopBlox configuration:',e)}
   }
   const manual=validBase(settings.bloxBase);
   if(manual&&(!gateway||new URL(manual).origin!==new URL(gateway).origin))return manual;
   return null;
 }
 function launch(place){
   if(!bloxUrl){toast('GoopBlox server is not connected');return;}
   const url=new URL('/blox/',bloxUrl);
   if(place)url.searchParams.set('placeId',place);
   // Roblox browser engine requires top-level cross-origin isolation.
   window.open(url.href,'_blank','noopener,noreferrer');
 }
 play.onclick=()=>launch('');
 go.onclick=()=>{
   const place=parsePlaceId(entry.value);
   if(place===null||!place){info.textContent='Enter a valid Roblox place ID or roblox.com/games/… link.';return;}
   launch(place);
 };
 entry.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go.click()}};
 getBloxUrl().then(async url=>{
   if(active!=='category'||$('categoryTitle').textContent!=='GoopBlox')return;
   if(!url){info.textContent='GoopBlox is not deployed yet. The site owner must deploy the separate GoopBlox Render service and set BLOX_URL on the Gateway.';return;}
   bloxUrl=url;
   await goopReady('blox',msg=>{info.textContent=msg});
   if(!info.isConnected)return;
   info.textContent='GoopBlox launches in a separate tab because the Roblox web engine requires cross-origin isolation. You may need to sign in to Roblox to join games.';
   play.disabled=false;go.disabled=false;
 }).catch(e=>{info.textContent='Could not check GoopBlox: '+e.message;const retry=goopElement('button','Retry');retry.className='btn';retry.onclick=()=>openCategory('blox');if(info.isConnected)$('categoryTools').append(retry)});
 return;
}
const search=toolSearch('Search '+id+'…');let timer;search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>mediaSearch(id,search.value),350)};let btn=document.createElement('button');btn.className='btn';btn.textContent='Open server';btn.onclick=()=>{const u=apiBase(id+'Base');if(u)window.open(u,'_blank','noopener,noreferrer');else toast('Configure this backend in Settings')};$('categoryTools').append(search,btn);mediaSearch(id,'')}
const fields=['engine','gameHost','moviesBase','musicBase','mangaBase','bloxBase','mangaSource'];
function syncSettings(){for(const k of fields)$(k).value=settings[k]||'';syncBrowserSettings();}
function updateSettings(){for(const k of fields)settings[k]=$(k).value.trim();save();}
for(const k of fields)$(k).addEventListener('change',updateSettings);
$('exportSettings').onclick=()=>{let blob=new Blob([JSON.stringify({settings,bookmarks},null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='goop-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('clearData').onclick=()=>{if(!confirm('Reset all Goop settings and bookmarks?'))return;settings={...defaults};bookmarks=[];gameCache={};save();syncSettings();renderBookmarks();toast('Goop data reset')};

const standaloneGames=[{"name": "2048"}, {"name": "Snake"}, {"name": "Tic Tac Toe"}];
sources.offline={label:'Built-in games',owner:'',file:''};
const originalShowGames=showGames;
showGames=async function(q=''){
 if(gameSource!=='offline')return originalShowGames(q);
 clearNotice();
 const n=$('categoryResults');n.replaceChildren();
 standaloneGames.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())).forEach(g=>{
  n.append(makeResult(g.name,'Plays in Goop','',null,()=>{
   goopNavigate('game-'+g.name.toLowerCase().replaceAll(' ','-'));
  }));
 });
 if(!n.childElementCount)notice('No matching built-in games.');
};

/* PLAYER FEATURES */
renderBookmarks();syncSettings();
$('appsOrigin').value=window.origin || location.origin;
homeController = {
    selectSection,openGame,gameTools,remember,drawShelf,
    search(value){ const url=resolveSearch(value); if(url)navigate(url); },
    show(section) {
      if (goopMovieOverlay) goopCloseMovie();
      if (goopMangaOverlay) goopCloseManga();
      if (document.getElementById('goopMusicOverlay')) goopCloseMusic();
      if (section === 'home') { ++goopSearchSequence; view('home'); renderBookmarks(); }
      else if (section === 'settings') { ++goopSearchSequence; view('settings'); syncSettings(); }
      else openCategory(section);
    },
    leave() {
      ++goopSearchSequence;
      if (goopMovieOverlay) goopCloseMovie();
      if (goopMangaOverlay) goopCloseManga();
      if (document.getElementById('goopMusicOverlay')) goopCloseMusic();
      if (editor.open) editor.close();
      view('home');
    }
  };
})();

(() => {
  const toggle=document.getElementById('matrixMotion');
  const columns=[...document.querySelectorAll('#goopBinaryRain .goop-rain-column')];
  if (!columns.length) return;
  try { if (toggle) toggle.checked=localStorage.getItem('goop-matrix-motion')!=='off'; } catch {}
  function apply() {
    const enabled=!toggle || toggle.checked;
    document.body.classList.toggle('goop-motion-off',!enabled);
    columns.forEach(el=>el.style.animationPlayState=enabled?'running':'paused');
  }
  if(toggle)toggle.addEventListener('change',()=>{apply();try{localStorage.setItem('goop-matrix-motion',toggle.checked?'on':'off');}catch{}});
  apply();
})();

(() => {
  'use strict';
  const halo = document.createElement('div');
  halo.className = 'goop-cursor-halo';
  halo.setAttribute('aria-hidden', 'true');
  document.body.append(halo);

  let frame = 0;
  let x = 0, y = 0;
  function hideHalo() {
    cancelAnimationFrame(frame);
    frame = 0;
    halo.removeAttribute('data-visible');
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') {
      hideHalo();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      halo.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      halo.setAttribute('data-visible', '');
      frame = 0;
    });
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', hideHalo);
  window.addEventListener('blur', hideHalo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideHalo(); });

  let audio;
  async function clickSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audio ||= new Context();
      if (audio.state !== 'running') await audio.resume();
      if (audio.state !== 'running' || document.hidden) return;
      const start = audio.currentTime;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(620, start);
      tone.frequency.exponentialRampToValueAtTime(415, start + 0.029);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.016, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.032);
      tone.connect(gain).connect(audio.destination);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      tone.start(start);
      tone.stop(start + 0.034);
    } catch {
      // The browser may suspend audio when a page or embedded game is closing.
    }
  }
  document.addEventListener('click', event => {
    const control = event.target.closest?.('button,a[href],input,textarea,select,summary,[role="button"],canvas');
    if (event.isTrusted && control && !control.matches(':disabled,[aria-disabled="true"]')) void clickSound();
  }, true);
})();

return homeController;
};