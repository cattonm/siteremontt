// src/components/modals/SideMenu.jsx
// Бургер-меню розділів анкети + вхід/повернення в кабінет менеджера
// (доступні ЗАВЖДИ — раніше посилання жило лише на екрані онбордингу,
// а той показується один раз: після першого проходження кнопка ставала
// недосяжною).
import { ShieldCheck, Trash2 } from 'lucide-react';

export default function SideMenu({ open, trapRef, zones, panelLabel, onJumpToStep, onOpenPanel, onResetDraft }) {
    return (
        <div id="side-menu" ref={trapRef} className={open ? 'open' : ''} role="dialog" aria-modal={open} aria-label="Розділи анкети">
            <div className="menu-header">📋 Розділи анкети</div>
            {zones.map((z, i) => (
                <button key={i} type="button" className="btn-reset menu-item" style={{ display: 'block', width: '100%' }} onClick={() => onJumpToStep(z.step)}> {z.name} </button>
            ))}

            <button
                type="button"
                className="btn-reset menu-item"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', width: '100%', borderTop: '1px solid var(--border-color)', color: 'var(--link-color)', fontWeight: 600 }}
                onClick={onOpenPanel}
            >
                <ShieldCheck size={18} aria-hidden="true" /> {panelLabel}
            </button>

            <button type="button" className="btn-reset menu-item" style={{ color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', borderBottom: 'none' }} onClick={onResetDraft}>
                <Trash2 size={18} aria-hidden="true" /> Почати заново
            </button>
        </div>
    );
}
