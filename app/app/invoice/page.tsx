'use client'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

interface Invoice {
  id:          string
  client:      string
  title:       string
  amount:      number
  issueDate:   string
  dueDate:     string
  status:      'unpaid' | 'paid' | 'overdue'
  memo:        string
}

const STATUS_LABEL: Record<Invoice['status'], string> = {
  unpaid:  '未入金',
  paid:    '入金済',
  overdue: '期限超過',
}

const STATUS_COLOR: Record<Invoice['status'], string> = {
  unpaid:  'bg-[#F5EDD8] text-[#9A6B1E]',
  paid:    'bg-[#E0F0E8] text-[#1E5C3A]',
  overdue: 'bg-[#F5E0E0] text-[#8B2020]',
}

export default function InvoicePage() {
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)

  const [client, setClient]     = useState('')
  const [title, setTitle]       = useState('')
  const [amount, setAmount]     = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0,10))
  const [dueDate, setDueDate]   = useState('')
  const [memo, setMemo]         = useState('')

  function addInvoice() {
    if (!client || !amount) { showToast('取引先と金額を入力してください'); return }
    const newInvoice: Invoice = {
      id:        crypto.randomUUID(),
      client, title, memo,
      amount:    Number(amount),
      issueDate, dueDate,
      status:    'unpaid',
    }
    setInvoices((prev) => [newInvoice, ...prev])
    setShowForm(false)
    setClient(''); setTitle(''); setAmount(''); setMemo(''); setDueDate('')
  }

  function updateStatus(id: string, status: Invoice['status']) {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
  }

  function deleteInvoice(id: string) {
    if (!confirm('削除しますか？')) return
    setInvoices((prev) => prev.filter((i) => i.id !== id))
  }

  const unpaidTotal = invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0)
  const overdueCount = invoices.filter((i) => {
    if (i.status !== 'unpaid' || !i.dueDate) return false
    return new Date(i.dueDate) < new Date()
  }).length

  // 期限超過を自動更新
  const invoicesWithStatus = invoices.map((i) => ({
    ...i,
    status: (i.status === 'unpaid' && i.dueDate && new Date(i.dueDate) < new Date())
      ? 'overdue' as const : i.status,
  }))

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* サマリー */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif text-lg font-bold">請求書管理</div>
            <button onClick={() => setShowForm(!showForm)}
              className="text-xs text-white bg-[#1A1A1A] px-3 py-1.5 rounded-full">
              ＋ 請求書作成
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5EDD8] rounded-xl p-3 text-center">
              <div className="text-xs text-[#9A6B1E] mb-1">未入金合計</div>
              <div className="text-lg font-bold text-[#9A6B1E]">¥{unpaidTotal.toLocaleString()}</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${overdueCount > 0 ? 'bg-[#F5E0E0]' : 'bg-[#F0F0F0]'}`}>
              <div className={`text-xs mb-1 ${overdueCount > 0 ? 'text-[#8B2020]' : 'text-[#6B6459]'}`}>期限超過</div>
              <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-[#8B2020]' : 'text-[#1A1A1A]'}`}>
                {overdueCount}件
              </div>
            </div>
          </div>
        </div>

        {/* 請求書作成フォーム */}
        {showForm && (
          <div className="card space-y-3">
            <div className="font-medium text-sm">請求書を作成</div>
            {[
              { label: '取引先 *', val: client, set: setClient, placeholder: '株式会社〇〇' },
              { label: '件名',     val: title,  set: setTitle,  placeholder: '〇〇業務委託費' },
              { label: 'メモ',     val: memo,   set: setMemo,   placeholder: '任意' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="text-xs text-[#6B6459] block mb-1">{label}</label>
                <input className="form-input" type="text" value={val}
                  onChange={(e) => set(e.target.value)} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">金額（円）*</label>
              <input className="form-input" type="number" inputMode="numeric"
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">発行日</label>
                <input className="form-input" type="date" value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">支払期限</label>
                <input className="form-input" type="date" value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addInvoice}
                className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                作成
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 請求書一覧 */}
        {invoicesWithStatus.length === 0 ? (
          <div className="text-center py-12 text-[#9A9288]">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm">請求書を作成してください</p>
          </div>
        ) : (
          invoicesWithStatus.map((inv) => (
            <div key={inv.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm">{inv.client}</div>
                  {inv.title && <div className="text-xs text-[#9A9288] mt-0.5">{inv.title}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inv.status]}`}>
                  {STATUS_LABEL[inv.status]}
                </span>
              </div>

              <div className="text-xl font-bold mb-2">¥{inv.amount.toLocaleString()}</div>

              <div className="flex gap-4 text-xs text-[#9A9288] mb-3">
                <span>発行 {inv.issueDate}</span>
                {inv.dueDate && <span>期限 {inv.dueDate}</span>}
              </div>

              <div className="flex gap-2">
                {inv.status !== 'paid' && (
                  <button onClick={() => updateStatus(inv.id, 'paid')}
                    className="flex-1 py-2 bg-[#E0F0E8] text-[#1E5C3A] rounded-xl text-xs font-medium">
                    入金済にする
                  </button>
                )}
                {inv.status === 'paid' && (
                  <button onClick={() => updateStatus(inv.id, 'unpaid')}
                    className="flex-1 py-2 bg-[#F0F0F0] text-[#6B6459] rounded-xl text-xs">
                    未入金に戻す
                  </button>
                )}
                <button onClick={() => deleteInvoice(inv.id)}
                  className="px-4 py-2 border border-[#E5E0D8] rounded-xl text-xs text-[#9A9288]">
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
