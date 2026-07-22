// src/utils/formatRoomValue.js
// Людський підпис значення питання кімнати — спільний для Summary.jsx і
// SharedEstimateView.jsx (патч 10.3), щоб шер-посилання показувало
// матеріали тим самим текстом, що й звичайний підсумок.
export const SKIP_VALUES = new Set(['Ні', 'ні', 'Без змін', 'Не потребується', 'Не обладнувати']);

// val → label з опцій, tier-об'єкти, словники «Інше». null = рядок не показуємо.
export function formatRoomValue(q, val) {
    const optLabel = (v) => (q.options?.find((o) => o.val === v)?.label) ?? v;
    if (val === undefined || val === null || val === '') return null;
    if (q.type === 'cards_with_tier') {
        if (!val?.type || SKIP_VALUES.has(val.type)) return null;
        return `${optLabel(val.type)}${val.tier && val.tier !== '-' ? ` (${val.tier})` : ''}`;
    }
    if (Array.isArray(val)) {
        const items = val.filter((v) => !SKIP_VALUES.has(v)).map(optLabel);
        return items.length ? items.join(', ') : null;
    }
    if (typeof val === 'object') {
        const parts = Object.entries(val)
            .filter(([k, v]) => v && v !== 0 && !SKIP_VALUES.has(k))
            .map(([k, v]) => (v === 'Так' ? k : `${k} (${v})`));
        return parts.length ? parts.join(', ') : null;
    }
    if (SKIP_VALUES.has(val)) return null;
    if (q.type === 'input_number') return parseFloat(val) > 0 ? `${val} шт` : null;
    return String(optLabel(val));
}
