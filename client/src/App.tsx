import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Package, 
  Wrench, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  BarChart3,
  Truck,
  Calendar,
  AlertTriangle 
} from 'lucide-react';

// Import components
import CustomerManagement from './components/CustomerManagement';
import ProductManagement from './components/ProductManagement';
import ServiceManagement from './components/ServiceManagement';
import TransactionManagement from './components/TransactionManagement';
import InvoiceManagement from './components/InvoiceManagement';
import ReportDashboard from './components/ReportDashboard';
import SupplierManagement from './components/SupplierManagement';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Inventory', icon: Package },
    { id: 'services', label: 'Services', icon: Wrench },
    { id: 'transactions', label: 'Transactions', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">RepairPro Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-600">
                🟢 System Online
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation */}
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8 bg-white/50 backdrop-blur-sm">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TabsTrigger 
                  key={item.id} 
                  value={item.id}
                  className="flex flex-col items-center py-3 px-2 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <IconComponent className="h-4 w-4 mb-1" />
                  <span className="hidden sm:inline">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <TabsContent value="dashboard" className="p-6">
              <Dashboard />
            </TabsContent>

            <TabsContent value="customers" className="p-6">
              <CustomerManagement />
            </TabsContent>

            <TabsContent value="products" className="p-6">
              <ProductManagement />
            </TabsContent>

            <TabsContent value="services" className="p-6">
              <ServiceManagement />
            </TabsContent>

            <TabsContent value="transactions" className="p-6">
              <TransactionManagement />
            </TabsContent>

            <TabsContent value="invoices" className="p-6">
              <InvoiceManagement />
            </TabsContent>

            <TabsContent value="suppliers" className="p-6">
              <SupplierManagement />
            </TabsContent>

            <TabsContent value="reports" className="p-6">
              <ReportDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;