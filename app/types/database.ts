/* ── Supabaseテーブル型 ── */
export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id:           string
          user_id:      string
          email:        string
          name:         string
          business:     string | null
          year:         number
          plan:         string
          role:         string
          data_json:    string | null
          created_at:   string
          updated_at:   string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      journals: {
        Row: {
          id:             string
          account_email:  string
          date:           string
          description:    string
          amount:         number
          type:           'income' | 'expense'
          category:       string
          income_type:    string | null
          memo:           string | null
          img_url:        string | null
          ai_review:      string | null
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['journals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['journals']['Insert']>
      }
    }
  }
}

/* ── アプリ内型定義 ── */

export type Plan = 'free' | 'standard' | 'pro' | 'pro_asset' | 'trial'

export interface PlanConfig {
  id:            Plan
  name:          string
  price:         number
  yearPrice:     number
  maxJournals:   number   // -1 = 無制限
  hasRealEstate: boolean
  hasDokuritsu:  boolean
  hasCashflow:   boolean
  aiLimit:       number   // -1 = 無制限
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  free: {
    id: 'free', name: '無料', price: 0, yearPrice: 0,
    maxJournals: 30, hasRealEstate: false, hasDokuritsu: false,
    hasCashflow: false, aiLimit: 5,
  },
  standard: {
    id: 'standard', name: 'スタンダード', price: 680, yearPrice: 6800,
    maxJournals: -1, hasRealEstate: false, hasDokuritsu: true,
    hasCashflow: true, aiLimit: 50,
  },
  pro: {
    id: 'pro', name: 'プロ', price: 980, yearPrice: 9800,
    maxJournals: -1, hasRealEstate: false, hasDokuritsu: true,
    hasCashflow: true, aiLimit: -1,
  },
  pro_asset: {
    id: 'pro_asset', name: 'プロアセット', price: 1980, yearPrice: 19800,
    maxJournals: -1, hasRealEstate: true, hasDokuritsu: true,
    hasCashflow: true, aiLimit: -1,
  },
  trial: {
    id: 'trial', name: 'トライアル', price: 0, yearPrice: 0,
    maxJournals: -1, hasRealEstate: true, hasDokuritsu: true,
    hasCashflow: true, aiLimit: -1,
  },
}

export interface Journal {
  id:           string
  date:         string
  description:  string
  amount:       number
  type:         'income' | 'expense'
  category:     string
  incomeType:   string | null
  memo:         string | null
  imgUrl:       string | null
  aiReview:     AIReview | null
}

export interface AIReview {
  risk:         'safe' | 'warn' | 'danger'
  category:     string
  taxRate:      '10%' | '8%' | '0%' | 'mixed'
  confidence:   number
  reason:       string
  alerts:       string[]
  needsHuman:   boolean
}

export interface Property {
  id:           string
  name:         string
  type:         string
  address:      string
  rent:         number
  mgmt:         number
  propTax:      number
  price:        number
  age:          number
  renting:      boolean
  createdAt:    string
}

export interface CashflowPlan {
  id:       string
  type:     'income' | 'expense'
  name:     string
  amount:   number
  ym:       string
  repeat:   string
}

export interface SimulationParams {
  price:            number
  buildingRatio:    number
  age:              number
  structure:        'wood' | 'steel' | 'rc'
  monthlyRent:      number
  otherMonthlyIncome: number
  vacancyRate:      number
  rentDeclineRate:  number
  loanAmount:       number
  interestRate:     number
  loanYears:        number
  initialCost:      number
  propertyTax:      number
  managementRate:   number
  insurance:        number
  repairReserve:    number
  annualRepair:     number
  majorRepair:      number
  taxRate:          number
  years:            number
}

export interface SimulationRow {
  year:               number
  annualRent:         number
  otherIncome:        number
  cashInflow:         number
  annualInterest:     number
  annualPrincipal:    number
  annualPayment:      number
  remainingLoan:      number
  propertyTax:        number
  managementFee:      number
  insurance:          number
  repairReserve:      number
  annualRepair:       number
  majorRepair:        number
  cashOutflow:        number
  annualDepreciation: number
  taxableIncome:      number
  incomeTax:          number
  netCashflow:        number
  grossYield:         string
  netYield:           string
  cumulativeCashflow: number
}

export interface SimulationResult {
  rows:               SimulationRow[]
  breakEvenYear:      number | null
  legalLife:          number
  remainLife:         number
  annualDepreciation: number
  monthlyPayment:     number
  landValue:          number
  buildingValue:      number
  assetValue30:       number
  equity30:           number
  selfFund:           number
}

export interface UserState {
  userId:   string | null
  email:    string | null
  plan:     Plan
  name:     string
  business: string
}
