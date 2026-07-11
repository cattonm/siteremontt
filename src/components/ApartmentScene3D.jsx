// src/components/ApartmentScene3D.jsx
// Ізометричний план квартири на основі ФІКСОВАНОГО шаблону
// (src/data/apartmentTemplate.js) — як у Kapitel: планування намальоване
// один раз руками, а кімнати користувача лише "підписують" зони макета.
//
// Інтерактив:
//  - клік по зоні З кімнатою — вибирає її;
//  - клік по ПОРОЖНІЙ зоні — батьківський компонент СТВОРЮЄ кімнату
//    цього типу (onZonePress вирішує);
//  - плашки-лейбли теж клікабельні;
//  - неактивні плашки компактні («2. Кімната»), активна — повна, з
//    червоною площею, тому підписи не затуляють модель.
import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useMaterialFill } from '../utils/materialFill';
import { OutlinedBox, OutlinedCylinder, OutlinedSurface } from './three/Outlined';
import { FLOOR_THICKNESS } from './three/sceneConstants';
import { SLOT_SIZE } from '../utils/layoutEngine';
import { FURNITURE_LAYOUTS } from '../data/furnitureLayouts';
import {
    ZONES, WALLS, BOUNDS_MAIN, BOUNDS_FULL,
    TEMPLATE_WALL_HEIGHT as WALL_H, SILL_HEIGHT,
    EXT_THICKNESS, INT_THICKNESS,
    assignRoomsToZones,
} from '../data/apartmentTemplate';

// ====== НАЛАШТУВАННЯ ВИГЛЯДУ ======
const ELEVATION_DEG = 42;   // кут погляду зверху
const AZIMUTH_DEG = 45;     // поворот навколо будинку
const FIT_FRACTION = 0.85;  // частка в'юпорта, яку займає модель
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

const ACCENT = '#e31e24';          // фірмовий червоний
const WALL_COLOR = '#ffffff';
const WALL_CAP_COLOR = '#141414';  // чорний зріз стін = лінії плану
const CAP_HEIGHT = 0.07;
const CAP_OVERHANG = 0.02;
const FLOOR_EMPTY = '#f1f1ee';     // зона без кімнати користувача
const FLOOR_ASSIGNED = '#fbfbfa';  // кімната є, матеріал ще не обрано

// ====== КАМЕРА (ортографічна, фіксований кут; зум = camera.zoom) ======
function IsoCamera({ bounds, userZoom }) {
    const { camera, size, invalidate } = useThree();

    /* eslint-disable react-hooks/immutability -- three.js імперативний, мутація камери тут — норма r3f */
    useEffect(() => {
        const { width, depth } = bounds;
        const el = THREE.MathUtils.degToRad(ELEVATION_DEG);
        const az = THREE.MathUtils.degToRad(AZIMUTH_DEG);
        const D = Math.max(width, depth) * 4;

        camera.position.set(
            Math.cos(el) * Math.cos(az) * D,
            Math.sin(el) * D,
            Math.cos(el) * Math.sin(az) * D
        );
        camera.lookAt(0, WALL_H * 0.35, 0);
        camera.near = 0.1;
        camera.far = D * 3;

        const projW = (width + depth) * Math.SQRT1_2;
        const projH = projW * Math.sin(el) + WALL_H * Math.cos(el) + 0.6;
        const fitZoom = Math.min(size.width / projW, size.height / projH) * FIT_FRACTION;

        camera.zoom = fitZoom * userZoom;
        camera.updateProjectionMatrix();
        // У frameloop="demand" зміна camera.zoom НЕ зачіпає scene graph,
        // тож r3f сам кадр не запланує — просимо явно.
        invalidate();
    }, [camera, size.width, size.height, bounds.width, bounds.depth, userZoom, invalidate]);
    /* eslint-enable react-hooks/immutability */

    return null;
}

// ====== СТІНА: біле тіло + чорна "кришка" (лінія плану) ======
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

// Перетворює сегмент шаблону {a, b, kind} на бокс потрібної товщини/висоти.
// Кінці подовжуємо на півтовщини, щоб кути стін змикались без щілин.
function WallSegment({ wall }) {
    const t = wall.kind === 'int' ? INT_THICKNESS : EXT_THICKNESS;
    const h = wall.kind === 'sill' ? SILL_HEIGHT : WALL_H;
    const alongX = Math.abs(wall.a[1] - wall.b[1]) < 1e-6;
    const len = alongX ? Math.abs(wall.b[0] - wall.a[0]) : Math.abs(wall.b[1] - wall.a[1]);
    const cx = (wall.a[0] + wall.b[0]) / 2;
    const cz = (wall.a[1] + wall.b[1]) / 2;
    const args = alongX ? [len + t, h, t] : [t, h, len + t];
    return <PlanWall args={args} position={[cx, h / 2, cz]} />;
}

// ====== ПІДЛОГА ЗОНИ (клікабельна) ======
function ZoneFloor({ zone, room, isActive, onPress }) {
    // Хуки викликаються завжди (навіть коли кімнати нема) — правило React.
    const fill = useMaterialFill(zone.type, 'floor', room?.floor ?? null, zone.w, zone.d);
    const color = room?.floor ? fill.color : (room ? FLOOR_ASSIGNED : FLOOR_EMPTY);
    const cx = zone.x + zone.w / 2;
    const cz = zone.z + zone.d / 2;

    return (
        <>
            {isActive && (
                <mesh position={[cx, 0.002, cz]}>
                    <boxGeometry args={[zone.w + 0.1, 0.012, zone.d + 0.1]} />
                    <meshBasicMaterial color={ACCENT} />
                </mesh>
            )}
            <OutlinedSurface
                args={[zone.w - 0.02, FLOOR_THICKNESS, zone.d - 0.02]}
                position={[cx, FLOOR_THICKNESS / 2 + (isActive ? 0.008 : 0), cz]}
                color={color}
                texture={room?.floor ? fill.texture : null}
                onClick={(e) => { e.stopPropagation(); onPress(zone.id); }}
            />
        </>
    );
}

// ====== МЕБЛІ ======
// Розкладки з furnitureLayouts.js зроблені під комірки SLOT_SIZE, а зони
// шаблону більші — тому масштабуємо ПОЗИЦІЇ (не розміри) і про всяк випадок
// затискаємо центри, щоб предмети не вилазили за межі зони.
function ZoneFurniture({ zone }) {
    const pieces = FURNITURE_LAYOUTS[zone.type];
    if (!pieces) return null;
    const slot = SLOT_SIZE[zone.type] || { width: 2.0, depth: 1.8 };
    const sx = zone.w / slot.width;
    const sz = zone.d / slot.depth;
    const clamp = (v, max) => Math.min(Math.max(v, 0.35), max - 0.35);

    return (
        <group position={[zone.x, 0, zone.z]}>
            {pieces.map((p, i) => {
                const pos = [clamp(p.pos[0] * sx, zone.w), p.pos[1], clamp(p.pos[2] * sz, zone.d)];
                return p.shape === 'cylinder' ? (
                    <OutlinedCylinder key={i} args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                ) : (
                    <OutlinedBox key={i} args={p.args} position={pos} rotation={p.rotation} color={p.color} />
                );
            })}
        </group>
    );
}

// ====== ЛЕЙБЛ (клікабельний; компактний, поки не активний) ======
function ZoneLabel({ zone, room, index, isActive, onPress }) {
    const [lx, lz] = zone.label;
    const [shiftX = 0, shiftY = 0] = zone.labelShift || [];
    const area = parseFloat(room.measurements?.floor) || 0;
    return (
        <Html position={[lx, WALL_H + 0.25, lz]} center zIndexRange={[20, 0]}>
            <button
                type="button"
                onClick={() => onPress(zone.id)}
                style={{
                    display: 'flex', alignItems: 'baseline', gap: '5px',
                    transform: `translate(${shiftX}px, ${shiftY}px)`,
                    background: '#ffffff', color: '#141414',
                    padding: isActive ? '4px 10px' : '2px 8px',
                    borderRadius: '8px', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    border: `1.5px solid ${isActive ? ACCENT : 'rgba(0,0,0,0.08)'}`,
                    fontSize: isActive ? '12px' : '10px', fontWeight: 700,
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}
            >
                <span>{index}. {room.name}</span>
                {isActive && area > 0 && <span style={{ color: ACCENT }}>{area} м²</span>}
            </button>
        </Html>
    );
}

function ZoomControls({ zoom, onZoom, onReset }) {
    const btn = {
        width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e5e5ea',
        background: '#fff', color: '#1c1c1e', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: 0,
    };
    return (
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 30 }}>
            <button type="button" style={btn} onClick={() => onZoom(-ZOOM_STEP)} aria-label="Зменшити"><Minus size={16} /></button>
            <span style={{
                minWidth: '46px', textAlign: 'center', fontSize: '13px', fontWeight: 600,
                color: '#1c1c1e', background: '#fff', border: '1px solid #e5e5ea',
                borderRadius: '16px', padding: '5px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>{Math.round(zoom * 100)}%</span>
            <button type="button" style={btn} onClick={() => onZoom(ZOOM_STEP)} aria-label="Збільшити"><Plus size={16} /></button>
            <button type="button" style={btn} onClick={onReset} aria-label="Скинути вид"><RotateCcw size={15} /></button>
        </div>
    );
}

export default function ApartmentScene3D({ rooms, activeId, onZonePress }) {
    const [zoom, setZoom] = useState(1);
    const { roomByZoneId } = useMemo(() => assignRoomsToZones(rooms), [rooms]);

    // Підвал/мансарду малюємо, лише коли їх додав користувач; від цього
    // залежать і межі сцени (щоб порожній макет не мав дірки праворуч).
    const showDetached = ZONES.some((z) => z.detached && roomByZoneId[z.id]);
    const bounds = showDetached ? BOUNDS_FULL : BOUNDS_MAIN;
    const visibleZones = ZONES.filter((z) => !z.detached || roomByZoneId[z.id]);
    const visibleWalls = WALLS.filter((w) => !w.zoneId || roomByZoneId[w.zoneId]);

    const changeZoom = (delta) =>
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

    return (
        <div style={{ position: 'relative', width: '100%', height: '380px', background: '#ffffff', borderRadius: '12px' }}>
            {/* frameloop="demand": сцена статична, тож рендеримо кадр лише при
                змінах (зум, вибір зони, матеріали) — див. invalidate() в IsoCamera. */}
            <Canvas orthographic dpr={[1, 2]} frameloop="demand" shadows="soft" style={{ width: '100%', height: '100%' }}>
                <IsoCamera bounds={bounds} userZoom={zoom} />
                <ambientLight intensity={0.55} />
                <hemisphereLight intensity={0.35} color="#ffffff" groundColor="#d6d2ca" />
                {/* Сонце з тінями: сцена відцентрована в origin (група нижче
                    зміщена на -bounds/2), тому дефолтний target (0,0,0) — те,
                    що треба. Коробка тіней накриває план із запасом. */}
                <directionalLight
                    castShadow
                    position={[10, 16, 8]}
                    intensity={0.95}
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                    shadow-camera-left={-(Math.max(bounds.width, bounds.depth) * 0.72 + 1.5)}
                    shadow-camera-right={Math.max(bounds.width, bounds.depth) * 0.72 + 1.5}
                    shadow-camera-top={Math.max(bounds.width, bounds.depth) * 0.72 + 1.5}
                    shadow-camera-bottom={-(Math.max(bounds.width, bounds.depth) * 0.72 + 1.5)}
                    shadow-camera-near={2}
                    shadow-camera-far={50}
                    shadow-bias={-0.0004}
                    shadow-normalBias={0.03}
                />
                {/* Площина-тінеловка: план кидає м'яку тінь на "стіл" під собою */}
                <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
                    <planeGeometry args={[bounds.width * 2.4, bounds.depth * 2.4]} />
                    <shadowMaterial transparent opacity={0.13} />
                </mesh>

                <group position={[-bounds.width / 2, 0, -bounds.depth / 2]}>
                    {visibleZones.map((zone) => (
                        <ZoneFloor
                            key={zone.id}
                            zone={zone}
                            room={roomByZoneId[zone.id]}
                            isActive={roomByZoneId[zone.id]?.id === activeId}
                            onPress={onZonePress}
                        />
                    ))}

                    {visibleZones.map((zone) => (
                        <ZoneFurniture key={`f_${zone.id}`} zone={zone} />
                    ))}

                    {visibleWalls.map((wall, i) => (
                        <WallSegment key={i} wall={wall} />
                    ))}

                    {visibleZones.map((zone) => {
                        const room = roomByZoneId[zone.id];
                        if (!room) return null; // порожні зони — без підпису
                        return (
                            <ZoneLabel
                                key={`label_${zone.id}`}
                                zone={zone}
                                room={room}
                                index={rooms.indexOf(room) + 1}
                                isActive={room.id === activeId}
                                onPress={onZonePress}
                            />
                        );
                    })}
                </group>
            </Canvas>

            <ZoomControls zoom={zoom} onZoom={changeZoom} onReset={() => setZoom(1)} />
        </div>
    );
}