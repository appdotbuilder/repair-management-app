import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { ServiceReceipt } from '../../../server/src/schema';

interface ServiceReceiptProps {
  serviceId: number;
  onClose: () => void;
}

export function ServiceReceiptComponent({ serviceId, onClose }: ServiceReceiptProps) {
  const [receipt, setReceipt] = useState<ServiceReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReceipt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await trpc.generateServiceReceipt.query({ serviceId });
      if (!result) {
        setError('Service not found or receipt cannot be generated');
        return;
      }
      setReceipt(result);
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      setError('Failed to generate receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!receipt) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧾 Service Receipt Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-md">
              ⚠️ {error}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={generateReceipt} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Generating...' : '📄 Generate Receipt'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCost = (receipt.service.final_cost || 0) + receipt.total_parts_cost;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden flex gap-2 mb-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          🖨️ Print Receipt
        </Button>
        <Button variant="outline" onClick={onClose}>
          ← Back
        </Button>
      </div>

      {/* Receipt Content */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl font-bold">Service Receipt</CardTitle>
          <p className="text-sm text-gray-600">Repair Service Completion</p>
        </CardHeader>

        <CardContent className="p-6">
          {/* Customer Information */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              👤 Customer Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>Name:</strong> {receipt.customer.name}</p>
              {receipt.customer.email && (
                <p><strong>Email:</strong> {receipt.customer.email}</p>
              )}
              {receipt.customer.phone && (
                <p><strong>Phone:</strong> {receipt.customer.phone}</p>
              )}
              {receipt.customer.address && (
                <p><strong>Address:</strong> {receipt.customer.address}</p>
              )}
            </div>
          </div>

          {/* Service Information */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              🔧 Service Details
            </h3>
            <div className="bg-blue-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <span><strong>Service ID:</strong> #{receipt.service.id}</span>
                <Badge variant={receipt.service.status === 'completed' ? 'default' : 'secondary'}>
                  {receipt.service.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p><strong>Device:</strong> {receipt.service.device_type} 
                {receipt.service.device_model && ` - ${receipt.service.device_model}`}
              </p>
              {receipt.service.device_serial && (
                <p><strong>Serial:</strong> {receipt.service.device_serial}</p>
              )}
              <p><strong>Problem:</strong> {receipt.service.problem_description}</p>
              {receipt.service.repair_notes && (
                <p><strong>Repair Notes:</strong> {receipt.service.repair_notes}</p>
              )}
              <div className="flex justify-between">
                <span><strong>Received:</strong> {receipt.service.received_date.toLocaleDateString()}</span>
                {receipt.service.completed_date && (
                  <span><strong>Completed:</strong> {receipt.service.completed_date.toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Parts Used */}
          {receipt.service_items.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🔩 Parts Used
              </h3>
              <div className="overflow-hidden border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Part</th>
                      <th className="text-center p-3">Qty</th>
                      <th className="text-right p-3">Unit Price</th>
                      <th className="text-right p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.service_items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-3">{item.quantity}</td>
                        <td className="text-right p-3">${item.unit_price.toFixed(2)}</td>
                        <td className="text-right p-3 font-medium">${item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost Summary */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              💰 Cost Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service Charge:</span>
                <span>${(receipt.service.final_cost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Parts Total:</span>
                <span>${receipt.total_parts_cost.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
            <p>Thank you for choosing our repair service!</p>
            <p>Receipt generated on {new Date().toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}