
(() => {
  'use strict';
  function start() {
    const nav = document.getElementById('goopNav');
    const page = document.getElementById('goopPage');
    const homePanel = document.getElementById('homeScreen');
    const navLinks = [...nav.querySelectorAll('[data-goop-section]')];
    const base=new URL(location.href);base.hash='';navLinks.find(a=>a.dataset.goopSection==='home').href=base.href;
    const valid = new Set(navLinks.map(link => link.dataset.goopSection));
    const sheets = [...document.querySelectorAll('style[data-screen]')];
    const templates = new Map([...document.querySelectorAll('template[data-screen]')].map(t => [t.dataset.screen, t]));
    for (const name of templates.keys()) valid.add(name);
    let current = 'home', activeScreen = 'home', homeRoute, activeRoot;
    let manualChanges = 0;
    let chatRoot;
    function route(name) { return valid.has(name) ? name : 'home'; }
    window.goopOpenInvite = game => homeRoute.openGame(game, game.roomUrl);
    function draw(name, requestedTab) {
      const tab = homeRoute.selectSection(name, requestedTab);
      const app = templates.has(name) ? name : 'home';
      if (tab.nativeScreen !== app) tab.disposeApp?.();
      let root = app === 'chat' ? chatRoot : tab.nativeRoot;
      if (activeRoot && activeRoot !== root) activeRoot.hidden = true;
      if (activeScreen === 'home' && app !== 'home') homeRoute.leave();
      homePanel.hidden = app !== 'home';
      for (const sheet of sheets) sheet.media = sheet.dataset.screen === app ? 'all' : 'not all';
      if (app !== 'home' && !root) {
        root = document.createElement('div');
        root.append(templates.get(app).content.cloneNode(true));
        page.append(root);
        const controller = new AbortController();
        if (app === 'chat') chatRoot = root;
        else {
          tab.nativeRoot = root;
          tab.nativeScreen = app;
          tab.disposeApp = () => {
            controller.abort(); root.remove();
            tab.nativeRoot = tab.nativeScreen = tab.disposeApp = null;
          };
        }
        window.goopPrograms[app](root, controller.signal);
        if (app.startsWith('game-')) {
          const game = {source:'offline', name:{'game-2048':'2048','game-snake':'Snake','game-tic-tac-toe':'Tic Tac Toe'}[app]};
          homeRoute.remember(game);
          homeRoute.gameTools(root,game);
        }
      }
      if (root) root.hidden = false;
      activeRoot = root;
      activeScreen = app;
      current = name;
      document.body.dataset.page = name;
      if (app === 'home') {homeRoute.show(name);homeRoute.drawShelf();}
      const item = name.startsWith('game-') ? 'games' : name;
      for (const link of navLinks) {
        if (link.dataset.goopSection === item) link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      }
      window.scrollTo(0, 0);
    }
    const api = window.google?.script;
    function writeRoute(name, replace) {
      const home = name === 'home';
      const state = {view:name};
      try {
        if (api?.history) {
          const params = home ? {} : state;
          if (replace) api.history.replace(state, params, '');
          else api.history.push(state, params, '');
        } else if (window.top === window.self) {
          const url = new URL(location.href);url.hash=home?'':name;
          if (replace) history.replaceState(state, '', url);
          else history.pushState(state, '', url);
        }
      } catch { /* The page still works when the host blocks history changes. */ }
    }
    function go(name, record = true, requestedTab) {
      name = route(name);
      const changed = name !== current;
      if (record) manualChanges++;
      draw(name, requestedTab);
      if (record && (changed || name === 'home')) writeRoute(name, !changed);
    }
    function clicked(event) {
      const link = event.target.closest('[data-goop-section]');
      if (!link || !valid.has(link.dataset.goopSection)) return;
      event.preventDefault();
      go(link.dataset.goopSection);
    }
    nav.addEventListener('click', clicked);
    document.getElementById('categories').addEventListener('click', clicked);
    homeRoute = window.goopPrograms.home(homePanel, go);
    function localLocation() {
      return {hash:location.hash.slice(1), parameter:Object.fromEntries(new URLSearchParams(location.search))};
    }
    function restore(loc) {
      const params = loc?.parameter || {};
      const name = loc?.hash || params.view;
      if (name === 'browser' && params.q) {
        go('home', false);
        homeRoute.search(params.q);
        return;
      }
      go(name, false);
      if (name === 'home') writeRoute('home', true);
    }
    function restoreInitial(loc) {
      const name = loc.parameter?.view;
      if (loc.hash || name) restore(loc);
    }
    go('home', false);
    if (api?.history && api?.url) {
      api.history.setChangeHandler(event => { manualChanges++; restore(event.location); });
      const generation = manualChanges;
      api.url.getLocation(loc => {
        if (generation === manualChanges) restoreInitial(loc);
      });
    } else {
      restoreInitial(localLocation());
      window.addEventListener('popstate', () => restore(localLocation()));
      window.addEventListener('hashchange', () => {
        const loc = localLocation();
        if (loc.hash === 'home' || route(loc.hash || loc.parameter.view) !== current) restore(loc);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();

