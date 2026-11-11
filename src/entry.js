import {createGrinderClient} from './ui?asset=grinder.js';
import {mountGrinderUI} from './ui?asset=grinder-panel.js';
import {resolveProfileIdentity} from './ui?asset=profile-identity.js';

const query = new URLSearchParams(location.search);
const embedded = query.get('embed') === '1' && parent !== window;
document.documentElement.lang = query.get('lang')?.startsWith('en') ? 'en' : 'zh';
document.documentElement.dataset.theme = query.get('theme') === 'light' ? 'light' : 'dark';
const apiRoot = location.origin + '/api/v1';
let workflow = null, profiles = [], panel = null, observer = null;
let timer = null, refreshTask = null, closed = false, leaving = false, mounted = false;

async function get(path) {
  if (closed) throw new Error('控制面板已关闭');
  const response = await fetch(apiRoot + path, {cache: 'no-store', signal: AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('读取失败，请重试（' + response.status + '）');
  return response.json();
}
function currentProfileId() {
  const binding = workflow?.context?.extras?.thisCupProfileBinding;
  return resolveProfileIdentity(workflow?.profile, profiles, binding);
}
async function refreshWorkflow() {
  if (refreshTask) return refreshTask;
  refreshTask = get('/workflow').then(value => { workflow = value; }).catch(error => {
    workflow = null;
    throw error;
  }).finally(() => { refreshTask = null; });
  return refreshTask;
}
async function refreshProfiles() {
  const data = await get('/profiles?visibility=visible');
  profiles = Array.isArray(data) ? data : data.items || [];
  await refreshWorkflow();
}
const grinder = createGrinderClient({baseUrl: location.origin});
let actionEpoch = 0;
const originalStop = grinder.stop;
grinder.stop = (...args) => { ++actionEpoch; return originalStop(...args); };
// Check the current workflow at the action boundary as well as while the page
// is open. The driver's expectedWorkflow independently protects device writes.
for (const method of ['apply', 'start', 'saveRecipe']) {
  const original = grinder[method];
  grinder[method] = async (...args) => {
    const epoch = actionEpoch;
    const deviceId = grinder.cachedState?.deviceId;
    const fence = JSON.stringify(grinder.cachedState?.commandFence);
    await refreshWorkflow();
    if (epoch !== actionEpoch || deviceId !== grinder.cachedState?.deviceId
      || fence !== JSON.stringify(grinder.cachedState?.commandFence)) throw new Error('操作已取消，请核对设备后重试');
    if (closed) throw new Error('控制面板已关闭');
    return original(...args);
  };
}
function cleanup() {
  if (closed) return;
  closed = true;
  ++actionEpoch;
  clearInterval(timer);
  observer?.();
  panel?.destroy();
  panel = null;
}
async function returnToSkin() {
  if (closed || leaving) return;
  leaving = true;
  cleanup();
  if (embedded) {
    parent.postMessage({type: 'streamline:close'}, '*');
    return;
  }
  // Only return to the skin served by this tablet, with an explicit safe scheme.
  const status = await get('/webui/server/status').catch(() => null);
  const fallback = new URL(location.origin);
  fallback.port = String(status?.port || 3000);
  fallback.pathname = '/';
  let target;
  try { target = new URL(query.get('returnTo') || fallback.href, fallback); }
  catch { target = fallback; }
  const safe = ['http:', 'https:'].includes(target.protocol)
    && target.hostname === location.hostname && !target.username && !target.password
    && target.port === fallback.port;
  location.replace(safe ? target.href : fallback.href);
}
function notice(text) {
  const message = document.getElementById('notice');
  message.textContent = text;
}
async function boot() {
  try {
    await refreshWorkflow();
    if (closed) return;
    await refreshProfiles().catch(() => {});
    if (closed) return;
    observer = grinder.observe();
    panel = mountGrinderUI(document.getElementById('app'), {
      client: {grinder}, getWorkflow: () => workflow,
      getProfileIdentity: currentProfileId, refreshProfileLibrary: refreshProfiles,
      onNotice: notice, onClose: () => { if (!closed) returnToSkin(); }
    });
    document.getElementById('loading').hidden = true;
    mounted = true;
    resume();
  } catch (error) {
    document.getElementById('loading-text').textContent = error.message;
    document.getElementById('retry').hidden = false;
    if (embedded) parent.postMessage({type: 'streamline:ready'}, '*');
  }
}
document.getElementById('retry').onclick = () => location.reload();
document.getElementById('back').onclick = returnToSkin;
window.addEventListener('pagehide', cleanup);
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
function pause() {
  ++actionEpoch;
  observer?.(); observer = null; clearInterval(timer); timer = null;
  panel?.suspend();
}
function resume() {
  pause();
  if (closed || !mounted || document.hidden) return;
  observer = grinder.observe(); panel?.resume();
  timer = setInterval(() => refreshWorkflow().catch(error => notice(error.message)), 1500);
  refreshWorkflow().catch(error => notice(error.message));
}
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
if (embedded) parent.postMessage({type: 'streamline:ready'}, '*');
boot();
