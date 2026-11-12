(function (root) {
  'use strict';
  const KEY = 'castward.chat.v1';
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inline(text, allowed) {
    let result = '', end = 0;
    const pattern = /\[([^\]\n]{1,200})\]\(([^\s)]+)\)/g;
    for (const match of text.matchAll(pattern)) {
      result += esc(text.slice(end, match.index));
      const href = match[2];
      result += allowed.has(href) && /^\/(?!\/)[a-zA-Z0-9/_?=&%#.-]+$/.test(href) ? '<a href="'+esc(href)+'">'+esc(match[1])+'</a>' : esc(match[1]);
      end = match.index + match[0].length;
    }
    return result + esc(text.slice(end));
  }
  function render(text, allowed = new Set()) {
    let output = '', list = '';
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
      const type = match ? (match[1] ? 'ul' : 'ol') : '';
      if (list && type !== list) { output += '</'+list+'>'; list = ''; }
      if (type && !list) { list = type; output += '<'+list+'>'; }
      if (match) output += '<li>'+inline(match[2], allowed)+'</li>';
      else if (line.trim()) output += '<p>'+inline(line, allowed)+'</p>';
    }
    return output + (list ? '</'+list+'>' : '');
  }
  function parseEvent(block) {
    let type = 'message'; const data = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    return {type, data:data.join('\n')};
  }
  // Retain partial UTF-8 and SSE frames across arbitrary network chunk boundaries.
  async function readStream(body, onEvent) {
    const reader = body.getReader(), decoder = new TextDecoder(); let buffer = '';
    function consume() {
      let match;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, match.index).replace(/\r\n/g, '\n');
        buffer = buffer.slice(match.index + match[0].length);
        onEvent(parseEvent(block));
      }
    }
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream:true}); consume();
        if (buffer.length > 65536) throw Error('The answer stream is invalid.');
      }
      buffer += decoder.decode(); consume();
      if (buffer.trim()) onEvent(parseEvent(buffer.replace(/\r\n/g, '\n')));
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  function requestMessages(history, text, page) {
    const messages = [...history.map(({role, content}) => ({role, content})), {role:'user', content:text}];
    while (messages.length > 12 || messages.reduce((n, m) => n + m.content.length, 0) + page.length > 4000) messages.shift();
    while (messages[0]?.role === 'assistant') messages.shift();
    return messages;
  }
  const api = {render, readStream, parseEvent, requestMessages};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  let dialog, history = [], busy = false, controller;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (Array.isArray(saved)) history = saved.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 6000).slice(-12).map(m => ({role:m.role, content:m.content, links:Array.isArray(m.links) ? m.links.filter(x => typeof x === 'string').slice(0, 24) : []}));
  } catch (_) { /* Chat works without browser storage. */ }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-12))); } catch (_) { /* Optional. */ } }
  function build() {
    dialog = document.createElement('dialog'); dialog.id = 'castward-chat'; dialog.setAttribute('aria-labelledby', 'chat-title');
    dialog.innerHTML = '<header class="chat-head"><h2 id="chat-title">Plan with Castward</h2><button type="button" data-chat-clear>Clear</button><button type="button" data-chat-close aria-label="Close trip planner">✕</button></header><div class="chat-messages" role="log" aria-label="Trip conversation" aria-live="polite" aria-relevant="additions"></div><form class="chat-form"><label for="chat-input">Your trip question</label><textarea id="chat-input" rows="2" maxlength="1800" required placeholder="Where would you like to fish?"></textarea><button type="submit">Send</button><p class="chat-status" role="status"></p><p class="chat-privacy">AI trip help. Check local regulations and licences. Messages go to our AI provider. History stays in this tab. Do not include sensitive details.</p></form>';
    document.body.append(dialog);
    const log = dialog.querySelector('.chat-messages'), input = dialog.querySelector('textarea'), status = dialog.querySelector('.chat-status'), submit = dialog.querySelector('[type=submit]'), clear = dialog.querySelector('[data-chat-clear]');
    function message(role, content, links = []) {
      const node = document.createElement('div'); node.className = 'chat-message'; node.dataset.role = role;
      node.innerHTML = '<strong>'+(role === 'user' ? 'You' : 'Castward')+'</strong>'+render(content, new Set(links)); log.append(node); return node;
    }
    function redraw() {
      log.replaceChildren();
      if (history.length) history.forEach(m => message(m.role, m.content, m.links));
      else {
        message('assistant', 'Tell me about your trip. I can help with a place, a season, and a useful kit.');
        const starters = document.createElement('div'); starters.className = 'chat-starters';
        for (const question of ['Where can I plan a first saltwater trip?', 'What should I bring for a Montana river trip?', 'Help me plan a Florida Keys trip.']) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = question;
          button.onclick = () => { input.value = question; input.focus(); }; starters.append(button);
        }
        log.append(starters);
      }
    }
    dialog.querySelector('[data-chat-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => { controller?.abort(); document.querySelector('[data-chat-launch]')?.focus(); });
    clear.onclick = () => { if (!busy) { history = []; save(); redraw(); status.textContent = 'History cleared.'; input.focus(); } };
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const text = input.value.trim(); if (!text || busy) return;
      busy = true; submit.disabled = true; clear.disabled = true; input.disabled = true;
      log.setAttribute('aria-busy', 'true'); status.textContent = 'Prepare your trip answer…';
      log.querySelector('.chat-starters')?.remove();
      const userNode = message('user', text), answer = message('assistant', '');
      log.scrollTop = log.scrollHeight;
      const page = location.pathname.slice(0, 300), messages = requestMessages(history, text, page);
      const links = new Set(); let content = '', done = false;
      controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000);
      try {
        const response = await fetch('/api/chat/', {method:'POST', headers:{'Content-Type':'application/json'}, signal:controller.signal, body:JSON.stringify({messages, page})});
        if (!response.ok) {
          let error; try { error = (await response.json()).error; } catch (_) { /* Use the generic message. */ }
          throw Error(error || 'The trip assistant is unavailable. Please try again.');
        }
        if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw Error('The answer stream is unavailable.');
        await readStream(response.body, event => {
          if (!event.data) return;
          if (event.type === 'links') { const urls = JSON.parse(event.data); if (Array.isArray(urls)) urls.forEach(url => { if (typeof url === 'string') links.add(url); }); return; }
          if (event.type === 'error') throw Error('The answer stopped. Please try again.');
          if (event.data === '[DONE]') { done = true; return; }
          const chunk = JSON.parse(event.data);
          if (chunk.error) throw Error('The answer stopped. Please try again.');
          const delta = chunk.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            content += delta;
            if (content.length > 12000) throw Error('The answer is too long. Please try a shorter question.');
            const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90;
            answer.innerHTML = '<strong>Castward</strong>'+render(content, links);
            if (atBottom) log.scrollTop = log.scrollHeight;
          }
        });
        if (!done || !content.trim()) throw Error('The answer stopped. Please try again.');
        const previous = history;
        history = [...messages.map(m => ({...m, links:previous.find(old => old.role === m.role && old.content === m.content)?.links || []})), {role:'assistant', content, links:[...links]}].slice(-12);
        // Preserve the allowed links on retained assistant messages across requests.
        history = history.map(m => m.role === 'assistant' && !m.links ? {...m, links:[]} : m);
        save(); input.value = ''; status.textContent = 'Answer complete. Check local regulations and licences.';
      } catch (error) {
        userNode.remove(); answer.remove();
        status.textContent = error.name === 'AbortError' ? 'The answer stopped. Your question is ready to send again.' : error.message;
      } finally {
        clearTimeout(timer); controller = undefined; busy = false; submit.disabled = false; clear.disabled = false; input.disabled = false; log.setAttribute('aria-busy', 'false'); if (dialog.open) input.focus();
      }
    });
    redraw();
  }
  api.open = () => { if (!dialog) build(); if (!dialog.open) dialog.showModal(); dialog.querySelector('textarea').focus(); };
  root.CastwardChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
