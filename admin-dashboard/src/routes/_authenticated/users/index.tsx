// Modified from satnaing/shadcn-admin: real workspace members instead of
// generated users.
import { createFileRoute } from '@tanstack/react-router'
import { Members } from '@/features/members'

export const Route = createFileRoute('/_authenticated/users/')({
  component: Members,
})
