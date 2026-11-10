// Общие куски промптов: описание персонажа и правила «живого» текста.
// Один источник для плана, ответов и помощника — поэтому все вкладки звучат одинаково.
// Два режима: kind = 'self' (продюсирую себя) и kind = 'model' (ИИ-модель).
import { ARCHETYPES, ARCHE_IDS, EMPTY_PERSONA, type Arche, type Persona } from '../persona';
import { clip } from './openai';

/** Принимает персонажа из запроса и чистит его (обрезает длинные поля, подставляет пустые) */
export function readPersona(input: unknown): Persona {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const archetype = ARCHE_IDS.includes(p.archetype as Arche) ? (p.archetype as Arche) : 'siren';
  const lang = p.languageMode === 'en' || p.languageMode === 'en_ru' ? p.languageMode : 'ru';
  const storyMode = p.storyMode === 'create' || p.storyMode === 'none' ? p.storyMode : 'have';
  const platforms = Array.isArray(p.platforms) ? p.platforms.filter((x): x is string => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 30)) : [];
  return {
    ...EMPTY_PERSONA,
    kind: p.kind === 'self' ? 'self' : 'model',
    name: clip(p.name, 60) || 'Без имени',
    age: clip(p.age, 10),
    archetype,
    character: clip(p.character, 600),
    lifeFacts: clip(p.lifeFacts, 800),
    storyMode,
    story: clip(p.story, 1500),
    examples: clip(p.examples, 2000),
    appearance: clip(p.appearance, 800),
    languageMode: lang,
    refs: [],
    niche: clip(p.niche, 600),
    audience: clip(p.audience, 800),
    offer: clip(p.offer, 600),
    tone: clip(p.tone, 100),
    platforms,
    focus: clip(p.focus, 30) || 'all',
    site: clip(p.site, 200),
    instagram: clip(p.instagram, 200),
    goal: clip(p.goal, 100),
    vision: clip(p.vision, 1000),
    proof: clip(p.proof, 2000),
    salesLevel: [1, 2, 3].includes(Number(p.salesLevel)) ? Number(p.salesLevel) : 2,
    goalFollowers: clip(p.goalFollowers, 20),
    goalRevenue: clip(p.goalRevenue, 20),
    goalDeadline: clip(p.goalDeadline, 20),
  };
}

/** Цели в цифрах одной строкой */
export function goalsLine(p: Persona) {
  const parts = [
    p.goalFollowers && `${p.goalFollowers} подписчиков`,
    p.goalRevenue && `${p.goalRevenue} ₽ в месяц`,
  ].filter(Boolean);
  return parts.length ? `Цель в цифрах: ${parts.join(' и ')}${p.goalDeadline ? ` к ${p.goalDeadline}` : ''}` : '';
}

export function personaBlock(p: Persona) {
  if (p.kind === 'self') {
    return [
      `АВТОР: ${p.name}. Реальный человек, ведёт свой блог от первого лица.`,
      p.niche && `О чём блог: ${p.niche}`,
      p.audience && `Кто читает и что у них болит: ${p.audience}`,
      p.goal && `Главная цель блога: ${p.goal}`,
      goalsLine(p),
      p.vision && `Каким автор видит свой блог: ${p.vision}`,
      p.offer ? `Что продаёт: ${p.offer}` : 'Пока ничего не продаёт — цель: рост, доверие, подписки и сообщения в личку.',
      p.site && `Сайт: ${p.site}`,
      p.proof && `ЦИФРЫ И КЕЙСЫ (опирайся на них, это главный материал для живых постов):\n${p.proof}`,
      p.tone && `Тон: ${p.tone}`,
      p.character && `О себе: ${p.character}`,
      p.lifeFacts && `Факты из жизни: ${p.lifeFacts}`,
      p.story && `Путь и история: ${p.story}`,
      p.examples
        ? `Как автор пишет (копируй длину фраз, регистр, эмодзи, словечки, пунктуацию):\n${p.examples}`
        : 'Манера: просто и живо, как подруга-практик рассказывает коллегам. Без канцелярита и поучений.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const a = ARCHETYPES[p.archetype];
  const story =
    p.storyMode === 'none'
      ? 'Истории нет, контент — лайфстайл без сюжета.'
      : p.story || 'История не расписана — придумай логичную под архетип.';
  return [
    `ПЕРСОНАЖ: ${p.name}${p.age ? `, ${p.age} лет` : ''} (вымышленная ИИ-модель)`,
    `Архетип: ${a.name} — ${a.voice}`,
    p.character && `Характер: ${p.character}`,
    p.lifeFacts && `Факты из жизни: ${p.lifeFacts}`,
    `История: ${story}`,
    p.platforms.length && `Площадки: ${p.platforms.join(', ')}`,
    goalsLine(p),
    p.examples
      ? `Как она пишет (копируй длину фраз, регистр, эмодзи, сленг, пунктуацию):\n${p.examples}`
      : 'Манера речи: как в живом мессенджере, строчными буквами, без официальщины.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Для реального человека нельзя выдумывать биографию */
export const NO_INVENT_RULES = `НЕ ВЫДУМЫВАЙ ФАКТЫ О ЖИЗНИ АВТОРА:
- Используй только факты, цифры и истории из анкеты выше. Нельзя придумывать прошлые работы, хобби, учеников, суммы, события.
- Если цифра или кейс ЕСТЬ в анкете — используй их прямо, без пометок.
- Пометку в квадратных скобках ставь, только если без конкретного примера пост развалится и его нет в анкете: [вставь кейс ученицы]. Максимум одна пометка на пост, и никогда не в конце как украшение.
- Автор — женщина, пиши в женском роде (сделала, решила), если в анкете не сказано иное.`;

export const LIVE_TEXT_RULES = `ПРАВИЛА ЖИВОГО ТЕКСТА:
- Пиши как живой человек в мессенджере, а не как реклама. Коротко. Одна мысль на пост.
- Первая строка — крючок: цифра, спорное утверждение, неожиданная деталь или боль читателя, сказанная её словами.
- Хребет: мысль → доказательство (цифра, случай, деталь) → вывод или один конкретный призыв.
- Конкретика вместо общих слов: не «зарабатывать на ИИ», а «первые 600 долларов за месяц»; не «много работы», а «3 вечера подряд до 2 ночи».
- Восклицательный знак — максимум один на пост. Эмодзи — максимум 1–2. Хэштеги только там, где их требует площадка.
- СТОП-ФРАЗЫ (инфоцыганщина, выдают ИИ — нельзя ни в каком виде): «не просто …, а …», «только представьте», «изменить свою жизнь», «жить так, как хочется», «из любого уголка мира», «мир заработка», «мечта стала реальностью», «секреты и фишки», «сообщество единомышленников», «как никто другой», «давайте сделаем это вместе», «хотите …? тогда …», «в современном мире», «давайте поговорим», «хочу поделиться», «недавно задумалась», «главное начать», «не бойтесь пробовать», «успешный успех», длинные тире.

ПРИМЕР (только про стиль, тему и детали не копируй). Плохо: «Свой бизнес на тортах — это не просто мечта, а реальность! Только представьте: вы работаете из любого уголка мира! Хотите изменить свою жизнь? Запишитесь на курс!»
Хорошо: «в марте я продала 4 торта. в октябре 61. рецепт не менялся. поменялось одно: я перестала снимать торты на кухне под жёлтой лампой. покажу 3 кадра, которые продают лучше любого текста. ссылка в шапке»
Чем лучше: личная конкретная деталь вместо лозунга, цифра, спокойный тон, один призыв.`;
