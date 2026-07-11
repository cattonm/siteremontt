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
import React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { OutlinedBox, OutlinedCylinder, OutlinedSurface } from './three/Outlined';
import { getSurfaceKind, getSurfaceColor, getSurfaceTexture, repeatsFor } from '../utils/proceduralTextures';
import { GROUP_ICONS, DEFAULT_GROUP_ICON } from '../data/groupIcons';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';
import { FURNITURE_LAYOUTS } from '../data/furnitureLayouts';
import { SLOT_SIZE } from '../utils/layoutEngine';
import { vibe } from '../utils/telegram';

// ====== ГЕОМЕТРІЯ КІМНАТИ ======
const WALL_H = 2.7;     // висота стін, м
const WALL_T = 0.09;    // товщина стін
const FLOOR_T = 0.09;   // товщина плити підлоги
const CAP_H = 0.06;     // чорна "кришка" зрізу стіни (лінія плану)
const CAP_OVER = 0.015;
const CAP_COLOR = '#161616';
const WOOD = '#cdb293';
const rad = (deg) => (deg * Math.PI) / 180;

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
    if (!kind) return { color: fallback, texture: null };
    return {
        color: getSurfaceColor(kind),
        texture: getSurfaceTexture(kind, repeatsFor(kind, widthM), repeatsFor(kind, heightM)),
    };
}

// ====== КАМЕРА: фіксований старт + обмежений орбіт ======
// key на компоненті (у батька) перезбирає камеру, коли міняється площа.
function CameraRig({ W, D }) {
    const tx = W / 2, ty = 0.85, tz = D / 2;
    const R = Math.max(W, D) * 1.5 + 2.4;
    const polar = rad(64), az = rad(42);
    const pos = [
        tx + R * Math.sin(polar) * Math.sin(az),
        ty + R * Math.cos(polar),
        tz + R * Math.sin(polar) * Math.cos(az),
    ];
    return (
        <>
            <PerspectiveCamera makeDefault fov={34} near={0.1} far={100} position={pos} />
            <OrbitControls
                target={[tx, ty, tz]}
                enablePan={false}
                enableDamping={false}
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

// ====== СОНЦЕ З ТІНЯМИ ======
// Directional light, НАЦІЛЕНИЙ на центр кімнати (target треба явно додати
// в сцену через <primitive>, інакше three ігнорує його позицію).
// Ортографічна "камера тіней" накриває кімнату із запасом — інакше тіні
// обрізаються по краях. mapSize 1024 достатньо для такої маленької сцени.
function SunLight({ W, D }) {
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
                intensity={1.35}
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
function Shell({ W, D, floorFill, backFill, leftFill }) {
    return (
        <group>
            {/* Подіум під кімнатою — щоб модель "стояла", як архітектурний макет */}
            <OutlinedBox args={[W + 0.55, 0.12, D + 0.55]} position={[W / 2, -FLOOR_T - 0.06, D / 2]} color="#f4f4f1" />

            {/* Підлога (верхня площина на y=0) */}
            <OutlinedSurface
                args={[W, FLOOR_T, D]}
                position={[W / 2, -FLOOR_T / 2, D / 2]}
                color={floorFill.color}
                texture={floorFill.texture}
            />

            {/* Задня стіна: тіло + чорна кришка (стиль плану) */}
            <OutlinedSurface
                args={[W + WALL_T, WALL_H, WALL_T]}
                position={[(W - WALL_T) / 2, WALL_H / 2, -WALL_T / 2]}
                color={backFill.color}
                texture={backFill.texture}
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
            <meshStandardMaterial color="#fff6dd" emissive="#ffd98f" emissiveIntensity={1.25} />
        </mesh>
    );
}

function LightFixtures({ lightArr, W, D }) {
    const has = (name) => lightArr.includes(name);
    const spots = has('Точкове світло');
    const chandelier = has('Люстра');
    const track = has('Трек / Лінія');
    const led = has('LED підсвітка') || has('Декор підсвітка');

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
                        <meshStandardMaterial color="#fff2cf" emissive="#ffdf9e" emissiveIntensity={1.4} />
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
                        <meshStandardMaterial color="#f3efe7" emissive="#ffd9a0" emissiveIntensity={0.45} />
                    </mesh>
                    <pointLight position={[0, WALL_H - 0.75, 0]} intensity={4} distance={7} decay={1.8} color="#ffd9a8" />
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
                            <meshStandardMaterial color="#1d1d21" emissive="#ffe8bf" emissiveIntensity={0.35} />
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
                <pointLight position={[W / 2, WALL_H - 0.35, D / 2]} intensity={2.4} distance={7} decay={2} color="#fff3da" />
            )}
        </group>
    );
}

// ====== КУХОННИЙ ГАРНІТУР (фартух реагує на вибір apron) ======
function KitchenSet({ W, room }) {
    const withFridge = W >= 2.55;
    const fridgeW = 0.66;
    const setW = Math.min(W - 0.3 - (withFridge ? fridgeW + 0.1 : 0), 3.4);
    const x0 = 0.15;
    const cx = x0 + setW / 2;

    const counterFill = surfaceFill('apron', 'Матеріал стільниці', setW, 0.63); // stoneSlab
    const apronFill = surfaceFill('apron', room.apron, setW, 0.6, '#edeff1');

    const other = room.other || {};
    const lightArr = Array.isArray(room.light) ? room.light : [];
    const workLight = !!other['Підсвітка робочої поверхні'] || lightArr.includes('Декор підсвітка');

    return (
        <group>
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
}

// ====== САНВУЗОЛ: ванна / душ / унітаз / умивальник за вибором ======
function GlassPane({ args, position }) {
    return (
        <mesh position={position}>
            <boxGeometry args={args} />
            <meshStandardMaterial color="#bcd8e4" transparent opacity={0.28} roughness={0.1} metalness={0.1} />
        </mesh>
    );
}

function BathSet({ W, D, room }) {
    const tubType = room.tub?.type && room.tub.type !== 'Не обладнувати' ? room.tub.type : null;
    const showerArr = (Array.isArray(room.shower) ? room.shower : []).filter((v) => v !== 'Не обладнувати');
    const hasTray = showerArr.includes('Піддон (акрил/камінь)');
    const hasTrap = showerArr.includes('Душовий трап (з плитки)');
    const glassWall = showerArr.includes('Скляна перегородка');
    const glassDoor = showerArr.includes('Скляна конструкція з дверима');
    const showerAny = hasTray || hasTrap || glassWall || glassDoor;
    const toiletType = room.toilet?.type && room.toilet.type !== 'Ні' ? room.toilet.type : null;

    // Душова зона в дальньому лівому куті
    const S = Math.min(0.95, W - 0.5, D - 0.5);
    const showerCx = 0.12 + S / 2;

    // Ванна вздовж задньої стіни, правіше душа. Якщо не влазить — уздовж
    // правого краю (перпендикулярно). Окремостояча відступає від стіни.
    const tubLen = 1.65, tubDep = 0.75, tubH = 0.52;
    const free = room.tub?.type === 'Окремостояча';
    const tubStartX = showerAny ? 0.12 + S + 0.2 : 0.15;
    const tubFits = W - tubStartX >= tubLen + 0.1;
    const tubAlt = !tubFits && D >= tubLen + 0.6;

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
}

// ====== СИЛУЕТИ МЕБЛІВ для решти типів (той самий підхід, що на плані) ======
function GenericFurniture({ type, W, D }) {
    const pieces = FURNITURE_LAYOUTS[type];
    if (!pieces) return null;
    const slot = SLOT_SIZE[type] || { width: 2.0, depth: 1.8 };
    const sx = W / slot.width;
    const sz = D / slot.depth;
    const clamp = (v, max) => Math.min(Math.max(v, 0.35), max - 0.35);
    return (
        <group>
            {pieces.map((p, i) => {
                const pos = [clamp(p.pos[0] * sx, W), p.pos[1], clamp(p.pos[2] * sz, D)];
                return p.shape === 'cylinder' ? (
                    <OutlinedCylinder key={i} args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                ) : (
                    <OutlinedBox key={i} args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                );
            })}
        </group>
    );
}

// ====== ХОТСПОТИ: 3D-якорі за групами, наявними в цього типу кімнати ======
function buildHotspots(type, W, D, groups) {
    const list = [];
    const add = (group, pos) => { if (groups.has(group)) list.push({ group, pos }); };
    const busyWalls = type === 'kitchen' || type === 'bath'; // задня стіна зайнята гарнітуром/сантехнікою

    add('Підлога', [W * 0.6, 0.07, D * 0.68]);
    add('Стіни', busyWalls ? [0.06, 1.7, D * 0.42] : [Math.min(W * 0.92, W - 0.3), 1.55, 0.06]);
    if (type === 'kitchen') {
        const setW = Math.min(W - 0.3 - (W >= 2.55 ? 0.76 : 0), 3.4);
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
export default function RoomPreview3D({ room, activeGroup, onHotspotClick }) {
    const { W, D } = roomDims(room);
    const type = room.type;

    // Поле стін у санвузлі зветься wall_tile, всюди інде — walls
    const wallField = type === 'bath' ? 'wall_tile' : 'walls';
    const wallVal = firstMapped(wallField, room[wallField]);

    const floorFill = surfaceFill('floor', room.floor, W, D, '#ececee', 'screed');
    const backFill = surfaceFill(wallField, wallVal, W, WALL_H, '#f7f5f0');
    const leftFill = surfaceFill(wallField, wallVal, D, WALL_H, '#f7f5f0');

    const lightArr = Array.isArray(room.light) ? room.light : (room.light ? [room.light] : []);

    // Обчислення дешеві (кілька множень і невеликий Set) — мемоізація не потрібна
    const groups = new Set((ROOM_QUESTIONS_CONFIG[type] || []).map((q) => q.group || 'Інше'));
    const hotspots = buildHotspots(type, W, D, groups);

    const hasWindow = type !== 'bath' && type !== 'balcony' && type !== 'wardrobe' && W >= 1.9;
    const winX = Math.max(Math.min(W * 0.62, W - 0.85), 0.85);
    const hasDoor = type !== 'bath' && type !== 'balcony' && D >= 1.9;
    const hasGeneric = type !== 'kitchen' && type !== 'bath';

    return (
        <div className="r3d-wrap">
            {/* frameloop="demand": GPU малює кадр лише коли щось змінилось
                (вибір матеріалу, обертання камери). Разом із планом квартири
                на екрані ДВА канваси — без цього обидва крутили б 60 fps
                постійно і садили батарею в Telegram WebView. Damping вимкнено
                вище, бо інерція вимагає безперервних кадрів. */}
            <Canvas dpr={[1, 2]} frameloop="demand" shadows="soft">
                <CameraRig key={`${W.toFixed(1)}x${D.toFixed(1)}`} W={W} D={D} />
                {/* Світло трьома шарами: ambient (загальний рівень) + hemisphere
                    (м'який градієнт небо/земля, "оживляє" білі поверхні) +
                    directional з тінями (об'єм). Разом ≈ старій яскравості,
                    але тепер форми читаються тінями, а не лише контуром. */}
                <ambientLight intensity={0.5} />
                <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#d8d3ca" />
                <SunLight W={W} D={D} />

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

                <Shell W={W} D={D} floorFill={floorFill} backFill={backFill} leftFill={leftFill} />

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

                <LightFixtures lightArr={lightArr} W={W} D={D} />

                {type === 'kitchen' && <KitchenSet W={W} room={room} />}
                {type === 'bath' && <BathSet W={W} D={D} room={room} />}
                {hasGeneric && <GenericFurniture type={type} W={W} D={D} />}

                {hotspots.map((h) => {
                    const Icon = GROUP_ICONS[h.group] || DEFAULT_GROUP_ICON;
                    return (
                        <Html key={h.group} position={h.pos} center zIndexRange={[40, 0]}>
                            <button
                                type="button"
                                className={`r3d-hotspot ${activeGroup === h.group ? 'active' : ''}`}
                                aria-label={h.group}
                                onClick={() => { vibe('light'); onHotspotClick?.(h.group); }}
                            >
                                <Icon size={16} />
                            </button>
                        </Html>
                    );
                })}
            </Canvas>
            <div className="r3d-badge">Схематичне прев'ю · покрутити пальцем</div>
        </div>
    );
}
