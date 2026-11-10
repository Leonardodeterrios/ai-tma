'use client';
// Первый вход: создаём персонажа за 2 минуты.
import { useState } from 'react';
import { DEMO_PERSONA, EMPTY_PERSONA, type Persona } from '../lib/persona';
import { ArchetypeCard, ArchetypeTest, PhotoRefs, StoryFields } from './PersonaParts';
import { Btn, card, hint, input, label, neon, textarea } from './ui';

type Step = 'welcome' | 'test' | 'story' | 'voice';

export default function Onboarding({ onFinish }: { onFinish: (p: Persona) => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [p, setP] = useState<Persona>(EMPTY_PERSONA);
  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));

  if (step === 'welcome') {
    return (
      <div style={{ paddingTop: 30, textAlign: 'center' }}>
        <div style={{ fontSize: 54, marginBottom: 10 }}>🧠</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px' }}>Создай своего персонажа</h1>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.5, margin: '0 0 28px' }}>
          Это займёт 2 минуты. Дальше контент-план, ответы фанатам и помощник будут знать её характер и голос.
        </p>
        <div style={{ ...card, textAlign: 'left', marginBottom: 24 }}>
          {['Тест на архетип: 9 вопросов', 'История персонажа', 'Её голос: пара примеров сообщений'].map((t, i) => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '7px 0' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#1a1a1a', color: neon, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: '#ccc' }}>{t}</span>
            </div>
          ))}
        </div>
        <Btn full onClick={() => setStep('test')}>Начать</Btn>
        <button onClick={() => onFinish(DEMO_PERSONA)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, padding: 16, cursor: 'pointer' }}>
          Попробовать на готовой Мие →
        </button>
      </div>
    );
  }

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
          <Btn kind="ghost" onClick={() => setStep('test')}>Назад</Btn>
          <Btn style={{ flex: 1 }} onClick={() => setStep('voice')}>Далее</Btn>
        </div>
      </div>
    );
  }

  // step === 'voice'
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

      <div style={{ ...card, marginBottom: 18 }}>
        <PhotoRefs refs={p.refs} onChange={(refs) => set({ refs, appearance: '' })} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" onClick={() => setStep('story')}>Назад</Btn>
        <Btn style={{ flex: 1 }} disabled={!canFinish} onClick={() => onFinish({ ...p, name: p.name.trim() })}>
          {canFinish ? 'Готово, персонаж создан' : 'Напиши имя'}
        </Btn>
      </div>
    </div>
  );
}
