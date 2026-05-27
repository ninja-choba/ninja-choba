'use client'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import type { Property, SimulationParams, SimulationResult, SimulationRow } from '@/types/database'
import { PLAN_CONFIGS } from '@/types/database'

const PROPERTY_TYPES = ['マンション','アパート','戸建て','店舗','駐車場','土地']

/* ── 減価償却・シミュレーション計算 ── */
function calcSim(p: SimulationParams): SimulationResult {
  const buildingValue = p.price * (p.buildingRatio / 100)
  const landValue     = p.price - buildingValue
  const legalLife     = p.structure === 'rc' ? 47 : p.structure === 'steel' ? 34 : 22
  const remainLife    = p.age > 0
    ? Math.max(2, Math.floor((legalLife - p.age) + p.age * 0.2)) : legalLife
  const annualDep     = Math.round(buildingValue / remainLife)

  const rate        = (p.interestRate / 100) / 12
  const termMonths  = p.loanYears * 12
  const monthly     = p.loanAmount > 0 && rate > 0
    ? Math.round(p.loanAmount * rate * Math.pow(1+rate, termMonths) / (Math.pow(1+rate, termMonths)-1))
    : p.loanAmount > 0 ? Math.round(p.loanAmount / termMonths) : 0
  const annualPay   = monthly * 12
  let remainLoan    = p.loanAmount

  const rows: SimulationRow[] = []
  for (let yr = 1; yr <= p.years; yr++) {
    const rentDecline = Math.pow(1 - p.rentDeclineRate / 100, yr - 1)
    const annualRent  = Math.round(p.monthlyRent * 12 * (1 - p.vacancyRate / 100) * rentDecline)
    const otherIncome = (p.otherMonthlyIncome || 0) * 12

    let annualInterest = 0, annualPrincipal = 0
    if (yr <= p.loanYears && p.loanAmount > 0) {
      let tmp = remainLoan
      for (let m = 0; m < 12; m++) {
        const int = Math.round(tmp * rate)
        const prin = monthly - int
        annualInterest  += int
        annualPrincipal += prin
        tmp = Math.max(0, tmp - prin)
      }
      remainLoan = tmp
    }

    const propTax   = p.propertyTax
    const mgmtFee   = Math.round((p.managementRate / 100) * annualRent)
    const insurance = p.insurance
    const repairRsv = p.repairReserve
    const repairMul = 1 + Math.floor((p.age + yr - 1) / 10) * 0.3
    const annualRep = Math.round(p.annualRepair * repairMul)
    const majorRep  = yr % 10 === 0 ? p.majorRepair : 0

    const cashOut   = annualInterest + propTax + mgmtFee + insurance + repairRsv + annualRep + majorRep
    const taxIncome = annualRent + otherIncome - annualInterest - annualDep - propTax - mgmtFee - insurance - annualRep - majorRep
    const incomeTax = taxIncome > 0 ? Math.round(taxIncome * (p.taxRate / 100)) : 0
    const cashIn    = annualRent + otherIncome
    const netCF     = cashIn - (yr <= p.loanYears ? annualPay : 0) - propTax - mgmtFee - insurance - repairRsv - annualRep - majorRep - incomeTax

    rows.push({
      year: yr, annualRent, otherIncome, cashInflow: cashIn,
      annualInterest, annualPrincipal, annualPayment: yr <= p.loanYears ? annualPay : 0,
      remainingLoan: remainLoan, propertyTax: propTax, managementFee: mgmtFee,
      insurance, repairReserve: repairRsv, annualRepair: annualRep, majorRepair: majorRep,
      cashOutflow: Math.round(cashOut), annualDepreciation: annualDep,
      taxableIncome: Math.round(taxIncome), incomeTax, netCashflow: Math.round(netCF),
      grossYield: (annualRent / p.price * 100).toFixed(2),
      netYield:   (netCF / (p.price - p.loanAmount) * 100).toFixed(2),
      cumulativeCashflow: 0,
    })
  }

  let cum = -(p.price - p.loanAmount) - (p.initialCost || 0)
  let breakEvenYear: number | null = null
  rows.forEach((r) => {
    cum += r.netCashflow
    r.cumulativeCashflow = cum
    if (cum >= 0 && breakEvenYear === null) breakEvenYear = r.year
  })

  return {
    rows, breakEvenYear, legalLife, remainLife,
    annualDepreciation: annualDep, monthlyPayment: monthly,
    landValue: Math.round(landValue), buildingValue: Math.round(buildingValue),
    assetValue30: Math.round(landValue),
    equity30: Math.round(landValue - (remainLoan > 0 ? remainLoan : 0)),
    selfFund: p.price - p.loanAmount + (p.initialCost || 0),
  }
}

const DEFAULT_PARAMS: SimulationParams = {
  price: 30000000, buildingRatio: 70, age: 10, structure: 'rc',
  monthlyRent: 150000, otherMonthlyIncome: 0, vacancyRate: 5, rentDeclineRate: 0.5,
  loanAmount: 24000000, interestRate: 1.5, loanYears: 35, initialCost: 1000000,
  propertyTax: 150000, managementRate: 5, insurance: 50000, repairReserve: 20000,
  annualRepair: 50000, majorRepair: 1000000, taxRate: 30, years: 30,
}

export default function RealEstatePage() {
  const { showToast } = useToast()
  const { user, properties, addProperty, deleteProperty } = useAppStore()
  const plan = PLAN_CONFIGS[user.plan]

  const [showAddProp, setShowAddProp]   = useState(false)
  const [showSim, setShowSim]           = useState(false)
  const [simParams, setSimParams]       = useState<SimulationParams>(DEFAULT_PARAMS)
  const [simResult, setSimResult]       = useState<SimulationResult | null>(null)

  // 物件追加フォーム
  const [pName, setPName]     = useState('')
  const [pType, setPType]     = useState('マンション')
  const [pAddr, setPAddr]     = useState('')
  const [pRent, setPRent]     = useState('')
  const [pMgmt, setPMgmt]     = useState('')
  const [pTax, setPTax]       = useState('')
  const [pPrice, setPPrice]   = useState('')
  const [pAge, setPAge]       = useState('')
  const [pRenting, setPRenting] = useState(true)

  function saveProperty() {
    if (!pName) { showToast('物件名を入力してください'); return }
    addProperty({
      id: crypto.randomUUID(),
      name: pName, type: pType, address: pAddr,
      rent: Number(pRent) || 0, mgmt: Number(pMgmt) || 0,
      propTax: Number(pTax) || 0, price: Number(pPrice) || 0,
      age: Number(pAge) || 0, renting: pRenting,
      createdAt: new Date().toISOString(),
    })
    setShowAddProp(false)
    setPName(''); setPAddr(''); setPRent(''); setPMgmt('')
    setPTax(''); setPPrice(''); setPAge('')
  }

  function setParam(key: keyof SimulationParams, val: string) {
    setSimParams((p) => ({ ...p, [key]: key === 'structure' ? val : Number(val) }))
  }

  function runSim() {
    setSimResult(calcSim(simParams))
  }

  // 収支サマリー
  const totalRent    = properties.filter((p) => p.renting).reduce((s, p) => s + p.rent * 12, 0)
  const totalExpense = properties.reduce((s, p) => s + p.mgmt * 12 + p.propTax, 0)

  if (!plan.hasRealEstate) {
    return (
      <div className="min-h-dvh pb-20 bg-white">
        <TopBar />
        <div className="max-w-lg mx-auto px-4 pt-20 text-center">
          <div className="text-4xl mb-4">🏯</div>
          <div className="font-serif text-xl font-bold mb-2">プロアセット限定機能</div>
          <p className="text-sm text-[#6B6459] mb-6">不動産管理はプロアセットプランでご利用いただけます。</p>
          <a href="/plan" className="btn-primary inline-block w-auto px-8">プランを見る</a>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* 収支サマリー */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif text-lg font-bold">不動産管理</div>
            <button onClick={() => setShowSim(!showSim)}
              className="text-xs text-white bg-[#2F5D50] px-3 py-1.5 rounded-full">
              📊 シミュレーション
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F0F8F4] rounded-xl p-3 text-center">
              <div className="text-xs text-[#6B6459] mb-1">年間家賃収入</div>
              <div className="text-lg font-bold text-[#1E5C3A]">¥{totalRent.toLocaleString()}</div>
            </div>
            <div className="bg-[#FFF0F0] rounded-xl p-3 text-center">
              <div className="text-xs text-[#6B6459] mb-1">年間経費概算</div>
              <div className="text-lg font-bold text-[#8B2020]">¥{totalExpense.toLocaleString()}</div>
            </div>
          </div>
          {properties.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex justify-between text-sm">
              <span className="text-[#6B6459]">不動産所得概算</span>
              <span className={`font-bold ${totalRent - totalExpense >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}`}>
                ¥{(totalRent - totalExpense).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* シミュレーション */}
        {showSim && (
          <div className="card">
            <div className="font-serif text-base font-bold mb-4">新物件収支シミュレーション</div>

            <div className="space-y-3 mb-4">
              {[
                { label: '物件価格（万円）', key: 'price', div: 10000 },
                { label: '建物比率（%）', key: 'buildingRatio', div: 1 },
                { label: '築年数', key: 'age', div: 1 },
                { label: '月額家賃（万円）', key: 'monthlyRent', div: 10000 },
                { label: '空室率（%）', key: 'vacancyRate', div: 1 },
                { label: '借入金額（万円）', key: 'loanAmount', div: 10000 },
                { label: '金利（%/年）', key: 'interestRate', div: 1 },
                { label: '返済期間（年）', key: 'loanYears', div: 1 },
                { label: '固定資産税（万円/年）', key: 'propertyTax', div: 10000 },
                { label: '年間修繕費（万円）', key: 'annualRepair', div: 10000 },
                { label: '大規模修繕（万円/10年）', key: 'majorRepair', div: 10000 },
                { label: '実効税率（%）', key: 'taxRate', div: 1 },
              ].map(({ label, key, div }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-xs text-[#6B6459] w-32 shrink-0">{label}</label>
                  <input type="number" inputMode="decimal"
                    className="form-input flex-1"
                    value={simParams[key as keyof SimulationParams] as number / div}
                    onChange={(e) => setParam(key as keyof SimulationParams, String(Number(e.target.value) * div))}
                  />
                </div>
              ))}

              <div className="flex items-center gap-3">
                <label className="text-xs text-[#6B6459] w-32 shrink-0">構造</label>
                <select className="form-select flex-1" value={simParams.structure}
                  onChange={(e) => setParam('structure', e.target.value)}>
                  <option value="wood">木造（22年）</option>
                  <option value="steel">軽鉄（34年）</option>
                  <option value="rc">RC・鉄骨（47年）</option>
                </select>
              </div>
            </div>

            <button onClick={runSim} className="btn-primary mb-4">📊 シミュレーション実行</button>

            {simResult && (
              <div className="space-y-3">
                {/* KPIサマリー */}
                <div className="bg-[#1A1A1A] rounded-xl p-4 text-white">
                  <div className="text-xs text-[#9A9288] mb-3">シミュレーション結果</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '自己資金', value: `${Math.round(simResult.selfFund/10000)}万円` },
                      { label: '月次返済', value: `${Math.round(simResult.monthlyPayment/10000*10)/10}万円` },
                      { label: '表面利回り', value: `${simResult.rows[0]?.grossYield}%`, color: '#F0D080' },
                      { label: '実質利回り', value: `${simResult.rows[0]?.netYield}%`,
                        color: parseFloat(simResult.rows[0]?.netYield ?? '0') >= 0 ? '#9ADDC8' : '#FF9090' },
                      { label: '損益分岐', value: simResult.breakEvenYear ? `${simResult.breakEvenYear}年目` : '30年超',
                        color: simResult.breakEvenYear ? '#9ADDC8' : '#FF9090' },
                      { label: '30年累積CF', value: `${simResult.rows[simResult.rows.length-1]?.cumulativeCashflow >= 0 ? '+' : ''}${Math.round((simResult.rows[simResult.rows.length-1]?.cumulativeCashflow ?? 0)/10000)}万円`,
                        color: (simResult.rows[simResult.rows.length-1]?.cumulativeCashflow ?? 0) >= 0 ? '#9ADDC8' : '#FF9090' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white/10 rounded-xl p-3">
                        <div className="text-[10px] text-[#9A9288] mb-1">{kpi.label}</div>
                        <div className="text-sm font-bold" style={{ color: kpi.color ?? '#fff' }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 税務情報 */}
                <div className="bg-[#FFF8EC] rounded-xl p-4 text-sm">
                  <div className="font-medium text-[#9A6B1E] mb-2">📋 税務情報（1年目）</div>
                  {[
                    { label: '法定耐用年数', value: `${simResult.legalLife}年` },
                    { label: '残存耐用年数', value: `${simResult.remainLife}年` },
                    { label: '年間減価償却費', value: `¥${Math.round(simResult.annualDepreciation/10000)}万円` },
                    { label: '1年目不動産所得', value: `${(simResult.rows[0]?.taxableIncome ?? 0) >= 0 ? '+' : ''}¥${Math.round((simResult.rows[0]?.taxableIncome ?? 0)/10000)}万円` },
                    { label: '1年目概算税額', value: `¥${Math.round((simResult.rows[0]?.incomeTax ?? 0)/10000)}万円` },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-1.5 border-b border-[#F5E8CC] last:border-0">
                      <span className="text-[#6B6459]">{r.label}</span>
                      <span className="font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* 年次表 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 400 }}>
                    <thead>
                      <tr className="bg-[#2F5D50] text-white">
                        <th className="text-left p-2">年</th>
                        <th className="text-right p-2">家賃収入</th>
                        <th className="text-right p-2">支出</th>
                        <th className="text-right p-2">当年CF</th>
                        <th className="text-right p-2">累積CF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1,5,10,15,20,30].filter((y) => y <= simParams.years).map((y) => {
                        const row = simResult.rows[y-1]
                        if (!row) return null
                        const w = (v: number) => Math.round(v/10000).toLocaleString()
                        return (
                          <tr key={y} className={`border-b border-[#F0F0F0] ${y%2===0?'bg-[#F8F8F8]':''}`}>
                            <td className="p-2 font-medium">{y}年目</td>
                            <td className="p-2 text-right text-[#1E5C3A]">{w(row.annualRent)}万</td>
                            <td className="p-2 text-right">{w(row.cashOutflow)}万</td>
                            <td className={`p-2 text-right font-medium ${row.netCashflow >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}`}>
                              {row.netCashflow >= 0 ? '+' : ''}{w(row.netCashflow)}万
                            </td>
                            <td className={`p-2 text-right font-bold ${row.cumulativeCashflow >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}`}>
                              {row.cumulativeCashflow >= 0 ? '+' : ''}{w(row.cumulativeCashflow)}万
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-[#9A9288] text-center pb-2">
                  ※ 概算シミュレーションです。投資判断・税務申告は必ず専門家にご相談ください。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 物件一覧 */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-[#6B6459]">物件一覧</div>
          <button onClick={() => setShowAddProp(!showAddProp)}
            className="text-xs text-white bg-[#1A1A1A] px-3 py-1.5 rounded-full">
            ＋ 物件追加
          </button>
        </div>

        {showAddProp && (
          <div className="card space-y-3">
            <div className="font-medium text-sm mb-1">物件を追加</div>
            {[
              { label: '物件名', val: pName, set: setPName, placeholder: '例：渋谷マンション101' },
              { label: '住所',   val: pAddr, set: setPAddr, placeholder: '例：東京都渋谷区' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="text-xs text-[#6B6459] block mb-1">{label}</label>
                <input className="form-input" type="text" value={val}
                  onChange={(e) => set(e.target.value)} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">種別</label>
              <select className="form-select" value={pType} onChange={(e) => setPType(e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {[
              { label: '月額家賃（円）', val: pRent, set: setPRent },
              { label: '管理費（円/月）', val: pMgmt, set: setPMgmt },
              { label: '固定資産税（円/年）', val: pTax, set: setPTax },
              { label: '取得価格（円）', val: pPrice, set: setPPrice },
              { label: '築年数', val: pAge, set: setPAge },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs text-[#6B6459] block mb-1">{label}</label>
                <input className="form-input" type="number" inputMode="numeric"
                  value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pRenting} onChange={(e) => setPRenting(e.target.checked)} />
              現在賃貸中
            </label>
            <div className="flex gap-2">
              <button onClick={saveProperty}
                className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                追加
              </button>
              <button onClick={() => setShowAddProp(false)}
                className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div className="text-center py-12 text-[#9A9288]">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-sm">物件を追加してください</p>
          </div>
        ) : (
          properties.map((prop) => {
            const annualRent = prop.rent * 12
            const annualExp  = prop.mgmt * 12 + prop.propTax
            const profit     = annualRent - annualExp
            return (
              <div key={prop.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{prop.name}</div>
                    <div className="text-xs text-[#9A9288] mt-0.5">{prop.address}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0F0F0] text-[#6B6459]">{prop.type}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${prop.renting ? 'bg-[#E0F0E8] text-[#1E5C3A]' : 'bg-[#F0F0F0] text-[#9A9288]'}`}>
                      {prop.renting ? '賃貸中' : '空室'}
                    </span>
                  </div>
                </div>
                {[
                  { label: '年間家賃収入', value: annualRent, color: 'text-[#1E5C3A]' },
                  { label: '管理費・固定資産税', value: annualExp, color: 'text-[#8B2020]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-sm py-1.5 border-b border-[#F5F5F5]">
                    <span className="text-[#6B6459]">{label}</span>
                    <span className={color}>¥{value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-2">
                  <span>年間所得概算</span>
                  <span className={profit >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}>
                    ¥{profit.toLocaleString()}
                  </span>
                </div>
                <button onClick={() => deleteProperty(prop.id)}
                  className="mt-3 w-full py-2 text-xs text-[#9A9288] border border-[#E5E0D8] rounded-xl bg-transparent">
                  削除
                </button>
              </div>
            )
          })
        )}
      </div>
      <BottomNav />
    </div>
  )
}
