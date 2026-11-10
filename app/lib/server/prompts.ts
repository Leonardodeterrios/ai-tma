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
  };
}

export function personaBlock(p: Persona) {
  if (p.kind === 'self') {
    return [
      `АВТОР: ${p.name}. Ведёт свой блог от первого лица, это реальный человек.`,
      p.niche && `О чём блог: ${p.niche}`,
      p.audience && `Кто читает и что у них болит: ${p.audience}`,
      p.offer ? `Что продаёт: ${p.offer}` : 'Пока ничего не продаёт — цель: рост, доверие, подписки и сообщения в личку.',
      p.platforms.length && `Площадки: ${p.platforms.join(', ')}`,
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
    p.examples
      ? `Как она пишет (копируй длину фраз, регистр, эмодзи, сленг, пунктуацию):\n${p.examples}`
      : 'Манера речи: как в живом мессенджере, строчными буквами, без официальщины.',
  ]
    .filter(Boolean)
    .join('\n');
}

export const LIVE_TEXT_RULES = `ПРАВИЛА ЖИВОГО ТЕКСТА:
- Конкретные детали вместо общих слов: что именно произошло, где, с кем, какая цифра.
- Запрещено: длинные тире (—), «в современном мире», «девочки, привет», «давайте поговорим о», мотивационные лозунги, канцелярит, учебные списки.
- Не начинай посты одинаково. Не ставь эмодзи в каждую фразу.
- Тест: если этот текст мог написать кто угодно — перепиши.`;
