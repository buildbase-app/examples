// Modified from satnaing/shadcn-admin: the Account page opens BuildBase screens.
import { createFileRoute } from '@tanstack/react-router'
import { SettingsAccount } from '@/features/settings/account'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsAccount,
})
