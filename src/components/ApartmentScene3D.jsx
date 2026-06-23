// src/components/ApartmentScene3D.jsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { computeApartmentLayout } from '../utils/layoutEngine';

const TYPE_COLORS = {
    room: '#cfe8ff', kitchen: '#ffe8c2', bath: '#c9f2e3',
    hallway: '#e6e6ea', balcony: '#d9f0c4', wardrobe: '#f0d9f5'
};

const WALL_HEIGHT = 2.4;
const EXTERIOR_THICKNESS = 0.14;
const INTERIOR_THICKNESS = 0.06;
const FLOOR_THICKNESS = 0.05;

function Floor({ room, isActive, onSelect }) {
    const color = TYPE_COLORS[room.type] || '#ffffff';
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;

    return (
        <mesh
            position={[centerX, FLOOR_THICKNESS / 2, centerZ]}
            onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
        >
            <boxGeometry args={[room.width - 0.02, FLOOR_THICKNESS, room.depth - 0.02]} />
            <meshStandardMaterial color={isActive ? '#7ab8ff' : color} />
        </mesh>
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
    const { interiorHorizontal, interiorVertical } = layout.walls;
    const maxDim = Math.max(width, depth, 3);
    const camDistance = maxDim * 1.5;

    if (layout.rooms.length === 0) return null;

    return (
        <Canvas
            camera={{ position: [camDistance, camDistance * 0.78, camDistance], fov: 35 }}
            style={{ width: '100%', height: '280px', borderRadius: '12px' }}
        >
            <ambientLight intensity={0.75} />
            <directionalLight position={[10, 15, 8]} intensity={0.7} />

            <group position={[-width / 2, 0, -depth / 2]}>
                {/* Підлоги кімнат */}
                {layout.rooms.map(room => (
                    <Floor key={room.id} room={room} isActive={room.id === activeId} onSelect={onSelectRoom} />
                ))}

                {/* Зовнішні стіни — темні, по контуру всієї квартири */}
                <mesh position={[width / 2, WALL_HEIGHT / 2, 0]}>
                    <boxGeometry args={[width + EXTERIOR_THICKNESS, WALL_HEIGHT, EXTERIOR_THICKNESS]} />
                    <meshStandardMaterial color="#1c1c1e" />
                </mesh>
                <mesh position={[width / 2, WALL_HEIGHT / 2, depth]}>
                    <boxGeometry args={[width + EXTERIOR_THICKNESS, WALL_HEIGHT, EXTERIOR_THICKNESS]} />
                    <meshStandardMaterial color="#1c1c1e" />
                </mesh>
                <mesh position={[0, WALL_HEIGHT / 2, depth / 2]}>
                    <boxGeometry args={[EXTERIOR_THICKNESS, WALL_HEIGHT, depth + EXTERIOR_THICKNESS]} />
                    <meshStandardMaterial color="#1c1c1e" />
                </mesh>
                <mesh position={[width, WALL_HEIGHT / 2, depth / 2]}>
                    <boxGeometry args={[EXTERIOR_THICKNESS, WALL_HEIGHT, depth + EXTERIOR_THICKNESS]} />
                    <meshStandardMaterial color="#1c1c1e" />
                </mesh>

                {/* Внутрішні перегородки між рядами — світлі, без дублювання */}
                {interiorHorizontal.map((w, i) => (
                    <mesh key={`h${i}`} position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2, w.y]}>
                        <boxGeometry args={[w.x1 - w.x0, WALL_HEIGHT, INTERIOR_THICKNESS]} />
                        <meshStandardMaterial color="#dcdce0" />
                    </mesh>
                ))}

                {/* Внутрішні перегородки між кімнатами в ряду */}
                {interiorVertical.map((w, i) => (
                    <mesh key={`v${i}`} position={[w.x, WALL_HEIGHT / 2, (w.y0 + w.y1) / 2]}>
                        <boxGeometry args={[INTERIOR_THICKNESS, WALL_HEIGHT, w.y1 - w.y0]} />
                        <meshStandardMaterial color="#dcdce0" />
                    </mesh>
                ))}

                {/* Підписи */}
                {layout.rooms.map(room => (
                    <RoomLabel key={`label_${room.id}`} room={room} isActive={room.id === activeId} />
                ))}
            </group>

            {/* Підкладка під будівлею, щоб модель не "висіла в повітрі" */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[maxDim * 1.4, 32]} />
                <meshStandardMaterial color="#eaeaef" />
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