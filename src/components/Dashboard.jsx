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
    Trash2, Calculator, ExternalLink, ChevronDown, ChevronUp, Phone,
    Undo2, Flame, AlertTriangle, Tags, Save,
} from 'lucide-react';

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
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
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
    }, [q, offset, reloadKey]);

    const refresh = () => { setOffset(0); setReloadKey((k) => k + 1); };

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

            <div style={{ fontSize: '13px', color: 'var(--hint-color)', marginBottom: '14px' }}>
                Заявок: <b style={{ color: 'var(--text-color)' }}>{total}</b>
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
                                    {/* Префікс розрізняє походження заявки: 👔 створив менеджер, 🌐 прийшла з сайту */}
                                    <span title={o.source === 'web' ? 'Заявка з сайту' : 'Створена менеджером'}>
                                        {o.source === 'web' ? '🌐' : '👔'}
                                    </span>
                                    {o.name || 'Без імені'}
                                    {isOpen ? <ChevronUp size={14} color="var(--hint-color)" /> : <ChevronDown size={14} color="var(--hint-color)" />}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--hint-color)', marginTop: '2px' }}>{o.date}</div>
                                <div style={{ fontSize: '12.5px', color: 'var(--hint-color)', marginTop: '2px' }}>{o.address}</div>
                                {o.manager_name && (
                                    <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '3px' }}>👔 {o.manager_name}</div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
                            {/* Телефон — головна дія менеджера: один тап і дзвінок */}
                            {o.phone && (
                                <a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`} style={{ ...btnSmall, textDecoration: 'none', fontWeight: 700 }}>
                                    <Phone size={13} /> {o.phone}
                                </a>
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

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <Stat label="Усього заявок" value={s.total} />
                <Stat label="З сайту" value={s.web_leads} />
            </div>

            <div style={card}>
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
/* ---------------- Вкладка «Прайс» (адмін) ---------------- */
// Раніше ціни правились у Google-таблиці: будь-хто з доступом міг зсунути
// колонку або вписати текст замість числа, і кошторис тихо ламався. Тепер
// прайс живе в БД, а тут — єдине місце, де його можна змінити: з перевіркою
// чисел, з підписом хто і коли правив.
function PricesTab() {
    const [rows, setRows] = useState([]);
    const [edits, setEdits] = useState({});   // key -> { work, mat_min, mat_max } як рядки
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [readOnly, setReadOnly] = useState('');
    const [savedAt, setSavedAt] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await authFetch('/api/admin/prices');
                const d = await res.json();
                if (!alive) return;
                if (res.status === 409) { setReadOnly(d.message || 'Редагування недоступне'); return; }
                if (!res.ok) { setError('Не вдалося завантажити прайс. Спробуйте оновити сторінку.'); return; }
                setRows(d.prices || []);
            } catch {
                if (alive) setError('Немає звʼязку з сервером.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const setField = (key, field, value) => {
        setSavedAt('');
        setEdits((e) => {
            const row = rows.find((r) => r.key === key);
            const cur = e[key] || { work: String(row.work), mat_min: String(row.mat_min), mat_max: String(row.mat_max) };
            return { ...e, [key]: { ...cur, [field]: value } };
        });
    };

    // Змінені — це ті, де значення реально відрізняється від збереженого,
    // а не просто ті, у чиє поле хтось клацнув.
    const changed = rows.filter((r) => {
        const e = edits[r.key];
        if (!e) return false;
        return Number(e.work) !== r.work || Number(e.mat_min) !== r.mat_min || Number(e.mat_max) !== r.mat_max;
    });

    const badRows = changed.filter((r) => {
        const e = edits[r.key];
        const nums = [e.work, e.mat_min, e.mat_max].map(Number);
        return nums.some((n) => !Number.isFinite(n) || n < 0);
    });

    const save = async () => {
        if (!changed.length || badRows.length) return;
        setSaving(true); setError('');
        const items = changed.map((r) => {
            const e = edits[r.key];
            return {
                key: r.key, label: r.label, unit: r.unit,
                work: Number(e.work), mat_min: Number(e.mat_min), mat_max: Number(e.mat_max),
            };
        });
        try {
            const res = await authFetch('/api/admin/prices/save', {
                method: 'POST', body: JSON.stringify({ items }),
            });
            const d = await res.json();
            if (!res.ok) {
                setError(d.message || 'Зберегти не вдалося. Перевірте числа і спробуйте ще раз.');
                return;
            }
            // Оновлюємо локально, щоб не смикати сервер удруге.
            const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
            setRows((rs) => rs.map((r) => (byKey[r.key]
                ? { ...r, ...byKey[r.key], saved: true, updated_at: 'щойно', updated_by: 'ви' }
                : r)));
            setEdits({});
            setSavedAt(`Збережено ${d.saved} ${d.saved === 1 ? 'позицію' : 'позиції'}`);
        } catch {
            setError('Немає звʼязку з сервером. Зміни не збережені.');
        } finally {
            setSaving(false);
        }
    };

    if (readOnly) {
        return (
            <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Прайс лише для перегляду</div>
                <div style={{ fontSize: '13px', color: 'var(--hint-color)', lineHeight: 1.5 }}>{readOnly}</div>
            </div>
        );
    }
    if (loading) {
        return <div>{[0, 1, 2, 3].map((i) => <div key={i} style={{ ...skeleton, height: '76px', marginBottom: '10px' }} />)}</div>;
    }

    const needle = q.trim().toLowerCase();
    const visible = needle
        ? rows.filter((r) => (r.label || '').toLowerCase().includes(needle) || r.key.toLowerCase().includes(needle))
        : rows;

    return (
        <div style={{ paddingBottom: changed.length ? '72px' : 0 }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hint-color)' }} />
                <input
                    value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="Знайти позицію"
                    style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: '10px', boxSizing: 'border-box',
                             border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', fontSize: '14px' }}
                />
            </div>

            {error && (
                <div style={{ ...card, borderColor: '#e5484d', color: '#e5484d', fontSize: '13px' }}>
                    <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{error}
                </div>
            )}
            {savedAt && !changed.length && (
                <div style={{ ...card, fontSize: '13px', color: '#2f9e44' }}>
                    <Check size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{savedAt}
                </div>
            )}

            {!visible.length && (
                <div style={{ ...card, textAlign: 'center', color: 'var(--hint-color)', fontSize: '13.5px' }}>
                    За запитом «{q}» нічого немає. Спробуйте коротший запит.
                </div>
            )}

            {visible.map((r) => {
                const e = edits[r.key];
                const val = (f) => (e ? e[f] : String(r[f]));
                const isChanged = changed.some((c) => c.key === r.key);
                const nums = [val('work'), val('mat_min'), val('mat_max')].map(Number);
                const bad = nums.some((n) => !Number.isFinite(n) || n < 0);
                const swapped = !bad && nums[2] < nums[1];

                return (
                    <div key={r.key} style={{ ...card, borderColor: isChanged ? 'var(--link-color, #0a84ff)' : 'var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                {r.label || r.key}
                                {r.unit && <span style={{ color: 'var(--hint-color)', fontWeight: 400 }}> · {r.unit}</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--hint-color)', whiteSpace: 'nowrap' }}>
                                {r.updated_at ? `${r.updated_at}${r.updated_by ? ` · ${r.updated_by}` : ''}` : 'з коду'}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <NumField label="Робота" value={val('work')} onChange={(v) => setField(r.key, 'work', v)} />
                            <NumField label="Матеріал від" value={val('mat_min')} onChange={(v) => setField(r.key, 'mat_min', v)} />
                            <NumField label="до" value={val('mat_max')} onChange={(v) => setField(r.key, 'mat_max', v)} />
                        </div>

                        {bad && <div style={{ fontSize: '12px', color: '#e5484d', marginTop: '6px' }}>Введіть число не менше нуля</div>}
                        {swapped && <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '6px' }}>Верхня межа менша за нижню — при збереженні поміняються місцями</div>}
                    </div>
                );
            })}

            {changed.length > 0 && (
                <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px',
                              background: 'var(--bg-color, #fff)', borderTop: '1px solid var(--border-color)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--hint-color)' }}>
                        Змінено позицій: {changed.length}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEdits({}); setError(''); }} style={btnSmall}>Скасувати</button>
                        <button onClick={save} disabled={saving || badRows.length > 0}
                                style={{ ...btnPrimary, opacity: saving || badRows.length ? 0.5 : 1 }}>
                            <Save size={15} /> {saving ? 'Зберігаю…' : 'Зберегти'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function NumField({ label, value, onChange }) {
    return (
        <label style={{ display: 'block' }}>
            <div style={{ fontSize: '11px', color: 'var(--hint-color)', marginBottom: '3px' }}>{label}</div>
            <input
                type="number" inputMode="decimal" step="any" min="0"
                value={value} onChange={(e) => onChange(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px',
                         border: '1px solid var(--border-color)', background: 'transparent',
                         color: 'var(--text-color)', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}
            />
        </label>
    );
}

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
                {isAdmin && <Tab active={tab === 'prices'} onClick={() => setTab('prices')}><Tags size={15} /> Прайс</Tab>}
                {isAdmin && <Tab active={tab === 'stats'} onClick={() => setTab('stats')}><BarChart3 size={15} /> Статистика</Tab>}
                <Tab active={tab === 'trash'} onClick={() => setTab('trash')}><Trash2 size={15} /> Кошик</Tab>
            </div>

            {tab === 'orders' && <OrdersTab role={session.role} />}
            {tab === 'team' && isAdmin && <AdminTab />}
            {tab === 'prices' && isAdmin && <PricesTab />}
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
const btnSmall = { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' };
const btnIcon = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer', flexShrink: 0 };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--link-color, #0a84ff)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' };
const skeleton = { borderRadius: '14px', background: 'var(--secondary-bg, rgba(127,127,127,0.12))', animation: 'pulse 1.2s ease-in-out infinite' };

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