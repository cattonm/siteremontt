import { useEffect, useRef, useState } from 'react';

// Анімований лічильник ціни.
// Було два дефекти:
//  1) rAF-цикл НЕ скасовувався при зміні value — під час швидких оновлень
//     live-calc паралельно жили кілька циклів і "билися" за setState
//     (цифри смикались туди-сюди);
//  2) старт анімації читався зі state у замиканні ефекту без залежності —
//     попередження exhaustive-deps і застарілий старт.
// Тепер: поточне відображуване значення живе в ref, кожен новий value
// скасовує попередній цикл через cancelAnimationFrame у cleanup.
export default function AnimatedPrice({ value }) {
    const [displayValue, setDisplayValue] = useState(value);
    const shownRef = useRef(value);   // актуальна відображувана цифра
    const rafRef = useRef(0);

    useEffect(() => {
        const start = shownRef.current;
        if (start === value) return;

        let startTimestamp = null;
        const duration = 600;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const next = progress < 1 ? Math.floor(ease * (value - start) + start) : value;
            shownRef.current = next;
            setDisplayValue(next);
            if (progress < 1) rafRef.current = window.requestAnimationFrame(step);
        };

        rafRef.current = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(rafRef.current);
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
}
