// src/utils/proceduralTextures.js
// ПРОЦЕДУРНІ ТЕКСТУРИ МАТЕРІАЛІВ (canvas -> THREE.CanvasTexture).
//
// Навіщо: у Kapitel вибір "Плитка / Паркет / Ламінат" МИТТЄВО міняє підлогу
// на рендері. У нас готових рендерів немає (і не буде без 3D-художника),
// а фото з каталогу — лайфстайл-кадри, які не можна мостити повтором.
// Тому кожен матеріал МАЛЮЄТЬСЯ КОДОМ на 512×512 canvas: паркет-ялинка,
// дошки ламінату, сітка плитки, мозаїка, шпалери, штукатурка тощо.
// Жодних файлів, жодного мережевого запиту, все синхронно і назавжди в кеші.
//
// Як користуватись:
//   const kind = getSurfaceKind('floor', 'Паркет');        // -> 'herringbone'
//   const tex  = getSurfaceTexture(kind,                    // текстура з повтором
//                  repeatsFor(kind, widthMeters),
//                  repeatsFor(kind, depthMeters));
//   const hex  = getSurfaceColor(kind);                     // середній колір
//
// ВАЖЛИВО: ключі в *_MAP — це РІВНО ті самі `val` з ROOM_QUESTIONS_CONFIG
// (src/data/questions.js). Додаєш нову опцію там — додай мапінг тут,
// інакше поверхня просто лишиться нейтрально-сірою (безпечний фолбек).

import * as THREE from 'three';

// ---------- Детермінований рандом (щоб текстура була однакова завжди) ----
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------- Дрібні художні хелпери ----------
function shade(hex, amt) { // amt: -1..1, затемнити/освітлити hex-колір
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Виконує малювання 9 разів зі зсувами ±size — все, що перетинає край
// полотна, "загортається" на протилежний бік. Це дає безшовний повтор для
// довільних мазків (подряпини короїда, плями, прожилки мармуру).
function withWrap(ctx, size, draw) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            ctx.save();
            ctx.translate(dx * size, dy * size);
            draw();
            ctx.restore();
        }
    }
}

function noiseDots(ctx, size, rng, count, colors, alpha = 0.5, dot = 1.4) {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
        ctx.fillRect(rng() * size, rng() * size, dot, dot);
    }
    ctx.globalAlpha = 1;
}

function marbleVeins(ctx, size, rng, color, alpha, count, width = 1.4) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    withWrap(ctx, size, () => {
        for (let i = 0; i < count; i++) {
            let x = rng() * size, y = rng() * size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            const steps = 4 + Math.floor(rng() * 4);
            for (let s = 0; s < steps; s++) {
                const nx = x + (rng() - 0.3) * size * 0.35;
                const ny = y + (rng() - 0.5) * size * 0.30;
                ctx.quadraticCurveTo(
                    x + (rng() - 0.5) * size * 0.2,
                    y + (rng() - 0.5) * size * 0.2,
                    nx, ny
                );
                x = nx; y = ny;
            }
            ctx.stroke();
        }
    });
    ctx.globalAlpha = 1;
}

// Горизонтальні дошки з розбіжкою швів (ламінат / кварц-вініл / вагонка)
function paintPlanks(ctx, size, rng, { rows, tones, gapColor, grain = 0, groove = false }) {
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // Дошки в ряду: старт зі зсувом, довжини 35–85% ширини, шов "загортається"
        let x = -rng() * size;
        while (x < size) {
            const len = size * (0.35 + rng() * 0.5);
            const tone = shade(tones[Math.floor(rng() * tones.length)], (rng() - 0.5) * 0.05);
            ctx.fillStyle = tone;
            ctx.fillRect(x, y, len, rowH);
            if (x < 0) ctx.fillRect(x + size, y, len, rowH); // шматок, що вилетів ліворуч
            // Волокна деревини — тонкі напівпрозорі горизонтальні лінії
            if (grain > 0) {
                ctx.globalAlpha = 0.07;
                ctx.strokeStyle = shade(tone, -0.25);
                for (let g = 0; g < grain; g++) {
                    const gy = y + rowH * (0.15 + rng() * 0.7);
                    ctx.beginPath();
                    ctx.moveTo(Math.max(x, 0), gy);
                    ctx.lineTo(Math.min(x + len, size), gy + (rng() - 0.5) * 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
            // Торцевий шов
            ctx.fillStyle = gapColor;
            const seamX = ((x + len) % size + size) % size;
            ctx.fillRect(seamX, y, 1, rowH);
            x += len;
        }
        // Поздовжній шов між рядами (для вагонки — світлий кант + темний паз)
        if (groove) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(0, y + 1, size, 1);
            ctx.fillStyle = gapColor;
            ctx.fillRect(0, y + rowH - 2, size, 2);
        } else {
            ctx.fillStyle = gapColor;
            ctx.fillRect(0, y + rowH - 1, size, 1);
        }
    }
}

// Сітка плитки з "вразбіжку" (offset 0.5 = зсув кожного другого ряду)
function paintTiles(ctx, size, rng, { cols, rows, grout, base, jitter = 0.04, offset = 0, cloud = true, groutW = 2 }) {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, size, size);
    const tw = size / cols, th = size / rows;
    for (let r = 0; r < rows; r++) {
        const shift = ((r % 2) * offset * tw) % tw;
        for (let c = -1; c <= cols; c++) {
            const x = c * tw + shift, y = r * th;
            const tone = shade(base, (rng() - 0.5) * jitter);
            ctx.fillStyle = tone;
            ctx.fillRect(x + groutW / 2, y + groutW / 2, tw - groutW, th - groutW);
            if (cloud) { // легка "хмарка" тону всередині плитки, щоб не була пласкою
                const g = ctx.createRadialGradient(
                    x + tw * (0.3 + rng() * 0.4), y + th * (0.3 + rng() * 0.4), 1,
                    x + tw / 2, y + th / 2, Math.max(tw, th) * 0.7
                );
                g.addColorStop(0, 'rgba(255,255,255,0.10)');
                g.addColorStop(1, 'rgba(0,0,0,0.05)');
                ctx.fillStyle = g;
                ctx.fillRect(x + groutW / 2, y + groutW / 2, tw - groutW, th - groutW);
            }
        }
    }
}

// Паркет "ялинка": колонки з діагональними дошками ±45°.
// Періоди підібрані так, щоб полотно було безшовним і по X, і по Y.
function paintHerringbone(ctx, size, rng, tones, gapColor) {
    const cols = 4;
    const colW = size / cols;
    const pitch = size / 8 / Math.SQRT2 * Math.SQRT2; // = size/8 по вертикалі
    for (let c = 0; c < cols; c++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(c * colW, 0, colW, size);
        ctx.clip();
        ctx.translate(c * colW + colW / 2, size / 2);
        ctx.rotate((c % 2 === 0 ? 1 : -1) * Math.PI / 4);
        const L = size * 1.6; // із запасом, кліп обріже
        const n = Math.ceil(L / pitch) + 2;
        for (let i = -n; i <= n; i++) {
            const y = i * pitch;
            ctx.fillStyle = shade(tones[Math.floor(rng() * tones.length)], (rng() - 0.5) * 0.06);
            ctx.fillRect(-L / 2, y, L, pitch - 1.2);
            ctx.fillStyle = gapColor;
            ctx.fillRect(-L / 2, y + pitch - 1.2, L, 1.2);
        }
        ctx.restore();
        // Межа між колонками
        ctx.fillStyle = gapColor;
        ctx.fillRect(c * colW - 0.6, 0, 1.2, size);
    }
}

// Вертикальні дерев'яні рейки на темній основі (обшивка рейками)
function paintSlats(ctx, size, rng, tones, backColor) {
    ctx.fillStyle = backColor;
    ctx.fillRect(0, 0, size, size);
    const slats = 8;
    const w = size / slats;
    for (let i = 0; i < slats; i++) {
        const tone = shade(tones[Math.floor(rng() * tones.length)], (rng() - 0.5) * 0.05);
        ctx.fillStyle = tone;
        ctx.fillRect(i * w + w * 0.12, 0, w * 0.76, size);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(i * w + w * 0.12, 0, 2, size); // світлий кант
        ctx.globalAlpha = 1;
    }
}

// ---------- Каталог матеріалів ----------
// m     — скільки метрів реального світу вміщує ОДИН повтор текстури
// color — репрезентативний колір (для плоских заливок/фолбеку)
// paint — функція малювання на canvas
const KINDS = {
    laminate: {
        m: 1.28, color: '#c9a877',
        paint: (ctx, s, rng) => paintPlanks(ctx, s, rng, {
            rows: 6, tones: ['#cdaa79', '#c19a66', '#d6b98c'], gapColor: '#8a6b42', grain: 3,
        }),
    },
    herringbone: {
        m: 1.1, color: '#b3854f',
        paint: (ctx, s, rng) => paintHerringbone(ctx, s, rng,
            ['#b98a55', '#a97a49', '#c39763'], '#6e5230'),
    },
    vinyl: {
        m: 1.22, color: '#b8b1a7',
        paint: (ctx, s, rng) => {
            paintPlanks(ctx, s, rng, {
                rows: 5, tones: ['#b9b2a8', '#c4beb4', '#aca69c'], gapColor: '#8d867c', grain: 1,
            });
            noiseDots(ctx, s, rng, 500, ['#9c958b', '#d0cabf'], 0.10);
        },
    },
    tile60: { // керамограніт 60×60
        m: 1.2, color: '#dedee1',
        paint: (ctx, s, rng) => paintTiles(ctx, s, rng, {
            cols: 2, rows: 2, grout: '#c2c2c9', base: '#e0e0e3',
        }),
    },
    tile12060: { // плитка 120×60 "вразбіжку"
        m: 2.4, color: '#dcdcdf',
        paint: (ctx, s, rng) => paintTiles(ctx, s, rng, {
            cols: 2, rows: 4, grout: '#c0c0c7', base: '#dedee1', offset: 0.5,
        }),
    },
    tileLarge: { // великоформатний керамограніт з мармуровими прожилками
        m: 2.0, color: '#e2e2e5',
        paint: (ctx, s, rng) => {
            paintTiles(ctx, s, rng, { cols: 1, rows: 1, grout: '#c6c6cc', base: '#e4e4e7', cloud: false, groutW: 3 });
            marbleVeins(ctx, s, rng, '#b7b7bf', 0.45, 5, 1.6);
            marbleVeins(ctx, s, rng, '#cfcfd6', 0.30, 7, 0.9);
        },
    },
    mosaic: {
        m: 0.36, color: '#d4d7db',
        paint: (ctx, s, rng) => paintTiles(ctx, s, rng, {
            cols: 12, rows: 12, grout: '#b6bbc3', base: '#d8dbdf', jitter: 0.10, cloud: false, groutW: 2,
        }),
    },
    apronTile: { // дрібна плитка фартуха 10×10 см
        m: 0.6, color: '#dfe1e4',
        paint: (ctx, s, rng) => paintTiles(ctx, s, rng, {
            cols: 6, rows: 6, grout: '#bcc0c7', base: '#e1e3e6', jitter: 0.06, cloud: false, groutW: 2,
        }),
    },
    stoneSlab: { // темний камінь стільниці/фартуха з білими прожилками
        m: 1.6, color: '#26272b',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#232427';
            ctx.fillRect(0, 0, s, s);
            marbleVeins(ctx, s, rng, '#f2f2f0', 0.55, 4, 1.5);
            marbleVeins(ctx, s, rng, '#9a9a9c', 0.30, 6, 0.8);
        },
    },
    linoleum: {
        m: 1.0, color: '#d9d4c8',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#d9d4c8';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 2200, ['#c6c0b2', '#e6e1d6', '#bab4a6'], 0.5);
        },
    },
    wallpaper: {
        m: 1.06, color: '#efe9df',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#f0ebe1';
            ctx.fillRect(0, 0, s, s);
            // Три ШИРОКІ ледь помітні смуги (замість частих вузьких, які на
            // стіні зливались у "решітку")
            ctx.fillStyle = 'rgba(146,130,106,0.05)';
            const bands = 3;
            for (let i = 0; i < bands; i++) {
                ctx.fillRect((i + 0.25) * (s / bands), 0, (s / bands) * 0.5, s);
            }
            // Зерно паперу
            noiseDots(ctx, s, rng, 900, ['#e4dccd', '#f7f3ea'], 0.3);
            // Делікатний мотив — дрібні крапки в шаховому порядку
            ctx.fillStyle = 'rgba(148,132,108,0.16)';
            const step = s / 8;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const x = c * step + (r % 2 ? step / 2 : 0);
                    ctx.beginPath();
                    ctx.arc(x, r * step + step / 2, 1.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        },
    },
    screed: { // чорнова стяжка — ДЕФОЛТ підлоги, поки матеріал не обрано
        m: 1.2, color: '#e3e1dd',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#e4e2de';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 2000, ['#d8d5cf', '#eeece8', '#cfccc5'], 0.4);
            // Сліди затирання — широкі ледь темніші дуги
            ctx.strokeStyle = 'rgba(120,116,108,0.05)';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            withWrap(ctx, s, () => {
                for (let i = 0; i < 7; i++) {
                    ctx.beginPath();
                    ctx.arc(rng() * s, rng() * s, s * (0.15 + rng() * 0.25), rng() * 6.3, rng() * 6.3);
                    ctx.stroke();
                }
            });
        },
    },
    plaster: { // декоративна штукатурка — піщане зерно
        m: 1.0, color: '#eceae4',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#eceae4';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 2600, ['#dcd8ce', '#f7f5ef', '#cfcabf'], 0.45);
        },
    },
    paint: {
        m: 1.0, color: '#f1efe9',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#f1efe9';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 400, ['#e6e3da'], 0.25);
        },
    },
    primer: { // грунтовка без фарбування — сірі плями шпаклівки
        m: 1.0, color: '#e9e7e2',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#e9e7e2';
            ctx.fillRect(0, 0, s, s);
            withWrap(ctx, s, () => {
                for (let i = 0; i < 9; i++) {
                    const x = rng() * s, y = rng() * s, r = s * (0.08 + rng() * 0.16);
                    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
                    g.addColorStop(0, 'rgba(190,186,178,0.35)');
                    g.addColorStop(1, 'rgba(190,186,178,0)');
                    ctx.fillStyle = g;
                    ctx.fillRect(x - r, y - r, r * 2, r * 2);
                }
            });
        },
    },
    koroid: { // "короїд" — штукатурка з борозенками
        m: 1.0, color: '#e7e4dc',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#e7e4dc';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 900, ['#dcd8ce'], 0.4);
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            withWrap(ctx, s, () => {
                for (let i = 0; i < 260; i++) {
                    const x = rng() * s, y = rng() * s;
                    const a = rng() * Math.PI, len = 6 + rng() * 16;
                    ctx.strokeStyle = rng() > 0.5 ? 'rgba(140,133,120,0.5)' : 'rgba(255,255,255,0.6)';
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
                    ctx.stroke();
                }
            });
        },
    },
    vagonka: { // горизонтальні дошки з пазом
        m: 0.84, color: '#d3b184',
        paint: (ctx, s, rng) => paintPlanks(ctx, s, rng, {
            rows: 7, tones: ['#d6b486', '#cca873', '#debf92'], gapColor: '#96784e', grain: 2, groove: true,
        }),
    },
    slats: { // вертикальні дерев'яні рейки
        m: 0.56, color: '#caa06b',
        paint: (ctx, s, rng) => paintSlats(ctx, s, rng,
            ['#cda36c', '#c1965f', '#d7b07c'], '#3a342c'),
    },
    whitewash: {
        m: 1.0, color: '#f7f6f2',
        paint: (ctx, s, rng) => {
            ctx.fillStyle = '#f7f6f2';
            ctx.fillRect(0, 0, s, s);
            noiseDots(ctx, s, rng, 700, ['#eceae4', '#ffffff'], 0.35);
        },
    },
};

// ---------- Мапінг: поле питання + val опції -> вид текстури ----------
const FLOOR_MAP = {
    'Ламінат': 'laminate',
    'Паркет': 'herringbone',
    'Кварц вініл': 'vinyl', 'Кварц-вініл': 'vinyl', 'Кварцвініл': 'vinyl',
    'Керамограніт': 'tile60',
    'Керамограніт/Плитка до 120*60': 'tile12060',
    'Великоформатний керамограніт': 'tileLarge',
    'Мозаїка': 'mosaic',
    'Лінолеум': 'linoleum',
};
const WALL_MAP = {
    'Шпалери': 'wallpaper',
    'Декоративна штукатурка': 'plaster',
    'Фарбування': 'paint',
    'Грунтовка без фарбування': 'primer',
    'Вагонка': 'vagonka',
    'Короїд': 'koroid',
    'Обшивка деревʼяними рейками': 'slats',
    // санвузол (wall_tile) — ті самі значення, що на підлозі
    'Мозаїка': 'mosaic',
    'Керамограніт/Плитка до 120*60': 'tile12060',
    'Великоформатний керамограніт': 'tileLarge',
};
const APRON_MAP = {
    'Керамограніт': 'apronTile',
    'Матеріал стільниці': 'stoneSlab',
};
const CEILING_MAP = {
    'Натяжна': 'paint',
    'Гіпсокартон': 'paint',
    'Побілка': 'whitewash',
};

const FIELD_MAPS = {
    floor: FLOOR_MAP,
    walls: WALL_MAP,
    wall_tile: WALL_MAP,
    apron: APRON_MAP,
    ceiling: CEILING_MAP,
};

// ---------- Публічне API ----------
export function getSurfaceKind(fieldId, value) {
    if (!value || typeof value !== 'string') return null;
    const map = FIELD_MAPS[fieldId];
    return (map && map[value]) || null;
}

export function getSurfaceColor(kind) {
    return KINDS[kind]?.color || '#d9d9dd';
}

// Скільки повторів текстури треба, щоб вкрити `meters` метрів поверхні.
// Квантовано до кроку 0.5 (3D-аудит п.8.3): rx/ry рахуються з W/D кімнати —
// неперервні значення, тож кожна зміна площі (15 → 15.5 → 16 м²) раніше
// породжувала нову CanvasTexture, яка ніколи не звільнялась. Крок 0.5
// підвищує влучання в кеш приблизно на порядок, а візуально непомітний.
export function repeatsFor(kind, meters) {
    const m = KINDS[kind]?.m || 1;
    const raw = Math.max(meters / m, 0.05);
    return Math.max(Math.round(raw / 0.5) * 0.5, 0.5);
}

// М'який LRU-ліміт для кешів текстур, ключованих rx/ry (на відміну від
// canvasCache/roughCanvasCache — ті ключуються лише kind'ом і тому скінченні
// самі по собі, чіпати їх не треба). Map зберігає порядок вставки — при
// читанні переносимо ключ у кінець (найсвіжіший), при переповненні видаляємо
// найстаріший і звільняємо його GPU-текстуру через dispose().
const TEXTURE_CACHE_LIMIT = 80;

function lruGet(cache, key) {
    if (!cache.has(key)) return undefined;
    const val = cache.get(key);
    cache.delete(key);
    cache.set(key, val);
    return val;
}

function lruSet(cache, key, val) {
    cache.set(key, val);
    if (cache.size > TEXTURE_CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        cache.get(oldestKey)?.dispose?.();
        cache.delete(oldestKey);
    }
}

const canvasCache = new Map();  // kind -> HTMLCanvasElement
const textureCache = new Map(); // `${kind}|rx|ry` -> THREE.CanvasTexture

function getCanvas(kind) {
    if (canvasCache.has(kind)) return canvasCache.get(kind);
    const def = KINDS[kind];
    if (!def || typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Сід залежить від назви виду — та сама текстура між сеансами
    let seed = 7;
    for (let i = 0; i < kind.length; i++) seed = (seed * 31 + kind.charCodeAt(i)) >>> 0;
    def.paint(ctx, size, mulberry32(seed));
    canvasCache.set(kind, canvas);
    return canvas;
}

// Синхронно повертає готову THREE-текстуру з потрібним повтором.
// Ніяких промісів: canvas малюється миттєво при першому зверненні.
export function getSurfaceTexture(kind, repeatX = 1, repeatY = 1) {
    const key = `${kind}|${repeatX.toFixed(2)}|${repeatY.toFixed(2)}`;
    const cached = lruGet(textureCache, key);
    if (cached) return cached;
    const canvas = getCanvas(kind);
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.repeat.set(repeatX, repeatY);
    lruSet(textureCache, key, tex);
    return tex;
}

// ---------- Roughness-карти (для PBR-матеріалів) ----------
// Для кожного kind малюємо другий canvas — грейскейл-карту шорсткості тим
// самим детермінованим rng. Світле = шорстке, темне = глянець. Старий API
// вище лишається без змін.
// Використання в компонентах:
//   const rough = getSurfaceRoughness(kind, rx, ry);
//   <meshStandardMaterial map={tex} roughnessMap={rough} roughness={1} />
// (roughness={1} обов'язково: значення множиться на карту.)

const ROUGHNESS_BASE = {
    laminate: 150, herringbone: 105, vinyl: 165, tile60: 70, tile12060: 70,
    tileLarge: 55, mosaic: 80, apronTile: 65, stoneSlab: 60, linoleum: 175,
    wallpaper: 235, screed: 230, plaster: 245, paint: 225, primer: 235,
    koroid: 245, vagonka: 140, slats: 130, whitewash: 240,
};

const roughCanvasCache = new Map();
const roughTextureCache = new Map();

function getRoughCanvas(kind) {
    if (roughCanvasCache.has(kind)) return roughCanvasCache.get(kind);
    if (typeof document === 'undefined') return null;
    const base = ROUGHNESS_BASE[kind] ?? 200;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    let seed = 13;
    for (let i = 0; i < kind.length; i++) seed = (seed * 31 + kind.charCodeAt(i)) >>> 0;
    const rng = mulberry32(seed);
    ctx.fillStyle = `rgb(${base},${base},${base})`;
    ctx.fillRect(0, 0, size, size);
    // Варіація тону: плями ±20 — блік "плаває" по поверхні, а не лежить рівно
    for (let i = 0; i < 260; i++) {
        const v = Math.max(20, Math.min(250, base + (rng() - 0.5) * 46)) | 0;
        ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
        const r = 4 + rng() * 26;
        ctx.beginPath();
        ctx.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Для дощатих видів — темніші (глянцевіші) смуги вздовж дощок
    if (['laminate', 'herringbone', 'vagonka', 'vinyl'].includes(kind)) {
        ctx.globalAlpha = 0.3;
        for (let r = 0; r < 6; r++) {
            const v = Math.max(30, base - 45 + (rng() * 30 | 0));
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(0, r * (size / 6) + 2, size, size / 6 - 4);
        }
        ctx.globalAlpha = 1;
    }
    roughCanvasCache.set(kind, canvas);
    return canvas;
}

export function getSurfaceRoughness(kind, repeatX = 1, repeatY = 1) {
    const key = `${kind}|${repeatX.toFixed(2)}|${repeatY.toFixed(2)}`;
    const cached = lruGet(roughTextureCache, key);
    if (cached) return cached;
    const canvas = getRoughCanvas(kind);
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    // БЕЗ colorSpace = SRGB: карти даних лишаються лінійними
    lruSet(roughTextureCache, key, tex);
    return tex;
}
