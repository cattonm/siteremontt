// src/hooks/useServerDraft.js
// Серверна чернетка (патч 07): раніше чернетка жила ЛИШЕ в localStorage
// телефона — зміна пристрою або чистка кешу, і робота зникала. Тепер вона
// дублюється на сервер: можна продовжити з іншого пристрою, а бот нагадає
// про незавершену заявку через 24 год.
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { tg } from '../utils/telegram';
import { getSession } from '../utils/auth';
import { getDraft, saveDraft } from '../utils/api';

export default function useServerDraft(client, answers, rooms, currentStep, session) {
    // Чернетка, знайдена на сервері (інший пристрій) — показуємо банер
    // «Продовжити?», а не мовчки підміняємо стан.
    const [serverDraft, setServerDraft] = useState(null);

    // Підтягування при старті: лише якщо ми НЕ в режимі редагування заявки
    // (?edit_id) і локальної чернетки ще нема (новий пристрій, чистий кеш,
    // перевстановлений Telegram).
    useEffect(() => {
        const editId = new URLSearchParams(window.location.search).get('edit_id');
        if (editId) return;
        if (!(useStore.getState().currentStep <= -1 && (tg?.initData || getSession()))) return;
        getDraft()
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                const draft = d?.draft;
                if (!draft?.payload) return;
                // Не перетираємо роботу, яку користувач уже почав у цій сесії.
                if (useStore.getState().currentStep > -1) return;
                setServerDraft(draft);
            })
            .catch(() => {});
    }, []); // one-shot на старті

    // Автозбереження: дебаунс 3с (довший за live-calc: тут ходимо в Google
    // Sheets, не варто смикати на кожен клік). Режим редагування не чіпаємо —
    // там уже є заявка.
    useEffect(() => {
        // Джерело правди про «ми в режимі редагування» — URL АБО збережений
        // editingOrderId. Раніше дивились лише в URL: якщо менеджер відкривав
        // застосунок заново (вже без ?edit_id), вміст ЧУЖОЇ збереженої заявки
        // їхав на сервер як його «незавершена чернетка» — і бот ще й нагадував
        // про неї через добу.
        const editId = new URLSearchParams(window.location.search).get('edit_id')
            || useStore.getState().editingOrderId;
        if (editId || currentStep < 0) return undefined;
        if (!tg?.initData && !session) return undefined;   // гість чернетки на сервері не має
        if (!client.name && !client.area && rooms.length === 0) return undefined; // порожню не шлемо

        const ctrl = new AbortController();
        const t = setTimeout(() => {
            saveDraft({ currentStep, client, answers: { ...answers, rooms } }, ctrl.signal)
                .catch(() => {}); // мовчазний фейл: локальна чернетка все одно лишається
        }, 3000);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [client, answers, rooms, currentStep, session]);

    return [serverDraft, setServerDraft];
}
