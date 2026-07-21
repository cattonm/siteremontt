// src/data/furnitureLayouts.js
// Силуети меблів по типу кімнати — складені з примітивів (box/cylinder),
// без зовнішніх .glb-моделей (ті завжди платні або вимагають 3D-художника).
// Координати ЛОКАЛЬНІ всередині комірки кімнати: x у [0, slot.width],
// z у [0, slot.depth], y — висота від підлоги. GenericFurniture
// (RoomPreview3D.jsx, через layoutGeneric з utils/roomLayout.js) масштабує
// їх під реальні W/D кімнати відносно eталонного SLOT_SIZE з layoutEngine.js.
// Кольори навмисно стримані/монохромні (без яскравих кольорів) — це
// узгоджується із referensним "лінійним" архітектурним стилем, де меблі
// читаються контуром, а не кольоровою заливкою.
//
// УВАГА: координати тут підібрані вручну під конкретні SLOT_SIZE з
// layoutEngine.js. Якщо змінюєш розмір комірки для якогось типу кімнати —
// звір відповідний запис тут, інакше меблі можуть "вилізти" за межі кімнати.

const FILL = '#f4f4f7';
const FILL_2 = '#e3e3e9';
const WOOD = '#cdb293';
const DARK_ACCENT = '#3a3a3f';

export const FURNITURE_LAYOUTS = {
    room: [ // ліжко + тумбочка
        { shape: 'box', args: [1.4, 0.32, 1.9], pos: [1.15, 0.16, 1.05], color: '#e8e2d8' },
        { shape: 'box', args: [1.3, 0.10, 0.32], pos: [1.15, 0.37, 0.28], color: '#f7f5f1' },
        { shape: 'box', args: [0.4, 0.45, 0.4], pos: [2.05, 0.225, 0.30], color: WOOD },
    ],
    kitchen: [ // кутня стільниця + холодильник + маленький стіл зі стільцем
        { shape: 'box', args: [2.2, 0.85, 0.55], pos: [1.2, 0.425, 0.375], color: FILL },
        { shape: 'box', args: [0.55, 1.7, 0.55], pos: [2.45, 0.85, 0.40], color: FILL_2 },
        { shape: 'cylinder', args: [0.42, 0.42, 0.05, 24], pos: [0.85, 0.70, 1.55], color: WOOD },
        { shape: 'cylinder', args: [0.05, 0.05, 0.68, 12], pos: [0.85, 0.34, 1.55], color: WOOD },
        { shape: 'box', args: [0.38, 0.06, 0.38], pos: [0.85, 0.46, 2.05], color: FILL },
        { shape: 'box', args: [0.38, 0.4, 0.05], pos: [0.85, 0.66, 2.22], color: FILL },
    ],
    hallway: [ // лавка + дзеркало
        { shape: 'box', args: [1.1, 0.45, 0.35], pos: [0.65, 0.225, 0.27], color: WOOD },
        { shape: 'box', args: [0.5, 0.7, 0.04], pos: [0.65, 1.35, 0.06], color: '#cfe3ea' },
    ],
    bath: [ // унітаз + умивальник
        { shape: 'cylinder', args: [0.18, 0.21, 0.38, 16], pos: [1.25, 0.19, 1.25], color: '#ffffff' },
        { shape: 'box', args: [0.32, 0.32, 0.16], pos: [1.25, 0.55, 1.42], color: '#ffffff' },
        { shape: 'box', args: [0.55, 0.18, 0.40], pos: [0.35, 0.78, 0.30], color: '#ffffff' },
        { shape: 'cylinder', args: [0.06, 0.08, 0.78, 10], pos: [0.35, 0.39, 0.30], color: '#ffffff' },
    ],
    wardrobe: [ // штанга для одягу + полиця + коробка-органайзер
        { shape: 'cylinder', args: [0.015, 0.015, 1.0, 8], rotation: [0, 0, Math.PI / 2], pos: [0.65, 1.55, 0.18], color: DARK_ACCENT },
        { shape: 'box', args: [1.0, 0.04, 0.35], pos: [0.65, 1.85, 0.18], color: WOOD },
        { shape: 'box', args: [0.6, 0.5, 0.5], pos: [0.65, 0.25, 0.95], color: FILL_2 },
    ],
    balcony: [ // столик + крісло
        { shape: 'cylinder', args: [0.30, 0.30, 0.04, 20], pos: [1.1, 0.62, 0.55], color: WOOD },
        { shape: 'cylinder', args: [0.04, 0.04, 0.58, 10], pos: [1.1, 0.30, 0.55], color: DARK_ACCENT },
        { shape: 'box', args: [0.34, 0.05, 0.34], pos: [0.55, 0.42, 0.55], color: FILL },
        { shape: 'box', args: [0.34, 0.34, 0.04], pos: [0.55, 0.58, 0.70], color: FILL },
    ],
    basement: [ // стелаж + пральна машина
        { shape: 'box', args: [0.45, 1.6, 1.3], pos: [0.30, 0.80, 1.00], color: WOOD },
        { shape: 'box', args: [0.6, 0.85, 0.6], pos: [1.85, 0.425, 0.40], color: FILL },
        { shape: 'cylinder', args: [0.18, 0.18, 0.03, 20], rotation: [Math.PI / 2, 0, 0], pos: [1.85, 0.45, 0.715], color: DARK_ACCENT },
    ],
    attic: [ // коробки для зберігання
        { shape: 'box', args: [0.55, 0.5, 0.55], pos: [0.45, 0.25, 0.45], color: FILL_2 },
        { shape: 'box', args: [0.4, 0.35, 0.4], pos: [0.45, 0.675, 0.85], color: FILL },
    ],
};
