import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Journal, Plan, Property, CashflowPlan, UserState } from '@/types/database'

interface AppStore {
  // ユーザー
  user: UserState
  setUser: (user: Partial<UserState>) => void
  clearUser: () => void

  // 仕訳
  journals: Journal[]
  setJournals: (journals: Journal[]) => void
  addJournal: (journal: Journal) => void
  updateJournal: (id: string, journal: Partial<Journal>) => void
  deleteJournal: (id: string) => void

  // 不動産
  properties: Property[]
  setProperties: (properties: Property[]) => void
  addProperty: (property: Property) => void
  deleteProperty: (id: string) => void

  // 資金繰り計画
  cashflowPlan: CashflowPlan[]
  setCashflowPlan: (plan: CashflowPlan[]) => void
  addCashflowItem: (item: CashflowPlan) => void
  deleteCashflowItem: (id: string) => void

  // 設定
  bankBalance: number
  setBankBalance: (balance: number) => void
  apiKey: string
  setApiKey: (key: string) => void

  // UI状態
  currentTab: string
  setCurrentTab: (tab: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const defaultUser: UserState = {
  userId:   null,
  email:    null,
  plan:     'free',
  name:     '',
  business: '',
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // ユーザー
      user: defaultUser,
      setUser: (u) => set((s) => ({ user: { ...s.user, ...u } })),
      clearUser: () => set({ user: defaultUser, journals: [], properties: [] }),

      // 仕訳
      journals: [],
      setJournals: (journals) => set({ journals }),
      addJournal: (journal) => set((s) => ({ journals: [journal, ...s.journals] })),
      updateJournal: (id, data) => set((s) => ({
        journals: s.journals.map((j) => j.id === id ? { ...j, ...data } : j)
      })),
      deleteJournal: (id) => set((s) => ({
        journals: s.journals.filter((j) => j.id !== id)
      })),

      // 不動産
      properties: [],
      setProperties: (properties) => set({ properties }),
      addProperty: (property) => set((s) => ({ properties: [...s.properties, property] })),
      deleteProperty: (id) => set((s) => ({
        properties: s.properties.filter((p) => p.id !== id)
      })),

      // 資金繰り
      cashflowPlan: [],
      setCashflowPlan: (cashflowPlan) => set({ cashflowPlan }),
      addCashflowItem: (item) => set((s) => ({ cashflowPlan: [...s.cashflowPlan, item] })),
      deleteCashflowItem: (id) => set((s) => ({
        cashflowPlan: s.cashflowPlan.filter((p) => p.id !== id)
      })),

      // 設定
      bankBalance: 0,
      setBankBalance: (bankBalance) => set({ bankBalance }),
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),

      // UI
      currentTab: 'dashboard',
      setCurrentTab: (currentTab) => set({ currentTab }),
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'ninja-chouba-store',
      partialize: (state) => ({
        user:         state.user,
        bankBalance:  state.bankBalance,
        apiKey:       state.apiKey,
        cashflowPlan: state.cashflowPlan,
        properties:   state.properties,
      }),
    }
  )
)
