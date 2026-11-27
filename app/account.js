const playerAccount = (() => {
  let session=null, collection, state=null, previous=new Map(), running=null, message='';
  const listeners=new Set();
  const key=item=>JSON.stringify(item.kind==='favorite'?[item.kind,item.source,item.name]:[item.kind,item.url]);
  const map=items=>new Map(items.map(item=>[key(item),item]));
  const changed=()=>listeners.forEach(fn=>fn());
  const storeKey=()=> 'goop-sync-v1:'+session.uid;
  function persist(){try{localStorage.setItem(storeKey(),JSON.stringify(state));}catch{message='Device storage is unavailable. Keep this page open until syncing finishes.';}}
  function localChange(){
    if(!collection)return;
    const next=map(collection.get());
    if(session && state){
      let dirty=false;
      for(const [id,item] of next){
        if(JSON.stringify(previous.get(id))!==JSON.stringify(item)){stage('put',item);dirty=true;}
      }
      for(const [id,item] of previous){
        if(!next.has(id)){stage('remove',item);dirty=true;}
      }
      if(dirty){persist();void sync();}
    }
    previous=next;
  }
  function stage(op,item){state.pending[key(item)]={op,item,nonce:crypto.randomUUID()};}
  async function sync(){
    if(!session||!state||running||!collection)return;
    const user=session, work=state, task={};running=task;
    const current=()=>session===user && state===work;
    try{
      if(work.seed){
        const existing=map((await user.api('player-items')).items);
        if(!current())return;
        for(const item of work.seed)if(!existing.has(key(item)) && !work.pending[key(item)])stage('put',item);
        delete work.seed;persist();
      }
      while(current()){
        const batch=Object.entries(work.pending).slice(0,6);
        if(!batch.length)break;
        await user.api('player-items',{changes:batch.map(([,v])=>({op:v.op,item:v.item}))});
        if(!current())return;
        for(const [id,v] of batch)if(work.pending[id]?.nonce===v.nonce)delete work.pending[id];
        persist();
      }
      if(!current())return;
      const remote=await user.api('player-items');
      if(!current())return;
      const items=map(remote.items);
      for(const [id,v] of Object.entries(work.pending)){if(v.op==='remove')items.delete(id);else items.set(id,v.item);}
      collection.apply([...items.values()]);previous=map(collection.get());message='Bookmarks and favorite games are synced.';
    }catch(error){if(current())message='Sync paused. '+error.message;}
    finally{
      if(running===task)running=null;
      changed();
      if(current() && !message.startsWith('Sync paused') && Object.keys(work.pending).length)queueMicrotask(sync);
      else if(!current() && session && state && !running)queueMicrotask(sync);
    }
  }
  function login(uid,api){
    if(session?.uid===uid)return;
    const identity={uid,api(...args){if(session!==identity)throw Error('Sign in again to continue.');return api(...args);}};
    session=identity;state=null;running=null;message='';
    try{const value=JSON.parse(localStorage.getItem(storeKey()));if(value?.pending && typeof value.pending==='object')state=value;}catch{}
    if(collection)previous=map(collection.get());
    changed();void sync();
  }
  function logout(){session=null;state=null;running=null;message='';changed();}
  function toggle(){
    if(!session)return;
    if(state){
      state=null;message='Sync is off on this device.';
      try{localStorage.removeItem(storeKey());}catch{message='Sync is off for this visit. Device storage is unavailable.';}
    }
    else {state={pending:{},seed:collection.get()};persist();message='Syncing…';void sync();}
    changed();
  }
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});
  setInterval(()=>{if(!document.hidden)void sync()},45000);
  return {login,logout,localChange,toggle, sync, listen(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    bind(value){collection=value;previous=map(value.get());}, get account(){return session;},get enabled(){return !!state;},
    get status(){return message||(session?(state?'Syncing…':'Sync is off on this device.'):'Sign in to Chat to sync bookmarks and favorite games.');}};
})();
