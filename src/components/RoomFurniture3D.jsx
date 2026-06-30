// src/components/RoomFurniture3D.jsx
import React from 'react';
import { OutlinedBox, OutlinedCylinder } from './three/Outlined';
import { FURNITURE_LAYOUTS } from '../data/furnitureLayouts';

// УВАГА: координати в FURNITURE_LAYOUTS підібрані вручну під конкретні
// SLOT_SIZE з layoutEngine.js. Якщо змінюєш розмір комірки для якогось
// типу кімнати — звір відповідний запис у furnitureLayouts.js, інакше
// меблі можуть "вилізти" за межі кімнати.
export default function RoomFurniture3D({ room }) {
    const pieces = FURNITURE_LAYOUTS[room.type];
    if (!pieces) return null;

    return (
        <group position={[room.x, 0, room.y]}>
            {pieces.map((p, i) =>
                p.shape === 'cylinder' ? (
                    <OutlinedCylinder key={i} args={p.args} position={p.pos} rotation={p.rotation} color={p.color} />
                ) : (
                    <OutlinedBox key={i} args={p.args} position={p.pos} rotation={p.rotation} color={p.color} />
                )
            )}
        </group>
    );
}
