import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
// Correct relative path for types
import type { Customer, Product, Service, CreatePosTransactionInput, PosTransactionSummary } from '../../../server/src/schema';

interface PosItem {
  product_id: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  available_stock: number;
}

export function PosSystem() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<PosTransactionSummary | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<PosItem[]>([]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [taxRate, setTaxRate] = useState(0.1); // 10% tax
  const [notes, setNotes] = useState('');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [customersData, productsData] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getProducts.query()
      ]);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadCustomerServices = useCallback(async (customerId: number) => {
    try {
      const customerServices = await trpc.getServicesByCustomer.query({ customerId });
      // Only show completed services
      const completedServices = customerServices.filter(service => service.status === 'completed');
      setServices(completedServices);
    } catch (error) {
      console.error('Failed to load customer services:', error);
      setServices([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerServices(selectedCustomerId);
    } else {
      setServices([]);
    }
    setSelectedServiceId(null);
    setServiceCharge(0);
  }, [selectedCustomerId, loadCustomerServices]);

  useEffect(() => {
    if (selectedServiceId) {
      const service = services.find(s => s.id === selectedServiceId);
      if (service && service.final_cost) {
        setServiceCharge(service.final_cost);
      }
    } else {
      setServiceCharge(0);
    }
  }, [selectedServiceId, services]);

  const addToCart = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cartItems.find(item => item.product_id === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        alert('Cannot add more items than available in stock');
        return;
      }
      setCartItems((prev: PosItem[]) => 
        prev.map(item => 
          item.product_id === productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.stock_quantity <= 0) {
        alert('Product is out of stock');
        return;
      }
      setCartItems((prev: PosItem[]) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: 1,
          unit_price: product.selling_price,
          available_stock: product.stock_quantity
        }
      ]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCartItems((prev: PosItem[]) => prev.filter(item => item.product_id !== productId));
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cartItems.find(item => item.product_id === productId);
    if (item && quantity > item.available_stock) {
      alert('Cannot exceed available stock');
      return;
    }

    setCartItems((prev: PosItem[]) =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const updateCartItemPrice = (productId: number, unitPrice: number) => {
    if (unitPrice < 0) return;

    setCartItems((prev: PosItem[]) =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, unit_price: unitPrice }
          : item
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalBeforeTax = subtotal + serviceCharge;
    const taxAmount = totalBeforeTax * taxRate;
    const total = totalBeforeTax + taxAmount;

    return { subtotal, serviceCharge, taxAmount, total };
  };

  const handleSubmitTransaction = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }

    if (cartItems.length === 0 && serviceCharge === 0) {
      alert('Please add items to cart or select a service');
      return;
    }

    setIsLoading(true);
    try {
      const transactionInput: CreatePosTransactionInput = {
        customer_id: selectedCustomerId,
        service_id: selectedServiceId,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        service_charge: serviceCharge,
        tax_rate: taxRate,
        notes: notes || null
      };

      const result = await trpc.createPosTransaction.mutate(transactionInput);
      setCompletedTransaction(result);
      setTransactionComplete(true);
      
      // Reset form
      setSelectedCustomerId(null);
      setSelectedServiceId(null);
      setCartItems([]);
      setServiceCharge(0);
      setNotes('');
      
      // Refresh products to get updated stock
      await loadData();
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTransaction = () => {
    setTransactionComplete(false);
    setCompletedTransaction(null);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  if (transactionComplete && completedTransaction) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader className="text-center bg-green-50">
            <CardTitle className="text-2xl text-green-800 flex items-center justify-center gap-2">
              ✅ Transaction Completed Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">Transaction #{completedTransaction.transaction.id}</p>
                <p className="text-gray-600">{completedTransaction.transaction.created_at.toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Customer:</h3>
                <p>{completedTransaction.customer.name}</p>
                {completedTransaction.customer.phone && <p>📞 {completedTransaction.customer.phone}</p>}
              </div>

              {completedTransaction.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Items Purchased:</h3>
                  <div className="space-y-2">
                    {completedTransaction.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span className="font-medium">${item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedTransaction.service && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-semibold mb-2">Service Included:</h3>
                  <p>Service #{completedTransaction.service.id} - {completedTransaction.service.device_type}</p>
                  <p className="font-medium">Service Charge: ${completedTransaction.service_charge.toFixed(2)}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>${completedTransaction.subtotal.toFixed(2)}</span></div>
                {completedTransaction.service_charge > 0 && (
                  <div className="flex justify-between"><span>Service Charge:</span><span>${completedTransaction.service_charge.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span>Tax:</span><span>${completedTransaction.tax_amount.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span><span>${completedTransaction.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={() => window.print()} className="flex-1">
                  🖨️ Print Receipt
                </Button>
                <Button variant="outline" onClick={resetTransaction} className="flex-1">
                  🛒 New Transaction
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        🏪 POS System (Cashier)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Service Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">👤 Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedCustomerId?.toString() || ''} 
                onValueChange={(value) => setSelectedCustomerId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                      {customer.phone && ` - ${customer.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedCustomerId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🔧 Link Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedServiceId?.toString() || ''}
                  onValueChange={(value) => setSelectedServiceId(value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select completed service (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No service</SelectItem>
                    {services.map((service: Service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        #{service.id} - {service.device_type} (${service.final_cost?.toFixed(2) || '0.00'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedServiceId && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Charge:</label>
                    <Input
                      type="number"
                      value={serviceCharge}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServiceCharge(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Product Selection */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🛍️ Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.filter(product => product.stock_quantity > 0).map((product: Product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        ${product.selling_price.toFixed(2)} | Stock: {product.stock_quantity}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => addToCart(product.id)}
                      disabled={!selectedCustomerId}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart & Checkout */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🛒 Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.length === 0 && serviceCharge === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item: PosItem) => (
                    <div key={item.product_id} className="border p-3 rounded space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{item.product_name}</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          ✕
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              updateCartItemQuantity(item.product_id, parseInt(e.target.value) || 0)
                            }
                            min="1"
                            max={item.available_stock}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">Price</label>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              updateCartItemPrice(item.product_id, parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="text-right font-medium">
                        Total: ${(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {serviceCharge > 0 && (
                    <div className="border p-3 rounded bg-blue-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Service Charge</span>
                        <span className="font-medium">${serviceCharge.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium mb-1">Tax Rate (%):</label>
                <Input
                  type="number"
                  value={taxRate * 100}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional):</label>
                <Textarea
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              {/* Total Summary */}
              <div className="space-y-2 p-4 bg-gray-50 rounded">
                <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between"><span>Service:</span><span>${serviceCharge.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span>Tax ({(taxRate * 100).toFixed(1)}%):</span><span>${taxAmount.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                onClick={handleSubmitTransaction}
                disabled={isLoading || !selectedCustomerId || (cartItems.length === 0 && serviceCharge === 0)}
                className="w-full"
              >
                {isLoading ? 'Processing...' : '💳 Complete Transaction'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}