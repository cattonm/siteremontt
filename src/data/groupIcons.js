// src/data/groupIcons.js
// Іконки секцій налаштувань. Спільний модуль для AccordionGroup (заголовки
// секцій) і RoomPhotoPreview (хотспоти на фото) — щоб іконка на фото
// гарантовано збігалася з іконкою секції, яку вона відкриває.
import {
    Layers, PaintRoller, PanelTop, Lightbulb, Droplet,
    LayoutGrid, Blinds, Sparkles, Wrench
} from 'lucide-react';

export const GROUP_ICONS = {
    'Підлога': Layers,
    'Стеля': PanelTop,
    'Стіни': PaintRoller,
    'Фартух': LayoutGrid,
    'Сантехніка': Droplet,
    'Освітлення': Lightbulb,
    'Підвіконня': Blinds,
    'Декор': Sparkles,
    'Інше': Wrench,
};

export const DEFAULT_GROUP_ICON = Wrench;