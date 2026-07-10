// src/components/ApartmentScene3D.jsx
// Ізометричний план квартири у стилі Kapitel:
//  - ортографічна камера з ФІКСОВАНИМ кутом (обертання вимкнене);
//  - білі стіни + суцільний чорний "зріз" зверху (план читається чорними лініями);
//  - білі плашки-лейбли «1. Кухня  35 м²» (площа — червоним), завжди повернуті до камери;
//  - активна кімната підсвічена червоною рамкою;
//  - чистий білий фон, без сірого "подіуму";
//  - контроли: − / % / + / скидання виду (як на референсі).
import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { computeApartmentLayout } from '../utils/layoutEngine';
import { useMaterialFill } from '../utils/materialFill';
import { OutlinedBox, OutlinedSurface } from './three/Outlined';
import { WALL_HEIGHT, EXTERIOR_THICKNESS, INTERIOR_THICKNESS, FLOOR_THICKNESS } from './three/sceneConstants';
import RoomFurniture3D from './RoomFurniture3D';

// ====== НАЛАШТУВАННЯ ВИГЛЯДУ (крути ці числа, щоб підігнати картинку) ======
const ELEVATION_DEG = 35;   // кут погляду зверху (35° ≈ класична ізометрія Kapitel)
const AZIMUTH_DEG = 45;     // поворот навколо будинку (45° = дивимось "з кута")
const FIT_FRACTION = 0.75;  // яку частку в'юпорта займає модель (0.75 = 75%)
const MIN_ZOOM = 0.5;       // 50%
const MAX_ZOOM = 2.5;       // 250%
const ZOOM_STEP = 0.25;

const ACCENT = '#e31e24';        // фірмовий червоний (як у Kapitel)
const WALL_COLOR = '#ffffff';    // стіни — білі площини
const WALL_CAP_COLOR = '#141414';// чорний зріз стіни зверху
const CAP_HEIGHT = 0.07;         // товщина чорного зрізу (метри)
const CAP_OVERHANG = 0.02;       // наскільки зріз ширший за стіну (щоб лінія була жирною)
const IDLE_FLOOR_COLOR = '#f6f6f4'; // підлога, поки матеріал не обрано (нейтральна, як у Kapitel)

// Старі пастельні кольори за типом кімнати. Якщо захочеш повернути їх для
// необраних підлог — постав USE_TYPE_TINT = true.
const USE_TYPE_TINT = false;
const TYPE_FALLBACK_COLOR = {
    room: '#cfe3ff', kitchen: '#ffe6bf', bath: '#c7f0e0',
    hallway: '#e7e7ec', balcony: '#d8f0c3', wardrobe: '#f0d8f4',
    basement: '#dcd3c8', attic: '#e3dccb',
};

// ====== КАМЕРА ======
// Ортографічна камера не має перспективи: розмір моделі на екрані залежить
// тільки від camera.zoom (пікселів на метр), а НЕ від відстані. Тому "зум"
// тут — це просто множник zoom, а позиція камери фіксована під потрібним кутом.
function IsoCamera({ building, userZoom }) {
    const { camera, size } = useThree();

    // Мутувати camera напряму — стандартний патерн react-three-fiber
    // (three.js-об'єкти імперативні за своєю природою). Нове суворе правило
    // react-hooks/immutability цього не знає, тому вимикаємо його для блоку.
    /* eslint-disable react-hooks/immutability */
    useEffect(() => {
        const width = Math.max(building.width, 3);
        const depth = Math.max(building.depth, 3);
        const el = THREE.MathUtils.degToRad(ELEVATION_DEG);
        const az = THREE.MathUtils.degToRad(AZIMUTH_DEG);

        // Ставимо камеру на фіксований напрямок. Дистанція D для ортографіки
        // впливає лише на площини відсікання (near/far), не на масштаб.
        const D = Math.max(width, depth) * 4;
        camera.position.set(
            Math.cos(el) * Math.cos(az) * D,
            Math.sin(el) * D,
            Math.cos(el) * Math.sin(az) * D
        );
        camera.lookAt(0, WALL_HEIGHT * 0.4, 0);
        camera.near = 0.1;
        camera.far = D * 3;

        // Скільки метрів займає будинок на екрані у цій проєкції:
        // ширина ≈ (w + d) * cos45°, висота ≈ ширина * sin(нахилу) + висота стін.
        const projW = (width + depth) * Math.SQRT1_2;
        const projH = projW * Math.sin(el) + WALL_HEIGHT * Math.cos(el) + 0.8; // +0.8м запасу під лейбли
        const fitZoom = Math.min(size.width / projW, size.height / projH) * FIT_FRACTION;

        camera.zoom = fitZoom * userZoom;
        camera.updateProjectionMatrix();
    }, [camera, size.width, size.height, building.width, building.depth, userZoom]);
    /* eslint-enable react-hooks/immutability */

    return null;
}

// ====== СТІНА "ЯК НА ПЛАНІ" ======
// Біле тіло стіни (з тонким контуром із Outlined.jsx) + чорна "кришка" зверху.
// Кришка трохи ширша за стіну і не реагує на світло (meshBasicMaterial),
// тому зверху план читається як жирні чорні лінії — головний прийом Kapitel.
function PlanWall({ args, position }) {
    const [w, h, d] = args;
    const [x, y, z] = position;
    return (
        <group>
            <OutlinedBox args={args} position={position} color={WALL_COLOR} />
            <mesh position={[x, y + h / 2 + CAP_HEIGHT / 2, z]} raycast={() => null}>
                <boxGeometry args={[w + CAP_OVERHANG * 2, CAP_HEIGHT, d + CAP_OVERHANG * 2]} />
                <meshBasicMaterial color={WALL_CAP_COLOR} />
            </mesh>
        </group>
    );
}

function RoomFloor({ room, isActive, onSelect }) {
    const fill = useMaterialFill(room.type, 'floor', room.floor, room.width, room.depth);
    const idleColor = USE_TYPE_TINT ? (TYPE_FALLBACK_COLOR[room.type] || '#e9e9ec') : IDLE_FLOOR_COLOR;
    const color = room.floor ? fill.color : idleColor;
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;

    return (
        <>
            {/* Червона рамка активної кімнати: трохи більша червона пластина
                під підлогою — по периметру визирає тонка червона смуга. */}
            {isActive && (
                <mesh position={[centerX, 0.002, centerZ]}>
                    <boxGeometry args={[room.width + 0.1, 0.012, room.depth + 0.1]} />
                    <meshBasicMaterial color={ACCENT} />
                </mesh>
            )}
            <OutlinedSurface
                args={[room.width - 0.02, FLOOR_THICKNESS, room.depth - 0.02]}
                position={[centerX, FLOOR_THICKNESS / 2 + (isActive ? 0.008 : 0), centerZ]}
                color={color}
                texture={fill.texture}
                onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
            />
        </>
    );
}

// Лейбл у стилі Kapitel: біла плашка, «N. Назва» чорним, площа — червоним.
// <Html> з drei — це звичайний DOM поверх канви, тож плашка ЗАВЖДИ дивиться
// на камеру і не масштабується зумом (без distanceFactor розмір сталий).
function RoomLabel({ room, index, isActive }) {
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;
    return (
        <Html position={[centerX, WALL_HEIGHT + 0.3, centerZ]} center zIndexRange={[20, 0]}>
            <div style={{
                display: 'flex', alignItems: 'baseline', gap: '6px',
                background: '#ffffff', padding: '4px 10px', borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                border: `1.5px solid ${isActive ? ACCENT : 'rgba(0,0,0,0.08)'}`,
                fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                color: '#141414', pointerEvents: 'none',
            }}>
                <span>{index}. {room.name}</span>
                {room.area > 0 && <span style={{ color: ACCENT }}>{room.area} м²</span>}
            </div>
        </Html>
    );
}

// ====== КОНТРОЛИ ЗУМУ (звичайний DOM поверх канви, не Three.js) ======
function ZoomControls({ zoom, onZoom, onReset }) {
    const btn = {
        width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e5e5ea',
        background: '#fff', color: '#1c1c1e', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: 0,
    };
    return (
        <div style={{
            position: 'absolute', top: '10px', right: '10px', display: 'flex',
            alignItems: 'center', gap: '8px', zIndex: 30,
        }}>
            <button type="button" style={btn} onClick={() => onZoom(-ZOOM_STEP)} aria-label="Зменшити">
                <Minus size={16} />
            </button>
            <span style={{
                minWidth: '46px', textAlign: 'center', fontSize: '13px', fontWeight: 600,
                color: '#1c1c1e', background: '#fff', border: '1px solid #e5e5ea',
                borderRadius: '16px', padding: '5px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
                {Math.round(zoom * 100)}%
            </span>
            <button type="button" style={btn} onClick={() => onZoom(ZOOM_STEP)} aria-label="Збільшити">
                <Plus size={16} />
            </button>
            <button type="button" style={btn} onClick={onReset} aria-label="Скинути вид">
                <RotateCcw size={15} />
            </button>
        </div>
    );
}

export default function ApartmentScene3D({ rooms, activeId, onSelectRoom }) {
    const layout = useMemo(() => computeApartmentLayout(rooms), [rooms]);
    const { width, depth } = layout.building;
    const { interiorHorizontal, interiorVertical, exterior } = layout.walls;
    const [zoom, setZoom] = useState(1);

    if (layout.rooms.length === 0) return null;

    const changeZoom = (delta) =>
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

    return (
        <div style={{ position: 'relative', width: '100%', height: '320px', background: '#ffffff', borderRadius: '12px' }}>
            <Canvas orthographic dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
                <IsoCamera building={layout.building} userZoom={zoom} />
                <ambientLight intensity={0.9} />
                <directionalLight position={[10, 16, 8]} intensity={0.5} />

                <group position={[-width / 2, 0, -depth / 2]}>
                    {layout.rooms.map((room) => (
                        <RoomFloor key={room.id} room={room} isActive={room.id === activeId} onSelect={onSelectRoom} />
                    ))}

                    {layout.rooms.map((room) => (
                        <RoomFurniture3D key={`f_${room.id}`} room={room} />
                    ))}

                    {/* Зовнішній (східчастий) контур будівлі */}
                    {exterior.map((w, i) =>
                        w.type === 'vertical' ? (
                            <PlanWall
                                key={`ext_v${i}`}
                                args={[EXTERIOR_THICKNESS, WALL_HEIGHT, w.y1 - w.y0 + EXTERIOR_THICKNESS]}
                                position={[w.x, WALL_HEIGHT / 2, (w.y0 + w.y1) / 2]}
                            />
                        ) : (
                            <PlanWall
                                key={`ext_h${i}`}
                                args={[w.x1 - w.x0 + EXTERIOR_THICKNESS, WALL_HEIGHT, EXTERIOR_THICKNESS]}
                                position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2, w.y]}
                            />
                        )
                    )}

                    {/* Внутрішні перегородки між рядами (зонами) */}
                    {interiorHorizontal.map((w, i) => (
                        <PlanWall
                            key={`inth${i}`}
                            args={[w.x1 - w.x0, WALL_HEIGHT, INTERIOR_THICKNESS]}
                            position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2, w.y]}
                        />
                    ))}

                    {/* Внутрішні перегородки між кімнатами в ряду */}
                    {interiorVertical.map((w, i) => (
                        <PlanWall
                            key={`intv${i}`}
                            args={[INTERIOR_THICKNESS, WALL_HEIGHT, w.y1 - w.y0]}
                            position={[w.x, WALL_HEIGHT / 2, (w.y0 + w.y1) / 2]}
                        />
                    ))}

                    {layout.rooms.map((room, i) => (
                        <RoomLabel key={`label_${room.id}`} room={room} index={i + 1} isActive={room.id === activeId} />
                    ))}
                </group>
            </Canvas>

            <ZoomControls zoom={zoom} onZoom={changeZoom} onReset={() => setZoom(1)} />
        </div>
    );
}