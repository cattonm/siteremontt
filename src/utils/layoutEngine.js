// src/utils/layoutEngine.js
// Розташування кімнат на макеті — і тут принципова зміна: розмір комірки
// тепер ФІКСОВАНИЙ за типом кімнати і не залежить від введеної площі.
// Площа лишається лише цифрою-підписом над коміркою (як на макеті Kapitel,
// де ілюстрація не "дихає" від зміни м²). Групування по зонах (рядах)
// з floorPlanTemplate лишається — це впливає тільки на порядок/розташування.
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

const GAP = 0.35;     // відстань між кімнатами в одному ряду
const ROW_GAP = 0.6;  // відстань між рядами (зонами)

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
        return { rooms: [], building: { width: 0, depth: 0 } };
    }

    const placedRooms = [];
    let cursorY = 0;
    let maxRowWidth = 0;

    orderedRows.forEach((row) => {
        let cursorX = 0;
        let rowDepth = 0;

        row.items.forEach((room) => {
            const slot = SLOT_SIZE[room.type] || DEFAULT_SLOT;
            placedRooms.push({
                ...room,
                area: parseFloat(room.measurements?.floor) || 0,
                x: cursorX,
                y: cursorY,
                width: slot.width,
                depth: slot.depth,
            });
            cursorX += slot.width + GAP;
            rowDepth = Math.max(rowDepth, slot.depth);
        });

        maxRowWidth = Math.max(maxRowWidth, cursorX - GAP);
        cursorY += rowDepth + ROW_GAP;
    });

    return {
        rooms: placedRooms,
        building: { width: maxRowWidth, depth: Math.max(cursorY - ROW_GAP, 0) },
    };
}