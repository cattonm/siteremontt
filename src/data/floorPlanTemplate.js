// src/data/floorPlanTemplate.js
// Кімнати групуються у горизонтальні "ряди" (rows) — це імітує реальну
// логіку розташування приміщень одне відносно одного, а не випадкове пакування.
// anchorRowId / anchorAspectRatio визначають загальну ширину "будівлі".

export const DEFAULT_TEMPLATE = {
    id: 'default',
    anchorRowId: 'living',
    anchorAspectRatio: 1.7, // співвідношення ширина/глибина анкорного ряду
    rows: [
        { id: 'living', roomTypes: ['room', 'kitchen'] },          // спільна житлова зона
        { id: 'utility', roomTypes: ['hallway'] },                  // коридор на всю ширину
        { id: 'wet', roomTypes: ['bath', 'wardrobe', 'balcony'] },  // санвузол/гардероб/балкон
        { id: 'extra', roomTypes: ['basement', 'attic'] }           // підвал/мансарда — окремий ряд
    ]
};

// Якщо тип кімнати не входить в жоден ряд — додаємо її в останній ряд,
// щоб застосунок не "ламався" на нетипових комбінаціях кімнат.
export function resolveRowForType(template, type) {
    const row = template.rows.find(r => r.roomTypes.includes(type));
    return row ? row.id : template.rows[template.rows.length - 1].id;
}