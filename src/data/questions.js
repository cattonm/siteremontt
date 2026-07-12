// ==========================================
// 1. ГЛОБАЛЬНІ ПИТАННЯ (Залишаються в лінійній анкеті)
// ==========================================

// Видалили питання про кількість кімнат та додаткові приміщення
export const blockSetup = [];

export const blockTriggerMeas = [ { id: "trigger_meas", zone: "ЗАМІРИ ПРИМІЩЕНЬ", text: "", type: "trigger_meas" } ];

export const blockDemolition = [
    { id: "demo_entrance", zone: "ДЕМОНТАЖ / МОНТАЖ", text: "Демонтаж старих вхідних дверей?", type: "cards", options: [{label:"Так",val:"Так"},{label:"Ні",val:"Ні"}] },
    { id: "demo_interior", zone: "ДЕМОНТАЖ / МОНТАЖ", text: "Скільки міжкімнатних дверей демонтуємо?", type: "input_number", placeholder: "Впишіть кількість (шт) або 0" },
    { id: "demo_build_walls", zone: "ДЕМОНТАЖ / МОНТАЖ", text: "Перепланування стін (Впишіть м²)", type: "multi_input_number", options: [
        {label:"Демонтаж існуючих стін"}, {label:"Монтаж: Гіпсокартон"}, {label:"Монтаж: Цегла (1/2)"}, {label:"Монтаж: Газоблок"}
    ]},
    { id: "demo_floor", zone: "ДЕМОНТАЖ / МОНТАЖ", text: "Демонтаж підлоги (Впишіть м²)", type: "multi_input_number", options: [
        {label:"Паркет / Дерев'яна"}, {label:"Лінолеум / Ламінат"}, {label:"Стара стяжка"}
    ]}
];

export const blockGeneral = [
    { id: "rough_plaster_done", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Чи потрібна машинна штукатурка стін (чорнова)?", type: "cards", options: [{label:"Так",val:"Так"},{label:"Ні",val:"Ні"}] },
    { id: "entrance_door", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Тип нових вхідних дверей.", type: "cards_with_tier", options: [
        { label: "МДФ", val: "МДФ", variants: ['Standard', 'Comfort', 'Premium'] },
        { label: "Броньовані", val: "Броньовані", variants: ['Standard', 'Comfort', 'Premium'] },
        { label: "Не потребується", val: "Не потребується" }
    ]},
    { id: "interior_door", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Тип міжкімнатних дверей.", type: "cards", options: [
        {label:"Прихований монтаж",val:"Прихований монтаж",img:"/img/hidemont.webp"},
        {label:"Стандарт",val:"Стандарт",img:"/img/standarddoor.webp"},
        {label:"Ні / Залишаються",val:"Ні"}
    ]},
    { id: "baseboard", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Тип підлогового плінтусу.", type: "cards", options: [
        {label:"Прихований монтаж",val:"Прихований монтаж",img:"/img/plinthidem.webp"},
        {label:"Тіньовий шов",val:"Тіньовий шов",img:"/img/shadowshow.webp"},
        {label:"Стандартний",val:"Стандартний",img:"/img/plintstandard.webp"}
    ]},
    { id: "ceiling", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Тип стелі.", type: "cards", options: [
        {label:"Натяжна",val:"Натяжна"}, {label:"Гіпсокартон",val:"Гіпсокартон"},{label:"Ні",val:"Ні"}
    ]},
    { id: "ceiling_shadow", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Чи потрібен тіньовий шов для стелі?", type: "cards", options: [{label:"Так",val:"Так"},{label:"Ні",val:"Ні"}] },
    { id: "screed_done", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Чи є стяжка підлоги?", type: "cards", options: [
        {label:"Є від забудовника",val:"Є від забудовника"}, {label:"Потрібна: Мокра",val:"Потрібна: Мокра"}, {label:"Потрібна: Напівсуха",val:"Потрібна: Напівсуха"}
    ]},
    { id: "screed_area", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Вкажіть площу стяжки (м²)", type: "input_number", placeholder: "Введіть площу" },
    { id: "electricity_done", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Чи розведена електрика?", type: "cards", options: [{label:"Так",val:"Так"},{label:"Ні",val:"Ні"}] },
    { id: "plumbing_done", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Чи розведена каналізація?", type: "cards", options: [{label:"Так",val:"Так"},{label:"Ні",val:"Ні"}] },
    { id: "warm_floor", zone: "ЧОРНОВІ / ЗАГАЛЬНЕ", text: "Встановлення теплої підлоги:", type: "multiselect_dynamic" }
];

export const blockCustomWorks = [
    { id: "custom_works", zone: "⭐️ НЕСТАНДАРТНІ РОБОТИ", text: "Додати індивідуальні роботи?", type: "custom_works_builder" }
];

// ==========================================
// 2. ЗАПОБІЖНИКИ ДЛЯ APP.JSX (Щоб не зламалися імпорти)
// ==========================================
// Оскільки App.jsx очікує ці масиви, ми передаємо їх порожніми. 
// Тепер лінійна анкета просто їх проігнорує.
export const blockHallway = [];
export const blockKitchen = [];
export const blockBalcony = [];
export const blockWardrobe = [];
export const blockBasement = [];
export const blockAttic = [];
export function getBathQuestions() { return []; }
export function getRoomQuestions() { return []; }

// ==========================================
// 3. НОВИЙ ЦЕНТРАЛІЗОВАНИЙ КОНФІГ ДЛЯ ВІЗУАЛІЗАТОРА
// ==========================================
// Візуалізатор братиме звідси питання і малюватиме твій компонент Survey.jsx
// Зверни увагу: id тепер універсальні (floor, walls, light), що ідеально лягає у структуру Zustand.

export const ROOM_QUESTIONS_CONFIG = {
    room: [
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            { label: "Ламінат", val: "Ламінат", img: "/img/laminat.webp" }, { label: "Паркет", val: "Паркет", img: "/img/parket.webp" },
            { label: "Кварц вініл", val: "Кварц вініл", img: "/img/kvarzvinil.webp" }, { label: "Керамограніт", val: "Керамограніт", img: "/img/keramogranit.webp" }, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення.", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, 
            {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "sills", group: "Підвіконня", text: "Підвіконня.", type: "cards", options: [
            {label:"Пластик",val:"Пластик"}, {label:"Дерево",val:"Дерево"}, 
            {label:"Штучний камінь",val:"Штучний камінь"}, {label:"Не потребується",val:"Не потребується"}
        ]},
        { id: "decor", group: "Декор", text: "Декор.", type: "cards", options: [
            {label:"Панелі гіпсові",val:"Панелі гіпсові",img:"/img/gipspankimn.webp"}, {label:"Панелі ДСП",val:"Панелі ДСП",img:"/img/dsppaneli.webp"}, {label:"ні",val:"ні"}
        ]},
        { id: "other", group: "Інше", text: "Інші потреби", type: "multiselect_complex", hasOther:false, options: [
            {label:"Радіатор",tier:true}, {label:"Кондиціонер", tier:true}, {label:"Звукоізоляція", tier:false}
        ]}
    ],
    bath: [
        { id: "floor", group: "Підлога", text: "Плитка на підлогу (формат)", type: "cards", options: [
            { label: "Мозаїка", val: "Мозаїка" }, { label: "Плитка до 120*60", val: "Керамограніт/Плитка до 120*60" }, { label: "Великоформатний", val: "Великоформатний керамограніт" }, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "wall_tile", group: "Стіни", text: "Плитка на стіни (формат)", type: "cards", options: [
            { label: "Мозаїка", val: "Мозаїка" }, { label: "Плитка до 120*60", val: "Керамограніт/Плитка до 120*60" }, { label: "Великоформатний", val: "Великоформатний керамограніт" }, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "shower", group: "Сантехніка", text: "Душ.", type: "cards_multiselect", options: [
            {label:"Піддон (акрил/камінь)",val:"Піддон (акрил/камінь)",img:"/img/piddon.webp"}, {label:"Душовий трап (з плитки)",val:"Душовий трап (з плитки)",img:"/img/plitkadush.webp"}, 
            {label:"Скляна перегородка",val:"Скляна перегородка",img:"/img/sklodush.webp"}, {label:"Скляна конструкція з дверима",val:"Скляна конструкція з дверима",img:"/img/sklodveridush.webp"}, {label:"Не обладнувати",val:"Не обладнувати"}
        ]},
        { id: "tub", group: "Сантехніка", text: "Ванна", type: "cards_with_tier", options: [
            {label:"Акрил",val:"Акрил",img:"/img/vanaakril.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Гідро масаж",val:"Гідро масаж",img:"/img/vanagidromas.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Окремостояча",val:"Окремостояча",img:"/img/okremavana.webp", variants: ['Standard', 'Comfort', 'Premium']}, {label:"Не обладнувати",val:"Не обладнувати"}
        ]},
        { id: "toilet", group: "Сантехніка", text: "Унітаз.", type: "cards_with_tier", options: [
            {label:"Окремостоячий",val:"Окремостоячий",img:"/img/unitazokremo.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Інсталяція",val:"Інсталяція",img:"/img/installunitaz.webp", variants: ['Standard', 'Comfort', 'Premium']},
            {label:"Ні",val:"Ні"}
        ]},
        { id: "mixer_std", group: "Сантехніка", text: "Кількість звичайних змішувачів (шт)", type: "input_number", placeholder: "0" },
        { id: "mixer_hidden", group: "Сантехніка", text: "Змішувачі прихованого монтажу (шт)", type: "input_number", placeholder: "0" },
        { id: "other", group: "Інше", text: "Інші потреби", type: "multiselect_complex", hasOther:false, options: [
            {label:"Гігієнічний душ",tier:true}, {label:"Пральна машина",tier:true}, {label:"Сушильна машина",tier:true}, 
            {label:"Дзеркало з підігрівом",tier:true}, {label:"Бойлер до 100л",tier:true}, {label:"Бойлер непрямого нагріву (до 300л)",tier:true}, {label:"Умивальник з тумбою",tier:true}, 
            {label:"Дзеркало",tier:true}, {label:"Рушникосушка",tier:true}, {label:"Ні",tier:false}
        ]}
    ],
    kitchen: [
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"Декор підсвітка",val:"Декор підсвітка",img:"/img/dekorpidsv.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "floor", group: "Підлога", text: "Підлога.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/kitchenkeramo.webp"}, {label:"Кварц-вініл",val:"Кварц-вініл",img:"/img/kitchenkvarzv.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "apron", group: "Фартух", text: "Фартух.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/fartukkeramo.webp"}, {label:"Матеріал стільниці",val:"Матеріал стільниці",img:"/img/fartukstiln.jpeg"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "mixer_std", group: "Сантехніка", text: "Кількість звичайних змішувачів (шт)", type: "input_number", placeholder: "0" },
        { id: "mixer_hidden", group: "Сантехніка", text: "Змішувачі прихованого монтажу (шт)", type: "input_number", placeholder: "0" },
        { id: "other", group: "Інше", text: "Інші потреби", type: "multiselect_complex", hasOther: false, options: [
            {label:"Підсвітка робочої поверхні", tier: false}, {label:"Посудомийна машина", tier: true}, {label:"Осмос", tier: true},
            {label:"Подрібнювач відходів", tier: true}, {label:"Мікрохвильова піч", tier: true}, {label:"Духова шафа", tier: true}, {label:"Радіатор", tier: true}
        ]}
    ],
    hallway: [
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварцвініл",val:"Кварцвініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"Декор підсвітка",val:"Декор підсвітка",img:"/img/dekorpidsv.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "decor", group: "Декор", text: "Декор", type: "cards", options: [
            {label:"ДСП панелі",val:"ДСП панелі",img:"/img/dsppaneli.webp"}, {label:"Панелі гіпсові",val:"Панелі гіпсові",img:"/img/gipspankimn.webp"}, {label:"Ні",val:"Ні"}
        ]}
    ],
    balcony: [
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.webp"}, {label:"Ні",val:"Ні"}
        ]},
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Вагонка",val:"Вагонка",img:"/img/vagonka.webp"}, {label:"Короїд",val:"Короїд",img:"/img/koroid.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}, {label:"Ні",val:"Ні"}
        ]},
        { id: "other", group: "Інше", text: "Облаштування балкону", type: "multiselect_complex", hasOther: false, options: [
            {label:"Утеплення", tier: false}, {label:"Робоче місце", tier: false}, 
            {label:"Зовнішнє скління", tier: false, needsNumber: true, placeholder: "Площа (м²)"},
            {label:"Балконний блок", tier: false, needsNumber: true, placeholder: "Площа (м²)"},
            {label:"Ні", tier: false}
        ]}
    ],
    wardrobe: [
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування",img:"/img/gruntovka.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledgarderob.webp"}, {label:"Без змін",val:"Без змін"}
        ]}
    ],
    basement: [
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Лінолеум",val:"Лінолеум",img:"/img/linoleum.webp"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "ceiling", group: "Стеля", text: "Тип стелі.", type: "cards", options: [
            {label:"Натяжна",val:"Натяжна"}, {label:"Гіпсокартон",val:"Гіпсокартон"}, {label:"Побілка",val:"Побілка"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"Без змін",val:"Без змін"}
        ]}
    ],
    attic: [
        { id: "walls", group: "Стіни", text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Обшивка деревʼяними рейками",val:"Обшивка деревʼяними рейками",img:"/img/obshivkaderev.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbzgipso.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"ні",val:"ні"}
        ]},
        { id: "floor", group: "Підлога", text: "Тип підлоги.", type: "cards", options: [
            {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.webp"}, {label:"Інше",val:"Інше"}, {label:"Без змін",val:"Без змін"}
        ]},
        { id: "light", group: "Освітлення", text: "Освітлення", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}, {label:"Без змін",val:"Без змін"}
        ]}
    ]
};
// ==========================================
// 4. ВАЛІДАЦІЯ ТА ДОВІДНИКИ ДЛЯ ВІЗУАЛІЗАТОРА
// ==========================================

export const ROOM_TYPE_LABELS = {
    room: 'Кімната', kitchen: 'Кухня', bath: 'Санвузол', hallway: 'Передпокій',
    balcony: 'Балкон', wardrobe: 'Гардероб', basement: 'Підвал', attic: 'Мансарда',
};

// Групи, без вибору в яких не пускаємо «Далі» (бейдж «Необхідно обрати»,
// стиль Kapitel). Для типу кімнати діють лише групи, що Є в його конфізі:
// «Фартух» вимагається тільки на кухні, «Стеля» — лише в підвалі і т.д.
// Примусової покупки немає: у кожному списку тепер є чесний «Без змін».
export const REQUIRED_GROUPS = new Set(['Підлога', 'Стеля', 'Стіни', 'Освітлення', 'Фартух']);

// Чи дано відповідь на конкретне питання (з урахуванням типу).
export function isQuestionAnswered(q, val) {
    if (val === undefined || val === null || val === '') return false;
    switch (q.type) {
        case 'cards_multiselect':
        case 'multiselect_dynamic':
            return Array.isArray(val) && val.length > 0;
        case 'cards_with_tier':
            return !!(val && typeof val === 'object' && val.type);
        case 'multiselect_complex':
            return typeof val === 'object' && Object.keys(val).length > 0;
        case 'input_number':
            return val !== '' && !Number.isNaN(parseFloat(val));
        default:
            return true; // 'cards' зі строковим значенням уже пройшов перевірки вище
    }
}

// Проблеми по кімнатах перед «Далі» з кроку структури квартири.
// Повертає [{ roomId, roomName, missing: [назви груп], badArea }].
// Група вважається заповненою, якщо відповідь є ХОЧА Б на одне її питання.
export function getRoomIssues(rooms) {
    const issues = [];
    for (const room of rooms || []) {
        const cfg = ROOM_QUESTIONS_CONFIG[room.type] || [];
        const groupsHere = new Map();
        for (const q of cfg) {
            if (!REQUIRED_GROUPS.has(q.group)) continue;
            if (!groupsHere.has(q.group)) groupsHere.set(q.group, []);
            groupsHere.get(q.group).push(q);
        }
        const missing = [];
        for (const [name, qs] of groupsHere) {
            if (!qs.some((q) => isQuestionAnswered(q, room[q.id]))) missing.push(name);
        }
        const badArea = !(parseFloat(room.measurements?.floor) > 0);
        if (missing.length || badArea) {
            issues.push({ roomId: room.id, roomName: room.name, missing, badArea });
        }
    }
    return issues;
}
