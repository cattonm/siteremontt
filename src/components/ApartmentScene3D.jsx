// src/components/ApartmentScene3D.jsx
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { computeApartmentLayout } from '../utils/layoutEngine';
import RoomDiorama3D from './RoomDiorama3D';

export default function ApartmentScene3D({ rooms, activeId, onSelectRoom }) {
    const layout = useMemo(() => computeApartmentLayout(rooms), [rooms]);
    const { width, depth } = layout.building;
    const maxDim = Math.max(width, depth, 3);
    const camDistance = maxDim * 1.5;

    if (layout.rooms.length === 0) return null;

    return (
        <Canvas
            camera={{ position: [camDistance, camDistance * 0.78, camDistance], fov: 35 }}
            style={{ width: '100%', height: '280px', borderRadius: '12px' }}
        >
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 15, 8]} intensity={0.65} />

            <group position={[-width / 2, 0, -depth / 2]}>
                {layout.rooms.map((room) => (
                    <RoomDiorama3D
                        key={room.id}
                        room={room}
                        isActive={room.id === activeId}
                        onSelect={onSelectRoom}
                    />
                ))}
            </group>

            {/* Підкладка під будиночками, щоб модель не "висіла в повітрі" */}
            <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
