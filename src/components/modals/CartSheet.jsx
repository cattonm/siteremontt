// src/components/modals/CartSheet.jsx
// Bottom-sheet «Структура вартості»: донат-діаграма робота/матеріали +
// глобальний тумблер рівня, продубльований тут — там, де людина дивиться
// на цифри: перемкнув і одразу бачить, як змінилась сума.
import TierSwitch from '../TierSwitch';
import AnimatedPrice from '../AnimatedPrice';

export default function CartSheet({ open, trapRef, totals, onClose }) {
    const totalCost = totals.work + totals.mat_min;
    const workPct = totalCost > 0 ? Math.round((totals.work / totalCost) * 100) : 0;
    const matPct = totalCost > 0 ? 100 - workPct : 0;

    return (
        <div ref={trapRef} className={`bottom-sheet ${open ? 'open' : ''}`} role="dialog" aria-modal={open} aria-label="Структура вартості">
            <div className="drag-handle"></div>
            <h3 style={{ marginBottom: '5px' }}>Структура вартості</h3>
            <p style={{ color: 'var(--hint-color)', fontSize: '13px', marginTop: 0 }}>Попередній прорахунок на основі відповідей.</p>

            <TierSwitch />

            <div className="chart-container">
                <div className="donut-wrapper" style={{ background: `conic-gradient(var(--link-color) 0% ${workPct}%, var(--money) ${workPct}% 100%)` }}>
                    <div className="donut-hole"></div>
                </div>
                <div className="chart-legend">
                    <div className="legend-item"><span style={{ fontWeight: 600 }}><span className="legend-dot" style={{ background: 'var(--link-color)' }} aria-hidden="true"></span>Робота ({workPct}%)</span> <b><AnimatedPrice value={totals.work} /> ₴</b></div>
                    <div className="legend-item"><span style={{ fontWeight: 600 }}><span className="legend-dot" style={{ background: 'var(--money)' }} aria-hidden="true"></span>Матеріали ({matPct}%)</span> <b><AnimatedPrice value={totals.mat_min} /> ₴</b></div>
                    <div className="legend-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 700 }}>Всього (від)</span> <b><AnimatedPrice value={totalCost} /> ₴</b>
                    </div>
                </div>
            </div>
            <button type="button" className="cart-close-btn" onClick={onClose} style={{ marginTop: '25px' }}>Закрити кошик</button>
        </div>
    );
}
