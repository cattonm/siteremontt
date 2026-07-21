// src/hooks/useCanvasVisible.js
// 3D-аудит п.8.1: коли у візуалізаторі відкрита кімната, на сторінці ДВА
// живих канваси (план + прев'ю) — подвійна GPU-пам'ять і компіляція
// шейдерів, на слабких Android ризик втрати контексту. IntersectionObserver
// стежить, чи обгортка канваса взагалі у в'юпорті: поза ним — frameloop
// вимикається ("never"), у в'юпорті — повертається. Сам канвас НЕ
// розмонтовується (інакше втратили б стан камери й словили перекомпіляцію).
import { useState, useRef, useEffect } from 'react';

export default function useCanvasVisible() {
    const wrapperRef = useRef(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return [wrapperRef, visible];
}
