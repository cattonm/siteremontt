import { useState, useEffect, useMemo } from 'react';
import useStore from './store/useStore'; 
import ClientForm from './components/ClientForm';
import RoomVisualizer from './components/RoomVisualizer';
import Survey from './components/Survey';
import Measurements from './components/Measurements';
import CustomWorks from './components/CustomWorks';
import Summary from './components/Summary';
import AnimatedPrice from './components/AnimatedPrice';
import { vibe, vibeError, tg } from './utils/telegram';
import { Menu, Moon, Sun, ShoppingCart, ArrowLeft, Send, Trash2, Loader2 } from 'lucide-react';

import { 
    blockSetup, blockTriggerMeas, blockDemolition, blockGeneral, 
    blockHallway, blockKitchen, blockBalcony, blockWardrobe, 
    blockBasement, blockAttic, blockCustomWorks, getBathQuestions, getRoomQuestions 
} from './data/questions';

const BACKEND_URL = "https://remontnikuav.onrender.com";

export default function App() {
    // === 1. ГЛОБАЛЬНИЙ СТАН З ZUSTAND ===
    const { 
        currentStep, setCurrentStep, 
        client, setClient, 
        answers, setAnswers, 
        rooms, resetDraftSilent: storeResetDraft 
    } = useStore();

    // === 2. ЛОКАЛЬНІ СТАНИ UI (Не йдуть на сервер) ===
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);
    const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [modalImg, setModalImg] = useState(null);
    const [isDark, setIsDark] = useState(false);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false); 
    const [totals, setTotals] = useState({ work: 0, mat_min: 0 });

    // === 3. ГОЛОВНА ЛОГІКА ЗАПУСКУ ===
    useEffect(() => {
        if (tg) tg.expand();
        const savedTheme = localStorage.getItem('remont_theme');
        if (savedTheme === 'dark') { setIsDark(true); document.body.classList.add('dark-theme'); }

        const editId = new URLSearchParams(window.location.search).get('edit_id');
        
        if (editId) {
            // РЕЖИМ РЕДАГУВАННЯ
            setIsLoadingEdit(true);
            fetch(`${BACKEND_URL}/api/get_order?edit_id=${editId}`, {
                headers: { 'X-Telegram-Init-Data': tg?.initData || '' } 
            })
                .then(res => {
                    if(!res.ok) throw new Error("Помилка завантаження");
                    return res.json();
                })
                .then(data => {
                    if (data.client) setClient(data.client);
                    if (data.answers) {
                        setAnswers(data.answers);
                        // Завантажуємо масив кімнат, якщо він прийшов з сервера
                        if (data.answers.rooms) {
                            useStore.setState({ rooms: data.answers.rooms });
                        }
                    }
                    // Кидаємо одразу на фінальний екран (підсумок)
                    setCurrentStep(9999); 
                })
                .catch(err => {
                    console.error(err);
                    if(tg) tg.showAlert("Не вдалося завантажити анкету для редагування.");
                })
                .finally(() => setIsLoadingEdit(false));

        } else {
            // РЕЖИМ СТВОРЕННЯ: Перевіряємо локальну чернетку з Zustand
            if (currentStep > -1) {
                setShowDraftPrompt(true);
            }
        }
    }, []);

    // Повне скидання чернетки (UI + Store)
    const handleResetDraftSilent = () => {
        storeResetDraft(); // Очищає стан Zustand та localStorage
        setIsMenuOpen(false);
        setTotals({ work: 0, mat_min: 0 });
        setIsEditingFromSummary(false);
    };

    const resetDraft = () => {
        vibe('heavy');
        if (window.confirm("Ви впевнені, що хочете очистити всю анкету і почати заново?")) {
            handleResetDraftSilent();
            setShowDraftPrompt(false);
        }
    };

    const toggleTheme = () => {
        vibe('medium');
        const next = !isDark; setIsDark(next);
        if (next) { document.body.classList.add('dark-theme'); localStorage.setItem('remont_theme', 'dark'); }
        else { document.body.classList.remove('dark-theme'); localStorage.setItem('remont_theme', 'light'); }
    };

    // === 4. ЛОГІКА ПИТАНЬ ===
    const finalQuestions = useMemo(() => {
        const rCount = parseInt(answers.rooms_count) || 0;
        const bCount = parseInt(answers.baths_count) || 0;
        const bQ = []; for(let i=1; i<=bCount; i++) bQ.push(...getBathQuestions(i));
        const rQ = []; for(let i=1; i<=rCount; i++) rQ.push(...getRoomQuestions(i));
        return [ ...blockSetup, ...blockTriggerMeas, ...blockDemolition, ...blockGeneral, ...blockHallway, ...bQ, ...blockKitchen, ...rQ, ...blockBalcony, ...blockWardrobe, ...blockBasement, ...blockAttic, ...blockCustomWorks ];
    }, [answers.rooms_count, answers.baths_count]);

    const shouldSkip = (q, ans) => {
        if (!q) return false;
        if (q.id === 'ceiling_shadow' && ans['ceiling'] === 'Ні') return true;
        if (q.id === 'screed_area' && (!ans['screed_done'] || ans['screed_done'] === 'Є від забудовника')) return true;
        const aux = ans['aux_rooms'] || [];
        if (q.id.startsWith('hallway_') && !aux.includes('Передпокій')) return true;
        if (q.id.startsWith('kitchen_') && !aux.includes('Кухня')) return true;
        if (q.id.startsWith('balcony_') && !aux.includes('Балкон')) return true;
        if (q.id.startsWith('wardrobe_') && !aux.includes('Гардероб')) return true;
        if (q.id.startsWith('basement_') && !aux.includes('Підвал')) return true;
        if (q.id.startsWith('attic_') && !aux.includes('Горище')) return true;
        return false;
    };

    const menuZones = useMemo(() => {
        const zones = []; let lastZone = "";
        finalQuestions.forEach((q, idx) => {
            if (shouldSkip(q, answers)) return;
            if (q.zone && q.zone !== lastZone) { lastZone = q.zone; zones.push({ name: q.zone.replace(' ЗАМІРИ ПРИМІЩЕНЬ', 'ЗАМІРИ'), step: idx }); }
        });
        return zones;
    }, [finalQuestions, answers]);

    // === 5. LIVE CALC: ЖИВИЙ РОЗРАХУНОК ===
    useEffect(() => {
        if (currentStep < 0 && currentStep !== 9999) return; 
        const delay = setTimeout(async () => {
            if(!navigator.onLine || !client.area) return;
            try {
                // АДАПТЕР: Формуємо єдиний об'єкт для сервера
                const payloadAnswers = { ...answers, rooms: rooms };
                
                const res = await fetch(`${BACKEND_URL}/api/live_calc`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ client, answers: payloadAnswers }) 
                });
                if (res.ok) { 
                    const data = await res.json(); 
                    setTotals({ work: data.work, mat_min: data.mat_min }); 
                }
            } catch(e) { console.log("Calc error", e); }
        }, 500);
        return () => clearTimeout(delay);
    }, [client, answers, rooms, currentStep]);

    // === 6. НАВІГАЦІЯ ===
    const goNext = () => {
        vibe('medium');
        if (currentStep === -1) {
            if (!client.name.trim() || !client.area || parseFloat(client.area) <= 0) { vibeError(); tg?.showAlert("Заповніть Ім'я та Площу!"); return; }
            if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
            setCurrentStep(0); return;
        }

        // ВІДПРАВКА АНКЕТИ НА СЕРВЕР
        if (currentStep >= finalQuestions.length) {
            vibe('heavy'); 
            const editId = new URLSearchParams(window.location.search).get('edit_id'); 
            
            // АДАПТЕР: Додаємо rooms до фінального JSON
            const payloadAnswers = { ...answers, rooms: rooms };
            const data = { edit_id: editId, client, answers: payloadAnswers };
            
            if (!editId) handleResetDraftSilent(); 

            if (editId) { 
                fetch(`${BACKEND_URL}/api/save_order`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' }, 
                    body: JSON.stringify(data) 
                }).then(() => tg?.close()); 
            } else { 
                if(tg && tg.sendData) tg.sendData(JSON.stringify(data)); 
            }
            return;
        }

        if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
        let next = currentStep + 1; while(next < finalQuestions.length && shouldSkip(finalQuestions[next], answers)) { next++; }
        setCurrentStep(next);
    };

    const goBack = () => {
        vibe('light');
        if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
        let prev = currentStep - 1; while(prev >= 0 && shouldSkip(finalQuestions[prev], answers)) { prev--; }
        setCurrentStep(prev);
    };

    const editStep = (index) => { vibe('light'); setIsEditingFromSummary(true); setCurrentStep(index); };
    const jumpToMenuStep = (stepIdx) => { vibe('light'); setIsEditingFromSummary(false); setCurrentStep(stepIdx); setIsMenuOpen(false); };

    const totalCost = totals.work + totals.mat_min;
    const workPct = totalCost > 0 ? Math.round((totals.work / totalCost) * 100) : 0;
    const matPct = totalCost > 0 ? 100 - workPct : 0;

    // === 7. ВІДМАЛЬОВКА ІНТЕРФЕЙСУ ===
    if (isLoadingEdit) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--link-color)' }}>
                <Loader2 size={48} className="lucide-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <h3 style={{ marginTop: '20px', color: 'var(--text-color)' }}>Завантаження анкети...</h3>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const renderCurrentStep = () => {
        if (currentStep === -1) return <ClientForm client={client} setClient={setClient} toggleTheme={toggleTheme} isDark={isDark} />;
        if (currentStep >= finalQuestions.length) return <Summary client={client} answers={answers} finalQuestions={finalQuestions} shouldSkip={shouldSkip} editStep={editStep} totals={totals} />;
        
        const q = finalQuestions[currentStep];
        if (!q) return null;

        const currentZoneIndex = menuZones.findIndex(z => z.name === (q.zone ? q.zone.replace(' ЗАМІРИ ПРИМІЩЕНЬ', 'ЗАМІРИ') : ""));

        return (
            <>
                <div id="top-bar">
                    <div id="menu-btn" onClick={() => { vibe('light'); setIsMenuOpen(true); }}><Menu size={20} /> Меню</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div onClick={toggleTheme} style={{ cursor: 'pointer' }}>{isDark ? <Sun size={20}/> : <Moon size={20}/>}</div>
                        <div id="step-count">Крок {currentStep + 1}/{finalQuestions.length}</div>
                    </div>
                </div>
                
                {isEditingFromSummary && (
                    <div onClick={() => { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); vibe(); }} 
                         style={{background: 'var(--link-color)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', marginBottom: '15px'}}>
                        🔙 Повернутися до підсумку
                    </div>
                )}
                
                <div id="progress-container">
                    {menuZones.map((z, idx) => (
                        <div key={idx} className={`progress-segment ${idx === currentZoneIndex ? 'active' : (idx < currentZoneIndex ? 'passed' : '')}`}></div>
                    ))}
                </div>
                
                {q.type === 'trigger_meas' ? <RoomVisualizer /> : 
                 q.type === 'custom_works_builder' ? <CustomWorks answers={answers} setAnswers={setAnswers} /> : 
                 <Survey question={q} answers={answers} setAnswers={setAnswers} client={client} openImage={setModalImg} />}
            </>
        );
    };

    let btnNextText = "Далі";
    const editId = new URLSearchParams(window.location.search).get('edit_id');
    if (currentStep === -1 && isEditingFromSummary) btnNextText = "Зберегти зміни";
    else if (currentStep >= finalQuestions.length) btnNextText = editId ? "💾 Зберегти оновлення" : "Відправити";
    else if (currentStep >= 0) {
        let isLast = true; for(let i = currentStep + 1; i < finalQuestions.length; i++) { if (!shouldSkip(finalQuestions[i], answers)) { isLast = false; break; } }
        if (isLast) btnNextText = "Перевірити дані";
    }

    return (
        <>
            {showDraftPrompt && (
                <>
                    <div className="sheet-overlay open" style={{ zIndex: 9998 }}></div>
                    <div className="image-modal open" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '20px' }}>Відновлення</h3>
                        <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>Знайдено незбережену анкету. Бажаєте продовжити заповнення з місця зупинки?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => { vibe('medium'); setShowDraftPrompt(false); }} style={{ background: 'var(--link-color)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Продовжити збережену</button>
                            <button onClick={() => { vibe('light'); handleResetDraftSilent(); setShowDraftPrompt(false); }} style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Почати заново</button>
                        </div>
                    </div>
                </>
            )}

            <div className={`sheet-overlay ${isCartOpen || isMenuOpen || modalImg ? 'open' : ''}`} onClick={() => { setIsCartOpen(false); setIsMenuOpen(false); setModalImg(null); }}></div>

            <div id="side-menu" className={isMenuOpen ? 'open' : ''}>
                <div className="menu-header">📋 Розділи анкети</div>
                {menuZones.map((z, i) => (
                    <div key={i} className="menu-item" onClick={() => jumpToMenuStep(z.step)}> {z.name} </div>
                ))}
                <div className="menu-item" style={{ color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-color)', borderBottom: 'none' }} onClick={resetDraft}>
                    <Trash2 size={18} /> Почати заново
                </div>
            </div>

            <div className={`image-modal ${modalImg ? 'open' : ''}`}>
                {modalImg && <img src={modalImg} alt="Збільшене фото" />}
                <button className="cart-close-btn" onClick={() => setModalImg(null)} style={{ marginTop: '15px' }}>Закрити</button>
            </div>

            <div className={`bottom-sheet ${isCartOpen ? 'open' : ''}`}>
                <div className="drag-handle"></div>
                <h3 style={{marginBottom: '5px'}}>Структура вартості</h3>
                <p style={{color: 'var(--hint-color)', fontSize: '13px', marginTop:0}}>Попередній прорахунок на основі відповідей.</p>
                
                <div className="chart-container">
                    <div className="donut-wrapper" style={{ background: `conic-gradient(var(--link-color) 0% ${workPct}%, #34c759 ${workPct}% 100%)` }}>
                        <div className="donut-hole"></div>
                    </div>
                    <div className="chart-legend">
                        <div className="legend-item"><span style={{fontWeight: 600}}><span className="legend-dot" style={{background: 'var(--link-color)'}}></span>Робота ({workPct}%)</span> <b><AnimatedPrice value={totals.work}/> ₴</b></div>
                        <div className="legend-item"><span style={{fontWeight: 600}}><span className="legend-dot" style={{background: '#34c759'}}></span>Матеріали ({matPct}%)</span> <b><AnimatedPrice value={totals.mat_min}/> ₴</b></div>
                        <div className="legend-item" style={{borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px'}}>
                            <span style={{fontWeight: 700}}>Всього (від)</span> <b><AnimatedPrice value={totalCost}/> ₴</b>
                        </div>
                    </div>
                </div>
                <button className="cart-close-btn" onClick={() => setIsCartOpen(false)} style={{marginTop: '25px'}}>Закрити кошик</button>
            </div>

            {renderCurrentStep()}

            {currentStep >= 0 && currentStep < finalQuestions.length && (
                <div id="live-cart" className="visible" onClick={() => setIsCartOpen(true)}>
                    <div><span style={{fontSize:'12px', color:'#aaa', fontWeight:500}}>Робота</span><span className="cart-val"><AnimatedPrice value={totals.work} /> ₴</span></div>
                    <div><span style={{fontSize:'12px', color:'#aaa', fontWeight:500}}>Матеріали (від)</span><span className="cart-val"><AnimatedPrice value={totals.mat_min} /> ₴</span></div>
                    <ShoppingCart color="white" size={24} />
                </div>
            )}

            <div className="nav-bar">
                {currentStep >= 0 && (
                    <button type="button" className="btn btn-back" onClick={goBack}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <button type="button" className={`btn btn-next ${currentStep >= finalQuestions.length ? 'btn-submit' : ''}`} onClick={goNext}>
                    {btnNextText} {currentStep >= finalQuestions.length && <Send size={18} />}
                </button>
            </div>
        </>
    );
}
