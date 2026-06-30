// src/components/ApartmentScene3D.jsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { computeApartmentLayout } from '../utils/layoutEngine';
import { useMaterialFill } from '../utils/materialFill';
import { OutlinedBox, OutlinedSurface } from './three/Outlined';
import { WALL_HEIGHT, EXTERIOR_THICKNESS, INTERIOR_THICKNESS, FLOOR_THICKNESS } from './three/sceneConstants';
import RoomFurniture3D from './RoomFurniture3D';

// Пастельний акцент по типу — використовується ТІЛЬКИ поки матеріал підлоги
// ще не обраний (щоб кімнати лишались візуально різними з першого кроку).
// Щойно користувач обирає підлогу — колір/текстура стає справжньою (з фото).
const TYPE_FALLBACK_COLOR = {
    room: '#cfe3ff', kitchen: '#ffe6bf', bath: '#c7f0e0',
    hallway: '#e7e7ec', balcony: '#d8f0c3', wardrobe: '#f0d8f4',
    basement: '#dcd3c8', attic: '#e3dccb',
};

const WALL_COLOR_EXTERIOR = '#fafafa';
const WALL_COLOR_INTERIOR = '#ececef';
const ACTIVE_ACCENT = '#2474ff';

function RoomFloor({ room, isActive, onSelect }) {
    const fill = useMaterialFill(room.type, 'floor', room.floor, room.width, room.depth);
    const color = room.floor ? fill.color : (TYPE_FALLBACK_COLOR[room.type] || '#e4e4e8');
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;

    return (
        <>
            {isActive && (
                <mesh position={[centerX, 0.002, centerZ]}>
                    <boxGeometry args={[room.width + 0.1, 0.012, room.depth + 0.1]} />
                    <meshBasicMaterial color={ACTIVE_ACCENT} />
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

function RoomLabel({ room, isActive }) {
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;
    return (
        <Html position={[centerX, WALL_HEIGHT + 0.15, centerZ]} center distanceFactor={10}>
            <div style={{
                background: isActive ? 'rgba(36,116,255,0.92)' : 'rgba(0,0,0,0.55)',
                color: '#fff', padding: isActive ? '3px 9px' : '1px 6px',
                borderRadius: '6px', fontSize: isActive ? '11px' : '9px',
                fontWeight: isActive ? 700 : 600, whiteSpace: 'nowrap', pointerEvents: 'none'
            }}>
                {isActive ? `${room.name} · ${room.area} м²` : room.name}
            </div>
        </Html>
    );
}

export default function ApartmentScene3D({ rooms, activeId, onSelectRoom }) {
    const layout = useMemo(() => computeApartmentLayout(rooms), [rooms]);
    const { width, depth } = layout.building;
    const { interiorHorizontal, interiorVertical, exterior } = layout.walls;
    const maxDim = Math.max(width, depth, 3);
    const camDistance = maxDim * 1.55;

    if (layout.rooms.length === 0) return null;

    return (
        <Canvas
            camera={{ position: [camDistance, camDistance * 0.82, camDistance], fov: 35 }}
            style={{ width: '100%', height: '300px', borderRadius: '12px' }}
        >
            <ambientLight intensity={0.85} />
            <directionalLight position={[10, 16, 8]} intensity={0.6} />

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
                        <OutlinedBox
                            key={`ext_v${i}`}
                            args={[EXTERIOR_THICKNESS, WALL_HEIGHT, w.y1 - w.y0 + EXTERIOR_THICKNESS]}
                            position={[w.x, WALL_HEIGHT / 2, (w.y0 + w.y1) / 2]}
                            color={WALL_COLOR_EXTERIOR}
                        />
                    ) : (
                        <OutlinedBox
                            key={`ext_h${i}`}
                            args={[w.x1 - w.x0 + EXTERIOR_THICKNESS, WALL_HEIGHT, EXTERIOR_THICKNESS]}
                            position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2, w.y]}
                            color={WALL_COLOR_EXTERIOR}
                        />
                    )
                )}

                {/* Внутрішні перегородки між рядами (зонами) */}
                {interiorHorizontal.map((w, i) => (
                    <OutlinedBox
                        key={`inth${i}`}
                        args={[w.x1 - w.x0, WALL_HEIGHT, INTERIOR_THICKNESS]}
                        position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2, w.y]}
                        color={WALL_COLOR_INTERIOR}
                    />
                ))}

                {/* Внутрішні перегородки між кімнатами в ряду */}
                {interiorVertical.map((w, i) => (
                    <OutlinedBox
                        key={`intv${i}`}
                        args={[INTERIOR_THICKNESS, WALL_HEIGHT, w.y1 - w.y0]}
                        position={[w.x, WALL_HEIGHT / 2, (w.y0 + w.y1) / 2]}
                        color={WALL_COLOR_INTERIOR}
                    />
                ))}

                {layout.rooms.map((room) => (
                    <RoomLabel key={`label_${room.id}`} room={room} isActive={room.id === activeId} />
                ))}
            </group>

            {/* Підкладка під будівлею */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[maxDim * 1.5, 32]} />
                <meshStandardMaterial color="#eef0f3" />
            </mesh>

            <OrbitControls
                enablePan={false}
                minPolarAngle={0.5}
                maxPolarAngle={1.05}
                minDistance={maxDim * 0.6}
                maxDistance={maxDim * 2.5}
            />
        </Canvas>
    );
}
