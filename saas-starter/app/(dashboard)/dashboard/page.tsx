'use client';

// Modified from nextjs/saas-starter: the team is a BuildBase workspace. Members,
// invites and the subscription come from BuildBase instead of Postgres and
// Stripe; the cards and their layout are unchanged. Workspace roles are
// BuildBase's: admin, editor and viewer.
import {
  useSaaSAuth,
  useSaaSWorkspaces,
  useSubscription,
} from '@buildbase/sdk/react';
import { Loader2, PlusCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Member = { id: string; name: string; email: string; role: string };

/** The current workspace's members, plus a reload for after an edit. */
function useMembers() {
  const { currentWorkspace, getUsers } = useSaaSWorkspaces();
  const [members, setMembers] = useState<Member[] | null>(null);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    const rows = await getUsers(currentWorkspace._id);
    setMembers(
      rows.map((r) => {
        const u = typeof r.user === 'object' ? r.user : null;
        return {
          id: u?._id ?? String(r.user),
          name: u?.name ?? '',
          email: u?.email ?? '',
          role: r.role,
        };
      })
    );
  }, [currentWorkspace, getUsers]);
  useEffect(() => {
    load();
  }, [load]);
  return { members, reload: load };
}

function ManageSubscription() {
  const { currentWorkspace } = useSaaSWorkspaces();
  const { openWorkspaceSettings } = useSaaSAuth();
  const { subscription, loading } = useSubscription(currentWorkspace?._id);
  const status = subscription?.subscription?.subscriptionStatus;
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <p className="font-medium">
              Current Plan:{' '}
              {loading ? '...' : subscription?.plan?.name || 'Free'}
            </p>
            <p className="text-sm text-muted-foreground">
              {status === 'active'
                ? `Billed ${subscription?.subscription?.billingInterval ?? 'monthly'}`
                : status === 'trialing'
                  ? 'Trial period'
                  : 'No active subscription'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => openWorkspaceSettings('subscription')}
          >
            Manage Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers({
  members,
  canManage,
  reload,
}: {
  members: Member[] | null;
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { currentWorkspace, removeUser } = useSaaSWorkspaces();
  const { user } = useSaaSAuth();
  const [pending, setPending] = useState<string | null>(null);

  if (!members?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {members ? 'No team members yet.' : 'Loading...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {(member.name || member.email || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.name || member.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
              {canManage && member.id !== user?.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending === member.id}
                  onClick={async () => {
                    if (!currentWorkspace) return;
                    setPending(member.id);
                    await removeUser(currentWorkspace._id, member.id).finally(
                      () => setPending(null)
                    );
                    await reload();
                  }}
                >
                  {pending === member.id ? 'Removing...' : 'Remove'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InviteTeamMember({
  canManage,
  reload,
}: {
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { currentWorkspace, addUser } = useSaaSWorkspaces();
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [pending, setPending] = useState(false);

  async function invite(formData: FormData) {
    if (!currentWorkspace) return;
    const email = String(formData.get('email') ?? '');
    const role = String(formData.get('role') ?? 'editor');
    setPending(true);
    try {
      await addUser(currentWorkspace._id, email, role);
      setState({ success: `${email} was added to the team.` });
      await reload();
    } catch (error) {
      setState({ error: (error as Error).message || 'Could not add member.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={invite} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              disabled={!canManage}
            />
          </div>
          <div>
            <Label>Role</Label>
            <RadioGroup
              defaultValue="editor"
              name="role"
              className="flex space-x-4"
              disabled={!canManage}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="editor" id="editor" />
                <Label htmlFor="editor">Editor</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin">Admin</Label>
              </div>
            </RadioGroup>
          </div>
          {state.error && <p className="text-red-500">{state.error}</p>}
          {state.success && <p className="text-green-500">{state.success}</p>}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={pending || !canManage}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Invite Member
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!canManage && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            You must be a team admin to invite new members.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useSaaSAuth();
  const { members, reload } = useMembers();
  const myRole = members?.find((m) => m.id === user?.id)?.role;
  const canManage = myRole === 'admin' || myRole === 'owner';

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Team Settings</h1>
      <ManageSubscription />
      <TeamMembers members={members} canManage={canManage} reload={reload} />
      <InviteTeamMember canManage={canManage} reload={reload} />
    </section>
  );
}
