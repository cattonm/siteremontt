// src/utils/roomLayout.js
// 3D-аудит п.8.2: єдине джерело правди для розкладки кухні/санвузла.
// Раніше buildColliders(), KitchenSet/BathSet (рендер) і buildHotspots()
// незалежно одне від одного рахували ту саму геометрію (withFridge/setW/
// tubFits тощо) — будь-яка правка розкладки в одному місці без синхронної
// правки решти = прохід крізь меблі або невидима стіна. Тепер усі четверо
// читають ці похідні значення звідси.
import { FURNITURE_LAYOUTS } from '../data/furnitureLayouts';
import { SLOT_SIZE } from './layoutEngine';

const FRIDGE_W = 0.66;
const KITCHEN_X0 = 0.15;
const KITCHEN_MAX_SET_W = 3.4;
export const TUB_LEN = 1.65;
export const TUB_DEP = 0.75;
export const TUB_H = 0.52;

export function layoutKitchen(W) {
    const withFridge = W >= 2.55;
    const fridgeW = FRIDGE_W;
    const setW = Math.min(W - 0.3 - (withFridge ? fridgeW + 0.1 : 0), KITCHEN_MAX_SET_W);
    const x0 = KITCHEN_X0;
    const cx = x0 + setW / 2;
    return { withFridge, fridgeW, setW, x0, cx };
}

export function layoutBath(W, D, room) {
    const showerArr = (Array.isArray(room.shower) ? room.shower : []).filter((v) => v !== 'Не обладнувати');
    const hasTray = showerArr.includes('Піддон (акрил/камінь)');
    const hasTrap = showerArr.includes('Душовий трап (з плитки)');
    const glassWall = showerArr.includes('Скляна перегородка');
    const glassDoor = showerArr.includes('Скляна конструкція з дверима');
    const showerAny = hasTray || hasTrap || glassWall || glassDoor;

    // Душова зона в дальньому лівому куті
    const S = Math.min(0.95, W - 0.5, D - 0.5);
    const showerCx = 0.12 + S / 2;

    // Ванна вздовж задньої стіни, правіше душа. Якщо не влазить — уздовж
    // правого краю (перпендикулярно). Окремостояча відступає від стіни.
    const tubType = room.tub?.type && room.tub.type !== 'Не обладнувати' ? room.tub.type : null;
    const free = room.tub?.type === 'Окремостояча';
    const tubStartX = showerAny ? 0.12 + S + 0.2 : 0.15;
    const tubFits = W - tubStartX >= TUB_LEN + 0.1;
    const tubAlt = !tubFits && D >= TUB_LEN + 0.6;

    const toiletType = room.toilet?.type && room.toilet.type !== 'Ні' ? room.toilet.type : null;

    return {
        showerArr, hasTray, hasTrap, glassWall, glassDoor, showerAny, S, showerCx,
        tubType, free, tubStartX, tubFits, tubAlt, toiletType,
    };
}

// Загальні меблі (усі типи, крім kitchen/bath) — дані з FURNITURE_LAYOUTS,
// масштабовані під реальні розміри кімнати відносно "еталонного" слота.
export function layoutGeneric(type, W, D) {
    const pieces = FURNITURE_LAYOUTS[type] || null;
    const slot = SLOT_SIZE[type] || { width: 2.0, depth: 1.8 };
    return { pieces, slot, sx: W / slot.width, sz: D / slot.depth };
}

export function layoutRoom(type, W, D, room) {
    if (type === 'kitchen') return { type, kitchen: layoutKitchen(W) };
    if (type === 'bath') return { type, bath: layoutBath(W, D, room) };
    return { type, generic: layoutGeneric(type, W, D) };
}
