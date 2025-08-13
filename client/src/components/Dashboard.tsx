import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Package, 
  Wrench, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle 
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Service, Product, Customer } from '../../../server/src/schema';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingServices: number;
  completedServices: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    pendingServices: 0,
    completedServices: 0,
    totalRevenue: 0
  });
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all required data
      const [
        customers,
        products,
        lowStock,
        services,
        transactions
      ] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getProducts.query(),
        trpc.getLowStockProducts.query(),
        trpc.getServices.query(),
        trpc.getSaleTransactions.query()
      ]);

      // Calculate stats
      const pendingServices = services.filter(s => s.status !== 'completed').length;
      const completedServices = services.filter(s => s.status === 'completed').length;
      const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);

      setStats({
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStockProducts: lowStock.length,
        pendingServices,
        completedServices,
        totalRevenue
      });

      // Set recent data
      setRecentServices(services.slice(0, 5));
      setLowStockProducts(lowStock.slice(0, 5));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'ready_for_pickup': return 'outline';
      default: return 'destructive';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Overview of your repair business</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          🔄 Refresh Data
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs opacity-80">Active customer base</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            {stats.lowStockProducts > 0 && (
              <p className="text-xs opacity-80 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.lowStockProducts} low stock
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Wrench className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingServices}</div>
            <p className="text-xs opacity-80">{stats.completedServices} completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs opacity-80">From sales transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Recent Services
            </CardTitle>
            <CardDescription>Latest repair requests and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentServices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No services found</p>
            ) : (
              <div className="space-y-3">
                {recentServices.map((service: Service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{service.device_type}</p>
                      <p className="text-xs text-gray-500 truncate">{service.problem_description}</p>
                      <p className="text-xs text-gray-400">
                        Received: {service.received_date.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(service.status)}>
                      {service.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">All products well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product: Product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category || 'Uncategorized'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {product.stock_quantity} left
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Min: {product.min_stock_level}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Customer</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Wrench className="h-6 w-6 mb-2" />
              <span className="text-sm">New Service</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Product</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}