/* Общие хелперы. Подключается сразу после data.js, до остальных скриптов. */

// экранирование html — всё, что пришло от юзера или ИИ, рисуем только через это
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// размер строки в байтах (учёт трафика)
function byteLen(s){ return new Blob([s||'']).size; }
function fmtBytes(b){ if(b<1024) return b+' Б'; if(b<1048576) return (b/1024).toFixed(1)+' КБ'; return (b/1048576).toFixed(2)+' МБ'; }

function fmtTs(ts){
  if(!ts) return '';
  const d=new Date(ts), p=n=>String(n).padStart(2,'0');
  return `${p(d.getDate())}.${p(d.getMonth()+1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// русские склонения: plural(5,'слово','слова','слов')
function plural(n,one,few,many){
  const a=Math.abs(n)%100, b=a%10;
  if(a>10&&a<20) return many;
  if(b>1&&b<5) return few;
  return b===1 ? one : many;
}
function nWords(n){ return n+' '+plural(n,'слово','слова','слов'); }

const DAY = 86400000;
// ключ дня для статистики. Локальная дата, не UTC: иначе «сегодня» у юзера и в статистике разъезжаются вечером.
function dayKey(ts){
  const d = ts ? new Date(ts) : new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
// начало сегодняшних суток по локальному времени — от него считаем «просрочено к повторению»
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); }

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

// перемешивание на месте (Фишер–Йетс). Нужно и сессии, и вариантам в тесте, и столбцам в парах.
function shuffle(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function sample(arr,n){ return shuffle(arr.slice()).slice(0,n); }

/* Озвучка английского. В отличие от грузинской аппки тут всё просто:
   англоязычный голос есть в любой системе. Но на iOS без явно выбранного
   голоса speechSynthesis часто молчит — поэтому голос ищем и ставим руками.

   Выключатель живёт здесь же, а не в cfg: озвучка нужна и вне тренировки
   (список слов), а util.js подключается раньше store.js и о cfg ещё не знает.
   Тело <body> получает класс .nosound — по нему прячутся все кнопки 🔊,
   чтобы не оставлять на экране кнопку, которая молчит. */
const canSpeak = 'speechSynthesis' in window && typeof speechSynthesis.getVoices === 'function';
let voices = [];
function loadVoices(){ try{ voices = speechSynthesis.getVoices()||[]; }catch(_){ voices=[]; } }
if(canSpeak){
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;   // Safari/Chrome отдают список асинхронно
}

let soundOn = localStorage.getItem('ew_sound') !== '0';   // по умолчанию включена
function setSound(on){
  soundOn = !!on;
  localStorage.setItem('ew_sound', soundOn ? '1' : '0');
  document.body.classList.toggle('nosound', !soundOn);
  if(!soundOn && canSpeak) try{ speechSynthesis.cancel(); }catch(_){}   // оборвать то, что уже говорится
}
document.body.classList.toggle('nosound', !soundOn);

function speak(text){
  if(!soundOn || !canSpeak || !text) return;
  if(!voices.length) loadVoices();
  const v = voices.find(x=>(x.lang||'').toLowerCase().replace('_','-').startsWith('en')) || null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = v ? v.lang : 'en-US'; u.rate=.85;
  if(v) u.voice=v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* Короткая вибрация на ответ. На десктопе и на iOS navigator.vibrate отсутствует —
   поэтому просто тихо ничего не делаем, а не городим проверки на вызывающей стороне. */
function buzz(pattern){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(_){}
}

// короткий тост поверх всего (ачивки, «добавлено», ошибки импорта)
function toast(msg, ms=2200){
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.innerHTML=msg; el.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>el.classList.remove('on'), ms);
}
