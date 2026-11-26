import {voiceClient} from './voice.js';

const $=id=>document.getElementById(id);
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const base=window.GOOP_CHAT_URL || (local?location.origin:window.GOOP_BACKEND_URL || location.origin);
let parentPort,visitConnection,canGoHome=false;
let continuation='',visit='',pageGeneration=0;
let token='',user=null,home=null,selection=null,version=0,authMode='signin',nextHome=0,busy=false;
let messageKey='',voiceKey='',navKey='',pending=null,polling=false,sessionVersion=0;
const drafts=new Map();
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn){
  const b=node('button',text);b.type='button';b.addEventListener('click',async()=>{
    try{await fn();}catch(err){feedback(err.message);}
  });return b;
}
function feedback(message){($('tools').open?$('toolStatus'):$('notice')).textContent=message;}
async function api(path,data) {
  const usedToken=token;
  let res;
  try{
    res=await fetch(new URL('/api/chat/'+path,base),{method:data===undefined?'GET':'POST',cache:'no-store',credentials:'omit',
      headers:{...(usedToken?{Authorization:'Bearer '+usedToken}:{}),...(visit?{'X-Goop-Visit':visit}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},
      body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(16000)});
  }catch {throw Error('Cannot reach the Goop chat server. Check your connection and try again.');}
  const result=await res.json().catch(()=>null);
  if(!res.ok || !result){
    if(res.status===401 && usedToken && token===usedToken) signedOut('Your session ended. Sign in again.');
    throw Object.assign(Error(result?.error || (res.status===404?'This gateway needs the Goop accounts update.':'Chat server returned HTTP '+res.status+'.')),{status:res.status});
  }
  return result;
}
function errorText(id,msg){$(id).textContent=msg;}
function mode(next){
  continuation='';authMode=next;
  $('username').maxLength=next==='signin'?256:24;
  $('username').autocomplete='username';
  $('password').required=next!=='signin';
  const signup=next==='signup',reset=next==='recover';
  $('authTitle').textContent=signup?'Create an account':reset?'Reset password':'Welcome back';
  $('authIntro').textContent=signup?'Choose a username and a passphrase.':reset?'Use the recovery key you saved.':'Sign in to Goop Chat.';
  $('emailField').hidden=$('email').disabled=!signup;
  $('keyField').hidden=$('recoveryInput').disabled=!reset;$('recoveryInput').required=reset;
  $('passwordLabel').textContent=reset?'New password':'Password';
  $('password').minLength=signup||reset?15:1;
  $('password').placeholder=signup||reset?'At least 15 characters':'';
  $('password').autocomplete=signup||reset?'new-password':'current-password';
  $('password').value='';$('recoveryInput').value='';$('email').value='';
  $('forgot').hidden=signup||reset;
  $('submitAuth').textContent=signup?'Create account':reset?'Reset password':'Sign in';
  $('switchLead').textContent=signup||reset?'Have an account?':'New to Goop?';
  $('authSwitch').textContent=signup||reset?'Sign in':'Create an account';errorText('authError','');
}
$('authSwitch').onclick=()=>mode(authMode==='signin'?'signup':'signin');
$('forgot').onclick=()=>mode('recover');
$('username').setAttribute('autocapitalize','none');$('username').spellcheck=false;
$('username').addEventListener('input',()=>{
  const mayBeKey=authMode==='signin' && !continuation && $('username').value.length>=24;
  $('username').autocomplete=mayBeKey?'off':'username';
});
$('authForm').onsubmit=async e=>{
  e.preventDefault();if($('submitAuth').disabled)return;
  const action=authMode, gen=pageGeneration;
  const usernameOnly=action==='signin' && !continuation && !$('password').value;
  $('submitAuth').disabled=$('authSwitch').disabled=$('forgot').disabled=true;errorText('authError','');
  try{
    const r=await api(action,{name:$('username').value.trim(),continuation:continuation||undefined,password:$('password').value,email:$('email').value,recovery:$('recoveryInput').value.trim()});
    if(gen!==pageGeneration){if(r.visit)revoke(r.visit);return;}
    if(r.continuation){
      continuation=r.continuation;
      $('username').value='';$('username').maxLength=24;$('username').autocomplete='username';
      $('password').value='';$('password').required=true;
      $('authIntro').textContent='Admin control authorized. Please delete the admin key and enter your main credentials.';
      $('username').focus();return;
    }
    continuation='';
    if(r.visit){
      try{await connectVisit(r.token,r.visit);}
      catch{if(gen===pageGeneration)errorText('authError','Connection lost. Start sign-in again.');return;}
      if(gen!==pageGeneration)return;
    }
    token=r.token;parentPort?.postMessage({type:'session',token});user=r.user;sessionVersion++;$('authForm').reset();$('auth').hidden=true;
    if(r.recovery){$('recoveryKey').textContent=r.recovery;$('recovery').hidden=false;}
    else await enter();
  }catch(err){
    if(gen!==pageGeneration)return;
    if(continuation && err.message==='Sign-in expired. Start again.')mode('signin');
    if(usernameOnly && err.status===400 && err.message==='Invalid input.'){
      errorText('authError','Enter your account password to sign in.');$('password').focus();
    }else errorText('authError',err.message);
  }
  finally{$('submitAuth').disabled=$('authSwitch').disabled=$('forgot').disabled=false;}
};
$('continue').onclick=()=>{if(!$('recovery').hidden)void enter();};
async function connectVisit(session,key){
  const controller=new AbortController();
  visitConnection=controller;
  const timeout=setTimeout(()=>controller.abort(),16000);
  try{
    const response=await fetch(new URL('/api/chat/visit-connection',base),{
      headers:{Authorization:'Bearer '+session,'X-Goop-Visit':key},
      credentials:'omit',cache:'no-store',signal:controller.signal,
    });
    if(!response.ok || !response.body)throw Error('Visit connection failed.');
    const reader=response.body.getReader();
    if((await reader.read()).done || controller.signal.aborted)throw Error('Visit connection ended.');
    visit=key;
    // Read the live stream until the gateway, browser, or network closes it.
    void (async()=>{
      try{while(!(await reader.read()).done){}}
      catch{}
      finally{
        if(visitConnection===controller){
          clearVisit();
          feedback('Admin access ended. Sign in with your code to use it again.');
        }
      }
    })();
  }catch(err){
    controller.abort();revoke(key);throw err;
  }finally{clearTimeout(timeout);}
}
function revoke(key){
  if(!key)return;
  const url=new URL('/api/chat/end-visit',base);
  try{
    if(navigator.sendBeacon?.(url,key))return;
  }catch{}
  void fetch(url,{method:'POST',body:key,credentials:'omit',keepalive:true}).catch(()=>{});
}
function clearVisit(){
  const key=visit;visit='';continuation='';
  const conn=visitConnection;visitConnection=null;conn?.abort();
  if(user)user.admin=false;
  $('adminTools').hidden=true;
  renderChannelAccess();
  if($('tools').open){$('tools').close();$('toolBody').replaceChildren();}
  revoke(key);
}
function signedOut(message=''){
  clearVisit();
  parentPort?.postMessage({type:'session',token:''});voice.leave(false);sessionVersion++;version++;token='';user=null;home=null;selection=null;nextHome=0;
  messageKey=navKey=voiceKey='';pending=null;drafts.clear();$('text').value='';$('messages').replaceChildren();
  $('tools').close();$('toolBody').replaceChildren();$('recoveryKey').textContent='';$('recovery').hidden=$('app').hidden=true;
  $('auth').hidden=false;mode('signin');errorText('authError',message);
}
async function enter(){
  $('recoveryKey').textContent='';$('recovery').hidden=true;$('app').hidden=false;
  await tick(true);
}
function dialog(title){
  $('toolTitle').textContent=title;$('toolBody').replaceChildren();errorText('toolStatus','');
  if(!$('tools').open)$('tools').showModal();return $('toolBody');
}
function field(f,label,tag='input'){
  const wrap=node('label',label);const control=node(tag);
  if(tag==='select')control.setAttribute('aria-label',label);
  wrap.append(control);f.append(wrap);return control;
}
function actionForm(body,caption,make){
  const f=node('form');body.append(f);const submit=make(f);
  const b=node('button',caption,'primary');b.type='submit';f.append(b);
  f.onsubmit=async e=>{
    e.preventDefault();if(b.disabled)return;b.disabled=true;errorText('toolStatus','');
    try{await submit();}catch(err){feedback(err.message);}finally{b.disabled=false;}
  };
}
function roomMenu(el,items,prefix,type){
  el.replaceChildren(...items.map(item=>{
    const b=button(prefix+(item.name||item.label),()=>select({...item,type}));
    if(selection?.id===item.id)b.setAttribute('aria-current','page');return b;
  }));
}
function renderNav(){
  const k=JSON.stringify([home.rooms,home.dms,selection?.id]);if(k===navKey)return;navKey=k;
  roomMenu($('textRooms'),home.rooms.filter(r=>r.kind==='text'),'# ','text');
  roomMenu($('voiceRooms'),home.rooms.filter(r=>r.kind==='voice'),'','voice');
  roomMenu($('inbox'),home.dms,'@ ','dm');
}
function renderChannelAccess(){
  const isText=selection?.type==='text';
  const owner=isText && selection.lockOwner;
  const mine=owner && owner===user?.id;
  $('lockRoom').hidden=!isText || !user?.admin || (!!owner && !mine);
  $('lockRoom').textContent=owner?'Unlock channel':'Lock channel';
  $('lockStatus').hidden=!owner;
  if(owner){
    $('lockStatus').textContent=mine
      ? (user.admin?'Only you can post here.':'Read-only. Sign in with admin access to post here.')
      : 'Read-only. Only @'+selection.lockHandle+' can post here.';
  }
  $('compose').hidden=selection?.type==='voice' || !!owner && !(mine && user?.admin);
}
function select(next){
  if(selection?.id===next.id)return;
  if(selection){drafts.set(selection.id,$('text').value);voice.leave();}
  selection=next;version++;messageKey=voiceKey='';pending=null;$('messages').replaceChildren();
  $('text').value=drafts.get(next.id)||'';
  $('room').textContent=(next.type==='text'?'# ':next.type==='dm'?'@ ':'')+(next.name||next.label);
  const audio=next.type==='voice';$('voicePanel').hidden=!audio;$('messages').hidden=audio;
  renderChannelAccess();
  $('voiceStatus').textContent='Join to talk with your microphone.';$('voicePeople').replaceChildren();
  errorText('notice','');renderNav();if(!audio)void refreshMessages();
}
async function reloadHome(){
  const who=sessionVersion,h=await api('home');if(who!==sessionVersion || !token)return;
  home=h;user=h.user;user.admin=!!visit && !!user.admin;if(!user.admin)visit='';$('self').textContent='@'+user.handle;$('adminTools').hidden=!user.admin;
  if(!selection || (selection.type==='dm'&&!home.dms.some(d=>d.id===selection.id))){
    select({...home.rooms.find(r=>r.id==='general'),type:'text'});
  }else if(selection.type==='text'){
    Object.assign(selection,home.rooms.find(r=>r.id===selection.id));
  }
  renderChannelAccess();renderNav();nextHome=Date.now()+5000;
}
async function refreshMessages(){
  if(!selection || selection.type==='voice')return;
  const room=selection.id,v=version,seq=++readNumber;
  try{
    const {messages}=await api('messages/'+room);
    if(v!==version || seq!==readNumber)return;
    const key=JSON.stringify(messages);if(key===messageKey)return;messageKey=key;
    const log=$('messages'),follow=log.scrollTop+log.clientHeight>=log.scrollHeight-60 || !log.children.length;
    const nodes=messages.map(m=>{
      const row=node('article',undefined,'message');const date=new Date(m.time),time=node('time',date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
      time.dateTime=date.toISOString();row.append(node('strong',m.label));if(m.handle && m.label!==m.handle)row.append(node('small','@'+m.handle));
      for(const role of m.roles||[])row.append(node('span',role,'roleBadge'));
      row.append(time);
      if(m.uid!==user.id){row.append(button('Report',async()=>{await api('report',{room,message:m.id});feedback('Report sent to the channel admins.');}));}
      row.append(node('p',m.text));return row;
    });
    log.replaceChildren(...(nodes.length?nodes:[node('p','No messages yet.','empty')]));if(follow)log.scrollTop=log.scrollHeight;
  }catch(e){if(v===version){if(e.status===404)nextHome=0;$('connection').textContent=e.message;}}
}
let readNumber=0;
window.addEventListener('message',async event=>{
  if(event.source!==window.parent || window.parent===window || event.origin!==location.origin || event.data?.type!=='goop-chat-session' || !event.ports.length)return;
  parentPort=event.ports[0];canGoHome=event.data.canGoHome===true;
  if(token){parentPort.postMessage({type:'session',token});return;}
  if(typeof event.data.token==='string' && /^[a-f0-9]{64}$/.test(event.data.token)){
    token=event.data.token;sessionVersion++;$('auth').hidden=true;await enter();
  }
});
$('chatHome').onclick=event=>{
  if(!canGoHome || !parentPort || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
  event.preventDefault();
  clearVisit();
  parentPort.postMessage({type:'home'});
};
async function tick(force=false){
  if(!token || $('app').hidden || polling || (!force && document.hidden))return;
  const who=sessionVersion;polling=true;
  try{
    if(force || Date.now()>=nextHome || !home)await reloadHome();
    if(who!==sessionVersion)return;
    $('connection').textContent='Connected';await refreshMessages();
  }catch(e){if(who===sessionVersion)$('connection').textContent=e.message;}
  finally{polling=false;}
}
let timer=setInterval(()=>void tick(),2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void tick(true);});
window.addEventListener('pagehide',()=>{
  ++pageGeneration;clearInterval(timer);clearVisit();
  if(!$('auth').hidden){$('authForm').reset();mode('signin');}
});
window.addEventListener('pageshow',event=>{
  if(event.persisted){timer=setInterval(()=>void tick(),2500);void tick(true);}
});
$('compose').onsubmit=async e=>{
  e.preventDefault();const text=$('text').value.trim(),room=selection?.id,v=version;
  if(!room || !text || busy || $('compose').hidden)return;
  if(!pending || pending.room!==room || pending.text!==text)pending={room,text,nonce:crypto.randomUUID()};
  busy=true;$('send').disabled=true;errorText('notice','');
  try{
    await api('messages/'+room,{text,nonce:pending.nonce});
    if(v===version){if($('text').value.trim()===text)$('text').value='';pending=null;await refreshMessages();$('text').focus();}
    else if(drafts.get(room)?.trim()===text)drafts.delete(room);
  }catch(err){if(v===version){feedback(err.message);if(err.status===403)void tick(true);}}
  finally{busy=false;$('send').disabled=false;}
};
$('text').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('compose').requestSubmit();}};
$('newDM').onclick=()=>{
  const wrap=dialog('New direct message');
  actionForm(wrap,'Open conversation',f=>{
    const input=field(f,'Username');input.maxLength=24;input.required=true;
    return async()=>{const dm=await api('dm',{handle:input.value.trim()});await reloadHome();
      const item=home.dms.find(d=>d.id===dm.id);if(!item)throw Error('Conversation unavailable.');
      $('tools').close();select({...item,type:'dm'});};
  });
};
$('createRoom').onclick=()=>{
  const wrap=dialog('Create channel');
  actionForm(wrap,'Create channel',f=>{
    const name=field(f,'Channel name');name.required=true;name.maxLength=32;
    const kind=field(f,'Channel type','select');kind.add(new Option('Text','text'));kind.add(new Option('Voice','voice'));
    const lock=field(f,'Only I can post');lock.type='checkbox';lock.parentElement.className='lockChoice';
    kind.onchange=()=>{lock.parentElement.hidden=kind.value!=='text';};
    return async()=>{const r=await api('rooms',{name:name.value,kind:kind.value,locked:kind.value==='text' && lock.checked});await reloadHome();
      $('tools').close();const item=home.rooms.find(x=>x.id===r.id);select({...item,type:item.kind});};
  });
};
$('lockRoom').onclick=async()=>{
  if(selection?.type!=='text' || !user?.admin)return;
  const control=$('lockRoom');
  control.disabled=true;
  try{
    await api('room-lock',{room:selection.id,locked:!selection.lockOwner});
    await reloadHome();
  }catch(err){feedback(err.message);}
  finally{control.disabled=false;}
};
async function manageRoles(){
  const wrap=dialog('Manage roles');
  const {roles}=await api('roles');
  if(!$('tools').open || $('toolTitle').textContent!=='Manage roles' || !user?.admin)return;
  let roleSelect;
  actionForm(wrap,'Create role',f=>{
    const name=field(f,'New role name');name.required=true;name.maxLength=32;
    return async()=>{
      const role=await api('roles',{name:name.value.trim()});
      roleSelect.add(new Option(role.name,role.id));roleSelect.value=role.id;
      roleSelect.form.hidden=false;name.value='';feedback('Created '+role.name+'.');
    };
  });
  actionForm(wrap,'Save assignment',f=>{
    f.className='assignmentForm';f.hidden=roles.length===0;
    roleSelect=field(f,'Role','select');
    for(const role of roles)roleSelect.add(new Option(role.name,role.id));
    const member=field(f,'Member username');member.required=true;member.maxLength=24;member.autocomplete='off';
    const action=field(f,'Action','select');action.add(new Option('Give role','give'));action.add(new Option('Remove role','remove'));
    return async()=>{
      const assigned=action.value==='give';
      const result=await api('member-role',{handle:member.value.trim(),role:roleSelect.value,assigned});
      feedback('@'+result.handle+(assigned?' now has the role ':' no longer has the role ')+result.role+'.');
      if(result.handle===user?.handle)await reloadHome();
    };
  });
}
$('manageRoles').onclick=()=>manageRoles().catch(err=>feedback(err.message));
$('accountBtn').onclick=()=>{
  const wrap=dialog('Account');
  wrap.append(node('p','Signed in as @'+user.handle,'hint'));
  if(home.myRoles?.length){
    const roles=node('p','Your roles','hint');
    for(const role of home.myRoles)roles.append(node('span',role.name,'roleBadge'));
    wrap.append(roles);
  }
  actionForm(wrap,'Save name',f=>{
    const input=field(f,'Display name');input.value=user.label;input.required=true;input.maxLength=256;
    input.autocomplete='off';
    return async()=>{await api('profile',{name:input.value});await reloadHome();$('tools').close();feedback('Display name updated.');};
  });
  if(selection?.type==='dm')wrap.append(button('Block @'+selection.handle,async()=>{await api('block',{target:selection.peer});$('tools').close();await reloadHome();}));
  for(const b of home.blocks)wrap.append(button('Unblock @'+b.handle,async()=>{await api('unblock',{target:b.id});await reloadHome();$('accountBtn').click();}));
  wrap.append(button('Sign out',async()=>{await api('logout',{});signedOut();}));
};
async function reports(){
  const wrap=dialog('Moderation reports');const data=await api('reports');
  if(!data.reports.length)wrap.append(node('p','No open reports.','hint'));
  for(const r of data.reports){
    const row=node('div',undefined,'report');row.append(node('p',r.detail));
    const commands=[['Dismiss','dismiss']];
    if(r.message!=='voice')commands.push(['Remove message','remove']);
    if(!r.target.startsWith('legacy:'))commands.push(['Mute for 24 hours','mute']);
    for(const [label,decision] of commands)row.append(button(label,async()=>{await api('moderate',{report:r.id,decision});await reports();}));
    wrap.append(row);
  }
}
$('review').onclick=()=>reports().catch(e=>feedback(e.message));
const voice=voiceClient(api,(people,ticket)=>{
  const key=JSON.stringify(people);if(key===voiceKey)return;voiceKey=key;
  $('voicePeople').replaceChildren(...people.map(p=>{
    const row=node('div',undefined,'person');row.append(node('strong',p.label),button('Report',async()=>{
      await api('report',{room:selection.id,message:'voice',target:p.id,ticket});feedback('Voice report sent.');}),
      button('Block',async()=>{await api('block',{target:p.id});await reloadHome();}));return row;
  }));
},msg=>{voiceKey='';$('voiceStatus').textContent=msg;});
$('joinVoice').onclick=()=>{voiceKey='';void voice.join(selection.id);};
