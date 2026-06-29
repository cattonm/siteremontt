// src/utils/groupQuestions.js
// Розбиває плаский список питань кімнати (ROOM_QUESTIONS_CONFIG[type]) на
// згруповані секції для акордеону, у стилі Kapitel (Підлога / Стіни / Освітлення...).
// Порядок секцій фіксований і однаковий для всіх типів кімнат, незалежно від
// порядку питань у даних — так UI лишається передбачуваним, навіть якщо
// хтось додасть нове питання в середину масиву.

export const DEFAULT_GROUP = 'Інше';

export const GROUP_ORDER = [
    'Підлога',
    'Стеля',
    'Стіни',
    'Фартух',
    'Сантехніка',
    'Освітлення',
    'Підвіконня',
    'Декор',
    DEFAULT_GROUP,
];

/**
 * @param {Array} questions - масив питань з полем `group` (якщо немає — потрапляє в "Інше")
 * @returns {Array<{ name: string, questions: Array }>}
 */
export function groupQuestions(questions = []) {
    const map = new Map();

    questions.forEach((q) => {
        const groupName = q.group || DEFAULT_GROUP;
        if (!map.has(groupName)) map.set(groupName, []);
        map.get(groupName).push(q);
    });

    const knownNames = GROUP_ORDER.filter((name) => map.has(name));
    const unknownNames = [...map.keys()].filter((name) => !GROUP_ORDER.includes(name));

    return [...knownNames, ...unknownNames].map((name) => ({
        name,
        questions: map.get(name),
    }));
}