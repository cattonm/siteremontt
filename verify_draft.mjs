// Перевірка реального useStore на сценарії, який дав дубль.
// Шимимо localStorage, бо стор використовує zustand/persist.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
globalThis.window = globalThis;

const { default: useStore } = await import('./src/store/useStore.js');

const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);

// --- Крок 1: менеджер відкрив заявку №42 на редагування ---
useStore.setState({
  client: { name: 'Клієнт', phone: '050', object_type: 'Квартира', address: 'вул. Тестова', area: '50', floor: '2', elevator: 'Є' },
  answers: { ceiling: 'Натяжна' },
  rooms: [{ id: 1, name: 'Кухня' }],
  currentStep: 9999,
  editingOrderId: '42',
});
let s = useStore.getState();
if (s.editingOrderId !== '42') fail('editingOrderId не виставився');
else ok('редагування заявки №42 позначено в сторі');

// --- Крок 2: збереження успішне -> застосунок робить повне очищення ---
useStore.getState().resetDraftSilent();
s = useStore.getState();

if (s.editingOrderId !== null) fail('після збереження editingOrderId НЕ очищено');
else ok('editingOrderId очищено');

if (s.currentStep !== -1) fail(`currentStep лишився ${s.currentStep} — промпт «продовжити» знову спливе`);
else ok('currentStep скинуто (промпт «продовжити» НЕ покажеться)');

if (s.client.name !== '' || s.client.address !== '') fail('дані клієнта лишились у чернетці');
else ok('дані клієнта очищено');

if (Object.keys(s.answers).length !== 0) fail('відповіді лишились у чернетці');
else ok('відповіді очищено');

if (s.rooms.length !== 0) fail('кімнати лишились у чернетці');
else ok('кімнати очищено');

// --- Крок 3: те, що реально потрапляє в localStorage (persist) ---
const raw = mem.get('remont_draft_storage');
const persisted = raw ? JSON.parse(raw).state : {};
if (persisted.editingOrderId || (persisted.currentStep ?? -1) > -1) {
  fail(`у localStorage лишився слід: currentStep=${persisted.currentStep}, editingOrderId=${persisted.editingOrderId}`);
} else {
  ok('localStorage чистий — після перезапуску застосунку дубля не буде');
}

// --- Крок 4: логіка вибору update vs create (як у submit) ---
const resolveEditId = (urlEditId) => urlEditId || useStore.getState().editingOrderId;
if (resolveEditId(null) !== null) fail('після збереження submit усе ще вважав би це редагуванням');
else ok('нова заявка піде як СТВОРЕННЯ (create), не оновлення');

useStore.setState({ editingOrderId: '77' });
if (resolveEditId(null) !== '77') fail('покинуте редагування не розпізналось -> був би дубль');
else ok('покинуте редагування (без edit_id в URL) піде як ОНОВЛЕННЯ заявки №77');

console.log(process.exitCode ? '\nЄ ПОМИЛКИ' : '\nУсі перевірки пройдено');
