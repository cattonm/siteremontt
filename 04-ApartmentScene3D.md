// Патч 2: roughness-карти в src/utils/proceduralTextures.js
// ДОДАТИ в кінець файлу (нічого не ламає: старий API без змін).
//
// Ідея: для кожного kind малюємо другий canvas — грейскейл-карту шорсткості
// тим самим детермінованим rng. Світле = шорстке, темне = глянець.
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
    ctx.fillStyle = \`rgb(\${base},\${base},\${base})\`;
    ctx.fillRect(0, 0, size, size);
    // Варіація тону: плями ±20 — блік «плаває» по поверхні, а не лежить рівно
    for (let i = 0; i < 260; i++) {
        const v = Math.max(20, Math.min(250, base + (rng() - 0.5) * 46)) | 0;
        ctx.fillStyle = \`rgba(\${v},\${v},\${v},0.35)\`;
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
            ctx.fillStyle = \`rgb(\${v},\${v},\${v})\`;
            ctx.fillRect(0, r * (size / 6) + 2, size, size / 6 - 4);
        }
        ctx.globalAlpha = 1;
    }
    roughCanvasCache.set(kind, canvas);
    return canvas;
}

export function getSurfaceRoughness(kind, repeatX = 1, repeatY = 1) {
    const key = \`\${kind}|\${repeatX.toFixed(2)}|\${repeatY.toFixed(2)}\`;
    if (roughTextureCache.has(key)) return roughTextureCache.get(key);
    const canvas = getRoughCanvas(kind);
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    // БЕЗ colorSpace = SRGB: карти даних лишаються лінійними
    roughTextureCache.set(key, tex);
    return tex;
}
