// src/components/ApartmentScene3D.jsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { computeApartmentLayout } from '../utils/layoutEngine';

const TYPE_COLORS = {
    room: '#cfe8ff', kitchen: '#ffe8c2', bath: '#c9f2e3',
    hallway: '#e6e6ea', balcony: '#d9f0c4', wardrobe: '#f0d9f5'
};

const WALL_HEIGHT = 2.7;
const WALL_THICKNESS = 0.08;
const FLOOR_THICKNESS = 0.05;

function RoomMesh({ room, isActive, onSelect }) {
    const color = TYPE_COLORS[room.type] || '#ffffff';
    const centerX = room.x + room.width / 2;
    const centerZ = room.y + room.depth / 2;

    return (
        <group>
            <mesh
                position={[centerX, FLOOR_THICKNESS / 2, centerZ]}
                onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}
            >
                <boxGeometry args={[room.width - 0.02, FLOOR_THICKNESS, room.depth - 0.02]} />
                <meshStandardMaterial color={isActive ? '#7ab8ff' : color} />
            </mesh>

            {/* Стіни по периметру кімнати */}
            {[
                [centerX, room.y, room.width, WALL_THICKNESS],
                [centerX, room.y + room.depth, room.width, WALL_THICKNESS],
                [room.x, centerZ, WALL_THICKNESS, room.depth],
                [room.x + room.width, centerZ, WALL_THICKNESS, room.depth]
            ].map(([x, z, w, d], i) => (
                <mesh key={i} position={[x, WALL_HEIGHT / 2, z]}>
                    <boxGeometry args={[w, WALL_HEIGHT, d]} />
                    <meshStandardMaterial color="#1c1c1e" />
                </mesh>
            ))}

            <Html position={[centerX, WALL_HEIGHT + 0.3, centerZ]} center distanceFactor={8}>
                <div style={{
                    background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '2px 8px',
                    borderRadius: '6px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap'
                }}>
                    {room.name} · {room.area} м²
                </div>
            </Html>
        </group>
    );
}

export default function ApartmentScene3D({ rooms, activeId, onSelectRoom }) {
    const layout = useMemo(() => computeApartmentLayout(rooms), [rooms]);
    const { width, depth } = layout.building;
    const maxDim = Math.max(width, depth, 3);
    const camDistance = maxDim * 1.6;

    if (layout.rooms.length === 0) return null;

    return (
        <Canvas
            camera={{ position: [camDistance, camDistance * 0.85, camDistance], fov: 35 }}
            style={{ width: '100%', height: '280px', borderRadius: '12px' }}
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[10, 15, 8]} intensity={0.8} />
            <group position={[-width / 2, 0, -depth / 2]}>
                {layout.rooms.map(room => (
                    <RoomMesh key={room.id} room={room} isActive={room.id === activeId} onSelect={onSelectRoom} />
                ))}
            </group>
            <OrbitControls
                enablePan={false}
                minPolarAngle={0.3}
                maxPolarAngle={1.3}
                minDistance={maxDim * 0.6}
                maxDistance={maxDim * 3}
            />
        </Canvas>
    );
}