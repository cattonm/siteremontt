import React, { useState } from 'react';
import AnimatedPrice from './AnimatedPrice';
import useStore from '../store/useStore';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';
import { vibe } from '../utils/telegram';
import { ChevronDown, ChevronUp, User, Home, Settings, Wrench, Edit3, CheckCircle2 } from 'lucide-react';

// Значення, які означають «нічого не робимо» — у підсумку їх не показуємо,
// щоб список кімнати містив лише реальні роботи.
const SKIP_VALUES = new Set(['Ні', 'ні', 'Без змін', 'Не потребується', 'Не обладнувати']);

// Людський підпис значення питання кімнати (val → label з опцій, tier-об'єкти,
// словники «Інше»). null = рядок не показуємо.
function formatRoomValue(q, val) {
    const optLabel = (v) => (q.options?.find((o) => o.val === v)?.label) ?? v;
    if (val === undefined || val === null || val === '') return null;
    if (q.type === 'cards_with_tier') {
        if (!val?.type || SKIP_VALUES.has(val.type)) return null;
        return `${optLabel(val.type)}${val.tier && val.tier !== '-' ? ` (${val.tier})` : ''}`;
    }
    if (Array.isArray(val)) {
        const items = val.filter((v) => !SKIP_VALUES.has(v)).map(optLabel);
        return items.length ? items.join(', ') : null;
    }
    if (typeof val === 'object') {
        const parts = Object.entries(val)
            .filter(([k, v]) => v && v !== 0 && !SKIP_VALUES.has(k))
            .map(([k, v]) => (v === 'Так' ? k : `${k} (${v})`));
        return parts.length ? parts.join(', ') : null;
    }
    if (SKIP_VALUES.has(val)) return null;
    if (q.type === 'input_number') return parseFloat(val) > 0 ? `${val} шт` : null;
    return String(optLabel(val));
}

export default function Summary({ client, answers, finalQuestions, shouldSkip, editStep, totals }) {
    const [openZones, setOpenZones] = useState({ "👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ": true, "🏠 ПРИМІЩЕННЯ": true });
    const rooms = useStore((s) => s.rooms);
    const liveBreakdown = useStore((s) => s.liveBreakdown);
    const requestVisualizerFocus = useStore((s) => s.requestVisualizerFocus);

    const toggleZone = (zoneName) => {
        vibe('light');
        setOpenZones(prev => ({ ...prev, [zoneName]: !prev[zoneName] }));
    };

    const grouped = {};
    finalQuestions.forEach((q, idx) => {
        if (['rooms_count', 'baths_count', 'aux_rooms'].includes(q.id) || q.type === 'trigger_meas' || q.type === 'custom_works_builder') return;
        if (shouldSkip(q, answers)) return;
        
        let val = answers[q.id];
        let valStr = "";
        
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) { valStr = <i style={{color: 'var(--hint-color)'}}>не вибрано</i>; } 
        else if (val === "Ні" || val === "Не потребується" || val === "Не обладнувати") { valStr = "Ні"; } 
        else if (typeof val === 'object' && !Array.isArray(val)) {
            if (val.type) { valStr = `${val.type} ${val.tier && val.tier !== '-' ? '('+val.tier+')' : ''}`; } 
            else { 
                let parts = []; 
                for(let [k, v] of Object.entries(val)) { 
                    if(v && v !== 0) { 
                        if (v === "Так") parts.push(`${k}`); 
                        else if (typeof v === 'number') parts.push(`${k} (${v} м²)`); 
                        else parts.push(`${k} (${v})`); 
                    } 
                } 
                valStr = parts.length > 0 ? parts.join(', ') : <i style={{color: 'var(--hint-color)'}}>не вибрано</i>; 
            }
        } 
        else if (Array.isArray(val)) { valStr = val.join(', '); } 
        else { valStr = val; }
        
        if (!grouped[q.zone]) grouped[q.zone] = [];
        grouped[q.zone].push({ label: q.text.replace('.', ''), valStr, idx });
    });

    const cWorks = answers['custom_works'] || [];
    const customIndex = finalQuestions.findIndex(q => q.id === 'custom_works');
    const measIndex = finalQuestions.findIndex(q => q.type === 'trigger_meas');

    return (
        <div className="animated-step">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <CheckCircle2 color="#34c759" size={28} />
                <h3 style={{ margin: 0 }}>Перевірка даних</h3>
            </div>
            <p style={{ color: 'var(--hint-color)', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>Натисніть на розділ, щоб розгорнути деталі.</p>

            <div className="summary-box" style={{ padding: '0 20px' }}>
                <div className="accordion-header" onClick={() => toggleZone("👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ")}>
                    <div className="accordion-title"><User size={18} /> ІНФОРМАЦІЯ ПРО ОБ'ЄКТ</div>
                    {openZones["👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ"] ? <ChevronUp size={20} color="var(--hint-color)" /> : <ChevronDown size={20} color="var(--hint-color)" />}
                </div>
                <div className={`accordion-content ${openZones["👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ"] ? 'open' : ''}`}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}><div className="edit-btn" onClick={() => editStep(-1)}><Edit3 size={14}/> Змінити</div></div>
                    <div className="summary-item"><span>Ім'я:</span> <b>{client.name || '-'}</b></div>
                    <div className="summary-item"><span>Телефон:</span> <b>{client.phone || '-'}</b></div>
                    <div className="summary-item"><span>Площа:</span> <b>{client.area || '0'} м²</b></div>
                    <div className="summary-item" style={{ borderBottom:'none', paddingBottom:'15px' }}><span>Тип:</span> <b>{client.object_type}</b></div>
                </div>
            </div>

            {/* 🏠 ПРИМІЩЕННЯ: серце анкети. Кожна кімната — назва, площа,
                жива ціна з розбивки live_calc і людський перелік обраного.
                «Змінити» веде на крок структури і ФОКУСУЄ саме цю кімнату. */}
            {rooms.length > 0 && (
                <div className="summary-box" style={{ padding: '0 20px' }}>
                    <div className="accordion-header" onClick={() => toggleZone("🏠 ПРИМІЩЕННЯ")}>
                        <div className="accordion-title"><Home size={18} /> ПРИМІЩЕННЯ ({rooms.length})</div>
                        {openZones["🏠 ПРИМІЩЕННЯ"] ? <ChevronUp size={20} color="var(--hint-color)" /> : <ChevronDown size={20} color="var(--hint-color)" />}
                    </div>
                    <div className={`accordion-content ${openZones["🏠 ПРИМІЩЕННЯ"] ? 'open' : ''}`}>
                        {rooms.map((room, rIdx) => {
                            const cfg = ROOM_QUESTIONS_CONFIG[room.type] || [];
                            const lines = cfg
                                .map((q) => ({ label: (q.group === 'Інше' ? 'Інше' : q.text.replace(/\.$/, '')), value: formatRoomValue(q, room[q.id]) }))
                                .filter((l) => l.value);
                            const rp = liveBreakdown?.rooms?.[room.id];
                            const area = parseFloat(room.measurements?.floor) || 0;
                            return (
                                <div key={room.id} style={{ padding: '12px 0', borderBottom: rIdx === rooms.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{room.name} <span style={{ color: 'var(--hint-color)', fontWeight: 500, fontSize: '13px' }}>· {area} м²</span></div>
                                            {rp && (rp.work > 0 || rp.mat_min > 0) && (
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#34c759', marginTop: '2px' }}>
                                                    Робота {Number(rp.work).toLocaleString()} ₴ · Матеріали від {Number(rp.mat_min).toLocaleString()} ₴
                                                </div>
                                            )}
                                        </div>
                                        <div className="edit-btn" onClick={() => { requestVisualizerFocus(room.id, null); editStep(measIndex); }}><Edit3 size={14}/></div>
                                    </div>
                                    {lines.length > 0 ? (
                                        <div style={{ marginTop: '6px' }}>
                                            {lines.map((l, i) => (
                                                <div key={i} style={{ fontSize: '13px', margin: '3px 0' }}>
                                                    <span style={{ color: 'var(--hint-color)' }}>{l.label}: </span>{l.value}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: 'var(--hint-color)', marginTop: '6px' }}><i>Роботи в цьому приміщенні не обрані</i></div>
                                    )}
                                </div>
                            );
                        })}
                        {liveBreakdown?.general && (liveBreakdown.general.work > 0 || liveBreakdown.general.mat_min > 0) && (
                            <div style={{ padding: '12px 0 15px', borderTop: '1px dashed var(--border-color)', fontSize: '13px' }}>
                                <span style={{ color: 'var(--hint-color)' }}>Загальні роботи (демонтаж, стяжка, стеля, двері, розводки): </span>
                                <b>Робота {Number(liveBreakdown.general.work).toLocaleString()} ₴ · Матеріали від {Number(liveBreakdown.general.mat_min).toLocaleString()} ₴</b>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {Object.entries(grouped).map(([zone, items]) => (
                <div key={zone} className="summary-box" style={{ padding: '0 20px' }}>
                    <div className="accordion-header" onClick={() => toggleZone(zone)}>
                        <div className="accordion-title"><Settings size={18} /> {zone.replace(' ЗАМІРИ ПРИМІЩЕНЬ', '')}</div>
                        {openZones[zone] ? <ChevronUp size={20} color="var(--hint-color)" /> : <ChevronDown size={20} color="var(--hint-color)" />}
                    </div>
                    <div className={`accordion-content ${openZones[zone] ? 'open' : ''}`}>
                        {items.map((item, i) => (
                            <div key={i} className="summary-item" style={{ alignItems:'center', borderBottom: i === items.length-1 ? 'none' : '1px solid var(--border-color)' }}>
                                <div style={{ flex:1, paddingRight:'10px' }}>
                                    <div style={{ fontSize:'13px', color:'var(--hint-color)', marginBottom:'4px' }}>{item.label}</div>
                                    <div style={{ fontWeight:500 }}>{item.valStr}</div>
                                </div>
                                <div className="edit-btn" onClick={() => editStep(item.idx)}><Edit3 size={14}/></div>
                            </div>
                        ))}
                        <div style={{height: '15px'}}></div>
                    </div>
                </div>
            ))}

            <div className="summary-box" style={{ padding: '0 20px' }}>
                <div className="accordion-header" onClick={() => toggleZone("⭐️ НЕСТАНДАРТНІ РОБОТИ")}>
                    <div className="accordion-title"><Wrench size={18} /> НЕСТАНДАРТНІ РОБОТИ</div>
                    {openZones["⭐️ НЕСТАНДАРТНІ РОБОТИ"] ? <ChevronUp size={20} color="var(--hint-color)" /> : <ChevronDown size={20} color="var(--hint-color)" />}
                </div>
                <div className={`accordion-content ${openZones["⭐️ НЕСТАНДАРТНІ РОБОТИ"] ? 'open' : ''}`}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
                        <div className="edit-btn" onClick={() => editStep(customIndex)}><Edit3 size={14}/> {cWorks.length > 0 ? 'Змінити' : 'Додати'}</div>
                    </div>
                    {cWorks.length > 0 ? cWorks.map((cw, idx) => (
                        <div key={idx} className="summary-item" style={{ display:'block', borderBottom: idx === cWorks.length-1 ? 'none' : '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight:600, fontSize:'14px' }}>{cw.name || 'Без назви'} <span style={{ fontSize:'12px', fontWeight:'normal', color:'var(--hint-color)' }}>({cw.zone})</span></div>
                            <div style={{ fontSize:'13px', marginTop:'4px' }}>Робота: {cw.work_price || 0} ₴ | Матеріал: {cw.mat_price || 0} ₴</div>
                        </div>
                    )) : <div style={{ fontSize:'13px', color:'var(--hint-color)', paddingBottom:'15px' }}>Не додано жодної кастомної роботи.</div>}
                    <div style={{height: '15px'}}></div>
                </div>
            </div>

            <div className="summary-box" style={{ background: 'rgba(52, 199, 89, 0.1)', borderColor: '#34c759', padding: '15px 20px' }}>
                <div style={{ textAlign: 'center', color: '#34c759', fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>ВАРТІСТЬ ЗАРАЗ</div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>Робота</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-color)' }}><AnimatedPrice value={totals.work} /> ₴</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>Матеріали (від)</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-color)' }}><AnimatedPrice value={totals.mat_min} /> ₴</div>
                    </div>
                </div>
            </div>
        </div>
    );
}