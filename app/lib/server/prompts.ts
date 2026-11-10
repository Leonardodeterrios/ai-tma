// Общие куски промптов: описание персонажа и правила «живого» текста.
// Один источник для плана, чаттера и помощника — поэтому все вкладки звучат одинаково.
import { ARCHETYPES, ARCHE_IDS, EMPTY_PERSONA, type Arche, type Persona } from '../persona';
import { clip } from './openai';

/** Принимает персонажа из запроса и чистит его (обрезает длинные поля, подставляет пустые) */
export function readPersona(input: unknown): Persona {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const archetype = ARCHE_IDS.includes(p.archetype as Arche) ? (p.archetype as Arche) : 'siren';
  const lang = p.languageMode === 'en' || p.languageMode === 'en_ru' ? p.languageMode : 'ru';
  const storyMode = p.storyMode === 'create' || p.storyMode === 'none' ? p.storyMode : 'have';
  return {
    ...EMPTY_PERSONA,
    name: clip(p.name, 60) || 'Без имени',
    age: clip(p.age, 10),
    archetype,
    character: clip(p.character, 600),
    lifeFacts: clip(p.lifeFacts, 800),
    storyMode,
    story: clip(p.story, 1500),
    examples: clip(p.examples, 1500),
    appearance: clip(p.appearance, 800),
    languageMode: lang,
    refs: [],
  };
}

export function personaBlock(p: Persona) {
  const a = ARCHETYPES[p.archetype];
  const story =
    p.storyMode === 'none'
      ? 'Истории нет, контент — лайфстайл без сюжета.'
      : p.story || 'История не расписана — придумай логичную под архетип.';
  return [
    `ПЕРСОНАЖ: ${p.name}${p.age ? `, ${p.age} лет` : ''}`,
    `Архетип: ${a.name} — ${a.voice}`,
    p.character && `Характер: ${p.character}`,
    p.lifeFacts && `Факты из жизни: ${p.lifeFacts}`,
    `История: ${story}`,
    p.examples
      ? `Как она пишет (копируй длину фраз, регистр, эмодзи, сленг, пунктуацию):\n${p.examples}`
      : 'Манера речи: как в живом мессенджере, строчными буквами, без официальщины.',
  ]
    .filter(Boolean)
    .join('\n');
}

export const LIVE_TEXT_RULES = `ПРАВИЛА ЖИВОГО ТЕКСТА:
- Конкретные детали вместо общих слов: что именно ела, где, что сломалось, что сказала соседка.
- Запрещено: длинные тире (—), «в современном мире», «девочки, привет», «давайте поговорим о», мотивационные лозунги, канцелярит.
- Не начинай посты одинаково. Не ставь эмодзи в каждую фразу.
- Тест: если этот текст мог написать кто угодно — перепиши.`;
