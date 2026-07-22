// src/components/three/Outlined.jsx
// "Inverted hull" контур: чорний дубль форми, трохи більший і вивернутий
// (BackSide), позаду основної. Класична дешева техніка тулінгу без
// постпроцесингу й без зовнішніх асетів — дає саме той рисований
// архітектурний вигляд (жирний чорний контур, пласка заливка), що на
// референсі, лишаючись повністю параметричним кодом.
import React from 'react';
import * as THREE from 'three';
import { OUTLINE_COLOR } from './sceneConstants';

const OUTLINE = 0.018; // товщина контуру, метри

// Помножити hex-колір покомпонентно на hex-множник (0..1 на канал).
// Для приглушення невибраних зон плану: множимо і заливку, і map-текстуру.
function mulHex(hex, tint) {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(tint.slice(1), 16);
    const ch = (sh) => Math.round((((a >> sh) & 255) * ((b >> sh) & 255)) / 255);
    return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

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
const DIM_TINT = '#9a978f'; // множник для приглушення невибраних зон плану

export function OutlinedSurface({ args, position = [0, 0, 0], color, texture, roughnessMap = null, dim = false, onClick, onPointerDown, onPointerUp, castShadow = true, receiveShadow = true }) {
    const [w, h, d] = args;
    // З текстурою колір матеріалу множиться на map: '#ffffff' = без змін,
    // DIM_TINT = приглушено. Без текстури множимо саму заливку.
    const matColor = dim
        ? (texture ? DIM_TINT : mulHex(color, DIM_TINT))
        : (texture ? '#ffffff' : color);
    return (
        <group position={position}>
            <mesh onClick={onClick} onPointerDown={onPointerDown} onPointerUp={onPointerUp} castShadow={castShadow} receiveShadow={receiveShadow}>
                <boxGeometry args={args} />
                <meshStandardMaterial
                    key={`${texture ? texture.uuid : color}|${roughnessMap ? roughnessMap.uuid : ''}|${dim ? 'd' : ''}`}
                    color={matColor}
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
