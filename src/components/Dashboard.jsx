// src/components/Dashboard.jsx
// ВЕБ-КАБІНЕТ: воронка заявок, пошук, статуси; для адміна — команда і статистика.
//
// Що тут оптимізовано (кожен пункт — реальна проблема, а не «про всяк випадок»):
//  1. ПОШУК ІЗ ДЕБАУНСОМ. Було: запит на КОЖНУ літеру. Слово «Наталія» = 7
//     звернень до Google Sheets, а там квота 60 читань/хв на весь проєкт —
//     кілька менеджерів одночасно клали кабінет у 429. Тепер — 400 мс тиші.
//  2. ПАГІНАЦІЯ. Список вантажиться по 20 заявок, далі «Показати ще».
//  3. ОПТИМІСТИЧНІ СТАТУСИ. Статус міняється в інтерфейсі МИТТЄВО, запит
//     летить фоном; якщо сервер відмовив — відкочуємо і кажемо про це.
//  4. ДЕТАЛІ ЗА ЗАПИТОМ. Кошторис і склад робіт вантажаться, лише коли
//     картку розгорнули (у списку їх немає — інакше кожне відкриття тягнуло б
//     повний JSON усіх анкет).
//  5. СКЕЛЕТОНИ замість «Завантаження…» — інтерфейс не смикається.
import { useEffect, useState, useRef } from 'react';
import { authFetch, clearSession } from '../utils/auth';
import {
    Search, RefreshCw, LogOut, Users, BarChart3, Inbox, Copy, Check, X,
    Hand, Trash2, Calculator, ExternalLink, ChevronDown, ChevronUp, Phone,
    Undo2, Flame, AlertTriangle,
} from 'lucide-react';

const DEAL_LABELS = {
    new: '🆕 Нова',
    sent: '📤 КП відправлено',
    won: '✅ Виграна',
    lost: '❌ Програна',
};
const DEAL_COLORS = { new: '#0a84ff', sent: '#ff9500', won: '#34c759', lost: '#8e8e93' };
const PAGE = 20;

const money = (n) => Number(n || 0).toLocaleString('uk-UA');

/* ---------------- Деталі заявки (вантажаться за запитом) ---------------- */
function OrderDetail({ row }) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [report, setReport] = useState('');
    const [gen, setGen] = useState(false);
    const [genErr, setGenErr] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await authFetch(`/api/order_detail?row=${row}`);
                const d = await res.json();
                if (alive) { setData(d); setReport(d.order?.report || ''); }
            } catch {
                if (alive) setFailed(true);
            }
        })();
        return () => { alive = false; };
    }, [row]);

    const generate = async () => {
        setGen(true); setGenErr('');
        try {
            const res = await authFetch('/api/generate_report', {
                method: 'POST', body: JSON.stringify({ row }),
            });
            const d = await res.json();
            if (res.ok && d.report != null) setReport(d.report);
            else setGenErr('Не вдалося згенерувати ТЗ. Спробуйте ще раз.');
        } catch { setGenErr('Помилка мережі.'); }
        setGen(false);
    };

    if (failed) return <div style={{ fontSize: '13px', color: '#ff3b30', padding: '10px 0' }}>Не вдалося завантажити деталі.</div>;
    if (!data) return <div style={{ ...skeleton, height: '70px', marginTop: '10px' }} />;

    const b = data.budget;
    return (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
            {b && (
                <div style={{ display: 'flex', gap: '18px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--hint-color)' }}>Робота</div>
                        <div style={{ fontWeight: 800, fontSize: '17px' }}>{money(b.work)} ₴</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--hint-color)' }}>Матеріали (від)</div>
                        <div style={{ fontWeight: 800, fontSize: '17px' }}>{money(b.mat_min)} ₴</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--hint-color)' }}>Разом</div>
                        <div style={{ fontWeight: 800, fontSize: '17px', color: '#34c759' }}>{money(b.total)} ₴</div>
                    </div>
                </div>
            )}

            {data.rooms?.length > 0 && (
                <div>
                    {data.rooms.map((r, i) => (
                        <div key={i} style={{ padding: '7px 0', borderBottom: i === data.rooms.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                                <span><b>{r.name}</b> <span style={{ color: 'var(--hint-color)' }}>· {r.area} м²</span></span>
                                <span style={{ fontWeight: 600 }}>{money(r.work)} ₴</span>
                            </div>
                            {r.lines?.length > 0 && (
                                <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '3px' }}>
                                    {r.lines.map((l) => l.label).join(' · ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!b && <div style={{ fontSize: '13px', color: 'var(--hint-color)' }}>Кошторис не вдалося порахувати (стара заявка).</div>}

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>📋 Технічне завдання</span>
                    <button onClick={generate} disabled={gen}
                        style={{ fontSize: '12px', padding: '5px 11px', borderRadius: '8px', border: 'none',
                                 background: 'var(--button-color, #0a84ff)', color: '#fff', cursor: gen ? 'default' : 'pointer', opacity: gen ? 0.6 : 1 }}>
                        {gen ? 'Генеруємо…' : (report ? '🔄 Перегенерувати' : '✨ Згенерувати ТЗ')}
                    </button>
                </div>
                {genErr && <div style={{ fontSize: '12px', color: '#ff3b30', marginBottom: '6px' }}>{genErr}</div>}
                {report
                    ? <div style={{ fontSize: '13px', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: report }} />
                    : <div style={{ fontSize: '12.5px', color: 'var(--hint-color)' }}>ТЗ ще не згенеровано.</div>}
            </div>
        </div>
    );
}

/* ---------------- Вкладка «Заявки» ---------------- */
function OrdersTab({ role }) {
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({});
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState(null);
    const [input, setInput] = useState('');      // те, що людина набирає
    const [q, setQ] = useState('');              // те, що реально шукаємо (дебаунс)
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [openRow, setOpenRow] = useState(null);
    const [error, setError] = useState(null);   // текст помилки API, а не тиша
    const inputRef = useRef(null);

    // ДЕБАУНС: чекаємо 400 мс тиші, і лише тоді б'ємо в API
    useEffect(() => {
        const t = setTimeout(() => { setQ(input.trim()); setOffset(0); }, 400);
        return () => clearTimeout(t);
    }, [input]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
                if (filter) p.set('deal', filter);
                if (q) p.set('q', q);
                const res = await authFetch(`/api/orders?${p}`);
                // РАНІШЕ помилку API просто ковтали, і кабінет малював «Заявок
                // немає» — тобто збій сервера виглядав як порожня база. Тепер
                // кажемо прямо, що саме сталося.
                if (!res.ok) {
                    if (alive) setError(res.status === 404
                        ? 'Сервер не знає цього запиту (404). Схоже, бекенд не оновлено — задеплойте main.py.'
                        : `Сервер відповів помилкою ${res.status}.`);
                    if (alive) setLoading(false);
                    return;
                }
                const d = await res.json();
                if (!alive) return;
                // offset > 0 — це «Показати ще», дописуємо в кінець
                setOrders((prev) => (offset > 0 ? [...prev, ...(d.orders || [])] : (d.orders || [])));
                setCounts(d.counts || {});
                setTotal(d.total || 0);
                setHasMore(!!d.has_more);
            } catch (e) {
                // authFetch сам розлогінить при 401; решта — мережа/CORS
                if (alive && e?.message !== 'unauthorized') {
                    setError('Не вдалося звʼязатися з сервером. Перевірте зʼєднання.');
                }
            }
            if (alive) setLoading(false);
        })();
        return () => { alive = false; };
    }, [filter, q, offset, reloadKey]);

    const refresh = () => { setOffset(0); setReloadKey((k) => k + 1); };

    // ОПТИМІСТИЧНО: малюємо новий статус одразу, запит летить фоном
    const setStatus = async (row, deal, claim = false) => {
        const before = orders;
        setOrders((prev) => prev.map((o) => (o.row === row
            ? { ...o, deal, manager_id: claim ? 'me' : o.manager_id }
            : o)));
        setCounts((c) => {
            const old = before.find((o) => o.row === row)?.deal;
            if (!old || old === deal) return c;
            return { ...c, [old]: Math.max(0, (c[old] || 1) - 1), [deal]: (c[deal] || 0) + 1 };
        });
        try {
            const res = await authFetch('/api/order_status', {
                method: 'POST',
                body: JSON.stringify({ row, deal, claim }),
            });
            if (!res.ok) throw new Error('fail');
        } catch {
            setOrders(before);                       // відкат
            alert('Не вдалося змінити статус. Спробуйте ще раз.');
        }
    };

    // У КОШИК: заявка зникає зі списку миттєво, запит летить фоном.
    // Це soft delete — дані лишаються в таблиці й відновлюються з «Кошика».
    const toTrash = async (row, name) => {
        if (!window.confirm(`Перемістити заявку «${name || 'Без імені'}» у кошик?\n\nВона зникне зі списку, але її можна буде відновити.`)) return;
        const before = orders;
        setOrders((prev) => prev.filter((o) => o.row !== row));
        try {
            const res = await authFetch('/api/order_delete', { method: 'POST', body: JSON.stringify({ row }) });
            if (!res.ok) throw new Error('fail');
        } catch {
            setOrders(before);
            alert('Не вдалося видалити. Спробуйте ще раз.');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hint-color)' }} />
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Пошук за іменем, телефоном, адресою"
                        style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px', paddingRight: input ? '36px' : '12px' }}
                    />
                    {input && (
                        <button
                            onClick={() => { setInput(''); inputRef.current?.focus(); }}
                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--hint-color)', cursor: 'pointer', padding: 4 }}
                        ><X size={15} /></button>
                    )}
                </div>
                <button onClick={refresh} title="Оновити" style={btnIcon}>
                    <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Chip active={!filter} onClick={() => { setFilter(null); setOffset(0); }}>
                    Усі {Object.values(counts).reduce((a, b) => a + b, 0)}
                </Chip>
                {Object.entries(DEAL_LABELS).map(([k, label]) => (
                    <Chip key={k} active={filter === k} onClick={() => { setFilter(filter === k ? null : k); setOffset(0); }}>
                        {label} {counts[k] ?? 0}
                    </Chip>
                ))}
            </div>

            {error && (
                <div style={{ ...card, background: 'rgba(255,59,48,0.08)', borderColor: 'rgba(255,59,48,0.35)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} color="#ff3b30" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '13.5px', lineHeight: 1.45 }}>
                        <b>Не вдалося завантажити заявки.</b><br />
                        <span style={{ color: 'var(--hint-color)' }}>{error}</span>
                    </div>
                </div>
            )}

            {loading && orders.length === 0 && [1, 2, 3].map((i) => (
                <div key={i} style={{ ...skeleton, height: '92px', marginBottom: '10px' }} />
            ))}

            {!loading && !error && orders.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '40px 0' }}>
                    <Inbox size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <div>{q ? 'За цим запитом нічого немає' : 'Заявок поки немає'}</div>
                </div>
            )}

            {orders.map((o) => {
                const isOpen = openRow === o.row;
                return (
                    <div key={o.row} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => setOpenRow(isOpen ? null : o.row)}>
                                <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {o.name || 'Без імені'}
                                    {o.source === 'web' && !o.manager_id && (
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ff9500' }}>🔥 вільний</span>
                                    )}
                                    {isOpen ? <ChevronUp size={14} color="var(--hint-color)" /> : <ChevronDown size={14} color="var(--hint-color)" />}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--hint-color)', marginTop: '2px' }}>{o.date}</div>
                                <div style={{ fontSize: '12.5px', color: 'var(--hint-color)', marginTop: '2px' }}>{o.address}</div>
                                {role === 'admin' && o.manager_name && (
                                    <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '3px' }}>👔 {o.manager_name}</div>
                                )}
                            </div>
                            <span style={{ ...badge, background: DEAL_COLORS[o.deal] }}>{DEAL_LABELS[o.deal]}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
                            {/* Телефон — головна дія менеджера: один тап і дзвінок */}
                            {o.phone && (
                                <a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`} style={{ ...btnSmall, textDecoration: 'none', fontWeight: 700 }}>
                                    <Phone size={13} /> {o.phone}
                                </a>
                            )}
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
                            <a href={`?edit_id=${o.row}`} style={{ ...btnSmall, textDecoration: 'none' }}>
                                <ExternalLink size={13} /> Анкета
                            </a>
                            <button
                                onClick={() => toTrash(o.row, o.name)}
                                style={{ ...btnSmall, color: '#ff3b30', borderColor: 'rgba(255,59,48,0.35)', marginLeft: 'auto' }}
                                title="У кошик"
                            ><Trash2 size={13} /></button>
                        </div>

                        {isOpen && <OrderDetail row={o.row} />}
                    </div>
                );
            })}

            {hasMore && (
                <button
                    onClick={() => setOffset((o) => o + PAGE)}
                    disabled={loading}
                    style={{ ...btnSmall, width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
                >
                    {loading ? 'Завантаження…' : `Показати ще (${total - orders.length})`}
                </button>
            )}
        </div>
    );
}

/* ---------------- Вкладка «Команда» (адмін) ---------------- */
function AdminTab() {
    const [users, setUsers] = useState([]);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

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
        setReloadKey((k) => k + 1);
    };

    return (
        <div>
            <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Додати менеджера</div>
                <div style={{ fontSize: '13px', color: 'var(--hint-color)', lineHeight: 1.45, marginBottom: '12px' }}>
                    Створіть одноразовий код і передайте людині. Вона відкриє бота, надішле код,
                    а далі зайде в кабінет через «Вхід для менеджерів». Паролів не існує — красти нічого.
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

/* ---------------- Вкладка «Статистика» (адмін) ---------------- */
function StatsTab() {
    const [s, setS] = useState(null);
    useEffect(() => {
        let alive = true;
        authFetch('/api/admin/stats')
            .then((r) => r.json())
            .then((d) => { if (alive) setS(d); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);
    if (!s) return <div style={{ ...skeleton, height: '120px' }} />;

    const maxCount = Math.max(1, ...Object.values(s.by_status || {}));
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
                    <div key={k} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '3px' }}>
                            <span>{DEAL_LABELS[k]}</span><b>{v}</b>
                        </div>
                        {/* Проста смуга: видно перекоси воронки без жодних графіків */}
                        <div style={{ height: '6px', borderRadius: '3px', background: 'var(--secondary-bg, rgba(127,127,127,0.12))' }}>
                            <div style={{ width: `${(v / maxCount) * 100}%`, height: '100%', borderRadius: '3px', background: DEAL_COLORS[k] }} />
                        </div>
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


/* ---------------- Вкладка «Кошик» ---------------- */
// Два рівні видалення — свідоме рішення:
//  • «У кошик» доступне менеджеру: помилковий клік не знищує контакт клієнта;
//  • ОСТАТОЧНЕ видалення — лише адміну, з подвійним підтвердженням, і лише
//    для того, що вже в кошику. Активну заявку знищити неможливо в принципі
//    (сервер ігнорує будь-який рядок, не позначений як «видалена»).
function TrashTab({ role }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [reloadKey, setReloadKey] = useState(0);
    const [busy, setBusy] = useState(false);
    const isAdmin = role === 'admin';

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await authFetch('/api/trash');
                const d = await res.json();
                if (alive) { setItems(d.orders || []); setSelected(new Set()); }
            } catch { /* 401 обробить authFetch */ }
            if (alive) setLoading(false);
        })();
        return () => { alive = false; };
    }, [reloadKey]);

    const reload = () => setReloadKey((k) => k + 1);

    const restore = async (row) => {
        setItems((p) => p.filter((o) => o.row !== row));
        try {
            const res = await authFetch('/api/order_restore', { method: 'POST', body: JSON.stringify({ row }) });
            if (!res.ok) throw new Error();
        } catch { reload(); alert('Не вдалося відновити.'); }
    };

    const toggle = (row) => setSelected((s) => {
        const n = new Set(s);
        if (n.has(row)) n.delete(row); else n.add(row);
        return n;
    });

    const purgeSelected = async () => {
        const rows = [...selected];
        if (!rows.length) return;
        if (!window.confirm(`ОСТАТОЧНО видалити ${rows.length} заявок?\n\nЦе НЕОБОРОТНО — дані зникнуть із таблиці назавжди.`)) return;
        if (!window.confirm('Точно? Відновити їх буде вже неможливо.')) return;
        setBusy(true);
        try {
            const res = await authFetch('/api/purge', { method: 'POST', body: JSON.stringify({ rows }) });
            const d = await res.json();
            alert(`Видалено назавжди: ${d.deleted || 0}`);
        } catch { alert('Не вдалося очистити.'); }
        setBusy(false);
        reload();
    };

    const purgeOld = async () => {
        if (!window.confirm('Остаточно видалити з кошика все, що старше за 30 днів?\n\nЦе НЕОБОРОТНО.')) return;
        setBusy(true);
        try {
            const res = await authFetch('/api/purge', { method: 'POST', body: JSON.stringify({ older_than_days: 30 }) });
            const d = await res.json();
            alert(`Видалено назавжди: ${d.deleted || 0}`);
        } catch { alert('Не вдалося очистити.'); }
        setBusy(false);
        reload();
    };

    if (loading) return <div style={{ ...skeleton, height: '90px' }} />;

    if (items.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '40px 0' }}>
                <Trash2 size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <div>Кошик порожній</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ ...card, background: 'rgba(255,149,0,0.08)', borderColor: 'rgba(255,149,0,0.35)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} color="#ff9500" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '13px', lineHeight: 1.45 }}>
                    Заявки тут <b>не втрачені</b> — їх можна повернути.
                    {isAdmin ? ' Остаточне видалення знищує рядок у таблиці назавжди.' : ' Остаточно видаляти може лише адміністратор.'}
                </div>
            </div>

            {isAdmin && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <button onClick={purgeSelected} disabled={!selected.size || busy}
                        style={{ ...btnSmall, background: selected.size ? '#ff3b30' : 'transparent', color: selected.size ? '#fff' : 'var(--hint-color)', border: 'none', opacity: busy ? 0.5 : 1 }}>
                        <Flame size={13} /> Видалити назавжди ({selected.size})
                    </button>
                    <button onClick={purgeOld} disabled={busy} style={{ ...btnSmall, opacity: busy ? 0.5 : 1 }}>
                        Очистити старші за 30 днів
                    </button>
                    <button
                        onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((o) => o.row)))}
                        style={btnSmall}
                    >
                        {selected.size === items.length ? 'Зняти виділення' : 'Виділити все'}
                    </button>
                </div>
            )}

            {items.map((o) => (
                <div key={o.row} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isAdmin && (
                        <input
                            type="checkbox"
                            checked={selected.has(o.row)}
                            onChange={() => toggle(o.row)}
                            style={{ width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                        />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{o.name || 'Без імені'}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--hint-color)' }}>
                            {o.phone} · {o.date}{o.manager_name ? ` · 👔 ${o.manager_name}` : ''}
                        </div>
                    </div>
                    <button onClick={() => restore(o.row)} style={btnSmall} title="Відновити">
                        <Undo2 size={13} /> Відновити
                    </button>
                </div>
            ))}
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
                        {isAdmin ? '👑 Адміністратор' : '👔 Менеджер'}{session.name ? ` · ${session.name}` : ''}
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
                <Tab active={tab === 'trash'} onClick={() => setTab('trash')}><Trash2 size={15} /> Кошик</Tab>
            </div>

            {tab === 'orders' && <OrdersTab role={session.role} />}
            {tab === 'team' && isAdmin && <AdminTab />}
            {tab === 'stats' && isAdmin && <StatsTab />}
            {tab === 'trash' && <TrashTab role={session.role} />}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }
            `}</style>
        </div>
    );
}

/* --- пресети стилів --- */
const card = { background: 'var(--card-bg, rgba(127,127,127,0.06))', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px', marginBottom: '10px' };
const badge = { color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 };
const btnSmall = { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' };
const btnIcon = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer', flexShrink: 0 };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--link-color, #0a84ff)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' };
const skeleton = { borderRadius: '14px', background: 'var(--secondary-bg, rgba(127,127,127,0.12))', animation: 'pulse 1.2s ease-in-out infinite' };

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
