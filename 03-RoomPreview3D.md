# Патч 1: палітра + темна тема (src/index.css, src/App.css)

## 1. Видалити src/App.css
І рядок \`import './App.css'\` в App.jsx. Причини: \`#root { max-width:1280px; text-align:center }\` центрує весь текст і обрізає ширину; \`.card { padding:2em }\` конфліктує з .card карток матеріалів.

## 2. Замінити блок токенів у src/index.css

\`\`\`css
:root {
    --bg-color: #F6F5F2;
    --text-color: #16181D;
    --hint-color: #5F6368;
    --link-color: #C2251D;      /* бренд: був iOS-синій #007aff */
    --accent: #C2251D;
    --accent-soft: rgba(194, 37, 29, 0.08);
    --money: #1F7A4D;
    --secondary-bg: #FFFFFF;
    --card-bg: #FFFFFF;
    --border-color: #E4E2DD;
    --zone-badge-bg: #ECEAE5;
    --modal-bg: #FFFFFF;
    --shadow-color: rgba(20, 18, 14, 0.06);
    --stage-bg: #E9E7E2;        /* фон 3D-обгорток */
    --stage-badge-bg: rgba(255, 255, 255, 0.92);
}

body.dark-theme {
    --bg-color: #121316;
    --text-color: #F2F1EE;
    --hint-color: #A3A7AD;
    --link-color: #EF4D43;
    --accent: #EF4D43;
    --accent-soft: rgba(239, 77, 67, 0.12);
    --money: #4CC38A;
    --secondary-bg: #1D1F24;
    --card-bg: #1D1F24;
    --border-color: #33363C;
    --zone-badge-bg: #2A2D33;
    --modal-bg: #1D1F24;
    --shadow-color: rgba(0, 0, 0, 0.35);
    --stage-bg: #26272C;
    --stage-badge-bg: rgba(29, 31, 36, 0.88);
}
\`\`\`

## 3. Точкові заміни жорстких кольорів у index.css
- \`input:focus\` box-shadow: \`rgba(0,122,255,0.15)\` → \`var(--accent-soft)\`
- \`.card.selected\`: \`rgba(10,132,255,0.08)\` → \`var(--accent-soft)\`; тінь \`rgba(10,132,255,0.15)\` → \`var(--shadow-color)\`
- \`.btn-next\` box-shadow: \`rgba(0,122,255,0.3)\` → \`rgba(194,37,29,0.28)\`
- \`.btn-submit\`: \`#34c759\` → \`var(--money)\`; тінь → \`rgba(31,122,77,0.3)\`
- \`#live-cart span.cart-val\`: \`#34c759\` → \`#4CC38A\` (кошик завжди темний)
- \`.edit-btn\` фон: \`rgba(10,132,255,0.1)\` → \`var(--accent-soft)\`
- \`.tag-pill:active\`: сині значення → var(--accent-soft) / var(--accent)
- \`.rpp-hotspot.active\`, \`.r3d-hotspot.active\`: \`#e31e24\` → \`var(--accent)\`
- h3: додати \`font-weight: 800; letter-spacing: -0.02em;\`

## 4. Темна тема 3D-обгорток
\`\`\`css
.r3d-wrap {
    background: var(--stage-bg);            /* був градієнт #fff → #f3f3f0 */
    border: 1px solid var(--border-color);
}
.r3d-badge {
    color: var(--hint-color);
    background: var(--stage-badge-bg);
    border: 1px solid var(--border-color);
}
.r3d-hotspot { background: var(--stage-badge-bg); color: var(--text-color); }
\`\`\`
В ApartmentScene3D.jsx обгортка задана інлайном: \`background:'#ffffff'\` → \`background:'var(--stage-bg)'\`; кнопки ZoomControls і ZoneLabel: #fff/#1c1c1e/#e5e5ea → var(--card-bg)/var(--text-color)/var(--border-color), ACCENT → var(--accent) (у style-об'єктах — просто рядок 'var(--accent)').

Фон самих сцен: у Canvas додати \`<color attach="background" args={[dark ? '#26272C' : '#E9E7E2']} />\` або лишити прозорим — тоді достатньо CSS-фону обгортки. Прапорець dark читати з body.classList.
