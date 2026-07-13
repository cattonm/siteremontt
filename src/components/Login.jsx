// src/components/Login.jsx
// ВХІД ДЛЯ МЕНЕДЖЕРІВ ПРЯМО НА САЙТІ — без паролів.
//
// Використовуємо офіційний Telegram Login Widget: людина тисне кнопку,
// Telegram повертає її дані, ПІДПИСАНІ ключем бота. Бекенд перевіряє підпис
// тим самим алгоритмом, що й initData міні-апки, і видає сесійний токен.
//
// Чому не логін+пароль: паролі довелося б десь зберігати (у нас це була б
// Google-таблиця), робити відновлення, захист від перебору. Тут особу
// підтверджує Telegram, а підробити підпис без токена бота неможливо.
//
// ВАЖЛИВО (одноразове налаштування): у @BotFather виконати /setdomain
// і вказати домен сайту — інакше віджет не з'явиться.
import { useEffect, useRef, useState } from 'react';
import { BACKEND_URL, setSession } from '../utils/auth';
import { ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';

const BOT_USERNAME = 'remontnikuav_bot';   // без @

export default function Login({ onSuccess, onBack }) {
    const holder = useRef(null);
    const [error, setError] = useState('');
    const [invite, setInvite] = useState('');
    const [pending, setPending] = useState(null);   // дані Telegram, що чекають код

    // Глобальний колбек для віджета + вставка скрипта Telegram
    useEffect(() => {
        window.onTelegramAuth = async (user) => {
            setError('');
            try {
                const res = await fetch(`${BACKEND_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user),
                });
                const data = await res.json();
                if (res.ok) {
                    setSession(data);
                    onSuccess(data);
                    return;
                }
                if (data.error === 'no_access') {
                    // Особу підтверджено, але доступу ще немає — просимо інвайт-код,
                    // щоб не викидати людину «в нікуди».
                    setPending(user);
                    return;
                }
                setError(data.message || 'Не вдалося увійти. Спробуйте ще раз.');
            } catch {
                setError('Сервер недоступний. Спробуйте за хвилину.');
            }
        };

        const s = document.createElement('script');
        s.src = 'https://telegram.org/js/telegram-widget.js?22';
        s.async = true;
        s.setAttribute('data-telegram-login', BOT_USERNAME);
        s.setAttribute('data-size', 'large');
        s.setAttribute('data-radius', '12');
        s.setAttribute('data-userpic', 'false');
        s.setAttribute('data-onauth', 'onTelegramAuth(user)');
        holder.current?.appendChild(s);
        return () => { delete window.onTelegramAuth; };
    }, [onSuccess]);

    const activate = async () => {
        setError('');
        const res = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...pending, invite: invite.trim().toUpperCase() }),
        });
        const data = await res.json();
        if (res.ok) { setSession(data); onSuccess(data); return; }
        setError(data.message || 'Код не підійшов.');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
            <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', width: '58px', height: '58px', borderRadius: '16px', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary-bg, rgba(127,127,127,0.1))', color: 'var(--link-color, #0a84ff)', marginBottom: '16px' }}>
                    <ShieldCheck size={28} />
                </div>
                <h1 style={{ fontSize: '23px', fontWeight: 800, margin: '0 0 8px' }}>Кабінет менеджера</h1>
                <p style={{ color: 'var(--hint-color)', fontSize: '14.5px', lineHeight: 1.45, margin: '0 0 26px' }}>
                    {pending
                        ? 'Вітаємо! Введіть код доступу, який надав адміністратор.'
                        : 'Вхід через Telegram — без паролів. Ваш акаунт підтверджує сам Telegram.'}
                </p>

                {!pending && <div ref={holder} style={{ display: 'flex', justifyContent: 'center', minHeight: '48px' }} />}

                {pending && (
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Код доступу</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                value={invite}
                                onChange={(e) => setInvite(e.target.value.toUpperCase())}
                                placeholder="XXXXXXXX"
                                maxLength={8}
                                style={{ flex: 1, letterSpacing: '2px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                            />
                            <button
                                onClick={activate}
                                disabled={invite.trim().length !== 8}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, background: 'var(--link-color, #0a84ff)', color: '#fff', opacity: invite.trim().length === 8 ? 1 : 0.5 }}
                            >
                                <KeyRound size={16} /> Увійти
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: '16px', color: '#ff3b30', fontSize: '13.5px', fontWeight: 600 }}>{error}</div>
                )}

                <button
                    onClick={onBack}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '28px', background: 'none', border: 'none', color: 'var(--hint-color)', fontSize: '14px', cursor: 'pointer' }}
                >
                    <ArrowLeft size={15} /> До калькулятора
                </button>
            </div>
        </div>
    );
}
