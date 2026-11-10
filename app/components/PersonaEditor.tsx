'use client';
// Редактор персонажа: открывается по кнопке с именем в шапке.
import { useState } from 'react';
import { ARCHETYPES, ARCHE_IDS, LANGUAGE_OPTIONS, type Persona } from '../lib/persona';
import { ArchetypeTest, PhotoRefs, StoryFields } from './PersonaParts';
import { Btn, Chip, card, hint, input, label, textarea } from './ui';

export default function PersonaEditor({
  persona, onSave, onClose, onResetAll,
}: {
  persona: Persona;
  onSave: (p: Persona) => void;
  onClose: () => void;
  onResetAll: () => void;
}) {
  const [p, setP] = useState<Persona>(persona);
  const [testing, setTesting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));

  if (testing) {
    return <ArchetypeTest onDone={(a) => { set({ archetype: a }); setTesting(false); }} onCancel={() => setTesting(false)} />;
  }

  const block = { ...card, marginBottom: 12 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>Персонаж</span>
        <Btn kind="ghost" small onClick={onClose}>Закрыть</Btn>
      </div>

      <div style={block}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <span style={label}>Имя</span>
            <input value={p.name} onChange={(e) => set({ name: e.target.value })} style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={label}>Возраст</span>
            <input value={p.age} onChange={(e) => set({ age: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" style={input} />
          </div>
        </div>
        <span style={label}>Характер</span>
        <textarea value={p.character} onChange={(e) => set({ character: e.target.value })} rows={2} style={{ ...textarea, marginBottom: 14 }} />
        <span style={label}>Факты из жизни</span>
        <textarea value={p.lifeFacts} onChange={(e) => set({ lifeFacts: e.target.value })} rows={2} style={textarea} />
      </div>

      <div style={block}>
        <span style={label}>Архетип</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {ARCHE_IDS.map((a) => (
            <Chip key={a} active={p.archetype === a} onClick={() => set({ archetype: a })}>
              {ARCHETYPES[a].emoji} {ARCHETYPES[a].name}
            </Chip>
          ))}
        </div>
        <Btn kind="ghost" small onClick={() => setTesting(true)}>Пройти тест заново</Btn>
      </div>

      <div style={block}>
        <span style={label}>История</span>
        <StoryFields p={p} set={set} />
      </div>

      <div style={block}>
        <span style={label}>Как она пишет (самое важное)</span>
        <p style={hint}>2–3 настоящих сообщения. ИИ копирует длину фраз, сленг и эмодзи.</p>
        <textarea value={p.examples} onChange={(e) => set({ examples: e.target.value })} rows={5} style={{ ...textarea, marginBottom: 14 }} />
        <span style={label}>Язык ответов фанатам</span>
        <select value={p.languageMode} onChange={(e) => set({ languageMode: e.target.value as Persona['languageMode'] })} style={{ ...input, WebkitAppearance: 'none' }}>
          {LANGUAGE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div style={block}>
        <PhotoRefs refs={p.refs} onChange={(refs) => set({ refs, appearance: '' })} />
        <span style={{ ...label, marginTop: 14 }}>Внешность для промптов (на английском)</span>
        <p style={hint}>Заполнится сама при первом плане. Можно поправить вручную.</p>
        <textarea value={p.appearance} onChange={(e) => set({ appearance: e.target.value })} rows={3} placeholder="long wavy dark hair, hazel eyes, slim athletic figure…" style={textarea} />
      </div>

      <Btn full disabled={!p.name.trim()} onClick={() => onSave({ ...p, name: p.name.trim() })}>Сохранить</Btn>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', padding: 10 }}>
            Начать с нуля (удалить персонажа, план и фанатов)
          </button>
        ) : (
          <div style={{ ...card, borderColor: '#5a2020' }}>
            <p style={{ fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' }}>Точно? Всё удалится без возврата.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Btn kind="ghost" small onClick={() => setConfirmReset(false)}>Нет</Btn>
              <Btn kind="danger" small onClick={onResetAll}>Да, удалить всё</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
