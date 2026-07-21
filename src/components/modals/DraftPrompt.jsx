// src/components/modals/DraftPrompt.jsx
// Локальна незбережена анкета (localStorage) — пропонуємо продовжити або
// почати заново. У режимі редагування заявки текст інший (посилається на
// номер заявки, а не на анонімну «анкету»).
import { vibe } from '../../utils/telegram';

export default function DraftPrompt({ trapRef, editingOrderId, onContinue, onRestart }) {
    return (
        <>
            <div className="sheet-overlay open" style={{ zIndex: 9998 }}></div>
            <div ref={trapRef} className="image-modal open" role="dialog" aria-modal="true" aria-label="Відновлення" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                <h3 style={{ marginTop: 0, fontSize: '20px' }}>Відновлення</h3>
                <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>
                    {editingOrderId
                        ? `Ви редагували заявку №${editingOrderId}, але не зберегли зміни. Продовжити редагування? Збереження оновить ту саму заявку, а не створить нову.`
                        : 'Знайдено незбережену анкету. Бажаєте продовжити заповнення з місця зупинки?'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button
                        type="button"
                        onClick={() => { vibe('medium'); onContinue(); }}
                        style={{ background: 'var(--link-color)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                    >
                        {editingOrderId ? 'Продовжити редагування' : 'Продовжити збережену'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { vibe('light'); onRestart(); }}
                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                    >Почати заново</button>
                </div>
            </div>
        </>
    );
}
