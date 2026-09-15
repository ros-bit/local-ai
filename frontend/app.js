const state = {
  conversationId: null,
  busy: false,
  controller: null,
  conversations: [],
  settings: null
};
const $ = id => document.getElementById(id),
  messages = $('messages'),
  prompt = $('prompt');
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));

function math(value) {
  let out = value.replace(/\\(alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|phi|omega|infty|cdot|times|pm|leq?|geq?|neq|approx|to|rightarrow|leftarrow|partial|sum|int|in|notin)\b/g, (_, n) => ({
    alpha: 'α',
    beta: 'β',
    gamma: 'γ',
    delta: 'δ',
    theta: 'θ',
    lambda: 'λ',
    mu: 'μ',
    pi: 'π',
    sigma: 'σ',
    phi: 'φ',
    omega: 'ω',
    infty: '∞',
    cdot: '·',
    times: '×',
    pm: '±',
    le: '≤',
    leq: '≤',
    ge: '≥',
    geq: '≥',
    neq: '≠',
    approx: '≈',
    to: '→',
    rightarrow: '→',
    leftarrow: '←',
    partial: '∂',
    sum: '∑',
    int: '∫',
    in: '∈',
    notin: '∉'
  } [n]));
  out = out.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="fraction"><span>$1</span><span>$2</span></span>').replace(/\\sqrt\{([^{}]+)\}/g, '√<span class="radicand">$1</span>').replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>').replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
  return out;
}

function safeLink(url, label) {
  return /^(https?:|mailto:)/i.test(url) ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
}

function highlight(code, lang) {
  let escaped = escapeHtml(code);
  if (!lang) return escaped;
  return escaped.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*`)/g, '<span class="tok-string">$1</span>').replace(/\b(const|let|var|def|return|function|class|if|else|for|while|import|from|SELECT|FROM|WHERE|fn|pub|package|func)\b/g, '<span class="tok-keyword">$1</span>');
}

function renderMarkdown(source) {
  let lines = source.replace(/\r/g, '').split('\n'),
    html = '',
    code = '',
    lang = '',
    inCode = false,
    list = null,
    table = false;
  const close = () => {
    if (list) {
      html += `</${list}>`;
      list = null
    }
    if (table) {
      html += '</tbody></table>';
      table = false
    }
  };
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('```')) {
      if (inCode) {
        html += `<div class="code-wrap"><div class="code-head"><span>${escapeHtml(lang||'code')}</span><button class="copy-code" data-code="${encodeURIComponent(code)}">Copy</button></div><pre><code>${highlight(code,lang)}</code></pre></div>`;
        inCode = false;
        code = '';
      } else {
        close();
        inCode = true;
        lang = line.slice(3).trim()
      }
      continue
    }
    if (inCode) {
      code += line + '\n';
      continue
    }
    if (!line.trim()) {
      close();
      continue
    }
    if (/^---+$/.test(line.trim())) {
      close();
      html += '<hr>';
      continue
    }
    let heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      close();
      html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
      continue
    }
    if (line.startsWith('> ')) {
      close();
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s-:|]+\|?\s*$/.test(lines[i + 1])) {
      close();
      let cells = line.split('|').filter(Boolean);
      html += '<table><thead><tr>' + cells.map(c => `<th>${inline(c.trim())}</th>`).join('') + '</tr></thead><tbody>';
      table = true;
      i++;
      continue
    }
    if (table && line.includes('|')) {
      let cells = line.split('|').filter(Boolean);
      html += '<tr>' + cells.map(c => `<td>${inline(c.trim())}</td>`).join('') + '</tr>';
      continue
    }
    let bullet = line.match(/^\s*[-*]\s+(.*)$/),
      number = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || number) {
      let kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        close();
        list = kind;
        html += `<${kind}>`
      }
      html += `<li>${inline((bullet||number)[1])}</li>`;
      continue
    }
    close();
    html += `<p>${inline(line)}</p>`;
  }
  if (inCode) html += `<pre><code>${highlight(code,lang)}</code></pre>`;
  close();
  return html;
}

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => safeLink(url, label)).replace(/\$\$([\s\S]+?)\$\$/g, (_, v) => `<span class="math display">${math(v)}</span>`).replace(/\\\(([\s\S]+?)\\\)/g, (_, v) => `<span class="math">${math(v)}</span>`).replace(/\$([^$]+)\$/g, (_, v) => `<span class="math">${math(v)}</span>`);
  return out.replace(/\$\$([\s\S]+)$/g, (_, v) => `<span class="math display">${math(v)}</span>`);
}

function addMessage(role, text = '', index = -1) {
  $('welcome')?.remove();
  let el = document.createElement('article');
  el.className = `message ${role}`;
  el.dataset.index = index;
  el.innerHTML = `<div class="avatar">${role==='user'?'Y':'✦'}</div><div class="content">${role==='assistant'?renderMarkdown(text):escapeHtml(text).replace(/\n/g,'<br>')}</div><div class="message-actions"><button data-action="copy">Copy</button>${role==='assistant'?'<button data-action="regenerate">Regenerate</button>':'<button data-action="edit">Edit</button>'}</div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function bindActions() {
  messages.onclick = async e => {
    let button = e.target.closest('button[data-action]');
    if (!button) return;
    let el = button.closest('.message'),
      action = button.dataset.action,
      raw = el.querySelector('.content').innerText;
    if (action === 'copy') {
      await navigator.clipboard.writeText(raw);
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = 'Copy', 1200)
    }
    if (action === 'edit') {
      prompt.value = raw;
      prompt.focus()
    }
    if (action === 'regenerate' && state.conversationId) send(raw, true);
    if (e.target.classList.contains('copy-code')) {
      await navigator.clipboard.writeText(decodeURIComponent(e.target.dataset.code));
      e.target.textContent = 'Copied';
      setTimeout(() => e.target.textContent = 'Copy', 1200)
    }
  };
}
async function loadConversations() {
  let r = await fetch('/api/conversations');
  let data = await r.json();
  state.conversations = data.conversations;
  renderConversationList();
}

function renderConversationList() {
  let query = $('search').value.toLowerCase();
  $('conversation-list').innerHTML = state.conversations.filter(c => c.title.toLowerCase().includes(query)).map(c => `<div class="conversation-row"><button class="conversation ${c.id===state.conversationId?'active':''}" data-id="${c.id}">${escapeHtml(c.title)}</button><button class="delete-conversation" data-delete-id="${escapeHtml(c.id)}" title="Delete conversation" aria-label="Delete ${escapeHtml(c.title)}">×</button></div>`).join('');
  document.querySelectorAll('.conversation').forEach(b => b.onclick = () => {
    closeSidebar();
    openConversation(b.dataset.id)
  });
  document.querySelectorAll('.delete-conversation').forEach(b => b.onclick = () => deleteConversation(b.dataset.deleteId));
}
function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  $('menu-button').setAttribute('aria-expanded', 'false');
  $('sidebar-backdrop').classList.add('hidden')
}
function toggleSidebar() {
  let open = document.body.classList.toggle('sidebar-open');
  $('menu-button').setAttribute('aria-expanded', String(open));
  $('sidebar-backdrop').classList.toggle('hidden', !open)
}
async function deleteConversation(id) {
  let conversation = state.conversations.find(item => item.id === id);
  if (!conversation || !confirm(`Delete "${conversation.title}"? This cannot be undone.`)) return;
  let response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw Error('Unable to delete conversation.');
  if (state.conversationId === id) $('new-chat').click();
  await loadConversations();
}
async function openConversation(id) {
  let r = await fetch(`/api/conversations/${encodeURIComponent(id)}`),
    c = await r.json();
  state.conversationId = id;
  $('page-title').textContent = c.title;
  messages.innerHTML = '';
  c.messages.forEach((m, i) => addMessage(m.role, m.content, i));
  renderConversationList();
}
async function send(text, regenerate = false) {
  if (state.busy || !text.trim()) return;
  state.busy = true;
  state.controller = new AbortController();
  $('send').classList.add('hidden');
  $('stop').classList.remove('hidden');
  if (!regenerate) addMessage('user', text);
  let el = addMessage('assistant', '<span class="typing">Generating response…</span>'),
    content = el.querySelector('.content'),
    raw = '';
  prompt.value = '';
  try {
    let r = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: state.conversationId,
        message: text,
        regenerate
      }),
      signal: state.controller.signal
    });
    if (!r.ok) throw Error((await r.json()).error || 'Unable to generate a response.');
    content.innerHTML = '';
    let reader = r.body.getReader(),
      decoder = new TextDecoder(),
      buffer = '';
    while (true) {
      let x = await reader.read();
      if (x.done) break;
      buffer += decoder.decode(x.value, {
        stream: true
      });
      let parts = buffer.split('\n');
      buffer = parts.pop();
      for (let part of parts) {
        if (!part) continue;
        let item = JSON.parse(part);
        if (item.delta) {
          raw += item.delta;
          content.innerHTML = renderMarkdown(raw);
          messages.scrollTop = messages.scrollHeight
        }
        if (item.done) {
          state.conversationId = item.conversation.id;
          $('page-title').textContent = item.conversation.title
        }
      }
    }
    if (!raw) content.innerHTML = '<p>No response was generated.</p>';
    await loadConversations()
  } catch (e) {
    if (e.name === 'AbortError') {
      if (!raw) content.innerHTML = '<p class="error">Generation stopped.</p>';
    } else {
      content.innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
    }
  } finally {
    state.busy = false;
    state.controller = null;
    $('send').classList.remove('hidden');
    $('stop').classList.add('hidden');
    prompt.focus();
  }
}
async function loadSettings() {
  let r = await fetch('/api/settings');
  state.settings = await r.json();
  let f = $('settings-form');
  for (let key of ['model', 'system_prompt', 'temperature', 'max_output_tokens', 'context_length', 'font_size']) f.elements[key].value = state.settings[key];
  f.elements.streaming.checked = state.settings.streaming;
  applyTheme();
}

function applyTheme() {
  let dark = state.settings?.theme === 'dark' || (state.settings?.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', dark);
  document.body.dataset.font = state.settings?.font_size || 'medium';
  $('settings-form').elements.dark.checked = state.settings?.theme === 'dark';
}
bindActions();
$('composer').onsubmit = e => {
  e.preventDefault();
  send(prompt.value)
};
prompt.onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('composer').requestSubmit()
  }
};
prompt.oninput = () => {
  prompt.style.height = 'auto';
  prompt.style.height = Math.min(prompt.scrollHeight, 180) + 'px'
};
$('stop').onclick = () => state.controller?.abort();
$('menu-button').onclick = toggleSidebar;
$('sidebar-backdrop').onclick = closeSidebar;
$('new-chat').onclick = () => {
  closeSidebar();
  state.conversationId = null;
  $('page-title').textContent = 'New conversation';
  prompt.value = '';
  prompt.style.height = 'auto';
  prompt.focus();
  messages.innerHTML = '<div id="welcome" class="welcome"><div class="welcome-icon">L</div><h1>How can I help you?</h1><p>Your private AI assistant, running entirely on this computer.</p><div class="suggestions"><button>Explain a complex topic step by step</button><button>Help me write and debug code</button><button>Work through a math problem</button></div></div>';
  document.querySelectorAll('.suggestions button').forEach(b => b.onclick = () => send(b.textContent));
  renderConversationList()
};
$('clear-chat').onclick = async () => {
  if (state.conversationId) await deleteConversation(state.conversationId)
};
$('search').oninput = renderConversationList;
document.querySelectorAll('.suggestions button').forEach(b => b.onclick = () => send(b.textContent));
$('settings-button').onclick = async () => {
  await loadSettings();
  $('settings-dialog').showModal()
};
$('settings-form').onsubmit = async e => {
  if (e.submitter?.value !== 'save') return;
  e.preventDefault();
  let f = e.target,
    payload = {};
  for (let key of ['model', 'system_prompt', 'temperature', 'max_output_tokens', 'context_length', 'font_size']) payload[key] = ['temperature', 'max_output_tokens', 'context_length'].includes(key) ? Number(f.elements[key].value) : f.elements[key].value;
  payload.streaming = f.elements.streaming.checked;
  payload.theme = f.elements.dark.checked ? 'dark' : 'light';
  let r = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  state.settings = await r.json();
  applyTheme();
  $('settings-dialog').close();
  $('model-label').textContent = `Ollama · ${state.settings.model}`
};
$('reset-settings').onclick = async () => {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemma4:e2b',
      temperature: .2,
      max_output_tokens: 2048,
      context_length: 12000,
      streaming: true,
      theme: 'system',
      font_size: 'medium'
    })
  });
  await loadSettings()
};
(async () => {
  await loadSettings();
  $('model-label').textContent = `Ollama · ${state.settings.model}`;
  let h = await (await fetch('/api/health')).json();
  if (h.error) $('model-label').textContent = h.error;
  await loadConversations()
})();