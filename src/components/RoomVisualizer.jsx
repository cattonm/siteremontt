import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Trash2 } from 'lucide-react';
import { vibe } from '../utils/telegram';
import SelectedMaterialsSummary from './SelectedMaterialsSummary';
import AccordionGroup from './AccordionGroup';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';
import { groupQuestions } from '../utils/groupQuestions';
import Survey from './Survey';
import ApartmentScene3D from './ApartmentScene3D';


const ROOM_TYPES = [
    { id: 'room', name: 'Кімната' }, { id: 'kitchen', name: 'Кухня' }, { id: 'bath', name: 'Санвузол' },
    { id: 'hallway', name: 'Передпокій' }, { id: 'balcony', name: 'Балкон' }, { id: 'wardrobe', name: 'Гардероб' },
    { id: 'basement', name: 'Підвал' }, { id: 'attic', name: 'Мансарда' }
];

export default function RoomVisualizer() {
    const { client, rooms, addRoom, updateRoom, removeRoom } = useStore();
    const [activeId, setActiveId] = useState(null);

    const totalClientArea = parseFloat(client.area) || 0;
    const distributedArea = rooms.reduce((sum, r) => sum + (parseFloat(r.measurements?.floor) || 0), 0);
    const areaDiff = totalClientArea - distributedArea;
    const progressPct = totalClientArea > 0 ? Math.min((distributedArea / totalClientArea) * 100, 100) : 0;

    const handleAddRoom = (typeId) => {
        vibe('medium');
        const typeDef = ROOM_TYPES.find(t => t.id === typeId);
        const count = rooms.filter(r => r.type === typeId).length + 1;
        const newName = `${typeDef.name} ${count > 1 ? count : ''}`.trim();
        const newId = `zone_${typeId}_${Date.now()}`;
        addRoom({
            id: newId, type: typeId, name: newName,
            floor: null, walls: [], measurements: { floor: 15, walls: 45 }, other: {}
        });
        setActiveId(newId);
    };

    const activeRoom = rooms.find(r => r.id === activeId);

    return (
        <div className="animated-step" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
                <h3 style={{ marginBottom: '5px' }}>🏗 Структура квартири</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--hint-color)', marginBottom: '5px' }}>
                    <span>Розподілено: {distributedArea} м²</span>
                    <span>Загальна: {totalClientArea} м²</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: areaDiff < 0 ? '#ff3b30' : 'var(--link-color)', width: `${progressPct}%`, transition: 'width 0.3s ease' }}></div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                {ROOM_TYPES.map(rt => (
                    <button key={rt.id} onClick={() => handleAddRoom(rt.id)}
                        style={{ flex: '0 0 auto', padding: '8px 12px', fontSize: '13px', background: 'var(--bg-color)', color: 'var(--text-color)', border: `1px solid var(--border-color)`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        + {rt.name}
                    </button>
                ))}
            </div>

            {/* 3D ПЛАН КВАРТИРИ */}
            <div style={{ background: '#f2f2f7', borderRadius: '8px', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {rooms.length === 0 ? (
                    <div style={{ color: '#8e8e93', fontSize: '14px', padding: '20px' }}>Створіть кімнати для плану</div>
                ) : (
                    <ApartmentScene3D rooms={rooms} activeId={activeId} onSelectRoom={(id) => { vibe('light'); setActiveId(id); }} />
                )}
            </div>

            {activeRoom && (
    <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '20px', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-color)', textTransform: 'uppercase', fontWeight: 800 }}>{activeRoom.name}</h4>
            <Trash2 size={20} color="#ff3b30" style={{ cursor: 'pointer' }} onClick={() => { vibe('heavy'); removeRoom(activeId); setActiveId(null); }} />
        </div>

        {/* ЖИВИЙ 3D-ПЕРЕГЛЯД — реагує на вибір нижче в реальному часі */}
        <div style={{ marginBottom: '20px' }}>
            <SelectedMaterialsSummary room={activeRoom} />
        </div>

        <div className="measurement-box" style={{ marginBottom: '20px' }}>
            <label>Площа (м²)</label>
            <input type="number" inputMode="decimal" value={activeRoom.measurements.floor} onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateRoom(activeId, { measurements: { ...activeRoom.measurements, floor: isNaN(val) ? '' : val, walls: isNaN(val) ? '' : parseFloat((val * 3).toFixed(1)) } });
            }} />
        </div>

        <div style={{ marginTop: '20px' }}>
            {groupQuestions(ROOM_QUESTIONS_CONFIG[activeRoom.type] || []).map(({ name, questions }) => (
                <AccordionGroup
                    key={name}
                    name={name}
                    questions={questions}
                    room={activeRoom}
                    renderQuestion={(question) => (
                        <Survey
                            key={question.id}
                            question={question}
                            answers={activeRoom}
                            compact
                            setAnswers={(updater) => {
                                if (typeof updater === 'function') updateRoom(activeId, updater(activeRoom));
                                else updateRoom(activeId, { ...activeRoom, ...updater });
                            }}
                        />
                    )}
                />
            ))}
        </div>
    </div>
)}
        </div>
    );
}