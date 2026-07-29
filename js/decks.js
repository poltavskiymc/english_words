/* Вкладка «Наборы»: готовые подборки из data.js.
   Зависит от data.js (DECKS), util.js, store.js (addWord/findWord/wordId/saveWords).

   Добавление идёт через тот же addWord(), что и импорт с ИИ, поэтому повторный клик
   безопасен: существующему слову обновится перевод, а прогресс останется. */

function deckHave(d){ return d.words.filter(w=>findWord(wordId(w[0]))).length; }

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
  saveWords();                                   // → wordschange → перерисуются все вкладки
  toast(added
    ? `📚 Добавлено ${nWords(added)}${upd?`, обновлено ${upd}`:''}`
    : 'Все эти слова уже в словаре');
}

document.addEventListener('wordschange', renderDecks);
renderDecks();
