/* Нижняя навигация: переключение вкладок (.view). show() зовут и другие модули —
   например настройки открываются шестерёнкой, а не вкладкой, и ИИ отправляет туда
   за ключом. Вкладка «Слова» сдвоенная: внутри .tabs переключает .subview,
   выбранная под-вкладка запоминается в localStorage.
   Зависит только от разметки. Подключается до store.js. */

const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('nav button');
function show(v){
  views.forEach(s=>s.classList.toggle('active', s.id==='v-'+v));
  navBtns.forEach(b=>b.classList.toggle('active', b.dataset.v===v));
  window.scrollTo(0,0);
}
navBtns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.v)));

// под-вкладки внутри сдвоенных вкладок
document.querySelectorAll('.tabs').forEach(tabs=>{
  const group=tabs.dataset.sub;
  const btns=[...tabs.querySelectorAll('button')];
  const showSub=s=>{
    btns.forEach(b=>{
      b.classList.toggle('active', b.dataset.s===s);
      const el=document.getElementById('s-'+b.dataset.s);
      if(el) el.classList.toggle('active', b.dataset.s===s);
    });
    localStorage.setItem('sub_'+group, s);
    window.scrollTo(0,0);
  };
  btns.forEach(b=>b.addEventListener('click',()=>showSub(b.dataset.s)));
  const saved=localStorage.getItem('sub_'+group);
  showSub(btns.some(b=>b.dataset.s===saved) ? saved : btns[0].dataset.s);
});

/* Реальные высоты шапки и навбара (вместе с safe-area) — в CSS как --top-h и --nav-h.
   От них считается высота экрана тренировки: карточка тянется на всё свободное место,
   а кнопки садятся к самому низу, под большой палец. С захардкоженными числами это
   разъезжалось на каждом втором телефоне. */
const navEl=document.querySelector('nav'), headEl=document.querySelector('header');
function syncChrome(){
  const r=document.documentElement.style;
  r.setProperty('--nav-h', navEl.offsetHeight+'px');
  r.setProperty('--top-h', headEl.offsetHeight+'px');
}
if(window.ResizeObserver){ const ro=new ResizeObserver(syncChrome); ro.observe(navEl); ro.observe(headEl); }
window.addEventListener('resize',syncChrome);
syncChrome();

document.getElementById('settingsBtn').addEventListener('click',()=>show('settings'));
