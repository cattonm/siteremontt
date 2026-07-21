// src/components/Login.jsx
// ВХІД ДЛЯ МЕНЕДЖЕРІВ — через самого бота. Без паролів і без Login Widget.
//
// ЧОМУ ВІДМОВИЛИСЬ ВІД TELEGRAM LOGIN WIDGET:
//   • вимагає /setdomain у BotFather і точного username бота;
//   • змушує вводити номер телефону на сторонній сторінці oauth.telegram.org;
//   • ця сторінка — окремий сервіс Telegram, який може віддати «Server error»,
//     і ми на це ніяк не впливаємо (саме це й сталося);
//   • взагалі не працює всередині міні-апки.
//
// ЯК ПРАЦЮЄ ЗАРАЗ:
//   1. Сайт бере в бекенда одноразовий код і посилання на бота.
//   2. Людина тисне кнопку → відкривається бот → одне натискання «Start».
//   3. Бот бачить свій код і знає user_id (його гарантує Telegram) — прив'язує.
//   4. Сайт опитує статус і сам впускає. Вводити не треба нічого.
//
// Безпека та сама: особу підтверджує Telegram, код одноразовий і живе 5 хвилин;
// роль перевіряється на сервері при кожному запиті.
import { useEffect, useState, useCallback } from 'react';
import { BACKEND_URL, setSession } from '../utils/auth';
import { ShieldCheck, ArrowLeft, ExternalLink, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { tg } from '../utils/telegram';

export default function Login({ onSuccess, onBack }) {
    const [link, setLink] = useState(null);
    const [code, setCode] = useState(null);
    const [status, setStatus] = useState('init');   // init | waiting | expired | no_access | error
    const [seconds, setSeconds] = useState(0);
    const [copied, setCopied] = useState(false);

    const start = useCallback(async () => {
        setStatus('init');
        setCopied(false);
        try {
            const res = await fetch(`${BACKEND_URL}/api/login_start`, { method: 'POST' });
            if (!res.ok) throw new Error('bad');
            const d = await res.json();
            setLink(d.deep_link);
            setCode(d.code);
            setSeconds(d.ttl || 300);
            setStatus('waiting');
        } catch {
            setStatus('error');
        }
    }, []);

    useEffect(() => { start(); }, [start]);

    // Опитуємо бекенд, поки людина підтверджує вхід у боті
    useEffect(() => {
        if (status !== 'waiting' || !code) return;
        const t = setInterval(async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/login_poll?code=${code}`);
                const d = await res.json();
                if (d.status === 'ok') {
                    clearInterval(t);
                    setSession(d);
                    onSuccess(d);
                } else if (d.status === 'expired' || d.status === 'no_access') {
                    clearInterval(t);
                    setStatus(d.status);
                }
            } catch { /* мережа моргнула — спробуємо на наступному тику */ }
        }, 2000);
        return () => clearInterval(t);
    }, [status, code, onSuccess]);

    // Зворотний відлік життя коду
    useEffect(() => {
        if (status !== 'waiting') return;
        const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [status]);

    const openBot = () => {
        // Усередині Telegram відкриваємо нативно, у браузері — новою вкладкою
        if (tg?.openTelegramLink) tg.openTelegramLink(link);
        else window.open(link, '_blank', 'noopener');
    };

    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, '0');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
            <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', width: '58px', height: '58px', borderRadius: '16px', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary-bg, rgba(127,127,127,0.1))', color: 'var(--link-color)', marginBottom: '16px' }}>
                    <ShieldCheck size={28} aria-hidden="true" />
                </div>
                <h1 style={{ fontSize: '23px', fontWeight: 800, margin: '0 0 8px' }}>Кабінет менеджера</h1>
                <p style={{ color: 'var(--hint-color)', fontSize: '14.5px', lineHeight: 1.45, margin: '0 0 24px' }}>
                    Вхід через Telegram — без паролів і без номера телефону.
                    Один тап у боті, і кабінет відкриється сам.
                </p>

                {status === 'init' && (
                    <div style={{ color: 'var(--hint-color)', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Готуємо вхід…
                    </div>
                )}

                {status === 'waiting' && (
                    <>
                        <button type="button" onClick={openBot} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--link-color)', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
                            <ExternalLink size={18} aria-hidden="true" /> Підтвердити в Telegram
                        </button>

                        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--hint-color)', fontSize: '13.5px' }}>
                            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                            Чекаємо підтвердження… {mm}:{ss}
                        </div>

                        {/* Запасний шлях — якщо кнопка не відкрила бота (десктоп,
                            блокувальник спливаючих вікон тощо) */}
                        <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'var(--secondary-bg, rgba(127,127,127,0.08))', fontSize: '12.5px', color: 'var(--hint-color)', lineHeight: 1.5 }}>
                            Не відкрилось? Надішліть боту команду:
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                <code style={{ flex: 1, fontWeight: 700, fontSize: '14px', color: 'var(--text-color)' }}>/start web_{code}</code>
                                <button
                                    type="button"
                                    aria-label="Скопіювати команду"
                                    onClick={() => { navigator.clipboard?.writeText(`/start web_${code}`); setCopied(true); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: copied ? 'var(--money)' : 'var(--text-color)', cursor: 'pointer' }}
                                >
                                    {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {(status === 'expired' || status === 'error') && (
                    <>
                        <div style={{ color: '#ff3b30', fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>
                            {status === 'expired' ? 'Час на підтвердження вичерпано.' : 'Сервер недоступний.'}
                        </div>
                        <button type="button" onClick={start} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={16} aria-hidden="true" /> Спробувати ще раз
                        </button>
                    </>
                )}

                {status === 'no_access' && (
                    <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--hint-color)' }}>
                        <b style={{ color: 'var(--text-color)' }}>Доступу поки немає.</b><br />
                        Надішліть боту код доступу від адміністратора, потім
                        <button type="button" onClick={start} style={{ background: 'none', border: 'none', color: 'var(--link-color)', fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}>
                            повторіть вхід
                        </button>
                    </div>
                )}

                <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '28px', background: 'none', border: 'none', color: 'var(--hint-color)', fontSize: '14px', cursor: 'pointer' }}>
                    <ArrowLeft size={15} aria-hidden="true" /> До калькулятора
                </button>

                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
