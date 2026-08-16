import { SessionGate } from '@/components/shared/session-gate'
import { AppShell } from '@/components/shell/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  )
}
