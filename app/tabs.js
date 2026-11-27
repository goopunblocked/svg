const webTabs=new Set();
let selectedTab=null;
function activateTab(tab) {
  selectedTab=tab;
  document.body.classList.toggle('webFocused',!!tab);
  document.getElementById('goopPage').hidden=!!tab;
  document.getElementById('webContent').hidden=!tab;
  document.getElementById('mainTab').setAttribute('aria-pressed',String(!tab));
  for(const item of webTabs){item.pane.hidden=item!==tab;item.label.setAttribute('aria-pressed',String(item===tab));}
}
document.getElementById('mainTab').onclick=()=>activateTab(null);
document.getElementById('newWebTab').onclick=()=>navigate('');
function navigate(initialUrl,game=null) {
  const pane=document.getElementById('webTemplate').content.firstElementChild.cloneNode(true);
  const controls=document.createElement('span'),label=document.createElement('button'),close=document.createElement('button');
  const tab={pane,label};webTabs.add(tab);label.textContent='New tab';label.onclick=()=>activateTab(tab);
  close.textContent='×';close.setAttribute('aria-label','Close browser tab');controls.append(label,close);
  document.getElementById('webTabButtons').append(controls);document.getElementById('webContent').append(pane);
  const find=id=>pane.querySelector('[data-part="'+id+'"]');
  let closed=false,lastError='',currentUrl='',history=[],historyIndex=-1;
  function setup($){
    /* WEB PANE */
    $('browserHome').href=location.href.split('#')[0];
    $('browserHome').onclick=e=>{e.preventDefault();goopNavigate('home');};
    if(game)gameTools(pane,game,()=>lastError);
    close.onclick=()=>{
      closed=true;stopBrowser();window.removeEventListener('message',onMessage);
      webTabs.delete(tab);pane.remove();controls.remove();
      if(selectedTab===tab)activateTab([...webTabs].at(-1)||null);
    };
    activateTab(tab);
    if(initialUrl)navigate(initialUrl);else address.focus();
  }
  setup(find);
}
