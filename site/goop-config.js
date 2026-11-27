// The builds inline this configuration. A local gateway serves its own API.
window.GOOP_BACKEND_URL ||= ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
  ? location.origin : 'https://goop-gateway2.onrender.com';
window.GOOP_BLOX_URL ||= 'https://goop-blox.onrender.com';
