/* КОНТЕНТ. Только данные, никакой логики — как data.js в грузинской аппке.
   Подключается ПЕРВЫМ.

   DECKS  — готовые наборы слов. Слово = [en, ru, example].
            Формат намеренно совпадает с форматом импорта (слово ⇥ перевод ⇥ пример ⇥ категория),
            поэтому готовый набор и загруженный файл проходят через один и тот же парсер.
   ACHIEVEMENTS — ачивки. check(s) получает срез статистики из stats.js (см. snapshot()).
   AI_SYSTEM    — промпт для генерации набора через DeepSeek. Просим ровно тот же TSV. */

const DECKS = [
  { cat:'Общие слова', icon:'📌', desc:'Базовая лексика, которая встречается везде', words:[
    ['roof','крыша','They went up on the roof to watch the sunset.'],
    ['floor','пол; этаж','The floor was cold under my feet.'],
    ['wall','стена','He hung the picture on the wall.'],
    ['door','дверь','Please close the door behind you.'],
    ['window','окно','She opened the window to let in fresh air.'],
    ['street','улица','We live on a quiet street.'],
    ['city','город','Tbilisi is a beautiful city.'],
    ['money','деньги','I do not have enough money for that.'],
    ['time','время','We do not have much time left.'],
    ['day','день','It was a long day at work.'],
    ['week','неделя','See you next week.'],
    ['year','год','She moved here a year ago.'],
    ['friend','друг','My friend lives in London.'],
    ['family','семья','He has a big family.'],
    ['child','ребёнок','The child was playing in the yard.'],
    ['water','вода','Can I have a glass of water?'],
    ['food','еда','The food here is really good.'],
    ['book','книга','I have read this book twice.']
  ]},

  { cat:'Еда и напитки', icon:'🍽', desc:'Продукты, посуда, за столом', words:[
    ['bread','хлеб','We bought fresh bread this morning.'],
    ['cheese','сыр','This cheese smells strong.'],
    ['meat','мясо','He does not eat meat.'],
    ['soup','суп','The soup is too salty.'],
    ['salt','соль','Could you pass me the salt?'],
    ['sugar','сахар','I take my coffee without sugar.'],
    ['egg','яйцо','I had two eggs for breakfast.'],
    ['apple','яблоко','She picked an apple from the tree.'],
    ['vegetable','овощ','You should eat more vegetables.'],
    ['fruit','фрукт','Fruit is cheap here in summer.'],
    ['breakfast','завтрак','I never skip breakfast.'],
    ['dinner','ужин','Dinner is ready!'],
    ['spoon','ложка','He stirred the tea with a spoon.'],
    ['knife','нож','Be careful, the knife is sharp.'],
    ['plate','тарелка','Put the plate in the sink.'],
    ['taste','вкус; пробовать','This soup has a strange taste.'],
    ['delicious','очень вкусный','The cake was absolutely delicious.'],
    ['thirsty','испытывающий жажду','I am thirsty, let us find some water.']
  ]},

  { cat:'Дом и быт', icon:'🏠', desc:'Комнаты, вещи, бытовые слова', words:[
    ['kitchen','кухня','We were sitting in the kitchen.'],
    ['bedroom','спальня','The bedroom is upstairs.'],
    ['bathroom','ванная','The bathroom is at the end of the hall.'],
    ['furniture','мебель','They bought new furniture.'],
    ['chair','стул','Pull up a chair and sit down.'],
    ['table','стол','Dinner is on the table.'],
    ['bed','кровать','I made the bed this morning.'],
    ['towel','полотенце','Bring me a clean towel.'],
    ['soap','мыло','Wash your hands with soap.'],
    ['key','ключ','I lost my keys again.'],
    ['lamp','лампа','Turn on the lamp, it is dark.'],
    ['curtain','штора','She pulled back the curtains.'],
    ['carpet','ковёр','There is a stain on the carpet.'],
    ['rent','аренда; снимать','The rent went up this year.'],
    ['neighbour','сосед','Our neighbours are very quiet.'],
    ['garbage','мусор','Take out the garbage, please.'],
    ['clean','чистый; убирать','The room is clean now.'],
    ['broken','сломанный','The washing machine is broken.']
  ]},

  { cat:'Работа и офис', icon:'💼', desc:'Найм, задачи, переписка', words:[
    ['job','работа, должность','She got a new job in Berlin.'],
    ['work','работа; работать','I work from home on Fridays.'],
    ['salary','зарплата','They offered him a higher salary.'],
    ['meeting','встреча, совещание','The meeting starts at ten.'],
    ['deadline','срок сдачи','We missed the deadline.'],
    ['boss','начальник','My boss is on vacation.'],
    ['colleague','коллега','I asked a colleague for help.'],
    ['task','задача','This task will take two days.'],
    ['report','отчёт','Send me the report by Friday.'],
    ['team','команда','Our team is small but fast.'],
    ['customer','клиент','The customer is waiting for an answer.'],
    ['experience','опыт','He has ten years of experience.'],
    ['skill','навык','Speaking English is a useful skill.'],
    ['hire','нанимать','They decided to hire her.'],
    ['resume','резюме','Attach your resume to the email.'],
    ['interview','собеседование','The interview went well.'],
    ['schedule','расписание; планировать','Let us schedule a call for Monday.'],
    ['approve','одобрять','The manager approved my request.']
  ]},

  { cat:'Путешествия', icon:'✈️', desc:'Аэропорт, дорога, отель, граница', words:[
    ['airport','аэропорт','We arrived at the airport too early.'],
    ['flight','рейс, полёт','Our flight was delayed by two hours.'],
    ['luggage','багаж','My luggage did not arrive.'],
    ['ticket','билет','I bought a ticket online.'],
    ['passport','паспорт','Do not forget your passport.'],
    ['border','граница','We crossed the border at night.'],
    ['hotel','гостиница','The hotel was near the sea.'],
    ['booking','бронирование','I cancelled the booking.'],
    ['map','карта','He was looking at the map.'],
    ['road','дорога','The road to the mountains is narrow.'],
    ['train','поезд','The train leaves in ten minutes.'],
    ['fare','плата за проезд','The taxi fare was too high.'],
    ['delay','задержка; задерживать','There was a long delay at customs.'],
    ['arrive','прибывать','We arrived late at night.'],
    ['leave','уезжать; оставлять','We leave tomorrow morning.'],
    ['abroad','за границей','She has never been abroad.'],
    ['souvenir','сувенир','I bought a small souvenir for my mother.'],
    ['currency','валюта','What is the local currency?']
  ]},

  { cat:'Частые глаголы', icon:'🏃', desc:'Глаголы, без которых не сказать почти ничего', words:[
    ['keep','держать, хранить','Keep the change.'],
    ['bring','приносить','Bring your friend with you.'],
    ['catch','ловить','He caught the ball.'],
    ['choose','выбирать','You can choose any of them.'],
    ['explain','объяснять','Let me explain it again.'],
    ['forget','забывать','Do not forget to call her.'],
    ['happen','происходить','What happened here?'],
    ['hope','надеяться','I hope you are right.'],
    ['learn','учить, узнавать','I am learning English.'],
    ['mean','значить','What does this word mean?'],
    ['notice','замечать','I did not notice him.'],
    ['promise','обещать','You promised to help.'],
    ['reach','достигать, дотягиваться','We reached the top at noon.'],
    ['remember','помнить','I remember that day well.'],
    ['spend','тратить, проводить','We spent a week there.'],
    ['suggest','предлагать','He suggested a different plan.'],
    ['wait','ждать','Wait for me here.'],
    ['worry','беспокоиться','Do not worry about it.']
  ]},

  { cat:'Эмоции и характер', icon:'😀', desc:'Как описать себя и других — прилагательные', words:[
    ['angry','злой','She was angry with me.'],
    ['afraid','боящийся','I am afraid of heights.'],
    ['proud','гордый','His parents are proud of him.'],
    ['shy','стеснительный','He is too shy to ask.'],
    ['kind','добрый','That was very kind of you.'],
    ['rude','грубый','Do not be rude to the waiter.'],
    ['lonely','одинокий','He felt lonely in the new city.'],
    ['tired','уставший','I am too tired to go out.'],
    ['surprised','удивлённый','We were surprised to see her.'],
    ['calm','спокойный','Stay calm and do not panic.'],
    ['confident','уверенный','She sounded confident.'],
    ['jealous','ревнивый','He gets jealous easily.'],
    ['generous','щедрый','Our host was very generous.'],
    ['stubborn','упрямый','My brother is incredibly stubborn.'],
    ['honest','честный','To be honest, I do not like it.'],
    ['upset','расстроенный','Do not be upset, it is not your fault.']
  ]}
];

/* Ачивки. check(s) — срез статистики (stats.js → snapshot()).
   Порядок = порядок на вкладке «Прогресс». */
const ACHIEVEMENTS = [
  {id:'first',    icon:'🐣', name:'Первое слово',      desc:'Взять в изучение хотя бы одно слово',       check:s=>s.total>=1},
  {id:'ten',      icon:'🔟', name:'Десятка',           desc:'10 слов в изучении',                       check:s=>s.total>=10},
  {id:'hundred',  icon:'💯', name:'Сотня',             desc:'100 слов в изучении',                      check:s=>s.total>=100},
  {id:'library',  icon:'📚', name:'Библиотека',        desc:'500 слов в изучении',                      check:s=>s.total>=500},
  {id:'learn10',  icon:'🎓', name:'Первый десяток',    desc:'10 выученных слов',                        check:s=>s.learned>=10},
  {id:'learn50',  icon:'🏅', name:'Полсотни в голове', desc:'50 выученных слов',                        check:s=>s.learned>=50},
  {id:'learn100', icon:'👑', name:'Сотня выучена',     desc:'100 выученных слов',                       check:s=>s.learned>=100},
  {id:'streak3',  icon:'🔥', name:'Три дня подряд',    desc:'Заниматься 3 дня без пропусков',           check:s=>s.streak>=3},
  {id:'streak7',  icon:'🔥', name:'Неделя подряд',     desc:'Заниматься 7 дней без пропусков',          check:s=>s.streak>=7},
  {id:'streak30', icon:'🌋', name:'Месяц подряд',      desc:'Заниматься 30 дней без пропусков',         check:s=>s.streak>=30},
  {id:'quiz',     icon:'🎯', name:'Без промаха',       desc:'Пройти тест из 10 слов без ошибок',        check:s=>s.perfectQuiz>=1},
  {id:'pairs',    icon:'⚡', name:'Молния',            desc:'Собрать «Пары» без единой ошибки',         check:s=>s.perfectPairs>=1},
  {id:'reverse',  icon:'⇄',  name:'В обе стороны',     desc:'Позаниматься в режиме RU → EN',          check:s=>s.reverseDone},
  {id:'day100',   icon:'💪', name:'Сотня за день',     desc:'100 ответов за один день',                 check:s=>s.dayAnswers>=100},
  {id:'cats',     icon:'🗂', name:'Многостаночник',    desc:'Слова из 5 разных категорий',              check:s=>s.cats>=5},
  {id:'import',   icon:'📥', name:'Импортёр',          desc:'Загрузить слова из файла',                 check:s=>s.imported>=1},
  {id:'ai',       icon:'✨', name:'С искрой',          desc:'Сгенерировать набор через ИИ',             check:s=>s.aiUsed>=1},
  {id:'owl',      icon:'🦉', name:'Совушка',           desc:'Заниматься между полуночью и 5 утра',      check:s=>s.owl},
  {id:'early',    icon:'🐓', name:'Ранняя пташка',     desc:'Заниматься до 7 утра',                     check:s=>s.early}
];

/* Промпт генерации набора. Ответ должен быть строго TSV — его парсит тот же
   parseTsv(), что и загруженный файл, поэтому лишний текст всё ломает. */
const AI_SYSTEM = `Ты составляешь наборы английских слов для человека, который учит английский с русского.
Отвечай ТОЛЬКО строками в формате TSV, по одной на слово, ровно четыре колонки через символ табуляции:
слово_на_английском<TAB>перевод_на_русский<TAB>пример_предложения_на_английском<TAB>категория

Правила:
- никаких заголовков, нумерации, markdown, кавычек и пояснений — только строки данных;
- пример предложения короткий (до 10 слов), естественный, содержит само слово;
- перевод краткий; если у слова два частых смысла — через точку с запятой;
- категория одинаковая для всех строк набора и совпадает с темой запроса;
- слова не повторяются.`;
