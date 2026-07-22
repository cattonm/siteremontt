// src/components/SharedEstimateView.jsx
// Read-only перегляд кошторису за шер-посиланням (патч 10.3). Свідомо
// НЕ перевикористовує Summary.jsx: той читає rooms/liveBreakdown напряму
// зі стора глядача (useStore) — підмінити їх знімком чужого кошторису
// означало б або тимчасово затерти власну чернетку глядача, або городити
// умовне читання "зі стора чи з пропса" в компоненті, яким користуються
// всі, завжди. Окремий простий компонент безпечніший і дешевший.
import AnimatedPrice from './AnimatedPrice';
import { ROOM_QUESTIONS_CONFIG } from '../data/questions';
import { formatRoomValue } from '../utils/formatRoomValue';
import { ArrowRight } from 'lucide-react';

export default function SharedEstimateView({ snapshot, onStartOwn }) {
    const { client = {}, rooms = [], totals = { work: 0, mat_min: 0 } } = snapshot || {};

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>Кошторис ремонту</h2>
                <p style={{ color: 'var(--hint-color)', fontSize: '13.5px', margin: 0 }}>
                    {[client.object_type, client.area ? `${client.area} м²` : null].filter(Boolean).join(' · ') || 'Об’єкт клієнта'}
                </p>
            </div>

            {rooms.map((room) => {
                const cfg = ROOM_QUESTIONS_CONFIG[room.type] || [];
                const lines = cfg
                    .map((q) => ({ label: q.group === 'Інше' ? 'Інше' : q.text.replace(/\.$/, ''), value: formatRoomValue(q, room[q.id]) }))
                    .filter((l) => l.value);
                const area = parseFloat(room.measurements?.floor) || 0;
                return (
                    <div key={room.id} className="summary-box" style={{ padding: '14px 18px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                            {room.name} <span style={{ color: 'var(--hint-color)', fontWeight: 500, fontSize: '13px' }}>· {area} м²</span>
                        </div>
                        {lines.length > 0 ? lines.map((l, i) => (
                            <div key={i} style={{ fontSize: '13px', margin: '3px 0' }}>
                                <span style={{ color: 'var(--hint-color)' }}>{l.label}: </span>{l.value}
                            </div>
                        )) : <div style={{ fontSize: '13px', color: 'var(--hint-color)' }}><i>Матеріали не обрані</i></div>}
                    </div>
                );
            })}

            <div className="summary-box" style={{ background: 'var(--money-soft)', borderColor: 'var(--money)', padding: '15px 20px', marginTop: '4px' }}>
                <div style={{ textAlign: 'center', color: 'var(--money)', fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>ВАРТІСТЬ</div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px' }}>Робота</div>
                        <div style={{ fontWeight: 800, fontSize: '18px' }}><AnimatedPrice value={totals.work} /> ₴</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px' }}>Матеріали (від)</div>
                        <div style={{ fontWeight: 800, fontSize: '18px' }}><AnimatedPrice value={totals.mat_min} /> ₴</div>
                    </div>
                </div>
            </div>
            <p style={{ color: 'var(--hint-color)', fontSize: '11.5px', textAlign: 'center', margin: '8px 0 0' }}>
                Орієнтовний розрахунок. Точну ціну підтверджують на об'єкті.
            </p>

            <button
                type="button" className="btn-next"
                style={{ width: '100%', marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={onStartOwn}
            >
                Порахувати свій ремонт <ArrowRight size={18} aria-hidden="true" />
            </button>
        </div>
    );
}
