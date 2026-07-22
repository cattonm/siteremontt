// src/utils/shareLink.js
// Шер кошторису посиланням (патч 10.3) — БЕЗ бекенду. Спека пропонує
// POST /share на remontnikuav (окремий репозиторій, доступу до нього
// немає), тож знімок кошторису кодується прямо в URL-хеші: нічого не
// зберігається на сервері, посилання самодостатнє. Плата за це — без
// TTL і без лічильника переглядів (те й те потребує сервера), зате
// працює просто зараз, без зовнішніх залежностей.
const PREFIX = '#s=';

export function buildShareUrl(snapshot) {
    const json = JSON.stringify(snapshot);
    const encoded = encodeURIComponent(json);
    return `${window.location.origin}${window.location.pathname}${PREFIX}${encoded}`;
}

export function readShareSnapshot() {
    const hash = window.location.hash;
    if (!hash.startsWith(PREFIX)) return null;
    try {
        return JSON.parse(decodeURIComponent(hash.slice(PREFIX.length)));
    } catch {
        return null;
    }
}
