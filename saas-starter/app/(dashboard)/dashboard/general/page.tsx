'use client';

// Modified from nextjs/saas-starter: name and email live on the BuildBase
// account, edited in its prebuilt Profile screen instead of a local form and
// a Postgres update.
import { useSaaSAuth } from '@buildbase/sdk/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function GeneralPage() {
  const { user, openWorkspaceSettings } = useSaaSAuth();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1">Name</Label>
            <p className="text-sm">{user?.name || '-'}</p>
          </div>
          <div>
            <Label className="mb-1">Email</Label>
            <p className="text-sm">{user?.email || '-'}</p>
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => openWorkspaceSettings('profile')}
          >
            Edit profile
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
