// Added for the BuildBase example: the signed-in user, shaped for the
// sidebar and header menus.
import { useSaaSAuth } from '@buildbase/sdk/react'

export function useCurrentUser() {
  const { user } = useSaaSAuth()
  const name = user?.name || user?.email || ''
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  return {
    name,
    email: user?.email ?? '',
    avatar: user?.image ?? '',
    initials,
  }
}
