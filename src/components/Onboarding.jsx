// src/components/Onboarding.jsx
// ВІТАЛЬНИЙ ЕКРАН. Раніше застосунок одразу питав ім'я — без пояснення,
// що буде далі, скільки це триватиме і що людина отримає в кінці.
// Класична причина відвалів на першому кроці: незрозуміло, у що вписуєшся.
//
// Показуємо різний текст для менеджера і для гостя (публічний калькулятор):
// у них різна мотивація — менеджеру важлива швидкість, гостю — «скільки
// коштуватиме мій ремонт і чи не змусять платити».
import { Boxes, SlidersHorizontal, Receipt, ArrowRight, Clock } from 'lucide-react';
import { vibe } from '../utils/telegram';

const STEPS = [
    {
        icon: Boxes,
        title: 'Складіть квартиру',
        text: 'Додайте кімнати й вкажіть площі — план збереться в 3D.',
    },
    {
        icon: SlidersHorizontal,
        title: 'Оберіть матеріали',
        text: 'Підлога, стіни, стеля, сантехніка. Кімната одразу показує, як це виглядатиме.',
    },
    {
        icon: Receipt,
        title: 'Отримайте кошторис',
        text: 'Ціна рахується наживо — по кожному приміщенню, з детальним розрахунком.',
    },
];

export default function Onboarding({ isGuest, onStart }) {
    return (
        <div style={{ padding: '30px 22px 24px', animation: 'fadeIn 0.35s ease' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                {isGuest ? 'Порахуйте вартість ремонту' : 'Нова заявка'}
            </h1>
            <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: 1.45, margin: '0 0 6px' }}>
                {isGuest
                    ? 'Зберіть свою квартиру, оберіть матеріали — і побачте кошторис. Безкоштовно, без дзвінків і реєстрації.'
                    : 'Зберіть об’єкт разом із клієнтом: 3D-план, матеріали й кошторис у реальному часі.'}
            </p>

            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '10px 0 26px',
                fontSize: '13px', fontWeight: 600, color: 'var(--hint-color)',
                background: 'var(--secondary-bg, rgba(127,127,127,0.1))',
                padding: '6px 12px', borderRadius: '20px',
            }}>
                <Clock size={14} /> Займе близько 3 хвилин
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '32px' }}>
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                            <div style={{
                                flexShrink: 0, width: '42px', height: '42px', borderRadius: '12px',
                                background: 'var(--secondary-bg, rgba(127,127,127,0.1))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--link-color, #0a84ff)',
                            }}>
                                <Icon size={21} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>
                                    {i + 1}. {s.title}
                                </div>
                                <div style={{ color: 'var(--hint-color)', fontSize: '14px', lineHeight: 1.4 }}>
                                    {s.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={() => { vibe('medium'); onStart(); }}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'var(--link-color, #0a84ff)', color: '#fff', border: 'none',
                    padding: '16px', borderRadius: '14px', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
                }}
            >
                Почати <ArrowRight size={18} />
            </button>

            {isGuest && (
                <p style={{ textAlign: 'center', color: 'var(--hint-color)', fontSize: '12.5px', marginTop: '14px', lineHeight: 1.4 }}>
                    Кошторис орієнтовний. Точну ціну підтверджує замір — контакти залишите в кінці, якщо захочете.
                </p>
            )}
        </div>
    );
}
