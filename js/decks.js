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
      `<p class="muted">Всё, что есть сейчас: готовые наборы, свои слова, импорт, генерации ИИ. Набор можно убрать целиком, если учить его больше не хочется.</p>`+
      cs.map(c=>{
        const pct = Math.round(c.learned/c.total*100);
        return `<div class="deckrow">`+
          `<div class="di">${deckIcon(c.cat)}</div>`+
          `<div class="dt">`+
            `<div class="dn">${esc(c.cat)}</div>`+
            `<div class="dd">${nWords(c.total)} · выучено ${c.learned}${c.due?` · к повторению ${c.due}`:''}</div>`+
            `<div class="bar sm"><i style="width:${pct}%"></i></div>`+
          `</div>`+
          `<button class="btn ghost sm" data-del="${esc(c.cat)}" title="Убрать набор">🗑</button>`+
        `</div>`;
      }).join('')+
    `</div>`;
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>dropCat(b.dataset.del)));
}

function dropCat(cat){
  const c = catStats().find(x=>x.cat===cat); if(!c) return;
  const learned = c.learned ? `, из них выучено ${c.learned}` : '';
  if(!confirm(`Убрать набор «${cat}»?\n\nУдалятся все ${nWords(c.total)}${learned} и прогресс по ним. Отменить не выйдет — если жалко, сначала выгрузи TSV в настройках.`)) return;
  const n = removeCat(cat);                      // → wordschange → все вкладки перерисуются
  toast(`🗑 Набор «${esc(cat)}» убран, минус ${nWords(n)}`);
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
  saveWords();
  toast(added
    ? `📚 Добавлено ${nWords(added)}${upd?`, обновлено ${upd}`:''}`
    : 'Все эти слова уже в словаре');
}

function refreshDecks(){ renderMyDecks(); renderDecks(); }
document.addEventListener('wordschange', refreshDecks);
refreshDecks();
