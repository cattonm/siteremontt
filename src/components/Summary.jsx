import React, { useState } from 'react';
import AnimatedPrice from './AnimatedPrice';
import { vibe } from '../utils/telegram';
import { ChevronDown, ChevronUp, User, Ruler, Settings, Wrench, Edit3, CheckCircle2 } from 'lucide-react';

export default function Summary({ client, answers, finalQuestions, shouldSkip, editStep, totals }) {
    const [openZones, setOpenZones] = useState({ "👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ": true });

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

            {answers.measurements && Object.keys(answers.measurements).length > 0 && (
                <div className="summary-box" style={{ padding: '0 20px' }}>
                    <div className="accordion-header" onClick={() => toggleZone("📏 ТОЧНІ ЗАМІРИ")}>
                        <div className="accordion-title"><Ruler size={18} /> ТОЧНІ ЗАМІРИ</div>
                        {openZones["📏 ТОЧНІ ЗАМІРИ"] ? <ChevronUp size={20} color="var(--hint-color)" /> : <ChevronDown size={20} color="var(--hint-color)" />}
                    </div>
                    <div className={`accordion-content ${openZones["📏 ТОЧНІ ЗАМІРИ"] ? 'open' : ''}`}>
                        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}><div className="edit-btn" onClick={() => editStep(measIndex)}><Edit3 size={14}/> Змінити</div></div>
                        {Object.entries(answers.measurements).map(([zoneId, meas]) => {
                            const zoneNames = { 'hallway': 'Передпокій', 'kitchen': 'Кухня', 'balcony': 'Балкон', 'wardrobe': 'Гардероб', 'basement': 'Підвал', 'attic': 'Горище' };
                            let displayName = zoneNames[zoneId] || (zoneId.startsWith('room_') ? `Кімната ${zoneId.split('_')[1]}` : `Санвузол ${zoneId.split('_')[1]}`);
                            if (meas.floor > 0 || meas.walls > 0) {
                                return (
                                    <div key={zoneId} className="summary-item" style={{ fontSize: '14px' }}>
                                        <span>{displayName}:</span> <span style={{ textAlign:'right' }}>Підлога: {meas.floor} м²<br/>Стіни: {meas.walls} м²</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                        <div style={{height: '15px'}}></div>
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