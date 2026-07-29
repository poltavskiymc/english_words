/* Учёт интернет-трафика. Единственный сетевой запрос в приложении — генерация
   набора через DeepSeek (ai.js), поэтому счётчик тут скромнее, чем в грузинской аппке,
   но полезен: по нему видно, во что обходятся наборы.
   Зависит от util.js (fmtTs, fmtBytes). */

const traffic = JSON.parse(localStorage.getItem('traffic')||'null') || {up:0, down:0, since:Date.now()};
function saveTraffic(){ localStorage.setItem('traffic', JSON.stringify(traffic)); }
function addTraffic(up,down){ traffic.up+=up; traffic.down+=down; saveTraffic(); renderTraffic(); }
function renderTraffic(){
  const el=document.getElementById('trafficBox'); if(!el) return;
  el.innerHTML =
    `<div style="font-size:15px"><b>${fmtBytes(traffic.up+traffic.down)}</b> всего</div>`+
    `<div class="muted" style="margin-top:2px">↑ отправлено ${fmtBytes(traffic.up)} · ↓ получено ${fmtBytes(traffic.down)}</div>`+
    `<div class="muted" style="margin-top:6px; font-size:12px">Считаем с ${fmtTs(traffic.since)} по телу запросов и ответов — приблизительно. Сама тренировка интернет не тратит: слова и прогресс лежат на телефоне.</div>`;
}
