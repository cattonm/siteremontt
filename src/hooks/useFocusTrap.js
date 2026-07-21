// src/hooks/useFocusTrap.js
// Фокус-пастка для модалок (аудит п.9.2): при відкритті — фокус на перший
// інтерактивний елемент, Tab/Shift+Tab циклічно тримає фокус усередині,
// Escape закриває (якщо передано onClose), при закритті фокус повертається
// туди, звідки модалку відкрили.
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(active, onClose) {
    const ref = useRef(null);
    const prevFocus = useRef(null);

    useEffect(() => {
        if (!active) return undefined;
        prevFocus.current = document.activeElement;
        const el = ref.current;
        const focusables = () => (el ? Array.from(el.querySelectorAll(FOCUSABLE)).filter((f) => !f.disabled) : []);
        focusables()[0]?.focus();

        const onKeyDown = (e) => {
            if (e.key === 'Escape') { onClose?.(); return; }
            if (e.key !== 'Tab') return;
            const items = focusables();
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            prevFocus.current?.focus?.();
        };
    }, [active, onClose]);

    return ref;
}
