import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import useStore from './store/useStore'; 
import ClientForm from './components/ClientForm';
import Onboarding from './components/Onboarding';
import TierSwitch from './components/TierSwitch';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { getSession } from './utils/auth';
import Survey from './components/Survey';
import CustomWorks from './components/CustomWorks';
import Summary from './components/Summary';
import AnimatedPrice from './components/AnimatedPrice';
import { vibe, vibeError, tg } from './utils/telegram';
import useFocusTrap from './hooks/useFocusTrap';
import useLiveCalc from './hooks/useLiveCalc';
import useServerDraft from './hooks/useServerDraft';
import {
    showAlert, ping, me, getOrder,
    deleteDraft, saveOrder, createOrder, submitLead,
} from './utils/api';
import { Menu, Moon, Sun, ArrowLeft, Send, Trash2, Loader2, ShieldCheck } from 'lucide-react';

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

export default function App() {
    // === 1. ГЛОБАЛЬНИЙ СТАН З ZUSTAND ===
    const { 
        currentStep, setCurrentStep, 
        client, setClient, 
        answers, setAnswers, 
        rooms, resetDraftSilent: storeResetDraft,
        editingOrderId
    } = useStore();

    // === 2. ЛОКАЛЬНІ СТАНИ UI (Не йдуть на сервер) ===
    // edit_id відомий ще ДО першого рендера — спінер вмикаємо одразу,
    // без синхронного setState всередині ефекту (каскадний ре-рендер).
    const [isLoadingEdit, setIsLoadingEdit] = useState(() => !!new URLSearchParams(window.location.search).get('edit_id'));
    const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);
    // Ключ ідемпотентності заявки: генерується раз на заявку. Якщо двічі
    // натиснути «Зберегти», обидва запити несуть той самий id — і сервер
    // (у режимі Postgres) фізично відхиляє дубль. Скидаємо після успіху.
    const submissionIdRef = useRef(null);
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
    // РОЛЬ: 'guest' (публічний калькулятор) | 'manager' | 'admin'.
    // Визначається бекендом за initData — фронтенд їй лише вірить у частині
    // UI; усі перевірки доступу однаково робляться на сервері.
    const [role, setRole] = useState(null);
    // ВЕБ-СЕСІЯ (вхід на сайті через Telegram Login Widget). У міні-апці
    // її немає — там особу підтверджує initData.
    const [session, setSessionState] = useState(() => getSession());
    // Режим сайту: 'calc' — калькулятор, 'login' — вхід, 'dashboard' — кабінет.
    const [view, setView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        // Редагування заявки МАЄ відкрити форму одразу — раніше тут
        // ігнорувався edit_id, якщо була активна сесія: людина бачила
        // кабінет, а не анкету (дані вже тихо вантажились у фоні).
        if (params.get('edit_id')) return 'calc';
        // ?panel=1 — пряме посилання на кабінет: зручно тримати в закладках
        // і давати менеджерам замість «шукай кнопку в меню».
        const wantsPanel = params.has('panel');
        if (getSession()) return 'dashboard';
        return wantsPanel ? 'login' : 'calc';
    });
    // Гість — лише той, у кого немає НІ веб-сесії, НІ доступу через Telegram.
    const isGuest = role === 'guest' && !session;

    // Живий кошторис і серверна чернетка (патч 07 — винесено в хуки).
    const [totals, setTotals] = useLiveCalc(client, answers, rooms, currentStep);
    const [serverDraft, setServerDraft] = useServerDraft(client, answers, rooms, currentStep, session);

    // Фокус-пастки модалок (аудит п.9.2): фокус на перший елемент при
    // відкритті, Tab циклічно всередині, Escape закриває де є onClose.
    const menuTrapRef = useFocusTrap(isMenuOpen, () => setIsMenuOpen(false));
    const imageModalTrapRef = useFocusTrap(!!modalImg, () => setModalImg(null));
    const cartTrapRef = useFocusTrap(isCartOpen, () => setIsCartOpen(false));
    const draftPromptTrapRef = useFocusTrap(showDraftPrompt, null);
    const serverDraftTrapRef = useFocusTrap(!!serverDraft, null);
    const [isSendingLead, setIsSendingLead] = useState(false);
    const [leadSent, setLeadSent] = useState(false);
    // Суму фіксуємо ДО скидання чернетки: після resetDraft анкета порожня,
    // live-calc перераховує її в нуль — і людина бачила «Ваш кошторис — від 0 ₴».
    const [sentTotal, setSentTotal] = useState(0);
    // Онбординг показуємо один раз на пристрій — і тільки на самому початку.
    // ОНБОРДИНГ — ЗАВЖДИ перший екран сесії.
    // Раніше він ховався, якщо в localStorage лежала незавершена чернетка
    // (currentStep >= 0) — тобто після першого ж проходження людина більше
    // ніколи його не бачила. Тепер показуємо при кожному відкритті; не
    // показуємо лише в режимі редагування заявки (edit_id), де він недоречний.
    const [showOnboarding, setShowOnboarding] = useState(
        () => !new URLSearchParams(window.location.search).get('edit_id')
    );

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
        ping().catch(() => {});

        // Хто я? Гість (сайт у браузері) бачить вільний калькулятор і форму
        // контакту в кінці; менеджер — повний потік із відправкою в бота.
        me()
            .then((r) => (r.ok ? r.json() : { role: 'guest' }))
            .then((d) => setRole(d.role || 'guest'))
            .catch(() => setRole('guest'));

        const editId = new URLSearchParams(window.location.search).get('edit_id');

        if (editId) {
            // РЕЖИМ РЕДАГУВАННЯ (isLoadingEdit уже true з лінивого ініту)
            getOrder(editId)
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
                    // Позначаємо в СТОРІ (не лише в URL), що це — редагування
                    // заявки editId. Так навіть якщо застосунок пізніше
                    // відкриють без ?edit_id, дані не сплутають із власною
                    // новою чернеткою і не підуть у /api/create_order.
                    useStore.setState({ editingOrderId: editId });
                    // Кидаємо одразу на фінальний екран (підсумок)
                    setCurrentStep(9999); 
                })
                .catch(err => {
                    console.error(err);
                    if(tg) tg.showAlert("Не вдалося завантажити анкету для редагування.");
                })
                .finally(() => setIsLoadingEdit(false));
        }
        // Режим створення: підтягування серверної чернетки — у useServerDraft;
        // prompt локальної чернетки виставлений лінивим useState вище.
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
        // «Нестандартні роботи» — МЕНЕДЖЕРСЬКИЙ інструмент: там вручну
        // вводяться ціни за роботу й матеріали. Гостю його показувати не можна:
        // він міг би сам собі накрутити або обнулити кошторис.
        const custom = isGuest ? [] : blockCustomWorks;
        return [ ...blockSetup, ...blockTriggerMeas, ...blockDemolition, ...blockGeneral, ...blockHallway, ...bQ, ...blockKitchen, ...rQ, ...blockBalcony, ...blockWardrobe, ...blockBasement, ...blockAttic, ...custom ];
    }, [answers.rooms_count, answers.baths_count, isGuest]);

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

    // === 4.5 ФОНОВЕ ПЕРЕДЗАВАНТАЖЕННЯ 3D ===
    // three.js (~240 КБ gzip) лінивий і тягнеться лише на кроці планувальника.
    // Раніше це давало паузу САМЕ там. Тепер підвантажуємо чанк у фоні під час
    // простою — поки людина заповнює перші кроки. Старт не блокуємо (idle-час),
    // а до 3D-кроку код уже в кеші — без очікування.
    useEffect(() => {
        const warm = () => { import('./components/RoomVisualizer').catch(() => {}); };
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(warm, { timeout: 4000 });
            return () => window.cancelIdleCallback?.(id);
        }
        const t = setTimeout(warm, 2500);
        return () => clearTimeout(t);
    }, []);

    // === 6. НАВІГАЦІЯ ===
    const goNext = () => {
        vibe('medium');
        if (currentStep === -1) {
            // Гість на вході дає лише площу — контакти запитаємо в кінці.
            if (!client.area || parseFloat(client.area) <= 0) { vibeError(); showAlert("Вкажіть площу об'єкта!"); return; }
            if (!isGuest && !client.name.trim()) { vibeError(); showAlert("Заповніть Ім'я та Площу!"); return; }
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
                    showAlert("Вкажіть ім'я та телефон — менеджер зателефонує й уточнить деталі.");
                    return;
                }
                vibe('heavy');
                setIsSendingLead(true);
                const { website: hp, ...clientClean } = client;   // hp — honeypot, у заявку не пишемо
                submitLead({
                    client: clientClean,
                    answers: { ...answers, rooms },
                    // Honeypot: приховане поле форми. РАНІШЕ тут стояла порожня
                    // константа — тобто пастка не спрацьовувала взагалі ніколи.
                    website: hp || '',
                })
                    .then((r) => {
                        if (!r.ok) throw new Error('fail');
                        setSentTotal(totals.work + totals.mat_min);   // ПЕРЕД скиданням!
                        setLeadSent(true);
                        handleResetDraftSilent();
                    })
                    .catch(() => showAlert('Не вдалося надіслати. Спробуйте ще раз.'))
                    .finally(() => setIsSendingLead(false));
                return;
            }

            vibe('heavy'); 
            // Основне джерело — URL (?edit_id=), запасне — те, що ми записали
            // в стор одразу після завантаження анкети на редагування. Це і є
            // фікс дублювання: якщо застосунок відкрили заново БЕЗ edit_id у
            // URL, але в сторі лишився editingOrderId — це все одно оновлення
            // наявної заявки, а не нова.
            const editId = new URLSearchParams(window.location.search).get('edit_id')
                || useStore.getState().editingOrderId;
            
            // АДАПТЕР: Додаємо rooms до фінального JSON
            const payloadAnswers = { ...answers, rooms: rooms };
            // Для НОВОЇ заявки додаємо стабільний submission_id (захист від дублю).
            // Редагування (editId) його не несе — воно оновлює наявний рядок.
            if (!editId && !submissionIdRef.current) {
                submissionIdRef.current = (crypto?.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
            }
            const data = { edit_id: editId, client, answers: payloadAnswers,
                           ...(editId ? {} : { submission_id: submissionIdRef.current }) };
            
            if (!editId) {
                handleResetDraftSilent();
                // Заявку здано — прибираємо серверну чернетку, щоб через 24 год
                // бот не нагадував про вже завершену роботу.
                deleteDraft().catch(() => {});
            }

            if (editId) {
                saveOrder(data).then((r) => {
                    // ВАЖЛИВО: чистимо не лише прапорець редагування, а й САМІ
                    // дані анкети. Раніше вони лишались у чернетці, і при
                    // наступному відкритті застосунок пропонував «продовжити
                    // збережену» — тобто ту саму, вже збережену заявку. Її
                    // повторна відправка створювала ДУБЛЬ.
                    if (r.ok) handleResetDraftSilent();
                    if (tg?.close) tg.close(); else setView('dashboard');
                }); 
            } else if (tg?.sendData) {
                // Міні-апка: заявку ловить бот через web_app_data.
                tg.sendData(JSON.stringify(data));
                submissionIdRef.current = null;   // заявку здано — наступна отримає новий id
            } else {
                // ВЕБ-КАБІНЕТ: tg.sendData у браузері не існує — раніше заявка
                // менеджера тут просто зникала б у нікуди. Зберігаємо через API
                // (авторство сервер бере з сесії, а не з тіла запиту).
                createOrder(data)
                    .then((r) => { if (!r.ok) throw new Error('fail'); submissionIdRef.current = null; setView('dashboard'); })
                    .catch(() => showAlert('Не вдалося зберегти заявку. Спробуйте ще раз.'));
            }
            return;
        }

        // ВАЛІДАЦІЯ КРОКУ СТРУКТУРИ КВАРТИРИ: без приміщень і з незаповненими
        // обов'язковими групами далі не пускаємо. Перша проблемна кімната
        // автоматично відкривається через requestVisualizerFocus.
        if (finalQuestions[currentStep]?.type === 'trigger_meas') {
            if (rooms.length === 0) {
                vibeError();
                showAlert("Додайте хоча б одне приміщення — торкніться плану або кнопки «+» вгорі.");
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
                showAlert(`Заповніть обов'язкове:\n${lines.join('\n')}${issues.length > 3 ? '\n…' : ''}`);
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

    // Третя сума в липкій панелі — по кімнаті, відкритій у візуалізаторі
    const activeRoomId = useStore((s) => s.activeRoomId);
    const liveBreakdown = useStore((s) => s.liveBreakdown);
    const activeRoomSum = useMemo(() => {
        if (!activeRoomId) return null;
        const bd = liveBreakdown?.rooms?.[activeRoomId];
        if (!bd) return null;
        const room = rooms.find((r) => r.id === activeRoomId);
        return {
            name: room?.name || 'Кімната',
            total: (Number(bd.work) || 0) + (Number(bd.mat_min) || 0),
        };
    }, [activeRoomId, liveBreakdown, rooms]);

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

    // --- РЕЖИМИ САЙТУ (у міні-апці Telegram не використовуються) ---
    // Вхід менеджера: підпис Telegram → сесійний токен → кабінет.
    if (view === 'login') {
        return (
            <Login
                onSuccess={(s) => { setSessionState(s); setRole(s.role); setView('dashboard'); }}
                onBack={() => setView('calc')}
            />
        );
    }
    // Кабінет: у браузері — після входу (session), у Telegram — одразу за роллю.
    const panelSession = session || (role === 'manager' || role === 'admin'
        ? { role, name: '' } : null);
    if (view === 'dashboard' && panelSession) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
                <Dashboard
                    session={panelSession}
                    onNewOrder={() => { handleResetDraftSilent(); setView('calc'); }}
                />
            </div>
        );
    }

    // ОНБОРДИНГ — окремий повноекранний крок. Раніше він рендерився
    // ЕКРАН ПОДЯКИ — окремий повноекранний крок.
    // Раніше він малювався ВСЕРЕДИНІ анкети, тому знизу лишалася її кнопка
    // «Далі»: натиснувши, людина отримувала «Вкажіть площу об'єкта!» на вже
    // надісланій заявці. Тепер жодних чужих кнопок тут немає.
    if (leadSent) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div style={{ textAlign: 'center', maxWidth: '380px', animation: 'fadeIn 0.35s ease' }}>
                    <div style={{ fontSize: '54px', lineHeight: 1, marginBottom: '18px' }}>✅</div>
                    <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800 }}>Заявку надіслано</h2>
                    <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: 1.5, margin: 0 }}>
                        {sentTotal > 0 && (
                            <>Ваш кошторис — <b style={{ color: 'var(--text-color)' }}>від {sentTotal.toLocaleString()} ₴</b>.<br /></>
                        )}
                        Менеджер зателефонує найближчим часом і уточнить деталі.
                    </p>
                </div>
            </div>
        );
    }

    // ОНБОРДИНГ показуємо ЗАВЖДИ на початку нової анкети — це і пояснення
    // процесу, і головна точка входу в кабінет. Виняток лише два:
    // режим редагування (edit_id) і продовження незавершеної чернетки.
    if (showOnboarding) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
                <Onboarding
                    isGuest={isGuest}
                    onStart={() => {
                        setShowOnboarding(false);
                        // ВАЖЛИВО: гість теж проходить перший крок — там площа
                        // об'єкта, без якої кошторис не рахується взагалі.
                        // Контакти в тій формі для гостя приховані (isGuest).
                    }}
                />
                {/* Вхід для своїх. Свідомо непомітний: клієнту він ні до чого,
                    а менеджер знає, куди тиснути. */}
                <div style={{ textAlign: 'center', paddingBottom: '30px' }}>
                    <button
                        onClick={() => setView(session ? 'dashboard' : 'login')}
                        style={{ background: 'none', border: 'none', color: 'var(--hint-color)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {session ? 'Відкрити кабінет менеджера' : 'Я менеджер — увійти в кабінет'}
                    </button>
                </div>
            </div>
        );
    }

    const renderCurrentStep = () => {
        if (currentStep === -1) return <ClientForm client={client} setClient={setClient} isGuest={isGuest} />;
        if (currentStep >= finalQuestions.length) return <Summary client={client} setClient={setClient} answers={answers} finalQuestions={finalQuestions} shouldSkip={shouldSkip} editStep={editStep} totals={totals} isGuest={isGuest} />;
        
        const q = finalQuestions[currentStep];
        if (!q) return null;

        const currentZoneIndex = menuZones.findIndex(z => z.name === (q.zone ? q.zone.replace(' ЗАМІРИ ПРИМІЩЕНЬ', 'ЗАМІРИ') : ""));

        return (
            <>
                {/* ШАПКА-СТЕПЕР. Телефон: ← / зона + крок / ⋯ . Планшет: заголовок
                    з даними об'єкта + TierSwitch, а зони — хлібними крихтами
                    замість бургер-меню (обидва варіанти в DOM, перемикає CSS). */}
                <div className="app-head">
                    <div className="head-row head-mobile">
                        <button type="button" className="head-icon-btn" onClick={goBack} aria-label="Назад">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="head-titles">
                            <div className="head-zone">{menuZones[currentZoneIndex]?.name || 'Анкета'}</div>
                            <div className="head-step" id="head-step-label">Крок {currentStep + 1} з {finalQuestions.length}</div>
                        </div>
                        <button type="button" className="head-icon-btn" onClick={toggleTheme} aria-label="Тема">
                            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
                        </button>
                        <button type="button" className="head-icon-btn" onClick={() => { vibe('light'); setIsMenuOpen(true); }} aria-label="Меню">
                            <Menu size={20} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="head-row head-desk">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="head-desk-title">Кошторис ремонту</div>
                            <div className="head-desk-sub">
                                {[client.address, client.area ? `${client.area} м²` : null]
                                    .filter(Boolean).join(' · ') || 'Об’єкт не заповнено'}
                            </div>
                        </div>
                        <button type="button" className="head-icon-btn" onClick={toggleTheme} aria-label="Тема">
                            {isDark ? <Sun size={19}/> : <Moon size={19}/>}
                        </button>
                        <div className="head-desk-tier"><TierSwitch compact /></div>
                    </div>

                    <div
                        id="progress-container" style={{ marginTop: '10px', marginBottom: 0 }}
                        role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={finalQuestions.length}
                        aria-describedby="head-step-label"
                    >
                        {menuZones.map((z, idx) => (
                            <div key={idx} className={`progress-segment ${idx === currentZoneIndex ? 'active' : (idx < currentZoneIndex ? 'passed' : '')}`}></div>
                        ))}
                    </div>

                    <div className="zone-crumbs">
                        {menuZones.map((z, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`zone-crumb ${idx === currentZoneIndex ? 'active' : (idx < currentZoneIndex ? 'passed' : '')}`}
                                onClick={() => jumpToMenuStep(z.step)}
                            >
                                {idx < currentZoneIndex ? '✓ ' : ''}{z.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Глобальний рівень матеріалів — на телефоні окремим блоком
                    під шапкою, на планшеті він уже в шапці праворуч. */}
                <div className="head-mobile"><TierSwitch /></div>

                {isEditingFromSummary && (
                    <button type="button" onClick={() => { setIsEditingFromSummary(false); setCurrentStep(finalQuestions.length); vibe(); }}
                         style={{width: '100%', background: 'var(--link-color)', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer', textAlign: 'center', marginBottom: '15px'}}>
                        🔙 Повернутися до підсумку
                    </button>
                )}

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
                    <div ref={serverDraftTrapRef} className="image-modal open" role="dialog" aria-modal="true" aria-label="Незавершена заявка" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '20px' }}>Незавершена заявка</h3>
                        <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>
                            На сервері збережена анкета
                            {serverDraft.payload?.client?.name ? <> клієнта <b>{serverDraft.payload.client.name}</b></> : null}
                            {serverDraft.updated_at ? <> від {new Date(serverDraft.updated_at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</> : null}.
                            Продовжити з місця зупинки?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button
                                type="button"
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
                                type="button"
                                onClick={() => {
                                    vibe('light');
                                    setServerDraft(null);
                                    deleteDraft().catch(() => {});
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
                    <div ref={draftPromptTrapRef} className="image-modal open" role="dialog" aria-modal="true" aria-label="Відновлення" style={{ zIndex: 9999, padding: '25px', textAlign: 'center', background: 'var(--modal-bg)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '20px' }}>Відновлення</h3>
                        <p style={{ color: 'var(--hint-color)', fontSize: '15px', lineHeight: '1.4', marginBottom: 0 }}>
                            {editingOrderId
                                ? `Ви редагували заявку №${editingOrderId}, але не зберегли зміни. Продовжити редагування? Збереження оновить ту саму заявку, а не створить нову.`
                                : 'Знайдено незбережену анкету. Бажаєте продовжити заповнення з місця зупинки?'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button type="button" onClick={() => { vibe('medium'); setShowDraftPrompt(false); }} style={{ background: 'var(--link-color)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                {editingOrderId ? 'Продовжити редагування' : 'Продовжити збережену'}
                            </button>
                            <button type="button" onClick={() => { vibe('light'); handleResetDraftSilent(); setShowDraftPrompt(false); }} style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Почати заново</button>
                        </div>
                    </div>
                </>
            )}

            <div className={`sheet-overlay ${isCartOpen || isMenuOpen || modalImg ? 'open' : ''}`} onClick={() => { setIsCartOpen(false); setIsMenuOpen(false); setModalImg(null); }}></div>

            <div id="side-menu" ref={menuTrapRef} className={isMenuOpen ? 'open' : ''} role="dialog" aria-modal={isMenuOpen} aria-label="Розділи анкети">
                <div className="menu-header">📋 Розділи анкети</div>
                {menuZones.map((z, i) => (
                    <button key={i} type="button" className="btn-reset menu-item" style={{ display: 'block', width: '100%' }} onClick={() => jumpToMenuStep(z.step)}> {z.name} </button>
                ))}

                {/* ВХІД / ПОВЕРНЕННЯ В КАБІНЕТ — доступні ЗАВЖДИ.
                    Раніше посилання жило лише на екрані онбордингу, а той
                    показується один раз: після першого проходження кнопка
                    ставала недосяжною, і потрапити в кабінет було ніяк. */}
                <button
                    type="button"
                    className="btn-reset menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', width: '100%', borderTop: '1px solid var(--border-color)', color: 'var(--link-color)', fontWeight: 600 }}
                    onClick={() => { vibe('medium'); setIsMenuOpen(false); setView((session || role === 'manager' || role === 'admin') ? 'dashboard' : 'login'); }}
                >
                    <ShieldCheck size={18} aria-hidden="true" /> {(session || role === 'manager' || role === 'admin') ? 'Кабінет менеджера' : 'Вхід для менеджерів'}
                </button>

                <button type="button" className="btn-reset menu-item" style={{ color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', borderBottom: 'none' }} onClick={resetDraft}>
                    <Trash2 size={18} aria-hidden="true" /> Почати заново
                </button>
            </div>

            <div ref={imageModalTrapRef} className={`image-modal ${modalImg ? 'open' : ''}`} role="dialog" aria-modal={!!modalImg} aria-label="Збільшене фото">
                {modalImg && <img src={modalImg} alt="Збільшене фото" />}
                <button type="button" className="cart-close-btn" onClick={() => setModalImg(null)} style={{ marginTop: '15px' }}>Закрити</button>
            </div>

            <div ref={cartTrapRef} className={`bottom-sheet ${isCartOpen ? 'open' : ''}`} role="dialog" aria-modal={isCartOpen} aria-label="Структура вартості">
                <div className="drag-handle"></div>
                <h3 style={{marginBottom: '5px'}}>Структура вартості</h3>
                <p style={{color: 'var(--hint-color)', fontSize: '13px', marginTop:0}}>Попередній прорахунок на основі відповідей.</p>

                {/* Тумблер рівня продубльовано тут — там, де людина дивиться
                    на цифри: перемкнув і одразу бачить, як змінилась сума.
                    Основний (глобальний) живе в шапці — стан у сторі спільний. */}
                <TierSwitch />

                <div className="chart-container">
                    <div className="donut-wrapper" style={{ background: `conic-gradient(var(--link-color) 0% ${workPct}%, var(--money) ${workPct}% 100%)` }}>
                        <div className="donut-hole"></div>
                    </div>
                    <div className="chart-legend">
                        <div className="legend-item"><span style={{fontWeight: 600}}><span className="legend-dot" style={{background: 'var(--link-color)'}} aria-hidden="true"></span>Робота ({workPct}%)</span> <b><AnimatedPrice value={totals.work}/> ₴</b></div>
                        <div className="legend-item"><span style={{fontWeight: 600}}><span className="legend-dot" style={{background: 'var(--money)'}} aria-hidden="true"></span>Матеріали ({matPct}%)</span> <b><AnimatedPrice value={totals.mat_min}/> ₴</b></div>
                        <div className="legend-item" style={{borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px'}}>
                            <span style={{fontWeight: 700}}>Всього (від)</span> <b><AnimatedPrice value={totalCost}/> ₴</b>
                        </div>
                    </div>
                </div>
                <button type="button" className="cart-close-btn" onClick={() => setIsCartOpen(false)} style={{marginTop: '25px'}}>Закрити кошик</button>
            </div>

            {/* app-shell обмежує контент до 1000px на планшеті (патч 6.6) */}
            <div className="app-shell">{renderCurrentStep()}</div>

            {/* ЛИПКА ПАНЕЛЬ КОШТОРИСУ + навігація одним блоком (патч 6.2).
                Замінила плаваючу чорну пігулку #live-cart: суми тепер завжди
                на видноті, а не перекривають контент. */}
            <div className="estimate-bar">
                <div className="estimate-inner">
                    {currentStep >= 0 && currentStep < finalQuestions.length && (
                        <div className="estimate-sums" aria-live="polite">
                            <span>Роботи <b><AnimatedPrice value={totals.work} /> ₴</b></span>
                            <span>Матеріали <b className="money">від <AnimatedPrice value={totals.mat_min} /> ₴</b></span>
                            {activeRoomSum && (
                                <span>{activeRoomSum.name} <b><AnimatedPrice value={activeRoomSum.total} /> ₴</b></span>
                            )}
                            <button type="button" className="estimate-details" onClick={() => { vibe('light'); setIsCartOpen(true); }}>
                                Деталі ▸
                            </button>
                        </div>
                    )}
                    <div className="estimate-actions">
                        {currentStep >= 0 && (
                            <button type="button" className="btn btn-back" aria-label="Назад" onClick={goBack}>
                                <ArrowLeft size={20} aria-hidden="true" />
                            </button>
                        )}
                        <button type="button" className={`btn btn-next ${currentStep >= finalQuestions.length ? 'btn-submit' : ''}`} onClick={goNext}>
                            {btnNextText} {currentStep >= finalQuestions.length && <Send size={18} aria-hidden="true" />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}