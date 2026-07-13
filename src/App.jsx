import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import useStore from './store/useStore'; 
import ClientForm from './components/ClientForm';
import Onboarding from './components/Onboarding';
import TierSwitch from './components/TierSwitch';
import Survey from './components/Survey';
import CustomWorks from './components/CustomWorks';
import Summary from './components/Summary';
import AnimatedPrice from './components/AnimatedPrice';
import { vibe, vibeError, tg } from './utils/telegram';
import { Menu, Moon, Sun, ShoppingCart, ArrowLeft, Send, Trash2, Loader2 } from 'lucide-react';

// ЛІНИВИЙ імпорт: RoomVisualizer тягне за собою three.js + drei (~850 КБ
// сирого JS). Без lazy усе це вантажилось КОЖНОМУ користувачу одразу на
// формі імені — тепер чанк їде з мережі, лише коли людина доходить до
// кроку структури квартири (а форму вона заповнює швидше, ніж він тягнеться).
const RoomVisualizer = lazy(() => import('./components/RoomVisualizer'));

import { 
    blockSetup, blockTriggerMeas, blockDemolition, blockGeneral, 
    blockHallway, blockKitchen, blockBalcony, blockWardrobe, 
    blockBasement, blockAttic, blockCustomWorks, getBathQuestions, getRoomQuestions,
    getRoomIssues
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
    // edit_id відомий ще ДО першого рендера — спінер вмикаємо одразу,
    // без синхронного setState всередині ефекту (каскадний ре-рендер).
    const [isLoadingEdit, setIsLoadingEdit] = useState(() => !!new URLSearchParams(window.location.search).get('edit_id'));
    const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [modalImg, setModalImg] = useState(null);
    // Лінива ініціалізація замість setState в ефекті (setState синхронно
    // в ефекті = зайвий каскадний рендер на старті + помилка лінтера).
    const [isDark, setIsDark] = useState(() => localStorage.getItem('remont_theme') === 'dark');
    const [showDraftPrompt, setShowDraftPrompt] = useState(() => {
        const isEdit = new URLSearchParams(window.location.search).get('edit_id');
        return !isEdit && useStore.getState().currentStep > -1; // persist гідратується синхронно
    });
    const [totals, setTotals] = useState({ work: 0, mat_min: 0 });
    // Чернетка, знайдена на сервері (інший пристрій) — показуємо банер
    // «Продовжити?», а не мовчки підміняємо стан.
    const [serverDraft, setServerDraft] = useState(null);
    // РОЛЬ: 'guest' (публічний калькулятор) | 'manager' | 'admin'.
    // Визначається бекендом за initData — фронтенд їй лише вірить у частині
    // UI; усі перевірки доступу однаково робляться на сервері.
    const [role, setRole] = useState(null);
    const isGuest = role === 'guest';
    const [isSendingLead, setIsSendingLead] = useState(false);
    const [leadSent, setLeadSent] = useState(false);
    // Онбординг показуємо один раз на пристрій — і тільки на самому початку.
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const isEdit = new URLSearchParams(window.location.search).get('edit_id');
        return !isEdit
            && useStore.getState().currentStep <= -1
            && !localStorage.getItem('remont_onboarded');
    });

    // Тема: один ефект синхронізує клас на body і localStorage
    useEffect(() => {
        document.body.classList.toggle('dark-theme', isDark);
        localStorage.setItem('remont_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    // === 3. ГОЛОВНА ЛОГІКА ЗАПУСКУ ===
    useEffect(() => {
        if (tg) tg.expand();

        // Прогрів бекенду: free-план Render засинає, перший live_calc міг
        // чекати холодний старт ~30-50 с. Будимо сервер, поки людина
        // заповнює ім'я/площу — до кроку кімнат ціни вже рахуються миттєво.
        fetch(`${BACKEND_URL}/ping`, { mode: 'no-cors' }).catch(() => {});

        // Хто я? Гість (сайт у браузері) бачить вільний калькулятор і форму
        // контакту в кінці; менеджер — повний потік із відправкою в бота.
        fetch(`${BACKEND_URL}/api/me`, {
            headers: { 'X-Telegram-Init-Data': tg?.initData || '' },
        })
            .then((r) => (r.ok ? r.json() : { role: 'guest' }))
            .then((d) => setRole(d.role || 'guest'))
            .catch(() => setRole('guest'));

        const editId = new URLSearchParams(window.location.search).get('edit_id');
        
        if (editId) {
            // РЕЖИМ РЕДАГУВАННЯ (isLoadingEdit уже true з лінивого ініту)
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
        } else if (useStore.getState().currentStep <= -1 && tg?.initData) {
            // РЕЖИМ СТВОРЕННЯ, локальної чернетки НЕМА (новий пристрій, чистий
            // кеш, перевстановлений Telegram) — питаємо серверну.
            fetch(`${BACKEND_URL}/api/get_draft`, {
                headers: { 'X-Telegram-Init-Data': tg.initData },
            })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    const draft = d?.draft;
                    if (!draft?.payload) return;
                    // Не перетираємо роботу, яку користувач уже почав у цій сесії.
                    if (useStore.getState().currentStep > -1) return;
                    setServerDraft(draft);
                })
                .catch(() => {});
        }
        // Режим створення: prompt чернетки виставлений лінивим useState вище.
    }, [setClient, setAnswers, setCurrentStep]); // zustand-сеттери стабільні — ефект фактично one-shot

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
        setIsDark(d => !d); // клас на body і localStorage синхронізує ефект вище
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
        // AbortController проти гонки відповідей: без нього повільний
        // старий запит (напр., холодний старт Render) міг прилетіти ПІСЛЯ
        // швидкого нового і перезаписати кошик застарілими сумами.
        const ctrl = new AbortController();
        const delay = setTimeout(async () => {
            if(!navigator.onLine || !client.area) return;
            try {
                // АДАПТЕР: Формуємо єдиний об'єкт для сервера
                const payloadAnswers = { ...answers, rooms: rooms };
                
                const res = await fetch(`${BACKEND_URL}/api/live_calc`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ client, answers: payloadAnswers }),
                    signal: ctrl.signal,
                });
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
            } catch(e) { if (e.name !== 'AbortError') console.log("Calc error", e); }
        }, 500);
        return () => { clearTimeout(delay); ctrl.abort(); };
    }, [client, answers, rooms, currentStep]);

    // === 5.1 СЕРВЕРНА ЧЕРНЕТКА ===
    // Раніше чернетка жила ЛИШЕ в localStorage телефона: зміна пристрою або
    // чистка кешу — і робота зникала. Тепер вона дублюється на сервер:
    //  • можна продовжити з іншого пристрою;
    //  • бот нагадає про незавершену заявку через 24 год.
    // Дебаунс 3 с (довший за live-calc: тут ходимо в Google Sheets, не варто
    // смикати на кожен клік). Режим редагування не чіпаємо — там уже є заявка.
    useEffect(() => {
        const editId = new URLSearchParams(window.location.search).get('edit_id');
        if (editId || currentStep < 0 || !tg?.initData) return;
        if (!client.name && !client.area && rooms.length === 0) return; // порожню не шлемо

        const ctrl = new AbortController();
        const t = setTimeout(() => {
            fetch(`${BACKEND_URL}/api/save_draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg.initData },
                body: JSON.stringify({ currentStep, client, answers: { ...answers, rooms } }),
                signal: ctrl.signal,
            }).catch(() => {}); // мовчазний фейл: локальна чернетка все одно лишається
        }, 3000);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [client, answers, rooms, currentStep]);

    // === 6. НАВІГАЦІЯ ===
    const goNext = () => {
        vibe('medium');
        if (currentStep === -1) {
            // Гість на вході дає лише площу — контакти запитаємо в кінці.
            if (!client.area || parseFloat(client.area) <= 0) { vibeError(); tg?.showAlert("Вкажіть площу об'єкта!"); return; }
            if (!isGuest && !client.name.trim()) { vibeError(); tg?.showAlert("Заповніть Ім'я та Площу!"); return; }
            if (isEditingFromSummary) { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); return; }
            setCurrentStep(0); return;
        }

        // ВІДПРАВКА АНКЕТИ НА СЕРВЕР
        if (currentStep >= finalQuestions.length) {
            // ГІСТЬ: замість відправки в бота — публічний лід із контактами.
            if (isGuest) {
                const digits = (client.phone || '').replace(/\D/g, '');
                if (!client.name?.trim() || digits.length < 9) {
                    vibeError();
                    (tg?.showAlert || window.alert)("Вкажіть ім'я та телефон — менеджер зателефонує й уточнить деталі.");
                    return;
                }
                vibe('heavy');
                setIsSendingLead(true);
                fetch(`${BACKEND_URL}/api/submit_lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client,
                        answers: { ...answers, rooms },
                        website: '',   // honeypot: справжня людина лишає порожнім
                    }),
                })
                    .then((r) => {
                        if (!r.ok) throw new Error('fail');
                        setLeadSent(true);
                        handleResetDraftSilent();
                    })
                    .catch(() => (tg?.showAlert || window.alert)('Не вдалося надіслати. Спробуйте ще раз.'))
                    .finally(() => setIsSendingLead(false));
                return;
            }

            vibe('heavy'); 
            const editId = new URLSearchParams(window.location.search).get('edit_id'); 
            
            // АДАПТЕР: Додаємо rooms до фінального JSON
            const payloadAnswers = { ...answers, rooms: rooms };
            const data = { edit_id: editId, client, answers: payloadAnswers };
            
            if (!editId) {
                handleResetDraftSilent();
                // Заявку здано — прибираємо серверну чернетку, щоб через 24 год
                // бот не нагадував про вже завершену роботу.
                fetch(`${BACKEND_URL}/api/delete_draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' },
                }).catch(() => {});
            }

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

        // ВАЛІДАЦІЯ КРОКУ СТРУКТУРИ КВАРТИРИ: без приміщень і з незаповненими
        // обов'язковими групами далі не пускаємо. Перша проблемна кімната
        // автоматично відкривається через requestVisualizerFocus.
        if (finalQuestions[currentStep]?.type === 'trigger_meas') {
            const alertFn = tg?.showAlert ? tg.showAlert.bind(tg) : window.alert;
            if (rooms.length === 0) {
                vibeError();
                alertFn("Додайте хоча б одне приміщення — торкніться плану або кнопки «+» вгорі.");
                return;
            }
            const issues = getRoomIssues(rooms);
            if (issues.length > 0) {
                vibeError();
                const first = issues[0];
                useStore.getState().requestVisualizerFocus(first.roomId, first.missing[0] || null);
                const lines = issues.slice(0, 3).map(i =>
                    `• ${i.roomName}: ${[...i.missing, ...(i.badArea ? ['Площа'] : [])].join(', ')}`
                );
                alertFn(`Заповніть обов'язкове:\n${lines.join('\n')}${issues.length > 3 ? '\n…' : ''}`);
                return;
            }
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
        // Гість надіслав контакти — далі йому нічого робити, дякуємо і
        // чесно кажемо, що буде далі.
        if (leadSent) {
            return (
                <div style={{ padding: '60px 24px', textAlign: 'center', animation: 'fadeIn 0.35s ease' }}>
                    <div style={{ fontSize: '54px', lineHeight: 1, marginBottom: '18px' }}>✅</div>
                    <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800 }}>Заявку надіслано</h2>
                    <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: 1.5, margin: 0 }}>
                        Ваш кошторис — <b style={{ color: 'var(--text-color)' }}>від {totalCost.toLocaleString()} ₴</b>.<br />
                        Менеджер зателефонує найближчим часом і уточнить деталі.
                        Точну ціну підтверджує безкоштовний замір.
                    </p>
                </div>
            );
        }
        // Онбординг — найперший екран: пояснює, що буде далі й скільки триватиме.
        if (showOnboarding) {
            return (
                <Onboarding
                    isGuest={isGuest}
                    onStart={() => {
                        localStorage.setItem('remont_onboarded', '1');
                        setShowOnboarding(false);
                        // ГІСТЬ одразу йде рахувати: питати контакти на вході —
                        // найшвидший спосіб втратити людину. Телефон попросимо
                        // в кінці, коли вона вже побачила свій кошторис.
                        if (isGuest) setCurrentStep(0);
                    }}
                />
            );
        }
        if (currentStep === -1) return <ClientForm client={client} setClient={setClient} isGuest={isGuest} />;
        if (currentStep >= finalQuestions.length) return <Summary client={client} setClient={setClient} answers={answers} finalQuestions={finalQuestions} shouldSkip={shouldSkip} editStep={editStep} totals={totals} isGuest={isGuest} />;
        
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
                
                {q.type === 'trigger_meas' ? (
                    <Suspense fallback={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', color: 'var(--hint-color)' }}>
                            <Loader2 size={34} style={{ animation: 'spin 1s linear infinite' }} />
                            <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 600 }}>Завантаження 3D-планувальника…</div>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    }>
                        <RoomVisualizer />
                    </Suspense>
                ) : 
                 q.type === 'custom_works_builder' ? <CustomWorks answers={answers} setAnswers={setAnswers} /> : 
                 <Survey question={q} answers={answers} setAnswers={setAnswers} client={client} openImage={setModalImg} />}
            </>
        );
    };

    let btnNextText = "Далі";
    const editId = new URLSearchParams(window.location.search).get('edit_id');
    if (currentStep === -1 && isEditingFromSummary) btnNextText = "Зберегти зміни";
    else if (currentStep >= finalQuestions.length) btnNextText = isGuest ? (isSendingLead ? "Надсилаємо…" : "Отримати кошторис") : (editId ? "💾 Зберегти оновлення" : "Відправити");
    else if (currentStep >= 0) {
        let isLast = true; for(let i = currentStep + 1; i < finalQuestions.length; i++) { if (!shouldSkip(finalQuestions[i], answers)) { isLast = false; break; } }
        if (isLast) btnNextText = "Перевірити дані";
    }

    return (
        <>
            {/* СЕРВЕРНА ЧЕРНЕТКА: знайдена на бекенді, локальної нема.
                Типовий кейс — менеджер почав на телефоні, продовжує на планшеті. */}
            {serverDraft && (
                <>
                    <div className="sheet-overlay open" style={{ zIndex: 9998 }}></div>
                    <div className="image-modal open" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '20px' }}>Незавершена заявка</h3>
                        <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>
                            На сервері збережена анкета
                            {serverDraft.payload?.client?.name ? <> клієнта <b>{serverDraft.payload.client.name}</b></> : null}
                            {serverDraft.updated_at ? <> від {new Date(serverDraft.updated_at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</> : null}.
                            Продовжити з місця зупинки?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={() => {
                                    vibe('medium');
                                    const p = serverDraft.payload;
                                    if (p.client) setClient(p.client);
                                    if (p.answers) {
                                        setAnswers(p.answers);
                                        if (p.answers.rooms) useStore.setState({ rooms: p.answers.rooms });
                                    }
                                    setCurrentStep(typeof p.currentStep === 'number' ? p.currentStep : 0);
                                    setServerDraft(null);
                                }}
                                style={{ background: 'var(--link-color)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                            >Продовжити</button>
                            <button
                                onClick={() => {
                                    vibe('light');
                                    setServerDraft(null);
                                    fetch(`${BACKEND_URL}/api/delete_draft`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' },
                                    }).catch(() => {});
                                }}
                                style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                            >Почати нову</button>
                        </div>
                    </div>
                </>
            )}

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

                {/* Тумблер рівня стоїть САМЕ ТУТ — там, де людина дивиться
                    на цифри: перемкнув і одразу бачить, як змінилась сума. */}
                <TierSwitch />

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
