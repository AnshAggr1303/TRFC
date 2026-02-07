import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
} from 'lucide-react'

/* ✅ Explicit type for shops */
type Shop = {
  id: string
  name: string
  code: string
  city: string
}

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch shops for quick navigation
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, code, city')
    .eq('is_active', true)
    .order('display_order')
    .returns<Shop[]>() // ✅ FIXES `never` ISSUE

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening across your shops.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Items below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Present today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shops Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Shops</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {shops?.map((shop) => (
            <Card
              key={shop.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{shop.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{shop.city}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                    {shop.code}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    View →
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium">Daily Closing</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Log sales, expenses & inventory
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium">Stock Inward</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Record new inventory purchases
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium">Attendance</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sync & review attendance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
