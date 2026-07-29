/* Настройки (⚙️ в шапке) и первичная отрисовка приложения.
   Загружается ПОСЛЕДНИМ: использует renderTraffic/traffic из traffic.js,
   refreshAiHint из ai.js, renderSetup из train.js, renderStats/renderAch из stats.js. */

const APP_VERSION = '2026-07-30 · сборка 1';

/* ---- параметры тренировки ---- */
const setNew = document.getElementById('setNew'), setSize = document.getElementById('setSize');
setNew.value = cfg.newPerDay; setSize.value = cfg.sessionSize;
document.getElementById('saveTrain').addEventListener('click',()=>{
  cfg.newPerDay   = Math.max(1, Math.min(100, +setNew.value  || 10));
  cfg.sessionSize = Math.max(5, Math.min(100, +setSize.value || 20));
  setNew.value = cfg.newPerDay; setSize.value = cfg.sessionSize;
  saveCfg(); renderSetup();
  toast('Сохранено ✅'); show('train');
});

/* ---- ключ DeepSeek ---- */
const apiKeyEl = document.getElementById('apiKey'), modelEl = document.getElementById('model');
apiKeyEl.value = localStorage.getItem('ds_key')||'';
modelEl.value  = localStorage.getItem('ds_model')||'deepseek-chat';
document.getElementById('saveKey').addEventListener('click',()=>{
  localStorage.setItem('ds_key', apiKeyEl.value.trim());
  localStorage.setItem('ds_model', modelEl.value.trim()||'deepseek-chat');
  refreshAiHint();
  toast('Ключ сохранён ✅'); show('words');
});

/* ---- трафик ---- */
document.getElementById('resetTraffic').addEventListener('click',()=>{
  traffic.up=0; traffic.down=0; traffic.since=Date.now();
  saveTraffic(); renderTraffic();
});

/* ---- данные ---- */
document.getElementById('expBtn2').addEventListener('click', exportTsv);
document.getElementById('wipeBtn').addEventListener('click',()=>{
  if(!confirm('Стереть все слова, прогресс и ачивки? Отменить не выйдет — сначала лучше выгрузить TSV.')) return;
  if(!confirm('Точно? Последнее предупреждение.')) return;
  // ключ DeepSeek и счётчик трафика не трогаем: это настройки, а не учебные данные
  [W_KEY, CFG_KEY, S_KEY, A_KEY].forEach(k=>localStorage.removeItem(k));
  location.reload();
});

/* ---- принудительное обновление ----
   Сносим оффлайн-кеш и просим SW проверить новый sw.js. Слова и ключ лежат
   в localStorage и это переживают. */
const updBtn = document.getElementById('updateApp'), updHint = document.getElementById('updHint');
updBtn.addEventListener('click', async ()=>{
  if(!navigator.onLine){ updHint.textContent='⚠️ Нет интернета — обновиться не выйдет, но оффлайн всё работает как прежде.'; return; }
  updBtn.disabled = true; updBtn.textContent = '⏳ обновляю…'; updHint.textContent = '';
  try{
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg) await reg.update();
    }
    if(window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(_){ /* не вышло — всё равно перезагружаемся, хуже не будет */ }
  location.reload();
});
document.getElementById('verLine').textContent = 'версия '+APP_VERSION;

/* ---- первичная отрисовка ---- */
renderTraffic();
checkAchievements();
renderStats();
renderAch();
