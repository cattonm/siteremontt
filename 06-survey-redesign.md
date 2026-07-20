# Патч 4: src/components/ApartmentScene3D.jsx

Референс: **plan-prototype.html**.

## 4.1 Паспарту і фон
Обгортка: background '#ffffff' → 'var(--stage-bg)' (див. патч 1). Сцену лишити з прозорим фоном.

## 4.2 Подіум «архітектурного макета»
Під планом додати бетонну плиту (референс concreteTex() у прототипі):
- BoxGeometry [bounds.width+1.6, 0.5, bounds.depth+1.6], y=-0.27, процедурний «бетон» (roughness 0.95)
- тонка темна окантовка знизу: [w+0.14, 0.07, d+0.14], колір #17181C
Тіне-площину (shadowMaterial) опустити на y=-0.54 і збільшити opacity до 0.22 — тінь падає на «стіл», макет «стоїть».

## 4.3 ACES-тонмапінг
Ті самі gl-пропси, що в патчі 3.1. Світло: ambient 0.6 → прибрати, hemisphere 0.4 → 0.75 (groundColor #3a3b42 у dark), directional 0.95 → 2.0.

## 4.4 Лейбли зон
Плашки перевести на токени: background var(--card-bg), колір var(--text-color), межа var(--border-color) / var(--accent) активна, площа — var(--accent). У compact-стані додати м'яку прозорість неактивним (opacity 0.75), при виборі зони решту приглушувати до 0.35 (референс select()).

## 4.5 Приглушення невибраних зон
При activeId: колір підлоги невибраних зон множити на #9a978f (material.color.set), вибраній — рамка ACCENT як зараз. Повертати #ffffff при знятті вибору.

## 4.6 ZoomControls
Кнопки на токени (var(--card-bg)/var(--text-color)/var(--border-color)) — зараз білі жорстко і «світяться» в темній темі.
