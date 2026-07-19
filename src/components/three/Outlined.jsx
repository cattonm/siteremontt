// src/components/three/Outlined.jsx
// "Inverted hull" контур: чорний дубль форми, трохи більший і вивернутий
// (BackSide), позаду основної. Класична дешева техніка тулінгу без
// постпроцесингу й без зовнішніх асетів — дає саме той рисований
// архітектурний вигляд (жирний чорний контур, пласка заливка), що на
// референсі, лишаючись повністю параметричним кодом.
import React from 'react';
import * as THREE from 'three';

const OUTLINE = 0.018; // товщина контуру, метри
const OUTLINE_COLOR = '#161616';

export function OutlinedBox({ args, position = [0, 0, 0], rotation, color, roughness = 0.9, onClick, opacity = 1, castShadow = true, receiveShadow = true }) {
    const [w, h, d] = args;
    return (
        <group position={position} rotation={rotation}>
            <mesh onClick={onClick} castShadow={castShadow} receiveShadow={receiveShadow}>
                <boxGeometry args={args} />
                <meshStandardMaterial color={color} roughness={roughness} transparent={opacity < 1} opacity={opacity} />
            </mesh>
            <mesh raycast={() => null}>
                <boxGeometry args={[w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2]} />
                <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
            </mesh>
        </group>
    );
}

export function OutlinedCylinder({ args, position = [0, 0, 0], rotation, color, roughness = 0.9, castShadow = true, receiveShadow = true }) {
    // args: [radiusTop, radiusBottom, height, radialSegments]
    const [rt, rb, h, seg = 20] = args;
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
                <cylinderGeometry args={[rt, rb, h, seg]} />
                <meshStandardMaterial color={color} roughness={roughness} />
            </mesh>
            <mesh raycast={() => null}>
                <cylinderGeometry args={[rt + OUTLINE, rb + OUTLINE, h + OUTLINE * 2, seg]} />
                <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
            </mesh>
        </group>
    );
}

// Текстуроване покриття (підлога з реальним фото матеріалу) — той самий
// принцип контуру, але приймає map/колір ззовні (процедурні текстури).
// castShadow/receiveShadow (дефолт true) стосуються ТІЛЬКИ основного меша:
// чорний контур-дубль тіней не кидає й не приймає, інакше кожен об'єкт
// давав би подвійну "жирну" тінь.
export function OutlinedSurface({ args, position = [0, 0, 0], color, texture, roughnessMap = null, onClick, castShadow = true, receiveShadow = true }) {
    const [w, h, d] = args;
    return (
        <group position={position}>
            <mesh onClick={onClick} castShadow={castShadow} receiveShadow={receiveShadow}>
                <boxGeometry args={args} />
                <meshStandardMaterial
                    key={`${texture ? texture.uuid : color}|${roughnessMap ? roughnessMap.uuid : ''}`}
                    color={texture ? '#ffffff' : color}
                    map={texture || null}
                    roughnessMap={roughnessMap}
                    roughness={roughnessMap ? 1 : 0.85}
                />
            </mesh>
            <mesh raycast={() => null}>
                <boxGeometry args={[w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2]} />
                <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
            </mesh>
        </group>
    );
}
