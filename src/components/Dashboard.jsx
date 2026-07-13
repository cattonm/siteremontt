// src/components/Dashboard.jsx
// ВЕБ-КАБІНЕТ. Те саме, що в боті, але зручніше: воронка заявок, пошук,
// зміна статусів, а для адміна — керування менеджерами і статистика.
//
// Безпека: усі перевірки ролі — НА СЕРВЕРІ. Тут роль впливає лише на те,
// які вкладки малювати; підміна ролі в localStorage не дає нічого,
// бо /api/admin/* однаково поверне 403.
import { useEffect, useState } from 'react';
import { authFetch, clearSession } from '../utils/auth';
import {
    Search, RefreshCw, LogOut, Users, BarChart3, Inbox, Copy, Check,
    Hand, Trash2, Calculator, ExternalLink,
} from 'lucide-react';

const DEAL_LABELS = {
    new: '🆕 Нова',
    sent: '📤 КП відправлено',
    won: '✅ Виграна',
    lost: '❌ Програна',
};
const DEAL_COLORS = { new: '#0a84ff', sent: '#ff9500', won: '#34c759', lost: '#8e8e93' };

function OrdersTab({ role }) {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState(null);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);

    const [reloadKey, setReloadKey] = useState(0);
    const load = () => setReloadKey((k) => k + 1);

    // Запит живе всередині ефекту (а не викликається з нього синхронно) —
    // так лінтер не свариться на каскадні рендери, і ми коректно
    // ігноруємо відповідь, якщо фільтр змінився, поки вона летіла.
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams();
                if (filter) p.set('deal', filter);
                if (q.trim()) p.set('q', q.trim());
                const res = await authFetch(`/api/orders?${p}`);
                const data = await res.json();
                if (alive) setOrders(data.orders || []);
            } catch { /* authFetch сам розлогінить при 401 */ }
            if (alive) setLoading(false);
        })();
        return () => { alive = false; };
    }, [filter, q, reloadKey]);

    const setStatus = async (row, deal, claim = false) => {
        await authFetch('/api/order_status', {
            method: 'POST',
            body: JSON.stringify({ row, deal, claim }),
        });
        load();
    };

    const counts = Object.keys(DEAL_LABELS).reduce((a, k) => {
        a[k] = orders.filter((o) => o.deal === k).length; return a;
    }, {});

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hint-color)' }} />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Пошук за іменем, телефоном, адресою"
                        style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                    />
                </div>
                <button onClick={load} title="Оновити" style={btnIcon}><RefreshCw size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Chip active={!filter} onClick={() => setFilter(null)}>Усі {orders.length}</Chip>
                {Object.entries(DEAL_LABELS).map(([k, label]) => (
                    <Chip key={k} active={filter === k} onClick={() => setFilter(filter === k ? null : k)}>
                        {label} {filter ? '' : counts[k] || 0}
                    </Chip>
                ))}
            </div>

            {loading && <div style={{ color: 'var(--hint-color)', padding: '20px 0' }}>Завантаження…</div>}
            {!loading && orders.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '40px 0' }}>
                    <Inbox size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <div>Заявок не знайдено</div>
                </div>
            )}

            {orders.map((o) => (
                <div key={o.row} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '15px' }}>
                                {o.name || 'Без імені'}
                                {o.source === 'web' && !o.manager_id && (
                                    <span style={{ marginLeft: '7px', fontSize: '11px', fontWeight: 700, color: '#ff9500' }}>🔥 вільний лід</span>
                                )}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--hint-color)', marginTop: '2px' }}>
                                {o.phone} · {o.date}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--hint-color)', marginTop: '2px' }}>
                                {o.address}
                            </div>
                            {role === 'admin' && o.manager_name && (
                                <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '3px' }}>
                                    👔 {o.manager_name}
                                </div>
                            )}
                        </div>
                        <span style={{ ...badge, background: DEAL_COLORS[o.deal] }}>{DEAL_LABELS[o.deal]}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {Object.entries(DEAL_LABELS)
                            .filter(([k]) => k !== o.deal)
                            .map(([k, label]) => (
                                <button key={k} onClick={() => setStatus(o.row, k)} style={btnSmall}>{label}</button>
                            ))}
                        {o.source === 'web' && !o.manager_id && (
                            <button onClick={() => setStatus(o.row, 'new', true)} style={{ ...btnSmall, background: '#ff9500', color: '#fff', border: 'none' }}>
                                <Hand size={13} /> Взяти в роботу
                            </button>
                        )}
                        <a href={`?edit_id=${o.row}`} style={{ ...btnSmall, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={13} /> Відкрити анкету
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AdminTab() {
    const [users, setUsers] = useState([]);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);
    const load = () => setReloadKey((k) => k + 1);
    useEffect(() => {
        let alive = true;
        (async () => {
            const res = await authFetch('/api/admin/users');
            const d = await res.json();
            if (alive) setUsers(d.users || []);
        })();
        return () => { alive = false; };
    }, [reloadKey]);

    const invite = async () => {
        const res = await authFetch('/api/admin/invite', { method: 'POST' });
        const d = await res.json();
        setCode(d.code || '');
        setCopied(false);
    };

    const revoke = async (user_id, name) => {
        if (!window.confirm(`Забрати доступ у «${name}»? Людина одразу втратить доступ до заявок.`)) return;
        await authFetch('/api/admin/revoke', { method: 'POST', body: JSON.stringify({ user_id }) });
        load();
    };

    return (
        <div>
            <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Додати менеджера</div>
                <div style={{ fontSize: '13px', color: 'var(--hint-color)', lineHeight: 1.45, marginBottom: '12px' }}>
                    Створіть одноразовий код і передайте людині. Вона натисне «Увійти через Telegram»
                    на цьому ж сайті й введе код. Пароль не потрібен — і його неможливо вкрасти.
                </div>

                {code ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code style={{ flex: 1, fontSize: '20px', fontWeight: 800, letterSpacing: '3px', textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'var(--secondary-bg, rgba(127,127,127,0.1))' }}>{code}</code>
                        <button
                            onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); }}
                            style={{ ...btnIcon, background: copied ? '#34c759' : undefined, color: copied ? '#fff' : undefined }}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                ) : (
                    <button onClick={invite} style={btnPrimary}>Створити код доступу</button>
                )}
                {code && <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '8px' }}>Код одноразовий, діє 7 днів.</div>}
            </div>

            <div style={{ fontWeight: 700, margin: '20px 0 10px' }}>Доступи ({users.length})</div>
            {users.map((u) => (
                <div key={u.user_id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>
                            {u.role === 'admin' ? '👑' : '👔'} {u.name || u.user_id}
                            {u.is_master && <span style={{ fontSize: '11px', color: 'var(--hint-color)', marginLeft: '6px' }}>(власник)</span>}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--hint-color)' }}>@{u.username || '—'}</div>
                    </div>
                    {!u.is_master && (
                        <button onClick={() => revoke(u.user_id, u.name)} style={{ ...btnIcon, color: '#ff3b30' }} title="Забрати доступ">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

function StatsTab() {
    const [s, setS] = useState(null);
    useEffect(() => {
        authFetch('/api/admin/stats').then((r) => r.json()).then(setS).catch(() => {});
    }, []);
    if (!s) return <div style={{ color: 'var(--hint-color)' }}>Завантаження…</div>;

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <Stat label="Усього заявок" value={s.total} />
                <Stat label="З сайту" value={s.web_leads} />
                <Stat label="Конверсія" value={s.conversion === null ? '—' : `${s.conversion}%`} hint="виграні / закриті" />
                <Stat label="Виграно" value={s.by_status?.won ?? 0} color="#34c759" />
            </div>

            <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>Воронка</div>
                {Object.entries(s.by_status || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                        <span>{DEAL_LABELS[k]}</span><b>{v}</b>
                    </div>
                ))}
            </div>

            <div style={{ ...card, marginTop: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>По менеджерах</div>
                {Object.keys(s.by_manager || {}).length === 0 && <div style={{ color: 'var(--hint-color)', fontSize: '14px' }}>Поки порожньо</div>}
                {Object.entries(s.by_manager || {}).sort((a, b) => b[1] - a[1]).map(([n, c]) => (
                    <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                        <span>👔 {n}</span><b>{c}</b>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard({ session, onNewOrder }) {
    const isAdmin = session.role === 'admin';
    const [tab, setTab] = useState('orders');

    return (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>Кабінет</div>
                    <div style={{ fontSize: '13px', color: 'var(--hint-color)' }}>
                        {isAdmin ? '👑 Адміністратор' : '👔 Менеджер'} · {session.name}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={onNewOrder} style={btnPrimary}><Calculator size={16} /> Нова заявка</button>
                    <button onClick={() => { clearSession(); window.location.reload(); }} style={btnIcon} title="Вийти">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)' }}>
                <Tab active={tab === 'orders'} onClick={() => setTab('orders')}><Inbox size={15} /> Заявки</Tab>
                {isAdmin && <Tab active={tab === 'team'} onClick={() => setTab('team')}><Users size={15} /> Команда</Tab>}
                {isAdmin && <Tab active={tab === 'stats'} onClick={() => setTab('stats')}><BarChart3 size={15} /> Статистика</Tab>}
            </div>

            {tab === 'orders' && <OrdersTab role={session.role} />}
            {tab === 'team' && isAdmin && <AdminTab />}
            {tab === 'stats' && isAdmin && <StatsTab />}
        </div>
    );
}

// --- дрібні пресети стилів ---
const card = { background: 'var(--card-bg, rgba(127,127,127,0.06))', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px', marginBottom: '10px' };
const badge = { color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 };
const btnSmall = { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' };
const btnIcon = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer', flexShrink: 0 };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--link-color, #0a84ff)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' };

function Chip({ active, onClick, children }) {
    return (
        <button onClick={onClick} style={{
            ...btnSmall,
            background: active ? 'var(--link-color, #0a84ff)' : 'transparent',
            color: active ? '#fff' : 'var(--text-color)',
            borderColor: active ? 'transparent' : 'var(--border-color)',
        }}>{children}</button>
    );
}

function Tab({ active, onClick, children }) {
    return (
        <button onClick={onClick} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
            fontWeight: active ? 700 : 500,
            color: active ? 'var(--link-color, #0a84ff)' : 'var(--hint-color)',
            borderBottom: active ? '2px solid var(--link-color, #0a84ff)' : '2px solid transparent',
            marginBottom: '-1px',
        }}>{children}</button>
    );
}

function Stat({ label, value, hint, color }) {
    return (
        <div style={card}>
            <div style={{ fontSize: '12.5px', color: 'var(--hint-color)' }}>{label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: color || 'var(--text-color)' }}>{value}</div>
            {hint && <div style={{ fontSize: '11px', color: 'var(--hint-color)' }}>{hint}</div>}
        </div>
    );
}
