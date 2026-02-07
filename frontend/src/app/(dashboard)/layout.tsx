import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

/* =======================
   TYPES
======================= */

type Role = {
  name: string
  permissions: string[]
}

type AssignedShop = {
  shop: {
    id: string
    name: string
    code: string
  }
}

type Profile = {
  id: string
  full_name: string | null
  role: Role | null
  shops: AssignedShop[]
}

/* =======================
   LAYOUT
======================= */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 🔥 Supabase query
  const { data } = await supabase
    .from('profiles')
    .select(
      `
        id,
        full_name,
        role:roles (
          name,
          permissions
        ),
        shops:user_shop_assignments (
          shop:shops (
            id,
            name,
            code
          )
        )
      `
    )
    .eq('id', user.id)
    .single()

  // ✅ FORCE TYPE HERE (this fixes `never`)
  const profile = data as Profile | null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={{
          name: profile?.full_name ?? user.email ?? 'User',
          email: user.email ?? '',
          role: profile?.role?.name ?? 'User',
        }}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
