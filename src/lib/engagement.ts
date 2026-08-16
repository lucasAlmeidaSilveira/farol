/**
 * Os sinais que dizem se o usuário já gostou do app o bastante para valer a
 * pena pedir alguma coisa a ele.
 *
 * Existe por uma regra de produto: o convite de instalar NÃO aparece no
 * primeiro minuto. Quem acabou de entrar ainda não sabe se quer o Farol na tela
 * inicial, e pedir cedo demais é o jeito mais rápido de ganhar um "não" que
 * nunca mais se reverte — o navegador não pergunta duas vezes.
 *
 * O critério é duplo, e os dois sinais medem coisas diferentes: sessões medem
 * VOLTA (ele decidiu abrir de novo), o primeiro lançamento mede USO (ele
 * confiou dado real ao app). Só um dos dois seria fácil de satisfazer por
 * acidente.
 */

const SESSIONS = 'farol:sessions'
const FIRST_ENTRY = 'farol:first-entry'
const THIS_SESSION = 'farol:session-counted'

/** Mínimo de sessões antes de pedir qualquer coisa. */
export const MIN_SESSIONS = 2

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Safari em navegação privada lança ao tocar em storage. Perder o sinal é
    // aceitável; quebrar a tela por causa de um banner opcional não é.
    return null
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* idem */
  }
}

/**
 * Conta a sessão atual, uma única vez.
 *
 * `sessionStorage` é o que garante o "uma vez": ele morre com a aba, então
 * recarregar a página não infla a contagem, mas voltar amanhã conta de novo.
 */
export function countSession(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.sessionStorage.getItem(THIS_SESSION)) return
    window.sessionStorage.setItem(THIS_SESSION, '1')
  } catch {
    return
  }
  write(SESSIONS, String(sessionCount() + 1))
}

export function sessionCount(): number {
  const value = Number(read(SESSIONS))
  return Number.isInteger(value) && value > 0 ? value : 0
}

export function markFirstEntry(): void {
  if (typeof window === 'undefined') return
  if (read(FIRST_ENTRY)) return
  write(FIRST_ENTRY, '1')
}

export function hasLaunched(): boolean {
  return read(FIRST_ENTRY) !== null
}

/** Voltou ao app E já lançou alguma coisa. */
export function isEngaged(): boolean {
  if (typeof window === 'undefined') return false
  return sessionCount() >= MIN_SESSIONS && hasLaunched()
}
