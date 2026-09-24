// Added for the BuildBase example: replaces the upstream Profile, Account and
// Notifications forms, which were mock-ups. Each button opens the SDK's own
// screen, which saves to BuildBase.
import { useSaaSAuth } from '@buildbase/sdk/react'
import {
  Bell,
  CreditCard,
  Gauge,
  KeyRound,
  MonitorSmartphone,
  Settings2,
  ToggleRight,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentSection } from '../components/content-section'

const SECTIONS = [
  { section: 'profile', label: 'Profile', icon: UserCog },
  { section: 'security', label: 'Security and passkeys', icon: KeyRound },
  { section: 'devices', label: 'Signed-in devices', icon: MonitorSmartphone },
  { section: 'notifications', label: 'Notifications', icon: Bell },
  { section: 'general', label: 'Workspace', icon: Settings2 },
  { section: 'subscription', label: 'Plan and billing', icon: CreditCard },
  { section: 'usage', label: 'Usage', icon: Gauge },
  { section: 'features', label: 'Feature flags', icon: ToggleRight },
] as const

export function SettingsAccount() {
  const { openWorkspaceSettings } = useSaaSAuth()

  return (
    <ContentSection
      title='Account'
      desc='Your profile, security and devices, and the current workspace. Each opens a BuildBase screen.'
    >
      <div className='grid gap-2 sm:grid-cols-2'>
        {SECTIONS.map(({ section, label, icon: Icon }) => (
          <Button
            key={section}
            variant='outline'
            className='h-12 justify-start'
            onClick={() => openWorkspaceSettings(section)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>
    </ContentSection>
  )
}
