/* Вкладка «Наборы»: сверху то, что реально лежит в словаре, снизу — готовые подборки
   из data.js. Зависит от data.js (DECKS), util.js, store.js.

   Верхний список строится по catStats(), а не по DECKS: набором считается любая
   категория — и готовая, и своя, и приехавшая импортом или от ИИ. Иначе собственные
   слова в наборах не видны вовсе, а у готового набора не видно, что его дополнили.

   Добавление идёт через тот же addWord(), что и импорт с ИИ, поэтому повторный клик
   безопасен: существующему слову обновится перевод, а прогресс останется. */

function deckIcon(cat){ const d = DECKS.find(x=>x.cat===cat); return d ? d.icon : '🗂'; }
function deckHave(d){ return d.words.filter(w=>findWord(wordId(w[0]))).length; }

/* ---- наборы в словаре ---- */

function renderMyDecks(){
  const box = document.getElementById('myDecksBox');
  const cs = catStats();
  if(!cs.length){ box.innerHTML = ''; return; }
  box.innerHTML =
    `<div class="card">`+
      `<h2>🗂 В твоём словаре</h2>`+
      `<p class="muted">Всё, что есть сейчас: готовые наборы, свои слова, импорт, генерации ИИ.<br>`+
        `<b>Тумблер</b> — учить набор или нет: выключенный не попадает в тренировку, но слова и прогресс остаются. `+
        `<b>🗑</b> — стереть набор насовсем.</p>`+
      cs.map(c=>{
        const pct = Math.round(c.learned/c.total*100);
        const sub = c.arch
          ? `${nWords(c.total)} · выучено ${c.learned} · <b>не учится</b>`
          : `${nWords(c.total)} · выучено ${c.learned}${c.due?` · к повторению ${c.due}`:''}`;
        return `<div class="deckrow${c.arch?' off':''}">`+
          `<div class="di">${deckIcon(c.cat)}</div>`+
          `<div class="dt">`+
            `<div class="dn">${esc(c.cat)}</div>`+
            `<div class="dd">${sub}</div>`+
            `<div class="bar sm"><i style="width:${pct}%"></i></div>`+
          `</div>`+
          `<button class="tgl${c.arch?'':' on'}" role="switch" aria-checked="${!c.arch}" data-arch="${esc(c.cat)}" title="${c.arch?'Вернуть в тренировку':'Не учить этот набор'}"><i></i></button>`+
          `<button class="btn ghost sm" data-del="${esc(c.cat)}" title="Удалить набор">🗑</button>`+
        `</div>`;
      }).join('')+
    `</div>`;
  box.querySelectorAll('[data-arch]').forEach(b=>b.addEventListener('click',()=>{
    const cat = b.dataset.arch, on = !isArchived(cat);
    setArchived(cat, on);                        // → wordschange → перерисуются все вкладки
    buzz(12);
    toast(on ? `⏸ «${esc(cat)}» больше не учится` : `▶︎ «${esc(cat)}» вернулся в тренировку`);
  }));
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>dropCat(b.dataset.del)));
}

/* Удаление необратимо, поэтому окно честно перечисляет, что пропадёт и что уцелеет,
   и подсказывает тумблер — обычно человеку нужен именно он, а не потеря прогресса. */
async function dropCat(cat){
  const c = catStats().find(x=>x.cat===cat); if(!c) return;
  const ok = await askConfirm({
    title: `Удалить «${cat}»?`,
    ok: 'Удалить навсегда', danger: true,
    html:
      `<p>Из словаря исчезнут <b>${nWords(c.total)}</b>${c.learned?`, из них выучено ${c.learned}`:''}.</p>`+
      `<p class="muted"><b>Пропадёт:</b> уровень и статистика каждого слова, набор в разбивке «По категориям» и его вклад в «выучено N из M».</p>`+
      `<p class="muted"><b>Останется:</b> график занятий по дням, серия, «всего ответов» и уже открытые ачивки — они считаются по ответам, а не по словам.</p>`+
      `<p class="muted">Отменить нельзя. Если нужно просто перестать его учить — закрой это окно и выключи набор тумблером: слова и прогресс сохранятся. А если жалко только слов — выгрузи TSV в настройках.</p>`
  });
  if(!ok) return;
  const n = removeCat(cat);                      // → wordschange → все вкладки перерисуются
  toast(`🗑 Набор «${esc(cat)}» удалён, минус ${nWords(n)}`);
}

/* ---- готовые наборы ---- */

function renderDecks(){
  const box = document.getElementById('decksBox');
  box.innerHTML = DECKS.map((d,i)=>{
    const have = deckHave(d), left = d.words.length - have;
    const label = !left ? '✓ Всё есть' : (have ? `+ ещё ${left}` : 'Добавить');
    return `<div class="card"><div class="deck">`+
      `<div class="di">${d.icon}</div>`+
      `<div class="dt">`+
        `<div class="dn">${esc(d.cat)}</div>`+
        `<div class="dd">${esc(d.desc)}</div>`+
        `<div class="dd">${nWords(d.words.length)}${have?` · уже в словаре ${have}`:''}</div>`+
      `</div>`+
      `<button class="btn sm${left?'':' ghost'}" data-i="${i}"${left?'':' disabled'}>${label}</button>`+
    `</div></div>`;
  }).join('') +
  `<div class="card"><button class="btn big" id="allDecks">Добавить все наборы</button>`+
  `<p class="muted" style="margin-top:10px;text-align:center">Это ${nWords(DECKS.reduce((n,d)=>n+d.words.length,0))} — на несколько недель занятий.</p></div>`;

  box.querySelectorAll('.deck button').forEach(b=>b.addEventListener('click',()=>addDeck(DECKS[+b.dataset.i])));
  document.getElementById('allDecks').addEventListener('click',()=>addDeck(null));
}

/* d===null — добавить все наборы разом. saveWords() один раз в конце:
   addWord сам не сохраняет именно ради таких пакетных вставок. */
function addDeck(d){
  const list = d ? [d] : DECKS;
  let added=0, upd=0;
  list.forEach(deck=>deck.words.forEach(([en,ru,ex])=>{
    const r = addWord({en, ru, ex, cat:deck.cat});
    if(r==='new') added++; else if(r==='upd') upd++;
  }));
  unarchiveCats(list.map(x=>x.cat));   // раз добавляем — значит снова хотим учить
  saveWords();
  toast(added
    ? `📚 Добавлено ${nWords(added)}${upd?`, обновлено ${upd}`:''}`
    : 'Все эти слова уже в словаре');
}

function refreshDecks(){ renderMyDecks(); renderDecks(); }
document.addEventListener('wordschange', refreshDecks);
refreshDecks();
