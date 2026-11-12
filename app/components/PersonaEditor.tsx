'use client';
// Настройки проекта: открываются по кнопке с именем в шапке.
import { useState } from 'react';
import { ARCHETYPES, ARCHE_IDS, KINDS, type Persona } from '../lib/persona';
import { ArchetypeTest, LanguageFields, PhotoRefs, SelfBrandFields, SelfGoalFields, SelfPlatformFields, SelfVoiceFields, StoryFields } from './PersonaParts';
import { Btn, Chip, card, hint, input, label, textarea } from './ui';

export default function PersonaEditor({
  persona, onSave, onClose, onDelete,
}: {
  persona: Persona;
  onSave: (p: Persona) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [p, setP] = useState<Persona>(persona);
  const [testing, setTesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Persona>) => setP((prev) => ({ ...prev, ...patch }));
  const self = p.kind === 'self';

  if (testing) {
    return <ArchetypeTest onDone={(a) => { set({ archetype: a }); setTesting(false); }} onCancel={() => setTesting(false)} />;
  }

  const block = { ...card, marginBottom: 12 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{self ? 'Мой блог' : 'Персонаж'}</span>
        <Btn kind="ghost" small onClick={onClose}>Закрыть</Btn>
      </div>
      <p style={{ ...hint, marginBottom: 14 }}>{KINDS[p.kind].emoji} {KINDS[p.kind].title}</p>

      {self ? (
        <>
          <div style={block}>
            <span style={label}>Имя или название блога</span>
            <input value={p.name} onChange={(e) => set({ name: e.target.value })} style={{ ...input, marginBottom: 14 }} />
            <SelfBrandFields p={p} set={set} />
          </div>
          <div style={block}>
            <SelfGoalFields p={p} set={set} />
          </div>
          <div style={block}>
            <SelfPlatformFields p={p} set={set} />
          </div>
          <div style={block}>
            <SelfVoiceFields p={p} set={set} />
          </div>
          <div style={block}>
            <span style={label}>Твой путь и история</span>
            <p style={hint}>С чего начинала, что изменилось. ИИ будет брать отсюда сюжеты.</p>
            <textarea value={p.story} onChange={(e) => set({ story: e.target.value })} rows={4} style={textarea} />
          </div>
        </>
      ) : (
        <>
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
            <LanguageFields p={p} set={set} />
          </div>

          <div style={block}>
            <SelfPlatformFields p={p} set={set} />
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
            <textarea value={p.examples} onChange={(e) => set({ examples: e.target.value })} rows={5} style={textarea} />
          </div>

          <div style={block}>
            <PhotoRefs refs={p.refs} onChange={(refs) => set({ refs, appearance: '' })} />
            <span style={{ ...label, marginTop: 14 }}>Внешность для промптов (на английском)</span>
            <p style={hint}>Заполнится сама при первом плане. Можно поправить вручную.</p>
            <textarea value={p.appearance} onChange={(e) => set({ appearance: e.target.value })} rows={3} placeholder="long wavy dark hair, hazel eyes, slim athletic figure…" style={textarea} />
          </div>
        </>
      )}

      <Btn full disabled={!p.name.trim()} onClick={() => onSave({ ...p, name: p.name.trim() })}>Сохранить</Btn>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', padding: 10 }}>
            Удалить проект (вместе с планом и перепиской)
          </button>
        ) : (
          <div style={{ ...card, borderColor: '#5a2020' }}>
            <p style={{ fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' }}>Точно удалить «{persona.name}»? Вернуть не получится.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Btn kind="ghost" small onClick={() => setConfirmDelete(false)}>Нет</Btn>
              <Btn kind="danger" small onClick={onDelete}>Да, удалить</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
