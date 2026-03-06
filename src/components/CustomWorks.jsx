import React from 'react';
import { vibe } from '../utils/telegram';

export default function CustomWorks({ answers, setAnswers }) {
    const customWorks = answers['custom_works'] || [];

    // Динамічно формуємо список доступних кімнат
    let zoneOptions = ["Загальні"];
    const rooms = parseInt(answers['rooms_count']) || 0;
    const baths = parseInt(answers['baths_count']) || 0;
    const aux = answers['aux_rooms'] || [];
    for(let i=1; i<=rooms; i++) zoneOptions.push(`Кімната ${i}`);
    for(let i=1; i<=baths; i++) zoneOptions.push(`Санвузол ${i}`);
    aux.forEach(a => zoneOptions.push(a));

    const updateWork = (index, field, value) => {
        setAnswers(prev => {
            const next = [...(prev.custom_works || [])];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, custom_works: next };
        });
    };

    const removeWork = (index) => {
        vibe('light');
        setAnswers(prev => {
            const next = [...(prev.custom_works || [])];
            next.splice(index, 1);
            return { ...prev, custom_works: next };
        });
    };

    const addWork = () => {
        vibe();
        setAnswers(prev => ({
            ...prev,
            custom_works: [...(prev.custom_works || []), { zone: "Загальні", name: "", calc_type: "Фіксована ціна", work_price: "", mat_price: "" }]
        }));
    };

    return (
        <div className="animated-step">
            <div className="zone-badge">⭐️ НЕСТАНДАРТНІ РОБОТИ</div>
            <h3>Додати індивідуальні роботи?</h3>
            
            {customWorks.map((work, idx) => (
                <div key={idx} style={{ background: 'var(--secondary-bg)', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 8px var(--shadow-color)' }}>
                    <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px' }}>Прив'язка до приміщення</label>
                    <select value={work.zone} onChange={(e) => updateWork(idx, 'zone', e.target.value)} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }}>
                        {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>

                    <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px' }}>Назва роботи</label>
                    <input type="text" placeholder="Наприклад: Монтаж сейфу" value={work.name} onChange={(e) => updateWork(idx, 'name', e.target.value)} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }} />

                    <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px' }}>Тип розрахунку</label>
                    <select value={work.calc_type} onChange={(e) => updateWork(idx, 'calc_type', e.target.value)} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }}>
                        <option value="Фіксована ціна">Фіксована ціна (за весь обсяг)</option>
                        <option value="За м² підлоги">Множити на м² підлоги приміщення</option>
                        <option value="За м² стін">Множити на м² стін приміщення</option>
                    </select>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px' }}>Ціна роботи (₴)</label>
                            <input type="number" inputMode="decimal" placeholder="0" value={work.work_price} onChange={(e) => updateWork(idx, 'work_price', parseFloat(e.target.value)||'')} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px' }}>Матеріал (₴)</label>
                            <input type="number" inputMode="decimal" placeholder="0" value={work.mat_price} onChange={(e) => updateWork(idx, 'mat_price', parseFloat(e.target.value)||'')} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }} />
                        </div>
                    </div>
                    
                    <button onClick={() => removeWork(idx)} style={{ width: '100%', padding: '12px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid #ff3b30', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🗑 Видалити цю роботу</button>
                </div>
            ))}

            <button onClick={addWork} style={{ width: '100%', padding: '15px', background: 'rgba(10, 132, 255, 0.1)', color: 'var(--link-color)', border: '2px dashed var(--link-color)', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                ➕ Додати нестандартну роботу
            </button>
        </div>
    );
}