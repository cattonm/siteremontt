// src/utils/floorPlanLayout.js
// ГЕНЕРАТОР ПЛАНУ КВАРТИРИ З РЕАЛЬНИХ ПЛОЩ.
//
// Було: фіксований макет (apartmentTemplate.js) — 2 кімнати, 1 кухня,
// 1 санвузол. Кімнати користувача «прив'язувались» до готових зон, тому
// санвузол на 40 м² виглядав так само, як на 4 м², третя кімната не
// вміщалась узагалі, а людина бачила на плані НЕ СВОЮ квартиру.
//
// Стало: план будується з того, що людина ввела. Площі — пропорційні,
// кількість кімнат — довільна, стіни/двері/вікна генеруються автоматично.
//
// Алгоритм — squarified treemap: пакує прямокутники пропорційно площі,
// тримаючи пропорції близькими до квадрата (а не до довгих кишок).
// Це стандартний прийом для планів-схем: він не претендує на реальне
// планування (його ніхто не знає), але ЧЕСНО передає масштаб і склад.

const ASPECT = 1.35;            // цільові пропорції квартири (ширина/глибина)
const MIN_AREA = 3;             // кімната без площі все одно має бути видимою
const DOOR_W = 0.85;            // ширина дверного отвору
const WINDOW_MAX = 1.8;         // максимальна ширина вікна
const BALCONY_DEPTH = 1.5;      // балкон — вузька смуга на фасаді
const DETACHED_GAP = 0.9;       // відступ окремих блоків (підвал/мансарда)

const areaOf = (room) => Math.max(parseFloat(room.measurements?.floor) || 0, MIN_AREA);

// ---------- squarified treemap ----------
// Класична реалізація: беремо ряд плиток, доки середні пропорції
// поліпшуються, потім «викладаємо» ряд і переходимо до решти простору.
function worstRatio(row, length, scale) {
    const sum = row.reduce((a, r) => a + r.value, 0) * scale;
    if (sum === 0 || length === 0) return Infinity;
    const max = Math.max(...row.map((r) => r.value)) * scale;
    const min = Math.min(...row.map((r) => r.value)) * scale;
    return Math.max((length * length * max) / (sum * sum), (sum * sum) / (length * length * min));
}

function squarify(items, rect, out) {
    if (!items.length) return;
    const totalValue = items.reduce((a, r) => a + r.value, 0);
    const totalArea = rect.w * rect.d;
    if (totalArea <= 0 || totalValue <= 0) return;
    const scale = totalArea / totalValue;

    let remaining = [...items];
    let free = { ...rect };

    while (remaining.length) {
        const vertical = free.w >= free.d;          // ряд викладаємо вздовж коротшої сторони
        const length = vertical ? free.d : free.w;
        const row = [remaining[0]];
        let i = 1;
        while (i < remaining.length) {
            const next = [...row, remaining[i]];
            if (worstRatio(next, length, scale) > worstRatio(row, length, scale)) break;
            row.push(remaining[i]);
            i += 1;
        }

        const rowValue = row.reduce((a, r) => a + r.value, 0);
        const thickness = (rowValue * scale) / length;
        let offset = 0;
        row.forEach((item) => {
            const share = ((item.value * scale) / (rowValue * scale)) * length;
            out.push({
                ...item,
                x: vertical ? free.x : free.x + offset,
                z: vertical ? free.z + offset : free.z,
                w: vertical ? thickness : share,
                d: vertical ? share : thickness,
            });
            offset += share;
        });

        if (vertical) { free.x += thickness; free.w -= thickness; }
        else { free.z += thickness; free.d -= thickness; }
        remaining = remaining.slice(row.length);
    }
}

// ---------- стіни ----------
const near = (a, b) => Math.abs(a - b) < 1e-6;

/** Ребра прямокутника як 4 відрізки [a, b] у площині (x, z). */
function rectEdges(r) {
    return [
        { a: [r.x, r.z], b: [r.x + r.w, r.z] },                       // верх
        { a: [r.x, r.z + r.d], b: [r.x + r.w, r.z + r.d] },           // низ
        { a: [r.x, r.z], b: [r.x, r.z + r.d] },                       // ліво
        { a: [r.x + r.w, r.z], b: [r.x + r.w, r.z + r.d] },           // право
    ];
}

/** Ключ відрізка, однаковий з обох боків — щоб не малювати стіну двічі. */
function edgeKey(e) {
    const k = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    return [k(e.a), k(e.b)].sort().join('|');
}

/** Розрізає відрізок отвором [from, to] уздовж його осі. */
function cutOpening(seg, from, to) {
    const horiz = near(seg.a[1], seg.b[1]);
    const p0 = horiz ? seg.a[0] : seg.a[1];
    const p1 = horiz ? seg.b[0] : seg.b[1];
    const lo = Math.min(p0, p1);
    const hi = Math.max(p0, p1);
    const f = Math.max(lo, from);
    const t = Math.min(hi, to);
    if (t <= f) return [seg];                       // отвір поза відрізком

    const mk = (from2, to2) => (horiz
        ? { ...seg, a: [from2, seg.a[1]], b: [to2, seg.a[1]] }
        : { ...seg, a: [seg.a[0], from2], b: [seg.a[0], to2] });

    const parts = [];
    if (f - lo > 0.05) parts.push(mk(lo, f));
    if (hi - t > 0.05) parts.push(mk(t, hi));
    return parts;
}

/** Довжина спільної ділянки двох колінеарних ребер (0, якщо не сусіди). */
function sharedSpan(e1, e2) {
    const h1 = near(e1.a[1], e1.b[1]);
    const h2 = near(e2.a[1], e2.b[1]);
    if (h1 !== h2) return null;
    if (h1) {
        if (!near(e1.a[1], e2.a[1])) return null;
        const lo = Math.max(Math.min(e1.a[0], e1.b[0]), Math.min(e2.a[0], e2.b[0]));
        const hi = Math.min(Math.max(e1.a[0], e1.b[0]), Math.max(e2.a[0], e2.b[0]));
        return hi - lo > 0.3 ? { lo, hi, horiz: true, at: e1.a[1] } : null;
    }
    if (!near(e1.a[0], e2.a[0])) return null;
    const lo = Math.max(Math.min(e1.a[1], e1.b[1]), Math.min(e2.a[1], e2.b[1]));
    const hi = Math.min(Math.max(e1.a[1], e1.b[1]), Math.max(e2.a[1], e2.b[1]));
    return hi - lo > 0.3 ? { lo, hi, horiz: false, at: e1.a[0] } : null;
}

/**
 * Головна функція: з масиву кімнат будує повний план.
 * Повертає { zones, walls, bounds } — рівно те, що вміє малювати сцена.
 */
export function buildFloorPlan(rooms) {
    const list = (rooms || []).filter(Boolean);

    // Балкон — не «плитка» всередині квартири, а смуга на фасаді.
    // Підвал і мансарда — інший поверх: малюємо окремими блоками збоку.
    const detachedTypes = new Set(['basement', 'attic']);
    const inner = list.filter((r) => r.type !== 'balcony' && !detachedTypes.has(r.type));
    const balconies = list.filter((r) => r.type === 'balcony');
    const detached = list.filter((r) => detachedTypes.has(r.type));

    const zones = [];

    // ---- основний об'єм ----
    const innerArea = inner.reduce((a, r) => a + areaOf(r), 0);
    let W = 0;
    let D = 0;
    if (innerArea > 0) {
        W = Math.sqrt(innerArea * ASPECT);
        D = innerArea / W;
        const items = inner
            .map((r) => ({ id: r.id, type: r.type, name: r.name, value: areaOf(r) }))
            .sort((a, b) => b.value - a.value);          // squarified вимагає спадання
        squarify(items, { x: 0, z: 0, w: W, d: D }, zones);
    }

    // ---- балкони: смуги вздовж верхнього фасаду ----
    let balconyDepth = 0;
    if (balconies.length) {
        balconyDepth = BALCONY_DEPTH;
        // Якщо основного об'єму ще немає (людина додала лише балкон) —
        // будуємо смугу «в порожнечі», інакше зона просто зникала з плану.
        const baseW = W > 0 ? W : balconies.reduce((a, r) => a + areaOf(r), 0) / balconyDepth;
        const totalB = balconies.reduce((a, r) => a + areaOf(r), 0);
        let offset = 0;
        balconies.forEach((r) => {
            const share = (areaOf(r) / totalB) * Math.min(baseW, totalB / balconyDepth || baseW);
            const bw = Math.max(share, 1.2);
            zones.push({
                id: r.id, type: 'balcony', name: r.name, value: areaOf(r),
                x: offset, z: -balconyDepth, w: bw, d: balconyDepth,
                exterior: true,
            });
            offset += bw;
        });
    }

    // ---- підвал/мансарда: окремі блоки праворуч ----
    let detachedW = 0;
    if (detached.length) {
        let zCursor = 0;
        detached.forEach((r) => {
            const a = areaOf(r);
            const dw = Math.min(Math.sqrt(a * 1.3), 3.2);
            const dd = a / dw;
            zones.push({
                id: r.id, type: r.type, name: r.name, value: a,
                x: (W || 4) + DETACHED_GAP, z: zCursor, w: dw, d: dd,
                detached: true,
            });
            zCursor += dd + DETACHED_GAP;
            detachedW = Math.max(detachedW, dw);
        });
    }

    // ---- стіни ----
    const walls = [];
    const seen = new Map();     // edgeKey → { seg, zones: [] }
    const mainZones = zones.filter((z) => !z.detached);

    mainZones.forEach((z) => {
        rectEdges(z).forEach((e) => {
            const key = edgeKey(e);
            if (!seen.has(key)) seen.set(key, { seg: e, zones: [] });
            seen.get(key).zones.push(z);
        });
    });

    // Отвори: для кожної пари сусідніх зон — двері на найдовшій спільній межі.
    const openings = [];        // {horiz, at, from, to}
    for (let i = 0; i < mainZones.length; i += 1) {
        for (let j = i + 1; j < mainZones.length; j += 1) {
            const A = mainZones[i];
            const B = mainZones[j];
            let best = null;
            rectEdges(A).forEach((ea) => {
                rectEdges(B).forEach((eb) => {
                    const span = sharedSpan(ea, eb);
                    if (span && (!best || span.hi - span.lo > best.hi - best.lo)) best = span;
                });
            });
            if (best && best.hi - best.lo >= DOOR_W + 0.3) {
                const mid = (best.lo + best.hi) / 2;
                openings.push({
                    horiz: best.horiz, at: best.at,
                    from: mid - DOOR_W / 2, to: mid + DOOR_W / 2,
                });
            }
        }
    }

    // Вікна: на ЗОВНІШНІХ ребрах житлових зон (не санвузол, не гардероб).
    const windows = [];
    const glazed = new Set(['room', 'kitchen', 'hallway']);
    const isOuter = (e) => (
        near(e.a[0], 0) && near(e.b[0], 0)
        || near(e.a[0], W) && near(e.b[0], W)
        || near(e.a[1], 0) && near(e.b[1], 0)
        || near(e.a[1], D) && near(e.b[1], D)
    );

    mainZones.forEach((z) => {
        if (!glazed.has(z.type)) return;
        const outer = rectEdges(z).filter(isOuter);
        if (!outer.length) return;
        // Найдовше зовнішнє ребро — туди вікно
        const e = outer.sort((a, b) => {
            const la = Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]);
            const lb = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
            return lb - la;
        })[0];
        const horiz = near(e.a[1], e.b[1]);
        const lo = horiz ? Math.min(e.a[0], e.b[0]) : Math.min(e.a[1], e.b[1]);
        const hi = horiz ? Math.max(e.a[0], e.b[0]) : Math.max(e.a[1], e.b[1]);
        const len = hi - lo;
        if (len < 1.4) return;
        const wWin = Math.min(WINDOW_MAX, len * 0.55);
        const mid = (lo + hi) / 2;
        windows.push({
            horiz, at: horiz ? e.a[1] : e.a[0],
            from: mid - wWin / 2, to: mid + wWin / 2,
        });
    });

    // Збираємо сегменти стін, вирізаючи отвори
    seen.forEach(({ seg, zones: owners }) => {
        const horiz = near(seg.a[1], seg.b[1]);
        const at = horiz ? seg.a[1] : seg.a[0];
        const outer = owners.length === 1;

        let parts = [seg];
        // двері
        openings.forEach((op) => {
            if (op.horiz !== horiz || !near(op.at, at)) return;
            parts = parts.flatMap((p) => cutOpening(p, op.from, op.to));
        });

        // вікна: замість «дірки» ставимо низьку підвіконну стіну
        const winHere = windows.filter((wn) => wn.horiz === horiz && near(wn.at, at));
        winHere.forEach((wn) => {
            parts = parts.flatMap((p) => cutOpening(p, wn.from, wn.to));
        });

        parts.forEach((p) => walls.push({ ...p, kind: outer ? 'ext' : 'int' }));

        winHere.forEach((wn) => {
            walls.push(horiz
                ? { a: [wn.from, at], b: [wn.to, at], kind: 'sill' }
                : { a: [at, wn.from], b: [at, wn.to], kind: 'sill' });
        });
    });

    // Балкони: скління по зовнішньому периметру смуги
    zones.filter((z) => z.type === 'balcony' && z.exterior).forEach((z) => {
        walls.push({ a: [z.x, z.z], b: [z.x + z.w, z.z], kind: 'sill' });
        walls.push({ a: [z.x, z.z], b: [z.x, z.z + z.d], kind: 'sill' });
        walls.push({ a: [z.x + z.w, z.z], b: [z.x + z.w, z.z + z.d], kind: 'sill' });
    });

    // Окремі блоки: свій замкнений контур
    zones.filter((z) => z.detached).forEach((z) => {
        rectEdges(z).forEach((e) => walls.push({ ...e, kind: 'ext', zoneId: z.id }));
    });

    // Габарити сцени (з урахуванням балконної смуги та окремих блоків)
    const maxX = zones.reduce((m, z) => Math.max(m, z.x + z.w), W);
    const maxZ = zones.reduce((m, z) => Math.max(m, z.z + z.d), D);
    const minZ = zones.reduce((m, z) => Math.min(m, z.z), 0);

    return {
        zones: zones.map((z) => ({
            ...z,
            label: [z.x + z.w / 2, z.z + z.d / 2],
        })),
        walls,
        bounds: { width: Math.max(maxX, 1), depth: Math.max(maxZ - minZ, 1), offsetZ: minZ },
    };
}
