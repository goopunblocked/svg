// Decide using navigation URLs only. Account form contents are never needed here.
const goopYouTube = (() => {
  const videoPattern = /^[A-Za-z0-9_-]{11}$/;
  function url(value, base) {
    try {
      const target = new URL(value, base || undefined);
      if (/^https?:$/.test(target.protocol) && !target.username && !target.password && !target.port) return target;
    } catch {}
    return null;
  }
  function isYouTube(value) {
    const host = url(value)?.hostname;
    return host === 'youtu.be' || host === 'youtube.com' || host?.endsWith('.youtube.com') || false;
  }
  function video(value) {
    if (!isYouTube(value)) return '';
    let u = url(value);
    if (/^\/signin\/?$/.test(u.pathname)) {
      const next = url(u.searchParams.get('next'), 'https://www.youtube.com');
      if (next?.origin !== 'https://www.youtube.com' || next.pathname !== '/watch') return '';
      u = next;
    }
    const parts = u.pathname.split('/');
    let id = '';
    if (u.hostname === 'youtu.be') id = parts[1];
    else if (u.pathname === '/watch') id = u.searchParams.get('v');
    else if (['shorts','live','embed'].includes(parts[1])) id = parts[2];
    return videoPattern.test(id || '') ? id : '';
  }
  function isSignIn(value, from) {
    const u = url(value, from);
    if (!u) return false;
    if (u.hostname === 'accounts.youtube.com') return /^\/(?:accounts\/)?(?:ServiceLogin|AccountChooser|signin|login)(?:\/|$)/i.test(u.pathname);
    if (isYouTube(u.href)) return /^\/(?:signin|login)(?:\/|$)/i.test(u.pathname);
    if (u.hostname !== 'accounts.google.com') return false;
    const accountPage = u.pathname === '/' || /^\/(?:v[0-9]+\/)?(?:ServiceLogin|AccountChooser|InteractiveLogin|signin|login|o\/oauth2)(?:\/|$)/i.test(u.pathname);
    if (!accountPage) return false;
    return isYouTube(from) || u.searchParams.get('service') === 'youtube' || isYouTube(u.searchParams.get('continue'));
  }
  function official(id) {
    const link = new URL('https://www.youtube.com/signin');
    if (videoPattern.test(id || '')) link.searchParams.set('next', '/watch?v=' + id);
    return link.href;
  }

  // NoSW renders the visited document in this frame. Its navigation hooks use
  // the virtual page URL because the actual document can be an about:srcdoc.
  function guard(frame, startingURL, handoff) {
    let previous = startingURL(), attached;
    function pageURL() {
      try {
        const w = frame.contentWindow;
        return url(w?.__u22?.location?.href || w?.__u22$url)?.href || '';
      } catch { return ''; }
    }
    function check(value) {
      if (!value) return false;
      if (!isSignIn(value, previous) && !isSignIn(value, pageURL())) return false;
      handoff(video(pageURL()) || video(previous));
      return true;
    }
    function attach() {
      const current = pageURL();
      if (check(current)) return;
      if (current) previous = current;
      let doc;
      try { doc = frame.contentDocument; } catch { return; }
      if (!doc || attached === doc) return;
      attached = doc;
      function intercept(event) {
        let destination;
        if (event.type === 'submit') destination = event.submitter?.getAttribute('formaction') || event.target.getAttribute('action');
        else {
          const link = event.composedPath().find(node => node.matches?.('a[href],area[href]'));
          destination = link?.getAttribute('href');
          if (!destination && link) destination = link.href;
        }
        if (!destination) return;
        const base = pageURL() || previous;
        const target = url(destination, base);
        if (!target || !check(target.href)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      for (const type of ['click','auxclick','submit']) doc.defaultView.addEventListener(type,intercept,true);
    }
    // Script-driven navigation in the rewritten page uses the shell's public loader.
    // Stop sign-in documents here as well, including an unexpected redirect to sign-in.
    const loader = frame.ownerDocument.defaultView.u22Loader;
    if (typeof loader?.loadDocument === 'function') {
      const load = loader.loadDocument.bind(loader);
      const handled = () => ({kind:'none',status:204,finalUrl:'about:blank'});
      loader.loadDocument = async (destination, options) => {
        if (check(destination)) return handled();
        const result = await load(destination, options);
        return check(result?.finalUrl) ? handled() : result;
      };
    }
    frame.addEventListener('load',attach);
    attach();
    return {check, remember(value){ if (value) previous = value; }};
  }
  return {isYouTube,video,isSignIn,official,guard};
})();
