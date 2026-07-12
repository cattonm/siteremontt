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

      // Жива розбивка цін від live_calc: { rooms: {roomId: {work, mat_min}}, general: {work, mat_min} }
      // НЕ персиститься (partialize нижче) — це кеш відповіді сервера.
      liveBreakdown: { rooms: {}, general: null },
      setLiveBreakdown: (bd) => set({ liveBreakdown: bd }),

      // Канал «сфокусуй візуалізатор»: валідація в App і кнопки Summary
      // просять RoomVisualizer вибрати кімнату/відкрити групу.
      // ts — щоб повторний запит на ту саму кімнату теж спрацював.
      visualizerFocus: null,
      requestVisualizerFocus: (roomId, group = null) =>
        set({ visualizerFocus: { roomId, group, ts: Date.now() } }),

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
        rooms: []
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
      }),
    }
  )
);

export default useStore;