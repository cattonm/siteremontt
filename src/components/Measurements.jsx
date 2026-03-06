import React from 'react';

export default function Measurements({ answers, setAnswers }) {
    const aux = answers['aux_rooms'] || [];
    const roomsCount = parseInt(answers['rooms_count']) || 0;
    const bathsCount = parseInt(answers['baths_count']) || 0;

    // Збираємо масив кімнат, які менеджер вибрав раніше
    const zones = [];
    if (aux.includes('Передпокій')) zones.push({ id: 'hallway', name: 'Передпокій' });
    if (aux.includes('Кухня')) zones.push({ id: 'kitchen', name: 'Кухня' });
    if (aux.includes('Балкон')) zones.push({ id: 'balcony', name: 'Балкон' });
    if (aux.includes('Гардероб')) zones.push({ id: 'wardrobe', name: 'Гардероб' });
    if (aux.includes('Підвал')) zones.push({ id: 'basement', name: 'Підвал' });
    if (aux.includes('Горище')) zones.push({ id: 'attic', name: 'Горище' });
    for (let i = 1; i <= roomsCount; i++) zones.push({ id: `room_${i}`, name: `Кімната ${i}` });
    for (let i = 1; i <= bathsCount; i++) zones.push({ id: `bath_${i}`, name: `Санвузол ${i}` });

    const meas = answers.measurements || {};

    const updateMeas = (zoneId, field, val) => {
        setAnswers(prev => {
            const nextMeas = { ...prev.measurements };
            if (!nextMeas[zoneId]) nextMeas[zoneId] = { floor: '', walls: '', auto: true };
            
            const updatedZone = { ...nextMeas[zoneId], [field]: val };
            
            // Автозаповнення стін (Підлога * 3)
            if (field === 'floor' && updatedZone.auto !== false) {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    updatedZone.walls = parseFloat((num * 3).toFixed(1));
                } else {
                    updatedZone.walls = '';
                }
            } else if (field === 'walls') {
                updatedZone.auto = false; // Якщо менеджер сам ввів стіни, більше не перезаписуємо
            }
            
            nextMeas[zoneId] = updatedZone;
            return { ...prev, measurements: nextMeas };
        });
    };

    if (zones.length === 0) return <div className="animated-step"><p style={{ color: 'var(--hint-color)' }}>Немає вибраних приміщень для замірів.</p></div>;

    return (
        <div className="animated-step">
            <h3 style={{ marginBottom: '5px' }}>📏 Точні заміри приміщень</h3>
            <p style={{ color: 'var(--hint-color)', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>Введіть точні дані, щоб калькулятор працював ідеально.</p>
            
            {zones.map(z => (
                <div key={z.id} className="measurement-box animated-step">
                    <h4 style={{ marginTop: 0, fontSize: '18px' }}>{z.name}</h4>
                    <label>Площа підлоги (м²)</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={meas[z.id]?.floor || ''} onChange={(e) => updateMeas(z.id, 'floor', e.target.value)} />
                    <label>Площа стін (м²)</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={meas[z.id]?.walls || ''} onChange={(e) => updateMeas(z.id, 'walls', e.target.value)} />
                </div>
            ))}
        </div>
    );
}