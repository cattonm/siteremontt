// src/components/modals/ServerDraftPrompt.jsx
// Чернетка, знайдена на сервері (інший пристрій) — показуємо банер
// «Продовжити?», а не мовчки підміняємо стан. Типовий кейс — менеджер
// почав на телефоні, продовжує на планшеті.
import { vibe } from '../../utils/telegram';

export default function ServerDraftPrompt({ draft, trapRef, onContinue, onDiscard }) {
    return (
        <>
            <div className="sheet-overlay open" style={{ zIndex: 9998 }}></div>
            <div ref={trapRef} className="image-modal open" role="dialog" aria-modal="true" aria-label="Незавершена заявка" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                <h3 style={{ marginTop: 0, fontSize: '20px' }}>Незавершена заявка</h3>
                <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>
                    На сервері збережена анкета
                    {draft.payload?.client?.name ? <> клієнта <b>{draft.payload.client.name}</b></> : null}
                    {draft.updated_at ? <> від {new Date(draft.updated_at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</> : null}.
                    Продовжити з місця зупинки?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button
                        type="button"
                        onClick={() => { vibe('medium'); onContinue(); }}
                        style={{ background: 'var(--link-color)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                    >Продовжити</button>
                    <button
                        type="button"
                        onClick={() => { vibe('light'); onDiscard(); }}
                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                    >Почати нову</button>
                </div>
            </div>
        </>
    );
}
