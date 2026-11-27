export function voiceClient(api, display, ended) {
  let generation=0,stream=null,ticket='',timer,room='',servers=[],cursor=0,joining=false;
  const peers=new Map();
  const $=id=>document.getElementById(id);
  const status=s=>{$('voiceStatus').textContent=s;};
  function controls(){
    $('joinVoice').hidden=!!ticket || joining;
    $('mic').hidden=!ticket;$('leaveVoice').hidden=!ticket && !joining;
    $('mic').textContent=stream?.getAudioTracks()[0]?.enabled?'Mute mic':'Unmute mic';
  }
  function drop(id){
    const p=peers.get(id);if(!p)return;
    peers.delete(id);p.pc.onicecandidate=null;p.pc.ontrack=null;p.pc.close();p.audio.remove();
  }
  function leave(tell=true){
    generation++;clearTimeout(timer);const old=ticket;
    ticket='';room='';joining=false;cursor=0;
    stream?.getTracks().forEach(t=>t.stop());stream=null;
    for(const id of peers.keys())drop(id);
    $('voicePeople').replaceChildren();$('playAudio').hidden=true;controls();
    if(tell && old)void api('voice/leave',{ticket:old}).catch(()=>{});
  }
  function peer(person){
    let p=peers.get(person.ticket);if(p)return p;
    const pc=new RTCPeerConnection({iceServers:servers});
    const audio=document.createElement('audio');audio.autoplay=true;$('audio').append(audio);
    p={pc,audio,candidates:[],out:Promise.resolve(),person};peers.set(person.ticket,p);
    const myTicket=ticket;
    function send(signal){
      p.out=p.out.then(async()=>{
        if(myTicket!==ticket || !peers.has(person.ticket))return;
        await api('voice/signal',{ticket:myTicket,to:person.ticket,signal});
      }).catch(e=>{if(ticket===myTicket && e.status!==410)status(e.message);});
    }
    p.send=send;
    stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream));
    pc.ontrack=e=>{audio.srcObject=e.streams[0] || new MediaStream([e.track]);audio.play().catch(()=>{$('playAudio').hidden=false;});};
    pc.onicecandidate=e=>{if(e.candidate)send({...e.candidate.toJSON(),type:'candidate'});};
    pc.onconnectionstatechange=()=>{
      if(!ticket || !peers.has(person.ticket))return;
      if(pc.connectionState==='failed')status('Audio could not connect. Leave and rejoin. Some networks need a TURN relay.');
      else if(pc.connectionState==='connected')status('Voice connected');
    };
    return p;
  }
  async function poll(gen){
    if(gen!==generation||!ticket)return;
    try{
      const result=await api('voice/poll',{ticket,after:cursor});if(gen!==generation)return;
      if(result.peers.length && peers.size===0)status('Connecting audio…');
      const byTicket=new Map(result.peers.map(p=>[p.ticket,p]));
      for(const id of peers.keys())if(!byTicket.has(id))drop(id);
      for(const person of result.peers){
        if(peers.has(person.ticket))continue;
        const p=peer(person);
        if(ticket<person.ticket){
          const offer=await p.pc.createOffer();if(gen!==generation)return;
          await p.pc.setLocalDescription(offer);p.send({type:'offer',sdp:offer.sdp});
        }
      }
      for(const envelope of result.signals){
        if(gen!==generation)return;
        const p=peers.get(envelope.from),s=envelope.signal;
        if(p && envelope.seq>cursor){
          if(s.type==='candidate'){
            if(p.pc.remoteDescription)await p.pc.addIceCandidate(s);else p.candidates.push(s);
          }else{
            await p.pc.setRemoteDescription(s);
            for(const candidate of p.candidates.splice(0))await p.pc.addIceCandidate(candidate);
            if(s.type==='offer'){
              const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);
              p.send({type:'answer',sdp:answer.sdp});
            }
          }
        }
        cursor=Math.max(cursor,envelope.seq);
      }
      if(!byTicket.size)status('You are in voice. Waiting for someone to join.');
      display(result.peers,ticket);
    }catch(e){
      if(gen!==generation)return;
      if([401,403,410].includes(e.status)){leave(false);ended(e.message);return;}
      status(e.message);
    }
    if(gen===generation)timer=setTimeout(()=>poll(gen),800);
  }
  async function join(id){
    leave();const gen=generation;joining=true;controls();status('Allow microphone access to join.');
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error('Voice needs HTTPS and a browser with microphone support.');
      const mic=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(gen!==generation){mic.getTracks().forEach(t=>t.stop());return;}
      stream=mic;
      const result=await api('voice/join',{room:id});
      if(gen!==generation){void api('voice/leave',{ticket:result.ticket}).catch(()=>{});return;}
      ticket=result.ticket;servers=result.iceServers;room=id;joining=false;controls();status('Joining voice…');void poll(gen);
    }catch(e){
      if(gen!==generation)return;
      leave(false);ended(e.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser to join.':e.message);
    }
  }
  $('mic').onclick=()=>{for(const t of stream?.getAudioTracks()||[])t.enabled=!t.enabled;controls();};
  $('leaveVoice').onclick=()=>{leave();ended('You left voice.');};
  $('playAudio').onclick=async()=>{try{await Promise.all([...peers.values()].map(p=>p.audio.play()));$('playAudio').hidden=true;}catch{status('Your browser is blocking audio playback.');}};
  window.addEventListener('pagehide',()=>leave());
  return {join,leave,get room(){return room;},get ticket(){return ticket;}};
}
