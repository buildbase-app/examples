// Added for the BuildBase example: the upstream sign-in and sign-up forms were
// mock-ups; this sends people to BuildBase's hosted page, which offers both.
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSaaSAuth } from '@buildbase/sdk/react'
import { Loader2, LogIn } from 'lucide-react'
import { pendingRedirect } from '@/lib/buildbase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from './auth-layout'

type HostedSignInCardProps = {
  title: string
  description: string
  cta: string
  redirect?: string
}

export function HostedSignInCard({
  title,
  description,
  cta,
  redirect,
}: HostedSignInCardProps) {
  const { isAuthenticated, isLoading, isRedirecting, signIn } = useSaaSAuth()
  const navigate = useNavigate()

  // Back from the hosted page: the provider has exchanged the code, so go on
  // to the page the visitor first asked for.
  useEffect(() => {
    if (!isAuthenticated) return
    navigate({ to: pendingRedirect.peek(), replace: true }).then(
      pendingRedirect.clear
    )
  }, [isAuthenticated, navigate])

  const busy = isLoading || isRedirecting || isAuthenticated

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className='w-full'
            disabled={busy}
            onClick={() => {
              pendingRedirect.save(redirect)
              signIn()
            }}
          >
            {busy ? <Loader2 className='animate-spin' /> : <LogIn />}
            {cta}
          </Button>
        </CardContent>
        <CardFooter>
          <p className='w-full text-center text-sm text-muted-foreground'>
            Email, magic link, social and passkeys, secured by BuildBase.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
