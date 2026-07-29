/* Статистика, серия дней и ачивки. Вкладка «Прогресс».
   Зависит от data.js (ACHIEVEMENTS), util.js, store.js.

   ew_stats: { days:{'2026-07-30':{right,wrong,cards}}, answers, perfectQuiz,
               perfectPairs, imported, aiUsed, reverseDone, owl, early, best }
   ew_ach:   [id, ...] — уже разблокированные, чтобы не показывать плашку дважды. */

const S_KEY='ew_stats', A_KEY='ew_ach';

const stats = Object.assign(
  { days:{}, answers:0, perfectQuiz:0, perfectPairs:0, imported:0, aiUsed:0,
    reverseDone:false, owl:false, early:false, best:0 },
  JSON.parse(localStorage.getItem(S_KEY)||'{}')
);
if(!stats.days || typeof stats.days!=='object') stats.days={};
let unlocked = JSON.parse(localStorage.getItem(A_KEY)||'[]');

function saveStats(){ localStorage.setItem(S_KEY, JSON.stringify(stats)); }
function today(){
  const k=dayKey();
  if(!stats.days[k]) stats.days[k]={right:0,wrong:0,cards:0};
  return stats.days[k];
}

/* Один ответ пользователя. kind: 'right' | 'wrong' | 'cards' (карточку просто посмотрели).
   Здесь же ловятся «ночные» ачивки — по часу того момента, когда человек реально отвечал. */
function noteAnswer(kind){
  const d=today();
  d[kind]=(d[kind]||0)+1;
  stats.answers++;
  const h=new Date().getHours();
  if(h>=0 && h<5) stats.owl=true;
  if(h>=5 && h<7) stats.early=true;
  const st=streak();
  if(st>stats.best) stats.best=st;
  saveStats();
  checkAchievements();
}

/* Серия: сколько дней подряд, считая с сегодня (или со вчера, если сегодня ещё не занимался),
   в статистике есть хоть один ответ. */
function streak(){
  const has=k=>{ const d=stats.days[k]; return !!d && (d.right||d.wrong||d.cards); };
  let n=0, t=Date.now();
  if(!has(dayKey(t))) t-=DAY;               // сегодня пусто — серия могла оборваться вчера, а не сегодня
  while(has(dayKey(t))){ n++; t-=DAY; }
  return n;
}

// срез для check() у ачивок
function snapshot(){
  const d=today();
  return {
    total: words.length,
    learned: words.filter(w=>w.learned).length,
    cats: new Set(words.map(w=>w.cat)).size,
    streak: streak(),
    answers: stats.answers,
    dayAnswers: (d.right||0)+(d.wrong||0)+(d.cards||0),
    perfectQuiz: stats.perfectQuiz,
    perfectPairs: stats.perfectPairs,
    imported: stats.imported,
    aiUsed: stats.aiUsed,
    reverseDone: stats.reverseDone,
    owl: stats.owl,
    early: stats.early
  };
}

/* Проверка ачивок. Зовётся после каждого ответа и после любых изменений словаря.
   Новые показываем тостом — по одной, чтобы не заваливать экран. */
function checkAchievements(){
  const s=snapshot(), fresh=[];
  ACHIEVEMENTS.forEach(a=>{
    if(unlocked.includes(a.id)) return;
    let ok=false;
    try{ ok=!!a.check(s); }catch(_){ ok=false; }
    if(ok){ unlocked.push(a.id); fresh.push(a); }
  });
  if(fresh.length){
    localStorage.setItem(A_KEY, JSON.stringify(unlocked));
    fresh.forEach((a,i)=>setTimeout(()=>toast(`${a.icon} <b>Ачивка!</b> ${esc(a.name)}`, 2600), i*900));
    renderAch();
  }
  return fresh;
}

/* ---- отрисовка вкладки «Прогресс» ---- */

function renderStats(){
  const box=document.getElementById('statsBox'); if(!box) return;
  const total=words.length, learned=words.filter(w=>w.learned).length;
  const due=dueWords().length, fresh=newWords().length;
  const d=today(), st=streak();
  const pct = total ? Math.round(learned/total*100) : 0;

  box.innerHTML =
    `<div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><div class="pn">${pct}%</div></div>`+
    `<div class="muted" style="margin-top:4px">Выучено ${learned} из ${nWords(total)}</div>`+
    `<div class="tiles">`+
      tile('🔥', st, plural(st,'день','дня','дней')+' подряд')+
      tile('⏰', due, 'к повторению')+
      tile('🌱', fresh, 'новых')+
      tile('✅', (d.right||0), 'верно сегодня')+
      tile('❌', (d.wrong||0), 'ошибок сегодня')+
      tile('🃏', (d.cards||0), 'карточек сегодня')+
    `</div>`+
    `<div class="muted" style="margin-top:10px">Всего ответов за всё время: <b>${stats.answers}</b>. Лучшая серия: <b>${stats.best}</b> ${plural(stats.best,'день','дня','дней')}.</div>`;

  renderDays();
  renderCatStats();
}
function tile(ic,n,label){
  return `<div class="tile"><div class="ti">${ic}</div><div class="tn">${n}</div><div class="tl">${esc(label)}</div></div>`;
}

// последние 14 дней столбиками — видно, есть ли регулярность
function renderDays(){
  const el=document.getElementById('daysBox'); if(!el) return;
  const arr=[];
  for(let i=13;i>=0;i--){
    const k=dayKey(Date.now()-i*DAY), d=stats.days[k]||{};
    arr.push({k, n:(d.right||0)+(d.wrong||0)+(d.cards||0)});
  }
  const max=Math.max(1, ...arr.map(a=>a.n));
  el.innerHTML = `<div class="bars">`+arr.map(a=>{
    const h=a.n ? Math.max(8, Math.round(a.n/max*100)) : 3;
    const dd=a.k.slice(8);
    return `<div class="bcol" title="${a.k}: ${a.n}"><i style="height:${h}%" class="${a.n?'':'zero'}"></i><span>${dd}</span></div>`;
  }).join('')+`</div>`;
}

function renderCatStats(){
  const el=document.getElementById('catStatsBox'); if(!el) return;
  const cs=catStats();
  if(!cs.length){ el.innerHTML='<p class="muted empty">Пока ни одного слова. Загляни в «Наборы» или добавь свои на вкладке «Слова».</p>'; return; }
  el.innerHTML = cs.map(c=>{
    const pct=Math.round(c.learned/c.total*100);
    return `<div class="crow"><div class="cnm">${esc(c.cat)}</div>`+
           `<div class="bar sm"><i style="width:${pct}%"></i></div>`+
           `<div class="cnum">${c.learned}/${c.total}</div></div>`;
  }).join('');
}

function renderAch(){
  const el=document.getElementById('achBox'); if(!el) return;
  el.innerHTML =
    `<div class="muted" style="margin-bottom:10px">Открыто <b>${unlocked.length}</b> из ${ACHIEVEMENTS.length}</div>`+
    `<div class="achgrid">`+ACHIEVEMENTS.map(a=>{
      const on=unlocked.includes(a.id);
      return `<div class="ach${on?' on':''}"><div class="ai">${a.icon}</div>`+
             `<div class="at"><div class="an">${esc(a.name)}</div><div class="ad">${esc(a.desc)}</div></div>`+
             `<div class="ax">${on?'✓':''}</div></div>`;
    }).join('')+`</div>`;
}

document.addEventListener('wordschange',()=>{ checkAchievements(); renderStats(); });
