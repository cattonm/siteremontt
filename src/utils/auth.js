// src/utils/auth.js
// Сесія веб-кабінету. Логіка навмисно проста:
//  • токен видає бекенд після перевірки підпису Telegram Login Widget;
//  • ми його просто зберігаємо і додаємо в заголовок X-Session-Token;
//  • роль ПЕРЕВІРЯЄТЬСЯ НА СЕРВЕРІ при кожному запиті (у токені вона лише
//    для UI) — тож підміна ролі в localStorage нічого не дає.
// Паролів немає ніде: особу підтверджує Telegram своїм підписом.
export const BACKEND_URL = "https://remontnikuav.onrender.com";

const KEY = 'remont_session';

export function getSession() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setSession(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
    localStorage.removeItem(KEY);
}

/** fetch, який сам підставляє сесійний токен і вилітає на вхід при 401. */
export async function authFetch(path, options = {}) {
    const s = getSession();
    // Усередині міні-апки сесії немає — там особу підтверджує initData.
    // Бекенд (auth_request) розуміє обидва заголовки, тож кабінет однаково
    // працює і в браузері після входу, і прямо в Telegram без нього.
    const initData = window.Telegram?.WebApp?.initData || '';
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(s?.token ? { 'X-Session-Token': s.token } : {}),
            ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
            ...(options.headers || {}),
        },
    });
    if (res.status === 401) {
        clearSession();          // сесія протухла або доступ відкликано
        window.location.reload();
        throw new Error('unauthorized');
    }
    return res;
}
