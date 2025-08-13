import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Plus, Edit, Search, Calendar, User, Monitor, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Service, Customer, CreateServiceInput, UpdateServiceInput, ServiceStatus } from '../../../server/src/schema';

export default function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateServiceInput>({
    customer_id: 0,
    device_type: '',
    device_model: null,
    device_serial: null,
    problem_description: '',
    repair_notes: null,
    estimated_cost: null
  });

  const [editFormData, setEditFormData] = useState<UpdateServiceInput>({
    id: 0,
    device_type: '',
    device_model: null,
    device_serial: null,
    problem_description: '',
    repair_notes: null,
    estimated_cost: null,
    final_cost: null,
    status: 'received',
    completed_date: null
  });

  const loadServices = useCallback(async () => {
    try {
      const result = await trpc.getServices.query();
      setServices(result);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadCustomers();
  }, [loadServices, loadCustomers]);

  const filteredServices = services.filter((service: Service) => {
    const matchesSearch = service.device_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.device_model && service.device_model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (service.device_serial && service.device_serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      service.problem_description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newService = await trpc.createService.mutate(createFormData);
      setServices((prev: Service[]) => [...prev, newService]);
      setCreateFormData({
        customer_id: 0,
        device_type: '',
        device_model: null,
        device_serial: null,
        problem_description: '',
        repair_notes: null,
        estimated_cost: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    
    setIsLoading(true);
    try {
      const updatedService = await trpc.updateService.mutate(editFormData);
      setServices((prev: Service[]) => 
        prev.map((service: Service) => 
          service.id === updatedService.id ? updatedService : service
        )
      );
      setIsEditDialogOpen(false);
      setEditingService(null);
    } catch (error) {
      console.error('Failed to update service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      id: service.id,
      device_type: service.device_type,
      device_model: service.device_model,
      device_serial: service.device_serial,
      problem_description: service.problem_description,
      repair_notes: service.repair_notes,
      estimated_cost: service.estimated_cost,
      final_cost: service.final_cost,
      status: service.status,
      completed_date: service.completed_date
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: ServiceStatus) => {
    switch (status) {
      case 'received': return 'secondary';
      case 'in_progress': return 'default';
      case 'ready_for_pickup': return 'outline';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'received': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'ready_for_pickup': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wrench className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Service Management</h2>
          <Badge variant="secondary">{services.length} services</Badge>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>Register a new repair service request.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateService}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="create-customer">Customer *</Label>
                  <Select
                    value={createFormData.customer_id.toString()}
                    onValueChange={(value) => setCreateFormData((prev: CreateServiceInput) => ({ ...prev, customer_id: parseInt(value) }))}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-device-type">Device Type *</Label>
                    <Input
                      id="create-device-type"
                      value={createFormData.device_type}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateServiceInput) => ({ ...prev, device_type: e.target.value }))
                      }
                      placeholder="e.g., Laptop, Desktop, Phone"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-device-model">Device Model</Label>
                    <Input
                      id="create-device-model"
                      value={createFormData.device_model || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateServiceInput) => ({ ...prev, device_model: e.target.value || null }))
                      }
                      placeholder="e.g., MacBook Pro 13"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="create-device-serial">Serial Number</Label>
                  <Input
                    id="create-device-serial"
                    value={createFormData.device_serial || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateServiceInput) => ({ ...prev, device_serial: e.target.value || null }))
                    }
                    placeholder="Device serial number"
                  />
                </div>
                <div>
                  <Label htmlFor="create-problem">Problem Description *</Label>
                  <Textarea
                    id="create-problem"
                    value={createFormData.problem_description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateServiceInput) => ({ ...prev, problem_description: e.target.value }))
                    }
                    placeholder="Describe the problem with the device"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-estimated-cost">Estimated Cost</Label>
                    <Input
                      id="create-estimated-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={createFormData.estimated_cost || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateServiceInput) => ({ ...prev, estimated_cost: parseFloat(e.target.value) || null }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-repair-notes">Initial Notes</Label>
                    <Input
                      id="create-repair-notes"
                      value={createFormData.repair_notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateServiceInput) => ({ ...prev, repair_notes: e.target.value || null }))
                      }
                      placeholder="Initial observations"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by device, model, serial, or problem..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No services match your filters.' 
                : 'No services yet. Create one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredServices.map((service: Service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <Monitor className="h-5 w-5 mr-2 text-gray-600" />
                      {service.device_type}
                      {service.device_model && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          {service.device_model}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <User className="h-4 w-4 mr-1" />
                      {getCustomerName(service.customer_id)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(service.status)} className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span className="ml-1">{service.status.replace('_', ' ')}</span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.device_serial && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Serial:</span> {service.device_serial}
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Problem:</span>
                  <p className="text-gray-600 mt-1 line-clamp-2">{service.problem_description}</p>
                </div>

                {service.repair_notes && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="text-gray-600 mt-1 line-clamp-2">{service.repair_notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-gray-500">Estimated:</span>
                    <span className="font-medium ml-1">{formatCurrency(service.estimated_cost)}</span>
                  </div>
                  {service.final_cost !== null && (
                    <div className="text-sm">
                      <span className="text-gray-500">Final:</span>
                      <span className="font-medium text-green-600 ml-1">{formatCurrency(service.final_cost)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Received: {service.received_date.toLocaleDateString()}
                  </div>
                  {service.completed_date && (
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed: {service.completed_date.toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Service</DialogTitle>
            <DialogDescription>Update service information and status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditService}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-device-type">Device Type *</Label>
                  <Input
                    id="edit-device-type"
                    value={editFormData.device_type}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateServiceInput) => ({ ...prev, device_type: e.target.value }))
                    }
                    placeholder="e.g., Laptop, Desktop, Phone"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-device-model">Device Model</Label>
                  <Input
                    id="edit-device-model"
                    value={editFormData.device_model || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateServiceInput) => ({ ...prev, device_model: e.target.value || null }))
                    }
                    placeholder="e.g., MacBook Pro 13"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-device-serial">Serial Number</Label>
                <Input
                  id="edit-device-serial"
                  value={editFormData.device_serial || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateServiceInput) => ({ ...prev, device_serial: e.target.value || null }))
                  }
                  placeholder="Device serial number"
                />
              </div>
              <div>
                <Label htmlFor="edit-problem">Problem Description *</Label>
                <Textarea
                  id="edit-problem"
                  value={editFormData.problem_description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: UpdateServiceInput) => ({ ...prev, problem_description: e.target.value }))
                  }
                  placeholder="Describe the problem with the device"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-repair-notes">Repair Notes</Label>
                <Textarea
                  id="edit-repair-notes"
                  value={editFormData.repair_notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: UpdateServiceInput) => ({ ...prev, repair_notes: e.target.value || null }))
                  }
                  placeholder="Repair progress and notes"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-estimated-cost">Estimated Cost</Label>
                  <Input
                    id="edit-estimated-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.estimated_cost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateServiceInput) => ({ ...prev, estimated_cost: parseFloat(e.target.value) || null }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-final-cost">Final Cost</Label>
                  <Input
                    id="edit-final-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.final_cost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateServiceInput) => ({ ...prev, final_cost: parseFloat(e.target.value) || null }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: ServiceStatus) => 
                      setEditFormData((prev: UpdateServiceInput) => ({ 
                        ...prev, 
                        status: value,
                        completed_date: value === 'completed' ? new Date() : prev.completed_date
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}