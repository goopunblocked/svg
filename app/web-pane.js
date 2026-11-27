const address = $('urlInput');
const isolatedOrigin = 'https://mathscholar.s3.dualstack.us-east-1.amazonaws.com';
const browserOrigin = location.origin === isolatedOrigin ? 'https://mathscholar.s3.amazonaws.com' : isolatedOrigin;
const hostedCopy = new URL('/Goop.svg', browserOrigin);
hostedCopy.searchParams.set('goop-runtime','yt-signin-1');
hostedCopy.hash = 'web-runtime-v1';
let browserFrame = null, connected = false, loaderTimer = 0, pageTimer = 0, legacy = false;
let navigationNumber = 0, awaitingFirstPage = false, effectiveTransport = settings.transport;
const webNotice = message => { $('status').textContent = message; };
function controls() {
  $('backBtn').disabled = historyIndex <= 0;
  $('forwardBtn').disabled = historyIndex + 1 >= history.length;
}
const youtubeLogin = $('youtubeLogin');
let lastVideo = '';
function syncAddress(url) {
  currentUrl = url; address.value = url; setTitle(tab, game?.name || new URL(url).hostname);
  const onYouTube = goopYouTube.isYouTube(url);
  lastVideo = onYouTube ? goopYouTube.video(url) : '';
  youtubeLogin.hidden = !onYouTube;
  youtubeLogin.href = goopYouTube.official(lastVideo);
}
function showYouTubeSignIn(video) {
  const link = goopYouTube.official(video || lastVideo);
  if (history[historyIndex] !== link) {
    history.splice(historyIndex+1); history.push(link); historyIndex = history.length-1;
  }
  stopBrowser();
  syncAddress(link); controls(); closeConnection();
  youtubeLogin.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'accountHandoff';
  const heading = document.createElement('h2'); heading.textContent = 'Sign in to YouTube';
  const info = document.createElement('p');
  info.textContent = 'Continue in a new browser tab. Your signed-in YouTube session stays there.';
  const open = document.createElement('a'); open.href = link; open.target = '_blank';
  open.rel = 'noopener noreferrer'; open.textContent = 'Continue on YouTube';
  panel.append(heading,info,open); $('browserStage').replaceChildren(panel);
  webNotice(''); if (!pane.hidden) open.focus({preventScroll:true});
}
function stopBrowser() {
  clearTimeout(loaderTimer); clearTimeout(pageTimer);
  $('browserStage').replaceChildren(); browserFrame = null; connected = false; legacy = false;
  navigationNumber++; awaitingFirstPage = false;
}
function appendFrame(target, onLoad) {
  if (target.origin !== browserOrigin || target.origin === location.origin) {
    throw Error('The browser needs its separate HTTPS origin.');
  }
  const frame = document.createElement('iframe');
  frame.dataset.part = 'browserFrame'; frame.title = 'Goop web browser';
  frame.referrerPolicy = 'no-referrer';
  frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'");
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');
  frame.src = target.href;
  if (onLoad) frame.onload = onLoad;
  browserFrame = frame;
  $('browserStage').replaceChildren(frame);
  return frame;
}
function loadLegacy() {
  if (closed || !currentUrl) return;
  clearTimeout(loaderTimer);
  clearTimeout(pageTimer);
  connected = false;
  effectiveTransport = 'epoxy';
  legacy = true;
  const target = new URL('/nosw.html',browserOrigin);
  const encode = value => btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  target.searchParams.set('goopRequest', String(navigationNumber));
  target.searchParams.set('go',encode(currentUrl));
  target.searchParams.set('w1',encode(wispAddress(settings.wisp,'epoxy')));
  appendFrame(target);
  webNotice('Epoxy via '+new URL(settings.wisp).host+' · If the page shows a connection error, open Connection to retry.');
}
function sendAddress() {
  clearTimeout(pageTimer);
  awaitingFirstPage = true;
  browserFrame.contentWindow.postMessage({kind:'goop-browse',url:currentUrl,serial:navigationNumber,
    transport:effectiveTransport, wisp:wispAddress(settings.wisp,effectiveTransport)},browserOrigin);
  pageTimer = setTimeout(loadLegacy, 35000);
}
function loadPage(url) {
  if (goopYouTube.isSignIn(url,currentUrl)) { showYouTubeSignIn(goopYouTube.video(url) || lastVideo); return; }
  if (!browserFrame) $('browserStage').replaceChildren();
  lastError=''; syncAddress(url); controls(); navigationNumber++;
  if(!settings.preferProxy){stopBrowser();webNotice('Web browsing is turned off. Enable “Use NoSW for browser navigation” in Settings to continue.');return;}
  try {wispAddress(settings.wisp,legacy ? 'epoxy' : settings.transport);} catch(error){stopBrowser();webNotice(error.message);return;}
  webNotice('Loading ' + new URL(url).hostname + '…');
  if (connected) { sendAddress(); return; }
  if (legacy) { loadLegacy(); return; }
  if (browserFrame) return;
  const frame = appendFrame(hostedCopy, () => {
    if (browserFrame === frame && !connected) {
      clearTimeout(loaderTimer);
      loaderTimer = setTimeout(loadLegacy,3500);
    }
  });
  frame.onerror = () => { if (browserFrame === frame && !connected) loadLegacy(); };
  loaderTimer = setTimeout(loadLegacy,14000);
}
function navigate(url) {
  const dest = safeUrl(url);
  if (!dest) { toast('Enter a valid web address'); return; }
  if (goopYouTube.isSignIn(dest,currentUrl)) { showYouTubeSignIn(goopYouTube.video(dest) || lastVideo); return; }
  if (history[historyIndex] !== dest) { history.splice(historyIndex+1); history.push(dest); historyIndex = history.length-1; }
  loadPage(dest);
}
const onMessage = event=>{
  if (!browserFrame || closed || event.source !== browserFrame.contentWindow || event.origin !== browserOrigin) return;
  const m = event.data;
  if (!m || typeof m !== 'object') return;
  if (m.kind === 'goop-youtube-signin' && m.serial === navigationNumber) {
    showYouTubeSignIn(m.video); return;
  }
  if (legacy) return;
  if (m.kind === 'goop-browser-ready') {
    clearTimeout(loaderTimer);
    if (!Array.isArray(m.transports)) { loadLegacy(); return; }
    const available = m.transports;
    if (available.includes(settings.transport)) effectiveTransport = settings.transport;
    else if (available.includes('epoxy')) effectiveTransport = 'epoxy';
    else { loadLegacy(); return; }
    connected = true; sendAddress(); return;
  }
  if (m.serial !== navigationNumber) return;
  if (m.kind === 'goop-web-error' && (m.reason === 'wisp' || m.reason === 'startup' || (!m.reason && awaitingFirstPage))) {
    loadLegacy();
    return;
  }
  if (m.kind === 'goop-web-notice') { webNotice(String(m.text||'').slice(0,200)); return; }
  if (m.kind === 'goop-web-error') {
    clearTimeout(pageTimer);
    lastError=String(m.text||'Could not load the page.').slice(0,350); webNotice('Could not load this page. '+String(m.text||'Check the Wisp server and retry.').slice(0,200));
    return;
  }
  if (m.kind === 'goop-web-page') {
    const url=safeUrl(m.url); if(!url)return;
    if (goopYouTube.isSignIn(url,currentUrl)) { showYouTubeSignIn(lastVideo); return; }
    clearTimeout(pageTimer);
    if (awaitingFirstPage) { history[historyIndex]=url; awaitingFirstPage=false; }
    else if(history[historyIndex]!==url){history.splice(historyIndex+1);history.push(url);historyIndex=history.length-1;}
    syncAddress(url); controls(); webNotice(new URL(url).hostname+' · '+(effectiveTransport==='libcurl'?'Libcurl':'Epoxy'));
  }
};
window.addEventListener('message',onMessage);
$('browserSearchForm').addEventListener('submit',e=>{e.preventDefault();const u=resolveSearch(address.value);if(u && !openCatalogURL(u))navigate(u);});
$('backBtn').onclick=()=>{if(historyIndex>0)loadPage(history[--historyIndex]);};
$('forwardBtn').onclick=()=>{if(historyIndex+1<history.length)loadPage(history[++historyIndex]);};
function retryCurrentPage() {
  if (!currentUrl) return;
  stopBrowser();
  loadPage(currentUrl);
}
$('reloadBtn').onclick=retryCurrentPage;
$('saveBookmark').onclick=()=>{if(currentUrl)editBookmark(currentUrl);};
const relayList=$('browserRelay'), connectionPanel=$('connectionPanel');
function closeConnection() {
  connectionPanel.hidden=true;
  $('browserConnection').setAttribute('aria-expanded','false');
}
function openConnection() {
  const choices=new Map([[settings.wisp,'Current'],[defaults.wisp,'NoSW default'],['wss://wisp.mercurywork.shop/','Mercury Workshop demo']]);
  relayList.replaceChildren();
  for(const [url,label] of choices) {
    const option=document.createElement('option');
    option.value=url;
    option.textContent=label+' — '+url;
    relayList.append(option);
  }
  relayList.value=settings.wisp;
  $('relayFeedback').textContent='';
  connectionPanel.hidden=false;
  $('browserConnection').setAttribute('aria-expanded','true');
}
$('browserConnection').onclick=()=>{if(connectionPanel.hidden)openConnection();else closeConnection();};
relayList.onchange=()=>{$('relayFeedback').textContent='';};
$('retryRelay').onclick=()=>{
  const choice=relayList.value;
  try {wispAddress(choice,settings.transport);} catch(error){$('relayFeedback').textContent=error.message;return;}
  if (choice !== settings.wisp) {
    settings.wisp=choice;
    save();
    syncBrowserSettings();
  }
  closeConnection();
  retryCurrentPage();
};
