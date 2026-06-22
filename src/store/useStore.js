import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // --- СТАН ---
      currentStep: -1,
      client: { name: '', phone: '', object_type: 'Квартира (Новобудова)', address: '', area: '', floor: '1', elevator: 'Немає' },
      answers: {}, // Для старих плоских відповідей (стяжка, загальні питання)
      rooms: [],   // НОВИЙ МАСИВ для візуалізатора

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
    }
  )
);

export default useStore;