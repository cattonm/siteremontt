// src/components/three/sceneConstants.js
import * as THREE from 'three';

export const WALL_HEIGHT = 2.4;
export const EXTERIOR_THICKNESS = 0.14;
export const INTERIOR_THICKNESS = 0.07;
export const FLOOR_THICKNESS = 0.05;
export const FLOOR_TOP = FLOOR_THICKNESS; // y-координата верхньої площини підлоги

// 3D-аудит п.8.5: розсинхрон WALL_H 2.7 (прев'ю кімнати) vs WALL_HEIGHT 2.4
// (тут, не використовувався) vs TEMPLATE_WALL_HEIGHT 1.6 (шаблон плану) —
// три різні "висоти стін" жили в трьох файлах. Прев'ю й план СВІДОМО різні
// (план зрізає стіни нижче, щоб було видно підлогу зверху) — тому лишаються
// двома константами, але тепер обидві звідси, іменем, а не літералом.
export const WALL_H_ROOM = 2.7; // висота стін у прев'ю кімнати (RoomPreview3D)
export const WALL_H_PLAN = 1.6; // зріз стін у плані квартири (нижче за реальні — щоб підлогу було видно)

// Чорна "кришка" зрізу стіни (лінія плану). Були #161616 (прев'ю) і
// #141414 (план) під різними іменами (CAP_COLOR/WALL_CAP_COLOR) в різних
// файлах — лишені різними (свідомо чи ні, зміна кольору тут не мета аудиту),
// але тепер іменованими константами з одного місця.
export const CAP_COLOR_ROOM = '#161616';
export const CAP_COLOR_PLAN = '#141414';

// Контур меблів/поверхонь (Outlined.jsx) — спільний для обох сцен, це
// вже й був один-єдиний реальний контур (жодного розсинхрону), просто жив
// локально в Outlined.jsx.
export const OUTLINE_COLOR = '#161616';

// Бюджет мобільних (3D-аудит п.8.6): на пристроях з малою RAM (deviceMemory —
// підтримує Chrome/Android, Safari/Firefox не підтримують — тоді просто 2)
// обмежуємо pixel ratio нижче типового максимуму 2, щоб не рендерити зайві
// пікселі на слабких GPU.
export const DPR_CAP = (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1.5 : 2;

// Контактна тінь під меблями: м'який радіальний "blob" на площині замість
// дорогого AO, і працює з frameloop="demand" (нічого не рахує щокадру).
// Текстура одна на всю сцену (лінива ініціалізація — canvas недоступний
// у SSR/тестовому середовищі).
let _blobTex = null;
export function getBlobTexture() {
    if (_blobTex) return _blobTex;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.32)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    _blobTex = new THREE.CanvasTexture(c);
    return _blobTex;
}
