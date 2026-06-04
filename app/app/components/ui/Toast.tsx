'use client'
import { useEffect, useState, createContext, useContext, useCallback } from 'react'

type ToastType = 'normal' | 'success' | 'warn' | 'danger'

interface ToastItem {
  id:      string
  message: string
  type:    ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'normal') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const BG: Record<ToastType, string> = {
    normal:  'bg-[#1A1A1A]',
    success: 'bg-[#1E5C3A]',
    warn:    'bg-[#9A6B1E]',
    danger:  'bg-[#8B2020]',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 z-[9999] pointer-events-none px-4">
        {toasts.map((t) => (
          <div key={t.id}
            className={`${BG[t.type]} text-white text-sm px-5 py-2.5 rounded-full shadow-lg
              max-w-xs text-center animate-fade-in whitespace-nowrap`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
