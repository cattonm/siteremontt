// src/data/roomPreviewLayers.js
// Маніфест "пошарового" фото-прев'ю кімнати (RoomPhotoPreview.jsx).
//
// Ідея: ОДНЕ базове зображення кімнати (base) + прозорі шари-накладки
// (layers) для кожного варіанта матеріалу. Коли користувач обирає,
// наприклад, підлогу "Ламінат", поверх бази з fade-переходом вмикається
// шар floor -> "Ламінат". Так замість N×M повних рендерів (кожна
// комбінація підлога×стіни) потрібно лише N+M картинок.
//
// ВАЖЛИВО:
//  - Ключі в layers.floor / layers.walls / ... — це РІВНО ті самі `val`,
//    що в опціях ROOM_QUESTIONS_CONFIG (src/data/questions.js). Якщо val
//    зміниться там — онови й тут.
//  - Порядок полів у `layers` = порядок накладання шарів (нижній -> верхній).
//    Стіни малюємо ПІД підлогою, бо шар підлоги містить її контактну тінь.
//  - Хотспоти позиціонуються у ВІДСОТКАХ від розміру зображення (x, y),
//    тому працюють на будь-якій ширині екрана. `group` — назва секції
//    акордеону, яку відкриває клік (з groupQuestions.js).
//  - `enabled: false` = зображення ще не готові; RoomVisualizer показує
//    старий SelectedMaterialsSummary. Коли завантажиш файли в
//    /public/img/rooms/<тип>/ — постав true.

export const ROOM_PREVIEWS = {
    kitchen: {
        enabled: false, // TODO: постав true, коли файли будуть у /public/img/rooms/kitchen/
        aspect: 1.6,    // 1600×1000 => 1.6 (ширина / висота)
        base: '/img/rooms/kitchen/base.webp',
        layers: {
            walls: {
                'Шпалери': '/img/rooms/kitchen/walls_shpaleri.webp',
                'Декоративна штукатурка': '/img/rooms/kitchen/walls_shtukaturka.webp',
                'Фарбування': '/img/rooms/kitchen/walls_farbuvannya.webp',
                // "Грунтовка без фарбування" шару не має — показується база.
            },
            floor: {
                'Керамограніт': '/img/rooms/kitchen/floor_keramohranit.webp',
                'Кварц-вініл': '/img/rooms/kitchen/floor_kvarts_vinil.webp',
                'Ламінат': '/img/rooms/kitchen/floor_laminat.webp',
            },
            apron: {
                'Керамограніт': '/img/rooms/kitchen/apron_keramohranit.webp',
                'Матеріал стільниці': '/img/rooms/kitchen/apron_stilnytsia.webp',
            },
        },
        hotspots: [
            { field: 'floor', group: 'Підлога', x: 50, y: 88 },
            { field: 'walls', group: 'Стіни', x: 88, y: 45 },
            { field: 'apron', group: 'Фартух', x: 40, y: 47 },
            { field: 'light', group: 'Освітлення', x: 50, y: 8 },
        ],
    },

    room: {
        enabled: false, // TODO: постав true, коли файли будуть у /public/img/rooms/room/
        aspect: 1.6,
        base: '/img/rooms/room/base.webp',
        layers: {
            walls: {
                'Шпалери': '/img/rooms/room/walls_shpaleri.webp',
                'Декоративна штукатурка': '/img/rooms/room/walls_shtukaturka.webp',
                'Фарбування': '/img/rooms/room/walls_farbuvannya.webp',
            },
            floor: {
                'Ламінат': '/img/rooms/room/floor_laminat.webp',
                'Паркет': '/img/rooms/room/floor_parket.webp',
                'Кварц вініл': '/img/rooms/room/floor_kvarts_vinil.webp',
                'Керамограніт': '/img/rooms/room/floor_keramohranit.webp',
            },
        },
        hotspots: [
            { field: 'floor', group: 'Підлога', x: 50, y: 85 },
            { field: 'walls', group: 'Стіни', x: 85, y: 40 },
            { field: 'light', group: 'Освітлення', x: 50, y: 10 },
            { field: 'decor', group: 'Декор', x: 15, y: 45 },
        ],
    },

    // bath / hallway / balcony додаси за тим самим шаблоном, коли будуть рендери.
};

// Чи є для цього типу кімнати готове фото-прев'ю
export function hasRoomPreview(type) {
    const cfg = ROOM_PREVIEWS[type];
    return Boolean(cfg && cfg.enabled !== false);
}