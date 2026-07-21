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
import { getSurfaceKind, getSurfaceColor, getSurfaceTexture, repeatsFor } from '../utils/proceduralTextures';
import { OutlinedBox, OutlinedCylinder, OutlinedSurface } from './three/Outlined';
import { FLOOR_THICKNESS } from './three/sceneConstants';
import { SLOT_SIZE } from '../utils/layoutEngine';
import { FURNITURE_LAYOUTS } from '../data/furnitureLayouts';
import {
    TEMPLATE_WALL_HEIGHT as WALL_H, SILL_HEIGHT,
    EXT_THICKNESS, INT_THICKNESS,
} from '../data/apartmentTemplate';
import { buildFloorPlan } from '../utils/floorPlanLayout';

// ====== НАЛАШТУВАННЯ ВИГЛЯДУ ======
const ELEVATION_DEG = 42;   // кут погляду зверху
const AZIMUTH_DEG = 45;     // поворот навколо будинку
const FIT_FRACTION = 0.9;   // частка в'юпорта, яку займає модель
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

const ACCENT = '#C2251D';          // фірмовий червоний (three-матеріали; у HTML-стилях — 'var(--accent)')
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
    }, [camera, size.width, size.height, bounds, userZoom, invalidate]);
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
// Матеріал підлоги малюється ТІЄЮ Ж процедурною текстурою, що і в 3D-прев'ю
// кімнати (proceduralTextures) — на плані видно міні-ялинку паркету, сітку
// плитки і т.д. Раніше тут був середній колір фото з каталогу (materialFill),
// але лайфстайл-кадри давали брудно-коричневу заливку.
function ZoneFloor({ zone, room, isActive, dimmed, onPress }) {
    const kind = getSurfaceKind('floor', room?.floor ?? null);
    const texture = kind
        ? getSurfaceTexture(kind, repeatsFor(kind, zone.w), repeatsFor(kind, zone.d))
        : null;
    const color = kind ? getSurfaceColor(kind) : (room ? FLOOR_ASSIGNED : FLOOR_EMPTY);
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
                texture={texture}
                dim={dimmed}
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
function ZoneLabel({ zone, room, index, isActive, dimmed, onPress }) {
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
                    background: 'var(--card-bg)', color: 'var(--text-color)',
                    padding: isActive ? '4px 10px' : '2px 8px',
                    borderRadius: '8px', cursor: 'pointer',
                    // Активна плашка — повна; невибрані приглушені, а коли
                    // якусь зону обрано, решта тьмяніє ще сильніше (акцент на вибір).
                    opacity: isActive ? 1 : (dimmed ? 0.35 : 0.75),
                    transition: 'opacity 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'}`,
                    fontSize: isActive ? '12px' : '10px', fontWeight: 700,
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}
            >
                <span>{index}. {room.name}</span>
                {isActive && area > 0 && <span style={{ color: 'var(--accent)' }}>{area} м²</span>}
            </button>
        </Html>
    );
}

function ZoomControls({ zoom, onZoom, onReset }) {
    const btn = {
        width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)',
        background: 'var(--card-bg)', color: 'var(--text-color)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: 0,
    };
    return (
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 30 }}>
            <button type="button" style={btn} onClick={() => onZoom(-ZOOM_STEP)} aria-label="Зменшити"><Minus size={16} /></button>
            <span style={{
                minWidth: '46px', textAlign: 'center', fontSize: '13px', fontWeight: 600,
                color: 'var(--text-color)', background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                borderRadius: '16px', padding: '5px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>{Math.round(zoom * 100)}%</span>
            <button type="button" style={btn} onClick={() => onZoom(ZOOM_STEP)} aria-label="Збільшити"><Plus size={16} /></button>
            <button type="button" style={btn} onClick={onReset} aria-label="Скинути вид"><RotateCcw size={15} /></button>
        </div>
    );
}

// ====== ПОДІУМ «архітектурного макета» ======
// Бетонна плита під планом + тонка темна окантовка знизу — модель «стоїть»
// на столі, а не висить у порожнечі. Центрована в origin (як тіне-площина).
function Podium({ bounds }) {
    const w = bounds.width + 1.6;
    const d = bounds.depth + 1.6;
    const concrete = getSurfaceTexture('screed', repeatsFor('screed', w), repeatsFor('screed', d));
    return (
        <group>
            <mesh position={[0, -0.27, 0]} receiveShadow>
                <boxGeometry args={[w, 0.5, d]} />
                <meshStandardMaterial color="#ffffff" map={concrete} roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
                <boxGeometry args={[w + 0.14, 0.07, d + 0.14]} />
                <meshBasicMaterial color="#17181C" />
            </mesh>
        </group>
    );
}

export default function ApartmentScene3D({ rooms, activeId, onZonePress }) {
    const [zoom, setZoom] = useState(1);
    // Темна тема читається з body.classList — вся вкладка перемальовується
    // при перемиканні теми, тож окремої реактивності не треба.
    const dark = typeof document !== 'undefined' && document.body.classList.contains('dark-theme');

    // ПЛАН ГЕНЕРУЄТЬСЯ З РЕАЛЬНИХ ПЛОЩ (а не береться з фіксованого шаблону).
    // Кожна зона = конкретна кімната користувача: zone.id === room.id.
    // Тому 26 м² вітальня справді більша за 5 м² санвузол, а третя кімната
    // чи другий санвузол не «випадають» із плану, як було раніше.
    const { zones, walls, bounds } = useMemo(() => buildFloorPlan(rooms), [rooms]);
    const roomById = useMemo(
        () => Object.fromEntries((rooms || []).map((r) => [r.id, r])),
        [rooms],
    );

    const visibleZones = zones;
    const visibleWalls = walls;

    const changeZoom = (delta) =>
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

    return (
        <div style={{ position: 'relative', width: '100%', height: '380px', background: 'var(--stage-bg)', borderRadius: '12px' }}>
            {/* Порожній стан: раніше тут показувався макет-шаблон із порожніми
                зонами, і клік по ньому створював кімнату. Тепер план — це
                дзеркало реальних кімнат, тож поки їх нема, показуємо підказку,
                а не порожню білу пляму. */}
            {zones.length === 0 && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: 'var(--hint-color)', textAlign: 'center', padding: '20px', zIndex: 2,
                }}>
                    <div style={{ fontSize: '34px' }}>🏗</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-color)' }}>Тут з'явиться ваш план</div>
                    <div style={{ fontSize: '13.5px', maxWidth: '260px', lineHeight: 1.45 }}>
                        Додайте приміщення кнопками вгорі — план збереться сам,
                        а розміри кімнат будуть пропорційні введеним площам.
                    </div>
                </div>
            )}
            {/* frameloop="demand": сцена статична, тож рендеримо кадр лише при
                змінах (зум, вибір зони, матеріали) — див. invalidate() в IsoCamera. */}
            <Canvas
                orthographic
                dpr={[1, 2]}
                frameloop="demand"
                shadows="soft"
                style={{ width: '100%', height: '100%' }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
                role="img"
                aria-label="3D-план квартири з розташуванням приміщень"
            >
                <IsoCamera bounds={bounds} userZoom={zoom} />
                {/* ACES темніший за лінійний — ambient прибрано, hemisphere/сонце
                    підняті; у темній темі «земля» hemisphere теж темна. */}
                <hemisphereLight intensity={0.75} color="#ffffff" groundColor={dark ? '#3a3b42' : '#d6d2ca'} />
                {/* Сонце з тінями: сцена відцентрована в origin (група нижче
                    зміщена на -bounds/2), тому дефолтний target (0,0,0) — те,
                    що треба. Коробка тіней накриває план із запасом. */}
                <directionalLight
                    castShadow
                    position={[10, 16, 8]}
                    intensity={2.0}
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
                {/* Бетонний подіум під планом («архітектурний макет») */}
                <Podium bounds={bounds} />

                {/* Площина-тінеловка: тінь падає на "стіл" під подіумом,
                    тож макет справді «стоїть» на поверхні */}
                <mesh rotation-x={-Math.PI / 2} position={[0, -0.54, 0]} receiveShadow>
                    <planeGeometry args={[bounds.width * 2.4, bounds.depth * 2.4]} />
                    <shadowMaterial transparent opacity={0.22} />
                </mesh>

                {/* offsetZ < 0, якщо є балкон (смуга виступає над фасадом) —
                    інакше сцена була б зміщена і план «тікав» із кадру. */}
                <group position={[-bounds.width / 2, 0, -(bounds.depth / 2 + (bounds.offsetZ || 0))]}>
                    {visibleZones.map((zone) => (
                        <ZoneFloor
                            key={zone.id}
                            zone={zone}
                            room={roomById[zone.id]}
                            isActive={zone.id === activeId}
                            dimmed={activeId != null && zone.id !== activeId}
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
                        const room = roomById[zone.id];
                        if (!room) return null;
                        return (
                            <ZoneLabel
                                key={`label_${zone.id}`}
                                zone={zone}
                                room={room}
                                index={rooms.indexOf(room) + 1}
                                isActive={room.id === activeId}
                                dimmed={activeId != null && room.id !== activeId}
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