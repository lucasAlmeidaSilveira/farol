'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { EditScope } from '@/hooks/plan/use-edit-plan'
import { cn } from '@/lib/utils'

/**
 * A confirmação de remoção, para renda e para conta.
 *
 * A pergunta existe porque as duas saídas fazem coisas DIFERENTES com o
 * histórico — não é um "tem certeza?" cerimonial. Por isso cada opção carrega a
 * própria consequência em vez de virar dois botões planos: "de vez" apaga os
 * meses anteriores junto, e isso precisa estar escrito na hora de decidir, não
 * num aviso depois.
 *
 * É `alertdialog`, e não diálogo comum: o leitor de tela é interrompido, o foco
 * entra no botão seguro e não há como sair clicando fora. Para uma saída que
 * apaga dado, escolher é obrigatório.
 */

export type RemoveDialogProps = {
  /** `null` mantém fechado. O nome vai no título. */
  name: string | null
  /**
   * Quando presente, "de vez" não é oferecido e este texto explica por quê.
   *
   * Some em vez de aparecer desabilitado: botão morto sem motivo visível é pior
   * do que botão ausente com a razão escrita.
   */
  foreverBlockedBy?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (scope: EditScope) => void
}

export function RemoveDialog({
  name,
  foreverBlockedBy,
  onOpenChange,
  onConfirm,
}: RemoveDialogProps) {
  return (
    <AlertDialog open={name !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {foreverBlockedBy ??
              'As duas opções fazem coisas diferentes com o histórico.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Choice
            label="Tirar só deste mês"
            hint="O plano volta ao normal no mês que vem."
            onClick={() => onConfirm('thisMonth')}
          />

          {foreverBlockedBy === undefined ? (
            <Choice
              destructive
              label="Remover de vez"
              hint="Some também dos meses anteriores."
              onClick={() => onConfirm('fromNowOn')}
            />
          ) : null}
        </div>

        <AlertDialogFooter className="sm:justify-end">
          <AlertDialogCancel asChild>
            <Button variant="quiet">Cancelar</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Choice({
  label,
  hint,
  destructive = false,
  onClick,
}: {
  label: string
  hint: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <AlertDialogAction asChild>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'focus-visible:ring-ring flex min-h-11 flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors duration-150 outline-none focus-visible:ring-[3px]',
          destructive
            ? 'border-negative/40 hover:bg-negative-soft'
            : 'border-input hover:bg-muted',
        )}
      >
        <span className={cn('font-medium', destructive && 'text-negative')}>
          {label}
        </span>
        <span className="text-muted-foreground text-sm">{hint}</span>
      </button>
    </AlertDialogAction>
  )
}
