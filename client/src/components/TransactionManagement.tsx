import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, ArrowUpDown, TrendingUp, TrendingDown, Calendar, User, Truck, DollarSign, Package } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction, Customer, Supplier, Product, CreateTransactionInput, TransactionType, TransactionItem } from '../../../server/src/schema';

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactionItems, setTransactionItems] = useState<{ [key: number]: TransactionItem[] }>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Array<{ product_id: number; quantity: number; unit_price: number }>>([]);

  const [createFormData, setCreateFormData] = useState<CreateTransactionInput>({
    type: 'sale',
    customer_id: null,
    supplier_id: null,
    total_amount: 0,
    transaction_date: new Date(),
    notes: null
  });

  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query();
      setTransactions(result);
      
      // Load items for each transaction
      const itemsPromises = result.map(async (transaction: Transaction) => {
        try {
          const items = await trpc.getTransactionItems.query({ transactionId: transaction.id });
          return { transactionId: transaction.id, items };
        } catch (error) {
          console.error(`Failed to load items for transaction ${transaction.id}:`, error);
          return { transactionId: transaction.id, items: [] };
        }
      });
      
      const itemsResults = await Promise.all(itemsPromises);
      const itemsMap: { [key: number]: TransactionItem[] } = {};
      itemsResults.forEach(({ transactionId, items }) => {
        itemsMap[transactionId] = items;
      });
      setTransactionItems(itemsMap);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  const loadRelatedData = useCallback(async () => {
    try {
      const [customersResult, suppliersResult, productsResult] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getSuppliers.query(),
        trpc.getProducts.query()
      ]);
      setCustomers(customersResult);
      setSuppliers(suppliersResult);
      setProducts(productsResult);
    } catch (error) {
      console.error('Failed to load related data:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadRelatedData();
  }, [loadTransactions, loadRelatedData]);

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesType;
  });

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Calculate total amount from selected items
      const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const transactionData = {
        ...createFormData,
        total_amount: totalAmount
      };

      const newTransaction = await trpc.createTransaction.mutate(transactionData);

      // Create transaction items
      const itemPromises = selectedItems.map(item => 
        trpc.createTransactionItem.mutate({
          transaction_id: newTransaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })
      );

      await Promise.all(itemPromises);

      // Reload data
      await loadTransactions();
      
      // Reset form
      setCreateFormData({
        type: 'sale',
        customer_id: null,
        supplier_id: null,
        total_amount: 0,
        transaction_date: new Date(),
        notes: null
      });
      setSelectedItems([]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setSelectedItems(prev => [...prev, { product_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: number) => {
    setSelectedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const getEntityName = (transaction: Transaction) => {
    if (transaction.type === 'sale' && transaction.customer_id) {
      const customer = customers.find(c => c.id === transaction.customer_id);
      return customer ? customer.name : 'Unknown Customer';
    } else if (transaction.type === 'purchase' && transaction.supplier_id) {
      const supplier = suppliers.find(s => s.id === transaction.supplier_id);
      return supplier ? supplier.name : 'Unknown Supplier';
    }
    return 'Unknown';
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const salesTotal = filteredTransactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const purchaseTotal = filteredTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Transaction Management</h2>
          <Badge variant="secondary">{transactions.length} transactions</Badge>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Transaction</DialogTitle>
              <DialogDescription>Create a purchase or sale transaction with items.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTransaction}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="create-type">Transaction Type *</Label>
                    <Select
                      value={createFormData.type}
                      onValueChange={(value: TransactionType) => 
                        setCreateFormData((prev: CreateTransactionInput) => ({ 
                          ...prev, 
                          type: value,
                          customer_id: value === 'purchase' ? null : prev.customer_id,
                          supplier_id: value === 'sale' ? null : prev.supplier_id
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Sale</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {createFormData.type === 'sale' && (
                    <div>
                      <Label htmlFor="create-customer">Customer *</Label>
                      <Select
                        value={createFormData.customer_id?.toString() || ''}
                        onValueChange={(value) => 
                          setCreateFormData((prev: CreateTransactionInput) => ({ ...prev, customer_id: parseInt(value) }))
                        }
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
                  )}
                  {createFormData.type === 'purchase' && (
                    <div>
                      <Label htmlFor="create-supplier">Supplier *</Label>
                      <Select
                        value={createFormData.supplier_id?.toString() || ''}
                        onValueChange={(value) => 
                          setCreateFormData((prev: CreateTransactionInput) => ({ ...prev, supplier_id: parseInt(value) }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier: Supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="create-date">Transaction Date</Label>
                    <Input
                      id="create-date"
                      type="date"
                      value={(createFormData.transaction_date || new Date()).toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateTransactionInput) => ({ ...prev, transaction_date: new Date(e.target.value) }))
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
                      setCreateFormData((prev: CreateTransactionInput) => ({ ...prev, notes: e.target.value || null }))
                    }
                    placeholder="Optional transaction notes"
                  />
                </div>

                {/* Items Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-semibold">Transaction Items</Label>
                    <Button type="button" onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  {selectedItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items added. Click "Add Item" to start.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-end p-3 border rounded-lg">
                          <div>
                            <Label className="text-xs">Product</Label>
                            <Select
                              value={item.product_id.toString()}
                              onValueChange={(value) => {
                                const productId = parseInt(value);
                                const product = products.find(p => p.id === productId);
                                updateItem(index, 'product_id', productId);
                                if (product) {
                                  updateItem(index, 'unit_price', 
                                    createFormData.type === 'sale' ? product.selling_price : product.purchase_price
                                  );
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product: Product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="text-sm font-medium bg-gray-50 p-2 rounded">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="border-t pt-3">
                        <div className="flex justify-end">
                          <div className="text-lg font-semibold">
                            Total: {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading || selectedItems.length === 0}>
                  {isLoading ? 'Creating...' : 'Create Transaction'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sales Revenue</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesTotal)}</div>
            <p className="text-xs opacity-80">From {transactions.filter(t => t.type === 'sale').length} sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Purchase Costs</CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(purchaseTotal)}</div>
            <p className="text-xs opacity-80">From {transactions.filter(t => t.type === 'purchase').length} purchases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesTotal - purchaseTotal)}</div>
            <p className="text-xs opacity-80">Sales - Purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Tabs */}
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="sale">Sales</TabsTrigger>
          <TabsTrigger value="purchase">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value={typeFilter} className="mt-6">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {typeFilter === 'all' 
                    ? 'No transactions yet. Create one above!'
                    : `No ${typeFilter} transactions found.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction: Transaction) => (
                <Card key={transaction.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {transaction.type === 'sale' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <CardTitle className="text-lg">
                            {transaction.type === 'sale' ? 'Sale' : 'Purchase'} #{transaction.id}
                          </CardTitle>
                          <CardDescription className="flex items-center">
                            {transaction.type === 'sale' ? (
                              <User className="h-4 w-4 mr-1" />
                            ) : (
                              <Truck className="h-4 w-4 mr-1" />
                            )}
                            {getEntityName(transaction)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {transaction.transaction_date.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transaction.notes && (
                      <p className="text-sm text-gray-600 mb-3">{transaction.notes}</p>
                    )}
                    
                    {/* Transaction Items */}
                    {transactionItems[transaction.id] && transactionItems[transaction.id].length > 0 && (
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          Items ({transactionItems[transaction.id].length})
                        </h4>
                        <div className="space-y-2">
                          {transactionItems[transaction.id].map((item: TransactionItem) => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span>{getProductName(item.product_id)}</span>
                              <span className="text-gray-600">
                                {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}