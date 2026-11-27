const tabs = [];
const tabButtons = document.getElementById('webTabButtons');
const pageContent = document.getElementById('goopPage');
const webContent = document.getElementById('webContent');
let selectedTab = null;

function setTitle(tab, title) {
  tab.label.textContent = title;
  tab.close.title = 'Close ' + title;
}

function createTab() {
  const chip = document.createElement('span');
  const label = document.createElement('button');
  const close = document.createElement('button');
  label.type = close.type = 'button';
  close.className = 'tabClose';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close browser tab');
  const tab = { chip, label, close, pane: null, dispose: null, section: 'home', draft: '' };
  setTitle(tab, 'Goop Home');
  label.onclick = () => selectTab(tab);
  close.onclick = () => closeTab(tab);
  chip.append(label, close);
  tabButtons.append(chip);
  tabs.push(tab);
  return tab;
}

function focusTab(tab) {
  if (selectedTab !== tab && selectedTab?.section === 'home') {
    selectedTab.draft = $('homeSearch').value;
  }
  selectedTab = tab;
  document.body.classList.toggle('webFocused', !!tab.pane);
  pageContent.hidden = !!tab.pane;
  webContent.hidden = !tab.pane;
  for (const item of tabs) {
    item.label.setAttribute('aria-pressed', String(item === tab));
    if (item.pane) item.pane.hidden = item !== tab;
  }
  const offset = tab.chip.getBoundingClientRect();
  const visible = tabButtons.getBoundingClientRect();
  if (offset.right > visible.right) tabButtons.scrollLeft += offset.right - visible.right;
  if (offset.left < visible.left) tabButtons.scrollLeft -= visible.left - offset.left;
}

function selectTab(tab) {
  if (tab.pane) focusTab(tab);
  else goopNavigate(tab.section, true, tab);
}

function selectSection(name, requestedTab) {
  const tab = requestedTab || (selectedTab && !selectedTab.pane ? selectedTab :
    tabs.find(item => !item.pane && item.section === name) || tabs.find(item => !item.pane)) || createTab();
  const switching = selectedTab !== tab;
  focusTab(tab);
  if (name === 'home' && switching) {
    hideResults();
    $('homeSearch').value = tab.draft;
  }
  if (tab.section !== name && tab.section === 'home') tab.draft = $('homeSearch').value;
  tab.section = name;
  setTitle(tab, name === 'home' ? 'Goop Home' :
    cats.find(category => category[0] === name)?.[1] || (name.slice(5).replaceAll('-', ' ')));
  return tab;
}

function closeTab(tab) {
  const index = tabs.indexOf(tab);
  if (index < 0) return;
  tabs.splice(index, 1);
  tab.dispose?.();
  tab.disposeApp?.();
  tab.pane?.remove();
  tab.chip.remove();
  if (selectedTab === tab) {
    selectedTab = null;
    const next = tabs[index] || tabs[index - 1] || createTab();
    selectTab(next);
    next.label.focus({preventScroll:true});
  }
}

document.getElementById('newWebTab').onclick = () => {
  goopNavigate('home', true, createTab());
  $('homeSearch').focus({preventScroll:true});
};

function navigate(initialUrl, game=null) {
  if (!game && openCatalogURL(initialUrl)) return;
  const tab = selectedTab?.section === 'home' && !selectedTab.pane ? selectedTab : createTab();
  const pane = document.getElementById('webTemplate').content.firstElementChild.cloneNode(true);
  const label = tab.label;
  focusTab(tab);
  tab.draft = $('homeSearch').value;
  tab.section = null;
  tab.pane = pane;
  webContent.append(pane);
  let closed = false, lastError = '', currentUrl = '', history = [], historyIndex = -1;
  function setup($) {
    /* WEB PANE */
    $('browserHome').href = location.href.split('#')[0];
    $('browserHome').onclick = e => { e.preventDefault(); goopNavigate('home'); };
    if (game) gameTools(pane, game, () => lastError);
    tab.dispose = () => {
      closed = true;
      stopBrowser();
      window.removeEventListener('message', onMessage);
    };
    focusTab(tab);
    navigate(initialUrl);
  }
  setup(id => pane.querySelector('[data-part="' + id + '"]'));
}
