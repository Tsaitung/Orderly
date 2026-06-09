import { Metadata } from 'next'
import LandingNav from '@/components/landing/LandingNav'
import Hero from '@/components/landing/Hero'
import TrustBar from '@/components/landing/TrustBar'
import PainSolution from '@/components/landing/PainSolution'
import HowItWorks from '@/components/landing/HowItWorks'
import ReconciliationShowcase from '@/components/landing/ReconciliationShowcase'
import RoleTabs from '@/components/landing/RoleTabs'
import FeatureGrid from '@/components/landing/FeatureGrid'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import FinalCTA from '@/components/landing/FinalCTA'
import LandingFooter from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: '井然 Orderly - 餐飲供應鏈自動化對帳平台',
  description:
    '透過 ERP 整合和 API 優先架構，實現下單到結算全流程自動化，將對帳時間從8小時縮短至30分鐘。',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <LandingNav />
      <main>
        <Hero />
        <TrustBar />
        <PainSolution />
        <HowItWorks />
        <ReconciliationShowcase />
        <RoleTabs />
        <FeatureGrid />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
