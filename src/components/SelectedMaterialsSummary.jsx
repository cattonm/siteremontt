// src/components/SelectedMaterialsSummary.jsx
import React from 'react';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';

export default function SelectedMaterialsSummary({ room }) {
    if (!room) return null;
    const questions = ROOM_QUESTIONS_CONFIG[room.type] || [];

    const chosen = questions.map(q => {
        const val = room[q.id];
        if (!val) return null;

        if (q.type === 'cards' && typeof val === 'string') {
            const opt = q.options.find(o => o.val === val);
            return opt?.img ? { label: opt.label, img: opt.img, question: q.text } : null;
        }
        if (q.type === 'cards_multiselect' && Array.isArray(val)) {
            for (const v of val) {
                const opt = q.options.find(o => o.val === v);
                if (opt?.img) return { label: opt.label, img: opt.img, question: q.text };
            }
            return null;
        }
        if (q.type === 'cards_with_tier' && val?.type) {
            const opt = q.options.find(o => o.val === val.type);
            return opt?.img ? { label: `${opt.label} (${val.tier})`, img: opt.img, question: q.text } : null;
        }
        return null;
    }).filter(Boolean);

    if (chosen.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--hint-color)', fontSize: '13px', background: 'var(--secondary-bg)', borderRadius: '12px' }}>
                Обери матеріали нижче — тут з'являться обрані варіанти
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {chosen.map((item, i) => (
                <div key={i} style={{ flex: '0 0 auto', width: '110px' }}>
                    <div style={{ width: '110px', height: '80px', borderRadius: '10px', overflow: 'hidden', background: 'var(--secondary-bg)' }}>
                        <img src={item.img} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--hint-color)', marginTop: '4px' }}>{item.question}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{item.label}</div>
                </div>
            ))}
        </div>
    );
}