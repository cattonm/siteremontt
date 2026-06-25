// src/components/AccordionGroup.jsx
import React, { useState } from 'react';
import {
    Layers, PaintRoller, PanelTop, Lightbulb, Droplet,
    LayoutGrid, Blinds, Sparkles, Wrench, Plus, Minus
} from 'lucide-react';
import { vibe } from '../utils/telegram';

const GROUP_ICONS = {
    'Підлога': Layers,
    'Стеля': PanelTop,
    'Стіни': PaintRoller,
    'Фартух': LayoutGrid,
    'Сантехніка': Droplet,
    'Освітлення': Lightbulb,
    'Підвіконня': Blinds,
    'Декор': Sparkles,
    'Інше': Wrench,
};

function isAnswered(question, room) {
    const val = room?.[question.id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return true;
}

export default function AccordionGroup({ name, questions, room, renderQuestion, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const Icon = GROUP_ICONS[name] || Wrench;
    const answeredCount = questions.filter((q) => isAnswered(q, room)).length;

    return (
        <div style={{ borderBottom: '1.5px solid var(--border-color)' }}>
            <div className="accordion-header" onClick={() => { vibe('light'); setOpen((o) => !o); }}>
                <div className="accordion-title">
                    <Icon size={18} />
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