// src/utils/materialFill.js
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';

// Чесний список: фото з /public/img, які є топ-видом близького плану
// без меблів/перспективи і тому безпечно мостяться повтором як справжня
// текстура. Більшість фото в каталозі — лайфстайл-кадри "в кімнаті"
// (видно вазу, штори, рулони...) — з них ми лише знімаємо середній колір,
// бо повтором вони виглядатимуть як шов з вазою, що дублюється.
// Поповнюй цей список, коли з'являться нові якісні topdown-фото.
export const TILEABLE_IMAGES = new Set([
    '/img/parket.jpeg',
    '/img/kvarzvinil.webp',
]);

const FALLBACK_COLOR = '#d9d9dd';

// ---- Кольори: один раз рахуємо середній колір фото через canvas ----
const colorCache = new Map();   // url -> hex
const colorPending = new Map(); // url -> Promise<hex>

function sampleColor(url) {
    if (colorCache.has(url)) return Promise.resolve(colorCache.get(url));
    if (colorPending.has(url)) return colorPending.get(url);

    const promise = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const size = 12;
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);
                let r = 0, g = 0, b = 0, n = 0;
                for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
                const hex = `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}`;
                colorCache.set(url, hex);
                resolve(hex);
            } catch {
                colorCache.set(url, FALLBACK_COLOR);
                resolve(FALLBACK_COLOR);
            }
        };
        img.onerror = () => { colorCache.set(url, FALLBACK_COLOR); resolve(FALLBACK_COLOR); };
        img.src = url;
    });

    colorPending.set(url, promise);
    return promise;
}

// ---- Текстури: завантажуємо раз на url, клонуємо під кожен унікальний repeat ----
const baseTextureCache = new Map();  // url -> Promise<THREE.Texture>
const sizedTextureCache = new Map(); // `${url}_${w}_${d}` -> THREE.Texture (clone)

function loadBaseTexture(url) {
    if (baseTextureCache.has(url)) return baseTextureCache.get(url);
    const promise = new Promise((resolve) => {
        new THREE.TextureLoader().load(url, (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.colorSpace = THREE.SRGBColorSpace;
            resolve(tex);
        });
    });
    baseTextureCache.set(url, promise);
    return promise;
}

// Знаходить img вибраної опції питання (наприклад floor/walls) для типу кімнати
export function findOptionImage(roomType, fieldId, value) {
    if (!value) return null;
    const question = (ROOM_QUESTIONS_CONFIG[roomType] || []).find((q) => q.id === fieldId);
    const option = question?.options?.find((o) => o.val === value);
    return option?.img || null;
}

// Колір матеріалу. Синхронно відомий результат (кеш/дефолт) рахується прямо
// під час рендеру — у useEffect лишається тільки реальний асинхронний кейс
// (фото ще не завантажене й не заміряне), щоб не сетати стейт синхронно
// з тіла ефекту без потреби.
export function useMaterialColor(roomType, fieldId, value) {
    const img = findOptionImage(roomType, fieldId, value);
    const [fetched, setFetched] = useState(null); // { key, color } | null

    useEffect(() => {
        if (!img || colorCache.has(img)) return undefined;
        let alive = true;
        sampleColor(img).then((hex) => { if (alive) setFetched({ key: img, color: hex }); });
        return () => { alive = false; };
    }, [img]);

    if (!img) return FALLBACK_COLOR;
    if (colorCache.has(img)) return colorCache.get(img);
    if (fetched && fetched.key === img) return fetched.color;
    return FALLBACK_COLOR;
}

// Текстура з повтором (тільки для фото з TILEABLE_IMAGES, інакше null) —
// той самий підхід: синхронний кеш читається прямо в рендері.
export function useTiledTexture(roomType, fieldId, value, repeatW, repeatD) {
    const img = findOptionImage(roomType, fieldId, value);
    const url = img && TILEABLE_IMAGES.has(img) ? img : null;
    const key = url ? `${url}_${repeatW.toFixed(2)}_${repeatD.toFixed(2)}` : null;
    const [fetched, setFetched] = useState(null); // { key, texture } | null

    useEffect(() => {
        if (!url || sizedTextureCache.has(key)) return undefined;
        let alive = true;
        loadBaseTexture(url).then((base) => {
            const clone = base.clone();
            clone.needsUpdate = true;
            clone.repeat.set(Math.max(repeatW, 0.5), Math.max(repeatD, 0.5));
            sizedTextureCache.set(key, clone);
            if (alive) setFetched({ key, texture: clone });
        });
        return () => { alive = false; };
    }, [url, key, repeatW, repeatD]);

    if (!key) return null;
    if (sizedTextureCache.has(key)) return sizedTextureCache.get(key);
    if (fetched && fetched.key === key) return fetched.texture;
    return null;
}

// Зручний комбінований хук: { color, texture } для однієї поверхні
export function useMaterialFill(roomType, fieldId, value, repeatW = 1, repeatD = 1) {
    const color = useMaterialColor(roomType, fieldId, value);
    const texture = useTiledTexture(roomType, fieldId, value, repeatW, repeatD);
    return { color, texture };
}