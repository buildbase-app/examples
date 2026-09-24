// Modified from satnaing/shadcn-admin: every dashboard page needs a BuildBase
// session; without one, the visitor goes to /sign-in and comes back after.
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/buildbase'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (!(await getSession())) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout,
})
