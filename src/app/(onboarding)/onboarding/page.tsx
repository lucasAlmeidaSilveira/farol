import type { Metadata } from 'next'

import { SessionGate } from '@/components/shared/session-gate'

import { OnboardingFlow } from './onboarding-flow'

export const metadata: Metadata = { title: 'Montar meu plano' }

export default function OnboardingPage() {
  return (
    <SessionGate>
      <OnboardingFlow />
    </SessionGate>
  )
}
