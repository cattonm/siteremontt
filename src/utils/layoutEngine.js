// src/utils/layoutEngine.js
import { DEFAULT_TEMPLATE, resolveRowForType } from '../data/floorPlanTemplate';

const MIN_AREA = 1;

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
        return { rooms: [], building: { width: 0, depth: 0 }, walls: { interiorHorizontal: [], interiorVertical: [] } };
    }

    const anchorRow = orderedRows.find(r => r.id === template.anchorRowId) || orderedRows[0];
    const anchorArea = anchorRow.items.reduce((s, r) => s + r.area, 0);
    const buildingWidth = Math.sqrt(anchorArea * template.anchorAspectRatio);

    let cursorY = 0;
    const placedRooms = [];
    const interiorHorizontal = []; // межі між рядами (на всю ширину)
    const interiorVertical = [];   // межі між кімнатами в одному ряду

    orderedRows.forEach((row, rowIndex) => {
        const rowArea = row.items.reduce((s, r) => s + r.area, 0);
        const rowDepth = rowArea / buildingWidth;

        if (rowIndex > 0) {
            interiorHorizontal.push({ y: cursorY, x0: 0, x1: buildingWidth });
        }

        let cursorX = 0;
        row.items.forEach((room, i) => {
            const roomWidth = (room.area / rowArea) * buildingWidth;
            placedRooms.push({
                id: room.id, type: room.type, name: room.name, area: room.area,
                x: cursorX, y: cursorY, width: roomWidth, depth: rowDepth
            });
            cursorX += roomWidth;
            if (i < row.items.length - 1) {
                interiorVertical.push({ x: cursorX, y0: cursorY, y1: cursorY + rowDepth });
            }
        });

        cursorY += rowDepth;
    });

    return {
        rooms: placedRooms,
        building: { width: buildingWidth, depth: cursorY },
        walls: { interiorHorizontal, interiorVertical }
    };
}