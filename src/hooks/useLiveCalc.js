// src/hooks/useLiveCalc.js
// Живий розрахунок кошторису (патч 07): дебаунс 500мс + AbortController,
// щоб повільна стара відповідь (напр., холодний старт Render) не
// перезаписала кошик застарілими сумами після швидшої нової.
import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { liveCalc } from '../utils/api';

export default function useLiveCalc(client, answers, rooms, currentStep) {
    const [totals, setTotals] = useState({ work: 0, mat_min: 0 });

    useEffect(() => {
        if (currentStep < 0 && currentStep !== 9999) return undefined;
        const ctrl = new AbortController();
        const delay = setTimeout(async () => {
            if (!navigator.onLine || !client.area) return;
            try {
                // АДАПТЕР: Формуємо єдиний об'єкт для сервера
                const payloadAnswers = { ...answers, rooms };
                const res = await liveCalc({ client, answers: payloadAnswers }, ctrl.signal);
                if (res.ok) {
                    const data = await res.json();
                    setTotals({ work: data.work, mat_min: data.mat_min });
                    // Розбивка по приміщеннях + «загальні роботи» — для чипа
                    // ціни в візуалізаторі та секції приміщень у підсумку.
                    // Старий бекенд цих полів не має — тоді просто порожньо.
                    useStore.getState().setLiveBreakdown({
                        rooms: data.rooms || {},
                        general: data.general || null,
                        roomLines: data.room_lines || {},
                        generalLines: data.general_lines || [],
                    });
                }
            } catch (e) { if (e.name !== 'AbortError') console.log('Calc error', e); }
        }, 500);
        return () => { clearTimeout(delay); ctrl.abort(); };
    }, [client, answers, rooms, currentStep]);

    return [totals, setTotals];
}
