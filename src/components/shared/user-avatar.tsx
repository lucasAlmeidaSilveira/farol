'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useSession } from '@/providers/auth-provider'

/**
 * A foto de quem está logado, com a inicial como rede de segurança.
 *
 * Existe como componente próprio porque a regra de fallback estava duplicada
 * na sidebar e em Ajustes — e a sidebar tinha parado na duplicação incompleta,
 * mostrando só a inicial e nunca a foto.
 *
 * O `Avatar` do Radix só monta a imagem depois que ela carrega de fato; se a
 * URL falhar, o fallback assume sem piscar. É por isso que a inicial não é um
 * "estado de erro": ela é o estado normal de quem não tem foto.
 */
export function UserAvatar({
  className,
  size,
}: {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const { user } = useSession()
  const label = user?.displayName ?? user?.email ?? ''

  return (
    <Avatar size={size} className={cn('shrink-0', className)}>
      <AvatarImage
        src={user?.photoURL ?? undefined}
        // `alt` vazio de propósito: o nome já aparece ao lado em toda a UI, e
        // repeti-lo faria o leitor de tela anunciar a mesma pessoa duas vezes.
        alt=""
        /*
          Sem isto, o `lh3.googleusercontent.com` responde 403 para algumas
          origens ao receber o cabeçalho Referer — e o resultado é justamente
          um avatar que não aparece, sem erro visível na tela.
        */
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
        {(label || '?').charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
