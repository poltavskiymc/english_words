/* Настройки (⚙️ в шапке) и первичная отрисовка приложения.
   Загружается ПОСЛЕДНИМ: использует renderTraffic/traffic из traffic.js,
   refreshAiHint из ai.js, renderSetup из train.js, renderStats/renderAch из stats.js. */

const APP_VERSION = '2026-07-30 · сборка 4';

/* ---- параметры тренировки ---- */
const setNew = document.getElementById('setNew'), setSize = document.getElementById('setSize');
setNew.value = cfg.newPerDay; setSize.value = cfg.sessionSize;

/* Звук применяется сразу, без «Сохранить»: его выключают обычно посреди занятия,
   когда рядом кто-то спит, — и ждать от человека ещё одного тапа тут неуместно. */
const setSoundEl = document.getElementById('setSound'), soundHint = document.getElementById('soundHint');
function refreshSoundHint(){
  soundHint.innerHTML = !canSpeak
    ? '⚠️ Этот браузер не умеет синтез речи — озвучка недоступна.'
    : (soundOn
        ? 'Слово произносится при перевороте карточки, после ответа и по кнопке 🔊.'
        : 'Звук выключен, кнопки 🔊 спрятаны. Вибрация на ответах остаётся.');
}
setSoundEl.checked = soundOn && canSpeak;
setSoundEl.disabled = !canSpeak;
setSoundEl.addEventListener('change',()=>{
  setSound(setSoundEl.checked);
  refreshSoundHint();
  if(soundOn) speak('Sound on');            // сразу слышно, что заработало и каким голосом
});
refreshSoundHint();
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
document.getElementById('wipeBtn').addEventListener('click', async ()=>{
  const learned = words.filter(w=>w.learned).length;
  const ok = await askConfirm({
    title:'Стереть всё?', ok:'Стереть навсегда', danger:true,
    html:
      `<p>Сейчас в словаре <b>${nWords(words.length)}</b>${learned?`, из них выучено ${learned}`:''}. Открыто ачивок: <b>${unlocked.length}</b> из ${ACHIEVEMENTS.length}.</p>`+
      `<p class="muted"><b>Пропадёт:</b> все слова и их уровни, настройки тренировки, вся статистика — график по дням, серия ${streak()} ${plural(streak(),'день','дня','дней')}, ${stats.answers} ответов за всё время — и все открытые ачивки.</p>`+
      `<p class="muted"><b>Останется:</b> ключ DeepSeek и счётчик трафика — это настройки, а не учебные данные.</p>`+
      `<p class="muted">Отменить нельзя. Приложение перезагрузится с пустого места. Если хочешь сохранить слова — закрой это окно и выгрузи TSV кнопкой выше.</p>`
  });
  if(!ok) return;
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
