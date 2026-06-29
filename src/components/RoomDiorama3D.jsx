// src/components/RoomDiorama3D.jsx
import React from 'react';
import { Html } from '@react-three/drei';
import { useMaterialFill } from '../utils/materialFill';

export const WALL_HEIGHT = 2.2;
const FLOOR_THICKNESS = 0.06;
const WALL_THICKNESS = 0.05;

// У ROOM_QUESTIONS_CONFIG поле зі стінами зветься "walls" майже всюди,
// але в bath — "wall_tile". Решта (floor) однакове для всіх типів.
function wallFieldFor(type) {
    return type === 'bath' ? 'wall_tile' : 'walls';
}

function Surface({ color, texture, args, position }) {
    return (
        <mesh position={position}>
            <boxGeometry args={args} />
            <meshStandardMaterial
                key={texture ? texture.uuid : color}
                color={texture ? '#ffffff' : color}
                map={texture || null}
                roughness={0.85}
            />
        </mesh>
    );
}

export default function RoomDiorama3D({ room, isActive, onSelect }) {
    const { width, depth, x, y, type } = room;
    const centerX = x + width / 2;
    const centerZ = y + depth / 2;

    const wallField = wallFieldFor(type);
    const rawWalls = room[wallField];
    const wallValues = Array.isArray(rawWalls) ? rawWalls : (rawWalls ? [rawWalls] : []);

    const floorFill = useMaterialFill(type, 'floor', room.floor, width, depth);
    const backWallFill = useMaterialFill(type, wallField, wallValues[0], width, WALL_HEIGHT);
    const sideWallFill = useMaterialFill(type, wallField, wallValues[1] || wallValues[0], depth, WALL_HEIGHT);

    return (
        <group onClick={(e) => { e.stopPropagation(); onSelect(room.id); }}>
            {isActive && (
                <mesh position={[centerX, -0.01, centerZ]}>
                    <boxGeometry args={[width + 0.12, 0.02, depth + 0.12]} />
                    <meshBasicMaterial color="#2474ff" />
                </mesh>
            )}

            <Surface
                color={floorFill.color}
                texture={floorFill.texture}
                args={[width, FLOOR_THICKNESS, depth]}
                position={[centerX, FLOOR_THICKNESS / 2, centerZ]}
            />

            {/* Задня стіна */}
            <Surface
                color={backWallFill.color}
                texture={backWallFill.texture}
                args={[width, WALL_HEIGHT, WALL_THICKNESS]}
                position={[centerX, WALL_HEIGHT / 2, y]}
            />

            {/* Бокова (права) стіна — разом із задньою формують "розрізаний будиночок" */}
            <Surface
                color={sideWallFill.color}
                texture={sideWallFill.texture}
                args={[WALL_THICKNESS, WALL_HEIGHT, depth]}
                position={[x + width, WALL_HEIGHT / 2, centerZ]}
            />

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
        </group>
    );
}
