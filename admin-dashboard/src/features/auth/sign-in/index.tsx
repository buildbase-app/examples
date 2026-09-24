// Modified from satnaing/shadcn-admin: signs in through BuildBase.
import { useSearch } from '@tanstack/react-router'
import { HostedSignInCard } from '../hosted-sign-in-card'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <HostedSignInCard
      title='Sign in'
      description='Continue to the sign-in page to access your dashboard.'
      cta='Continue to sign in'
      redirect={redirect}
    />
  )
}
