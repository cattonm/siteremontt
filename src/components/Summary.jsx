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

export default function Summary({ client, setClient, answers, finalQuestions, shouldSkip, editStep, totals, isGuest = false }) {
    const [openZones, setOpenZones] = useState({ "👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ": true, "🏠 ПРИМІЩЕННЯ": true });
    const [openRooms, setOpenRooms] = useState({});   // які кімнати розгорнуті построчно
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
                <CheckCircle2 color="var(--money)" size={28} aria-hidden="true" />
                <h3 style={{ margin: 0 }}>{isGuest ? 'Ваш кошторис' : 'Перевірка даних'}</h3>
            </div>
            <p style={{ color: 'var(--hint-color)', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
                {isGuest
                    ? 'Розгорніть приміщення, щоб побачити детальний розрахунок.'
                    : 'Натисніть на розділ, щоб розгорнути деталі.'}
            </p>

            <div className="summary-box" style={{ padding: '0 20px' }}>
                <button
                    type="button" className="btn-reset accordion-header" style={{ width: '100%' }}
                    onClick={() => toggleZone("👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ")}
                    aria-expanded={!!openZones["👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ"]} aria-controls="summary-info"
                >
                    <div className="accordion-title"><User size={18} aria-hidden="true" /> ІНФОРМАЦІЯ ПРО ОБ'ЄКТ</div>
                    {openZones["👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ"] ? <ChevronUp size={20} color="var(--hint-color)" aria-hidden="true" /> : <ChevronDown size={20} color="var(--hint-color)" aria-hidden="true" />}
                </button>
                <div id="summary-info" className={`accordion-content ${openZones["👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ"] ? 'open' : ''}`}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
                        <button type="button" className="btn-reset edit-btn" onClick={() => editStep(-1)}><Edit3 size={14} aria-hidden="true" /> Змінити</button>
                    </div>
                    {/* Гість не вводив ім'я і телефон на першому кроці — їх у нього
                        питають унизу цієї ж сторінки. Показувати тут порожні
                        прочерки, які «Змінити» все одно не дозволить заповнити,
                        було б безглуздо. */}
                    {!isGuest && (
                        <>
                            <div className="summary-item"><span>Ім'я:</span> <b>{client.name || '-'}</b></div>
                            <div className="summary-item"><span>Телефон:</span> <b>{client.phone || '-'}</b></div>
                        </>
                    )}
                    <div className="summary-item"><span>Площа:</span> <b>{client.area || '0'} м²</b></div>
                    <div className="summary-item" style={{ borderBottom:'none', paddingBottom:'15px' }}><span>Тип:</span> <b>{client.object_type}</b></div>
                </div>
            </div>

            {/* 🏠 ПРИМІЩЕННЯ: серце анкети. Кожна кімната — назва, площа,
                жива ціна з розбивки live_calc і людський перелік обраного.
                «Змінити» веде на крок структури і ФОКУСУЄ саме цю кімнату. */}
            {rooms.length > 0 && (
                <div className="summary-box" style={{ padding: '0 20px' }}>
                    <button
                        type="button" className="btn-reset accordion-header" style={{ width: '100%' }}
                        onClick={() => toggleZone("🏠 ПРИМІЩЕННЯ")}
                        aria-expanded={!!openZones["🏠 ПРИМІЩЕННЯ"]} aria-controls="summary-rooms"
                    >
                        <div className="accordion-title"><Home size={18} aria-hidden="true" /> ПРИМІЩЕННЯ ({rooms.length})</div>
                        {openZones["🏠 ПРИМІЩЕННЯ"] ? <ChevronUp size={20} color="var(--hint-color)" aria-hidden="true" /> : <ChevronDown size={20} color="var(--hint-color)" aria-hidden="true" />}
                    </button>
                    <div id="summary-rooms" className={`accordion-content ${openZones["🏠 ПРИМІЩЕННЯ"] ? 'open' : ''}`}>
                        {rooms.map((room, rIdx) => {
                            const cfg = ROOM_QUESTIONS_CONFIG[room.type] || [];
                            const lines = cfg
                                .map((q) => ({ label: (q.group === 'Інше' ? 'Інше' : q.text.replace(/\.$/, '')), value: formatRoomValue(q, room[q.id]) }))
                                .filter((l) => l.value);
                            const rp = liveBreakdown?.rooms?.[room.id];
                            const priceLines = liveBreakdown?.roomLines?.[room.id] || [];
                            const area = parseFloat(room.measurements?.floor) || 0;
                            const isOpen = !!openRooms[room.id];
                            return (
                                <div key={room.id} style={{ padding: '12px 0', borderBottom: rIdx === rooms.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{room.name} <span style={{ color: 'var(--hint-color)', fontWeight: 500, fontSize: '13px' }}>· {area} м²</span></div>
                                            {rp && (rp.work > 0 || rp.mat_min > 0) && (
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--money)', marginTop: '2px' }}>
                                                    Робота {Number(rp.work).toLocaleString()} ₴ · Матеріали від {Number(rp.mat_min).toLocaleString()} ₴
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button" className="btn-reset edit-btn"
                                            aria-label={`Редагувати приміщення «${room.name}»`}
                                            onClick={() => { requestVisualizerFocus(room.id, null); editStep(measIndex); }}
                                        ><Edit3 size={14} aria-hidden="true" /></button>
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

                                    {/* ПОСТРОЧНИЙ КОШТОРИС: «Ламінат · 18 м² × 405 ₴ = 7 290 ₴».
                                        Найсильніший аргумент проти «а чому так дорого?» —
                                        клієнт бачить, з чого складається цифра. */}
                                    {priceLines.length > 0 && (
                                        <>
                                            <button
                                                type="button" className="btn-reset"
                                                onClick={() => { vibe(); setOpenRooms((p) => ({ ...p, [room.id]: !p[room.id] })); }}
                                                aria-expanded={isOpen} aria-controls={`price-details-${room.id}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--link-color)' }}
                                            >
                                                {isOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                                                {isOpen ? 'Згорнути розрахунок' : `Детальний розрахунок (${priceLines.length})`}
                                            </button>
                                            {isOpen && (
                                                <div id={`price-details-${room.id}`} style={{ marginTop: '8px', background: 'var(--secondary-bg, rgba(127,127,127,0.07))', borderRadius: '10px', padding: '10px 12px' }}>
                                                    {priceLines.map((pl, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12.5px', padding: '4px 0', borderBottom: i === priceLines.length - 1 ? 'none' : '1px dashed var(--border-color)' }}>
                                                            <span style={{ minWidth: 0 }}>
                                                                {pl.label}{pl.tier ? ` (${pl.tier})` : ''}
                                                                <span style={{ color: 'var(--hint-color)' }}> · {pl.qty} {pl.unit} × {Number(pl.rate).toLocaleString()} ₴</span>
                                                            </span>
                                                            <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{Number(pl.work).toLocaleString()} ₴</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ fontSize: '11.5px', color: 'var(--hint-color)', marginTop: '7px' }}>
                                                        Ціни — за роботу. Матеріали рахуються окремо («від» — стандарт-сегмент).
                                                    </div>
                                                </div>
                                            )}
                                        </>
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

            {Object.entries(grouped).map(([zone, items], zIdx) => (
                <div key={zone} className="summary-box" style={{ padding: '0 20px' }}>
                    <button
                        type="button" className="btn-reset accordion-header" style={{ width: '100%' }}
                        onClick={() => toggleZone(zone)}
                        aria-expanded={!!openZones[zone]} aria-controls={`summary-zone-${zIdx}`}
                    >
                        <div className="accordion-title"><Settings size={18} aria-hidden="true" /> {zone.replace(' ЗАМІРИ ПРИМІЩЕНЬ', '')}</div>
                        {openZones[zone] ? <ChevronUp size={20} color="var(--hint-color)" aria-hidden="true" /> : <ChevronDown size={20} color="var(--hint-color)" aria-hidden="true" />}
                    </button>
                    <div id={`summary-zone-${zIdx}`} className={`accordion-content ${openZones[zone] ? 'open' : ''}`}>
                        {items.map((item, i) => (
                            <div key={i} className="summary-item" style={{ alignItems:'center', borderBottom: i === items.length-1 ? 'none' : '1px solid var(--border-color)' }}>
                                <div style={{ flex:1, paddingRight:'10px' }}>
                                    <div style={{ fontSize:'13px', color:'var(--hint-color)', marginBottom:'4px' }}>{item.label}</div>
                                    <div style={{ fontWeight:500 }}>{item.valStr}</div>
                                </div>
                                <button type="button" className="btn-reset edit-btn" aria-label={`Редагувати «${item.label}»`} onClick={() => editStep(item.idx)}><Edit3 size={14} aria-hidden="true" /></button>
                            </div>
                        ))}
                        <div style={{height: '15px'}}></div>
                    </div>
                </div>
            ))}

            <div className="summary-box" style={{ padding: '0 20px' }}>
                <button
                    type="button" className="btn-reset accordion-header" style={{ width: '100%' }}
                    onClick={() => toggleZone("⭐️ НЕСТАНДАРТНІ РОБОТИ")}
                    aria-expanded={!!openZones["⭐️ НЕСТАНДАРТНІ РОБОТИ"]} aria-controls="summary-custom"
                >
                    <div className="accordion-title"><Wrench size={18} aria-hidden="true" /> НЕСТАНДАРТНІ РОБОТИ</div>
                    {openZones["⭐️ НЕСТАНДАРТНІ РОБОТИ"] ? <ChevronUp size={20} color="var(--hint-color)" aria-hidden="true" /> : <ChevronDown size={20} color="var(--hint-color)" aria-hidden="true" />}
                </button>
                <div id="summary-custom" className={`accordion-content ${openZones["⭐️ НЕСТАНДАРТНІ РОБОТИ"] ? 'open' : ''}`}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
                        <button type="button" className="btn-reset edit-btn" onClick={() => editStep(customIndex)}><Edit3 size={14} aria-hidden="true" /> {cWorks.length > 0 ? 'Змінити' : 'Додати'}</button>
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

            <div className="summary-box" style={{ background: 'var(--money-soft)', borderColor: 'var(--money)', padding: '15px 20px' }}>
                <div style={{ textAlign: 'center', color: 'var(--money)', fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>ВАРТІСТЬ ЗАРАЗ</div>
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

            {/* ФОРМА КОНТАКТУ ДЛЯ ГОСТЯ — у самому кінці, коли людина вже
                побачила свій кошторис. Це момент максимальної мотивації:
                просимо телефон тоді, коли людина вже бачить цінність, а не «щоб
                продовжити». Класична помилка — питати контакти на вході. */}
            {isGuest && (
                <div className="summary-box" style={{ padding: '20px', border: '2px solid var(--link-color)' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '17px' }}>Куди надіслати кошторис?</h3>
                    <p style={{ color: 'var(--hint-color)', fontSize: '13.5px', lineHeight: 1.45, margin: '0 0 14px' }}>
                        Менеджер зателефонує та уточнить деталі.
                        Точну ціну підтверджують лише на об'єкті.
                    </p>
                    <label htmlFor="summary-guest-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Ваше ім'я</label>
                    <input
                        id="summary-guest-name"
                        type="text" value={client.name || ''}
                        onChange={(e) => setClient((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Як до вас звертатись"
                        style={{ width: '100%', boxSizing: 'border-box', marginBottom: '12px' }}
                    />
                    <label htmlFor="summary-guest-phone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Телефон</label>
                    <input
                        id="summary-guest-phone"
                        type="tel" inputMode="tel" value={client.phone || ''}
                        onChange={(e) => setClient((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+380 (XX) XXX-XX-XX"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {/* honeypot: приховане поле, яке заповнюють лише боти */}
                    <input
                        type="text" name="website" tabIndex={-1} autoComplete="off"
                        onChange={(e) => setClient((p) => ({ ...p, website: e.target.value }))}
                        style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                        aria-hidden="true"
                    />
                </div>
            )}
        </div>
    );
}