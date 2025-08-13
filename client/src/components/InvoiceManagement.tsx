import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Plus, Edit, FileText, Calendar, User, DollarSign, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Invoice, Customer, Service, Transaction, CreateInvoiceInput, UpdateInvoiceInput, InvoiceStatus } from '../../../server/src/schema';

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateInvoiceInput>({
    customer_id: 0,
    service_id: null,
    transaction_id: null,
    invoice_number: '',
    subtotal: 0,
    tax_amount: 0,
    due_date: null,
    notes: null
  });

  const [editFormData, setEditFormData] = useState<UpdateInvoiceInput>({
    id: 0,
    status: 'draft',
    paid_date: null,
    notes: null
  });

  const loadInvoices = useCallback(async () => {
    try {
      const result = await trpc.getInvoices.query();
      setInvoices(result);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  }, []);

  const loadRelatedData = useCallback(async () => {
    try {
      const [customersResult, servicesResult, transactionsResult] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getServices.query(),
        trpc.getSaleTransactions.query()
      ]);
      setCustomers(customersResult);
      setServices(servicesResult);
      setTransactions(transactionsResult);
    } catch (error) {
      console.error('Failed to load related data:', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadRelatedData();
  }, [loadInvoices, loadRelatedData]);

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesStatus;
  });

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const invoiceData = {
        ...createFormData,
        invoice_number: createFormData.invoice_number || generateInvoiceNumber(),
        tax_amount: createFormData.subtotal * 0.1 // 10% tax
      };
      
      const newInvoice = await trpc.createInvoice.mutate(invoiceData);
      setInvoices((prev: Invoice[]) => [...prev, newInvoice]);
      setCreateFormData({
        customer_id: 0,
        service_id: null,
        transaction_id: null,
        invoice_number: '',
        subtotal: 0,
        tax_amount: 0,
        due_date: null,
        notes: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    setIsLoading(true);
    try {
      const updatedInvoice = await trpc.updateInvoice.mutate(editFormData);
      setInvoices((prev: Invoice[]) => 
        prev.map((invoice: Invoice) => 
          invoice.id === updatedInvoice.id ? updatedInvoice : invoice
        )
      );
      setIsEditDialogOpen(false);
      setEditingInvoice(null);
    } catch (error) {
      console.error('Failed to update invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromService = async (serviceId: number) => {
    setIsLoading(true);
    try {
      const newInvoice = await trpc.generateInvoiceFromService.mutate({ serviceId });
      setInvoices((prev: Invoice[]) => [...prev, newInvoice]);
    } catch (error) {
      console.error('Failed to generate invoice from service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditFormData({
      id: invoice.id,
      status: invoice.status,
      paid_date: invoice.paid_date,
      notes: invoice.notes
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'paid': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return <AlertCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getServiceDescription = (serviceId: number | null) => {
    if (!serviceId) return null;
    const service = services.find(s => s.id === serviceId);
    return service ? `${service.device_type} - ${service.problem_description.substring(0, 50)}...` : 'Unknown Service';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalRevenue = filteredInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const pendingAmount = filteredInvoices
    .filter(i => i.status === 'sent')
    .reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Receipt className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
          <Badge variant="secondary">{invoices.length} invoices</Badge>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Create a manual invoice for customer.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-customer">Customer *</Label>
                      <Select
                        value={createFormData.customer_id.toString()}
                        onValueChange={(value) => setCreateFormData((prev: CreateInvoiceInput) => ({ ...prev, customer_id: parseInt(value) }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="create-invoice-number">Invoice Number</Label>
                      <Input
                        id="create-invoice-number"
                        value={createFormData.invoice_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateInvoiceInput) => ({ ...prev, invoice_number: e.target.value }))
                        }
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-service">Related Service (Optional)</Label>
                      <Select
                        value={createFormData.service_id?.toString() || ''}
                        onValueChange={(value) => {
                          const serviceId = value ? parseInt(value) : null;
                          const service = services.find(s => s.id === serviceId);
                          setCreateFormData((prev: CreateInvoiceInput) => ({ 
                            ...prev, 
                            service_id: serviceId,
                            subtotal: service?.final_cost || service?.estimated_cost || prev.subtotal
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No service</SelectItem>
                          {services.filter(s => s.status === 'completed').map((service: Service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.device_type} - {formatCurrency(service.final_cost || service.estimated_cost || 0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="create-transaction">Related Transaction (Optional)</Label>
                      <Select
                        value={createFormData.transaction_id?.toString() || ''}
                        onValueChange={(value) => {
                          const transactionId = value ? parseInt(value) : null;
                          const transaction = transactions.find(t => t.id === transactionId);
                          setCreateFormData((prev: CreateInvoiceInput) => ({ 
                            ...prev, 
                            transaction_id: transactionId,
                            subtotal: transaction?.total_amount || prev.subtotal
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No transaction</SelectItem>
                          {transactions.map((transaction: Transaction) => (
                            <SelectItem key={transaction.id} value={transaction.id.toString()}>
                              Transaction #{transaction.id} - {formatCurrency(transaction.total_amount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="create-subtotal">Subtotal *</Label>
                      <Input
                        id="create-subtotal"
                        type="number"
                        min="0"
                        step="0.01"
                        value={createFormData.subtotal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateInvoiceInput) => ({ ...prev, subtotal: parseFloat(e.target.value) || 0 }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-due-date">Due Date</Label>
                      <Input
                        id="create-due-date"
                        type="date"
                        value={createFormData.due_date?.toISOString().split('T')[0] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateInvoiceInput) => ({ ...prev, due_date: e.target.value ? new Date(e.target.value) : null }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="create-notes">Notes</Label>
                    <Input
                      id="create-notes"
                      value={createFormData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateInvoiceInput) => ({ ...prev, notes: e.target.value || null }))
                      }
                      placeholder="Additional notes"
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(createFormData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (10%):</span>
                      <span>{formatCurrency(createFormData.subtotal * 0.1)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(createFormData.subtotal * 1.1)}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
            <CheckCircle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs opacity-80">{invoices.filter(i => i.status === 'paid').length} paid invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs opacity-80">{invoices.filter(i => i.status === 'sent').length} sent invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter(i => i.status === 'draft').length}</div>
            <p className="text-xs opacity-80">Unsent invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs opacity-80">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Generate invoices from completed services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {services
              .filter(s => s.status === 'completed' && s.final_cost !== null)
              .slice(0, 3)
              .map((service: Service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{service.device_type} - {getCustomerName(service.customer_id)}</p>
                    <p className="text-sm text-gray-500">Final cost: {formatCurrency(service.final_cost!)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateFromService(service.id)}
                    disabled={isLoading}
                  >
                    Generate Invoice
                  </Button>
                </div>
              ))}
            {services.filter(s => s.status === 'completed' && s.final_cost !== null).length === 0 && (
              <p className="text-gray-500 text-center py-4">No completed services available for invoicing.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {statusFilter === 'all' 
                    ? 'No invoices yet. Create one above!'
                    : `No ${statusFilter} invoices found.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice: Invoice) => (
                <Card key={invoice.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-5 w-5 text-indigo-600" />
                        <div>
                          <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                          <CardDescription className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {getCustomerName(invoice.customer_id)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {invoice.issue_date.toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(invoice.status)} className="flex items-center">
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">{invoice.status}</span>
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Subtotal:</span>
                        <div className="font-medium">{formatCurrency(invoice.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tax:</span>
                        <div className="font-medium">{formatCurrency(invoice.tax_amount)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Due Date:</span>
                        <div className="font-medium">
                          {invoice.due_date ? invoice.due_date.toLocaleDateString() : 'No due date'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid Date:</span>
                        <div className="font-medium">
                          {invoice.paid_date ? invoice.paid_date.toLocaleDateString() : 'Not paid'}
                        </div>
                      </div>
                    </div>
                    
                    {invoice.service_id && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm text-gray-500">Related Service:</span>
                        <div className="text-sm">{getServiceDescription(invoice.service_id)}</div>
                      </div>
                    )}
                    
                    {invoice.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm text-gray-500">Notes:</span>
                        <p className="text-sm">{invoice.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice</DialogTitle>
            <DialogDescription>Update invoice status and details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditInvoice}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: InvoiceStatus) => 
                    setEditFormData((prev: UpdateInvoiceInput) => ({ 
                      ...prev, 
                      status: value,
                      paid_date: value === 'paid' ? new Date() : prev.paid_date
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editFormData.status === 'paid' && (
                <div>
                  <Label htmlFor="edit-paid-date">Paid Date</Label>
                  <Input
                    id="edit-paid-date"
                    type="date"
                    value={editFormData.paid_date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateInvoiceInput) => ({ ...prev, paid_date: new Date(e.target.value) }))
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editFormData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateInvoiceInput) => ({ ...prev, notes: e.target.value || null }))
                  }
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}