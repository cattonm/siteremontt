// src/components/RoomPreview3D.jsx
// ЖИВЕ 3D-ПРЕВ'Ю КІМНАТИ — аналог рендерів Kapitel, але побудований кодом.
//
// Навіщо цей компонент:
//  - У Kapitel вибір матеріалу МИТТЄВО міняє вигляд кімнати на рендері.
//    У нас готових фото-рендерів немає (RoomPhotoPreview чекає на файли,
//    enabled: false), тому досі показувалась лише смужка мініатюр.
//  - Тут кімната збирається з примітивів у тому ж "рисованому" стилі, що й
//    план квартири (OutlinedBox / чорні контури), а всі поверхні вкриваються
//    ПРОЦЕДУРНИМИ текстурами з utils/proceduralTextures.js — паркет-ялинка,
//    дошки ламінату, плитка, мозаїка, шпалери, штукатурка тощо.
//
// Що реагує на вибір користувача (усе читається з пропса `room`, компонент
// НІЧОГО не пише в стор — той самий принцип, що в RoomPhotoPreview):
//  - floor      -> текстура підлоги;
//  - walls / wall_tile -> текстура обох видимих стін;
//  - apron      -> фартух кухні (смуга між стільницею та верхніми шафами);
//  - light      -> точкові світильники / люстра / трек / LED-підсвітка;
//  - sills      -> колір підвіконня (тільки тип "room");
//  - decor      -> гіпсові панелі або ДСП/рейки на стіні;
//  - tub / shower / toilet -> сантехніка у санвузлі (ванна проти стіни або
//    окремостояча, піддон/трап + скло, унітаз підлоговий або інсталяція).
//
// Хотспоти: круглі кнопки (ті самі іконки, що в секціях акордеону) прив'язані
// до 3D-точок через <Html> з drei — тому вони "їздять" разом із камерою.
// Клік лише повідомляє батька (onHotspotClick), яку секцію відкрити.
//
// Камера: перспективна, з OrbitControls у вузьких межах — користувач може
// трохи покрутити й наблизити кімнату ("вільно переглядати", як у Kapitel),
// але не може заглянути за стіни чи перевернути сцену.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Box, Footprints, Sun, MoonStar } from 'lucide-react';
import { OutlinedBox, OutlinedCylinder, OutlinedSurface } from './three/Outlined';
import InvalidateOnVisible from './three/InvalidateOnVisible';
import { getSurfaceKind, getSurfaceColor, getSurfaceTexture, getSurfaceRoughness, repeatsFor } from '../utils/proceduralTextures';
import { GROUP_ICONS, DEFAULT_GROUP_ICON } from '../data/groupIcons';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';
import { vibe } from '../utils/telegram';
import useCanvasVisible from '../hooks/useCanvasVisible';
import { layoutKitchen, layoutBath, layoutGeneric, TUB_LEN, TUB_DEP, TUB_H } from '../utils/roomLayout';
import { WALL_H_ROOM, CAP_COLOR_ROOM, getBlobTexture, DPR_CAP } from './three/sceneConstants';

// ====== ГЕОМЕТРІЯ КІМНАТИ ======
const WALL_H = WALL_H_ROOM;     // висота стін, м
const WALL_T = 0.09;    // товщина стін
const FLOOR_T = 0.09;   // товщина плити підлоги
const CAP_H = 0.06;     // чорна "кришка" зрізу стіни (лінія плану)
const CAP_OVER = 0.015;
const CAP_COLOR = CAP_COLOR_ROOM;
const WOOD = '#cdb293';
const rad = (deg) => (deg * Math.PI) / 180;

// ====== РЕЖИМ ПРОГУЛЯНКИ ======
const EYE = 1.62;            // висота очей, м
const WALK_SPEED = 1.7;      // м/с
const WALL_MARGIN = 0.34;    // не підходити впритул до стін
const FURN_PAD = 0.28;       // «товщина» пішохода навколо меблів
const FOV_ORBIT = 34;
const FOV_FP = 62;
const CAM_TWEEN = 850;       // мс на переліт між видами
const PITCH_MIN = -1.25, PITCH_MAX = 1.35;

// Пропорції "ширина/глибина" за типом кімнати: коридор довгий, балкон ще
// довший, санвузол майже квадратний. Площа береться з measurements.floor.
const ASPECT = {
    room: 1.3, kitchen: 1.35, bath: 1.15, hallway: 2.1,
    balcony: 3.0, wardrobe: 1.2, basement: 1.4, attic: 1.4,
};

function roomDims(room) {
    const area = parseFloat(room.measurements?.floor) || 12;
    const aspect = ASPECT[room.type] || 1.3;
    const W = Math.min(Math.max(Math.sqrt(area * aspect), 1.5), 7);
    const D = Math.min(Math.max(area / W, 1.2), 6);
    return { W, D };
}

// ====== КОНТАКТНА ТІНЬ ПІД МЕБЛЯМИ ======
// getBlobTexture — спільна для обох 3D-сцен, тепер у three/sceneConstants.js.
function ContactShadow({ position, size }) {
    const tex = getBlobTexture();
    if (!tex) return null;
    return (
        <mesh rotation-x={-Math.PI / 2} position={position} raycast={() => null}>
            <planeGeometry args={size} />
            <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
    );
}

// ====== МАТЕРІАЛИ ПОВЕРХОНЬ ======
// Значення в сторі буває рядком (cards), масивом (cards_multiselect) або
// об'єктом {type,tier}. Беремо ПЕРШЕ значення, для якого існує текстура.
function firstMapped(fieldId, raw) {
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    for (const v of list) {
        const val = typeof v === 'object' ? v?.type : v;
        if (getSurfaceKind(fieldId, val)) return val;
    }
    const f = list[0];
    return typeof f === 'object' ? f?.type : (f || null);
}

// { color, texture } для однієї поверхні. widthM/heightM — реальні метри
// поверхні, з них рахується кількість повторів текстури (repeatsFor).
// fallbackKind — вид текстури, коли користувач ЩЕ нічого не обрав
// (підлога показує "чорнову стяжку" замість мертвої сірої заливки).
function surfaceFill(fieldId, value, widthM, heightM, fallback = '#efeeeb', fallbackKind = null) {
    let kind = getSurfaceKind(fieldId, value);
    if (!kind && fallbackKind) kind = fallbackKind;
    if (!kind) return { color: fallback, texture: null, roughnessMap: null };
    const rx = repeatsFor(kind, widthM);
    const ry = repeatsFor(kind, heightM);
    return {
        color: getSurfaceColor(kind),
        texture: getSurfaceTexture(kind, rx, ry),
        roughnessMap: getSurfaceRoughness(kind, rx, ry),
    };
}

// ====== ДЕФОЛТНЕ ПРЕВ'Ю ПО ТИПУ ПРИМІЩЕННЯ (патч 13.1 / 13.5) ======
// Проблема патча 13: поки клієнт нічого не обрав, кімната стартувала голою —
// підлога "чорнова стяжка", стіни пласка сіра заливка. Виглядало недоробленим,
// хоча прототип (room-configurator-prototype.html) живий з першого кадру:
// у нього `sel` засіджений дефолтами.
//
// Тут — те саме, але АДАПТОВАНО під наявну архітектуру, а не портом прототипу:
//  - Використовуємо ІСНУЮЧІ види текстур (KINDS у proceduralTextures.js) —
//    те саме єдине джерело правди, що й свотчі анкети. Свідомо НЕ додаємо
//    паралельний каталог прототипу (subway/slats/panel + «Плитка кабанчик»,
//    «Рейкова алюм.» тощо): ці матеріали не існують як опції в анкеті, тож
//    клієнт бачив би в прев'ю те, чого не може обрати свотчем — і другий
//    каталог дублював би систему матеріалів.
//  - Дефолт залежить від типу: санвузол/кухня стартують плиткою, а не паркетом
//    (Definition of done патча 13).
//  - Це ЛИШЕ візуальне прев'ю (fallbackKind): у `room` нічого не пишеться,
//    кошторис лишається 0, а пункт акордеону — «рекомендовано», поки клієнт
//    свідомо не тапне свотч (розділення прев'ю/анкети, патч 13.2 — уже
//    закладене архітектурно: компонент читає з пропса `room` і ніколи не
//    мутує стор, вибір іде тільки через onMaterialChange).
const PREVIEW_DEFAULTS = {
    room: { floor: 'herringbone', wall: 'paint' },      // паркет-ялинка + тепла фарба
    kitchen: { floor: 'tile60', wall: 'plaster' },      // керамограніт + декор. штукатурка
    bath: { floor: 'tile12060', wall: 'tile12060' },    // плитка на підлозі й стінах
    hallway: { floor: 'tile60', wall: 'plaster' },
    balcony: { floor: 'tile60', wall: 'plaster' },
    wardrobe: { floor: 'laminate', wall: 'paint' },     // ламінат-дуб + тепла фарба
    basement: { floor: 'tile60', wall: 'plaster' },
    attic: { floor: 'laminate', wall: 'plaster' },
};
const previewDefault = (type) => PREVIEW_DEFAULTS[type] || PREVIEW_DEFAULTS.room;

// ====== КАМЕРА: обмежений орбіт + режим «зайти в кімнату» ======
// key на компоненті (у батька) перезбирає камеру, коли міняється площа.
// view: 'orbit' — зовнішній огляд макета; 'fp' — погляд зсередини (look-around).
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function CameraRig({ W, D, view, yawRef, pitchRef, setWalking }) {
    const { invalidate } = useThree();
    const camRef = useRef();
    const ctrlRef = useRef();
    const rafRef = useRef(0);
    const firstRef = useRef(true);

    const tx = W / 2, ty = 0.85, tz = D / 2;
    // ВІДСТАНЬ КАМЕРИ — СУБЛІНІЙНА. Раніше було R = max*1.5 + 2.4, тобто
    // камера відсувалась СТРОГО пропорційно розміру — і 6 м², і 30 м²
    // займали однаковий кадр, масштаб не читався взагалі.
    // Тепер відстань росте повільніше за кімнату (степінь 0.62), тож
    // велика кімната справді виглядає більшою (~1.4× спред між крайніми
    // площами), але все одно повністю вміщається в кадр.
    const size = Math.max(W, D);
    const R = 3.2 + Math.pow(size, 0.62) * 2.6;
    const polar = rad(64), az = rad(42);

    const VIEWS = useMemo(() => ({
        orbit: {
            pos: [
                tx + R * Math.sin(polar) * Math.sin(az),
                ty + R * Math.cos(polar),
                tz + R * Math.sin(polar) * Math.cos(az),
            ],
            target: [tx, ty, tz],
        },
        // Точка «входу» в кімнату — біля дверей, на висоті очей
        fp: {
            pos: [W * 0.78, EYE, D * 0.86],
            target: [W * 0.3, 1.35, D * 0.2],
        },
    }), [W, D, R, tx, ty, tz, polar, az]);

    // Переліт між видами (позиція + fov). У fp-режимі керування камерою далі
    // забирає WalkController, тож OrbitControls лишаються вимкненими, а yaw/pitch
    // знімаються з кватерніона в момент прибуття. Мутація камери — норма r3f.
    useEffect(() => {
        const cam = camRef.current, ctrl = ctrlRef.current;
        if (!cam || !ctrl) return undefined;
        const fp = view === 'fp';
        const dest = VIEWS[view];
        const toPos = new THREE.Vector3(...dest.pos);
        const toTgt = new THREE.Vector3(...dest.target);
        const toFov = fp ? FOV_FP : FOV_ORBIT;

        // Перший рендер (і зміна площі) — ставимо камеру миттєво, без лету.
        // Те саме робимо, якщо користувач попросив менше руху (аудит п.9.5):
        // твін камери >200мс саме той випадок, який reduced-motion має вимкнути.
        const reducedMotion = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (firstRef.current || reducedMotion) {
            firstRef.current = false;
            cam.position.copy(toPos);
            ctrl.target.copy(toTgt);
            cam.fov = toFov;
            cam.updateProjectionMatrix();
            if (fp) {
                // Площу змінили, не виходячи з кімнати — одразу віддаємо
                // керування ході, інакше рух би «завис».
                cam.rotation.order = 'YXZ';
                cam.lookAt(toTgt);
                const e0 = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
                yawRef.current = e0.y;
                pitchRef.current = e0.x;
                setWalking(true);
            } else {
                ctrl.update();
            }
            invalidate();
            return undefined;
        }

        const fromPos = cam.position.clone();
        const fromTgt = ctrl.target.clone();
        const fromFov = cam.fov;
        const t0 = performance.now();
        const tmp = new THREE.Vector3();
        ctrl.enabled = false;
        setWalking(false);
        cancelAnimationFrame(rafRef.current);
        const step = () => {
            const k = easeInOutQuad(Math.min((performance.now() - t0) / CAM_TWEEN, 1));
            cam.position.lerpVectors(fromPos, toPos, k);
            tmp.lerpVectors(fromTgt, toTgt, k);
            cam.fov = fromFov + (toFov - fromFov) * k;
            cam.updateProjectionMatrix();
            if (fp) {
                cam.lookAt(tmp);
            } else {
                ctrl.target.copy(tmp);
                ctrl.update();
            }
            invalidate();
            if (k < 1) { rafRef.current = requestAnimationFrame(step); return; }
            if (fp) {
                // Далі камерою керує хода — знімаємо стартові yaw/pitch
                cam.rotation.order = 'YXZ';
                const e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
                yawRef.current = e.y;
                pitchRef.current = e.x;
                setWalking(true);
            } else {
                ctrl.target.copy(toTgt);
                ctrl.enabled = true;
                ctrl.update();
            }
            invalidate();
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [view, VIEWS, invalidate, yawRef, pitchRef, setWalking]);

    const fp = view === 'fp';
    return (
        <>
            <PerspectiveCamera ref={camRef} makeDefault fov={FOV_ORBIT} near={0.05} far={100} position={VIEWS.orbit.pos} />
            <OrbitControls
                ref={ctrlRef}
                makeDefault
                // У прогулянці камеру веде WalkController — орбіта повністю вимкнена.
                enabled={!fp}
                enablePan={false}
                enableDamping
                dampingFactor={0.08}
                // demand-режим: кожна зміна контролів (у т.ч. загасання інерції)
                // замовляє наступний кадр — це самопідтримна петля до зупинки.
                onChange={() => invalidate()}
                minDistance={R * 0.6}
                maxDistance={R * 1.45}
                minPolarAngle={rad(46)}
                maxPolarAngle={rad(82)}
                minAzimuthAngle={rad(8)}
                maxAzimuthAngle={rad(84)}
                rotateSpeed={0.55}
            />
        </>
    );
}

// ====== ХОДА: рух у площині XZ + колізії ======
// keys/joy/yaw/pitch живуть у ref'ах — DOM-обробники пишуть, useFrame читає,
// жодного setState на кадр.
function resolveCollisions(x, z, W, D, colliders) {
    for (const c of colliders) {
        const hw = c.hw + FURN_PAD, hd = c.hd + FURN_PAD;
        const dx = x - c.x, dz = z - c.z;
        const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
        // Всередині боксу — виштовхуємо по осі меншого проникнення
        if (px > 0 && pz > 0) {
            if (px < pz) x = c.x + (dx < 0 ? -hw : hw);
            else z = c.z + (dz < 0 ? -hd : hd);
        }
    }
    return [
        Math.min(Math.max(x, WALL_MARGIN), W - WALL_MARGIN),
        Math.min(Math.max(z, WALL_MARGIN), D - WALL_MARGIN),
    ];
}

function WalkController({ active, W, D, colliders, yawRef, pitchRef, keysRef, joyRef }) {
    const { camera } = useThree();
    const bobRef = useRef(0);

    /* eslint-disable react-hooks/immutability -- імперативний рух камери — норма r3f */
    useFrame((_, delta) => {
        if (!active) return;
        const dt = Math.min(delta, 0.05); // захист від стрибка після фонової вкладки
        const k = keysRef.current;
        const joy = joyRef.current;
        let sx = (k.right ? 1 : 0) - (k.left ? 1 : 0) + joy.x;
        let sf = (k.fwd ? 1 : 0) - (k.back ? 1 : 0) - joy.y;

        const len = Math.hypot(sx, sf);
        if (len > 1) { sx /= len; sf /= len; }
        const moving = len > 0.001;

        if (moving) {
            const yaw = yawRef.current;
            const sin = Math.sin(yaw), cos = Math.cos(yaw);
            // forward = (-sin, 0, -cos), right = (cos, 0, -sin)
            const vx = (-sin * sf + cos * sx) * WALK_SPEED * dt;
            const vz = (-cos * sf - sin * sx) * WALK_SPEED * dt;
            const [nx, nz] = resolveCollisions(
                camera.position.x + vx, camera.position.z + vz, W, D, colliders,
            );
            camera.position.x = nx;
            camera.position.z = nz;
            bobRef.current += dt * 8;
        }
        // Ледь помітне похитування кроку
        camera.position.y = EYE + (moving ? Math.sin(bobRef.current) * 0.008 : 0);
        camera.rotation.set(pitchRef.current, yawRef.current, 0);
    });
    /* eslint-enable react-hooks/immutability */

    return null;
}

// ====== СОНЦЕ З ТІНЯМИ ======
// Directional light, НАЦІЛЕНИЙ на центр кімнати (target треба явно додати
// в сцену через <primitive>, інакше three ігнорує його позицію).
// Ортографічна "камера тіней" накриває кімнату із запасом — інакше тіні
// обрізаються по краях. mapSize 1024 достатньо для такої маленької сцени.
function SunLight({ W, D, mood = 'day' }) {
    const target = React.useMemo(() => new THREE.Object3D(), []);
    const R = Math.max(W, D);
    const ext = R * 0.85 + 1.5; // пів-розмір коробки тіней
    return (
        <>
            <primitive object={target} position={[W / 2, 0, D / 2]} />
            <directionalLight
                castShadow
                target={target}
                color="#fff6ea"
                position={[W / 2 + R * 1.1 + 1.2, R * 1.5 + 4, D / 2 + R * 0.9 + 1]}
                // Вечір (патч 11.5): сонце вимкнене, кімнату освітлюють лише
                // прибори (LightFixtures) — той самий підхід, що в еталоні.
                intensity={mood === 'night' ? 0 : 2.4}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-left={-ext}
                shadow-camera-right={ext}
                shadow-camera-top={ext}
                shadow-camera-bottom={-ext}
                shadow-camera-near={1}
                shadow-camera-far={40}
                shadow-bias={-0.0004}
                shadow-normalBias={0.03}
            />
        </>
    );
}

// ====== КОРОБКА КІМНАТИ: підлога + 2 стіни + плінтус + подіум ======
// React.memo (патч 12.1, "build-once" адаптовано під r3f): підкомпоненти
// сцени ре-рендерились би на КОЖНУ зміну стану-хроми (mood/tapKind/
// joyKnob-драг), навіть коли їхні власні пропси не змінились. memo
// пропускає зайве — reconciler r3f бачить той самий JSX і нічого не чіпає.
const Shell = React.memo(function Shell({ W, D, floorFill, backFill, leftFill, onSurfaceDown, onFloorUp, onWallUp }) {
    return (
        <group>
            {/* Подіум під кімнатою — щоб модель "стояла", як архітектурний макет */}
            <OutlinedBox args={[W + 0.55, 0.12, D + 0.55]} position={[W / 2, -FLOOR_T - 0.06, D / 2]} color="#f4f4f1" />

            {/* Підлога (верхня площина на y=0). onPointerDown/Up замість onClick:
                тап на матеріал має спрацьовувати лише коли курсор майже не
                зрушив — інакше обертання орбітальної камери по підлозі
                випадково відкривало б палітру після кожного драга (патч 11.2). */}
            <OutlinedSurface
                args={[W, FLOOR_T, D]}
                position={[W / 2, -FLOOR_T / 2, D / 2]}
                color={floorFill.color}
                texture={floorFill.texture}
                roughnessMap={floorFill.roughnessMap}
                onPointerDown={onSurfaceDown}
                onPointerUp={onFloorUp}
            />

            {/* Задня стіна: тіло + чорна кришка (стиль плану) */}
            <OutlinedSurface
                args={[W + WALL_T, WALL_H, WALL_T]}
                position={[(W - WALL_T) / 2, WALL_H / 2, -WALL_T / 2]}
                color={backFill.color}
                texture={backFill.texture}
                roughnessMap={backFill.roughnessMap}
                onPointerDown={onSurfaceDown}
                onPointerUp={onWallUp}
            />
            <mesh position={[(W - WALL_T) / 2, WALL_H + CAP_H / 2, -WALL_T / 2]} raycast={() => null}>
                <boxGeometry args={[W + WALL_T + CAP_OVER * 2, CAP_H, WALL_T + CAP_OVER * 2]} />
                <meshBasicMaterial color={CAP_COLOR} />
            </mesh>

            {/* Ліва стіна */}
            <OutlinedSurface
                args={[WALL_T, WALL_H, D + WALL_T]}
                position={[-WALL_T / 2, WALL_H / 2, (D - WALL_T) / 2]}
                color={leftFill.color}
                texture={leftFill.texture}
                roughnessMap={leftFill.roughnessMap}
                onPointerDown={onSurfaceDown}
                onPointerUp={onWallUp}
            />
            <mesh position={[-WALL_T / 2, WALL_H + CAP_H / 2, (D - WALL_T) / 2]} raycast={() => null}>
                <boxGeometry args={[WALL_T + CAP_OVER * 2, CAP_H, D + WALL_T + CAP_OVER * 2]} />
                <meshBasicMaterial color={CAP_COLOR} />
            </mesh>

            {/* Плінтус уздовж обох стін */}
            <mesh position={[W / 2, 0.045, 0.012]}>
                <boxGeometry args={[W, 0.09, 0.024]} />
                <meshStandardMaterial color="#fafafa" roughness={0.9} />
            </mesh>
            <mesh position={[0.012, 0.045, D / 2]}>
                <boxGeometry args={[0.024, 0.09, D]} />
                <meshStandardMaterial color="#fafafa" roughness={0.9} />
            </mesh>
        </group>
    );
});

// ====== ЗАМИКАННЯ КІМНАТИ (тільки в режимі прогулянки) ======
// Дві решти стіни + стеля + плінтуси. В орбітальному режимі група прихована,
// тож макет лишається «розрізом». Рендериться ЗАВЖДИ (керуємо visible) —
// інакше при вході в кімнату був би стрибок на компіляції шейдерів.
function ceilingProps(value) {
    if (value === 'Гіпсокартон') return { color: '#f4f2ee', roughness: 0.98 };
    if (value === 'Побілка') return { color: '#f8f7f3', roughness: 0.95 };
    // «сатин» в анкеті поки нема, але матеріал підготовлений
    if (/сатин/i.test(value || '')) return { color: '#f2f1ee', roughness: 0.35, metalness: 0.08 };
    return { color: '#f5f4f0', roughness: 0.95 }; // «Натяжна» матова
}

const SEAM = 0.035; // тіньовий шов, 3.5 см

const ClosedShell = React.memo(function ClosedShell({ W, D, visible, frontFill, rightFill, ceilingValue, shadowSeam }) {
    const cp = ceilingProps(ceilingValue);
    const seam = shadowSeam && ceilingValue === 'Натяжна';
    return (
        <group visible={visible}>
            {/* Передня стіна (дзеркало задньої) */}
            <OutlinedSurface
                args={[W + WALL_T, WALL_H, WALL_T]}
                position={[(W - WALL_T) / 2, WALL_H / 2, D + WALL_T / 2]}
                color={frontFill.color}
                texture={frontFill.texture}
                roughnessMap={frontFill.roughnessMap}
            />
            {/* Права стіна (дзеркало лівої) */}
            <OutlinedSurface
                args={[WALL_T, WALL_H, D + WALL_T]}
                position={[W + WALL_T / 2, WALL_H / 2, (D - WALL_T) / 2]}
                color={rightFill.color}
                texture={rightFill.texture}
                roughnessMap={rightFill.roughnessMap}
            />

            {/* Стеля */}
            <mesh position={[W / 2, WALL_H + 0.04, D / 2]} receiveShadow>
                <boxGeometry args={[W + WALL_T * 2, 0.08, D + WALL_T * 2]} />
                <meshStandardMaterial {...cp} />
            </mesh>

            {/* Тіньовий шов по периметру стелі */}
            {seam && (
                <group>
                    <mesh position={[W / 2, WALL_H - SEAM / 2, SEAM / 2]}>
                        <boxGeometry args={[W, SEAM, SEAM]} />
                        <meshBasicMaterial color="#111214" />
                    </mesh>
                    <mesh position={[W / 2, WALL_H - SEAM / 2, D - SEAM / 2]}>
                        <boxGeometry args={[W, SEAM, SEAM]} />
                        <meshBasicMaterial color="#111214" />
                    </mesh>
                    <mesh position={[SEAM / 2, WALL_H - SEAM / 2, D / 2]}>
                        <boxGeometry args={[SEAM, SEAM, D]} />
                        <meshBasicMaterial color="#111214" />
                    </mesh>
                    <mesh position={[W - SEAM / 2, WALL_H - SEAM / 2, D / 2]}>
                        <boxGeometry args={[SEAM, SEAM, D]} />
                        <meshBasicMaterial color="#111214" />
                    </mesh>
                </group>
            )}

            {/* Плінтуси на нових стінах */}
            <mesh position={[W / 2, 0.045, D - 0.012]}>
                <boxGeometry args={[W, 0.09, 0.024]} />
                <meshStandardMaterial color="#fafafa" roughness={0.9} />
            </mesh>
            <mesh position={[W - 0.012, 0.045, D / 2]}>
                <boxGeometry args={[0.024, 0.09, D]} />
                <meshStandardMaterial color="#fafafa" roughness={0.9} />
            </mesh>
        </group>
    );
});

// ====== КОЛАЙДЕРИ МЕБЛІВ ======
// Повторюють ту саму розкладку, що й рендер — щоб крізь ліжко/гарнітур
// не можна було пройти. {x, z} — центр, hw/hd — півширина/півглибина.
function buildColliders(type, W, D, room) {
    const list = [];
    const push = (x, z, w, d) => list.push({ x, z, hw: w / 2, hd: d / 2 });

    if (type === 'kitchen') {
        const { withFridge, fridgeW, setW, x0 } = layoutKitchen(W);
        push(x0 + setW / 2, 0.31, setW, 0.6);
        if (withFridge) push(x0 + setW + 0.1 + fridgeW / 2, 0.33, fridgeW, 0.64);
        return list;
    }

    if (type === 'bath') {
        const { showerAny, S, tubType, free, tubStartX, tubFits, tubAlt } = layoutBath(W, D, room);
        if (showerAny) push(0.12 + S / 2, 0.12 + S / 2, S, S);
        if (tubType) {
            if (tubFits) push(tubStartX + TUB_LEN / 2, free ? 0.62 : 0.42, TUB_LEN, TUB_DEP);
            else if (tubAlt) push(W - TUB_DEP / 2 - 0.12, D - TUB_LEN / 2 - 0.25, TUB_DEP, TUB_LEN);
        }
        return list;
    }

    const { pieces, sx, sz } = layoutGeneric(type, W, D);
    if (!pieces) return list;
    const clamp = (v, max) => Math.min(Math.max(v, 0.35), max - 0.35);
    for (const p of pieces) {
        if (p.shape === 'cylinder') continue;
        if (p.args[1] < 0.3) continue;           // килими/низькі підставки не заважають
        if (p.pos[1] > p.args[1]) continue;      // висить на стіні — під ним можна пройти
        const turned = p.rotation && Math.abs(Math.abs(p.rotation[1] || 0) - Math.PI / 2) < 0.2;
        const w = turned ? p.args[2] : p.args[0];
        const d = turned ? p.args[0] : p.args[2];
        push(clamp(p.pos[0] * sx, W), clamp(p.pos[2] * sz, D), w, d);
    }
    return list;
}

// ====== СВІТЛО/ЕКСПОЗИЦІЯ ВСЕРЕДИНІ ======
// Під стелею темніше, ніж у «розрізі» — піднімаємо експозицію тонмапінгу.
function Exposure({ value }) {
    const { gl, invalidate } = useThree();
    /* eslint-disable react-hooks/immutability -- налаштування рендерера, норма r3f */
    useEffect(() => {
        gl.toneMappingExposure = value;
        invalidate();
    }, [gl, value, invalidate]);
    /* eslint-enable react-hooks/immutability */
    return null;
}

// IBL (патч 12.5): PMREM зі студійної RoomEnvironment (без зовнішніх HDR-файлів,
// у стилі решти сцени — усе процедурне). Прибирає "плаский" вигляд матеріалів
// м'якими відблисками; будується ОДИН раз на маунт canvas, не на кожен рендер.
function IBLEnvironment() {
    const { gl, scene } = useThree();
    /* eslint-disable react-hooks/immutability -- налаштування сцени, норма r3f */
    useEffect(() => {
        const pmrem = new THREE.PMREMGenerator(gl);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        pmrem.dispose();
        return () => {
            scene.environment = null;
            envTex.dispose();
        };
    }, [gl, scene]);
    /* eslint-enable react-hooks/immutability */
    return null;
}

// ====== ВІКНО НА ЗАДНІЙ СТІНІ (+ підвіконня за вибором sills) ======
const SILL_COLORS = { 'Пластик': '#ffffff', 'Дерево': WOOD, 'Штучний камінь': '#e6e4de' };

function WindowUnit({ x, sillValue }) {
    const showSill = sillValue !== 'Не потребується';
    const sillColor = SILL_COLORS[sillValue] || '#ffffff';
    return (
        <group position={[x, 0, 0]}>
            <OutlinedBox args={[1.26, 1.36, 0.06]} position={[0, 1.72, 0.005]} color="#fbfbfb" />
            {/* Скло */}
            <mesh position={[0, 1.72, 0.03]}>
                <boxGeometry args={[1.08, 1.18, 0.02]} />
                <meshStandardMaterial color="#cfe6f2" roughness={0.15} metalness={0.1} transparent opacity={0.85} />
            </mesh>
            {/* Хрестовина рами */}
            <mesh position={[0, 1.72, 0.045]}>
                <boxGeometry args={[0.05, 1.2, 0.02]} />
                <meshStandardMaterial color="#f2f2f2" />
            </mesh>
            {showSill && (
                <OutlinedBox args={[1.4, 0.045, 0.22]} position={[0, 1.02, 0.09]} color={sillColor} />
            )}
        </group>
    );
}

// ====== ДВЕРІ НА ЛІВІЙ СТІНІ ======
function DoorUnit({ z }) {
    return (
        <group position={[0, 0, z]}>
            <OutlinedBox args={[0.055, 2.08, 0.94]} position={[0.012, 1.04, 0]} color="#f6f6f6" />
            <OutlinedBox args={[0.04, 1.98, 0.84]} position={[0.035, 0.99, 0]} color="#ffffff" />
            {/* Ручка */}
            <mesh position={[0.065, 1.02, 0.32]}>
                <boxGeometry args={[0.02, 0.03, 0.12]} />
                <meshStandardMaterial color="#3a3a3f" />
            </mesh>
        </group>
    );
}

// ====== ДЕКОР НА СТІНІ: гіпсові панелі або ДСП/рейки ======
function DecorPanels({ value }) {
    if (!value || value === 'Ні' || value === 'ні') return null;
    const isGypsum = value === 'Панелі гіпсові';
    if (isGypsum) {
        // Вертикальні "рифлені" молдинги
        return (
            <group position={[0.35, 0, 0.02]}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <mesh key={i} position={[i * 0.16, 1.32, 0.014]}>
                        <boxGeometry args={[0.11, 2.3, 0.028]} />
                        <meshStandardMaterial color="#f3f1ec" roughness={0.85} />
                    </mesh>
                ))}
            </group>
        );
    }
    // 'Панелі ДСП' / 'ДСП панелі' — секція з дерев'яними рейками
    const kind = 'slats';
    const tex = getSurfaceTexture(kind, repeatsFor(kind, 1.0), repeatsFor(kind, 2.3));
    return (
        <mesh position={[0.85, 1.32, 0.036]}>
            <boxGeometry args={[1.0, 2.3, 0.03]} />
            <meshStandardMaterial key={tex ? tex.uuid : 'slats'} color="#ffffff" map={tex} roughness={0.85} />
        </mesh>
    );
}

// ====== ОСВІТЛЕННЯ: візуальні прибори + справжнє THREE-світло ======
function EmissiveStrip({ args, position, rotation }) {
    return (
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={args} />
            <meshStandardMaterial color="#fff6dd" emissive="#ffd98f" emissiveIntensity={1.6} />
        </mesh>
    );
}

const LightFixtures = React.memo(function LightFixtures({ lightArr, W, D, mood = 'day' }) {
    const has = (name) => lightArr.includes(name);
    const spots = has('Точкове світло');
    const chandelier = has('Люстра');
    const track = has('Трек / Лінія');
    const led = has('LED підсвітка') || has('Декор підсвітка');
    // Вечір (патч 11.5): сонця нема, тож прибори — єдине джерело світла в
    // кімнаті й мають світити помітно яскравіше; вдень вони ледь тепліють
    // проти денного світла з вікна.
    const night = mood === 'night';
    const bulbGlow = night ? 2.2 : 0.25;
    const pointMul = night ? 1.8 : 1;

    return (
        <group>
            {spots && [[0.28, 0.3], [0.72, 0.3], [0.28, 0.72], [0.72, 0.72]].map(([fx, fz], i) => (
                <group key={i} position={[W * fx, WALL_H - 0.02, D * fz]}>
                    <mesh>
                        <cylinderGeometry args={[0.09, 0.09, 0.03, 20]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>
                    <mesh position={[0, -0.018, 0]}>
                        <cylinderGeometry args={[0.055, 0.055, 0.01, 20]} />
                        <meshStandardMaterial color="#fff2cf" emissive="#ffdf9e" emissiveIntensity={bulbGlow} />
                    </mesh>
                </group>
            ))}

            {chandelier && (
                <group position={[W / 2, 0, D / 2]}>
                    <mesh position={[0, WALL_H - 0.02, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
                        <meshStandardMaterial color="#eaeaea" />
                    </mesh>
                    <mesh position={[0, WALL_H - 0.27, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
                        <meshStandardMaterial color="#3a3a3f" />
                    </mesh>
                    <mesh position={[0, WALL_H - 0.6, 0]}>
                        <cylinderGeometry args={[0.13, 0.27, 0.24, 22]} />
                        <meshStandardMaterial color="#f3efe7" emissive="#ffd9a0" emissiveIntensity={night ? 1.4 : 0.59} />
                    </mesh>
                    <pointLight position={[0, WALL_H - 0.75, 0]} intensity={10 * pointMul} distance={7} decay={1.8} color="#ffd9a8" />
                </group>
            )}

            {track && (
                <group position={[W * 0.35, WALL_H - 0.06, D / 2]}>
                    <mesh>
                        <boxGeometry args={[0.055, 0.05, Math.max(D * 0.55, 1)]} />
                        <meshStandardMaterial color="#26262a" />
                    </mesh>
                    {[-0.3, 0, 0.3].map((fz, i) => (
                        <mesh key={i} position={[0, -0.09, fz * Math.max(D * 0.55, 1)]} rotation={[rad(24), 0, 0]}>
                            <cylinderGeometry args={[0.035, 0.045, 0.14, 14]} />
                            <meshStandardMaterial color="#1d1d21" emissive="#ffe8bf" emissiveIntensity={night ? 1.6 : 0.46} />
                        </mesh>
                    ))}
                </group>
            )}

            {led && (
                <group>
                    <EmissiveStrip args={[W - 0.14, 0.035, 0.035]} position={[W / 2, WALL_H - 0.1, 0.055]} />
                    <EmissiveStrip args={[0.035, 0.035, D - 0.14]} position={[0.055, WALL_H - 0.1, D / 2]} />
                </group>
            )}

            {(spots || track) && (
                <pointLight position={[W / 2, WALL_H - 0.35, D / 2]} intensity={6 * pointMul} distance={7} decay={2} color="#fff3da" />
            )}
        </group>
    );
});

// ====== КУХОННИЙ ГАРНІТУР (фартух реагує на вибір apron) ======
const KitchenSet = React.memo(function KitchenSet({ W, room }) {
    const { withFridge, fridgeW, setW, x0, cx } = layoutKitchen(W);

    const counterFill = surfaceFill('apron', 'Матеріал стільниці', setW, 0.63); // stoneSlab
    const apronFill = surfaceFill('apron', room.apron, setW, 0.6, '#edeff1');

    const other = room.other || {};
    const lightArr = Array.isArray(room.light) ? room.light : [];
    const workLight = !!other['Підсвітка робочої поверхні'] || lightArr.includes('Декор підсвітка');

    return (
        <group>
            {/* Контактна тінь під гарнітуром */}
            <ContactShadow position={[cx, 0.006, 0.34]} size={[setW * 1.15, 0.95]} />
            {/* Нижні шафи */}
            <OutlinedBox args={[setW, 0.8, 0.6]} position={[cx, 0.4, 0.31]} color={WOOD} />
            {/* Стільниця — темний камінь із прожилками */}
            <mesh position={[cx, 0.83, 0.325]}>
                <boxGeometry args={[setW + 0.04, 0.045, 0.65]} />
                <meshStandardMaterial
                    key={counterFill.texture ? counterFill.texture.uuid : 'counter'}
                    color="#ffffff" map={counterFill.texture} roughness={0.5}
                />
            </mesh>
            {/* Фартух на стіні — МІНЯЄТЬСЯ від вибору room.apron */}
            <mesh position={[cx, 1.15, 0.017]}>
                <boxGeometry args={[setW, 0.6, 0.03]} />
                <meshStandardMaterial
                    key={apronFill.texture ? apronFill.texture.uuid : apronFill.color}
                    color={apronFill.texture ? '#ffffff' : apronFill.color}
                    map={apronFill.texture} roughness={0.6}
                />
            </mesh>
            {/* Верхні шафи */}
            <OutlinedBox args={[setW, 0.7, 0.34]} position={[cx, 1.83, 0.18]} color="#f0ede6" />
            {/* Підсвітка робочої поверхні */}
            {workLight && <EmissiveStrip args={[setW - 0.08, 0.03, 0.03]} position={[cx, 1.465, 0.34]} />}
            {/* Мийка + змішувач */}
            <mesh position={[x0 + setW * 0.3, 0.856, 0.31]}>
                <boxGeometry args={[0.5, 0.012, 0.4]} />
                <meshStandardMaterial color="#9aa0a6" metalness={0.4} roughness={0.35} />
            </mesh>
            <mesh position={[x0 + setW * 0.3, 0.97, 0.14]}>
                <cylinderGeometry args={[0.018, 0.018, 0.24, 10]} />
                <meshStandardMaterial color="#7d838a" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Холодильник */}
            {withFridge && (
                <OutlinedBox args={[fridgeW, 1.9, 0.64]} position={[x0 + setW + 0.1 + fridgeW / 2, 0.95, 0.33]} color="#e8e8eb" />
            )}
        </group>
    );
});

// ====== САНВУЗОЛ: ванна / душ / унітаз / умивальник за вибором ======
function GlassPane({ args, position }) {
    return (
        <mesh position={position}>
            <boxGeometry args={args} />
            <meshStandardMaterial color="#bcd8e4" transparent opacity={0.28} roughness={0.1} metalness={0.1} />
        </mesh>
    );
}

const BathSet = React.memo(function BathSet({ W, D, room }) {
    const {
        hasTray, hasTrap, glassWall, glassDoor, showerAny, S, showerCx,
        tubType, free, tubStartX, tubFits, tubAlt, toiletType,
    } = layoutBath(W, D, room);
    const tubLen = TUB_LEN, tubDep = TUB_DEP, tubH = TUB_H;

    return (
        <group>
            {showerAny && (
                <group>
                    {hasTray && (
                        <OutlinedBox args={[S, 0.12, S]} position={[showerCx, 0.06, 0.12 + S / 2]} color="#ffffff" />
                    )}
                    {hasTrap && !hasTray && (
                        <mesh position={[showerCx, 0.004, 0.12 + S / 2]}>
                            <boxGeometry args={[0.5, 0.008, 0.07]} />
                            <meshStandardMaterial color="#6d7278" metalness={0.5} roughness={0.35} />
                        </mesh>
                    )}
                    {(glassWall || glassDoor) && (
                        <GlassPane args={[0.025, 1.9, S + 0.05]} position={[0.12 + S, 0.95 + (hasTray ? 0.12 : 0), 0.12 + S / 2]} />
                    )}
                    {glassDoor && (
                        <GlassPane args={[S + 0.05, 1.9, 0.025]} position={[showerCx, 0.95 + (hasTray ? 0.12 : 0), 0.12 + S]} />
                    )}
                    {/* Лійка душа */}
                    <mesh position={[showerCx, 2.1, 0.1]} rotation={[rad(90), 0, 0]}>
                        <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
                        <meshStandardMaterial color="#8b9096" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[showerCx, 2.2, 0.05]}>
                        <boxGeometry args={[0.025, 0.22, 0.025]} />
                        <meshStandardMaterial color="#8b9096" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )}

            {tubType && (tubFits || tubAlt) && (
                <group
                    position={tubAlt
                        ? [W - tubDep / 2 - 0.12, 0, D - tubLen / 2 - 0.25]
                        : [tubStartX + tubLen / 2, 0, (free ? 0.62 : 0.42)]}
                >
                    <OutlinedBox
                        args={tubAlt ? [tubDep, tubH, tubLen] : [tubLen, tubH, tubDep]}
                        position={[0, tubH / 2 + (free ? 0.07 : 0), 0]}
                        color="#ffffff"
                    />
                    {/* Внутрішня чаша */}
                    <mesh position={[0, tubH + (free ? 0.07 : 0) - 0.008, 0]}>
                        <boxGeometry args={tubAlt ? [tubDep - 0.16, 0.02, tubLen - 0.16] : [tubLen - 0.16, 0.02, tubDep - 0.16]} />
                        <meshStandardMaterial color="#e9f2f6" />
                    </mesh>
                    {free && [[-0.6, -0.24], [0.6, -0.24], [-0.6, 0.24], [0.6, 0.24]].map(([fx, fz], i) => (
                        <mesh key={i} position={tubAlt ? [fz, 0.035, fx] : [fx, 0.035, fz]}>
                            <cylinderGeometry args={[0.03, 0.035, 0.07, 10]} />
                            <meshStandardMaterial color="#d8d8dc" />
                        </mesh>
                    ))}
                </group>
            )}

            {toiletType && D >= 1.5 && (
                <group position={[0, 0, Math.min(D * 0.72, D - 0.45)]}>
                    {toiletType === 'Інсталяція' ? (
                        <>
                            {/* Фальш-панель інсталяції + підвісна чаша */}
                            <OutlinedBox args={[0.12, 1.15, 0.62]} position={[0.06, 0.575, 0]} color="#f2f2f4" />
                            <OutlinedBox args={[0.4, 0.3, 0.42]} position={[0.32, 0.47, 0]} color="#ffffff" />
                        </>
                    ) : (
                        <>
                            <OutlinedBox args={[0.15, 0.42, 0.42]} position={[0.095, 0.63, 0]} color="#ffffff" />
                            <OutlinedCylinder args={[0.18, 0.21, 0.4, 16]} position={[0.36, 0.2, 0]} color="#ffffff" />
                            <mesh position={[0.36, 0.42, 0]}>
                                <cylinderGeometry args={[0.2, 0.2, 0.03, 16]} />
                                <meshStandardMaterial color="#ffffff" />
                            </mesh>
                        </>
                    )}
                </group>
            )}

            {/* Умивальник із дзеркалом — постійний елемент санвузла.
                Якщо обрано душ — стоїть ПІСЛЯ душової зони по лівій стіні;
                у зовсім тісній кімнаті ховається, щоб не накладатись. */}
            {(() => {
                const sinkZ = showerAny ? 0.12 + S + 0.42 : Math.max(D * 0.38, 0.55);
                return D >= 1.4 && sinkZ <= D - 0.85;
            })() && (
                <group position={[0, 0, showerAny ? 0.12 + S + 0.42 : Math.max(D * 0.38, 0.55)]}>
                    <OutlinedBox args={[0.46, 0.5, 0.55]} position={[0.24, 0.34, 0]} color={WOOD} />
                    <mesh position={[0.24, 0.615, 0]}>
                        <boxGeometry args={[0.5, 0.05, 0.58]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>
                    <mesh position={[0.14, 0.75, 0]}>
                        <cylinderGeometry args={[0.016, 0.016, 0.22, 10]} />
                        <meshStandardMaterial color="#7d838a" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.026, 1.42, 0]}>
                        <boxGeometry args={[0.02, 0.62, 0.5]} />
                        <meshStandardMaterial color="#cfe3ea" roughness={0.1} metalness={0.2} />
                    </mesh>
                </group>
            )}
        </group>
    );
});

// ====== СИЛУЕТИ МЕБЛІВ для решти типів (той самий підхід, що на плані) ======
const GenericFurniture = React.memo(function GenericFurniture({ type, W, D }) {
    const { pieces, sx, sz } = layoutGeneric(type, W, D);
    if (!pieces) return null;
    const clamp = (v, max) => Math.min(Math.max(v, 0.35), max - 0.35);
    return (
        <group>
            {pieces.map((p, i) => {
                const pos = [clamp(p.pos[0] * sx, W), p.pos[1], clamp(p.pos[2] * sz, D)];
                // Контактна тінь під об'ємними предметами, що стоять на підлозі
                const footprint = p.shape !== 'cylinder' && p.args[1] >= 0.35 && p.pos[1] <= p.args[1];
                return (
                    <React.Fragment key={i}>
                        {footprint && (
                            <ContactShadow position={[pos[0], 0.006, pos[2]]} size={[p.args[0] * 1.5, p.args[2] * 1.5]} />
                        )}
                        {p.shape === 'cylinder' ? (
                            <OutlinedCylinder args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                        ) : (
                            <OutlinedBox args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                        )}
                    </React.Fragment>
                );
            })}
        </group>
    );
});

// ====== ХОТСПОТИ: 3D-якорі за групами, наявними в цього типу кімнати ======
function buildHotspots(type, W, D, groups) {
    const list = [];
    const add = (group, pos) => { if (groups.has(group)) list.push({ group, pos }); };
    const busyWalls = type === 'kitchen' || type === 'bath'; // задня стіна зайнята гарнітуром/сантехнікою

    add('Підлога', [W * 0.6, 0.07, D * 0.68]);
    add('Стіни', busyWalls ? [0.06, 1.7, D * 0.42] : [Math.min(W * 0.92, W - 0.3), 1.55, 0.06]);
    if (type === 'kitchen') {
        const { setW } = layoutKitchen(W);
        add('Фартух', [0.15 + setW * 0.68, 1.15, 0.09]);
        add('Сантехніка', [0.15 + setW * 0.3, 1.02, 0.5]);
    }
    if (type === 'bath') add('Сантехніка', [W * 0.55, 0.85, D * 0.5]);
    add('Стеля', [W * 0.5, WALL_H - 0.14, D * 0.38]);
    add('Освітлення', [W * 0.5, WALL_H - 0.5, D * 0.5]);
    if (type === 'room' && W >= 1.9) add('Підвіконня', [Math.min(W * 0.62, W - 0.85), 1.02, 0.22]);
    add('Декор', [0.7, 1.55, 0.1]);
    return list;
}

// ====== ГОЛОВНИЙ КОМПОНЕНТ ======
export default function RoomPreview3D({ room, activeGroup, onHotspotClick, onMaterialChange, ceilingShadow = false }) {
    const { W, D } = roomDims(room);
    const type = room.type;

    // Режим камери: 'orbit' — зовнішній огляд макета, 'fp' — прогулянка всередині.
    // Локальний стан (стор не чіпаємо — той самий принцип, що з матеріалами).
    const [view, setView] = useState('orbit');
    const fp = view === 'fp';
    // День/вечір (патч 11.5) — суто візуальний режим освітлення, у стор не йде.
    const [mood, setMood] = useState('day');
    // 3D-аудит п.8.1: не малюємо кадри, коли канвас поза в'юпортом (план і
    // прев'ю кімнати рідко видно одночасно на телефоні — лишається один
    // активний WebGL-контекст).
    const [canvasWrapRef, canvasVisible] = useCanvasVisible();
    // walking вмикається лише коли переліт завершився — під час лету
    // камерою керує твін, а не хода.
    const [walking, setWalking] = useState(false);

    // Поле стін у санвузлі зветься wall_tile, всюди інде — walls
    const wallField = type === 'bath' ? 'wall_tile' : 'walls';
    const wallVal = firstMapped(wallField, room[wallField]);

    // Дефолтне прев'ю по типу приміщення (патч 13.1/13.5): поки клієнт нічого
    // не обрав — показуємо завершений матеріал, доречний для типу (плитка в
    // санвузлі, паркет у кімнаті), а не голу стяжку/пласку заливку. Це ЛИШЕ
    // fallbackKind: у стор нічого не пишеться, кошторис = 0 (патч 13.2).
    const def = previewDefault(type);

    // 3D-продуктивність (патч 12.1): surfaceFill лише читає з LRU-кешу
    // (патч 8.3), нових canvas не створює — але й цей кеш-лукап не варто
    // повторювати на КОЖЕН ре-рендер (mood/tapKind/joyKnob-драг тощо міняють
    // компонент десятки разів на секунду під час ходи чи озирання).
    // useMemo тримає ті самі об'єкти {color,texture,roughnessMap}
    // референційно стабільними — Shell/ClosedShell (і r3f-реконсилер під
    // ними) бачать незмінні пропси й нічого не перемальовують.
    const floorFill = useMemo(
        () => surfaceFill('floor', room.floor, W, D, '#ececee', def.floor),
        [room.floor, W, D, def.floor],
    );
    const backFill = useMemo(
        () => surfaceFill(wallField, wallVal, W, WALL_H, '#f7f5f0', def.wall),
        [wallField, wallVal, W, def.wall],
    );
    const leftFill = useMemo(
        () => surfaceFill(wallField, wallVal, D, WALL_H, '#f7f5f0', def.wall),
        [wallField, wallVal, D, def.wall],
    );

    // ====== ТАП ПО ПОВЕРХНІ → ПАЛІТРА (патч 11.1/11.2) ======
    // Свідомо БЕЗ окремого каталогу матеріалів (patches/11 пропонує
    // configuratorMaterials.js): опції ті самі, що й у питаннях анкети
    // (ROOM_QUESTIONS_CONFIG) — одне джерело правди для варіантів і для
    // самих процедурних текстур (proceduralTextures.js), а вибір одразу
    // йде в той самий updateRoom, що й акордеон (через onMaterialChange).
    // Стеля тут не тапається: рендериться лише в ClosedShell (лише fp),
    // а fp має власний поінтер-капчур для озирання — теж свідоме звуження
    // обсягу, стелю й далі можна міняти через акордеон «Стеля».
    const [tapKind, setTapKind] = useState(null); // 'floor' | wallField | null
    const roomCfg = ROOM_QUESTIONS_CONFIG[type] || [];
    const tapQuestion = tapKind ? roomCfg.find((q) => q.id === tapKind) : null;
    const tapStartRef = useRef(null);
    const onSurfaceDown = (e) => { tapStartRef.current = { x: e.clientX, y: e.clientY }; };
    const onSurfaceUp = (kind) => (e) => {
        const start = tapStartRef.current;
        tapStartRef.current = null;
        if (!start) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return; // це був драг камери
        vibe('light');
        setTapKind(kind);
    };
    const pickMaterial = (opt) => {
        if (!tapKind || !tapQuestion) return;
        vibe('medium');
        const value = tapQuestion.type === 'cards_multiselect' ? [opt.val] : opt.val;
        onMaterialChange?.(tapKind, value);
        setTapKind(null);
    };
    const isSwatchSelected = (opt) => {
        const cur = room[tapKind];
        return Array.isArray(cur) ? cur.includes(opt.val) : cur === opt.val;
    };

    const lightArr = Array.isArray(room.light) ? room.light : (room.light ? [room.light] : []);

    // Обчислення дешеві (кілька множень і невеликий Set) — мемоізація не потрібна
    const groups = new Set((ROOM_QUESTIONS_CONFIG[type] || []).map((q) => q.group || 'Інше'));
    const hotspots = buildHotspots(type, W, D, groups);

    const colliders = useMemo(() => buildColliders(type, W, D, room), [type, W, D, room]);

    // --- Введення прогулянки. Все в ref'ах: DOM-обробники пишуть, useFrame читає,
    // жодного ре-рендера на кадр (інакше 60 setState/с убили б продуктивність).
    const yawRef = useRef(0);
    const pitchRef = useRef(0);
    const keysRef = useRef({});
    const joyRef = useRef({ x: 0, y: 0 });
    const lookRef = useRef(null);  // pointerId, яким зараз озираються
    const lookPosRef = useRef({ x: 0, y: 0 }); // рахуємо дельту самі: movementX
                                               // не працює для тач-поінтерів у Safari
    const [joyKnob, setJoyKnob] = useState(null); // тільки для візуалізації джойстика

    // Клавіатура (десктоп)
    useEffect(() => {
        if (!fp) return undefined;
        const map = {
            KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
            KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
        };
        const set = (e, on) => {
            const k = map[e.code];
            if (!k) return;
            keysRef.current[k] = on;
            e.preventDefault();
        };
        const down = (e) => {
            // Escape — очікувана поведінка виходу з режиму прогулянки
            // (3D-аудит п.8.7), як і в решті модалок застосунку.
            if (e.code === 'Escape') { setView('orbit'); return; }
            set(e, true);
        };
        const up = (e) => set(e, false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            keysRef.current = {};
        };
    }, [fp]);

    // Озирання драгом. Джойстик має власний pointerId і сюди не потрапляє.
    const onLookDown = (e) => {
        if (!fp || lookRef.current !== null) return;
        lookRef.current = e.pointerId;
        lookPosRef.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onLookMove = (e) => {
        if (lookRef.current !== e.pointerId) return;
        const dx = e.clientX - lookPosRef.current.x;
        const dy = e.clientY - lookPosRef.current.y;
        lookPosRef.current = { x: e.clientX, y: e.clientY };
        yawRef.current -= dx * 0.0042;
        pitchRef.current = Math.min(
            Math.max(pitchRef.current - dy * 0.0038, PITCH_MIN), PITCH_MAX,
        );
    };
    const onLookUp = (e) => {
        if (lookRef.current !== e.pointerId) return;
        lookRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    // Віртуальний джойстик (тач)
    const joyIdRef = useRef(null);
    const joyBaseRef = useRef(null);
    const JOY_R = 46;
    const onJoyDown = (e) => {
        e.stopPropagation();
        joyIdRef.current = e.pointerId;
        const r = e.currentTarget.getBoundingClientRect();
        joyBaseRef.current = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onJoyMove = (e) => {
        if (joyIdRef.current !== e.pointerId) return;
        e.stopPropagation();
        const b = joyBaseRef.current;
        let dx = e.clientX - b.cx, dy = e.clientY - b.cy;
        const len = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(len, JOY_R);
        dx = (dx / len) * clamped;
        dy = (dy / len) * clamped;
        joyRef.current = { x: dx / JOY_R, y: dy / JOY_R };
        setJoyKnob({ x: dx, y: dy });
    };
    const onJoyUp = (e) => {
        if (joyIdRef.current !== e.pointerId) return;
        e.stopPropagation();
        joyIdRef.current = null;
        joyRef.current = { x: 0, y: 0 };
        setJoyKnob(null);
    };

    const hasWindow = type !== 'bath' && type !== 'balcony' && type !== 'wardrobe' && W >= 1.9;
    const winX = Math.max(Math.min(W * 0.62, W - 0.85), 0.85);
    const hasDoor = type !== 'bath' && type !== 'balcony' && D >= 1.9;
    const hasGeneric = type !== 'kitchen' && type !== 'bath';

    return (
        <div
            ref={canvasWrapRef}
            className="r3d-wrap"
            onPointerDown={onLookDown}
            onPointerMove={onLookMove}
            onPointerUp={onLookUp}
            onPointerCancel={onLookUp}
            style={fp ? { touchAction: 'none', cursor: 'grab' } : undefined}
        >
            {/* frameloop="demand": GPU малює кадр лише коли щось змінилось
                (вибір матеріалу, обертання камери). Разом із планом квартири
                на екрані ДВА канваси — без цього обидва крутили б 60 fps
                постійно і садили батарею в Telegram WebView. Інерція (damping)
                самопідтримується через onChange→invalidate у CameraRig. */}
            {/* ACES-тонмапінг: фотографічна крива яскравості замість лінійної
                (пікові емісіви й відблиски не «вигорають», тіні глибші). Світло
                перебалансовано під неї — див. SunLight/LightFixtures. */}
            <Canvas
                dpr={[1, DPR_CAP]}
                // Хода несумісна з "demand" — поки гуляємо, малюємо кожен кадр.
                // Поза в'юпортом (п.8.1) — взагалі не малюємо, незалежно від режиму.
                frameloop={!canvasVisible ? 'never' : (fp ? 'always' : 'demand')}
                shadows="soft"
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
                role="img"
                aria-label={`3D-візуалізація приміщення «${room.name}»${fp ? ' у режимі прогулянки' : ''}`}
            >
                <InvalidateOnVisible visible={canvasVisible} />
                <IBLEnvironment />
                <CameraRig
                    key={`${W.toFixed(1)}x${D.toFixed(1)}`}
                    W={W} D={D} view={view}
                    yawRef={yawRef} pitchRef={pitchRef} setWalking={setWalking}
                />
                <WalkController
                    active={fp && walking}
                    W={W} D={D} colliders={colliders}
                    yawRef={yawRef} pitchRef={pitchRef} keysRef={keysRef} joyRef={joyRef}
                />
                {/* Під замкненою стелею темніше — піднімаємо експозицію.
                    Вечір (патч 11.5): без сонця сцена темніша загалом — трохи
                    нижча експозиція, щоб прибори не "вигорали" на камері. */}
                <Exposure value={mood === 'night' ? (fp ? 1.0 : 0.92) : (fp ? 1.3 : 1.12)} />
                {/* Світло двома шарами: hemisphere (м'який градієнт небо/земля,
                    "оживляє" білі поверхні) + directional з тінями (об'єм).
                    ambient прибрано — його рівень бере на себе hemisphere.
                    Вечір: hemisphere майже вимкнене — світять лише прибори. */}
                <hemisphereLight intensity={mood === 'night' ? 0.14 : (fp ? 0.95 : 0.65)} color="#ffffff" groundColor="#d8d3ca" />
                <SunLight W={W} D={D} mood={mood} />

                {/* Невидима площина під подіумом ловить м'яку тінь моделі —
                    "макет" перестає висіти в білому вакуумі */}
                <mesh
                    rotation-x={-Math.PI / 2}
                    position={[W / 2, -FLOOR_T - 0.125, D / 2]}
                    receiveShadow
                >
                    <planeGeometry args={[W + 7, D + 7]} />
                    <shadowMaterial transparent opacity={0.16} />
                </mesh>

                <Shell
                    W={W} D={D} floorFill={floorFill} backFill={backFill} leftFill={leftFill}
                    onSurfaceDown={onSurfaceDown} onFloorUp={onSurfaceUp('floor')} onWallUp={onSurfaceUp(wallField)}
                />
                {/* Решта стін + стеля — лише в прогулянці (керуємо visible) */}
                <ClosedShell
                    W={W} D={D} visible={fp}
                    frontFill={backFill} rightFill={leftFill}
                    ceilingValue={room.ceiling}
                    shadowSeam={ceilingShadow}
                />

                {hasWindow && <WindowUnit x={winX} sillValue={type === 'room' ? room.sills : undefined} />}
                {hasDoor && <DoorUnit z={Math.min(D - 0.7, D * 0.78)} />}

                {/* Балкон: суцільне скління замість вікна */}
                {type === 'balcony' && (
                    <mesh position={[W / 2, 1.7, 0.02]}>
                        <boxGeometry args={[Math.max(W - 0.5, 1), 1.5, 0.03]} />
                        <meshStandardMaterial color="#cfe6f2" transparent opacity={0.55} roughness={0.12} />
                    </mesh>
                )}

                {(type === 'room' || type === 'hallway') && <DecorPanels value={room.decor} />}

                <LightFixtures lightArr={lightArr} W={W} D={D} mood={mood} />

                {type === 'kitchen' && <KitchenSet W={W} room={room} />}
                {type === 'bath' && <BathSet W={W} D={D} room={room} />}
                {hasGeneric && <GenericFurniture type={type} W={W} D={D} />}

                {/* Хотспоти прив'язані до ЗОВНІШНЬОГО погляду — у режимі
                    «зсередини» ховаємо, бо вони перекривали б увесь кадр. */}
                {!fp && hotspots.map((h) => {
                    const Icon = GROUP_ICONS[h.group] || DEFAULT_GROUP_ICON;
                    return (
                        <Html key={h.group} position={h.pos} center zIndexRange={[40, 0]}>
                            <button
                                type="button"
                                className={`r3d-hotspot ${activeGroup === h.group ? 'active' : ''}`}
                                aria-label={h.group}
                                onClick={() => { vibe('light'); onHotspotClick?.(h.group); }}
                            >
                                <Icon size={16} aria-hidden="true" />
                            </button>
                        </Html>
                    );
                })}
            </Canvas>

            {/* День/вечір (патч 11.5). Іконки БЕЗ підпису — свідомо: з текстом
                («День»/«Вечір») сегмент був досить широким, щоб на вузькому
                (350px) канвасі перекритись із сегментом «Макет»/«Зайти в
                кімнату» праворуч (обидва top, зверху) — тут це й спливло при
                перевірці. Знизу теж не варто: там може лягти fixed-футер
                навігації анкети (z-index 101), якщо канвас проскролити так,
                що його низ збігається з низом в'юпорта. zIndex 45 > 40
                (zIndexRange хотспотів) про всяк випадок. */}
            <div onPointerDown={(e) => e.stopPropagation()} style={{
                position: 'absolute', top: '10px', left: '10px', zIndex: 45,
                display: 'flex', gap: '4px', padding: '3px', borderRadius: '18px',
                background: 'var(--stage-badge-bg)', border: '1px solid var(--border-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}>
                {[
                    { id: 'day', label: 'День', icon: Sun },
                    { id: 'night', label: 'Вечір', icon: MoonStar },
                ].map(({ id, label, icon }) => {
                    const MoodIcon = icon;
                    const on = mood === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-label={label}
                            onClick={() => { if (!on) { vibe('light'); setMood(id); } }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '26px', height: '26px', borderRadius: '13px', border: 'none',
                                cursor: on ? 'default' : 'pointer',
                                background: on ? 'var(--accent)' : 'transparent',
                                color: on ? '#fff' : 'var(--text-color)',
                            }}
                        >
                            <MoodIcon size={14} aria-hidden="true" />
                        </button>
                    );
                })}
            </div>

            {/* Сегмент «Макет» / «Зайти в кімнату». stopPropagation — щоб
                pointer capture озирання не з'їдав клік по кнопці. zIndex 45:
                той самий фікс, що й у сегменту день/вечір (виявлено п.11.5) —
                хотспот, що спроєктувався в цей кут, міг перехопити клік. */}
            <div onPointerDown={(e) => e.stopPropagation()} style={{
                position: 'absolute', top: '10px', right: '10px', zIndex: 45,
                display: 'flex', gap: '4px', padding: '3px', borderRadius: '18px',
                background: 'var(--stage-badge-bg)', border: '1px solid var(--border-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}>
                {[
                    { id: 'orbit', label: 'Макет', icon: Box },
                    { id: 'fp', label: 'Зайти в кімнату', icon: Footprints },
                ].map(({ id, label, icon }) => {
                    const ModeIcon = icon;
                    const on = view === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => { if (!on) { vibe('light'); setView(id); } }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '5px 10px', borderRadius: '15px', border: 'none',
                                cursor: on ? 'default' : 'pointer',
                                fontFamily: 'inherit', fontSize: '12px', fontWeight: 700,
                                background: on ? 'var(--accent)' : 'transparent',
                                color: on ? '#fff' : 'var(--text-color)',
                            }}
                        >
                            <ModeIcon size={14} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Віртуальний джойстик — окремий pointerId, тож ходити й озиратись
                можна двома пальцями одночасно */}
            {fp && (
                <div
                    onPointerDown={onJoyDown}
                    onPointerMove={onJoyMove}
                    onPointerUp={onJoyUp}
                    onPointerCancel={onJoyUp}
                    style={{
                        position: 'absolute', left: '14px', bottom: '44px', zIndex: 30,
                        width: `${JOY_R * 2}px`, height: `${JOY_R * 2}px`, borderRadius: '50%',
                        background: 'rgba(20,20,24,0.28)', border: '1px solid rgba(255,255,255,0.28)',
                        touchAction: 'none', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.75)',
                        transform: joyKnob ? `translate(${joyKnob.x}px, ${joyKnob.y}px)` : 'none',
                        pointerEvents: 'none',
                    }} />
                </div>
            )}

            <div className="r3d-badge">
                {fp
                    ? 'W A S D — ходити · тягніть — озиратись'
                    : tapQuestion
                        ? 'Тапніть по поверхні ще раз, щоб змінити вибір'
                        : `${parseFloat(room.measurements?.floor) > 0 ? `${parseFloat(room.measurements.floor)} м² · ` : ''}${W.toFixed(1)}×${D.toFixed(1)} м · тапніть по поверхні, щоб змінити матеріал`}
            </div>

            {/* Палітра матеріалів (патч 11.2) — з'являється після тапу по
                підлозі чи стіні. Опції — ROOM_QUESTIONS_CONFIG, той самий
                каталог, що й у бічному акордеоні. */}
            <div
                onPointerDown={(e) => e.stopPropagation()}
                className={`r3d-palette ${tapQuestion ? 'open' : ''}`}
            >
                {tapQuestion && (
                    <>
                        <div className="r3d-palette-head">
                            <span>{tapQuestion.group || tapQuestion.text}</span>
                            <button type="button" className="btn-reset r3d-palette-close" aria-label="Закрити палітру" onClick={() => setTapKind(null)}>✕</button>
                        </div>
                        <div className="r3d-palette-row">
                            {tapQuestion.options.filter((o) => o.val !== 'Не обладнувати' && o.val !== 'Ні').map((opt) => {
                                const kind = getSurfaceKind(tapKind, opt.val);
                                const selected = isSwatchSelected(opt);
                                return (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        className={`r3d-swatch ${selected ? 'active' : ''}`}
                                        onClick={() => pickMaterial(opt)}
                                    >
                                        <span
                                            className="r3d-swatch-sq"
                                            style={opt.img
                                                ? { backgroundImage: `url(${opt.img})` }
                                                : { background: kind ? getSurfaceColor(kind) : '#d9d9dd' }}
                                        />
                                        <span className="r3d-swatch-nm">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
