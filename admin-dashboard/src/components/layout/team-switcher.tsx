// Modified from satnaing/shadcn-admin: the teams are the user's BuildBase
// workspaces, and "Add team" creates one.
import { useState } from 'react'
import { useSaaSWorkspaces } from '@buildbase/sdk/react'
import { ChevronsUpDown, Command, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

function memberCount(count: number | undefined) {
  if (!count) return 'Workspace'
  return count === 1 ? '1 member' : `${count} members`
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } =
    useSaaSWorkspaces()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createWorkspace(name.trim())
      toast.success(`Created ${name.trim()}`)
      setCreating(false)
      setName('')
    } catch (error) {
      toast.error((error as Error).message || 'Could not create the team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <Command className='size-4' />
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {currentWorkspace?.name ?? 'Loading…'}
                  </span>
                  <span className='truncate text-xs'>
                    {memberCount(currentWorkspace?.users?.length)}
                  </span>
                </div>
                <ChevronsUpDown className='ms-auto' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              align='start'
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className='text-xs text-muted-foreground'>
                Teams
              </DropdownMenuLabel>
              {(workspaces ?? []).map((workspace, index) => (
                <DropdownMenuItem
                  key={workspace._id}
                  onClick={() => setCurrentWorkspace(workspace)}
                  className='gap-2 p-2'
                >
                  <div className='flex size-6 items-center justify-center rounded-sm border'>
                    <Command className='size-4 shrink-0' />
                  </div>
                  {workspace.name}
                  {index < 9 && (
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='gap-2 p-2'
                onClick={() => setCreating(true)}
              >
                <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                  <Plus className='size-4' />
                </div>
                <div className='font-medium text-muted-foreground'>
                  Add team
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className='sm:max-w-sm'>
          <form onSubmit={onCreate} className='grid gap-4'>
            <DialogHeader>
              <DialogTitle>Add team</DialogTitle>
              <DialogDescription>
                A team is a BuildBase workspace, with its own members and plan.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              placeholder='Team name'
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <DialogFooter>
              <Button type='submit' disabled={saving || !name.trim()}>
                {saving && <Loader2 className='animate-spin' />}
                Create team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
