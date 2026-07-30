/* Вкладка «Слова»: список с поиском, добавление по одному, импорт/выгрузка TSV.
   Зависит от util.js, store.js. parseTsv() отсюда использует ещё и ai.js —
   ответ модели проходит ровно тот же разбор, что и файл пользователя.

   Формат обмена один на всё приложение:  слово ⇥ перевод ⇥ пример ⇥ категория */

const WPAGE = 200;              // сколько строк рисуем за раз: со всем словарём разом список тормозит
let wShown = WPAGE, wQuery = '', wCat = '';

/* ---------- разбор и выгрузка TSV ---------- */

/* Возвращает {rows, bad}: bad — строки, из которых не вышло пары «слово + перевод»,
   их показываем пользователю, а не проглатываем молча.
   Табуляция — основной разделитель. Без неё пробуем « — » / « - »: так выглядят
   списки, скопированные из статей и словарей. */
function parseTsv(text, defCat){
  const rows=[], bad=[];
  String(text||'').split(/\r?\n/).forEach(line=>{
    const s=line.trim();
    if(!s) return;
    const p = (s.includes('\t') ? s.split('\t') : s.split(/\s+[—–-]\s+/)).map(x=>x.trim());
    if(p.length<2 || !p[0] || !p[1]){ bad.push(s); return; }
    rows.push({ en:p[0], ru:p[1], ex:p[2]||'', cat:p[3]||defCat||'Своё' });
  });
  return {rows, bad};
}

// общий приёмник для импорта, файла и ИИ. Возвращает {added, upd}
function importRows(rows){
  let added=0, upd=0;
  rows.forEach(r=>{ const v=addWord(r); if(v==='new') added++; else if(v==='upd') upd++; });
  if(added||upd){
    saveWords();
    stats.imported++; saveStats(); checkAchievements();
  }
  return {added, upd};
}

function exportTsv(){
  if(!words.length){ toast('Пока нечего выгружать'); return; }
  const body = words.map(w=>[w.en, w.ru, w.ex||'', w.cat].join('\t')).join('\n');
  const url = URL.createObjectURL(new Blob([body], {type:'text/tab-separated-values;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = `english-words-${dayKey()}.tsv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast(`📤 Выгружено ${nWords(words.length)}`);
}

/* ---------- список ---------- */

function renderCatFilter(){
  const cs = catStats();
  if(wCat && !cs.some(c=>c.cat===wCat)) wCat='';       // категория исчезла вместе со словами
  document.getElementById('wCatFilter').innerHTML =
    `<button class="chip${wCat?'':' on'}" data-c="">Все</button>`+
    cs.map(c=>`<button class="chip${wCat===c.cat?' on':''}" data-c="${esc(c.cat)}">${esc(c.cat)} <b>${c.total}</b></button>`).join('');
  document.querySelectorAll('#wCatFilter button').forEach(b=>b.addEventListener('click',()=>{
    wCat=b.dataset.c; wShown=WPAGE; renderCatFilter(); renderWordList();
  }));
}

// общий список категорий для полей ввода — чтобы не плодить «Работа» и «работа»
function fillCatList(){
  document.getElementById('catList').innerHTML =
    catStats().map(c=>`<option value="${esc(c.cat)}">`).join('');
}

function renderWordList(){
  const box = document.getElementById('wListBox');
  const q = wQuery.trim().toLowerCase();
  const list = words
    .filter(w=>(!wCat || w.cat===wCat) && (!q || w.en.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q)))
    // свежедобавленные сверху — их и хочется проверить. Целый набор ложится одной
    // миллисекундой, поэтому внутри неё сортируем по алфавиту, а не как выйдет
    .sort((a,b)=>(b.added-a.added) || a.en.localeCompare(b.en,'en'));

  if(!list.length){
    box.innerHTML = words.length
      ? '<p class="muted empty">Ничего не нашлось.</p>'
      : '<p class="muted empty">Словарь пуст. Возьми готовый набор в «📚 Наборы», добавь своё слово или импортируй список.</p>';
    return;
  }

  const page = list.slice(0, wShown);
  box.innerHTML =
    `<div class="muted" style="margin-bottom:8px">${nWords(list.length)}${list.length>page.length?` · показано ${page.length}`:''}</div>`+
    /* Уровень ушёл в подпись, а справа — кружок «выучено»: снимать и ставить галочку
       приходится часто, и гонять ради этого модалку правки было лишним шагом. */
    page.map(w=>
      `<div class="wrow${w.learned?' done':''}">`+
        `<div class="wt" data-id="${esc(w.id)}">`+
          `<div class="we">${esc(w.en)}</div>`+
          `<div class="wr">${esc(w.ru)} · ${esc(w.cat)} · ${w.learned?'выучено':'ур. '+w.lvl}</div>`+
        `</div>`+
        `<button class="wsay" data-say="${esc(w.en)}" title="Произнести">🔊</button>`+
        `<button class="wchk${w.learned?' on':''}" data-chk="${esc(w.id)}" title="${w.learned?'Вернуть в изучение':'Пометить выученным'}">✓</button>`+
      `</div>`).join('')+
    (list.length>page.length ? `<button class="btn ghost" id="moreBtn" style="width:100%;margin-top:12px">Показать ещё</button>` : '');

  box.querySelectorAll('.wt').forEach(el=>el.addEventListener('click',()=>openEdit(el.dataset.id)));
  box.querySelectorAll('.wsay').forEach(el=>el.addEventListener('click',()=>speak(el.dataset.say)));
  box.querySelectorAll('.wchk').forEach(el=>el.addEventListener('click',()=>{
    const w = findWord(el.dataset.chk); if(!w) return;
    setLearned(w.id, !w.learned);                      // → wordschange → список перерисуется сам
    buzz(12);
    toast(w.learned ? `✓ «${esc(w.en)}» — выучено` : `↩︎ «${esc(w.en)}» вернулось в изучение`);
  }));
  const more = document.getElementById('moreBtn');
  if(more) more.addEventListener('click',()=>{ wShown+=WPAGE; renderWordList(); });
}

document.getElementById('wSearch').addEventListener('input', e=>{
  wQuery = e.target.value; wShown = WPAGE; renderWordList();
});

/* ---------- добавление одного слова ---------- */

document.getElementById('addBtn').addEventListener('click',()=>{
  const en=document.getElementById('aEn'), ru=document.getElementById('aRu'),
        ex=document.getElementById('aEx'), cat=document.getElementById('aCat');
  if(!en.value.trim() || !ru.value.trim()){ toast('Нужны и слово, и перевод'); return; }
  const r = addWord({en:en.value, ru:ru.value, ex:ex.value, cat:cat.value});
  saveWords();
  toast(r==='upd' ? `✏️ «${esc(en.value.trim())}» обновлено` : `✅ «${esc(en.value.trim())}» добавлено`);
  en.value=''; ru.value=''; ex.value='';               // категорию оставляем: слова обычно добавляют пачкой
  en.focus();
});

/* ---------- импорт ---------- */

function runImport(text, srcName){
  const {rows, bad} = parseTsv(text, document.getElementById('aCat').value);
  const hint = document.getElementById('impHint');
  if(!rows.length){
    hint.innerHTML = '⚠️ Не разобрал ни одной строки. Проверь, что слово и перевод разделены табуляцией.';
    return;
  }
  const {added, upd} = importRows(rows);
  hint.innerHTML = `✅ ${srcName}: добавлено <b>${added}</b>, обновлено <b>${upd}</b>`+
    (bad.length ? `, пропущено ${bad.length} ${plural(bad.length,'строка','строки','строк')}:<br><span style="opacity:.8">${esc(bad.slice(0,3).join(' / '))}${bad.length>3?' …':''}</span>` : '');
  toast(`📥 Добавлено ${nWords(added)}`);
}

document.getElementById('impBtn').addEventListener('click',()=>{
  const t=document.getElementById('impText');
  if(!t.value.trim()){ toast('Вставь список в поле'); return; }
  runImport(t.value, 'Из поля');
  t.value='';
});

document.getElementById('impFile').addEventListener('change', async e=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  try{ runImport(await f.text(), esc(f.name)); }
  catch(err){ document.getElementById('impHint').textContent = '⚠️ Не смог прочитать файл: '+err.message; }
  e.target.value='';                                   // чтобы тот же файл можно было выбрать снова
});

document.getElementById('expBtn').addEventListener('click', exportTsv);

/* ---------- модалка правки ---------- */

const editModal = document.getElementById('editModal');
let editId = null;

function openEdit(id){
  const w = findWord(id); if(!w) return;
  editId = id;
  document.getElementById('eEn').value = w.en;
  document.getElementById('eRu').value = w.ru;
  document.getElementById('eEx').value = w.ex||'';
  document.getElementById('eCat').value = w.cat;
  document.getElementById('eLearned').checked = !!w.learned;
  document.getElementById('eMeta').innerHTML =
    `Уровень ${w.lvl}/${MAXLVL} · верно ${w.right}, ошибок ${w.wrong}<br>`+
    `Добавлено ${fmtTs(w.added)} · следующий показ ${w.learned?'—':fmtTs(w.due)}`;
  editModal.hidden = false;
}
function closeEdit(){ editModal.hidden = true; editId = null; }

document.getElementById('editClose').addEventListener('click', closeEdit);
editModal.addEventListener('click', e=>{ if(e.target===editModal) closeEdit(); });

document.getElementById('eSave').addEventListener('click',()=>{
  const w = findWord(editId); if(!w) return closeEdit();
  const learned = document.getElementById('eLearned').checked;
  // «выучено» меняем отдельно: у setLearned своя логика уровня и даты следующего показа
  if(learned !== !!w.learned) setLearned(editId, learned);
  const ok = editWord(editId, {
    en: document.getElementById('eEn').value,
    ru: document.getElementById('eRu').value,
    ex: document.getElementById('eEx').value,
    cat:document.getElementById('eCat').value
  });
  if(!ok){ toast('⚠️ Пустое поле или такое слово уже есть'); return; }
  closeEdit(); toast('Сохранено ✅');
});

document.getElementById('eDel').addEventListener('click',()=>{
  const w = findWord(editId); if(!w) return closeEdit();
  if(!confirm(`Удалить «${w.en}»? Прогресс по слову тоже пропадёт.`)) return;
  removeWord(editId); closeEdit(); toast('🗑 Удалено');
});

/* ---------- запуск ---------- */

function refreshWords(){ renderCatFilter(); fillCatList(); renderWordList(); }
document.addEventListener('wordschange', refreshWords);
refreshWords();
