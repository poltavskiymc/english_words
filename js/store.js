/* ХРАНИЛИЩЕ СЛОВ + интервальные повторения (SRS).
   Единственный модуль, который пишет в ew_words. Все остальные (тренажёры,
   редактор, импорт, наборы) ходят только через функции отсюда.
   Зависит от util.js. Подключается после nav.js, до всех, кто работает со словами.

   Слово: { id, en, ru, ex, cat, lvl, due, right, wrong, learned, added }
     id      — стабильный: en в нижнем регистре. Одно слово = одна запись,
               повторный импорт того же слова обновляет перевод, а не плодит дубль.
     lvl     — уровень 0..6, индекс в IVL
     due     — когда показать снова (ms)
     learned — «выучено». ЯВНЫЙ флаг: ставится кнопкой «Изян», галочкой в редакторе
               или верным ответом в игре на максимальном уровне. Карточки сами по себе
               выученным не помечают — там нет проверки, что человек реально вспомнил.
*/

const W_KEY='ew_words', CFG_KEY='ew_cfg';

// интервалы повторения в днях по уровням 0..6
const IVL = [0, 1, 3, 7, 16, 35, 90];
const MAXLVL = IVL.length-1;

let words = load();
function load(){
  try{
    const a = JSON.parse(localStorage.getItem(W_KEY)||'[]');
    return Array.isArray(a) ? a.filter(w=>w && w.en && w.ru) : [];
  }catch(_){ return []; }
}
function saveWords(){
  localStorage.setItem(W_KEY, JSON.stringify(words));
  document.dispatchEvent(new CustomEvent('wordschange'));
}

function wordId(en){ return String(en).trim().toLowerCase(); }
function findWord(id){ return words.find(w=>w.id===id); }

/* Добавление. Возвращает 'new' | 'upd' — на этом импорт строит отчёт
   «добавлено N, обновлено M». Существующему слову обновляем перевод/пример/категорию,
   но НЕ сбрасываем прогресс (lvl/due/learned) — иначе повторная загрузка файла
   обнулила бы всё выученное.
   ⚠️ Сама НЕ сохраняет: импорт зовёт её в цикле на сотни строк, saveWords() —
   один раз в конце. Добавил слова — вызови saveWords(). */
function addWord({en, ru, ex, cat}){
  en=String(en||'').trim(); ru=String(ru||'').trim();
  if(!en || !ru) return null;
  ex=String(ex||'').trim(); cat=String(cat||'').trim()||'Без категории';
  const id=wordId(en), ex0=findWord(id);
  if(ex0){
    ex0.ru=ru; if(ex) ex0.ex=ex; ex0.cat=cat;
    return 'upd';
  }
  words.push({ id, en, ru, ex, cat, lvl:0, due:Date.now(), right:0, wrong:0, learned:false, added:Date.now() });
  return 'new';
}
function removeWord(id){
  const i=words.findIndex(w=>w.id===id);
  if(i>=0){ words.splice(i,1); saveWords(); }
}
function setLearned(id, val){
  const w=findWord(id); if(!w) return;
  w.learned=!!val;
  if(val){ w.lvl=MAXLVL; w.due=Date.now()+IVL[MAXLVL]*DAY; }
  else   { w.lvl=Math.min(w.lvl,2); w.due=Date.now(); }   // вернули в изучение — покажем скоро
  saveWords();
}
function editWord(id, {en, ru, ex, cat}){
  const w=findWord(id); if(!w) return false;
  const newEn=String(en||'').trim(), newRu=String(ru||'').trim();
  if(!newEn || !newRu) return false;
  const newId=wordId(newEn);
  // переименовали в уже существующее слово — не сливаем молча, отказываем
  if(newId!==id && findWord(newId)) return false;
  w.id=newId; w.en=newEn; w.ru=newRu; w.ex=String(ex||'').trim(); w.cat=String(cat||'').trim()||'Без категории';
  saveWords();
  return true;
}

/* ---- SRS ---- */

// ok=true — вспомнил: уровень вверх, следующий показ через IVL[lvl] дней.
// ok=false — не вспомнил: уровень на шаг назад и показать ещё в этой сессии.
// Флаг learned ставим только на максимальном уровне и только за настоящий ответ (игры).
function grade(id, ok, graded){
  const w=findWord(id); if(!w) return;
  if(ok){
    w.right++;
    w.lvl=Math.min(w.lvl+1, MAXLVL);
    w.due=Date.now()+IVL[w.lvl]*DAY;
    if(graded && w.lvl===MAXLVL) w.learned=true;
  }else{
    w.wrong++;
    w.lvl=Math.max(0, w.lvl-1);
    w.due=Date.now();
  }
  saveWords();
}

/* ---- выборки ---- */

function activeWords(){ return words.filter(w=>!w.learned); }
function dueWords(){ const t=startOfToday()+DAY-1; return activeWords().filter(w=>w.due<=t); }
function newWords(){ return activeWords().filter(w=>w.right===0 && w.wrong===0); }

// категории с подсчётом: [{cat, total, learned, due}]
function catStats(){
  const m=new Map();
  words.forEach(w=>{
    if(!m.has(w.cat)) m.set(w.cat,{cat:w.cat, total:0, learned:0, due:0});
    const c=m.get(w.cat);
    c.total++;
    if(w.learned) c.learned++;
    else if(w.due<=startOfToday()+DAY-1) c.due++;
  });
  return [...m.values()].sort((a,b)=>a.cat.localeCompare(b.cat,'ru'));
}

/* Набор слов на сессию: сначала просроченные к повторению, потом новые (лимит в день).
   cats — выбранные категории (пустой массив = все).

   anyway=true — «без расписания»: берём все невыученные слова категории, игнорируя
   и даты повторения, и лимит новых. Нужно, когда на сегодня всё повторено, а человек
   хочет ещё погонять — упереться в «приходи завтра» посреди занятия обиднее, чем
   слегка сбить интервалы. */
function buildSession(cats, size, anyway){
  const inCat = w => !cats.length || cats.includes(w.cat);
  const pool  = (anyway ? activeWords() : dueWords()).filter(inCat);
  if(anyway) return shuffle(pool.slice()).slice(0, size||cfg.sessionSize);
  const fresh = pool.filter(w=>w.right===0 && w.wrong===0);
  const rep   = pool.filter(w=>w.right>0 || w.wrong>0);
  const list  = shuffle(rep).concat(shuffle(fresh).slice(0, cfg.newPerDay));
  return shuffle(list).slice(0, size||cfg.sessionSize);
}

/* ---- настройки тренировки ---- */
const cfg = Object.assign(
  { mode:'cards', dir:'en-ru', cats:[], newPerDay:10, sessionSize:20 },
  JSON.parse(localStorage.getItem(CFG_KEY)||'{}')
);
function saveCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

/* Что показать на лице карточки/вопроса с учётом направления.
   dir: 'en-ru' | 'ru-en' | 'mix'. Для 'mix' решаем на каждое слово отдельно. */
function askSide(dir){
  if(dir==='mix') return Math.random()<.5 ? 'en-ru' : 'ru-en';
  return dir||'en-ru';
}
function frontOf(w, d){ return d==='ru-en' ? w.ru : w.en; }
function backOf(w, d){ return d==='ru-en' ? w.en : w.ru; }
