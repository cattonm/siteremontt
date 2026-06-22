// src/utils/layoutEngine.js
import { DEFAULT_TEMPLATE, resolveRowForType } from '../data/floorPlanTemplate';

const MIN_AREA = 1; // м², щоб уникнути ділення на 0 для щойно створеної кімнати

/**
 * @returns {{ rooms: Array<{id,type,name,area,x,y,width,depth}>, building: {width, depth} }}
 * Координати в метрах, (0,0) — лівий верхній кут будівлі, вісь Y тут — це "вглиб" (стане Z у 3D).
 */
export function computeApartmentLayout(rooms, template = DEFAULT_TEMPLATE) {
    const rowsMap = new Map(template.rows.map(r => [r.id, []]));

    rooms.forEach(room => {
        const rowId = resolveRowForType(template, room.type);
        const area = Math.max(parseFloat(room.measurements?.floor) || 0, MIN_AREA);
        rowsMap.get(rowId).push({ ...room, area });
    });

    const orderedRows = template.rows
        .map(r => ({ id: r.id, items: rowsMap.get(r.id) }))
        .filter(r => r.items.length > 0);

    if (orderedRows.length === 0) {
        return { rooms: [], building: { width: 0, depth: 0 } };
    }

    const anchorRow = orderedRows.find(r => r.id === template.anchorRowId) || orderedRows[0];
    const anchorArea = anchorRow.items.reduce((s, r) => s + r.area, 0);
    // width * depth = anchorArea, width / depth = aspectRatio  =>  width = sqrt(area * aspect)
    const buildingWidth = Math.sqrt(anchorArea * template.anchorAspectRatio);

    let cursorY = 0;
    const placedRooms = [];

    orderedRows.forEach(row => {
        const rowArea = row.items.reduce((s, r) => s + r.area, 0);
        const rowDepth = rowArea / buildingWidth;

        let cursorX = 0;
        row.items.forEach(room => {
            const roomWidth = (room.area / rowArea) * buildingWidth;
            placedRooms.push({
                id: room.id, type: room.type, name: room.name, area: room.area,
                x: cursorX, y: cursorY, width: roomWidth, depth: rowDepth
            });
            cursorX += roomWidth;
        });

        cursorY += rowDepth;
    });

    return { rooms: placedRooms, building: { width: buildingWidth, depth: cursorY } };
}