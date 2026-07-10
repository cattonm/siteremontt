// src/components/RoomVisualizer.jsx
// Що змінилось порівняно з попередньою версією:
//  1. Замість SelectedMaterialsSummary для кімнат, у яких є готові
//     зображення (hasRoomPreview), рендериться RoomPhotoPreview —
//     фото з шарами матеріалів і хотспотами.
//  2. Акордеон став "керованим" (openGroup у стейті): клік по хотспоту
//     на фото відкриває відповідну секцію і плавно скролить до неї.
//     Відкритою може бути одна секція за раз — на мобільному так охайніше.
//  3. REQUIRED_GROUPS: секції, для яких показується «Необхідно обрати».
//  4. Обгортка 3D-плану тепер біла (без сірого фону) — під стиль Kapitel.
//  5. Клас .visualizer-split: на екранах від 900px прев'ю ліворуч (липке),
//     налаштування праворуч; на мобільному (TMA) — все в стовпчик, як було.
import React, { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { Trash2 } from 'lucide-react';
import { vibe } from '../utils/telegram';
import SelectedMaterialsSummary from './SelectedMaterialsSummary';
import RoomPhotoPreview from './RoomPhotoPreview';
import { hasRoomPreview } from '../data/roomPreviewLayers';
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

// Секції, без вибору в яких показуємо «Необхідно обрати» (стиль Kapitel).
// Додай/прибери назви груп за потреби.
const REQUIRED_GROUPS = new Set(['Підлога', 'Стеля', 'Стіни', 'Освітлення', 'Фартух']);

export default function RoomVisualizer() {
    const { client, rooms, addRoom, updateRoom, removeRoom } = useStore();
    const [activeId, setActiveId] = useState(null);
    const [openGroup, setOpenGroup] = useState(null); // яка секція акордеону відкрита
    const groupRefs = useRef({}); // DOM-вузли секцій — щоб скролити до них з хотспота

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
        setOpenGroup(null);
    };

    const selectRoom = (id) => {
        vibe('light');
        setActiveId(id);
        setOpenGroup(null); // нова кімната — акордеон згорнутий
    };

    // Хотспот на фото: відкриваємо секцію та плавно скролимо до неї.
    // setTimeout(60) дає акордеону кадр на відкриття, інакше scrollIntoView
    // цілиться в ще згорнутий (нульової висоти) блок.
    const openGroupFromHotspot = (groupName) => {
        setOpenGroup(groupName);
        setTimeout(() => {
            groupRefs.current[groupName]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
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

            {/* 3D ПЛАН КВАРТИРИ — білий фон, як на референсі */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {rooms.length === 0 ? (
                    <div style={{ color: '#8e8e93', fontSize: '14px', padding: '20px' }}>Створіть кімнати для плану</div>
                ) : (
                    <ApartmentScene3D rooms={rooms} activeId={activeId} onSelectRoom={selectRoom} />
                )}
            </div>

            {activeRoom && (
                <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '20px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-color)', textTransform: 'uppercase', fontWeight: 800 }}>{activeRoom.name}</h4>
                        <Trash2 size={20} color="#ff3b30" style={{ cursor: 'pointer' }} onClick={() => { vibe('heavy'); removeRoom(activeId); setActiveId(null); }} />
                    </div>

                    <div className="visualizer-split">
                        <div className="visualizer-preview-col">
                            {/* Фото-прев'ю з шарами, якщо для типу кімнати вже є зображення;
                                інакше — попередній рядок обраних матеріалів */}
                            {hasRoomPreview(activeRoom.type) ? (
                                <RoomPhotoPreview
                                    room={activeRoom}
                                    activeGroup={openGroup}
                                    onHotspotClick={openGroupFromHotspot}
                                />
                            ) : (
                                <SelectedMaterialsSummary room={activeRoom} />
                            )}

                            <div className="measurement-box" style={{ marginTop: '16px' }}>
                                <label>Площа (м²)</label>
                                <input type="number" inputMode="decimal" value={activeRoom.measurements.floor} onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateRoom(activeId, { measurements: { ...activeRoom.measurements, floor: isNaN(val) ? '' : val, walls: isNaN(val) ? '' : parseFloat((val * 3).toFixed(1)) } });
                                }} />
                            </div>
                        </div>

                        <div className="visualizer-settings-col">
                            {groupQuestions(ROOM_QUESTIONS_CONFIG[activeRoom.type] || []).map(({ name, questions }) => (
                                <div key={name} ref={(el) => { groupRefs.current[name] = el; }}>
                                    <AccordionGroup
                                        name={name}
                                        questions={questions}
                                        room={activeRoom}
                                        open={openGroup === name}
                                        onToggle={(groupName, next) => setOpenGroup(next ? groupName : null)}
                                        required={REQUIRED_GROUPS.has(name)}
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
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}