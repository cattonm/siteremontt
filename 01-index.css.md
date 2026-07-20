# Handoff: покращення siteremontt (палітра, темна тема, 3D)

## Overview
Пакет реалізує план з аудиту (розділ 6, пункти 1–7): єдина брендова палітра, лагодження темної теми в 3D-блоках, реалістичніший рендеринг обох 3D-сцен (ACES-тонмапінг, PBR roughness-карти, damping), режим від першої особи в прев'ю кімнати та «архітектурний макет» для плану квартири.

Цільовий репозиторій: **github.com/cattonm/siteremontt** (React 19 + Vite, @react-three/fiber + drei, Zustand).

## About the Design Files
\`room-prototype.html\` та \`plan-prototype.html\` — **дизайн-референси в HTML** (vanilla three.js), НЕ продакшн-код. Завдання — перенести показані техніки у наявні React-компоненти репозиторію (\`RoomPreview3D.jsx\`, \`ApartmentScene3D.jsx\`, \`proceduralTextures.js\`), зберігаючи існуючу архітектуру: frameloop="demand", процедурні текстури, props-only читання стору.

## Fidelity
**High-fidelity** щодо палітри й токенів (точні hex у patches/01). 3D-прототипи — hi-fi референс освітлення/матеріалів/камери; геометрію меблів адаптувати до наявних FURNITURE_LAYOUTS, не копіювати.

## Порядок виконання (кожен пункт = окремий комміт)
1. **patches/01-index.css.md** — палітра + темна тема 3D-обгорток. Також: видалити \`src/App.css\` та його import в App.jsx (залишок Vite-шаблону: \`#root{text-align:center}\` і конфліктний \`.card\`).
2. **patches/02-roughness-maps.js** — roughness-карти в proceduralTextures.js (новий експорт \`getSurfaceRoughness\`).
3. **patches/03-RoomPreview3D.md** — тонмапінг, damping, roughness, контактні тіні, перша особа.
4. **patches/04-ApartmentScene3D.md** — макет-подіум, темне паспарту, стиль лейблів.
5. **patches/05-walk-mode.md** — прогулянка кімнатою: замкнена кімната зі стелею, WASD/джойстик, колізії. Референс: room-walk-prototype.html.
6. **patches/06-survey-redesign.md** — редизайн анкети (телефон+планшет): степер-шапка, глобальний тумблер S/C/P, липка панель кошторису, фікс семантики rough_plaster_done.

## Design Tokens (light / dark)
| Токен | Light | Dark | Роль |
|---|---|---|---|
| --accent | #C2251D | #EF4D43 | бренд, головна дія (замінює #007aff, #0a84ff, #e31e24) |
| --ink (text-color) | #16181D | #F2F1EE | текст |
| --muted (hint-color) | #5F6368 | #A3A7AD | хінти (контраст ≥4.5:1) |
| --paper (bg-color) | #F6F5F2 | #121316 | фон |
| --card (card-bg/secondary-bg) | #FFFFFF | #1D1F24 | картки |
| --line (border-color) | #E4E2DD | #33363C | межі |
| --money | #1F7A4D | #4CC38A | лише суми/сабміт (замінює #34c759) |
| --stage-bg | #E9E7E2 | #26272C | фон 3D-обгорток (.r3d-wrap, план) |

Типографіка: системний стек залишити; h3 → font-weight:800, letter-spacing:-0.02em.

## Interactions & Behavior (нове)
- **Режим «Зайти в кімнату»** (RoomPreview3D): кнопка-пігулка поверх канваса праворуч угорі; клік — камера за ~900 мс (easeInOutQuad) летить у точку [W*0.78, 1.6, D*0.86]; у цьому режимі OrbitControls працює як look-around (rotateSpeed від'ємний, min/maxDistance ≈ 0.01–0.05, полярні межі 55–110°); зворотна кнопка повертає орбітальні межі. Референс: функції setMode/lerpCam у room-prototype.html.
- **Damping**: enableDamping + dampingFactor 0.08 в обох сценах. З frameloop="demand" інерція потребує кадрів: у onChange контролів викликати invalidate() і продовжувати ще ~1с після pointerup (або перейти на frameloop="always" лише поки триває взаємодія).
- **Вибір кімнати на плані**: невибрані зони приглушуються (колір підлоги → #9a978f, лейбли opacity 0.35). Референс: select() у plan-prototype.html.

## State Management
Нового стану в сторі не треба. Режим камери (orbit/fp) — локальний useState у RoomPreview3D.

## Assets
Немає нових файлів. Всі текстури процедурні. Попутно (аудит п.8): видалити public/textures/koroid.jpg, laminat.jpeg, parket.jpeg (є webp-дублікати) та каталог .vite/ з git.

## Backend
Патчі 1–4 бекенду не торкаються. Єдиний пункт аудиту, де потрібен бекенд — винесення прайсу (questions.js) в JSON-ендпоінт; для нього потрібне посилання на API (запитати у власника).

## Files
- room-prototype.html — референс кімнати (матеріали/світло/перша особа)
- room-walk-prototype.html — референс прогулянки (стеля, хода, колізії, джойстик)
- plan-prototype.html — референс плану (подіум/лейбли/вибір зони)
- patches/01-index.css.md, 02-roughness-maps.js, 03-RoomPreview3D.md, 04-ApartmentScene3D.md, 05-walk-mode.md, 06-survey-redesign.md
