// Персонаж, архетипы, тест и общие типы.
// Этот файл используют и экраны, и сервер — здесь только данные, без логики браузера.

export type Arche = 'siren' | 'mystery' | 'girl' | 'queen' | 'rebel' | 'muse' | 'huntress' | 'joker';
// ru — всё по-русски; en — всё по-английски;
// en_ru — фанату пишем на английском сленге, а тебе показываем русский перевод
export type LanguageMode = 'ru' | 'en' | 'en_ru';

export const LANGUAGE_OPTIONS: { id: LanguageMode; label: string }[] = [
  { id: 'ru', label: 'Только русский' },
  { id: 'en', label: 'Только английский (разговорный)' },
  { id: 'en_ru', label: 'Английский для фаната + русский перевод для меня' },
];
export type StoryMode = 'have' | 'create' | 'none';

// Два направления: продюсирую себя (блог, личный бренд) или ИИ-модель
export type Kind = 'self' | 'model';

export type Persona = {
  id: string;          // у каждого проекта свой id — по нему хранятся план, фанаты и чат
  kind: Kind;
  name: string;
  age: string;
  archetype: Arche;
  character: string;   // характер своими словами
  lifeFacts: string;   // город, питомец, хобби
  storyMode: StoryMode;
  story: string;       // история и сюжет персонажа
  examples: string;    // примеры сообщений — голос
  appearance: string;  // внешность на английском, для промптов фото
  languageMode: LanguageMode;
  refs: string[];      // фото-референсы (до 3), сжатые base64
  // --- для режима «Продюсирую себя» ---
  niche: string;       // о чём блог
  audience: string;    // кто читает, их боли
  offer: string;       // что продаёшь (курс, услуги…) или пусто
  tone: string;        // тон: дружеский, экспертный…
  platforms: string[]; // где ведёшь
  focus: string;       // 'all' — все площадки по воронке, или одна площадка
  site: string;        // сайт автора или продукта
  instagram: string;   // ссылка на инстаграм
  goal: string;        // главная цель блога
  vision: string;      // каким автор видит свой блог
  proof: string;       // цифры, кейсы, результаты — то, что делает посты живыми
  salesLevel: number;  // 1 мягко, 2 баланс, 3 активно
  // цели в цифрах
  goalFollowers: string; // сколько подписчиков хочу
  goalRevenue: string;   // сколько денег в месяц, ₽
  goalDeadline: string;  // к какому сроку (дата ГГГГ-ММ-ДД)
};

export const GOAL_CHIPS = ['Продажи продукта', 'Заявки на услуги', 'Рост подписчиков', 'Узнаваемость и личный бренд'];

export const SALES_LEVELS: Record<number, { title: string; sub: string; rule: string }> = {
  1: { title: 'Мягко', sub: '1 продающий пост в неделю', rule: 'Продаём мягко: 1 продающий пост в неделю (пятница), в остальные дни продукт не упоминаем.' },
  2: { title: 'Баланс', sub: '2–3 продажи + упоминания', rule: 'Баланс: 2–3 продающих поста в неделю, в полезных постах продукт можно упомянуть одной фразой как решение.' },
  3: { title: 'Активно', sub: 'призыв каждый день', rule: 'Активно: каждый день хотя бы в одном посте есть призыв к продукту, 3–4 прямых продающих поста в неделю, с дефицитом и дедлайном, если уместно.' },
};

/** Как работает каждая площадка — эти правила уходят в ИИ */
export const PLATFORM_RULES: Record<string, string> = {
  Threads: 'Threads — охват и комментарии. Провокационный тезис, спорное мнение, «непопулярное мнение:», вопрос-байт. Коротко: 1–2 части, вторую часть отдели строкой "---". Первая строка цепляет сама по себе. Можно со строчной буквы. Без хэштегов, без ссылок (максимум «ссылка в шапке»). В конце повод написать комментарий.',
  Instagram: 'Instagram — Reels на охват. hook: текст на экране / первая фраза в первые 1–2 секунды, должен остановить скролл. sound: какой звук (трендовый звук и его настроение, или голос за кадром). imagePrompt: раскадровка рилса 3–5 коротких кадров. text: подпись до 60 слов с призывом (сохрани, отправь подруге, напиши слово в директ). 3–5 хэштегов.',
  Telegram: 'Telegram — вторая ступень воронки: сюда приходят из Threads и Instagram, уже тёплые. Экспертно, но живо: личный опыт + польза + конкретика (цифры, шаги, инструменты, промпты, ошибки). 60–150 слов, абзацы по 1–3 предложения. Без хэштегов. В продающие дни — призыв к продукту.',
  YouTube: 'YouTube — идея ролика или Shorts. hook: первая фраза. text: название + 2–3 предложения, о чём ролик. imagePrompt: план ролика.',
  TikTok: 'TikTok — короткое видео. hook: первые 1–2 секунды. sound: трендовый звук или голос. imagePrompt: раскадровка. text: подпись до 30 слов.',
  VK: 'VK — пост-история с пользой, 60–120 слов, 2–3 хэштега.',
};
export const PLATFORM_COLORS: Record<string, string> = {
  Threads: '#e6e6e6', Instagram: '#ff6fb1', Telegram: '#5cb8ff', YouTube: '#ff5c5c', TikTok: '#6ff0e6', VK: '#7e9cff',
  Fanvue: '#c58bff', OnlyFans: '#4fc3ff',
};

export const KINDS: Record<Kind, { emoji: string; title: string; sub: string }> = {
  self:  { emoji: '🙋‍♀️', title: 'Продюсирую себя', sub: 'Блог, канал, личный бренд' },
  model: { emoji: '🤖', title: 'Продюсирую ИИ-модель', sub: 'Telegram, Fanvue, OnlyFans' },
};

export const SELF_PLATFORMS = ['Telegram', 'Threads', 'Instagram', 'YouTube', 'TikTok', 'VK'];
export const MODEL_PLATFORMS = ['Telegram', 'Fanvue', 'OnlyFans', 'Threads', 'Instagram'];
export const TONES = ['Дружеский', 'Экспертный, но простой', 'Дерзкий', 'Вдохновляющий', 'С юмором', 'Спокойный и честный'];
export const OFFER_CHIPS = ['курс', 'консультации', 'услуги', 'свой продукт', 'реклама в канале', 'пока ничего не продаю'];

/** Подписи, которые отличаются в двух режимах */
export const KIND_TEXT: Record<Kind, {
  chatterTab: string; person: string; personPlural: string; replyLabels: string[];
  stages: Record<number, { short: string; full: string }>;
}> = {
  model: {
    chatterTab: '💬 Чаттер', person: 'фанат', personPlural: 'фанаты',
    replyLabels: ['Тёплый', 'Игривый', 'Шаг вперёд'],
    stages: {
      1: { short: 'Знакомство', full: 'Знакомство: только познакомились, лёгкая болтовня' },
      2: { short: 'Флирт',      full: 'Флирт: он нравится, можно дразнить и намекать' },
      3: { short: 'Прогрев',    full: 'Прогрев: доверие есть, можно намекать на закрытый контент' },
      4: { short: 'PPV',        full: 'Первое PPV: предлагаем первый платный контент, мягко' },
      5: { short: 'Продажа',    full: 'Продажа: он уже покупал, можно предлагать прямее' },
    },
  },
  self: {
    chatterTab: '💬 Ответы', person: 'подписчик', personPlural: 'подписчики',
    replyLabels: ['Тёплый', 'С пользой', 'Шаг к покупке'],
    stages: {
      1: { short: 'Новый',       full: 'Новый: только подписался или впервые написал' },
      2: { short: 'Интерес',     full: 'Интерес: задаёт вопросы по теме' },
      3: { short: 'Доверие',     full: 'Доверие: делится проблемой, ему нужна польза и внимание' },
      4: { short: 'Предложение', full: 'Предложение: мягко предлагаем продукт или услугу' },
      5: { short: 'Клиент',      full: 'Клиент: уже купил, сопровождаем, просим отзыв, предлагаем следующее' },
    },
  },
};

export const ARCHETYPES: Record<Arche, { name: string; emoji: string; tagline: string; voice: string }> = {
  siren:    { name: 'Сирена',        emoji: '🔥', tagline: 'Соблазн и власть взгляда',             voice: 'соблазн и власть взгляда. Говорит намёками, дразнит, оставляет недосказанность. Короткие фразы, много подтекста.' },
  mystery:  { name: 'Загадка',       emoji: '🌙', tagline: 'Её не прочитать, и это цепляет',        voice: 'холодная недосказанность. Не отвечает прямо, задаёт вопросы, исчезает. Минимум эмодзи, максимум пауз.' },
  girl:     { name: 'Своя девчонка', emoji: '🌸', tagline: 'Тепло и легко, как со старым другом',   voice: 'тёплая, простая, как подруга. Пишет как в мессенджере: сбивчиво, искренне, с «блин» и «ой».' },
  queen:    { name: 'Королева',      emoji: '👑', tagline: 'Холод, статус, высокая цена',           voice: 'статус и дистанция. Говорит коротко, спокойно, без нужды нравиться. Дорогие детали, высокие требования.' },
  rebel:    { name: 'Бунтарка',      emoji: '⚡️', tagline: 'Не по правилам, непредсказуемо',        voice: 'дерзко и наперекор. Не извиняется, делает что хочет, провоцирует. Живой сленг.' },
  muse:     { name: 'Муза',          emoji: '🎨', tagline: 'Эстетика, свет, атмосфера',             voice: 'эстетика и атмосфера. Сенсорные детали: свет, запах, музыка. Немного мечтательности.' },
  huntress: { name: 'Охотница',      emoji: '🎯', tagline: 'Спорт, драйв, она выбирает сама',       voice: 'энергия и соревнование. Спорт, движение, азарт. Она выбирает сама.' },
  joker:    { name: 'Комедиантка',   emoji: '😜', tagline: 'Юмор и самоирония',                     voice: 'юмор и самоирония. Не боится быть смешной, шутит над собой, подкалывает его.' },
};

export const ARCHE_IDS = Object.keys(ARCHETYPES) as Arche[];

export const TEST: { q: string; options: { label: string; a: Arche }[] }[] = [
  { q: 'В бар заходит он и присылает тебе коктейль. Ты…', options: [
    { label: 'Поднимаю бокал и улыбаюсь, пусть гадает', a: 'mystery' },
    { label: 'Подхожу первой: «и что ты хочешь?»', a: 'huntress' },
    { label: 'Машу рукой, пусть садится рядом', a: 'girl' },
    { label: 'Жду, пока подойдёт сам', a: 'siren' },
  ]},
  { q: 'Идеальная пятница — это…', options: [
    { label: 'Ужин дома, вино, разговоры до трёх', a: 'muse' },
    { label: 'Место, где меня ещё никто не видел', a: 'siren' },
    { label: 'Клуб, громко, танцевать до утра', a: 'rebel' },
    { label: 'Плед, сериал, переписка с фанатами', a: 'girl' },
  ]},
  { q: 'В переписке тебе важнее…', options: [
    { label: 'Чтобы он гадал, что у меня в голове', a: 'mystery' },
    { label: 'Чтобы было смешно', a: 'joker' },
    { label: 'Чтобы он ловил каждый мой намёк', a: 'siren' },
    { label: 'Чтобы было по-настоящему тепло', a: 'muse' },
  ]},
  { q: 'Что цепляет в мужчине?', options: [
    { label: 'Уверенность и умение ждать', a: 'queen' },
    { label: 'Чувство юмора', a: 'joker' },
    { label: 'То, как он смотрит', a: 'siren' },
    { label: 'Надёжность', a: 'muse' },
  ]},
  { q: 'Твой стиль в одежде?', options: [
    { label: 'Дорого и строго по фигуре', a: 'queen' },
    { label: 'Дерзко, наперекор правилам', a: 'rebel' },
    { label: 'Мягко, уютно, но с изюмом', a: 'girl' },
    { label: 'Спортивно, всегда в движении', a: 'huntress' },
  ]},
  { q: 'Фанат написал слишком нагло. Ты…', options: [
    { label: 'Отвечу так, что он покраснеет', a: 'siren' },
    { label: 'Холодно поставлю на место', a: 'queen' },
    { label: 'Пошучу и переведу в игру', a: 'joker' },
    { label: 'Промолчу и удалю', a: 'mystery' },
  ]},
  { q: 'Что чаще всего в твоём контенте?', options: [
    { label: 'Эстетика: места, свет, моменты', a: 'muse' },
    { label: 'Я сама, крупным планом', a: 'siren' },
    { label: 'Смешные ситуации и мемы', a: 'joker' },
    { label: 'Спорт, приключения, драйв', a: 'huntress' },
  ]},
  { q: 'Твоя суперсила?', options: [
    { label: 'Он думает обо мне весь день', a: 'siren' },
    { label: 'Непредсказуемость', a: 'rebel' },
    { label: 'Лёгкость, с которой всё просто', a: 'girl' },
    { label: 'Холодный расчёт', a: 'queen' },
  ]},
  { q: 'Когда тебе скучно, ты…', options: [
    { label: 'Иду на тренировку или гулять далеко', a: 'huntress' },
    { label: 'Устраиваю себе шопинг', a: 'queen' },
    { label: 'Пишу фанату что-нибудь странное', a: 'joker' },
    { label: 'Меняю что-то в жизни: стрижку, город', a: 'rebel' },
  ]},
];

export const STORY_CHIPS = ['переезд в новый город', 'учёба в универе', 'работа в баре', 'путешествия', 'своя студия', 'знакомства в сети'];

export const EMPTY_PERSONA: Persona = {
  id: '',
  kind: 'model',
  name: '',
  age: '',
  archetype: 'siren',
  character: '',
  lifeFacts: '',
  storyMode: 'have',
  story: '',
  examples: '',
  appearance: '',
  languageMode: 'ru',
  refs: [],
  niche: '',
  audience: '',
  offer: '',
  tone: '',
  platforms: [],
  focus: 'all',
  site: '',
  instagram: '',
  goal: '',
  vision: '',
  proof: '',
  salesLevel: 2,
  goalFollowers: '',
  goalRevenue: '',
  goalDeadline: '',
};

// Готовая Мия — для тех, кто хочет сначала просто попробовать
export const DEMO_PERSONA: Persona = {
  ...EMPTY_PERSONA,
  kind: 'model',
  platforms: ['Telegram', 'Fanvue'],
  name: 'Мия',
  age: '22',
  archetype: 'siren',
  character: 'игривая, немного циничная, но тёплая с теми, кто рядом давно. Любит дразнить.',
  lifeFacts: 'живу в Бангкоке, есть кот Бублик, люблю аниме и ночные рынки',
  storyMode: 'have',
  story: 'полгода назад переехала из Москвы в Бангкок, снимает квартиру с видом на город, учится жить в новом ритме',
  examples: 'приветик) да всё супер, валяюсь пью кофе. а ты чем занят?\n\nблин, хочу просто чилить у океана и не париться о деньгах 💔\n\nне, серьёзно, ты правда так думаешь?',
  appearance: '',
  languageMode: 'ru',
  refs: [],
};

// ---------- Контент-план ----------
export type Goal = 'Прогрев' | 'Вовлечение' | 'Доверие' | 'Продажа';
export const GOALS: Goal[] = ['Прогрев', 'Вовлечение', 'Доверие', 'Продажа'];
export const GOAL_COLORS: Record<Goal, string> = {
  'Доверие': '#7ea6ff',
  'Вовлечение': '#c58bff',
  'Прогрев': '#ffb35c',
  'Продажа': '#ff6b8b',
};

export const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
export type DayName = (typeof DAYS)[number];

export type Post = {
  id: string;
  time: string;        // "09:00"
  format: string;      // Фото, Заметка, Вопрос...
  goal: Goal;
  text: string;
  hashtags: string;
  needsMedia: boolean;
  imagePrompt: string; // пусто, если фото не нужно
  platform?: string;   // Threads / Instagram / Telegram… (пусто — общий пост)
  hook?: string;       // хук для рилс / видео
  sound?: string;      // звук для рилс
  own?: boolean;       // написан «своими словами» — не стираем при пересборке
  rating: 1 | 0 | -1;  // лайк / ничего / дизлайк
};

export type DayPlan = { beat: string; goal: Goal; posts: Post[]; failed?: boolean };

export type PlanStore = { start: string; weeks: Record<number, Week> };
export type Taste = { liked: string[]; disliked: string[] };

export type Week = {
  storyline: string;   // сюжет недели одной строкой
  scenario: string;    // события недели от пользователя
  bans: string;        // запреты недели
  days: DayPlan[];     // ровно 7
};

// ---------- Чаттер ----------
export type Msg = { role: 'fan' | 'model'; text: string; time: number };
export type Fan = { id: string; name: string; notes: string; stage: number; history: Msg[] };
export type Reply = { text: string; translation: string };

// ---------- Рост: недельные показатели и стратегия ----------
export type Metrics = { followers: string; reach: string; comments: string; leads: string; sales: string; revenue: string; best: string };
export const EMPTY_METRICS: Metrics = { followers: '', reach: '', comments: '', leads: '', sales: '', revenue: '', best: '' };
export const METRIC_FIELDS: { key: Exclude<keyof Metrics, 'best'>; label: string; hint: string }[] = [
  { key: 'followers', label: 'Подписчики', hint: 'сколько всего сейчас' },
  { key: 'reach', label: 'Охваты / просмотры', hint: 'за неделю' },
  { key: 'comments', label: 'Комментарии и реакции', hint: 'за неделю' },
  { key: 'leads', label: 'Заявки в личку', hint: 'за неделю' },
  { key: 'sales', label: 'Продажи', hint: 'штук за неделю' },
  { key: 'revenue', label: 'Выручка, ₽', hint: 'за неделю' },
];
export type Recommendation = { text: string; why: string; platform?: string; example?: string };
export type Strategy = { summary: string; verdict: string; focus: string; recommendations: Recommendation[]; scenario: string; math?: string[] };
export type ReviewItem = { done: boolean | null; reason: string };
export type CheckIn = { metrics: Metrics; review: ReviewItem[]; confirmed: boolean; strategy?: Strategy; appliedToPlan?: boolean };
export type GrowthStore = { weeks: Record<string, CheckIn> }; // ключ — дата понедельника ГГГГ-ММ-ДД

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
