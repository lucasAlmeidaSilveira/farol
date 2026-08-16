'use client'

import { X } from 'lucide-react'

import { FarolMark } from '@/components/brand/farol-mark'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

/**
 * O convite para instalar — um card no fim da tela, não um banner no topo.
 *
 * Banner no topo empurra o número principal para baixo, e o número é a razão de
 * o usuário ter aberto o app. O convite é secundário e ocupa lugar de
 * secundário; quem quiser, acha; quem não quiser, rola por cima.
 */
export function InstallCard() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="flex items-center gap-3">
        <FarolMark size={28} />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">Farol na tela inicial</span>
          <span className="text-muted-foreground text-sm text-balance">
            Abre direto, sem navegador, e funciona sem internet.
          </span>
        </div>

        <Button size="sm" onClick={() => void install()}>
          Instalar
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label="Agora não"
        >
          <X aria-hidden className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
