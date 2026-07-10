// src/components/AccordionGroup.jsx
// Що змінилось порівняно з попередньою версією:
//  1. GROUP_ICONS переїхали в src/data/groupIcons.js — ті самі іконки
//     використовують хотспоти у RoomPhotoPreview (іконка на фото = іконка секції).
//  2. Компонент може бути "керованим": якщо передати пропси `open` і
//     `onToggle` — станом володіє батько (потрібно, щоб хотспот на фото
//     міг відкрити секцію). Без цих пропсів працює по-старому, сам по собі.
//  3. Пропс `required`: якщо секція обов'язкова і в ній ще нічого не
//     обрано — під назвою показується червона позначка «Необхідно обрати»
//     (як на референсі Kapitel).
import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { vibe } from '../utils/telegram';
import { GROUP_ICONS, DEFAULT_GROUP_ICON } from '../data/groupIcons';

function isAnswered(question, room) {
    const val = room?.[question.id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return true;
}

export default function AccordionGroup({
    name, questions, room, renderQuestion,
    defaultOpen = false,
    open: openProp,        // необов'язково: керований стан ззовні
    onToggle,              // необов'язково: (name, nextOpen) => void
    required = false,      // чи показувати «Необхідно обрати», поки пусто
}) {
    const [openLocal, setOpenLocal] = useState(defaultOpen);
    const isControlled = openProp !== undefined && openProp !== null;
    const open = isControlled ? openProp : openLocal;

    const answeredCount = questions.filter((q) => isAnswered(q, room)).length;
    const Icon = GROUP_ICONS[name] || DEFAULT_GROUP_ICON;
    const showRequired = required && answeredCount === 0;

    const toggle = () => {
        vibe('light');
        if (onToggle) onToggle(name, !open);
        if (!isControlled) setOpenLocal((o) => !o);
    };

    return (
        <div style={{ borderBottom: '1.5px solid var(--border-color)' }}>
            <div className="accordion-header" onClick={toggle}>
                <div className="accordion-title" style={{ alignItems: 'flex-start' }}>
                    <Icon size={18} style={{ marginTop: showRequired ? '2px' : 0 }} />
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {name}
                            {answeredCount > 0 && (
                                <span
                                    style={{
                                        background: 'var(--link-color)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        padding: '1px 7px',
                                    }}
                                >
                                    {answeredCount}/{questions.length}
                                </span>
                            )}
                        </div>
                        {showRequired && (
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#e31e24', marginTop: '2px' }}>
                                Необхідно обрати
                            </div>
                        )}
                    </div>
                </div>
                {open ? <Minus size={18} color="var(--hint-color)" /> : <Plus size={18} color="var(--hint-color)" />}
            </div>
            <div className={`accordion-content ${open ? 'open' : ''}`}>
                <div style={{ paddingBottom: '15px' }}>
                    {questions.map((q) => renderQuestion(q))}
                </div>
            </div>
        </div>
    );
}