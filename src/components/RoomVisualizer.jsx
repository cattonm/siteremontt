// src/components/RoomVisualizer.jsx
// Що змінилось порівняно з попередньою версією:
//  1. Прев'ю кімнати тепер ЗАВЖДИ живе: якщо для типу кімнати є готові
//     фото-рендери (hasRoomPreview) — RoomPhotoPreview (фото з шарами),
//     інакше — RoomPreview3D (кімната з примітивів + процедурні текстури,
//     миттєво реагує на вибір матеріалів). Смужка мініатюр
//     SelectedMaterialsSummary більше не використовується тут.
//  2. Акордеон став "керованим" (openGroup у стейті): клік по хотспоту
//     на фото відкриває відповідну секцію і плавно скролить до неї.
//     Відкритою може бути одна секція за раз — на мобільному так охайніше.
//  3. REQUIRED_GROUPS: секції, для яких показується «Необхідно обрати».
//  4. Обгортка 3D-плану тепер біла (без сірого фону) — під стиль Kapitel.
//  5. Клас .visualizer-split: на екранах від 900px прев'ю ліворуч (липке),
//     налаштування праворуч; на мобільному (TMA) — все в стовпчик, як було.
import React, { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { Trash2, Copy, Undo2 } from 'lucide-react';
import { vibe } from '../utils/telegram';
import RoomPreview3D from './RoomPreview3D';
import RoomPhotoPreview from './RoomPhotoPreview';
import { hasRoomPreview } from '../data/roomPreviewLayers';
import AccordionGroup from './AccordionGroup';
import { ROOM_QUESTIONS_CONFIG, REQUIRED_GROUPS } from '../data/questions';
import { groupQuestions } from '../utils/groupQuestions';
import Survey from './Survey';
import ApartmentScene3D from './ApartmentScene3D';
import { ZONES, assignRoomsToZones } from '../data/apartmentTemplate';

const ROOM_TYPES = [
    { id: 'room', name: 'Кімната' }, { id: 'kitchen', name: 'Кухня' }, { id: 'bath', name: 'Санвузол' },
    { id: 'hallway', name: 'Передпокій' }, { id: 'balcony', name: 'Балкон' }, { id: 'wardrobe', name: 'Гардероб' },
    { id: 'basement', name: 'Підвал' }, { id: 'attic', name: 'Мансарда' }
];

// REQUIRED_GROUPS живе в data/questions.js — ЄДИНЕ джерело правди
// і для бейджів «Необхідно обрати» тут, і для валідації «Далі» в App.

export default function RoomVisualizer() {
    const { client, rooms, addRoom, updateRoom } = useStore();
    const duplicateRoom = useStore((s) => s.duplicateRoom);
    const removeRoomWithUndo = useStore((s) => s.removeRoomWithUndo);
    const undoRemove = useStore((s) => s.undoRemove);
    const clearLastRemoved = useStore((s) => s.clearLastRemoved);
    const lastRemoved = useStore((s) => s.lastRemoved);
    const liveBreakdown = useStore((s) => s.liveBreakdown);
    const focus = useStore((s) => s.visualizerFocus);
    const [activeId, setActiveId] = useState(null);
    const [openGroup, setOpenGroup] = useState(null); // яка секція акордеону відкрита
    const groupRefs = useRef({}); // DOM-вузли секцій — щоб скролити до них з хотспота

    // Снекбар «Скасувати» живе 5 секунд, далі видалення стає остаточним.
    React.useEffect(() => {
        if (!lastRemoved) return;
        const t = setTimeout(() => clearLastRemoved(), 5000);
        return () => clearTimeout(t);
    }, [lastRemoved, clearLastRemoved]);

    // Зовнішній запит «покажи цю кімнату/групу»: шле валідація з App
    // (перша проблемна кімната) або кнопка «Змінити» біля кімнати в Summary.
    React.useEffect(() => {
        if (!focus) return;
        setActiveId(focus.roomId);
        if (focus.group) {
            setOpenGroup(focus.group);
            setTimeout(() => {
                groupRefs.current[focus.group]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
        }
        useStore.setState({ visualizerFocus: null }); // одноразовий сигнал
    }, [focus]);

    const totalClientArea = parseFloat(client.area) || 0;
    const distributedArea = rooms.reduce((sum, r) => sum + (parseFloat(r.measurements?.floor) || 0), 0);
    const areaDiff = totalClientArea - distributedArea;
    const progressPct = totalClientArea > 0 ? Math.min((distributedArea / totalClientArea) * 100, 100) : 0;

    const handleAddRoom = (typeId) => {
        vibe('medium');
        const typeDef = ROOM_TYPES.find(t => t.id === typeId);
        const count = rooms.filter(r => r.type === typeId).length + 1;
        const newName = `${typeDef.name} ${count > 1 ? count : ''}`.trim();
        // eslint-disable-next-line react-hooks/purity -- id генерується в обробнику кліку, а не під час рендеру; тут Date.now() легальний
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

    // Клік по зоні на плані (по підлозі або по плашці):
    //  - у зоні вже є кімната — просто вибираємо її;
    //  - зона порожня — СТВОРЮЄМО кімнату цього типу (як у Kapitel можна
    //    почати з будь-якого приміщення прямо з макета).
    const { roomByZoneId } = assignRoomsToZones(rooms);
    const handleZonePress = (zoneId) => {
        const assigned = roomByZoneId[zoneId];
        if (assigned) { selectRoom(assigned.id); return; }
        const zone = ZONES.find((z) => z.id === zoneId);
        if (zone) handleAddRoom(zone.type);
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

            {/* 3D ПЛАН КВАРТИРИ — фіксований макет, показується завжди */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <ApartmentScene3D rooms={rooms} activeId={activeId} onZonePress={handleZonePress} />
            </div>
            {rooms.length === 0 && (
                <div style={{ color: 'var(--hint-color)', fontSize: '13px', textAlign: 'center', marginTop: '-10px' }}>
                    Натисни на приміщення на плані або на кнопку вище, щоб додати його
                </div>
            )}

            {/* ЧИПИ КІМНАТ — дублюють вибір з плану (зручно пальцем на телефоні;
                сюди ж потрапляють кімнати, яким не вистачило зони на макеті) */}
            {rooms.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginTop: '-8px' }}>
                    {rooms.map((r, i) => {
                        const isActive = r.id === activeId;
                        const area = parseFloat(r.measurements?.floor) || 0;
                        return (
                            <button key={r.id} onClick={() => selectRoom(r.id)}
                                style={{
                                    flex: '0 0 auto', display: 'flex', alignItems: 'baseline', gap: '5px',
                                    padding: '7px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                    background: 'var(--card-bg)', color: 'var(--text-color)',
                                    border: `1.5px solid ${isActive ? '#e31e24' : 'var(--border-color)'}`,
                                    borderRadius: '20px',
                                }}>
                                <span>{i + 1}. {r.name}</span>
                                {area > 0 && <span style={{ color: '#e31e24', fontWeight: 700 }}>{area} м²</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {activeRoom && (
                <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '20px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-color)', textTransform: 'uppercase', fontWeight: 800 }}>{activeRoom.name}</h4>
                            {(() => {
                                // Жива ціна САМЕ цієї кімнати з розбивки live_calc
                                const rp = liveBreakdown?.rooms?.[activeRoom.id];
                                if (!rp || (rp.work <= 0 && rp.mat_min <= 0)) return null;
                                return (
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#34c759', marginTop: '3px' }}>
                                        Робота {Number(rp.work).toLocaleString()} ₴ · Матеріали від {Number(rp.mat_min).toLocaleString()} ₴
                                    </div>
                                );
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', flexShrink: 0, marginTop: '2px' }}>
                            <Copy
                                size={19} color="var(--hint-color)" style={{ cursor: 'pointer' }}
                                title="Дублювати приміщення"
                                onClick={() => {
                                    vibe('medium');
                                    duplicateRoom(activeId);
                                    // Одразу перемикаємось на копію — саме її користувач
                                    // зараз редагуватиме («ще одна така сама спальня»).
                                    setTimeout(() => {
                                        const dupId = useStore.getState().lastDuplicatedId;
                                        if (dupId) setActiveId(dupId);
                                    }, 0);
                                }}
                            />
                            <Trash2
                                size={19} color="#ff3b30" style={{ cursor: 'pointer' }}
                                title="Видалити приміщення"
                                onClick={() => { vibe('heavy'); removeRoomWithUndo(activeId); setActiveId(null); }}
                            />
                        </div>
                    </div>

                    <div className="visualizer-split">
                        <div className="visualizer-preview-col">
                            {/* Пріоритет: фото-прев'ю з шарами (коли для типу кімнати
                                будуть готові рендери, enabled: true у roomPreviewLayers).
                                Поки їх немає — ЖИВЕ 3D-прев'ю: кімната з примітивів,
                                процедурні текстури миттєво реагують на вибір матеріалів,
                                камеру можна крутити пальцем (аналог Kapitel). */}
                            {hasRoomPreview(activeRoom.type) ? (
                                <RoomPhotoPreview
                                    room={activeRoom}
                                    activeGroup={openGroup}
                                    onHotspotClick={openGroupFromHotspot}
                                />
                            ) : (
                                <RoomPreview3D
                                    room={activeRoom}
                                    activeGroup={openGroup}
                                    onHotspotClick={openGroupFromHotspot}
                                />
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

            {/* СНЕКБАР «СКАСУВАТИ»: 5 секунд на передумати після видалення.
                Видалення кімнати з усіма налаштуваннями — найдорожча помилка
                в цьому інтерфейсі, тож даємо шлях назад. */}
            {lastRemoved && (
                <div style={{
                    position: 'fixed', left: '50%', bottom: '90px', transform: 'translateX(-50%)',
                    zIndex: 90, display: 'flex', alignItems: 'center', gap: '14px',
                    background: '#1c1c1e', color: '#fff', padding: '11px 16px',
                    borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
                    fontSize: '14px', maxWidth: '92vw', animation: 'fadeIn 0.2s ease',
                }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        «{lastRemoved.room.name}» видалено
                    </span>
                    <button
                        onClick={() => { vibe('medium'); undoRemove(); setActiveId(lastRemoved.room.id); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px', background: 'none',
                            border: 'none', color: '#0a84ff', fontWeight: 700, fontSize: '14px',
                            cursor: 'pointer', padding: 0, flexShrink: 0,
                        }}
                    >
                        <Undo2 size={16} /> Скасувати
                    </button>
                </div>
            )}
        </div>
    );
}