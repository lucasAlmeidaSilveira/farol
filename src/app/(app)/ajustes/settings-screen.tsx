'use client'

import { useRouter } from 'next/navigation'

import { FarolLockup } from '@/components/brand/farol-lockup'
import {
  CycleCard,
  IncomePolicyCard,
} from '@/components/settings/space-config'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { signOutOfFarol } from '@/data/session'
import { useSpace } from '@/hooks/space/use-space'
import { useSession } from '@/providers/auth-provider'

export function SettingsScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { data: space } = useSpace()

  async function leave() {
    await signOutOfFarol()
    router.replace('/entrar')
  }

  return (
    <PageContainer>
      <PageHeader title="Ajustes" hint="Conta, espaço e aparência." />

      <div className="stagger grid gap-8 md:grid-cols-2">
        <Group title="Perfil">
          <Card>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-11">
                <AvatarImage src={user?.photoURL ?? undefined} alt="" />
                <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                  {(user?.displayName ?? user?.email ?? '?')
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {user?.displayName ?? 'Você'}
                </span>
                <span className="text-muted-foreground truncate text-sm">
                  {user?.email}
                </span>
              </div>
            </CardContent>
          </Card>
        </Group>

        <Group title="Espaço financeiro">
          <Card>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {space?.name ?? 'Meu espaço'}
                </span>
                <span className="text-muted-foreground text-sm">
                  Só você tem acesso
                </span>
              </div>
              <Badge variant="secondary">em breve: convidar</Badge>
            </CardContent>
          </Card>
        </Group>

        {space ? (
          <>
            <Group title="Ciclo do mês">
              <CycleCard config={space.config} />
            </Group>

            <Group title="Renda variável">
              <IncomePolicyCard config={space.config} />
            </Group>
          </>
        ) : null}

        <Group title="Aparência">
          <ThemeToggle />
        </Group>

        <Group title="Conta">
          <Button variant="outline" size="block" onClick={() => void leave()}>
            Sair
          </Button>
        </Group>
      </div>

      <footer className="flex flex-col items-center gap-2 pt-4">
        <FarolLockup size={22} tone="theme" />
        <p className="text-muted-foreground text-xs">
          Seus dados ficam só com você.
        </p>
      </footer>
    </PageContainer>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-eyebrow text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}
