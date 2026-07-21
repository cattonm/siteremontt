// src/components/modals/ThanksScreen.jsx
// Екран подяки гостя — окремий повноекранний крок. Раніше малювався
// ВСЕРЕДИНІ анкети, тому знизу лишалася її кнопка «Далі»: натиснувши,
// людина отримувала «Вкажіть площу об'єкта!» на вже надісланій заявці.
export default function ThanksScreen({ sentTotal }) {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '380px', animation: 'fadeIn 0.35s ease' }}>
                <div style={{ fontSize: '54px', lineHeight: 1, marginBottom: '18px' }}>✅</div>
                <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800 }}>Заявку надіслано</h2>
                <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: 1.5, margin: 0 }}>
                    {sentTotal > 0 && (
                        <>Ваш кошторис — <b style={{ color: 'var(--text-color)' }}>від {sentTotal.toLocaleString()} ₴</b>.<br /></>
                    )}
                    Менеджер зателефонує найближчим часом і уточнить деталі.
                </p>
            </div>
        </div>
    );
}
