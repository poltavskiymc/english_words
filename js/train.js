/* ВКЛАДКА «ТРЕНИРОВКА»: настройка сессии и три тренажёра поверх одного словаря.
   Зависит от util.js, store.js (buildSession/grade/cfg/frontOf/backOf), stats.js (noteAnswer, tile).

   Сессия — очередь слов от buildSession(). Слово уходит из очереди, когда с ним закончили;
   ошибка в тесте возвращает его в конец очереди ОДИН раз (ses.again) — иначе на трудном
   слове можно застрять навсегда.

   Кто чем считается «ответом»:
     карточки — не проверка, поэтому noteAnswer('cards') и мягкий grade(…, graded=false):
                уровень растёт, но «выучено» карточка сама не ставит (см. store.js).
     тест, пары — настоящий ответ: grade(…, graded=true), и на максимальном уровне
                слово уходит в выученные автоматически.

   Озвучка — только на раскрытии смысла (переворот карточки, ответ, собранная пара)
   и по тапу 🔊. Автоматически при показе не говорим: на iOS без жеста это всё равно
   часто молчит, а на слух подсказывать вопрос — значит обесценивать проверку. */

const trSetupEl = document.getElementById('trainSetup');
const trRunEl   = document.getElementById('trainRun');
const trDoneEl  = document.getElementById('trainDone');
const trBox     = document.getElementById('trBox');
const runBar    = document.getElementById('runBar');
const runCount  = document.getElementById('runCount');

const MODE_HELP = {
  cards:'🃏 <b>Карточки.</b> Слово → тап по карточке → перевод и пример. «Дальше» отодвигает слово по интервалам повторения, «Изян» сразу отправляет его в выученные.',
  pairs:'🔗 <b>Пары.</b> Два столбца по шесть, надо соединить слово с переводом. Быстрый разогрев — хорошо освежает то, что уже видел.',
  quiz:'✅ <b>Тест.</b> Слово и четыре варианта. Верный ответ поднимает уровень, ошибка опускает и возвращает слово в конец сессии.'
};

const PAIR_BATCH = 6;   // пар за раз: больше не влезает в экран телефона

let ses = null;         // активная сессия; null — показываем настройку

/* ---------- настройка ---------- */

function renderSetup(){
  if(ses) return;       // во время сессии экран настройки не трогаем
  document.querySelectorAll('#segMode button').forEach(b=>b.classList.toggle('on', b.dataset.v===cfg.mode));
  document.querySelectorAll('#segDir  button').forEach(b=>b.classList.toggle('on', b.dataset.v===cfg.dir));
  document.getElementById('modeHelp').innerHTML = `<p class="muted">${MODE_HELP[cfg.mode]}</p>`;

  const cs = catStats();
  // категорию могли переименовать или удалить вместе со словами — чистим выбор
  cfg.cats = cfg.cats.filter(c=>cs.some(x=>x.cat===c));
  const box = document.getElementById('catChips');
  box.innerHTML =
    `<button class="chip${cfg.cats.length?'':' on'}" data-c="">Все</button>` +
    cs.map(c=>`<button class="chip${cfg.cats.includes(c.cat)?' on':''}" data-c="${esc(c.cat)}">${esc(c.cat)} <b>${c.due}</b></button>`).join('');
  box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>toggleCat(b.dataset.c)));

  /* Две цифры: сколько слов ждёт по расписанию и сколько вообще можно погонять
     в выбранных категориях. Когда расписание пусто, кнопка не гаснет, а переключается
     на свободную тренировку — иначе занятие упирается в «приходи завтра». */
  const ready = buildSession(cfg.cats, cfg.sessionSize).length;
  const free  = buildSession(cfg.cats, cfg.sessionSize, true).length;
  const total = activeWords().length;
  const hint  = document.getElementById('trHint');
  const btn   = document.getElementById('startBtn');

  if(!words.length){
    hint.innerHTML = 'Словарь пока пуст. Загляни в <b>📚 Наборы</b> или добавь свои слова.';
  }else if(ready){
    hint.innerHTML = `К повторению сейчас: <b>${ready}</b> ${plural(ready,'слово','слова','слов')} · всего в изучении ${total}`;
  }else if(free){
    hint.innerHTML = 'На сегодня всё повторено 🎉 Можно погонять ещё — но уже мимо расписания, интервалы слегка собьются.';
  }else{
    hint.innerHTML = total
      ? 'В выбранных категориях нет невыученных слов. Сними фильтр или добавь новых.'
      : 'Все слова помечены выученными. Сними галочку в списке, если хочешь их повторить.';
  }
  btn.textContent = ready ? 'Начать' : '🔁 Повторить без расписания';
  btn.disabled = !(ready || free);
}

function toggleCat(c){
  if(!c) cfg.cats = [];                                  // «Все» — сброс фильтра
  else if(cfg.cats.includes(c)) cfg.cats = cfg.cats.filter(x=>x!==c);
  else cfg.cats = cfg.cats.concat(c);
  saveCfg(); renderSetup();
}

document.querySelectorAll('#segMode button').forEach(b=>b.addEventListener('click',()=>{ cfg.mode=b.dataset.v; saveCfg(); renderSetup(); }));
document.querySelectorAll('#segDir  button').forEach(b=>b.addEventListener('click',()=>{ cfg.dir =b.dataset.v; saveCfg(); renderSetup(); }));
// ⚠️ обёртка обязательна: addEventListener передал бы в startSession событие,
// а оно истинное — и любая тренировка молча уходила бы в режим «без расписания»
document.getElementById('startBtn').addEventListener('click', ()=>startSession());
document.getElementById('stopBtn').addEventListener('click', ()=>{ if(ses) endSession(); });

/* ---------- жизненный цикл сессии ---------- */

/* force=true — сразу свободная тренировка. Без него сначала пробуем расписание
   и падаем в свободный режим, только если по расписанию пусто. */
function startSession(force){
  let free = !!force;
  let list = free ? [] : buildSession(cfg.cats, cfg.sessionSize);
  if(!list.length){ free = true; list = buildSession(cfg.cats, cfg.sessionSize, true); }
  if(!list.length){ toast('Нечего повторять — добавь слова или сними фильтр категорий'); return; }
  document.getElementById('runFree').hidden = !free;
  ses = {
    mode: cfg.mode, dir: cfg.dir, free,
    queue: list.slice(), total: list.length,
    done: 0, ok: 0, bad: 0,
    again: new Set(),                 // слова, уже один раз вернувшиеся в очередь
    side: 'en-ru', cur: null,
    batch: [], left: [], right: [], matched: new Set(), sel: null, errL: null, errR: null, lock: false
  };
  trSetupEl.hidden = true; trDoneEl.hidden = true; trRunEl.hidden = false;
  updateBar();
  nextStep();
}

/* Следующий шаг. Зовётся на старте, после карточки, после ответа в тесте и после
   полностью собранной партии пар — то есть всегда в момент, когда предыдущий шаг закрыт. */
function nextStep(){
  if(!ses) return;                    // сессию могли прервать, пока тикал setTimeout
  if(!ses.queue.length) return endSession();
  if(ses.mode==='cards')      nextCard();
  else if(ses.mode==='quiz')  nextQuiz();
  else                        nextPairs();
}

// направление конкретного показа; для 'mix' решается на каждое слово отдельно
function pickSide(){
  const s = askSide(ses.dir);
  if(s==='ru-en' && !stats.reverseDone){ stats.reverseDone=true; saveStats(); }
  return s;
}

function updateBar(){
  const pct = ses.total ? Math.round(ses.done/ses.total*100) : 0;
  runBar.style.width = pct+'%';
  runCount.textContent = `${ses.done}/${ses.total}`;
}

// вернуть слово в конец очереди, но только один раз за сессию
function requeue(w){
  if(ses.again.has(w.id)){ ses.done++; return; }   // второй промах — отпускаем, считаем пройденным
  ses.again.add(w.id);
  ses.queue.push(w);
}

function endSession(){
  const s = ses; ses = null;
  // «Без промаха» и «Молния» — за содержательную сессию, а не за три слова
  if(s.mode==='quiz'  && !s.bad && s.ok>=10)         { stats.perfectQuiz++;  saveStats(); }
  if(s.mode==='pairs' && !s.bad && s.ok>=PAIR_BATCH) { stats.perfectPairs++; saveStats(); }
  checkAchievements();

  const asked = s.ok + s.bad;
  const acc = asked ? Math.round(s.ok/asked*100) : 0;
  const icon = s.mode==='cards' ? '🃏' : (!s.bad && asked ? '🏆' : (acc>=70 ? '👍' : '💪'));
  const more = buildSession(cfg.cats, cfg.sessionSize, true).length;
  trRunEl.hidden = true; trDoneEl.hidden = false;
  trDoneEl.innerHTML =
    `<div class="card done">`+
      `<div class="dic">${icon}</div>`+
      `<h2>Сессия закончена</h2>`+
      `<p class="muted">Пройдено ${nWords(s.done)} из ${s.total}${s.free?' · без расписания':''}</p>`+
      (asked ? `<div class="tiles">`+tile('✅', s.ok, 'верно')+tile('❌', s.bad, 'ошибок')+tile('🎯', acc+'%', 'точность')+`</div>` : '')+
      `<div class="row2">`+
        (more ? `<button class="btn" id="againBtn" style="flex:1">Ещё сессию</button>` : '')+
        `<button class="btn ghost" id="backBtn" style="flex:1">Готово</button>`+
      `</div>`+
      (more ? '' : `<p class="muted" style="margin-top:10px">Невыученных слов в выбранных категориях больше нет.</p>`)+
    `</div>`;
  const again = document.getElementById('againBtn');
  if(again) again.addEventListener('click',()=>{
    trDoneEl.hidden = true;
    startSession();
    if(!ses){ trSetupEl.hidden = false; renderSetup(); }   // не стартанула — не оставляем пустой экран
  });
  document.getElementById('backBtn').addEventListener('click',()=>{ trDoneEl.hidden=true; trSetupEl.hidden=false; renderSetup(); });
  window.scrollTo(0,0);
}

/* ---------- 🃏 карточки ---------- */

function nextCard(){
  ses.cur = ses.queue.shift();
  ses.side = pickSide();
  drawCard();
}

function drawCard(){
  const w = ses.cur, s = ses.side, frontEn = s==='en-ru';
  const pill = `<div class="lvlpill">ур. ${w.lvl}/${MAXLVL}</div>`;
  trBox.innerHTML =
    `<div class="flip3d" id="cardFlip"><div class="f3i">`+
      `<div class="face">${pill}`+
        `<div class="big">${esc(frontOf(w,s))}</div>`+
        (frontEn ? `<button class="say" id="sayFront" title="Произнести">🔊</button>` : '')+
        `<div class="tip">тап — перевернуть</div>`+
      `</div>`+
      `<div class="face back">${pill}`+
        `<div class="big">${esc(backOf(w,s))}</div>`+
        (w.ex ? `<div class="ex">${esc(w.ex)}</div>` : '')+
        (frontEn ? '' : `<button class="say" id="sayBack" title="Произнести">🔊</button>`)+
        `<div class="tip">${esc(w.cat)}</div>`+
      `</div>`+
    `</div></div>`+
    `<div class="acts">`+
      `<button class="btn big" id="nextBtn">Дальше →</button>`+
      `<button class="btn ghost sm" id="easyBtn">👌 Изян — уже знаю</button>`+
    `</div>`;

  const flip = document.getElementById('cardFlip');
  flip.addEventListener('click', e=>{
    if(e.target.closest('.say')) return;              // тап по 🔊 карточку не переворачивает
    flip.classList.toggle('on');
    if(flip.classList.contains('on')) speak(w.en);    // смысл раскрыт — можно и произнести
  });
  ['sayFront','sayBack'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.addEventListener('click',()=>speak(w.en));
  });

  document.getElementById('nextBtn').addEventListener('click',()=>{
    noteAnswer('cards');
    grade(w.id, true, false);                         // graded=false: «выучено» карточка не ставит
    ses.done++; updateBar(); nextStep();
  });
  document.getElementById('easyBtn').addEventListener('click',()=>{
    noteAnswer('cards');
    setLearned(w.id, true);
    toast(`👌 «${esc(w.en)}» — в выученных`);
    ses.done++; updateBar(); nextStep();
  });
}

/* ---------- ✅ тест ---------- */

function nextQuiz(){
  ses.cur = ses.queue.shift();
  ses.side = pickSide();
  drawQuiz();
}

function drawQuiz(){
  const w = ses.cur, s = ses.side, askEn = s==='en-ru';
  const answer = backOf(w, s);
  /* Дистракторы — из своего же словаря и с той же стороны: иначе варианты выдают
     правильный ответ одним лишь языком. Дубли переводов убираем через Set. */
  const pool = [...new Set(words.filter(x=>x.id!==w.id).map(x=>backOf(x,s)).filter(t=>t && t!==answer))];
  const opts = shuffle([answer, ...sample(pool,3)]);
  const rightIdx = opts.indexOf(answer);

  /* Вопрос висит по центру свободного места, варианты прижаты к низу —
     на телефоне до них дотягивается большой палец, а не вторая рука. */
  trBox.innerHTML =
    `<div class="qhead">`+
      `<div class="qtop"><div class="qword">${esc(frontOf(w,s))}</div>`+
        (askEn ? `<button class="say" id="qSay" title="Произнести">🔊</button>` : '')+
      `</div>`+
      `<div class="qex" id="qEx"></div>`+
    `</div>`+
    `<div class="opts">`+opts.map((t,i)=>`<button class="opt" data-i="${i}">${esc(t)}</button>`).join('')+`</div>`;

  const q=document.getElementById('qSay'); if(q) q.addEventListener('click',()=>speak(w.en));
  trBox.querySelectorAll('.opt').forEach((b,i)=>b.addEventListener('click',()=>answerQuiz(i, rightIdx)));
}

function answerQuiz(picked, rightIdx){
  const w = ses.cur;
  const btns = [...trBox.querySelectorAll('.opt')];
  if(btns[0].disabled) return;                        // защита от двойного тапа
  btns.forEach(b=>b.disabled=true);
  btns[rightIdx].classList.add('ok');

  const ok = picked===rightIdx;
  buzz(ok ? 14 : [22,40,22]);
  if(ok){
    ses.ok++; ses.done++;
    grade(w.id, true, true);
    noteAnswer('right');
  }else{
    btns[picked].classList.add('no');
    ses.bad++;
    grade(w.id, false);
    noteAnswer('wrong');
    requeue(w);
    if(w.ex) document.getElementById('qEx').textContent = w.ex;
  }
  speak(w.en);
  updateBar();
  setTimeout(nextStep, ok ? 650 : 1700);              // на ошибке даём время прочитать пример
}

/* ---------- 🔗 пары ---------- */

function nextPairs(){
  ses.side = pickSide();
  ses.batch = ses.queue.splice(0, PAIR_BATCH);
  ses.matched = new Set(); ses.sel = null; ses.errL = ses.errR = null; ses.lock = false;
  ses.left  = shuffle(ses.batch.slice());
  ses.right = shuffle(ses.batch.slice());
  drawPairs();
}

function pbtn(text, key, done, sel, err){
  return `<button class="pbtn${done?' done':''}${sel?' sel':''}${err?' err':''}" data-k="${key}">${esc(text)}</button>`;
}

function drawPairs(){
  trBox.innerHTML =
    `<p class="phint">Соедини слово с переводом</p>`+
    `<div class="pairs">`+
      `<div class="pcol">`+ses.left .map((w,i)=>pbtn(frontOf(w,ses.side), 'L'+i, ses.matched.has(w.id), ses.sel===i, ses.errL===i)).join('')+`</div>`+
      `<div class="pcol">`+ses.right.map((w,i)=>pbtn(backOf(w,ses.side),  'R'+i, ses.matched.has(w.id), false,       ses.errR===i)).join('')+`</div>`+
    `</div>`;
  trBox.querySelectorAll('.pbtn').forEach(b=>b.addEventListener('click',()=>pairTap(b.dataset.k)));
}

function pairTap(key){
  if(ses.lock) return;
  const isLeft = key[0]==='L', i = +key.slice(1);

  if(isLeft){
    ses.sel = (ses.sel===i) ? null : i;               // повторный тап снимает выбор
    drawPairs();
    return;
  }
  if(ses.sel===null){ toast('Сначала выбери слово слева'); return; }

  const lw = ses.left[ses.sel], rw = ses.right[i];
  buzz(lw.id===rw.id ? 14 : [22,40,22]);
  if(lw.id===rw.id){
    ses.matched.add(rw.id);
    ses.ok++; ses.done++;
    grade(rw.id, true, true);
    noteAnswer('right');
    ses.sel = null;
    updateBar(); drawPairs(); speak(rw.en);
    // партия собрана — следующая (или конец сессии, если очередь пуста)
    if(ses.batch.every(x=>ses.matched.has(x.id))){ ses.lock=true; setTimeout(nextStep, 600); }
  }else{
    /* Промах. Слово в очередь не возвращаем: оно и так остаётся в партии,
       пока его не соберут. Понижения уровня достаточно, чтобы оно вернулось завтра. */
    ses.bad++;
    grade(lw.id, false);
    noteAnswer('wrong');
    ses.errL = ses.sel; ses.errR = i; ses.lock = true;
    drawPairs();
    setTimeout(()=>{
      if(!ses) return;
      ses.errL = ses.errR = null; ses.sel = null; ses.lock = false;
      drawPairs();
    }, 650);
  }
}

/* ---------- запуск ---------- */

document.addEventListener('wordschange', renderSetup);
document.querySelector('nav button[data-v="train"]').addEventListener('click', renderSetup);
renderSetup();
