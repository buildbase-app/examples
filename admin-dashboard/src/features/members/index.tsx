// Added for the BuildBase example: replaces the upstream Users page, which
// listed 500 generated users. These are the current workspace's real members;
// admins can add people, change roles and remove them.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSaaSAuth, useSaaSWorkspaces } from '@buildbase/sdk/react'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

/** BuildBase's workspace roles. */
const ROLES = ['admin', 'editor', 'viewer'] as const

type Member = { id: string; name: string; email: string; role: string }

function useMembers() {
  const { currentWorkspace, getUsers } = useSaaSWorkspaces()
  const queryClient = useQueryClient()
  const workspaceId = currentWorkspace?._id
  const queryKey = ['members', workspaceId]

  // getUsers is the SDK's stable client method, not data, so it stays out
  // of the key.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data } = useQuery({
    queryKey,
    enabled: Boolean(workspaceId),
    queryFn: async (): Promise<Member[]> => {
      const rows = await getUsers(workspaceId!)
      return rows.map((row) => {
        const user = typeof row.user === 'object' ? row.user : null
        return {
          id: user?._id ?? String(row.user),
          name: user?.name ?? '',
          email: user?.email ?? '',
          role: row.role,
        }
      })
    },
  })

  return {
    members: data ?? null,
    reload: () => queryClient.invalidateQueries({ queryKey }),
  }
}

function initials(member: Member) {
  return (member.name || member.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function AddMemberDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => Promise<void>
}) {
  const { currentWorkspace, addUser } = useSaaSWorkspaces()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('editor')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentWorkspace || !email.trim()) return
    setSaving(true)
    try {
      await addUser(currentWorkspace._id, email.trim(), role)
      toast.success(`Added ${email.trim()} as ${role}`)
      setEmail('')
      onOpenChange(false)
      await onAdded()
    } catch (error) {
      toast.error((error as Error).message || 'Could not add that person')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={onSubmit} className='grid gap-4'>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              They need a BuildBase account in this app already: ask them to
              sign up first.
            </DialogDescription>
          </DialogHeader>
          <Input
            type='email'
            autoFocus
            placeholder='name@example.com'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className='w-full' aria-label='Role'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className='capitalize'>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type='submit' disabled={saving || !email.trim()}>
              {saving && <Loader2 className='animate-spin' />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Members() {
  const { user } = useSaaSAuth()
  const { currentWorkspace, updateUser, removeUser } = useSaaSWorkspaces()
  const { members, reload } = useMembers()
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const myId = user?.id
  const canManage =
    members?.find((member) => member.id === myId)?.role === 'admin'

  const run = async (id: string, action: () => Promise<unknown>) => {
    setPending(id)
    try {
      await action()
      await reload()
    } catch (error) {
      toast.error((error as Error).message || 'Something went wrong')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Members</h2>
            <p className='text-muted-foreground'>
              Who is in {currentWorkspace?.name ?? 'this workspace'}, and what
              they can do.
            </p>
          </div>
          <Button onClick={() => setAdding(true)} disabled={!canManage}>
            <UserPlus />
            Add member
          </Button>
        </div>

        {!canManage && members && (
          <p className='text-sm text-muted-foreground'>
            Only admins can change members.
          </p>
        )}

        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className='w-40'>Role</TableHead>
                <TableHead className='w-16' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!members && (
                <TableRow>
                  <TableCell colSpan={3} className='h-24 text-center'>
                    <Loader2 className='mx-auto animate-spin' />
                  </TableCell>
                </TableRow>
              )}
              {members?.map((member) => {
                const isMe = member.id === myId
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarFallback>{initials(member)}</AvatarFallback>
                        </Avatar>
                        <div className='grid'>
                          <span className='font-medium'>
                            {member.name || member.email}
                            {isMe && (
                              <Badge variant='secondary' className='ms-2'>
                                You
                              </Badge>
                            )}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage && !isMe ? (
                        <Select
                          value={member.role}
                          disabled={pending === member.id}
                          onValueChange={(role) =>
                            run(member.id, () =>
                              updateUser(currentWorkspace!._id, member.id, {
                                role,
                              })
                            )
                          }
                        >
                          <SelectTrigger
                            size='sm'
                            className='capitalize'
                            aria-label={`Role for ${member.email}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem
                                key={r}
                                value={r}
                                className='capitalize'
                              >
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant='outline' className='capitalize'>
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage && !isMe && (
                        <Button
                          variant='ghost'
                          size='icon'
                          aria-label={`Remove ${member.email}`}
                          disabled={pending === member.id}
                          onClick={() =>
                            run(member.id, () =>
                              removeUser(currentWorkspace!._id, member.id)
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Main>

      <AddMemberDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={reload}
      />
    </>
  )
}
