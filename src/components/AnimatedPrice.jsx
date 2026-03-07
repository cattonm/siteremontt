import React, { useEffect, useState } from 'react';

export default function AnimatedPrice({ value }) {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let startTimestamp = null;
        const start = displayValue;
        const duration = 600; // тривалість анімації

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); 
            setDisplayValue(Math.floor(ease * (value - start) + start));

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(value);
            }
        };

        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
}