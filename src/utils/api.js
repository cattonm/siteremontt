// src/utils/api.js
// Мережевий шар App.jsx (патч 07 — рефакторинг): усі fetch-виклики до
// бекенду в одному місці. BACKEND_URL — з auth.js (там він уже був для
// Login/Dashboard, тому не дублюємо константу вдруге).
import { BACKEND_URL, getSession } from './auth';
import { tg } from './telegram';

export { BACKEND_URL };

// Єдина точка показу алертів. У Telegram беремо нативний showAlert (обов'язково
// прив'язаний до tg — відв'язаний метод втрачає this), у браузері (гість) —
// звичайний window.alert.
export const showAlert = (msg) => (tg?.showAlert ? tg.showAlert.bind(tg) : window.alert)(msg);

// Заголовки з підтвердженням особи (без Content-Type — для GET, де його
// раніше не було: зайвий Content-Type на крос-origin GET це preflight,
// якого могло не бути).
const initDataHeaders = () => ({
    'X-Telegram-Init-Data': tg?.initData || '',
    ...(getSession()?.token ? { 'X-Session-Token': getSession().token } : {}),
});

// Заголовки авторизації: міні-апка йде з initData, веб-кабінет — із сесійним
// токеном. Сервер розуміє обидва (auth_request) — тому фронтенд просто шле те,
// що має.
export const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...initDataHeaders(),
});

// Прогрів бекенду: free-план Render засинає, перший live_calc міг чекати
// холодний старт ~30-50 с.
export const ping = () => fetch(`${BACKEND_URL}/ping`, { mode: 'no-cors' });

export const me = () => fetch(`${BACKEND_URL}/api/me`, { headers: initDataHeaders() });

export const getOrder = (editId) =>
    fetch(`${BACKEND_URL}/api/get_order?edit_id=${editId}`, { headers: initDataHeaders() });

export const getDraft = () => fetch(`${BACKEND_URL}/api/get_draft`, { headers: authHeaders() });

export const saveDraft = (body, signal) => fetch(`${BACKEND_URL}/api/save_draft`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal,
});

// Консолідовано з двох викликів в App.jsx (один із них не ніс
// X-Session-Token — вочевидь недогляд, а не свідома різниця в поведінці).
export const deleteDraft = () => fetch(`${BACKEND_URL}/api/delete_draft`, {
    method: 'POST',
    headers: authHeaders(),
});

export const saveOrder = (data) => fetch(`${BACKEND_URL}/api/save_order`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
});

export const createOrder = (data) => fetch(`${BACKEND_URL}/api/create_order`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
});

// Публічний ендпоінт — рахує кошторис і гостю без жодної авторизації.
export const liveCalc = (body, signal) => fetch(`${BACKEND_URL}/api/live_calc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
});

// Публічний лід гостя — теж без авторизації.
export const submitLead = (data) => fetch(`${BACKEND_URL}/api/submit_lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
});
