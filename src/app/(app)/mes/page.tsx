import type { Metadata } from 'next'

import { MonthScreen } from './month-screen'

export const metadata: Metadata = { title: 'Mês' }

export default function MonthPage() {
  return <MonthScreen />
}
