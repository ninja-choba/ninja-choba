'use client'
import { useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

type TabId = 'terms' | 'privacy' | 'ai' | 'taxlaw'

const TABS: { id: TabId; label: string }[] = [
  { id: 'terms',   label: '利用規約' },
  { id: 'privacy', label: 'プライバシー' },
  { id: 'ai',      label: 'AI免責' },
  { id: 'taxlaw',  label: '税理士法' },
]

function ImportantBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FFF8EC] border border-[#F5DFA0] rounded-xl p-4 my-3 text-sm text-[#6B4A00] leading-relaxed">
      {children}
    </div>
  )
}

function SafeBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F0F8F4] border border-[#C0DDD0] rounded-xl p-4 my-3 text-sm text-[#1A4A35] leading-relaxed">
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-medium text-sm text-[#1A1A1A] mb-2 pb-1 border-b border-[#F0F0F0]">
        {title}
      </div>
      <div className="text-sm text-[#6B6459] leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export default function LegalPage() {
  const [tab, setTab] = useState<TabId>('terms')

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        <div className="font-serif text-xl font-bold mb-1">法的事項</div>
        <p className="text-xs text-[#9A9288] mb-4">最終更新：2026年5月27日</p>

        {/* タブ */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 border transition-all ${
                tab === t.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'border-[#E5E0D8] text-[#6B6459]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 利用規約 ── */}
        {tab === 'terms' && (
          <div>
            <Section title="第1条（目的・サービスの性質）">
              <p className="mb-2">
                本サービス「忍者帳場」は、個人事業主・小規模事業者の経費記録・帳簿管理・
                確定申告準備を<strong className="text-[#1A1A1A]">サポート</strong>することを目的としたツールです。
              </p>
              <ImportantBox>
                ⚠ <strong>本サービスは税務代理・税務書類の作成代行・税務相談を行うものではありません。</strong><br /><br />
                税理士法第2条に規定される税務代理・税務書類の作成・税務相談は税理士の独占業務です。
                本サービスはあくまで記帳・集計・整理のサポートツールとして提供されます。
              </ImportantBox>
              <SafeBox>
                ✓ <strong>本サービスが提供するもの</strong><br />
                ・レシート・領収書の記録・電子保存<br />
                ・仕訳・勘定科目の自動分類（参考情報）<br />
                ・収支集計・試算表・損益計算書の生成<br />
                ・確定申告書への転記に必要な数値の整理・出力<br />
                ・e-Tax申告のための入力ガイド・データ出力<br />
                ・税理士への引き継ぎ資料の作成支援
              </SafeBox>
            </Section>

            <Section title="第2条（税務に関する重要事項）">
              <ul className="list-disc pl-4 space-y-1.5">
                <li>AIが提示する勘定科目・税区分・リスク判定はすべて<strong className="text-[#1A1A1A]">参考情報</strong>であり、税務上の確定的な判断ではありません</li>
                <li>確定申告の内容・税額の最終的な判断および責任は利用者本人に帰属します</li>
                <li>税務上の判断に不安がある場合は必ず税理士・税務署にご相談ください</li>
                <li>本サービスを利用した申告・経営判断により生じた損失について運営者は責任を負いません</li>
              </ul>
            </Section>

            <Section title="第3条（禁止事項）">
              <ul className="list-disc pl-4 space-y-1.5">
                <li>虚偽のデータ入力・不正目的での利用</li>
                <li>サービスへの不正アクセス・リバースエンジニアリング</li>
                <li>他者の情報を無断で入力すること</li>
                <li>法令に違反する目的での利用</li>
              </ul>
            </Section>

            <Section title="第4条（免責）">
              <ul className="list-disc pl-4 space-y-1.5">
                <li>AI判定の誤り・税務計算の誤差による損害</li>
                <li>サービスの中断・データ消失</li>
                <li>外部サービス障害によるタイムスタンプ・保存の失敗</li>
                <li>税制改正による機能の陳腐化</li>
              </ul>
            </Section>

            <Section title="第5条（変更・終了）">
              <p>本規約およびサービス内容は予告なく変更される場合があります。
              サービス終了の場合は30日前を目処に告知します。</p>
            </Section>
          </div>
        )}

        {/* ── プライバシーポリシー ── */}
        {tab === 'privacy' && (
          <div>
            <Section title="収集するデータ">
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong className="text-[#1A1A1A]">端末保存</strong>：経費記録・仕訳・設定（localStorage）</li>
                <li><strong className="text-[#1A1A1A]">クラウド保存</strong>：ログイン情報・帳簿データ（Supabase）</li>
                <li><strong className="text-[#1A1A1A]">メールアドレス</strong>：アカウント認証のみに使用</li>
              </ul>
            </Section>

            <Section title="AIへのデータ送信">
              <ImportantBox>
                AIレビュー機能をご利用の場合、入力データ（店舗名・金額・用途等）がOpenAI APIに送信されます。
                <strong>氏名・住所・マイナンバー等の個人情報は入力しないでください。</strong>
              </ImportantBox>
            </Section>

            <Section title="ClimberCloud（タイムスタンプ）">
              <p>タイムスタンプ機能をご利用の場合、証憑画像のハッシュ値および書類情報が
              ClimberCloud（NTTデータ系）に送信されます。</p>
            </Section>

            <Section title="第三者への提供">
              <p>法令に基づく場合を除き、利用者のデータを第三者に提供・販売することはありません。
              広告Cookie・行動トラッキングは使用しません。</p>
            </Section>

            <Section title="データの削除">
              <p>設定ページの「全データを削除」からいつでも全データを削除できます。</p>
            </Section>
          </div>
        )}

        {/* ── AI免責 ── */}
        {tab === 'ai' && (
          <div>
            <Section title="AIの役割">
              <p className="mb-2">
                本サービスのAI機能は記帳・分類・リスク検知の<strong className="text-[#1A1A1A]">参考情報の提供</strong>を
                目的としています。AIは「〜と思われます」「〜の可能性があります」という形式で提示し、
                断定的な表現を避けるよう設計されています。
              </p>
              <ImportantBox>
                <strong>AIが行わないこと：</strong><br />
                ・税務上の適否の確定的な判断<br />
                ・税務相談（税理士法上の独占業務）<br />
                ・申告内容の保証・責任の引き受け<br />
                ・法令解釈の確定的な提示
              </ImportantBox>
            </Section>

            <Section title="確定申告サポート機能について">
              <SafeBox>
                ✓ <strong>提供する機能（セーフな範囲）</strong><br />
                ・収支データの自動集計・整理<br />
                ・申告書記載事項の数値整理・出力<br />
                ・e-Tax入力のためのガイド・チェックリスト<br />
                ・税理士への引き継ぎ資料の生成<br />
                ・電帳法チェック・タイムスタンプ付与
              </SafeBox>
              <p className="mt-2">
                申告内容の正確性・税額の適否については必ず税理士・税務署にご確認ください。
                本機能を利用した申告により生じた損害について運営者は責任を負いません。
              </p>
            </Section>

            <Section title="タイムスタンプについて">
              <p>ClimberCloud連携によるタイムスタンプは電帳法のスキャナ保存要件への対応を支援します。
              法的要件への適合性については税理士・税務署にご確認ください。
              アプリ内タイムスタンプ（ClimberCloud未設定時）は参考記録であり、
              法的効力のある認定タイムスタンプではありません。</p>
            </Section>

            <Section title="税制改正への対応">
              <p>消費税率変更スケジュールの設定機能を提供しますが、
              税制改正への対応漏れによる損害について責任を負いません。
              最新の税制については税務署・税理士にご確認ください。</p>
            </Section>
          </div>
        )}

        {/* ── 税理士法準拠 ── */}
        {tab === 'taxlaw' && (
          <div>
            <Section title="税理士法への準拠宣言">
              <p className="mb-3">
                本サービスは税理士法（昭和26年法律第237号）を遵守して設計されています。
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>税務代理（第2条第1項第1号）は行いません</li>
                <li>税務書類の作成代行（第2条第1項第2号）は行いません</li>
                <li>税務相談（第2条第1項第3号）は行いません</li>
                <li>AIは利用者自身の判断・作業を補助するツールとして位置づけられます</li>
              </ul>
            </Section>

            <Section title="他の申告ソフトとの同様の立ち位置">
              <SafeBox>
                本サービスは「弥生の青色申告」「freee会計」等の申告ソフトと同様に、
                <strong>記帳・集計・整理の自動化ツール</strong>として税理士法の範囲内で運営されます。<br /><br />
                「確定申告の準備・サポート」は申告ソフトとして適法な業務の範囲です。
                「確定申告の代行・保証」は行いません。
              </SafeBox>
            </Section>

            <Section title="グレーゾーン回避の設計方針">
              <ul className="list-disc pl-4 space-y-1.5">
                <li>AIの出力には必ず「参考情報」「専門家に確認を」を明示</li>
                <li>「この申告で問題ありません」等の断定表現はAIに生成させない設計</li>
                <li>税額の計算はユーザー確認を前提とした概算値として提示</li>
                <li>税理士との連携・引き継ぎを積極的に促す設計</li>
              </ul>
            </Section>

            <div className="mt-4 p-4 bg-[#F5F5F5] rounded-xl text-xs text-[#9A9288] leading-relaxed">
              本規約・設計方針に関してご不明な点がある場合は、
              <a href="mailto:support@ninja-chouba.example.com" className="text-[#2F5D50]">
                support@ninja-chouba.example.com
              </a> までお問い合わせください。
            </div>
          </div>
        )}

        <div className="text-center text-xs text-[#C0B9AF] py-6">
          忍者帳場 v20260527
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
