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

export type Persona = {
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
};

// Готовая Мия — для тех, кто хочет сначала просто попробовать
export const DEMO_PERSONA: Persona = {
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

export const STAGES: Record<number, { short: string; full: string }> = {
  1: { short: 'Знакомство', full: 'Знакомство: только познакомились, лёгкая болтовня' },
  2: { short: 'Флирт',      full: 'Флирт: он нравится, можно дразнить и намекать' },
  3: { short: 'Прогрев',    full: 'Прогрев: доверие есть, можно намекать на закрытый контент' },
  4: { short: 'PPV',        full: 'Первое PPV: предлагаем первый платный контент, мягко' },
  5: { short: 'Продажа',    full: 'Продажа: он уже покупал, можно предлагать прямее' },
};

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
