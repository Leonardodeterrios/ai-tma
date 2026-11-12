'use client';
// Создание нового проекта: анкета для «Продюсирую себя» или для ИИ-модели.
import { useState } from 'react';
import { DEMO_PERSONA, EMPTY_PERSONA, KINDS, newId, type Kind, type Persona } from '../lib/persona';
import { ArchetypeCard, ArchetypeTest, LanguageFields, PhotoRefs, SelfBrandFields, SelfGoalFields, SelfPlatformFields, SelfVoiceFields, StoryFields } from './PersonaParts';
import { Btn, card, hint, input, label, neon, textarea } from './ui';

type Step = 'welcome' | 'test' | 'story' | 'voice' | 'brand' | 'goal' | 'platforms';

const STEPS: Record<Kind, string[]> = {
  model: ['Тест на архетип: 9 вопросов', 'История персонажа', 'Голос, язык и площадки'],
  self: ['Сайт, ниша и аудитория', 'Цель, продукт и кейсы', 'Площадки: что развиваем', 'Твой голос: тон и пара постов'],
};

export default function Onboarding({ kind, onFinish, onCancel }: { kind: Kind; onFinish: (p: Persona) => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [p, setP] = useState<Persona>({ ...EMPTY_PERSONA, id: newId(), kind, languageMode: 'ru' });
  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));
  const self = kind === 'self';
  const finish = () => onFinish({ ...p, name: p.name.trim() });
  const back = (to: Step) => <Btn kind="ghost" onClick={() => setStep(to)}>Назад</Btn>;

  if (step === 'welcome') {
    return (
      <div style={{ paddingTop: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>{KINDS[kind].emoji}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 10px' }}>{self ? 'Расскажи о своём блоге' : 'Создай персонажа модели'}</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 24px' }}>
          {self
            ? 'Пара минут, и контент-план, ответы подписчикам и помощник будут писать твоим голосом и вести к твоему продукту.'
            : 'Это займёт 2 минуты. Дальше контент-план, ответы фанатам и помощник будут знать её характер и голос.'}
        </p>
        <div style={{ ...card, textAlign: 'left', marginBottom: 22 }}>
          {STEPS[kind].map((t, i) => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '7px 0' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--raised)', color: neon, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: '#d4d4d8' }}>{t}</span>
            </div>
          ))}
        </div>
        <Btn full onClick={() => setStep(self ? 'brand' : 'test')}>Начать</Btn>
        {!self && (
          <button onClick={() => onFinish({ ...DEMO_PERSONA, id: newId() })} style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, padding: '16px 16px 0', cursor: 'pointer' }}>
            Попробовать на готовой Мие →
          </button>
        )}
        <div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, padding: 16, cursor: 'pointer' }}>← Назад</button>
        </div>
      </div>
    );
  }

  // ---------- «Продюсирую себя» ----------
  if (step === 'brand') {
    return (
      <div>
        <span style={label}>Как тебя зовут или как называется блог</span>
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="например: Аня или AI Creators" style={{ ...input, marginBottom: 14 }} />
        <SelfBrandFields p={p} set={set} />
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {back('welcome')}
          <Btn style={{ flex: 1 }} disabled={!p.name.trim()} onClick={() => setStep('goal')}>{p.name.trim() ? 'Далее' : 'Напиши имя'}</Btn>
        </div>
      </div>
    );
  }

  if (step === 'goal') {
    return (
      <div>
        <SelfGoalFields p={p} set={set} />
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {back('brand')}
          <Btn style={{ flex: 1 }} onClick={() => setStep('platforms')}>Далее</Btn>
        </div>
      </div>
    );
  }

  if (step === 'platforms') {
    return (
      <div>
        <SelfPlatformFields p={p} set={set} />
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {back('goal')}
          <Btn style={{ flex: 1 }} disabled={!p.platforms.length} onClick={() => setStep('voice')}>{p.platforms.length ? 'Далее' : 'Выбери площадку'}</Btn>
        </div>
      </div>
    );
  }

  if (self && step === 'voice') {
    return (
      <div>
        <SelfVoiceFields p={p} set={set} />
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {back('platforms')}
          <Btn style={{ flex: 1 }} onClick={finish}>Готово</Btn>
        </div>
      </div>
    );
  }

  // ---------- ИИ-модель ----------
  if (step === 'test') {
    return <ArchetypeTest onDone={(a) => { set({ archetype: a }); setStep('story'); }} onCancel={() => setStep('welcome')} />;
  }

  if (step === 'story') {
    return (
      <div>
        <ArchetypeCard a={p.archetype} />
        <span style={{ ...label, marginTop: 20 }}>История персонажа</span>
        <StoryFields p={p} set={set} />
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {back('test')}
          <Btn style={{ flex: 1 }} onClick={() => setStep('voice')}>Далее</Btn>
        </div>
      </div>
    );
  }

  const canFinish = p.name.trim().length > 0;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <span style={label}>Имя</span>
          <input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Мия" style={input} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={label}>Возраст</span>
          <input value={p.age} onChange={(e) => set({ age: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" placeholder="22" style={input} />
        </div>
      </div>

      <span style={label}>Характер</span>
      <textarea value={p.character} onChange={(e) => set({ character: e.target.value })} rows={2} placeholder="игривая, немного циничная, любит дразнить" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Факты из жизни</span>
      <textarea value={p.lifeFacts} onChange={(e) => set({ lifeFacts: e.target.value })} rows={2} placeholder="живёт в Бангкоке, кот Бублик, любит аниме" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Как она пишет (самое важное)</span>
      <p style={hint}>Вставь 2–3 настоящих сообщения. ИИ скопирует длину фраз, сленг и эмодзи.</p>
      <textarea value={p.examples} onChange={(e) => set({ examples: e.target.value })} rows={5} placeholder={'приветик) как прошёл день?\n\nблин, я сегодня вырубилась в 9 вечера 😅'} style={{ ...textarea, marginBottom: 14 }} />

      <div style={{ ...card, marginBottom: 14 }}>
        <LanguageFields p={p} set={set} />
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <SelfPlatformFields p={p} set={set} />
      </div>

      <div style={{ ...card, marginBottom: 18 }}>
        <PhotoRefs refs={p.refs} onChange={(refs) => set({ refs, appearance: '' })} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {back('story')}
        <Btn style={{ flex: 1 }} disabled={!canFinish} onClick={finish}>{canFinish ? 'Готово, персонаж создан' : 'Напиши имя'}</Btn>
      </div>
    </div>
  );
}
