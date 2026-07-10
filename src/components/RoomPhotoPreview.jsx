// src/components/RoomPhotoPreview.jsx
// Пошарове фото-прев'ю кімнати (замість фотореалістичного 3D):
//   базове зображення + прозорі шари матеріалів + круглі хотспоти.
//
// Як це працює:
//  - Усі шари змонтовані в DOM ПОСТІЙНО, а видимість керується opacity.
//    Завдяки цьому: (1) браузер підвантажує картинки заздалегідь і перемикання
//    відбувається миттєво; (2) CSS transition по opacity дає плавний fade.
//  - Вибір користувача (room.floor, room.walls...) уже лежить у Zustand —
//    компонент просто читає ці поля з пропса `room`, нічого не пише.
//  - Клік по хотспоту НЕ змінює дані: він лише повідомляє батька
//    (onHotspotClick), яку секцію акордеону відкрити.
import React from 'react';
import { ROOM_PREVIEWS } from '../data/roomPreviewLayers';
import { GROUP_ICONS, DEFAULT_GROUP_ICON } from '../data/groupIcons';
import { vibe } from '../utils/telegram';

// Значення в сторі буває рядком (type: "cards"), масивом (cards_multiselect)
// або об'єктом { type, tier } (cards_with_tier). Зводимо до одного рядка,
// для якого існує шар у variants.
function resolveSelected(rawValue, variants) {
    if (!rawValue) return null;
    if (typeof rawValue === 'string') return variants[rawValue] ? rawValue : null;
    if (Array.isArray(rawValue)) return rawValue.find((v) => variants[v]) || null;
    if (typeof rawValue === 'object' && rawValue.type) return variants[rawValue.type] ? rawValue.type : null;
    return null;
}

export default function RoomPhotoPreview({ room, activeGroup, onHotspotClick }) {
    const cfg = ROOM_PREVIEWS[room.type];
    if (!cfg) return null;

    return (
        <div className="rpp-wrap" style={{ aspectRatio: cfg.aspect || 1.6 }}>
            {/* Базове зображення кімнати */}
            <img
                className="rpp-img"
                src={cfg.base}
                alt={room.name}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />

            {/* Шари матеріалів: порядок Object.entries = порядок у маніфесті */}
            {Object.entries(cfg.layers).map(([field, variants]) => {
                const selected = resolveSelected(room[field], variants);
                return Object.entries(variants).map(([val, src]) => (
                    <img
                        key={`${field}_${val}`}
                        className="rpp-img rpp-layer"
                        src={src}
                        alt=""
                        aria-hidden="true"
                        style={{ opacity: selected === val ? 1 : 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ));
            })}

            {/* Хотспоти: відсоткові координати => однаково стоять на всіх екранах */}
            {cfg.hotspots.map((h) => {
                const Icon = GROUP_ICONS[h.group] || DEFAULT_GROUP_ICON;
                const isActive = activeGroup === h.group;
                return (
                    <button
                        key={h.field}
                        type="button"
                        className={`rpp-hotspot ${isActive ? 'active' : ''}`}
                        style={{ left: `${h.x}%`, top: `${h.y}%` }}
                        aria-label={h.group}
                        onClick={() => { vibe('light'); onHotspotClick?.(h.group); }}
                    >
                        <Icon size={17} />
                    </button>
                );
            })}
        </div>
    );
}