import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import useStore from '../store/useStore';
import { vibe, vibeSelect } from '../utils/telegram';

// a11y (аудит п.9.1): активація по Enter/Space для елементів, які з причин
// валідності HTML лишились <div role="..."> замість <button> (містять
// вкладені інтерактивні діти — zoom-icon, tier-кнопки; кнопка в кнопці
// неприпустима).
const onActivateKey = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};

function TierButtons({ value, onSelect, variants }) {
    return (
        <div className="tier-container" role="radiogroup" aria-label="Рівень матеріалів">
            {(variants || ['Standard', 'Comfort', 'Premium']).map(v => {
                let btnText = v; if (v === 'Standard') btnText = 'S'; if (v === 'Comfort') btnText = 'C'; if (v === 'Premium') btnText = 'P';
                const active = value === v;
                return (
                    <button
                        key={v} type="button"
                        className={`tier-btn ${active ? 'active' : ''}`}
                        role="radio" aria-checked={active} aria-label={`Рівень: ${v}`}
                        onClick={(e) => { e.stopPropagation(); vibeSelect(); onSelect(v); }}
                    >
                        {btnText}
                    </button>
                );
            })}
        </div>
    );
}

export default function Survey({ question, answers, setAnswers, client, openImage, compact = false }) {
    const qId = question?.id;
    // Кімнати зі стору — для питань, що будують опції з реальних приміщень
    // (тепла підлога). Хук ЗАВЖДИ викликається до раннього return.
    const storeRooms = useStore((s) => s.rooms);

    // --- АВТОЗАПОВНЕННЯ (наприклад, площа стяжки) ---
    // ВАЖЛИВО: хук стоїть ДО раннього return (правило хуків React —
    // однаковий порядок викликів на кожному рендері, інакше при зміні
    // question → null ловимо "Rendered fewer hooks than expected").
    // Читаємо/пишемо через функціональний setAnswers(prev) — тому в
    // залежностях лише стабільні значення, без val.
    useEffect(() => {
        if (qId !== 'screed_area') return;
        setAnswers(prev => (prev.screed_area === undefined
            ? { ...prev, screed_area: parseFloat(client?.area) || '' }
            : prev));
    }, [qId, setAnswers, client?.area]);

    if (!question) return null;

    // Поточне значення для цього питання
    const val = answers[question.id];

    // Базовий обробник для збереження
    const setAnswer = (newVal) => setAnswers(prev => ({ ...prev, [question.id]: newVal }));

    // --- РЕНДЕРИ РІЗНИХ ТИПІВ ПИТАНЬ ---

    if (question.type === 'cards') {
        if (compact) {
            return (
                <div className="compact-question">
                    <div className="compact-label" id={`q-${question.id}-label`}>{question.text}</div>
                    <div className="pill-row" role="radiogroup" aria-labelledby={`q-${question.id}-label`}>
                        {question.options.map(opt => {
                            const selected = val === opt.val;
                            return (
                                <button
                                    key={opt.val} type="button"
                                    className={`btn-reset pill ${selected ? 'selected' : ''}`}
                                    role="radio" aria-checked={selected}
                                    onClick={() => { vibe(); setAnswer(opt.val); }}
                                >
                                    <span className="pill-radio" aria-hidden="true" />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3 id={`q-${question.id}-label`}>{question.text}</h3>
                {/* role="radio" на div, не button: картка містить вкладену
                    інтерактивну кнопку zoom-icon — button у button неприпустимий. */}
                <div className="card-grid" role="radiogroup" aria-labelledby={`q-${question.id}-label`}>
                    {question.options.map(opt => {
                        const selected = val === opt.val;
                        const activate = () => { vibe(); setAnswer(opt.val); };
                        return (
                            <div
                                key={opt.val} className={`btn-reset card ${selected ? 'selected' : ''}`}
                                role="radio" aria-checked={selected} tabIndex={0}
                                onClick={activate} onKeyDown={onActivateKey(activate)}
                            >
                                {opt.img && (
                                    <div className="img-wrapper">
                                        <img src={opt.img} alt={opt.label} loading="lazy" decoding="async" onError={(e) => e.target.parentElement.style.display = 'none'} />
                                        <button
                                            type="button" className="zoom-icon" aria-label={`Збільшити фото: ${opt.label}`}
                                            onClick={(e) => { e.stopPropagation(); if (openImage) openImage(opt.img); }}
                                        >🔍</button>
                                    </div>
                                )}
                                <div className="card-label">{opt.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === 'input_number') {
        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3 id={`q-${question.id}-label`}>{question.text}</h3>
                <input
                    aria-labelledby={`q-${question.id}-label`}
                    type="number"
                    inputMode="decimal"
                    placeholder={question.placeholder}
                    value={val !== undefined ? val : ''}
                    onChange={(e) => {
                        let parsed = parseFloat(e.target.value);
                        setAnswer(isNaN(parsed) ? undefined : parsed);
                    }}
                />
            </div>
        );
    }

    if (question.type === 'cards_multiselect') {
        const currentArr = Array.isArray(val) ? val : [];
        const handleSelect = (optVal) => {
            vibe();
            // «Ні» / «Не...» / «Без змін» — взаємовиключні з рештою опцій
            const isNi = (v) => v.toLowerCase() === "ні" || v.startsWith("Не") || v === "Без змін";
            if (isNi(optVal)) { setAnswer([optVal]); return; }

            let next = currentArr.filter(v => !isNi(v));
            if (next.includes(optVal)) next = next.filter(v => v !== optVal);
            else next.push(optVal);
            setAnswer(next);
        };

        if (compact) {
            return (
                <div className="compact-question">
                    <div className="compact-label" id={`q-${question.id}-label`}>{question.text}</div>
                    <div className="pill-row" role="group" aria-labelledby={`q-${question.id}-label`}>
                        {question.options.map(opt => {
                            const selected = currentArr.includes(opt.val);
                            return (
                                <button
                                    key={opt.val} type="button"
                                    className={`btn-reset pill ${selected ? 'selected' : ''}`}
                                    aria-pressed={selected}
                                    onClick={() => handleSelect(opt.val)}
                                >
                                    <span className="pill-check" aria-hidden="true">
                                        {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                                    </span>
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3 id={`q-${question.id}-label`}>{question.text}</h3>
                <div className="card-grid" role="group" aria-labelledby={`q-${question.id}-label`}>
                    {question.options.map(opt => {
                        const selected = currentArr.includes(opt.val);
                        const activate = () => handleSelect(opt.val);
                        return (
                            <div
                                key={opt.val} className={`btn-reset card ${selected ? 'selected' : ''}`}
                                role="checkbox" aria-checked={selected} tabIndex={0}
                                onClick={activate} onKeyDown={onActivateKey(activate)}
                            >
                                {opt.img && (
                                    <div className="img-wrapper">
                                        <img src={opt.img} alt={opt.label} loading="lazy" decoding="async" onError={(e) => e.target.parentElement.style.display = 'none'} />
                                        <button
                                            type="button" className="zoom-icon" aria-label={`Збільшити фото: ${opt.label}`}
                                            onClick={(e) => { e.stopPropagation(); if (openImage) openImage(opt.img); }}
                                        >🔍</button>
                                    </div>
                                )}
                                <div className="card-label">{opt.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === 'cards_with_tier') {
        const currentObj = val || { type: "", tier: "" };
        const handleCardClick = (opt) => {
            if (currentObj.type !== opt.val) {
                vibe();
                const firstVar = opt.variants ? opt.variants[0] : "Standard";
                setAnswer({ type: opt.val, tier: (opt.val.startsWith("Не") || opt.val.startsWith("Ні") ? "-" : firstVar) });
            }
        };

        const showTiers = (opt) => opt && currentObj.type === opt.val && opt.val !== "Не обладнувати" && opt.val !== "Не потребується" && opt.val !== "Ні" && opt.val !== "Ні / Залишаються";

        if (compact) {
            const activeOpt = question.options.find(o => o.val === currentObj.type);
            return (
                <div className="compact-question">
                    <div className="compact-label" id={`q-${question.id}-label`}>{question.text}</div>
                    <div className="pill-row" role="radiogroup" aria-labelledby={`q-${question.id}-label`}>
                        {question.options.map(opt => {
                            const selected = currentObj.type === opt.val;
                            return (
                                <button
                                    key={opt.val} type="button"
                                    className={`btn-reset pill ${selected ? 'selected' : ''}`}
                                    role="radio" aria-checked={selected}
                                    onClick={() => handleCardClick(opt)}
                                >
                                    <span className="pill-radio" aria-hidden="true" />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    {showTiers(activeOpt) && (
                        <div style={{ maxWidth: '220px', marginTop: '12px' }}>
                            <TierButtons
                                value={currentObj.tier}
                                variants={activeOpt.variants}
                                onSelect={(v) => setAnswer({ ...currentObj, tier: v })}
                            />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3 id={`q-${question.id}-label`}>{question.text}</h3>
                {/* role="radio" на div: картка містить вкладені кнопки
                    (zoom-icon, tier-btn) — button у button неприпустимий. */}
                <div className="card-grid" role="radiogroup" aria-labelledby={`q-${question.id}-label`}>
                    {question.options.map(opt => {
                        const isSel = currentObj.type === opt.val;
                        const showTiersFlag = showTiers(opt);
                        const activate = () => handleCardClick(opt);
                        return (
                            <div
                                key={opt.val} className={`btn-reset card ${isSel ? 'selected' : ''}`}
                                role="radio" aria-checked={isSel} tabIndex={0}
                                onClick={activate} onKeyDown={onActivateKey(activate)}
                            >
                                {opt.img && (
                                    <div className="img-wrapper">
                                        <img src={opt.img} alt={opt.label} loading="lazy" decoding="async" onError={(e) => e.target.parentElement.style.display = 'none'} />
                                        <button
                                            type="button" className="zoom-icon" aria-label={`Збільшити фото: ${opt.label}`}
                                            onClick={(e) => { e.stopPropagation(); if (openImage) openImage(opt.img); }}
                                        >🔍</button>
                                    </div>
                                )}
                                <div className="card-label">{opt.label}</div>
                                {showTiersFlag && (
                                    <TierButtons
                                        value={currentObj.tier}
                                        variants={opt.variants}
                                        onSelect={(v) => setAnswer({ ...currentObj, tier: v })}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === 'multiselect_dynamic') {
        // Опції — НАЗВИ реальних приміщень з візуалізатора (масив rooms).
        // Раніше список будувався з rooms_count/baths_count/aux_rooms, які
        // видалені з анкети, — питання лишалося з єдиним «Не потребується».
        // Бекенд матчить обрані назви на кімнати і бере їхню реальну площу.
        const opts = [...storeRooms.map((r) => r.name), "Не потребується"];

        const currentArr = Array.isArray(val) ? val.filter(v => opts.includes(v)) : [];

        const handleSelect = (o) => {
            vibe();
            if (o === "Не потребується") { setAnswer(["Не потребується"]); return; }
            let next = currentArr.filter(x => x !== "Не потребується");
            if (next.includes(o)) next = next.filter(x => x !== o);
            else next.push(o);
            setAnswer(next);
        };

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3 id={`q-${question.id}-label`}>{question.text}</h3>
                <div role="group" aria-labelledby={`q-${question.id}-label`}>
                    {opts.map(o => {
                        const selected = currentArr.includes(o);
                        return (
                            <button
                                key={o} type="button"
                                className={`btn-reset card ${selected ? 'selected' : ''}`}
                                aria-pressed={selected}
                                style={{ display: 'block', width: '100%', padding: '15px', marginBottom: '10px', fontWeight: '600' }}
                                onClick={() => handleSelect(o)}
                            >
                                {o}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === 'multiselect_complex') {
        const currentObj = val || {};
        const handleCheck = (optLabel, isChecked, opt) => {
            vibeSelect();
            const next = { ...currentObj };
            if (isChecked) {
                if (optLabel === "Ні" || optLabel.startsWith("Не ")) {
                    setAnswer({ [optLabel]: "Так" });
                    return;
                }
                delete next["Ні"]; delete next["Не потребується"];
                next[optLabel] = opt.tier ? (opt.customTiers ? opt.customTiers[0] : "Standard") : "Так";
            } else {
                delete next[optLabel];
            }
            setAnswer(next);
        };

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                {/* mq-complex: на планшеті (≥768px) список іде у 2 колонки */}
                <div className="mq-complex">
                    {question.options.map(opt => {
                        const isChecked = !!currentObj[opt.label];
                        return (
                            // <label> — нативна асоціація з чекбоксом: клік по будь-якій
                            // НЕінтерактивній частині рядка перемикає його самостійно,
                            // клік по tier-кнопці/числовому інпуту (самі — інтерактивні
                            // елементи) чекбокс не чіпає. Без ручної перевірки e.target.
                            <label key={opt.label} className="list-item">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <input type="checkbox" checked={isChecked} onChange={(e) => handleCheck(opt.label, e.target.checked, opt)} />
                                    <span style={{ fontWeight: '600' }}>{opt.label}</span>
                                </div>

                                {isChecked && opt.tier && opt.label !== "Ні" && (
                                    <TierButtons
                                        value={currentObj[opt.label]}
                                        variants={opt.customTiers}
                                        onSelect={(v) => setAnswer({ ...currentObj, [opt.label]: v })}
                                    />
                                )}

                                {isChecked && opt.needsNumber && (
                                    <div style={{ width: '100%', marginTop: '15px' }}>
                                        <input type="number" inputMode="decimal" placeholder={opt.placeholder || "0"} style={{ marginBottom: 0, backgroundColor: 'var(--bg-color)' }} value={currentObj[opt.label] === "Так" ? "" : currentObj[opt.label]} onChange={(e) => {
                                            let nVal = parseFloat(e.target.value);
                                            setAnswer({ ...currentObj, [opt.label]: nVal > 0 ? nVal : "Так" });
                                        }} />
                                    </div>
                                )}
                            </label>
                        );
                    })}
                    {question.hasOther && (
                        <input type="text" placeholder="Інше (впишіть вручну)..." style={{ marginTop: '15px' }} value={currentObj['Other'] || ''} onChange={(e) => {
                            const next = { ...currentObj }; if (e.target.value) next['Other'] = e.target.value; else delete next['Other']; setAnswer(next);
                        }} />
                    )}
                </div>
            </div>
        );
    }

    if (question.type === 'multi_input_number') {
        const currentObj = val || {};
        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                <div>
                    {question.options.map(opt => {
                        const inputId = `q-${question.id}-${opt.label}`;
                        return (
                            <div key={opt.label} className="list-item">
                                <label htmlFor={inputId} style={{ fontWeight: '600', color: 'var(--text-color)' }}>{opt.label}</label>
                                <input id={inputId} type="number" inputMode="decimal" placeholder="0" value={currentObj[opt.label] || ''} style={{ width: '80px', marginBottom: 0, padding: '10px', backgroundColor: 'var(--bg-color)', border: currentObj[opt.label] ? '1.5px solid var(--link-color)' : '1.5px solid var(--border-color)' }} onChange={(e) => {
                                    const v = parseFloat(e.target.value); const next = { ...currentObj };
                                    if (v > 0) next[opt.label] = v; else delete next[opt.label]; setAnswer(next);
                                }} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return <div className="animated-step"><h3>Невідомий тип питання: {question.type}</h3></div>;
}
