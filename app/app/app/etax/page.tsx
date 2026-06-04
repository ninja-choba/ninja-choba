'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import {
  TimestampStore, runDenchohoChecks, calcPL,
  generateETaxXML, generateJournalCSV, buildAoiroChecklist,
} from '@/lib/etax'

export default function ETaxPage() {
  const { journals, user } = useAppStore()
  const [year, setYear]   = useState(new Date().getFullYear())
  const [tab, setTab]     = useState<'checklist' | 'denchoho' | 'export'>('checklist')

  const eviRate = journals.length > 0
    ? Math.round(journals.filter((j) => j.imgUrl).length / journals.length * 100) : 0
  const tsRate  = TimestampStore.coverageRate(journals.map((j) => ({ id: j.id })))
  const pl      = calcPL(journals, year)
  const checks  = runDenchohoChecks(journals, eviRate, tsRate)
  const aoiro   = buildAoiroChecklist(journals, eviRate, tsRate)
  const allDenchohoOk = checks.every((c) => c.ok)

  function downloadXML() {
    const xml  = generateETaxXML(pl, year, user.business || user.name)
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `忍者帳場_青色申告_${year}.xml`; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadCSV() {
    const csv  = generateJournalCSV(journals, year)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `忍者帳場_仕訳_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const TABS = [
    { id: 'checklist', label: 'チェックリスト' },
    { id: 'denchoho',  label: '電帳法' },
    { id: 'export',    label: 'データ出力' },
  ] as const

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* ヘッダー */}
        <div className="card text-center py-5">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-serif text-lg font-bold">青色申告65万円控除</div>
          <p className="text-xs text-[#6B6459] mt-1">e-Tax連携・電帳法チェック</p>
        </div>

        {/* タブ */}
        <div className="flex bg-[#F5F5F5] rounded-xl p-1 gap-1 mb-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#9A9288]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* チェックリスト */}
        {tab === 'checklist' && (
          <div className="card">
            <div className="font-medium text-sm mb-4">青色申告65万円控除 チェックリスト</div>
            {aoiro.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                  item.done ? 'bg-[#E0F0E8] text-[#1E5C3A]' : 'bg-[#F0F0F0] text-[#9A9288]'
                }`}>
                  {item.done ? '✓' : '○'}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${item.done ? 'text-[#1A1A1A]' : 'text-[#6B6459]'}`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-[#9A9288] mt-0.5">{item.desc}</div>
                  {item.action && (
                    <button onClick={() => setTab('export')}
                      className="text-xs text-[#2F5D50] mt-1 underline bg-transparent border-none cursor-pointer p-0">
                      {item.action} →
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-3 bg-[#FFF8EC] rounded-xl p-3 text-xs text-[#9A6B1E] leading-relaxed">
              ※ 本チェックリストは参考情報です。申告内容・税額は必ず税理士にご確認ください。
            </div>
          </div>
        )}

        {/* 電帳法チェック */}
        {tab === 'denchoho' && (
          <div className="card">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: '証憑保存率', value: `${eviRate}%`, ok: eviRate >= 95 },
                { label: 'タイムスタンプ', value: `${tsRate}%`, ok: tsRate >= 95 },
                { label: '総記録数', value: `${journals.length}件`, ok: true },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-[#F8F8F8] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-[#9A9288] mb-1">{kpi.label}</div>
                  <div className={`text-lg font-bold ${kpi.ok ? 'text-[#1E5C3A]' : 'text-[#9A6B1E]'}`}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 総合判定 */}
            <div className={`rounded-xl p-3 mb-4 text-sm ${allDenchohoOk ? 'bg-[#E8F4F0] text-[#1E5C3A]' : 'bg-[#FFF8EC] text-[#9A6B1E]'}`}>
              <div className="font-medium mb-1">
                {allDenchohoOk ? '✓ 電帳法の基本要件を満たしています' : '⚠ 一部要件を確認してください'}
              </div>
              <div className="text-xs opacity-80">※ 正式判断は税理士・税務署へご確認ください</div>
            </div>

            {/* 5要件 */}
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                <span className={`text-base flex-shrink-0 mt-0.5 ${c.ok ? 'text-[#1E5C3A]' : 'text-[#9A6B1E]'}`}>
                  {c.ok ? '✓' : '⚠'}
                </span>
                <div>
                  <div className={`text-sm font-medium ${c.ok ? 'text-[#1A1A1A]' : 'text-[#9A6B1E]'}`}>{c.label}</div>
                  <div className="text-xs text-[#6B6459] leading-relaxed mt-0.5">{c.desc}</div>
                  <div className="text-[10px] text-[#C0B9AF] mt-1">根拠: {c.law}</div>
                </div>
              </div>
            ))}

            {/* タイムスタンプの案内 */}
            <div className="mt-4 bg-[#F5F5F5] rounded-xl p-4 text-xs text-[#6B6459] leading-relaxed">
              <div className="font-medium text-[#1A1A1A] mb-2">📋 法的なタイムスタンプについて</div>
              電帳法の「真実性の確保」には、国が認定した第三者機関のタイムスタンプが必要な場合があります。<br /><br />
              対応サービス例：セイコーソリューションズ・アマノ・TDT株式会社<br /><br />
              当アプリでは証憑保存時に撮影日時の記録と改ざん検知ハッシュを自動で付与しています。
            </div>
          </div>
        )}

        {/* データ出力 */}
        {tab === 'export' && (
          <div className="space-y-3.5">

            {/* e-Tax申告ガイド */}
            <div className="card">
              <div className="font-medium text-sm mb-3">e-Tax申告の手順</div>
              {[
                { n: '1', title: '利用者識別番号を取得', desc: 'e-Taxを初めて使う場合、税務署またはマイナンバーカードで取得', url: 'https://www.e-tax.nta.go.jp/' },
                { n: '2', title: '決算書データをダウンロード', desc: '下のボタンからXMLまたはCSVをダウンロード', url: '' },
                { n: '3', title: 'e-Taxソフト（Web版）を開く', desc: 'e-Taxソフト(WEB版)にログインし「所得税の確定申告書」を選択', url: 'https://clientweb.e-tax.nta.go.jp/' },
                { n: '4', title: 'データを参照して入力', desc: 'ダウンロードしたデータの数値を参照しながらe-Taxに入力', url: '' },
                { n: '5', title: '送信・受信通知を保存', desc: '申告書を送信し受信通知を保存。これで65万円控除の条件が確定', url: '' },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                  <div className="w-7 h-7 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-[#6B6459] mt-0.5">{step.desc}</div>
                    {step.url && (
                      <a href={step.url} target="_blank" rel="noopener"
                        className="text-xs text-[#2F5D50] mt-1 block">{step.url} →</a>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-3 bg-[#FFF8EC] rounded-xl p-3 text-xs text-[#9A6B1E]">
                ⚠ 申告内容・税額は必ず税理士にご確認ください。
              </div>
            </div>

            {/* 年度選択 */}
            <div className="card">
              <div className="font-medium text-sm mb-3">出力する年度</div>
              <div className="flex gap-2 mb-4">
                {[new Date().getFullYear()-1, new Date().getFullYear()].map((y) => (
                  <button key={y} onClick={() => setYear(y)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                      year === y ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E0D8] text-[#6B6459]'
                    }`}>
                    {y}年
                  </button>
                ))}
              </div>

              {/* P/Lサマリー */}
              <div className="bg-[#F8F8F8] rounded-xl p-4 mb-4 text-sm">
                <div className="text-xs text-[#9A9288] mb-2">{year}年 損益サマリー</div>
                {[
                  { label: '収入合計', value: pl.income, color: 'text-[#1E5C3A]' },
                  { label: '経費合計', value: pl.expense, color: 'text-[#8B2020]' },
                  { label: '所得（概算）', value: pl.profit, color: pl.profit >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-[#EEEEEE] last:border-0">
                    <span className="text-[#6B6459]">{label}</span>
                    <span className={`font-medium ${color}`}>
                      {value >= 0 ? '+' : ''}¥{value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* ダウンロードボタン */}
              <div className="space-y-2">
                <button onClick={downloadXML}
                  className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                  📥 青色申告書 XMLダウンロード
                </button>
                <button onClick={downloadCSV}
                  className="w-full py-3.5 bg-[#F5F5F5] text-[#1A1A1A] rounded-xl text-sm">
                  📊 仕訳CSV（freee・弥生インポート用）
                </button>
              </div>
              <p className="text-[11px] text-[#C0B9AF] text-center mt-3 leading-relaxed">
                XMLはe-Taxソフトへの参照用です。<br />
                直接インポート前に税理士の確認を推奨します。
              </p>
            </div>

          </div>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
