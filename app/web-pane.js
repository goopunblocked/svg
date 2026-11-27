const address = $('urlInput');
const primaryOrigin = 'https://mathscholar.s3.us-east-1.amazonaws.com';
const isolatedOrigin = 'https://mathscholar.s3.dualstack.us-east-1.amazonaws.com';
const browserOrigin = location.origin === isolatedOrigin ? 'https://mathscholar.s3.amazonaws.com' : isolatedOrigin;
const hostedCopy = new URL('/Goop.svg', browserOrigin);
if (/\.svg$/i.test(location.pathname) && [primaryOrigin,isolatedOrigin,'https://mathscholar.s3.amazonaws.com'].includes(location.origin)) hostedCopy.pathname = location.pathname;
hostedCopy.searchParams.set('goop-runtime','transports-1');
hostedCopy.hash = 'web-runtime-v1';
let browserFrame = null, connected = false, loaderTimer = 0, pageTimer = 0, legacy = false;
let navigationNumber = 0, awaitingFirstPage = false;
const webNotice = message => { $('status').textContent = message; };
function controls() {
  $('backBtn').disabled = historyIndex <= 0;
  $('forwardBtn').disabled = historyIndex + 1 >= history.length;
}
function syncAddress(url) { currentUrl = url; address.value = url; label.textContent = game?.name || new URL(url).hostname; }
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
  if ((!browserFrame && !legacy) || connected || closed) return;
  clearTimeout(loaderTimer);
  if(!settings.wisp.startsWith('wss:')){
    stopBrowser();
    webNotice('The HTTPS browsing helper did not start. Check its S3 upload or select another connection.');
    openConnection();
    return;
  }
  legacy = true;
  const target = new URL('/nosw.html',browserOrigin);
  const encode = value => btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  target.searchParams.set('go',encode(currentUrl));
  target.searchParams.set('w1',encode(wispAddress(settings.wisp,'epoxy')));
  appendFrame(target);
  webNotice('Epoxy via '+new URL(settings.wisp).host+' · If the page shows a connection error, open Connection to retry.');
}
function sendAddress() {
  clearTimeout(pageTimer);
  awaitingFirstPage = true;
  browserFrame.contentWindow.postMessage({kind:'goop-browse',url:currentUrl,serial:navigationNumber,
    transport:settings.transport, wisp:wispAddress(settings.wisp,settings.transport)},browserOrigin);
  pageTimer = setTimeout(()=>webNotice('Still waiting for the browser connection. You can reload or change the Wisp server in Settings.'),35000);
}
function loadPage(url) {
  lastError=''; syncAddress(url); controls(); navigationNumber++;
  if(!settings.preferProxy){stopBrowser();webNotice('Web browsing is turned off. Enable “Use NoSW for browser navigation” in Settings to continue.');return;}
  try {wispAddress(settings.wisp,settings.transport);} catch(error){stopBrowser();webNotice(error.message);return;}
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
  loaderTimer = setTimeout(loadLegacy,14000);
}
function navigate(url) {
  const dest = safeUrl(url);
  if (!dest) { toast('Enter a valid web address'); return; }
  if (history[historyIndex] !== dest) { history.splice(historyIndex+1); history.push(dest); historyIndex = history.length-1; }
  loadPage(dest);
}
const onMessage = event=>{
  if (!browserFrame || closed || legacy || event.source !== browserFrame.contentWindow || event.origin !== browserOrigin) return;
  const m = event.data;
  if (!m || typeof m !== 'object') return;
  if (m.kind === 'goop-browser-ready') {
    clearTimeout(loaderTimer);
    if(!m.transports && (settings.transport==='libcurl' || !settings.wisp.startsWith('wss:'))){
      loadLegacy();return;
    }
    connected = true; sendAddress(); return;
  }
  if (m.serial !== navigationNumber) return;
  if (m.kind === 'goop-web-notice') { clearTimeout(pageTimer); webNotice(String(m.text||'').slice(0,200)); return; }
  if (m.kind === 'goop-web-error') {
    clearTimeout(pageTimer);
    lastError=String(m.text||'Could not load the page.').slice(0,350); webNotice('Could not load this page. '+String(m.text||'Check the Wisp server and retry.').slice(0,200));
    if (m.reason === 'wisp') openConnection();
    return;
  }
  if (m.kind === 'goop-web-page') {
    const url=safeUrl(m.url); if(!url)return;
    clearTimeout(pageTimer);
    if (awaitingFirstPage) { history[historyIndex]=url; awaitingFirstPage=false; }
    else if(history[historyIndex]!==url){history.splice(historyIndex+1);history.push(url);historyIndex=history.length-1;}
    syncAddress(url); controls(); webNotice(new URL(url).hostname+' · '+(settings.transport==='libcurl'?'Libcurl':'Epoxy'));
  }
};
window.addEventListener('message',onMessage);
$('browserSearchForm').addEventListener('submit',e=>{e.preventDefault();const u=resolveSearch(address.value);if(u)navigate(u);});
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
