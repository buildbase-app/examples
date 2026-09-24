'use client';

// Modified from nextjs/saas-starter: sign-in methods, sessions and devices are
// BuildBase's prebuilt Security and Devices screens, replacing the local
// password-change and delete-account forms.
import { useSaaSAuth } from '@buildbase/sdk/react';
import { Lock, MonitorSmartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SecurityPage() {
  const { openWorkspaceSettings } = useSaaSAuth();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Security Settings
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sign-in and sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage passkeys and active sessions, and sign out of other devices.
          </p>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => openWorkspaceSettings('security')}
          >
            <Lock className="mr-2 h-4 w-4" />
            Security settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            See every device signed in to your account, rename it or sign it
            out.
          </p>
          <Button
            variant="outline"
            onClick={() => openWorkspaceSettings('devices')}
          >
            <MonitorSmartphone className="mr-2 h-4 w-4" />
            Your devices
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
