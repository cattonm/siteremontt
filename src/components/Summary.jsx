import React from 'react';
import { vibe } from '../utils/telegram';

export default function Summary({ client, answers, finalQuestions, shouldSkip, editStep, totals }) {
    
    // Групуємо питання по зонам (як у старому index.html)
    const grouped = {};
    finalQuestions.forEach((q, idx) => {
        if (['rooms_count', 'baths_count', 'aux_rooms'].includes(q.id) || q.type === 'trigger_meas' || q.type === 'custom_works_builder') return;
        if (shouldSkip(q, answers)) return;
        
        let val = answers[q.id];
        let valStr = "";
        
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) { 
            valStr = <i style={{color: 'var(--hint-color)'}}>не вибрано</i>; 
        } else if (val === "Ні" || val === "Не потребується" || val === "Не обладнувати") { 
            valStr = "Ні"; 
        } else if (typeof val === 'object' && !Array.isArray(val)) {
            if (val.type) { 
                valStr = `${val.type} ${val.tier && val.tier !== '-' ? '('+val.tier+')' : ''}`; 
            } else { 
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
        } else if (Array.isArray(val)) { 
            valStr = val.join(', '); 
        } else { 
            valStr = val; 
        }
        
        if (!grouped[q.zone]) grouped[q.zone] = [];
        grouped[q.zone].push({ label: q.text.replace('.', ''), valStr, idx });
    });

    const cWorks = answers['custom_works'] || [];
    const customIndex = finalQuestions.findIndex(q => q.id === 'custom_works');
    const measIndex = finalQuestions.findIndex(q => q.type === 'trigger_meas');

    return (
        <div className="animated-step">
            <h3 style={{ marginBottom: '5px' }}>✅ Перевірка даних</h3>
            <p style={{ color: 'var(--hint-color)', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>Перевірте зібраний кошторис перед відправкою.</p>

            {/* ІНФОРМАЦІЯ ПРО КЛІЄНТА */}
            <div className="summary-box">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px' }}>
                    <div className="cart-zone-title" style={{ marginTop:0, border:'none', padding:0 }}>👤 ІНФОРМАЦІЯ ПРО ОБ'ЄКТ</div>
                    <div className="edit-btn" onClick={() => editStep(-1)}>✏️ Змінити</div>
                </div>
                <div className="summary-item"><span>Ім'я:</span> <b>{client.name || '-'}</b></div>
                <div className="summary-item"><span>Телефон:</span> <b>{client.phone || '-'}</b></div>
                <div className="summary-item"><span>Площа:</span> <b>{client.area || '0'} м²</b></div>
                <div className="summary-item"><span>Тип:</span> <b>{client.object_type}</b></div>
            </div>

            {/* ЗАМІРИ */}
            {answers.measurements && Object.keys(answers.measurements).length > 0 && (
                <div className="summary-box">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px' }}>
                        <div className="cart-zone-title" style={{ marginTop:0, border:'none', padding:0 }}>📏 ТОЧНІ ЗАМІРИ</div>
                        <div className="edit-btn" onClick={() => editStep(measIndex)}>✏️ Змінити</div>
                    </div>
                    {Object.entries(answers.measurements).map(([zoneId, meas]) => {
                        const zoneNames = { 'hallway': 'Передпокій', 'kitchen': 'Кухня', 'balcony': 'Балкон', 'wardrobe': 'Гардероб', 'basement': 'Підвал', 'attic': 'Горище' };
                        let displayName = zoneNames[zoneId] || (zoneId.startsWith('room_') ? `Кімната ${zoneId.split('_')[1]}` : `Санвузол ${zoneId.split('_')[1]}`);
                        if (meas.floor > 0 || meas.walls > 0) {
                            return (
                                <div key={zoneId} className="summary-item" style={{ fontSize: '14px' }}>
                                    <span>{displayName}:</span> 
                                    <span style={{ textAlign:'right' }}>Підлога: {meas.floor} м²<br/>Стіни: {meas.walls} м²</span>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            )}

            {/* ПИТАННЯ ПО ЗОНАХ */}
            {Object.entries(grouped).map(([zone, items]) => (
                <div key={zone} className="summary-box">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px' }}>
                        <div className="cart-zone-title" style={{ marginTop:0, border:'none', padding:0 }}>{zone}</div>
                    </div>
                    {items.map((item, i) => (
                        <div key={i} className="summary-item" style={{ alignItems:'center' }}>
                            <div style={{ flex:1, paddingRight:'10px' }}>
                                <div style={{ fontSize:'13px', color:'var(--hint-color)', marginBottom:'4px' }}>{item.label}</div>
                                <div style={{ fontWeight:500 }}>{item.valStr}</div>
                            </div>
                            <div className="edit-btn" onClick={() => editStep(item.idx)}>✏️</div>
                        </div>
                    ))}
                </div>
            ))}

            {/* НЕСТАНДАРТНІ РОБОТИ */}
            <div className="summary-box">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px' }}>
                    <div className="cart-zone-title" style={{ marginTop:0, border:'none', padding:0 }}>⭐️ НЕСТАНДАРТНІ РОБОТИ</div>
                    <div className="edit-btn" onClick={() => editStep(customIndex)}>{cWorks.length > 0 ? '✏️ Змінити' : '➕ Додати'}</div>
                </div>
                {cWorks.length > 0 ? cWorks.map((cw, idx) => (
                    <div key={idx} className="summary-item" style={{ display:'block', paddingBottom:'10px' }}>
                        <div style={{ fontWeight:600, fontSize:'14px' }}>{cw.name || 'Без назви'} <span style={{ fontSize:'12px', fontWeight:'normal', color:'var(--hint-color)' }}>({cw.zone})</span></div>
                        <div style={{ fontSize:'12px', color:'var(--hint-color)', marginTop:'2px' }}>Тип: {cw.calc_type}</div>
                        <div style={{ fontSize:'13px', marginTop:'2px' }}>Робота: {cw.work_price || 0} ₴ | Матеріал: {cw.mat_price || 0} ₴</div>
                    </div>
                )) : <div style={{ fontSize:'13px', color:'var(--hint-color)' }}>Не додано жодної кастомної роботи.</div>}
            </div>

            {/* ФІНАЛЬНА ЦІНА */}
            <div className="summary-box" style={{ background: 'rgba(52, 199, 89, 0.1)', borderColor: '#34c759' }}>
                <div style={{ textAlign: 'center', color: '#34c759', fontWeight: 700, fontSize: '16px', marginBottom: '5px' }}>ВАРТІСТЬ ЗАРАЗ</div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>Робота</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-color)' }}>{totals.work.toLocaleString()} ₴</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>Матеріали (від)</div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-color)' }}>{totals.mat_min.toLocaleString()} ₴</div>
                    </div>
                </div>
            </div>
        </div>
    );
}