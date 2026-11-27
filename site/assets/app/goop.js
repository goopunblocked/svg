
(()=>{'use strict';
const $=id=>document.getElementById(id), defaults={engine:'https://lite.duckduckgo.com/lite/?q=',wisp:'wss://itcode.vip/api/',customWisp:'',preferProxy:true,gameHost:'',moviesBase:'',musicBase:'',mangaBase:'',bloxBase:'',mangaSource:'mangadex',transport:'libcurl'};
const sources={ugs:{label:'UGS',owner:'gmshelf',file:'ugs.json'},seraph:{label:'Seraph',owner:'gmshelf',file:'seraph.json'},truffled:{label:'Truffled',owner:'gmshelf',file:'truffled.json'},ckv:{label:'CKV',owner:'gmshelf',file:'ckv.json'},fourgames:{label:'4Games',owner:'electricxmaxx',repo:'mathassignments',file:'math.json'}};
const cats=[['games','Games','',''],['movies','Movies','',''],['music','Music','',''],['manga','Manga','',''],['blox','GoopBlox','',''],['ai','AI','',''],['chat','Chat','',''],['settings','Settings','','']];
let settings={...defaults,...read('goop-settings',{})};if(!settings.noswMigration){if(settings.wisp==='wss://wisp.mercurywork.shop/')settings.wisp=defaults.wisp;settings.noswMigration=true;}if(settings.engine==='https://duckduckgo.com/?q=')settings.engine='https://lite.duckduckgo.com/lite/?q=';if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){if(settings.wisp===defaults.wisp)settings.wisp='ws://'+location.host+'/wisp/';}let bookmarks=read('goop-bookmarks',[{name:'Google',url:'https://google.com'},{name:'YouTube',url:'https://youtube.com'},{name:'GitHub',url:'https://github.com'}]);let active='home',gameSource='ugs',gameCache={},currentUrl='',history=[],historyIndex=-1,scramjet=null,proxyFrame=null,initPromise=null,token=0;
function read(key,fallback){try{let value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}}
function save(){localStorage.setItem('goop-settings',JSON.stringify(settings));localStorage.setItem('goop-bookmarks',JSON.stringify(bookmarks))}
function safeUrl(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
function validBase(s){return safeUrl(s?.trim()||'')}
function toast(s){const el=$('toast');el.textContent=s;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),3500)}
function view(v){
 const changed=active!==v;
 active=v;
 $('goopMenu').setAttribute('aria-expanded','false');
 $('goopRail').classList.remove('is-open');
 highlightSection(v==='home'||v==='settings'?v:'');
 if(v!=='category'){
   $('goopCommunity')?.remove();
   $('goopAIChat')?.remove();
 }
 const views={home:'home',category:'categoryView',settings:'settingsView',browser:'browserView'};
 for(const id of Object.values(views))$(id).classList.toggle('hidden',id!==views[v]);
 window.scrollTo(0,0);
 if((changed || v==='category' || v==='browser') && !matchMedia('(prefers-reduced-motion: reduce)').matches){
   const panel=$(views[v]);
   panel.getAnimations().filter(a=>a.id==='goop-view-entry').forEach(a=>a.cancel());
   panel.animate([{opacity:0.84,translate:'0 3px'},{opacity:1,translate:'0 0'}],
     {id:'goop-view-entry',duration:140,easing:'ease-out'});
 }
}
function home(){if(goopCurrentFourGame)goopCloseFourGame();view('home');renderBookmarks()}$('homeBtn').onclick=home;$('brandHome').onclick=home;$('brandHome').onkeydown=e=>{if(e.key==='Enter')home()};document.querySelectorAll('[data-home]').forEach(b=>b.onclick=home);$('browserHome').onclick=home;$('settingsBtn').onclick=()=>{syncSettings();view('settings')};
function renderBookmarks(){const node=$('bookmarks');node.replaceChildren();bookmarks.forEach((b,i)=>{const wrap=document.createElement('div');wrap.className='bookmark';const a=document.createElement('button');a.className='bookmark';a.style.cssText='border:0;background:none;padding:0;color:inherit';a.textContent=b.name;a.onclick=()=>navigate(b.url);const x=document.createElement('button');x.className='remove';x.title='Remove bookmark';x.textContent='×';x.onclick=()=>{bookmarks.splice(i,1);save();renderBookmarks()};wrap.append(a,x);node.append(wrap)})}
$('addBookmark').onclick=()=>{let raw=prompt('Bookmark URL (https://...)');if(!raw)return;let url=safeUrl(raw.includes('://')?raw:'https://'+raw);if(!url){toast('Enter a valid web address');return}let name=prompt('Bookmark name',new URL(url).hostname)||new URL(url).hostname;bookmarks.push({name:name.trim().slice(0,55),url});save();renderBookmarks()};
$('categories').replaceChildren(...cats.map(([id,title,emoji,detail])=>{let b=document.createElement('button');b.className='tile';b.dataset.goopSection=id;b.innerHTML='<span class="name">'+title+'</span><span class="tile-arrow">›</span>';b.onclick=()=>{if(id==='settings'){syncSettings();view('settings')}else openCategory(id)};return b}));
function highlightSection(id){
 for(const b of $('goopNav').children){if(b.dataset.goopSection===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
}
for(const tile of $('categories').children){
 const button=document.createElement('button');button.type='button';button.dataset.goopSection=tile.dataset.goopSection;
 button.textContent=tile.querySelector('.name').textContent;button.onclick=()=>tile.click();$('goopNav').append(button);
}
$('goopMenu').onclick=()=>{
 const visible=$('goopRail').classList.toggle('is-open');$('goopMenu').setAttribute('aria-expanded',String(visible));
 if(visible)$('goopNav').querySelector('button')?.focus();
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('goopRail').classList.contains('is-open')){$('goopMenu').click();$('goopMenu').focus()}});
document.addEventListener('click',e=>{if($('goopRail').classList.contains('is-open')&&!$('goopRail').contains(e.target)&&!$('goopMenu').contains(e.target))$('goopMenu').click()});
function resolveSearch(s){s=s.trim();if(!s)return null;if(/^https?:\/\//i.test(s))return safeUrl(s);if(/^localhost(:\d+)?(\/|$)/i.test(s))return 'http://'+s;if(/^(?:[\w-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s))return safeUrl('https://'+s);return settings.engine+encodeURIComponent(s)}
$('homeSearchForm').onsubmit=e=>{e.preventDefault();const u=resolveSearch($('homeSearch').value);if(u)navigate(u)};$('goBtn').onclick=()=>{let u=resolveSearch($('urlInput').value);if(u)navigate(u)};$('urlInput').onkeydown=e=>{if(e.key==='Enter')$('goBtn').click()};
function status(s){$('status').textContent=s;settingsStatus=s}
let settingsStatus='';
// NoSW browsing adapter. The upstream loader lives in nosw.html.
async function initProxy(){throw Error('Legacy runtime removed');}
// Browser JavaScript is already active if this code executes. Cookies and site
// storage are controlled by browser permissions, not by a webpage toggle.
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
let goopNoswSessionWisp=null;
function loadPage(url){
 const request=++token;hideFallback();view('browser');$('urlInput').value=url;currentUrl=url;
 $('searchGuide')?.classList.add('hidden');
 const frame=$('browserFrame');frame.removeAttribute('srcdoc');
 if(!settings.preferProxy){status('In-page browsing disabled in Settings');showBrowserSetup(url);return;}
 const loader=new URL('nosw.html',document.baseURI);
 // Reuse the active NoSW session rather than reloading its worker on every
 // search. This allows the proxy's session state to survive Goop navigations.
 // NoSW's own _0xz0a20 submit handler performs the navigation internally.
 try{
   const currentSrc=frame.getAttribute('src')||'';
   const currentlyNoSW=currentSrc.startsWith(loader.href.split('?')[0]+'?')||currentSrc===loader.href;
   if(currentlyNoSW && goopNoswSessionWisp===settings.wisp){
     const doc=frame.contentDocument;
     const address=doc?.getElementById('_0xz0a1f');
     const searchForm=doc?.getElementById('_0xz0a20');
     if(address && searchForm){
       address.value=url;
       if(typeof searchForm.requestSubmit==='function')searchForm.requestSubmit();
       else searchForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
       status('Navigating with NoSW · existing session preserved · '+goopBrowsingMessage());
       return;
     }
   }
 }catch(err){console.debug('NoSW session reuse unavailable; opening a new loader',err);}
 const b64=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 loader.searchParams.set('go',b64(url));
 if(/^wss:\/\//i.test(settings.wisp))loader.searchParams.set('w1',b64(settings.wisp));
 goopNoswSessionWisp=settings.wisp;
 status('Loading page with NoSW… '+goopBrowsingMessage());
 frame.onload=()=>{if(request===token)status('NoSW browser opened · '+goopBrowsingMessage());};
 frame.src=loader.href;
}
function hideFallback(){const node=$('searchFallback');node.classList.add('hidden');node.replaceChildren();$('browserFrame').classList.remove('hidden')}
function openFallback(){const node=$('searchFallback');node.classList.remove('hidden');$('browserFrame').classList.add('hidden');return node}
function fallbackHeading(heading,description){const node=openFallback();node.replaceChildren();const h=document.createElement('h2');h.textContent=heading;const p=document.createElement('p');p.textContent=description;node.append(h,p);return node}
function buttonFor(label,action){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.onclick=action;return b}
function showBrowserSetup(url){const node=fallbackHeading('Website browsing needs NoSW','Goop opened this page internally, but loading external websites inside the browser requires the NoSW loader (nosw.html) and a working Wisp connection. A standalone local HTML file cannot bypass another website’s iframe restrictions.');const box=document.createElement('div');box.className='search-panel';box.textContent='Requested address: '+url;node.append(box,buttonFor('Open in external browser',()=>window.open(url,'_blank','noopener,noreferrer')),buttonFor('Back to Goop',home));status('NoSW is not available on this installation. No external tab was opened.')}
async function runGoopConnectionCheck(target){
  const messages=[];
  const loaderUrl=new URL('nosw.html',document.baseURI);
  try {
    const response=await fetch(loaderUrl.href,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    const type=response.headers.get('content-type')||'unknown';
    if(!response.ok){
      messages.push('NoSW loader: HTTP '+response.status+' — upload nosw.html to the S3 bucket root.');
    } else {
      const body=await response.text();
      if(body.includes('W1I41Connection') && body.includes('u22Loader.navigate')){
        messages.push('NoSW loader: found (HTTP '+response.status+')');
      } else {
        messages.push('NoSW loader: file loaded but does not look like the expected NoSW single.html');
      }
    }
  }catch(error){messages.push('NoSW loader unavailable: '+error.message)}
  let wisp=settings.wisp||defaults.wisp;
  if(wisp==='local')wisp=(location.protocol==='https:'?'wss':'ws')+'://'+location.host+'/wisp/';
  if(!/^wss?:\/\//i.test(wisp))messages.push('Wisp URL is invalid: '+wisp);
  else messages.push('Configured Wisp: '+wisp+' (connection not verified here)');
  messages.push(goopBrowsingMessage());
  target.textContent=messages.join('\n');
}
function showRealSearchUnavailable(url,reason){
 const node=fallbackHeading('Search connection unavailable',
  'Goop requested the real search engine, but its NoSW browser has not connected.');
 const detail=document.createElement('p');detail.className='muted';
 detail.textContent='Connection error: '+(reason||'Could not initialize NoSW or Wisp.');
 const address=document.createElement('p');address.className='muted';address.textContent='Requested website: '+url;
 const diagnostics=document.createElement('pre');
 diagnostics.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;background:#092115;border:1px solid #376348;padding:13px;border-radius:10px;font-size:12px;line-height:1.6';
 diagnostics.textContent='Click Check browser files to identify missing S3 assets.';
 node.append(detail,address,
  buttonFor('Check browser files',()=>runGoopConnectionCheck(diagnostics)),
  buttonFor('Retry inside Goop',()=>loadPage(url)),
  buttonFor('Wisp settings',()=>{syncSettings();view('settings')}),
  diagnostics);
 status('NoSW connection unavailable — check nosw.html and Wisp');
}

function canUseProxy(){return settings.preferProxy&&window.isSecureContext&&location.protocol!=='file:'&&'serviceWorker' in navigator}
function searchInfo(url){
  try {
    const u=new URL(url), host=u.hostname.toLowerCase();
    const q=u.searchParams.get('q')||u.searchParams.get('query');
    if(!q)return null;
    if(host==='duckduckgo.com'||host==='www.duckduckgo.com'||host==='html.duckduckgo.com'||host==='lite.duckduckgo.com')
      return {engine:'DuckDuckGo',query:q,url:'https://lite.duckduckgo.com/lite/?q='+encodeURIComponent(q),direct:'https://duckduckgo.com/?q='+encodeURIComponent(q)};
    if(host==='www.google.com'||host==='google.com'||/^www\.google\.[a-z.]+$/.test(host))
      return {engine:'Google',query:q,url:u.href,direct:u.href};
    if(host==='www.bing.com'||host==='bing.com')return {engine:'Bing',query:q,url:u.href,direct:u.href};
    if(host==='search.brave.com')return {engine:'Brave',query:q,url:u.href,direct:u.href};
  }catch{}
  return null;
}
function showSearchHelp(info){
  const guide=$('searchGuide');guide.replaceChildren();guide.classList.remove('hidden');
  const label=document.createElement('span');label.textContent='DuckDuckGo Lite uses minimal HTML rather than the JavaScript page that crashed in NoSW. If it stays blank, use the direct link.';
  const a=document.createElement('a');a.className='btn';a.href=info.direct;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open results directly';
  guide.append(label,a);
}
function openExternalUrl(url){window.open(url,'_blank','noopener,noreferrer')}
function navigate(url,fromHistory=false){
  let u=safeUrl(url);if(!u){toast('Invalid URL');return}
  const info=searchInfo(u);
  if(info&&info.engine==='DuckDuckGo')u=info.url;
  if(!fromHistory){history=history.slice(0,historyIndex+1);history.push(u);historyIndex=history.length-1}
  currentUrl=u;
  if(info){
    if(info.engine==='DuckDuckGo'){
      loadPage(u);
      showSearchHelp(info);
      status('DuckDuckGo Lite · no-JavaScript results · '+goopBrowsingMessage());
    } else loadPage(u);
    return;
  }
  loadPage(u);
}
$('backBtn').onclick=()=>{if(historyIndex>0)navigate(history[--historyIndex],true);else{try{$('browserFrame').contentWindow.history.back()}catch{}}};$('forwardBtn').onclick=()=>{if(historyIndex<history.length-1)navigate(history[++historyIndex],true)};$('reloadBtn').onclick=()=>currentUrl&&loadPage(currentUrl);$('openExternal').onclick=()=>currentUrl&&window.open(currentUrl,'_blank','noopener,noreferrer');$('saveBookmark').onclick=()=>{if(!currentUrl)return;let name=prompt('Bookmark name',new URL(currentUrl).hostname);if(name){bookmarks.push({name:name.trim(),url:currentUrl});save();toast('Bookmark saved')}};
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
// Use the actual repository path for each catalog. 4Games is stored in
// electricxmaxx/mathassignments (not a repository named "fourgames").
function urlForGame(src,path){
  if(typeof path!=='string'||!path.trim())return null;
  const direct=safeUrl(path.trim());
  if(direct)return direct;
  if(/^\/\/|^\w+:|\\|(?:^|\/)\.\.(?:\/|$)/.test(path))return null;
  const file=path.replace(/^\/+/, '');
  const hosted=src==='fourgames'?null:validBase(settings.gameHost);
  if(hosted){
    try {return new URL(file,hosted.endsWith('/')?hosted:hosted+'/').href} catch{return null}
  }
  const source=sources[src];
  if(!source||!source.owner)return null;
  const repo=source.repo||src;
  // These repos host HTML game files as well as the catalogs. Use the same
  // public CDN convention already present in 4Games' math.json URLs.
  const encoded=file.split('/').map(encodeURIComponent).join('/');
  return `https://cdn.gitdelivr.in/gh/${source.owner}/${repo}/main/${encoded}`;
}
async function getGames(key){
  if(gameCache[key])return gameCache[key];
  const source=sources[key];
  if(!source)throw Error('Unknown game catalog');
  const repo=source.repo||key;
  const catalog=`https://raw.githubusercontent.com/${source.owner}/${repo}/main/${source.file}`;
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

// 4Games integration: source HTML is fetched as text, then rendered as a game
// inside the existing Games category. GitHub raw/CDN files have the wrong MIME
// type for directly navigating an iframe; srcdoc avoids that issue.
let goopFourGameRequest=0;
let goopCurrentFourGame=null;
function goopFourGamePath(game){
  let ref=String(game?.url||'').trim();
  if(game?.name==='Age of War 2')ref='Age of War 2.html'; // upstream .htmll typo
  if(game?.name==='Basketball Bros')ref='Basketball Bros.html'; // upstream points to Baseball Bros
  if(!ref)throw Error('This game has no file URL');
  let owner='electricxmaxx',repo='mathassignments',file=ref;
  if(/^https?:\/\//i.test(ref)){
    const parsed=new URL(ref);
    // Absolute links in math.json are primarily old mirror URLs. Convert them
    // back into source paths so HTML is fetched rather than rendered as text.
    const match=parsed.pathname.match(/^\/gh\/([^/]+)\/([^/]+)\/main\/(.+)$/i);
    if(!match || !/^(?:cdn\.gitdelivr\.in|cdn\.jsdelivr\.net)$/.test(parsed.hostname.toLowerCase())){
      throw Error('This catalog entry uses an unsupported external game host');
    }
    owner=decodeURIComponent(match[1]);repo=decodeURIComponent(match[2]);file=decodeURIComponent(match[3]);
    if(repo!=='mathassignments'||!['electricxmaxx','learningapi'].includes(owner))
      throw Error('This game is not hosted in an approved mathassignments repository');
  }
  if(file.startsWith('/')||file.includes('\\')||file.split('/').some(x=>x==='..'||x==='.'||x==='')||/^[a-z]+:/i.test(file))
    throw Error('Invalid game file path');
  const encoded=file.split('/').map(encodeURIComponent).join('/');
  return {url:`https://raw.githubusercontent.com/${owner}/${repo}/main/${encoded}`,
    backup:`https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/${encoded}`,
    base:`https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/`};
}
function goopFourGameSanitizeSource(html,base){
  // A few source files have markdown code fences or <Module> wrappers.
  html=html.replace(/^\s*```(?:html)?\s*\r?\n/i,'').replace(/\r?\n```\s*$/,'');
  html=html.replace(/^\s*<Module>\s*/i,'').replace(/\s*<\/Module>\s*$/i,'');
  if(!/<(?:html|head|body|script|style|div|canvas|!doctype)\b/i.test(html))
    throw Error('The repository returned something other than a playable HTML file');
  if(!/<base\s/i.test(html)){
    const baseTag='<base href="'+base+'">';
    if(/<head\b[^>]*>/i.test(html)) html=html.replace(/<head\b[^>]*>/i,match=>match+baseTag);
    else if(/<html\b[^>]*>/i.test(html)) html=html.replace(/<html\b[^>]*>/i,match=>match+'<head>'+baseTag+'</head>');
    else html='<head>'+baseTag+'</head>'+html;
  }
  return html;
}
function goopFourGameStatus(text){$('goopGameStatus').textContent=text}
function goopCloseFourGame(){
  ++goopFourGameRequest;
  goopCurrentFourGame=null;
  $('goopGameFrame').removeAttribute('src');
  $('goopGameFrame').srcdoc='';
  $('goopGamePlayer').classList.add('hidden');
  $('categoryResults').classList.remove('hidden');
  $('categoryTools').classList.remove('hidden');
  clearNotice();
}
async function goopPlayFourGame(game){
  const request=++goopFourGameRequest;
  goopCurrentFourGame=game;
  $('goopGameTitle').textContent=game.name;
  $('goopGamePlayer').classList.remove('hidden');
  $('categoryResults').classList.add('hidden');
  $('categoryTools').classList.add('hidden');
  $('goopGameFrame').removeAttribute('src');
  $('goopGameFrame').srcdoc='';
  goopFourGameStatus('Loading '+game.name+' inside Goop…');
  clearNotice();
  $('goopGamePlayer').scrollIntoView({block:'start',behavior:'smooth'});
  try{
    const source=goopFourGamePath(game);
    let result=null,lastProblem='';
    // Some corporate networks block one of these domains. Try the source first
    // and the static CDN if the source is inaccessible. Both return text here.
    for(const url of [source.url,source.backup]){
      try{
        const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
        if(!response.ok)throw Error('HTTP '+response.status);
        const body=await response.text();
        if(body.length>20_000_000)throw Error('Game HTML exceeds 20MB');
        result=goopFourGameSanitizeSource(body,source.base);
        break;
      }catch(e){lastProblem=e?.message||String(e)}
    }
    if(!result)throw Error(lastProblem||'Unable to load game file');
    if(request!==goopFourGameRequest||gameSource!=='fourgames'||active!=='category')return;
    const frame=$('goopGameFrame');
    frame.onload=()=>{if(request===goopFourGameRequest)goopFourGameStatus('')};
    frame.srcdoc=result;
  }catch(e){
    if(request!==goopFourGameRequest)return;
    goopFourGameStatus('Could not load this game: '+(e?.message||String(e))+'. Try another 4Games title or press Restart.');
  }
}
$('goopGameBack').onclick=goopCloseFourGame;
$('goopGameReload').onclick=()=>{if(goopCurrentFourGame)goopPlayFourGame(goopCurrentFourGame)};
$('goopGameFullscreen').onclick=async()=>{
 try{
   const stage=$('goopGameStage');
   if(document.fullscreenElement)await document.exitFullscreen();
   else if(stage.requestFullscreen)await stage.requestFullscreen();
 }catch(e){goopFourGameStatus('Fullscreen was blocked: '+(e?.message||e))}
};

async function showGames(q=''){
  if(goopCurrentFourGame)goopCloseFourGame();
  const n=$('categoryResults');n.replaceChildren();clearNotice();
  const sourceKey=gameSource;
  const loading=goopElement('p','Loading '+sources[sourceKey].label+' games…','muted');
  n.append(loading);
  try{
    const list=await getGames(sourceKey);
    if(gameSource!==sourceKey||active!=='category')return;
    const term=q.toLowerCase().trim();
    const matches=list.filter(g=>g.name.toLowerCase().includes(term));
    const limit=sourceKey==='fourgames'?350:140;
    const shown=matches.slice(0,limit);
    n.replaceChildren();
    if(!shown.length){notice('No games match your search.');return}
    shown.forEach(g=>{
      const cover=g.img&&!g.img.includes('placeholder')?(safeUrl(g.img)||urlForGame(sourceKey,g.img)):null;
      const url=urlForGame(sourceKey,g.url);
      const card=makeResult(g.name,sources[sourceKey].label,'',cover,
        ()=>sourceKey==='fourgames'?goopPlayFourGame(g):(url?navigate(url):toast('This game has no usable link')));
      n.append(card);
    });
    if(matches.length>limit&&!term)notice('Showing '+limit+' of '+matches.length+' games — search for more.');
  }catch(e){
    if(gameSource!==sourceKey||active!=='category')return;
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
 const css=document.createElement('style');css.textContent=`
 #goopMoviePanel{position:fixed;inset:0;z-index:99999;background:#030b07f5;color:#eef9ee;overflow:auto;padding:28px 14px;font-family:Lexend,system-ui,sans-serif}
 #goopMoviePanel .moviebox{width:min(860px,100%);margin:0 auto;background:#0d1b12;border:1px solid #32523b;border-radius:17px;padding:22px;box-shadow:0 0 45px #00d54c1b}
 #goopMoviePanel .moviehead{display:flex;gap:22px;align-items:flex-start}
 #goopMoviePanel img{width:150px;max-width:35%;border-radius:11px;object-fit:cover}
 #goopMoviePanel h2{margin:0 0 12px;font-size:26px}
 #goopMoviePanel p{line-height:1.6;color:#b6cdbc}
 #goopMoviePanel button,#goopMoviePanel select{font:inherit;padding:10px 15px;background:#193725;color:#ebf8ef;border:1px solid #497b55;border-radius:9px;cursor:pointer}
 #goopMoviePanel button:hover{background:#245333}
 #goopMoviePanel .movieactions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
 #goopMoviePanel .movieplayer{width:100%;max-height:65vh;min-height:230px;background:#000;border-radius:11px;margin-top:16px}
 #goopMoviePanel .movieoptions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
 #goopMoviePanel .moviemsg{font-size:13px;color:#b4d3b8;white-space:pre-wrap}
 @media(max-width:520px){#goopMoviePanel .moviehead{flex-direction:column}#goopMoviePanel img{max-width:130px}}
 `;document.head.append(css);
 goopMovieOverlay=document.createElement('div');goopMovieOverlay.id='goopMoviePanel';goopMovieOverlay.className='hidden';
 goopMovieOverlay.innerHTML='<div class="moviebox"><div style="display:flex;justify-content:flex-end"><button id="goopMovieClose">Close</button></div><div id="goopMovieDetails"></div><div id="goopMovieControls"></div><video id="goopMovieVideo" class="movieplayer hidden" controls playsinline></video><p id="goopMovieMessage" class="moviemsg" role="status"></p></div>';
 document.body.append(goopMovieOverlay);
 goopMovieOverlay.querySelector('#goopMovieClose').onclick=goopCloseMovie;
 return goopMovieOverlay;
}
function goopCloseMovie(){++goopMovieRequest;goopStopMovie();goopMovieOverlay?.classList.add('hidden')}
function goopStopMovie(){if(goopMovieHls){goopMovieHls.destroy();goopMovieHls=null;}const video=document.getElementById('goopMovieVideo');if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden')}}
function goopMovieMessage(message){const el=document.getElementById('goopMovieMessage');if(el)el.textContent=message}
function goopElement(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function goopMovieAPI(path){const base=apiBase('moviesBase');if(!base)throw Error('Movies backend is not configured');return new URL(path.replace(/^\//,''),base.endsWith('/')?base:base+'/').href}
async function goopOpenMovie(item){
 const type=item.media_type==='tv'||(!item.media_type&&item.first_air_date)?'tv':'movie';const id=Number(item.id);
 if(!Number.isSafeInteger(id)||id<1){toast('This title has no valid movie ID');return}
 const request=++goopMovieRequest;const panel=goopMoviePanel();panel.classList.remove('hidden');goopStopMovie();
 const info=panel.querySelector('#goopMovieDetails'),controls=panel.querySelector('#goopMovieControls');info.replaceChildren();controls.replaceChildren();
 info.append(goopElement('h2',item.title||item.name||'Movie'));
 goopMovieMessage('Loading movie details…');
 try{
   const data=await fetchJson(goopMovieAPI(`/api/${type}/${id}`));if(request!==goopMovieRequest)return;
   info.replaceChildren();const head=goopElement('div',undefined,'moviehead');
   if(data.poster_path){const poster=document.createElement('img');poster.src='https://image.tmdb.org/t/p/w342'+data.poster_path;poster.alt='';head.append(poster)}
   const meta=document.createElement('div');meta.append(goopElement('h2',data.title||data.name||item.title||item.name));
   meta.append(goopElement('p',[(data.release_date||data.first_air_date||'').slice(0,4),type==='tv'?'TV series':'Movie',data.runtime?data.runtime+' min':''].filter(Boolean).join(' · ')));
   meta.append(goopElement('p',data.overview||'No description available.'));
   head.append(meta);info.append(head);
   const actions=goopElement('div',undefined,'movieactions');controls.append(actions);
   const where=goopElement('button','Where to watch');
   where.title='Find official viewing options for this title';
   where.onclick=()=>{const title=data.title||data.name||item.title||item.name||'';
     const href='https://www.justwatch.com/us/search?q='+encodeURIComponent(title);
     window.open(href,'_blank','noopener,noreferrer');
   };
   actions.append(where);
   if(type==='movie'){
     const play=goopElement('button','Play movie');play.onclick=()=>goopPlayMovie(`/api/stream/movie/${id}`);actions.append(play);
   }else{
     const season=goopElement('select');season.setAttribute('aria-label','Season');const episode=goopElement('select');episode.setAttribute('aria-label','Episode');const play=goopElement('button','Play episode');play.disabled=true;let seasonLoad=0;
     (data.seasons||[]).filter(x=>x.season_number>=0).forEach(x=>{const o=new Option(x.name||'Season '+x.season_number,String(x.season_number));season.add(o)});
     season.onchange=async()=>{
       episode.replaceChildren();play.disabled=true;const load=++seasonLoad;goopMovieMessage('Loading episodes…');
       try{const d=await fetchJson(goopMovieAPI(`/api/tv/${id}/season/${encodeURIComponent(season.value)}`));if(request!==goopMovieRequest||load!==seasonLoad)return;
       (d.episodes||[]).forEach(x=>episode.add(new Option(`${x.episode_number}. ${x.name||'Episode'}`,String(x.episode_number))));play.disabled=episode.options.length===0;goopMovieMessage(play.disabled?'This season has no available episodes.':'Select an episode and press Play')}
       catch(e){if(load===seasonLoad)goopMovieMessage('Could not load episodes: '+e.message)}
     };
     play.onclick=()=>{if(!season.value||!episode.value)return;goopPlayMovie(`/api/stream/tv/${id}/${encodeURIComponent(season.value)}/${encodeURIComponent(episode.value)}`)};
     actions.append(season,episode,play);if(season.options.length)season.onchange();
   }
   goopMovieMessage(type==='movie'?'Ready. Press Play to look for available sources.':'Select a season and episode.');
 }catch(e){goopMovieMessage('Movie details could not load: '+e.message+'. Search is working, but this request failed.');}
}
async function goopLoadHls(){
 if(window.Hls)return;
 await new Promise((ok,fail)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';sc.onload=ok;sc.onerror=()=>fail(Error('HLS playback library could not load'));document.head.append(sc)});
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
   streams=raw.filter(item=>item&&typeof item.url==='string'&&/^https?:\/\//i.test(item.url))
      .filter(item=>['hls','mp4','file'].includes(String(item.type||'').toLowerCase()))
      .map(item=>({...item,type:String(item.type).toLowerCase()==='file'?'mp4':String(item.type).toLowerCase()}));
   if(!streams.length){
     const types=[...new Set(raw.map(item=>String(item?.type||'unspecified')))].join(', ');
     goopMovieMessage(raw.length
       ?`The TV API returned ${raw.length} source(s), but none are supported HLS or direct video files. Returned types: ${types}.`
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
function goopMangaEndpoint(route){return new URL(route.replace(/^\//,''),goopMangaBase()).href}
function goopMangaImageURL(raw){
 if(typeof raw!=='string'||!raw.trim())return '';
 try{
   const url=raw.startsWith('/img?')||raw.startsWith('img?')?goopMangaEndpoint(raw):new URL(raw,goopMangaBase()).href;
   return /^https?:\/\//i.test(url)?url:'';
 }catch{return ''}
}
function goopMangaNode(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el}
function goopMangaPanel(){
 if(goopMangaOverlay)return goopMangaOverlay;
 const css=document.createElement('style');css.textContent=`
 #goopMangaPanel{position:fixed;inset:0;z-index:99998;background:rgba(3,12,7,.98);color:#e7f6e9;overflow:auto;overscroll-behavior:contain;font-family:Lexend,system-ui,sans-serif;padding:20px 14px}
 #goopMangaPanel *{box-sizing:border-box}
 #goopMangaPanel .manga-wrap{width:min(100%,990px);margin:0 auto}
 #goopMangaPanel .manga-top{display:flex;align-items:center;justify-content:space-between;gap:15px;position:sticky;top:-20px;background:rgba(6,20,11,.97);padding:13px 0;z-index:3;border-bottom:1px solid #32563a}
 #goopMangaPanel button{font:inherit;cursor:pointer;padding:9px 13px;border:1px solid #41684a;background:#173320;color:#e2f9e7;border-radius:9px}
 #goopMangaPanel button:hover{background:#245234;border-color:#79bb87}
 #goopMangaPanel button:disabled{opacity:.45;cursor:default}
 #goopMangaPanel h2{font-size:clamp(19px,3vw,27px);margin:8px 0 18px}
 #goopMangaPanel .manga-detail{display:flex;gap:20px;padding:22px 0 10px;align-items:flex-start}
 #goopMangaPanel .manga-cover{max-width:155px;width:29%;border-radius:9px;flex-shrink:0}
 #goopMangaPanel .manga-description{font-size:13px;line-height:1.75;color:#a8bea9;white-space:pre-wrap;max-height:210px;overflow:auto}
 #goopMangaPanel .manga-label{color:#b2d5b8;font-size:12px;margin:12px 0}
 #goopMangaPanel .manga-chapters{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:10px;margin:15px 0 26px}
 #goopMangaPanel .manga-chapters button{display:block;text-align:left;min-height:58px;word-break:break-word}
 #goopMangaPanel .manga-reader-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
 #goopMangaPanel .manga-reader{max-width:860px;margin:0 auto 40px;text-align:center}
 #goopMangaPanel .manga-reader img{width:100%;height:auto;display:block;margin:0 auto;object-fit:contain;background:#0d2113;min-height:50px}
 #goopMangaPanel .manga-reader img+img{margin-top:4px}
 #goopMangaPanel .manga-message{color:#acd3b5;font-size:13px;line-height:1.7;padding:14px;border:1px solid #355943;background:#0c2416;border-radius:10px;margin:12px 0}
 #goopMangaPanel .manga-page-fail{padding:18px 10px;color:#f4b3b3;font-size:12px;border:1px solid #7f3b3b}
 @media(max-width:550px){#goopMangaPanel .manga-cover{width:100px}#goopMangaPanel .manga-chapters{grid-template-columns:1fr}#goopMangaPanel .manga-detail{gap:12px}}
 `;document.head.append(css);
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

// Official YouTube IFrame Player API: video playback stays inside the Goop Music modal.
// Search metadata comes from x8rr/music; no yt-dlp /api/music/stream request is made.
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
function displayMedia(items,id){let n=$('categoryResults');n.replaceChildren();let data=Array.isArray(items)?items:(items?.results||items?.items||items?.data?.results||items?.data?.items||items?.tracks||[]);if(!Array.isArray(data)||!data.length){notice('No results returned. Try a different search.');return}data.slice(0,80).forEach(i=>{const title=i.title||i.name||i.attributes?.title||i.track?.title||'Untitled';const cover=i.cover||i.poster||i.poster_path&&('https://image.tmdb.org/t/p/w342'+i.poster_path)||i.image||i.artwork;const subtitle=i.release_date||i.artist?.name||i.artist||i.year||id;const card=makeResult(title,typeof subtitle==='string'?subtitle:id,id==='movies'?'':id==='music'?'':'',id==='manga'?goopMangaImageURL(cover):cover,()=>{if(id==='movies'){goopOpenMovie(i)}else if(id==='music'){goopOpenMusic(i)}else if(id==='manga'){goopOpenManga(i)}});n.append(card)})}
// Keep the Chat credential only in this Goop page's memory between visits.
let chatCredential='',chatPort;
function attachChatSession(frame){
 frame.addEventListener('load',()=>{
   if(location.protocol==='file:' || !frame.isConnected)return;
   try{if(frame.contentWindow.location.href!==frame.src)return;}catch{return;}
   chatPort?.close();
   const channel=new MessageChannel();
   chatPort=channel.port1;
   chatPort.onmessage=({data})=>{
     if(!frame.isConnected)return;
     if(data?.type==='home'){home();return;}
     if(data?.type!=='session')return;
     if(data.token==='' || (typeof data.token==='string' && /^[a-f0-9]{64}$/.test(data.token)))chatCredential=data.token;
   };
   frame.contentWindow.postMessage({type:'goop-chat-session',token:chatCredential,canGoHome:true},location.origin,[channel.port2]);
 });
}
let goopSearchSequence=0;
async function mediaSearch(id,term){const sequence=++goopSearchSequence;const current=()=>sequence===goopSearchSequence&&active==='category'&&$('categoryTitle').textContent===cats.find(c=>c[0]===id)[1];let b=apiBase(id+'Base'),n=$('categoryResults');n.replaceChildren();clearNotice();if(!b){notice('This section needs the Goop backend to be deployed. Amazon S3 cannot run the '+id+' API. The site owner needs to set goop-config.js once; visitors do not configure servers.');return}let path=id==='movies'?'/api/search/multi?query='+encodeURIComponent(term||'popular'):id==='music'?'/api/music/search?q='+encodeURIComponent(term||'popular')+'&source=ytm':settings.mangaSource==='pill'?'/pill/search?title='+encodeURIComponent(term):'/mangadex/search?title='+encodeURIComponent(term);try{await goopReady(id,msg=>{if(current())notice(msg)});if(!current())return;notice('Loading '+id+'…');let data=await fetchJson(new URL(path.replace(/^\//,''),b.endsWith('/')?b:b+'/').href);if(!current())return;clearNotice();displayMedia(data,id)}catch(e){if(!current())return;notice('Could not access the '+id+' backend ('+e.message+'). '+(id==='music'?'Test the /music/api/music/search route in your Gateway and check Render logs.':'Check URL, server status, HTTPS and CORS settings.'))}}
function openCategory(id){if(goopCurrentFourGame)goopCloseFourGame();++goopSearchSequence;view('category');highlightSection(id);$('categoryTitle').textContent=cats.find(c=>c[0]===id)[1];$('categoryDesc').textContent=cats.find(c=>c[0]===id)[3];$('categoryTools').replaceChildren();$('categoryResults').replaceChildren();clearNotice();if(id==='chat'){
 const frame=document.createElement('iframe');frame.id='goopCommunity';frame.title='Chat';frame.allow="microphone 'self'; autoplay 'self'";frame.src='./community/chat.html';attachChatSession(frame);
 frame.style.cssText='display:block;grid-column:1/-1;width:100%;height:clamp(380px,70dvh,820px);border:1px solid #42596a;border-radius:14px';
 $('categoryResults').append(frame);return;
}if(id==='ai'){
 const frame=document.createElement('iframe');
 frame.id='goopAIChat';frame.title='AI';frame.src='./ai/index.html';
 frame.style.cssText='display:block;grid-column:1/-1;width:100%;height:clamp(350px,68dvh,780px);border:1px solid #34543e;border-radius:12px';
 $('categoryResults').append(frame);
 return;
}if(id==='games'){gameSource='ugs';const sel=document.createElement('select');sel.className='field';Object.entries(sources).forEach(([k,s])=>sel.add(new Option(s.label,k)));sel.value=gameSource;sel.onchange=()=>{gameSource=sel.value;showGames(search.value)};const search=toolSearch('Find a game…');search.oninput=()=>showGames(search.value);$('categoryTools').append(sel,search);showGames();return}if(id==='blox'){
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
const fields=['engine','transport','customWisp','preferProxy','gameHost','moviesBase','musicBase','mangaBase','bloxBase','mangaSource'];function syncSettings(){const access=$('jsCookieStatus');if(access)access.textContent=goopBrowsingMessage();fields.forEach(k=>{if($(k).type==='checkbox')$(k).checked=!!settings[k];else $(k).value=settings[k]||''});$('wisp').value=settings.wisp==='ws://'+location.host+'/wisp/'?'local':(Array.from($('wisp').options).some(o=>o.value===settings.wisp)?settings.wisp:'custom');$('wispStatus').textContent=settingsStatus||'NoSW connects on first navigation.'}
function updateSettings(){fields.forEach(k=>settings[k]=$(k).type==='checkbox'?$(k).checked:$(k).value.trim());settings.wisp=$('wisp').value==='custom'?settings.customWisp:($('wisp').value==='local'?'ws://'+location.host+'/wisp/':$('wisp').value);save()}
fields.forEach(k=>$(k).addEventListener('change',updateSettings));$('wisp').onchange=()=>{if($('wisp').value==='custom'&&!$('customWisp').value)$('customWisp').focus();updateSettings()};
$('applyWisp').onclick=()=>{updateSettings();if(!/^wss?:\/\//i.test(settings.wisp)){toast('Enter a WebSocket URL');return}initPromise=null;scramjet=null;proxyFrame=null;$('browserFrame').src='about:blank';$('wispStatus').textContent='New transport/Wisp saved. It will connect on next navigation.';toast('Wisp selection saved')};
$('testWisp').onclick=()=>{updateSettings();if(!/^wss?:\/\//.test(settings.wisp)){toast('Enter a valid WebSocket URL');return}let socket;try{socket=new WebSocket(settings.wisp);$('wispStatus').textContent='Testing WebSocket connection…';const timer=setTimeout(()=>{socket.close();$('wispStatus').textContent='Socket test timed out'},5000);socket.onopen=()=>{clearTimeout(timer);$('wispStatus').textContent='WebSocket handshake connected. Full Wisp protocol and site access are not verified.';socket.close()};socket.onerror=()=>{clearTimeout(timer);$('wispStatus').textContent='Could not establish WebSocket connection'}}catch(e){$('wispStatus').textContent=e.message}};
$('exportSettings').onclick=()=>{let blob=new Blob([JSON.stringify({settings,bookmarks},null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='goop-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('clearData').onclick=()=>{if(!confirm('Reset all Goop settings and bookmarks?'))return;settings={...defaults};bookmarks=[];gameCache={};save();syncSettings();renderBookmarks();toast('Goop data reset')};

// Standalone file improvements: playable offline games + best-effort real-site embedding.
const standaloneGames = [
 {name:'2048',doc:"<!doctype html><html><head><meta charset=\"utf-8\"><style>*{box-sizing:border-box}body{margin:0;padding:24px;color:#eaffed;background:#07130b;font:15px Lexend,system-ui,sans-serif;text-align:center}button{cursor:pointer;border:1px solid #488d56;background:#193b22;color:#edffed;border-radius:8px;padding:10px 17px;font:inherit}button:hover{background:#2d5b38}h2{margin:0 0 7px;font-size:24px}p{color:#a5cbb0}.board{margin:18px auto}.row{display:flex;justify-content:center;gap:6px}.cell{display:grid;place-items:center;border-radius:8px;font-weight:700}small{color:#8eb397}</style></head><body><h2>2048</h2><p>Score: <span id=\"score\">0</span> · Arrow keys or WASD</p><div id=\"board\" class=\"board\" style=\"display:grid;grid-template-columns:repeat(4,78px);gap:7px;width:max-content;max-width:100%\"></div><button onclick=\"reset()\">New game</button><p><small>Combine matching tiles to reach 2048</small></p><script>let a,score;const b=document.getElementById('board');function reset(){a=Array.from({length:4},()=>Array(4).fill(0));score=0;spawn();spawn();render()}function spawn(){let free=[];a.forEach((row,y)=>row.forEach((v,x)=>{if(!v)free.push([y,x])}));if(!free.length)return;let [y,x]=free[Math.random()*free.length|0];a[y][x]=Math.random()<.9?2:4}function combine(row){let vals=row.filter(Boolean),out=[];for(let i=0;i<vals.length;i++){if(vals[i]===vals[i+1]){out.push(vals[i]*2);score+=vals[i]*2;i++}else out.push(vals[i])}while(out.length<4)out.push(0);return out}function move(key){let old=JSON.stringify(a);for(let i=0;i<4;i++){let v;if(key==='ArrowLeft'||key==='ArrowRight'){v=a[i].slice();if(key==='ArrowRight')v.reverse();v=combine(v);if(key==='ArrowRight')v.reverse();a[i]=v}else{v=a.map(r=>r[i]);if(key==='ArrowDown')v.reverse();v=combine(v);if(key==='ArrowDown')v.reverse();v.forEach((x,j)=>a[j][i]=x)}}if(JSON.stringify(a)!==old){spawn();render()}}function render(){b.replaceChildren();a.flat().forEach(v=>{const el=document.createElement('div');el.className='cell';el.style.cssText='width:78px;height:78px;background:'+(v?'#326e40':'#162c1c')+';font-size:'+(v>1000?'21':'27')+'px';el.textContent=v||'';b.append(el)});document.getElementById('score').textContent=score}document.addEventListener('keydown',e=>{let k={w:'ArrowUp',s:'ArrowDown',a:'ArrowLeft',d:'ArrowRight'}[e.key]||e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){e.preventDefault();move(k)}});let start;document.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});document.addEventListener('touchend',e=>{if(!start)return;let x=e.changedTouches[0].clientX-start[0],y=e.changedTouches[0].clientY-start[1];if(Math.max(Math.abs(x),Math.abs(y))<25)return;move(Math.abs(x)>Math.abs(y)?(x>0?'ArrowRight':'ArrowLeft'):(y>0?'ArrowDown':'ArrowUp'));start=null});reset();<\/script></body></html>"},
 {name:'Snake',doc:"<!doctype html><html><head><meta charset=\"utf-8\"><style>*{box-sizing:border-box}body{margin:0;padding:24px;color:#eaffed;background:#07130b;font:15px Lexend,system-ui,sans-serif;text-align:center}button{cursor:pointer;border:1px solid #488d56;background:#193b22;color:#edffed;border-radius:8px;padding:10px 17px;font:inherit}button:hover{background:#2d5b38}h2{margin:0 0 7px;font-size:24px}p{color:#a5cbb0}.board{margin:18px auto}.row{display:flex;justify-content:center;gap:6px}.cell{display:grid;place-items:center;border-radius:8px;font-weight:700}small{color:#8eb397}</style></head><body><h2>Snake</h2><p>Score: <span id=\"score\">0</span> · Arrow keys or WASD · Swipe on mobile</p><canvas id=\"game\" width=\"400\" height=\"400\" style=\"max-width:95%;height:auto;border:1px solid #3d8651;background:#071009;border-radius:10px;touch-action:none\"></canvas><div><button onclick=\"restart()\">Restart</button></div><script>const c=document.getElementById('game'),ctx=c.getContext('2d'),N=20;let snake,dir,next,food,score,alive;function place(){do{food=[Math.floor(Math.random()*N),Math.floor(Math.random()*N)]}while(snake.some(p=>p[0]===food[0]&&p[1]===food[1]))}function restart(){snake=[[10,10],[9,10],[8,10]];dir=[1,0];next=dir;score=0;alive=true;document.getElementById('score').textContent=score;place();draw()}function input(x,y){if(x!==-dir[0]||y!==-dir[1])next=[x,y]}document.addEventListener('keydown',e=>{let m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];if(m){e.preventDefault();input(...m)}});let start; c.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});c.addEventListener('touchend',e=>{if(!start)return;let x=e.changedTouches[0].clientX-start[0],y=e.changedTouches[0].clientY-start[1];if(Math.max(Math.abs(x),Math.abs(y))<20)return;Math.abs(x)>Math.abs(y)?input(Math.sign(x),0):input(0,Math.sign(y));start=null});function draw(){ctx.fillStyle='#071009';ctx.fillRect(0,0,400,400);ctx.fillStyle='#b9ffce';ctx.fillRect(food[0]*20+3,food[1]*20+3,14,14);snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#b2ffbd':'#3acd6c';ctx.fillRect(p[0]*20+1,p[1]*20+1,18,18)});if(!alive){ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('Game Over',200,190)}}function tick(){if(!alive)return;dir=next;const h=[snake[0][0]+dir[0],snake[0][1]+dir[1]];const eat=h[0]===food[0]&&h[1]===food[1];if(h.some(v=>v<0||v>=20)||snake.slice(0,eat?undefined:-1).some(p=>p[0]===h[0]&&p[1]===h[1])){alive=false;draw();return}snake.unshift(h);if(eat){score++;document.getElementById('score').textContent=score;place()}else snake.pop();draw()}restart();setInterval(tick,130);<\/script></body></html>"},
 {name:'Tic Tac Toe',doc:"<!doctype html><html><head><meta charset=\"utf-8\"><style>*{box-sizing:border-box}body{margin:0;padding:24px;color:#eaffed;background:#07130b;font:15px Lexend,system-ui,sans-serif;text-align:center}button{cursor:pointer;border:1px solid #488d56;background:#193b22;color:#edffed;border-radius:8px;padding:10px 17px;font:inherit}button:hover{background:#2d5b38}h2{margin:0 0 7px;font-size:24px}p{color:#a5cbb0}.board{margin:18px auto}.row{display:flex;justify-content:center;gap:6px}.cell{display:grid;place-items:center;border-radius:8px;font-weight:700}small{color:#8eb397}</style></head><body><h2>Tic Tac Toe</h2><p id=\"info\">Your turn: X</p><div class=\"board\" id=\"board\" style=\"display:grid;grid-template-columns:repeat(3,90px);gap:9px;width:max-content\"></div><button onclick=\"reset()\">New game</button><script>let cells=Array(9).fill(''),turn='X',end=false;const b=document.getElementById('board'),msg=document.getElementById('info');function reset(){cells.fill('');turn='X';end=false;draw();msg.textContent='Your turn: X'}function draw(){b.replaceChildren();cells.forEach((v,i)=>{const el=document.createElement('button');el.textContent=v;el.style.cssText='height:90px;font-size:38px';el.onclick=()=>play(i);b.append(el)})}function play(i){if(cells[i]||end)return;cells[i]=turn;const win=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(x=>x.every(j=>cells[j]===turn));if(win){msg.textContent=turn+' wins!';end=true}else if(cells.every(Boolean)){msg.textContent='Draw!';end=true}else{turn=turn==='X'?'O':'X';msg.textContent='Your turn: '+turn}draw()}draw();<\/script></body></html>"}
];
sources.offline={label:'Built-in / Offline',owner:'',file:''};
const originalShowGames=showGames;
showGames=async function(q=''){
 if(gameSource!=='offline')return originalShowGames(q);
 clearNotice();
 const n=$('categoryResults');n.replaceChildren();
 standaloneGames.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())).forEach(g=>{
  n.append(makeResult(g.name,'Works without internet','',null,()=>{
   $('searchGuide')?.classList.add('hidden');view('browser');$('urlInput').value='goop://games/'+g.name.toLowerCase().replaceAll(' ','-');
   currentUrl='';$('browserFrame').classList.remove('hidden');$('searchFallback').classList.add('hidden');
   $('browserFrame').removeAttribute('src');$('browserFrame').srcdoc=g.doc.replace('</head>', '<link rel="stylesheet" href="./ui/feedback.css"><script defer src="./ui/feedback.js"><\/script></head>');
   status(g.name+' · Built into Goop');
  }));
 });
 if(!n.childElementCount)notice('No matching built-in games.');
};

function searchName(url){
 try{const host=new URL(url).hostname;
 if(host.includes('duckduckgo.com'))return 'DuckDuckGo';
 if(host==='search.brave.com')return 'Brave Search';
 if(host.includes('bing.com'))return 'Bing';
 if(host.includes('google.com'))return 'Google';
 return '';
 }catch{return ''}
}
function setSearchGuide(url,proxied){
 const bar=$('searchGuide');if(!bar)return;
 bar.replaceChildren();const name=searchName(url);
 if(!name){bar.classList.add('hidden');return;}
 bar.classList.remove('hidden');
 const message=document.createElement('span');
 message.textContent=proxied?name+' through NoSW · requires nosw.html and a Wisp connection':name+' · loading the real results page. This website may refuse embedding inside a local HTML file.';
 const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open results if blocked';
 const close=document.createElement('button');close.textContent='Hide';close.onclick=()=>bar.classList.add('hidden');
 bar.append(message,link,close);
}
function showSearchProxyRequired(url,reason){
  setSearchGuide(url,false);
  const node=fallbackHeading('In-Goop search needs the proxy',
    'DuckDuckGo and Brave block direct iframe embedding. Goop will not open another browser tab automatically.');
  const message=document.createElement('div');
  message.className='search-panel';
  message.textContent=reason+' To view results inside Goop, upload nosw.html next to index.html and configure a working Wisp server.';
  node.append(message);
  node.append(buttonFor('Proxy settings',()=>{syncSettings();view('settings')}));
  node.append(buttonFor('Try again inside Goop',()=>loadPage(url)));
  status('Proxy required for '+(searchName(url)||'this search engine'));
}
$('openExternal').title='Open a blocked site in your browser (only when you choose)';
if(location.protocol==='file:')status('Standalone HTML: built-in games work offline; external site embedding varies by website.');

renderBookmarks();syncSettings();
if(['localhost','127.0.0.1'].includes(location.hostname)) {
 const note=$('proxyModeNote');if(note)note.textContent='NoSW browsing uses the configured Wisp. Local endpoint: '+(location.protocol==='https:'?'wss://':'ws://')+location.host+'/wisp/';
}
if(location.protocol==='file:')toast('Standalone mode: the NoSW loader should be hosted with Goop on S3 or HTTPS.');
})();
