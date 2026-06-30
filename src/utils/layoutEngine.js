// src/utils/layoutEngine.js
// Розташування кімнат у ЄДИНОМУ зв'язаному будинку: кімнати в одному ряду
// прилягають впритул (спільна вертикальна стіна), ряди прилягають впритул
// один до одного (спільна горизонтальна стіна) — жодних розривів між
// кімнатами. Розмір комірки ФІКСОВАНИЙ за типом кімнати (SLOT_SIZE) і НЕ
// залежить від введеної площі — площа лишається тільки текстовим підписом.
// Оскільки кожен ряд починається з x=0, а ряди можуть мати різну сумарну
// ширину (різна кількість/типи кімнат), зовнішній контур виходить східчастим
// (як сходинки) — це навмисно: саме так читається силует на референсі
// Kapitel/remontnik (нерівний, "вкушений" периметр), а не суцільний
// прямокутник.
import { DEFAULT_TEMPLATE, resolveRowForType } from '../data/floorPlanTemplate';

// Габарити комірки (метри) — тільки для вигляду макета, не пов'язані з м².
export const SLOT_SIZE = {
    kitchen: { width: 2.8, depth: 2.2 },
    room: { width: 2.6, depth: 2.2 },
    hallway: { width: 1.8, depth: 1.4 },
    bath: { width: 1.6, depth: 1.6 },
    wardrobe: { width: 1.3, depth: 1.3 },
    balcony: { width: 2.2, depth: 1.1 },
    basement: { width: 2.4, depth: 2.0 },
    attic: { width: 2.4, depth: 2.0 },
};
const DEFAULT_SLOT = { width: 2.0, depth: 1.8 };

function slotFor(type) {
    return SLOT_SIZE[type] || DEFAULT_SLOT;
}

export function computeApartmentLayout(rooms, template = DEFAULT_TEMPLATE) {
    const rowsMap = new Map(template.rows.map((r) => [r.id, []]));

    rooms.forEach((room) => {
        const rowId = resolveRowForType(template, room.type);
        rowsMap.get(rowId).push(room);
    });

    const orderedRows = template.rows
        .map((r) => ({ id: r.id, items: rowsMap.get(r.id) }))
        .filter((r) => r.items.length > 0);

    if (orderedRows.length === 0) {
        return { rooms: [], building: { width: 0, depth: 0 }, walls: { interiorHorizontal: [], interiorVertical: [], exterior: [] } };
    }

    // --- 1. Розставляємо кімнати: кожен ряд з x=0, кімнати впритул ---
    const placedRooms = [];
    const interiorVertical = [];     // межі між кімнатами всередині ряду
    const rowMeta = [];              // { y0, y1, width } для кожного ряду — потрібно для контуру
    let cursorY = 0;

    orderedRows.forEach((row) => {
        // Глибина ряду уніфікована (максимум серед типів у цьому ряду) — інакше
        // кімната з меншою "природною" глибиною (напр. балкон 1.1м поруч із
        // санвузлом 1.6м) не діставала б до спільної стіни ряду й лишала діру.
        const rowDepth = Math.max(...row.items.map((room) => slotFor(room.type).depth));

        let cursorX = 0;
        row.items.forEach((room) => {
            const slot = slotFor(room.type);
            placedRooms.push({
                id: room.id, type: room.type, name: room.name,
                area: parseFloat(room.measurements?.floor) || 0,
                x: cursorX, y: cursorY, width: slot.width, depth: rowDepth,
            });
            cursorX += slot.width;
        });

        // вертикальні межі між кімнатами цього ряду (n-1 меж на n кімнат)
        let xWalk = 0;
        row.items.forEach((room, i) => {
            const slot = slotFor(room.type);
            xWalk += slot.width;
            if (i < row.items.length - 1) {
                interiorVertical.push({ x: xWalk, y0: cursorY, y1: cursorY + rowDepth });
            }
        });

        rowMeta.push({ y0: cursorY, y1: cursorY + rowDepth, width: cursorX });
        cursorY += rowDepth;
    });

    const buildingWidth = Math.max(...rowMeta.map((r) => r.width));
    const buildingDepth = cursorY;

    // --- 2. Горизонтальні межі між рядами: тільки там, де ряди фактично перекриваються по X ---
    const interiorHorizontal = [];
    for (let i = 0; i < rowMeta.length - 1; i++) {
        const a = rowMeta[i];
        const b = rowMeta[i + 1];
        const overlap = Math.min(a.width, b.width);
        if (overlap > 0.01) {
            interiorHorizontal.push({ y: a.y1, x0: 0, x1: overlap });
        }
    }

    // --- 3. Зовнішній контур (східчастий). Лівий бік завжди рівний (x=0),
    // бо кожен ряд стартує з нуля. Правий бік — сходинка на кожній зміні ширини.
    const exterior = [];
    // лівий бік — одна суцільна стіна на всю глибину будівлі
    exterior.push({ type: 'vertical', x: 0, y0: 0, y1: buildingDepth });
    // верхній і нижній торці
    exterior.push({ type: 'horizontal', y: 0, x0: 0, x1: rowMeta[0].width });
    exterior.push({ type: 'horizontal', y: buildingDepth, x0: 0, x1: rowMeta[rowMeta.length - 1].width });
    // правий бік по кожному ряду + "сходинки" там, де ширина рядів відрізняється
    rowMeta.forEach((row, i) => {
        exterior.push({ type: 'vertical', x: row.width, y0: row.y0, y1: row.y1 });
        if (i > 0) {
            const prev = rowMeta[i - 1];
            if (Math.abs(prev.width - row.width) > 0.01) {
                const x0 = Math.min(prev.width, row.width);
                const x1 = Math.max(prev.width, row.width);
                exterior.push({ type: 'horizontal', y: row.y0, x0, x1 });
            }
        }
    });

    return {
        rooms: placedRooms,
        building: { width: buildingWidth, depth: buildingDepth },
        walls: { interiorHorizontal, interiorVertical, exterior },
    };
}
