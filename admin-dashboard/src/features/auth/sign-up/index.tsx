// Modified from satnaing/shadcn-admin: signs up through BuildBase.
import { HostedSignInCard } from '../hosted-sign-in-card'

export function SignUp() {
  return (
    <HostedSignInCard
      title='Create an account'
      description='Sign-up and sign-in share one page. Choose "Register" there.'
      cta='Continue to sign up'
    />
  )
}
