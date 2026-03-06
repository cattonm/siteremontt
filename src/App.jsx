import { useState, useEffect, useMemo } from 'react';
import ClientForm from './components/ClientForm';
import Survey from './components/Survey';
import Measurements from './components/Measurements';
import CustomWorks from './components/CustomWorks';
import Summary from './components/Summary';
import { vibe, vibeError, tg } from './utils/telegram';

// Імпортуємо базу питань
import { 
    blockSetup, blockTriggerMeas, blockDemolition, blockGeneral, 
    blockHallway, blockKitchen, blockBalcony, blockWardrobe, 
    blockBasement, blockAttic, blockCustomWorks, getBathQuestions, getRoomQuestions 
} from './data/questions';

const BACKEND_URL = "https://remontnikuav.onrender.com"; // Твій сервер

export default function App() {
    const [currentStep, setCurrentStep] = useState(-1);
    const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [totals, setTotals] = useState({ work: 0, mat_min: 0 });
    
    const [client, setClient] = useState({ name: '', phone: '', object_type: 'Квартира (Новобудова)', address: '', area: '', floor: '1', elevator: 'Немає' });
    const [answers, setAnswers] = useState({});

    // --- ЛОГІКА МАРШРУТИЗАТОРА (Динамічний список питань) ---
    const finalQuestions = useMemo(() => {
        const rCount = parseInt(answers.rooms_count) || 0;
        const bCount = parseInt(answers.baths_count) || 0;
        const bQ = []; for(let i=1; i<=bCount; i++) bQ.push(...getBathQuestions(i));
        const rQ = []; for(let i=1; i<=rCount; i++) rQ.push(...getRoomQuestions(i));
        
        return [
            ...blockSetup, ...blockTriggerMeas, ...blockDemolition, ...blockGeneral, 
            ...blockHallway, ...bQ, ...blockKitchen, ...rQ, ...blockBalcony, 
            ...blockWardrobe, ...blockBasement, ...blockAttic, ...blockCustomWorks
        ];
    }, [answers.rooms_count, answers.baths_count]);

    // Які питання пропускати
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

    // --- КАЛЬКУЛЯТОР (Відправка на бекенд) ---
    useEffect(() => {
        if (currentStep < 0) return; // Не рахуємо, поки не пройшли перший екран
        const delay = setTimeout(async () => {
            if(!navigator.onLine || !client.area) return;
            try {
                const res = await fetch(`${BACKEND_URL}/api/live_calc`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ client, answers })
                });
                if (res.ok) {
                    const data = await res.json();
                    setTotals({ work: data.work, mat_min: data.mat_min });
                }
            } catch(e) { console.log("Calc error", e); }
        }, 500);
        return () => clearTimeout(delay);
    }, [client, answers, currentStep]);

    // --- НАВІГАЦІЯ ---
    const goNext = () => {
        vibe('medium');
        
        if (currentStep === -1) {
            if (!client.name.trim() || !client.area || parseFloat(client.area) <= 0) {
                vibeError();
                if(tg) tg.showAlert("Заповніть обов'язкові поля (Ім'я та Площу)!");
                else alert("Заповніть обов'язкові поля!");
                return;
            }
            if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
            setCurrentStep(0);
            return;
        }

        if (currentStep >= finalQuestions.length) {
            // Відправка анкети
            vibe('heavy');
            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('edit_id');
            const data = { edit_id: editId, client, answers };
            
            if (editId) {
                fetch(`${BACKEND_URL}/api/save_order`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' }, body: JSON.stringify(data) 
                }).then(() => tg?.close());
            } else {
                if(tg && tg.sendData) tg.sendData(JSON.stringify(data));
                else console.log("Дані для відправки:", data);
            }
            return;
        }

        if (isEditingFromSummary) {
            setIsEditingFromSummary(false);
            setCurrentStep(finalQuestions.length);
            return;
        }

        let next = currentStep + 1;
        while(next < finalQuestions.length && shouldSkip(finalQuestions[next], answers)) { next++; }
        setCurrentStep(next);
    };

    const goBack = () => {
        vibe('light');
        if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
        
        let prev = currentStep - 1;
        while(prev >= 0 && shouldSkip(finalQuestions[prev], answers)) { prev--; }
        setCurrentStep(prev);
    };

    const editStep = (index) => {
        vibe('light');
        setIsEditingFromSummary(true);
        setCurrentStep(index);
    };

    // --- РЕНДЕР ПОТОЧНОГО ЕКРАНУ ---
    const renderCurrentStep = () => {
        if (currentStep === -1) return <ClientForm client={client} setClient={setClient} />;
        if (currentStep >= finalQuestions.length) return <Summary client={client} answers={answers} finalQuestions={finalQuestions} shouldSkip={shouldSkip} editStep={editStep} totals={totals} />;
        
        const q = finalQuestions[currentStep];
        if (!q) return null;

        // Показуємо прогрес-бар
        const progress = ((currentStep + 1) / finalQuestions.length) * 100;

        return (
            <>
                <div id="top-bar">
                    <div id="step-count" style={{color: 'var(--link-color)'}}>Крок {currentStep + 1} з {finalQuestions.length}</div>
                    {isEditingFromSummary && (
                        <div onClick={() => { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); vibe(); }} 
                             style={{background: 'var(--link-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'}}>
                            🔙 До підсумку
                        </div>
                    )}
                </div>
                <div id="progress-container"><div id="progress-bar" style={{width: `${progress}%`}}></div></div>
                
                {q.type === 'trigger_meas' ? (
                    <Measurements answers={answers} setAnswers={setAnswers} />
                ) : q.type === 'custom_works_builder' ? (
                    <CustomWorks answers={answers} setAnswers={setAnswers} />
                ) : (
                    <Survey question={q} answers={answers} setAnswers={setAnswers} client={client} />
                )}
            </>
        );
    };

    // Визначаємо текст кнопки "Далі"
    let btnNextText = "Далі";
    if (currentStep === -1 && isEditingFromSummary) btnNextText = "Зберегти зміни";
    else if (currentStep >= finalQuestions.length) btnNextText = "🚀 Відправити";
    else if (currentStep >= 0) {
        let isLast = true;
        for(let i = currentStep + 1; i < finalQuestions.length; i++) {
            if (!shouldSkip(finalQuestions[i], answers)) { isLast = false; break; }
        }
        if (isLast) btnNextText = "Перевірити дані";
    }

    return (
        <>
            {renderCurrentStep()}

            {/* ПЛАВАЮЧИЙ КОШИК (показуємо тільки під час опитування) */}
            {currentStep >= 0 && currentStep < finalQuestions.length && (
                <div id="live-cart" className="visible" onClick={() => setIsCartOpen(true)}>
                    <div><span style={{fontSize:'12px', color:'#aaa', fontWeight:500}}>Робота</span><span className="cart-val">{totals.work.toLocaleString()} ₴</span></div>
                    <div><span style={{fontSize:'12px', color:'#aaa', fontWeight:500}}>Матеріали (від)</span><span className="cart-val">{totals.mat_min.toLocaleString()} ₴</span></div>
                    <div style={{fontSize: '24px'}}>🛒</div>
                </div>
            )}

            {/* Шторка кошика */}
            <div className={`sheet-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}></div>
            <div className={`bottom-sheet ${isCartOpen ? 'open' : ''}`}>
                <div className="drag-handle"></div>
                <h3 style={{marginBottom: '5px'}}>Ваш вибір</h3>
                <p style={{color: 'var(--hint-color)', fontSize: '13px', marginTop:0}}>Тут будуть деталі кошика. Ви можете додати їх пізніше.</p>
                <button className="cart-close-btn" onClick={() => setIsCartOpen(false)}>Закрити кошик</button>
            </div>

            {/* НИЖНЯ ПАНЕЛЬ КНОПОК */}
            <div className="nav-bar">
                {currentStep >= 0 && (
                    <button type="button" className="btn btn-back" onClick={goBack}>← Назад</button>
                )}
                <button type="button" className={`btn btn-next ${currentStep >= finalQuestions.length ? 'btn-submit' : ''}`} onClick={goNext}>
                    {btnNextText}
                </button>
            </div>
        </>
    );
}