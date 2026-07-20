import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // --- СТАН ---
      currentStep: -1,
      client: { name: '', phone: '', object_type: 'Квартира (Новобудова)', address: '', area: '', floor: '1', elevator: 'Немає' },
      answers: {}, // Для старих плоских відповідей (стяжка, загальні питання)
      rooms: [],   // НОВИЙ МАСИВ для візуалізатора
      // ID заявки, яку зараз редагує менеджер (не гостьовий чернетка!).
      // Персистимо його поряд з даними: якщо застосунок закриють і відкриють
      // ЗАНОВО без ?edit_id в URL (наприклад, через кнопку бота), ми маємо
      // спосіб дізнатись, що в сторі — чужа заявка на редагуванні, а не власна
      // нова чернетка. Інакше відправка створювала б ДУБЛЬ замість оновлення.
      editingOrderId: null,
      setEditingOrderId: (id) => set({ editingOrderId: id }),

      // Жива розбивка цін від live_calc: { rooms: {roomId: {work, mat_min}}, general: {work, mat_min} }
      // НЕ персиститься (partialize нижче) — це кеш відповіді сервера.
      liveBreakdown: { rooms: {}, general: null },
      setLiveBreakdown: (bd) => set({ liveBreakdown: bd }),
      // Яка кімната зараз відкрита у візуалізаторі — щоб липка панель
      // кошторису могла показати третю суму саме по ній. Службове,
      // в localStorage не їде.
      activeRoomId: null,
      setActiveRoomId: (id) => set({ activeRoomId: id }),

      // Канал «сфокусуй візуалізатор»: валідація в App і кнопки Summary
      // просять RoomVisualizer вибрати кімнату/відкрити групу.
      // ts — щоб повторний запит на ту саму кімнату теж спрацював.
      visualizerFocus: null,
      requestVisualizerFocus: (roomId, group = null) =>
        set({ visualizerFocus: { roomId, group, ts: Date.now() } }),

      // Останнє видалене приміщення — для «Скасувати» (снекбар 5 сек).
      // Зберігаємо і сам об'єкт, і його позицію, щоб повернути на місце.
      lastRemoved: null,
      duplicateRoom: (id) => set((state) => {
        const src = state.rooms.find((r) => r.id === id);
        if (!src) return {};
        // Глибока копія: інакше нова кімната ділила б масиви (walls, light)
        // зі старою — правки в одній міняли б обидві.
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = `zone_${src.type}_${Date.now()}`;
        const sameType = state.rooms.filter((r) => r.type === src.type).length;
        const base = src.name.replace(/\s+\d+$/, '');   // «Кімната 2» → «Кімната»
        copy.name = `${base} ${sameType + 1}`;
        const idx = state.rooms.findIndex((r) => r.id === id);
        const rooms = [...state.rooms];
        rooms.splice(idx + 1, 0, copy);                  // одразу поруч з оригіналом
        return { rooms, lastDuplicatedId: copy.id };
      }),
      lastDuplicatedId: null,
      removeRoomWithUndo: (id) => set((state) => {
        const idx = state.rooms.findIndex((r) => r.id === id);
        if (idx === -1) return {};
        return {
          rooms: state.rooms.filter((r) => r.id !== id),
          lastRemoved: { room: state.rooms[idx], index: idx, ts: Date.now() },
        };
      }),
      undoRemove: () => set((state) => {
        if (!state.lastRemoved) return {};
        const rooms = [...state.rooms];
        rooms.splice(state.lastRemoved.index, 0, state.lastRemoved.room);
        return { rooms, lastRemoved: null };
      }),
      clearLastRemoved: () => set({ lastRemoved: null }),

      // --- ЕКШЕНИ (Замінники setClient, setAnswers) ---
      setCurrentStep: (step) => set({ currentStep: step }),
      
      // Підтримуємо формат React (коли передається функція prev => new)
      setClient: (updater) => set((state) => ({
        client: typeof updater === 'function' ? updater(state.client) : updater
      })),
      
      setAnswers: (updater) => set((state) => ({
        answers: typeof updater === 'function' ? updater(state.answers) : updater
      })),

      // --- ЕКШЕНИ ДЛЯ ВІЗУАЛІЗАТОРА (На майбутнє) ---
      addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
      updateRoom: (roomId, data) => set((state) => ({
        rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...data } : r)
      })),
      removeRoom: (roomId) => set((state) => ({
        rooms: state.rooms.filter(r => r.id !== roomId)
      })),

      // --- ОЧИСТКА ---
      resetDraftSilent: () => set({
        currentStep: -1,
        client: { name: '', phone: '', object_type: 'Квартира (Новобудова)', address: '', area: '', floor: '1', elevator: 'Немає' },
        answers: {},
        rooms: [],
        lastRemoved: null,
        liveBreakdown: { rooms: {}, general: null },
        activeRoomId: null,
        editingOrderId: null,
      })
    }),
    {
      name: 'remont_draft_storage', // Усі дані автоматично зберігатимуться під цим ключем
      // У localStorage їде лише сама анкета; liveBreakdown/visualizerFocus —
      // службові й живуть тільки в пам'яті сесії.
      partialize: (s) => ({
        currentStep: s.currentStep,
        client: s.client,
        answers: s.answers,
        rooms: s.rooms,
        editingOrderId: s.editingOrderId,
      }),
    }
  )
);

export default useStore;