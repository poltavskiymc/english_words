/* Под-вкладка «Слова → ✨ ИИ»: набор слов по теме через DeepSeek.
   Зависит от data.js (AI_SYSTEM), util.js, traffic.js, words.js (parseTsv/importRows), nav.js (show).

   Ключ пользователя лежит в localStorage под тем же ключом ds_key, что и в грузинской
   аппке, и уходит только на api.deepseek.com — своего бэкенда у приложения нет.

   Ответ модели НЕ добавляется молча: сначала показываем разобранные строки,
   добавляет их пользователь кнопкой. Модель врёт с переводами достаточно часто,
   чтобы это стоило одного лишнего тапа. */

const AI_TOPICS = ['приём у врача','собеседование в IT','аренда квартиры','спортзал','кофейня','аэропорт','деловая переписка','эмоции','погода','покупки в супермаркете'];

let aiRows = [];        // последний разобранный ответ, ждёт кнопки «Добавить»

function refreshAiHint(){
  document.getElementById('aiKeyHint').innerHTML = localStorage.getItem('ds_key')
    ? '✅ Ключ подключён. Опиши тему — соберу набор из своих слов с примерами.'
    : '⚠️ Нужен ключ DeepSeek: ⚙️ в шапке → «Ключ DeepSeek». Без него остальное приложение работает как обычно.';
}

(function initAiChips(){
  const box = document.getElementById('aiChips');
  box.innerHTML = AI_TOPICS.map(t=>`<button class="chip">${esc(t)}</button>`).join('');
  box.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById('aiTopic').value = b.textContent;
  }));
})();

document.getElementById('aiBtn').addEventListener('click', aiGenerate);

async function aiGenerate(){
  const key = localStorage.getItem('ds_key');
  if(!key){ show('settings'); toast('Сначала вставь ключ DeepSeek'); return; }

  const topic = document.getElementById('aiTopic').value.trim();
  if(!topic){ toast('Напиши тему'); return; }
  const n = Math.max(5, Math.min(60, +document.getElementById('aiCount').value || 20));

  const btn = document.getElementById('aiBtn'), out = document.getElementById('aiOut');
  btn.disabled = true; btn.textContent = '⏳ собираю…';
  out.innerHTML = '<p class="muted">Модель пишет набор — это 10–30 секунд.</p>';

  /* Уже известные слова отдаём модели, чтобы она не присылала то, что и так в словаре.
     Берём последние 150: весь словарь раздувал бы запрос, а свежие темы пересекаются чаще. */
  const known = words.slice(-150).map(w=>w.en).join(', ');
  const prompt = `Тема: ${topic}\nСколько слов: ${n}\nКатегория для всех строк: ${topic}`+
                 (known ? `\nНе предлагай эти слова, они уже выучены: ${known}` : '');

  try{
    const body = JSON.stringify({
      model: localStorage.getItem('ds_model')||'deepseek-chat',
      messages: [{role:'system', content:AI_SYSTEM}, {role:'user', content:prompt}],
      temperature: 0.8
    });
    const res = await fetch('https://api.deepseek.com/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body
    });
    const raw = await res.text();
    addTraffic(byteLen(body), byteLen(raw));
    if(!res.ok) throw new Error('HTTP '+res.status+' — '+raw.slice(0,180));

    const text = JSON.parse(raw).choices?.[0]?.message?.content || '';
    const {rows, bad} = parseTsv(text, topic);
    if(!rows.length){
      out.innerHTML = `<p class="muted">⚠️ Модель ответила не в том формате. Попробуй ещё раз или переформулируй тему.</p>`+
                      `<p class="muted" style="opacity:.7">${esc(text.slice(0,300))}</p>`;
      return;
    }
    stats.aiUsed++; saveStats(); checkAchievements();
    aiRows = rows;
    renderAiPreview(bad.length);
  }catch(err){
    out.innerHTML = `<p class="muted">⚠️ Ошибка: ${esc(err.message)}<br>Проверь ключ, баланс на DeepSeek и интернет.</p>`;
  }finally{
    btn.disabled = false; btn.textContent = 'Сгенерировать';
  }
}

function renderAiPreview(badCount){
  const fresh = aiRows.filter(r=>!findWord(wordId(r.en))).length;
  document.getElementById('aiOut').innerHTML =
    `<div class="muted" style="margin:12px 0 6px">Готово: ${nWords(aiRows.length)}`+
      (fresh<aiRows.length ? `, из них новых ${fresh}` : '')+
      (badCount ? ` · ${badCount} ${plural(badCount,'строка','строки','строк')} не разобрал` : '')+
    `</div>`+
    aiRows.map(r=>
      `<div class="wrow">`+
        `<div class="wt"><div class="we">${esc(r.en)}</div>`+
        `<div class="wr">${esc(r.ru)}${r.ex?` · <i>${esc(r.ex)}</i>`:''}</div></div>`+
      `</div>`).join('')+
    `<div class="row2"><button class="btn" id="aiAdd" style="flex:1">Добавить в словарь</button>`+
    `<button class="btn ghost" id="aiDrop">Не надо</button></div>`;

  document.getElementById('aiAdd').addEventListener('click',()=>{
    const {added, upd} = importRows(aiRows);
    toast(`✨ Добавлено ${nWords(added)}${upd?`, обновлено ${upd}`:''}`);
    aiRows = [];
    document.getElementById('aiOut').innerHTML = '';
  });
  document.getElementById('aiDrop').addEventListener('click',()=>{
    aiRows = [];
    document.getElementById('aiOut').innerHTML = '';
  });
}

refreshAiHint();
