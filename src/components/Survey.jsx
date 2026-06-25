import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { vibe, vibeSelect } from '../utils/telegram';

export default function Survey({ question, answers, setAnswers, client, openImage, compact = false }) {
    if (!question) return null;

    // Поточне значення для цього питання
    const val = answers[question.id];

    // Базовий обробник для збереження
    const setAnswer = (newVal) => setAnswers(prev => ({ ...prev, [question.id]: newVal }));

    // --- АВТОЗАПОВНЕННЯ (наприклад, площа стяжки) ---
    useEffect(() => {
        if (question.id === 'screed_area' && val === undefined) {
            setAnswer(parseFloat(client.area) || '');
        }
    }, [question.id]);

    // --- РЕНДЕРИ РІЗНИХ ТИПІВ ПИТАНЬ ---

    if (question.type === 'cards') {
        if (compact) {
            return (
                <div className="compact-question">
                    <div className="compact-label">{question.text}</div>
                    <div className="pill-row">
                        {question.options.map(opt => (
                            <div key={opt.val} className={`pill ${val === opt.val ? 'selected' : ''}`} onClick={() => { vibe(); setAnswer(opt.val); }}>
                                <span className="pill-radio" />
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                <div className="card-grid">
                    {question.options.map(opt => (
                        <div key={opt.val} className={`card ${val === opt.val ? 'selected' : ''}`} onClick={() => { vibe(); setAnswer(opt.val); }}>
                            {opt.img && (
                                <div className="img-wrapper">
                                    <img src={opt.img} alt={opt.label} onError={(e) => e.target.parentElement.style.display = 'none'} />
                                    <div className="zoom-icon" onClick={(e) => { e.stopPropagation(); if(openImage) openImage(opt.img); }}>🔍</div>
                                </div>
                            )}
                            <div className="card-label">{opt.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (question.type === 'input_number') {
        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                <input 
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
            const isNi = optVal.toLowerCase() === "ні" || optVal.startsWith("Не");
            if (isNi) { setAnswer([optVal]); return; }
            
            let next = currentArr.filter(v => !(v.toLowerCase() === "ні" || v.startsWith("Не")));
            if (next.includes(optVal)) next = next.filter(v => v !== optVal);
            else next.push(optVal);
            setAnswer(next);
        };

        if (compact) {
            return (
                <div className="compact-question">
                    <div className="compact-label">{question.text}</div>
                    <div className="pill-row">
                        {question.options.map(opt => (
                            <div key={opt.val} className={`pill ${currentArr.includes(opt.val) ? 'selected' : ''}`} onClick={() => handleSelect(opt.val)}>
                                <span className="pill-check">
                                    {currentArr.includes(opt.val) && <Check size={12} color="#fff" strokeWidth={3} />}
                                </span>
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                <div className="card-grid">
                    {question.options.map(opt => (
                        <div key={opt.val} className={`card ${currentArr.includes(opt.val) ? 'selected' : ''}`} onClick={() => handleSelect(opt.val)}>
                            {opt.img && (
                                <div className="img-wrapper">
                                    <img src={opt.img} alt={opt.label} onError={(e) => e.target.parentElement.style.display = 'none'} />
                                    <div className="zoom-icon" onClick={(e) => { e.stopPropagation(); if(openImage) openImage(opt.img); }}>🔍</div>
                                </div>
                            )}
                            <div className="card-label">{opt.label}</div>
                        </div>
                    ))}
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
                    <div className="compact-label">{question.text}</div>
                    <div className="pill-row">
                        {question.options.map(opt => (
                            <div key={opt.val} className={`pill ${currentObj.type === opt.val ? 'selected' : ''}`} onClick={() => handleCardClick(opt)}>
                                <span className="pill-radio" />
                                {opt.label}
                            </div>
                        ))}
                    </div>
                    {showTiers(activeOpt) && (
                        <div className="tier-container" style={{ maxWidth: '220px', marginTop: '12px' }}>
                            {(activeOpt.variants || ['Standard', 'Comfort', 'Premium']).map(v => {
                                let btnText = v; if(v==='Standard') btnText='S'; if(v==='Comfort') btnText='C'; if(v==='Premium') btnText='P';
                                return (
                                    <div key={v} className={`tier-btn ${currentObj.tier === v ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); vibeSelect(); setAnswer({...currentObj, tier: v}); }}>
                                        {btnText}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="animated-step">
                {question.zone && <div className="zone-badge">{question.zone}</div>}
                <h3>{question.text}</h3>
                <div className="card-grid">
                    {question.options.map(opt => {
                        const isSel = currentObj.type === opt.val;
                        const showTiersFlag = showTiers(opt);
                        return (
                            <div key={opt.val} className={`card ${isSel ? 'selected' : ''}`} onClick={() => handleCardClick(opt)}>
                                {opt.img && (
                                    <div className="img-wrapper">
                                        <img src={opt.img} alt={opt.label} onError={(e) => e.target.parentElement.style.display = 'none'} />
                                        <div className="zoom-icon" onClick={(e) => { e.stopPropagation(); if(openImage) openImage(opt.img); }}>🔍</div>
                                    </div>
                                )}
                                <div className="card-label">{opt.label}</div>
                                {showTiersFlag && (
                                    <div className="tier-container">
                                        {(opt.variants || ['Standard', 'Comfort', 'Premium']).map(v => {
                                            let btnText = v; if(v==='Standard') btnText='S'; if(v==='Comfort') btnText='C'; if(v==='Premium') btnText='P';
                                            return (
                                                <div key={v} className={`tier-btn ${currentObj.tier === v ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); vibeSelect(); setAnswer({...currentObj, tier: v}); }}>
                                                    {btnText}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === 'multiselect_dynamic') {
        const aux = answers['aux_rooms'] || [];
        const rooms = parseInt(answers['rooms_count']) || 0;
        const baths = parseInt(answers['baths_count']) || 0;
        
        let opts = [...aux];
        for(let i=1; i<=rooms; i++) opts.push(`Кімната ${i}`);
        for(let i=1; i<=baths; i++) opts.push(`Санвузол ${i}`);
        opts.push("Не потребується");

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
                <h3>{question.text}</h3>
                {opts.map(o => (
                    <div key={o} className={`card ${currentArr.includes(o) ? 'selected' : ''}`} style={{ padding: '15px', marginBottom: '10px', fontWeight: '600' }} onClick={() => handleSelect(o)}>
                        {o}
                    </div>
                ))}
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
                <div>
                    {question.options.map(opt => {
                        const isChecked = !!currentObj[opt.label];
                        return (
                            <div key={opt.label} className="list-item" onClick={(e) => { if(e.target.tagName !== 'INPUT' && !e.target.classList.contains('tier-btn')) { handleCheck(opt.label, !isChecked, opt); }}}>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <input type="checkbox" checked={isChecked} onChange={(e) => handleCheck(opt.label, e.target.checked, opt)} />
                                    <span style={{ fontWeight: '600' }}>{opt.label}</span>
                                </div>
                                
                                {isChecked && opt.tier && opt.label !== "Ні" && (
                                    <div className="tier-container">
                                        {(opt.customTiers || ['Standard', 'Comfort', 'Premium']).map(v => {
                                            let btnText = v; if(v==='Standard') btnText='S'; if(v==='Comfort') btnText='C'; if(v==='Premium') btnText='P';
                                            return (
                                                <div key={v} className={`tier-btn ${currentObj[opt.label] === v ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); vibeSelect(); setAnswer({...currentObj, [opt.label]: v}); }}>
                                                    {btnText}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {isChecked && opt.needsNumber && (
                                    <div style={{ width: '100%', marginTop: '15px' }}>
                                        <input type="number" inputMode="decimal" placeholder={opt.placeholder || "0"} style={{ marginBottom: 0, backgroundColor: 'var(--bg-color)' }} value={currentObj[opt.label] === "Так" ? "" : currentObj[opt.label]} onChange={(e) => {
                                            let nVal = parseFloat(e.target.value);
                                            setAnswer({...currentObj, [opt.label]: nVal > 0 ? nVal : "Так"});
                                        }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {question.hasOther && (
                        <input type="text" placeholder="Інше (впишіть вручну)..." style={{ marginTop: '15px' }} value={currentObj['Other'] || ''} onChange={(e) => {
                            const next = {...currentObj}; if(e.target.value) next['Other'] = e.target.value; else delete next['Other']; setAnswer(next);
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
                    {question.options.map(opt => (
                        <div key={opt.label} className="list-item">
                            <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{opt.label}</span>
                            <input type="number" inputMode="decimal" placeholder="0" value={currentObj[opt.label] || ''} style={{ width: '80px', marginBottom: 0, padding: '10px', backgroundColor: 'var(--bg-color)', border: currentObj[opt.label] ? '1.5px solid var(--link-color)' : '1.5px solid var(--border-color)' }} onChange={(e) => {
                                const v = parseFloat(e.target.value); const next = {...currentObj};
                                if(v > 0) next[opt.label] = v; else delete next[opt.label]; setAnswer(next);
                            }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return <div className="animated-step"><h3>Невідомий тип питання: {question.type}</h3></div>;
}