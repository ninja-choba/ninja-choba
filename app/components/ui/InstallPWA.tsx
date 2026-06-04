'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [showIOSGuide, setShowIOSGuide]     = useState(false)
  const [dismissed, setDismissed]           = useState(false)

  useEffect(() => {
    // すでにインストール済みか確認
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOSか確認
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(ios)

    // 非表示にした履歴があるか確認
    if (localStorage.getItem('pwaDismissed') === '1') {
      setDismissed(true)
      return
    }

    // Chrome/Androidのインストールプロンプトを捕捉
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('pwaDismissed', '1')
  }

  // インストール済み・非表示・何も表示しない条件
  if (isInstalled || dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <>
      {/* Chrome/Android用インストールバナー */}
      {deferredPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#1A1A1A] text-white rounded-2xl p-4 shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              <img src="/icons/icon-192.png" alt="忍者帳場" className="w-8 h-8 rounded-lg" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">忍者帳場をインストール</div>
              <div className="text-xs text-gray-400 mt-0.5">ホーム画面から直接起動できます</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={handleInstall}
                className="px-4 py-1.5 bg-white text-[#1A1A1A] rounded-full text-xs font-bold whitespace-nowrap">
                追加
              </button>
              <button onClick={handleDismiss}
                className="px-4 py-1.5 text-gray-400 text-xs text-center">
                後で
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS用インストール案内 */}
      {isIOS && !deferredPrompt && (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="fixed bottom-20 right-4 z-50 bg-[#1A1A1A] text-white rounded-full px-4 py-2.5 text-xs font-medium shadow-lg flex items-center gap-2 animate-fade-in">
            <span>📲</span> アプリとして追加
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end"
              onClick={() => setShowIOSGuide(false)}>
              <div className="bg-white w-full rounded-t-2xl p-6 pb-10"
                onClick={e => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <img src="/icons/apple-touch-icon.png" alt=""
                    className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow" />
                  <div className="font-serif text-lg font-bold">忍者帳場をホーム画面に追加</div>
                </div>

                {[
                  { step: '1', icon: '⬆️', text: 'Safariの下部にある「共有」ボタン（□↑）をタップ' },
                  { step: '2', icon: '📋', text: 'メニューの中から「ホーム画面に追加」をタップ' },
                  { step: '3', icon: '✅', text: '右上の「追加」をタップして完了' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="text-lg mr-2">{item.icon}</span>
                      <span className="text-sm text-[#1A1A1A]">{item.text}</span>
                    </div>
                  </div>
                ))}

                <div className="bg-[#F5F5F5] rounded-xl p-3 text-xs text-[#9A9288] mb-4 text-center">
                  ※ ChromeではなくSafariで開いてください
                </div>

                <button onClick={() => setShowIOSGuide(false)}
                  className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                  閉じる
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
