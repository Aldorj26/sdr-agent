import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <>
      <style>{`.app-main { margin-left: 0 !important; }`}</style>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  )
}
