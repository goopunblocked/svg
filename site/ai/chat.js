const models = [
  { name: 'Goop AI', model: 'SmolLM2-360M-Instruct', revision: '7be6f65f1db715fe5dc5a4634c0d459b4eed42ec', bytes: 270590880 },
  { name: 'SmolLM2 Mini', model: 'SmolLM2-135M-Instruct', revision: '09816acd5d99df7be770d85ea30822623dab342c', bytes: 105454432 },
  { name: 'Qwen 2.5', model: 'Qwen2.5-0.5B-Instruct', revision: '41ba88dbac95fed2528c92514c131d73eb5a174b', bytes: 397808192 }
];
const el = id => document.getElementById(id);
const menu = el('model'), status = el('status'), log = el('log'), input = el('message');
for (const model of models) menu.add(new Option(model.name, model.model));
let thread = [], runtime = null, loaded = null, job = null;
const selected = () => models[menu.selectedIndex];
function describe() {
  const model = selected();
  status.textContent = model.name + ' uses ' + model.model + '. First use downloads about ' +
    Math.ceil(model.bytes / 1e6) + ' MB. Messages are processed on this device.';
}
function bubble(role, name, text) {
  const article = document.createElement('article'), author = document.createElement('strong'), body = document.createElement('p');
  article.dataset.role = role;
  author.textContent = name;
  body.textContent = text;
  article.append(author, body);
  log.append(article);
  log.scrollTop = log.scrollHeight;
  return body;
}
function reset() {
  thread = [];
  log.replaceChildren();
  describe();
}
menu.onchange = reset;
el('clear').onclick = reset;
el('stop').onclick = () => { job?.abort(); status.textContent = 'Stopping…'; };
input.onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!job) el('composer').requestSubmit();
  }
};
function controls(busy) {
  menu.disabled = el('clear').disabled = busy;
  el('send').hidden = busy;
  el('stop').hidden = !busy;
}
async function weights(model, signal) {
  const url = 'https://huggingface.co/bartowski/' + model.model + '-GGUF/resolve/' + model.revision + '/' + model.model + '-Q4_K_M.gguf';
  let cache;
  try { cache = await caches.open('goop-models-v1'); } catch {}
  const saved = await cache?.match(url);
  if (saved) {
    const blob = await saved.blob();
    if (blob.size === model.bytes) return blob;
    await cache.delete(url);
  }
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) throw Error('Model download failed (HTTP ' + response.status + ').');
  const parts = [], reader = response.body.getReader();
  let received = 0, previous = -1;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > model.bytes) { await reader.cancel(); throw Error('Unexpected model download size.'); }
    parts.push(value);
    const percent = Math.floor(100 * received / model.bytes);
    if (percent !== previous) status.textContent = 'Downloading ' + model.name + ' · ' + percent + '%';
    previous = percent;
  }
  if (received !== model.bytes) throw Error('The model download was interrupted. Please retry.');
  const blob = new Blob(parts);
  if (cache) { try { await cache.put(url, new Response(blob)); } catch {} }
  return blob;
}
async function load(model, signal) {
  if (runtime && loaded === model) return;
  if (runtime) { await runtime.exit(); runtime = loaded = null; }
  status.textContent = 'Preparing ' + model.name + '…';
  const { Wllama } = await import('./runtime/wllama.js');
  const blob = await weights(model, signal);
  signal.throwIfAborted();
  status.textContent = 'Starting ' + model.name + '…';
  const instance = new Wllama({ 'single-thread/wllama.wasm': new URL('./runtime/wllama.wasm', import.meta.url).href });
  try {
    await instance.loadModel([blob], { n_ctx: 2048, n_batch: 96, n_threads: 1 });
    signal.throwIfAborted();
  } catch (error) { await instance.exit().catch(() => {}); throw error; }
  runtime = instance;
  loaded = model;
}
async function contextFor(model, question) {
  const system = { role: 'system', content: 'You are ' + model.name + ', a helpful assistant inside Goop. Answer the user clearly and honestly.' };
  const messages = [system, ...thread.slice(-16), { role: 'user', content: question }];
  while (true) {
    const prompt = await runtime.formatChat(messages, true);
    if ((await runtime.tokenize(prompt, true)).length <= 1776) return messages;
    if (messages.length <= 2) throw Error('Please shorten your message so it fits this model.');
    messages.splice(1, 2);
  }
}
el('composer').onsubmit = async event => {
  event.preventDefault();
  const question = input.value.trim(), model = selected();
  if (!question || job) return;
  const controller = new AbortController();
  job = controller;
  controls(true);
  const user = bubble('user', 'You', question);
  let answer, completed = '';
  input.value = '';
  try {
    await load(model, controller.signal);
    const messages = await contextFor(model, question);
    controller.signal.throwIfAborted();
    answer = bubble('assistant', model.name, '');
    status.textContent = model.name + ' is answering…';
    completed = await runtime.createChatCompletion(messages, {
      nPredict: 240, sampling: { temp: 0.45 }, abortSignal: controller.signal,
      onNewToken: (_token, _piece, text) => {
        const follow = log.scrollHeight - log.scrollTop - log.clientHeight < 64;
        answer.textContent = text;
        if (follow) log.scrollTop = log.scrollHeight;
      }
    });
    completed = completed.trim();
    if (!completed) throw Error('The model returned an empty reply. Please try again.');
    answer.textContent = completed;
    thread.push({ role: 'user', content: question }, { role: 'assistant', content: completed });
    status.textContent = controller.signal.aborted ? 'Reply stopped.' : 'Ready';
  } catch (error) {
    if (answer?.textContent) {
      thread.push({ role: 'user', content: question }, { role: 'assistant', content: answer.textContent });
    } else {
      user.parentElement.remove();
      answer?.parentElement.remove();
      if (!input.value) input.value = question;
    }
    status.textContent = controller.signal.aborted ? 'Stopped.' : 'Could not finish: ' + (error.message || error);
  } finally { job = null; controls(false); input.focus(); }
};
describe();
