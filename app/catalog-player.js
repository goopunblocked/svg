// Catalogs store paths relative to a repository; the leading slash in their JSON
// does not mean the root of the CDN hostname.
function repositoryLink(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  let parts;
  if (url.hostname === 'github.com') parts = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(?:refs\/heads\/)?main\/(.+)$/);
  if (url.hostname === 'raw.githubusercontent.com') parts = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?main\/(.+)$/);
  if (['cdn.jsdelivr.net','cdn.gitdelivr.in'].includes(url.hostname)) parts = url.pathname.match(/^\/gh\/([^/]+)\/([^/@]+)(?:@main|\/main)\/(.+)$/);
  if (!parts || !/\.html?$/i.test(parts[3])) return null;
  const [,owner,repo,file] = parts;
  if (owner === 'gmshelf' && ['ugs','seraph','truffled','ckv'].includes(repo)) return {key:repo,owner,repo,file};
  if (['electricxmaxx','learningapi'].includes(owner) && repo === 'mathassignments') return {key:'fourgames',owner,repo,file};
  return null;
}

function gameFile(key, path) {
  let owner = sources[key].owner, repo = sources[key].repo || key;
  if (/^https?:\/\//i.test(path)) {
    const ref = repositoryLink(path);
    if (!ref || ref.key !== key) throw Error('The game URL is outside its catalog.');
    ({owner,repo,file:path} = ref);
  }
  if (path.startsWith('//')) throw Error('Invalid game path.');
  const segments = path.replace(/^\//,'').split('/').map(s => {
    // Only decode real escapes. Names such as "100%" are valid repository paths.
    const name = decodeURIComponent(s.replace(/%(?![0-9a-f]{2})/gi,'%25'));
    if (!name || name === '.' || name === '..' || /[\\/\x00-\x1f\x7f]/.test(name)) throw Error('Invalid game path.');
    return encodeURIComponent(name);
  });
  const file = segments.join('/');
  const root = 'https://cdn.jsdelivr.net/gh/'+owner+'/'+repo+'@main/';
  const custom = key === 'fourgames' ? null : validBase(settings.gameHost);
  const customRoot = custom && custom.replace(/\/?$/,'/');
  const cdn = root + file;
  const raw = 'https://raw.githubusercontent.com/'+owner+'/'+repo+'/main/'+file;
  return {key, file, root, cdn, raw, custom:customRoot && new URL(file, customRoot).href};
}

function catalogEntry(key,game) {
  let path = game.url;
  if (key === 'fourgames' && game.name === 'Age of War 2') path = 'Age of War 2.html';
  if (key === 'fourgames' && game.name === 'Basketball Bros') path = 'Basketball Bros.html';
  return gameFile(key,path);
}

// Recognize a pasted file or GitHub preview for an actual catalog entry.
function openCatalogURL(value) {
  const ref = repositoryLink(value);
  if (!ref) return false;
  void (async () => {
    const file = gameFile(ref.key,value).file;
    const entries = await catalog(ref.key);
    const game = entries.find(entry => {
      try { return catalogEntry(ref.key,entry).file === file; } catch { return false; }
    });
    if (!game) throw Error('This file is not listed in the '+sources[ref.key].label+' game catalog.');
    await openGame({source:ref.key,name:game.name});
  })().catch(error=>toast(error.message));
  return true;
}

// Some games check localStorage before their own fallback try/catch. Supply
// a private in-memory store only when the sandbox denies the native store.
function isolatedGameStorage() {
  for (const key of ['localStorage','sessionStorage']) {
    try { if (window[key]) continue; } catch {}
    const data = new Map();
    const storage = {
      get length() { return data.size; },
      key(i) { return [...data.keys()][Number(i)] ?? null; },
      getItem(k) { return data.get(String(k)) ?? null; },
      setItem(k,v) { data.set(String(k),String(v)); },
      removeItem(k) { data.delete(String(k)); },
      clear() { data.clear(); }
    };
    Object.defineProperty(window,key,{configurable:true,value:storage});
  }
}

async function gameDocument(source,signal,ancestors=[]) {
  let html, base, problem;
  for (const url of [source.custom,source.raw,source.cdn].filter(Boolean)) {
    try {
      const res = await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),credentials:'omit'});
      if (!res.ok) throw Error('HTTP '+res.status);
      const text = await res.text();
      if (text.length > 20_000_000) throw Error('Game exceeds 20 MB.');
      if (!/<(?:!doctype|html|head|body|script|style|div|canvas|iframe)\b/i.test(text) ||
          /<meta[^>]+(?:name|property)=["'](?:octolytics-host|og:site_name)["'][^>]+content=["'](?:github.com|GitHub)["']/i.test(text))
        throw Error('This source did not return a game file.');
      html = text; base = url === source.custom ? url : source.cdn;
      break;
    } catch (error) { if (signal.aborted) throw error; problem = error; }
  }
  if (!html) throw problem || Error('Game file unavailable.');
  const clean = html.replace(/^\s*```(?:html)?\s*\r?\n/i,'').replace(/\r?\n```\s*$/,'')
    .replace(/^\s*<Module>\s*/i,'').replace(/\s*<\/Module>\s*$/i,'');
  const doc = new DOMParser().parseFromString(clean,'text/html');
  const existing = doc.querySelector('base[href]');
  const baseTag = existing || doc.createElement('base');
  const repoRoot = source.custom && base === source.custom ? base.slice(0,-source.file.length) : source.root;
  function resolve(ref, relativeTo) {
    if (ref.startsWith('/') && !ref.startsWith('//') && relativeTo.startsWith(repoRoot)) {
      const path = source.key === 'truffled' ? ref.replace(/^\/games\//,'/truffled/') : ref;
      return new URL(path.slice(1),repoRoot).href;
    }
    return new URL(ref,relativeTo).href;
  }
  if (existing) base = resolve(existing.getAttribute('href'),base);
  baseTag.setAttribute('href',base);
  doc.head.prepend(baseTag);
  for (const node of doc.querySelectorAll('[src],[href],[poster],[data]')) {
    for (const attr of ['src','href','poster','data']) {
      const value = node.getAttribute(attr);
      if (value?.startsWith('/') && !value.startsWith('//')) node.setAttribute(attr,resolve(value,base));
    }
  }
  const shim = doc.createElement('script');
  shim.textContent = '('+isolatedGameStorage.toString()+')();';
  doc.head.insertBefore(shim,baseTag.nextSibling);

  // Some catalog files are launchers with a second HTML file beside them.
  // The CDN serves that child as text too, so render it the same way.
  const chain = [...ancestors,source.file];
  if (chain.length <= 3) {
    for (const child of doc.querySelectorAll('iframe[src]:not([srcdoc])')) {
      const target = new URL(child.getAttribute('src'),base);
      if (!target.href.startsWith(repoRoot) || !/\.html?$/i.test(target.pathname)) continue;
      const childFile = gameFile(source.key,target.href.slice(repoRoot.length).split(/[?#]/)[0]);
      if (chain.includes(childFile.file)) continue;
      const childSource = {...source,file:childFile.file,cdn:source.root+childFile.file,
        raw:source.raw.slice(0,-source.file.length)+childFile.file,
        custom:source.custom && source.custom.slice(0,-source.file.length)+childFile.file};
      child.setAttribute('srcdoc',await gameDocument(childSource,signal,chain));
      child.removeAttribute('src');
    }
  }
  return (doc.doctype ? '<!doctype html>\n' : '') + doc.documentElement.outerHTML;
}

let currentGame = null;
let gameRequest = null;
function gameStatus(text) { $('goopGameStatus').textContent=text; }
function closeCatalogGame() {
  gameRequest?.abort();
  gameRequest = null;
  currentGame = null;
  const frame = $('goopGameFrame');
  frame.onload = null;
  frame.removeAttribute('srcdoc');
  frame.removeAttribute('src');
  $('goopGamePlayer').classList.add('hidden');
  $('categoryResults').classList.remove('hidden');
  $('categoryTools').classList.remove('hidden');
  clearNotice();
}
async function playCatalogGame(key,game) {
  gameRequest?.abort();
  const controller = new AbortController();
  gameRequest = controller;
  currentGame = {key,game};
  const frame = $('goopGameFrame');
  frame.onload = null;
  frame.removeAttribute('srcdoc');
  $('goopGamePlayer').querySelector('.gameActions')?.remove();
  gameTools($('goopGamePlayer'),{source:key,name:game.name},()=>$('goopGameStatus').textContent);
  $('goopGameTitle').textContent=game.name;
  $('goopGameSource').textContent=sources[key].label;
  $('goopGamePlayer').classList.remove('hidden');
  $('categoryResults').classList.add('hidden');
  $('categoryTools').classList.add('hidden');
  gameStatus('Loading '+game.name+'…');
  clearNotice();
  $('goopGamePlayer').scrollIntoView({block:'start'});
  try {
    const markup = await gameDocument(catalogEntry(key,game),controller.signal);
    if (controller.signal.aborted) return;
    frame.setAttribute('title',game.name+' game');
    frame.onload=()=>{if (!controller.signal.aborted) {gameStatus('');frame.focus({preventScroll:true});}};
    frame.srcdoc=markup;
  } catch(error) {
    if (!controller.signal.aborted) gameStatus('Could not load '+game.name+': '+error.message+' Use Restart to try again.');
  }
}
$('goopGameBack').onclick=()=>{closeCatalogGame();void showGames($('categoryTools').querySelector('input')?.value||'');};
$('goopGameReload').onclick=()=>{if(currentGame)void playCatalogGame(currentGame.key,currentGame.game);};
