// Added for the BuildBase example: replaces the change-email, 2FA, password,
// connections and passkeys links. Each button opens the SDK's own screen.
import { useSaaSAuth, useSaaSWorkspaces } from '@buildbase/sdk/react'
import { Icon } from '#app/components/ui/icon.tsx'

const SCREENS = [
	{ section: 'security', label: 'Security and passkeys', icon: 'lock-closed' },
	{ section: 'devices', label: 'Signed-in devices', icon: 'laptop' },
	{ section: 'profile', label: 'BuildBase account', icon: 'avatar' },
] as const

export function BuildBaseAccount({ email }: { email: string }) {
	const { isAuthenticated, openWorkspaceSettings } = useSaaSAuth()
	const { currentWorkspace } = useSaaSWorkspaces()
	const ready = isAuthenticated && Boolean(currentWorkspace)
	return (
		<div className="flex flex-col gap-3">
			<p className="text-body-sm text-muted-foreground">
				You sign in as {email} through BuildBase. Passwords, passkeys and your
				sign-in methods live there.
			</p>
			{SCREENS.map(({ section, label, icon }) => (
				<div key={section}>
					<button
						type="button"
						disabled={!ready}
						onClick={() => openWorkspaceSettings(section)}
						className="text-left disabled:opacity-50"
					>
						<Icon name={icon}>{label}</Icon>
					</button>
				</div>
			))}
		</div>
	)
}
