// src/components/TierSwitch.jsx
// ГЛОБАЛЬНИЙ РІВЕНЬ КОШТОРИСУ. Один тумблер перераховує ВЕСЬ кошторис:
// «Стандарт» бере мінімальну ціну матеріалів, «Преміум» — максимальну,
// «Комфорт» — середній сегмент. Вартість РОБІТ не змінюється — міняється
// лише клас матеріалів, і це чесно проговорено в підказці.
//
// Практична цінність: менеджер за секунду показує клієнту вилку
// «від 480 тис. до 890 тис.» замість того, щоб перезбирати анкету.
// Рівень, заданий у конкретній позиції (напр. «Ванна: Преміум»),
// має пріоритет — глобальний тумблер його не перебиває.
import useStore from '../store/useStore';
import { vibeSelect } from '../utils/telegram';

const TIERS = [
    { val: 'Стандарт', hint: 'Базові матеріали' },
    { val: 'Комфорт', hint: 'Середній сегмент' },
    { val: 'Преміум', hint: 'Топові матеріали' },
];

export default function TierSwitch() {
    const answers = useStore((s) => s.answers);
    const setAnswers = useStore((s) => s.setAnswers);
    const current = answers.global_tier || 'Стандарт';

    return (
        <div style={{ marginBottom: '14px' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: '7px',
            }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-color)' }}>
                    Рівень матеріалів
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--hint-color)' }}>
                    {TIERS.find((t) => t.val === current)?.hint}
                </span>
            </div>

            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px',
                background: 'var(--secondary-bg, rgba(127,127,127,0.1))',
                padding: '4px', borderRadius: '11px',
            }}>
                {TIERS.map((t) => {
                    const active = current === t.val;
                    return (
                        <button
                            key={t.val}
                            onClick={() => {
                                vibeSelect();
                                setAnswers((prev) => ({ ...prev, global_tier: t.val }));
                            }}
                            style={{
                                padding: '9px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: active ? 700 : 500,
                                background: active ? 'var(--bg-color, #fff)' : 'transparent',
                                color: active ? 'var(--text-color)' : 'var(--hint-color)',
                                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                                transition: 'background 0.15s ease, color 0.15s ease',
                            }}
                        >
                            {t.val}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
