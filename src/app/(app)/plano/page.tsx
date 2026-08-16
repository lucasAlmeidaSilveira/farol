import type { Metadata } from 'next'

import { PlanScreen } from './plan-screen'

export const metadata: Metadata = { title: 'Plano' }

export default function PlanPage() {
  return <PlanScreen />
}
