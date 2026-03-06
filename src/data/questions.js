export const blockSetup = [
    { id: "rooms_count", zone: "СТРУКТУРА ОБ'ЄКТУ", text: "Скільки ЖИТЛОВИХ кімнат?", type: "input_number", placeholder: "Введіть число" },
    { id: "baths_count", zone: "СТРУКТУРА ОБ'ЄКТУ", text: "Скільки САНВУЗЛІВ?", type: "input_number", placeholder: "Введіть число" },
    { id: "aux_rooms", zone: "СТРУКТУРА ОБ'ЄКТУ", text: "Які ДОДАТКОВІ приміщення ремонтуємо?", type: "cards_multiselect", options: [
        {label:"Передпокій",val:"Передпокій"}, {label:"Кухня",val:"Кухня"}, {label:"Балкон",val:"Балкон"},
        {label:"Гардероб",val:"Гардероб"}, {label:"Підвал",val:"Підвал"}, {label:"Горище",val:"Горище"}
    ]}
];

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

export const blockHallway = [
    { id: "hallway_floor", zone: "ПЕРЕДПОКІЙ", text: "Тип підлоги.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварцвініл",val:"Кварцвініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.jpeg"}
    ]},
    { id: "hallway_walls", zone: "ПЕРЕДПОКІЙ", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}
    ]},
    { id: "hallway_light", zone: "ПЕРЕДПОКІЙ", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"Декор підсвітка",val:"Декор підсвітка",img:"/img/dekorpidsv.webp"}
    ]},
    { id: "hallway_decor", zone: "ПЕРЕДПОКІЙ", text: "Декор", type: "cards", options: [
        {label:"ДСП панелі",val:"ДСП панелі",img:"/img/dsppaneli.webp"}, {label:"Панелі гіпсові",val:"Панелі гіпсові",img:"/img/gipspankimn.webp"}, {label:"Ні",val:"Ні"}
    ]}
];

export const blockKitchen = [
    { id: "kitchen_walls", zone: "КУХНЯ", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}
    ]},
    { id: "kitchen_light", zone: "КУХНЯ", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"Декор підсвітка",val:"Декор підсвітка",img:"/img/dekorpidsv.webp"}
    ]},
    { id: "kitchen_floor", zone: "КУХНЯ", text: "Підлога.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/kitchenkeramo.webp"}, {label:"Кварц-вініл",val:"Кварц-вініл",img:"/img/kitchenkvarzv.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.jpeg"}
    ]},
    { id: "kitchen_apron", zone: "КУХНЯ", text: "Фартух.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/fartukkeramo.webp"}, {label:"Матеріал стільниці",val:"Матеріал стільниці",img:"/img/fartukstiln.jpeg"}
    ]},
    { id: "kitchen_mixer_std", zone: "КУХНЯ", text: "Кількість звичайних змішувачів (шт)", type: "input_number", placeholder: "0" },
    { id: "kitchen_mixer_hidden", zone: "КУХНЯ", text: "Змішувачі прихованого монтажу (шт)", type: "input_number", placeholder: "0" },
    { id: "kitchen_other", zone: "КУХНЯ", text: "Інші потреби", type: "multiselect_complex", hasOther: false, options: [
        {label:"Підсвітка робочої поверхні", tier: false}, {label:"Посудомийна машина", tier: true}, {label:"Осмос", tier: true},
        {label:"Подрібнювач відходів", tier: true}, {label:"Мікрохвильова піч", tier: true}, {label:"Духова шафа", tier: true}, {label:"Радіатор", tier: true}
    ]}
];

export const blockBalcony = [
    { id: "balcony_floor", zone: "БАЛКОН", text: "Тип підлоги.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.jpeg"}, {label:"Ні",val:"Ні"}
    ]},
    { id: "balcony_walls", zone: "БАЛКОН", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"Вагонка",val:"Вагонка",img:"/img/vagonka.jpg"}, {label:"Короїд",val:"Короїд",img:"/img/koroid.jpg"}
    ]},
    { id: "balcony_light", zone: "БАЛКОН", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}, {label:"Ні",val:"Ні"}
    ]},
    { id: "balcony_other", zone: "БАЛКОН", text: "Облаштування балкону", type: "multiselect_complex", hasOther: false, options: [
        {label:"Утеплення", tier: false}, 
        {label:"Робоче місце", tier: false}, 
        {label:"Зовнішнє скління", tier: false, needsNumber: true, placeholder: "Площа (м²)"},
        {label:"Балконний блок", tier: false, needsNumber: true, placeholder: "Площа (м²)"},
        {label:"Ні", tier: false}
    ]}
];

export const blockWardrobe = [
    { id: "wardrobe_floor", zone: "ГАРДЕРОБ", text: "Тип підлоги.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.jpeg"}
    ]},
    { id: "wardrobe_walls", zone: "ГАРДЕРОБ", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування",img:"/img/gruntovka.webp"}
    ]},
    { id: "wardrobe_light", zone: "ГАРДЕРОБ", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledgarderob.webp"}
    ]}
];

export const blockBasement = [
    { id: "basement_floor", zone: "ПІДВАЛ", text: "Тип підлоги.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Лінолеум",val:"Лінолеум",img:"/img/linoleum.webp"}
    ]},
    { id: "basement_walls", zone: "ПІДВАЛ", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}
    ]},
    { id: "basement_ceiling", zone: "ПІДВАЛ", text: "Тип стелі.", type: "cards", options: [
        {label:"Натяжна",val:"Натяжна"}, {label:"Гіпсокартон",val:"Гіпсокартон"}, {label:"Побілка",val:"Побілка"}
    ]},
    { id: "basement_light", zone: "ПІДВАЛ", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}
    ]}
];

export const blockAttic = [
    { id: "attic_walls", zone: "ГОРИЩЕ", text: "Стіни.", type: "cards_multiselect", options: [
        {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Обшивка деревʼяними рейками",val:"Обшивка деревʼяними рейками",img:"/img/obshivkaderev.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbzgipso.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}, {label:"ні",val:"ні"}
    ]},
    { id: "attic_floor", zone: "ГОРИЩЕ", text: "Тип підлоги.", type: "cards", options: [
        {label:"Керамограніт",val:"Керамограніт",img:"/img/keramogranit.webp"}, {label:"Кварц вініл",val:"Кварц вініл",img:"/img/kvarzvinil.webp"}, {label:"Ламінат",val:"Ламінат",img:"/img/laminat.jpeg"}, {label:"Інше",val:"Інше"}
    ]},
    { id: "attic_light", zone: "ГОРИЩЕ", text: "Освітлення", type: "cards_multiselect", options: [
        {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}
    ]}
];

export const blockCustomWorks = [
    { id: "custom_works", zone: "⭐️ НЕСТАНДАРТНІ РОБОТИ", text: "Додати індивідуальні роботи?", type: "custom_works_builder" }
];

export function getBathQuestions(index) {
    return [
        { id: `bath_${index}_floor`, zone: `САНВУЗОЛ ${index}`, text: "Плитка на підлогу (формат)", type: "cards", options: [
            { label: "Мозаїка", val: "Мозаїка" }, { label: "Плитка до 120*60", val: "Керамограніт/Плитка до 120*60" }, { label: "Великоформатний", val: "Великоформатний керамограніт" }
        ]},
        { id: `bath_${index}_wall_tile`, zone: `САНВУЗОЛ ${index}`, text: "Плитка на стіни (формат)", type: "cards", options: [
            { label: "Мозаїка", val: "Мозаїка" }, { label: "Плитка до 120*60", val: "Керамограніт/Плитка до 120*60" }, { label: "Великоформатний", val: "Великоформатний керамограніт" }
        ]},
        { id: `bath_${index}_shower`, zone: `САНВУЗОЛ ${index}`, text: "Душ.", type: "cards_multiselect", options: [
            {label:"Піддон (акрил/камінь)",val:"Піддон (акрил/камінь)",img:"/img/piddon.webp"}, {label:"Душовий трап (з плитки)",val:"Душовий трап (з плитки)",img:"/img/plitkadush.webp"}, 
            {label:"Скляна перегородка",val:"Скляна перегородка",img:"/img/sklodush.webp"}, {label:"Скляна конструкція з дверима",val:"Скляна конструкція з дверима",img:"/img/sklodveridush.webp"}, {label:"Не обладнувати",val:"Не обладнувати"}
        ]},
        { id: `bath_${index}_tub`, zone: `САНВУЗОЛ ${index}`, text: "Ванна", type: "cards_with_tier", options: [
            {label:"Акрил",val:"Акрил",img:"/img/vanaakril.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Гідро масаж",val:"Гідро масаж",img:"/img/vanagidromas.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Окремостояча",val:"Окремостояча",img:"/img/okremavana.webp", variants: ['Standard', 'Comfort', 'Premium']}, {label:"Не обладнувати",val:"Не обладнувати"}
        ]},
        { id: `bath_${index}_toilet`, zone: `САНВУЗОЛ ${index}`, text: "Унітаз.", type: "cards_with_tier", options: [
            {label:"Окремостоячий",val:"Окремостоячий",img:"/img/unitazokremo.webp", variants: ['Standard', 'Comfort', 'Premium']}, 
            {label:"Інсталяція",val:"Інсталяція",img:"/img/installunitaz.webp", variants: ['Standard', 'Comfort', 'Premium']},
            {label:"Ні",val:"Ні"}
        ]},
        { id: `bath_${index}_mixer_std`, zone: `САНВУЗОЛ ${index}`, text: "Кількість звичайних змішувачів (шт)", type: "input_number", placeholder: "0" },
        { id: `bath_${index}_mixer_hidden`, zone: `САНВУЗОЛ ${index}`, text: "Змішувачі прихованого монтажу (шт)", type: "input_number", placeholder: "0" },
        { id: `bath_${index}_other`, zone: `САНВУЗОЛ ${index}`, text: "Інші потреби", type: "multiselect_complex", hasOther:false, options: [
            {label:"Гігієнічний душ",tier:true}, {label:"Пральна машина",tier:true}, {label:"Сушильна машина",tier:true}, 
            {label:"Дзеркало з підігрівом",tier:true}, {label:"Бойлер до 100л",tier:true}, {label:"Бойлер непрямого нагріву (до 300л)",tier:true}, {label:"Умивальник з тумбою",tier:true}, 
            {label:"Дзеркало",tier:true}, {label:"Рушникосушка",tier:true}, {label:"Ні",tier:false}
        ]}
    ];
}

export function getRoomQuestions(index) {
    return [
        { id: `room_${index}_floor`, zone: `КІМНАТА ${index}`, text: "Тип підлоги.", type: "cards", options: [
            { label: "Ламінат", val: "Ламінат", img: "/img/laminat.jpeg" }, { label: "Паркет", val: "Паркет", img: "/img/parket.jpeg" },
            { label: "Кварц вініл", val: "Кварц вініл", img: "/img/kvarzvinil.webp" }, { label: "Керамограніт", val: "Керамограніт", img: "/img/keramogranit.webp" }
        ]},
        { id: `room_${index}_walls`, zone: `КІМНАТА ${index}`, text: "Стіни.", type: "cards_multiselect", options: [
            {label:"Шпалери",val:"Шпалери",img:"/img/spaleri.jpeg"}, {label:"Декоративна штукатурка",val:"Декоративна штукатурка",img:"/img/dekorstuk.webp"}, {label:"Фарбування",val:"Фарбування",img:"/img/farbuvannya.webp"}, {label:"Грунтовка без фарбування",val:"Грунтовка без фарбування"}
        ]},
        { id: `room_${index}_light`, zone: `КІМНАТА ${index}`, text: "Освітлення.", type: "cards_multiselect", options: [
            {label:"Точкове світло",val:"Точкове світло",img:"/img/tochkove.webp"}, {label:"Люстра",val:"Люстра",img:"/img/lustra.webp"}, 
            {label:"Трек / Лінія",val:"Трек / Лінія"}, {label:"LED підсвітка",val:"LED підсвітка",img:"/img/ledpidsv.webp"}
        ]},
        { id: `room_${index}_sills`, zone: `КІМНАТА ${index}`, text: "Підвіконня.", type: "cards", options: [
            {label:"Пластик",val:"Пластик"}, {label:"Дерево",val:"Дерево"}, 
            {label:"Штучний камінь",val:"Штучний камінь"}, {label:"Не потребується",val:"Не потребується"}
        ]},
        { id: `room_${index}_decor`, zone: `КІМНАТА ${index}`, text: "Декор.", type: "cards", options: [
            {label:"Панелі гіпсові",val:"Панелі гіпсові",img:"/img/gipspankimn.webp"}, {label:"Панелі ДСП",val:"Панелі ДСП",img:"/img/dsppaneli.webp"}, {label:"ні",val:"ні"}
        ]},
        { id: `room_${index}_other`, zone: `КІМНАТА ${index}`, text: "Інші потреби", type: "multiselect_complex", hasOther:false, options: [
            {label:"Радіатор",tier:true}, {label:"Кондиціонер", tier:true}, {label:"Звукоізоляція", tier:false}
        ]}
    ];
}