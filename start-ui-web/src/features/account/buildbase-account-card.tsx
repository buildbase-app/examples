// Added for the BuildBase example: security, devices and the sign-in account
// live in BuildBase; each row opens the SDK's own screen.
import { useSaaSAuth, useSaaSWorkspaces } from '@buildbase/sdk/react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

import { AccountCardRow } from '@/features/account/account-card-row';

const SCREENS = [
  { section: 'security', label: 'Security and passkeys' },
  { section: 'devices', label: 'Signed-in devices' },
  { section: 'profile', label: 'BuildBase account' },
] as const;

export const BuildBaseAccountCard = () => {
  const { isAuthenticated, openWorkspaceSettings } = useSaaSAuth();
  const { currentWorkspace } = useSaaSWorkspaces();
  const ready = isAuthenticated && !!currentWorkspace;

  return (
    <Card className="gap-0 p-0">
      <CardHeader className="gap-y-0 py-4">
        <CardTitle>Sign-in and security</CardTitle>
      </CardHeader>
      {SCREENS.map(({ section, label }) => (
        <AccountCardRow key={section} label={label}>
          <Button
            variant="link"
            size="sm"
            className="-my-1.5"
            disabled={!ready}
            onClick={() => openWorkspaceSettings(section)}
          >
            Open
          </Button>
        </AccountCardRow>
      ))}
    </Card>
  );
};
