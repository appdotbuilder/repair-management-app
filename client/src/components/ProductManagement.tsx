import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Edit, Trash2, AlertTriangle, Search, DollarSign, Box } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    sku: null,
    category: null,
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 5
  });

  const [editFormData, setEditFormData] = useState<UpdateProductInput>({
    id: 0,
    name: '',
    description: null,
    sku: null,
    category: null,
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 5
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'low' && product.stock_quantity <= product.min_stock_level) ||
      (stockFilter === 'out' && product.stock_quantity === 0) ||
      (stockFilter === 'in' && product.stock_quantity > product.min_stock_level);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newProduct = await trpc.createProduct.mutate(createFormData);
      setProducts((prev: Product[]) => [...prev, newProduct]);
      setCreateFormData({
        name: '',
        description: null,
        sku: null,
        category: null,
        purchase_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        min_stock_level: 5
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsLoading(true);
    try {
      const updatedProduct = await trpc.updateProduct.mutate(editFormData);
      setProducts((prev: Product[]) => 
        prev.map((product: Product) => 
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await trpc.deleteProduct.mutate({ id: productId });
      setProducts((prev: Product[]) => 
        prev.filter((product: Product) => product.id !== productId)
      );
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level
    });
    setIsEditDialogOpen(true);
  };

  const getStockBadgeVariant = (product: Product) => {
    if (product.stock_quantity === 0) return 'destructive';
    if (product.stock_quantity <= product.min_stock_level) return 'secondary';
    return 'default';
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return 'Out of Stock';
    if (product.stock_quantity <= product.min_stock_level) return 'Low Stock';
    return 'In Stock';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <Badge variant="secondary">{products.length} products</Badge>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Enter product details to add to inventory.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProduct}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Product Name *</Label>
                  <Input
                    id="create-name"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Product name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-sku">SKU</Label>
                  <Input
                    id="create-sku"
                    value={createFormData.sku || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value || null }))
                    }
                    placeholder="SKU-001"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="create-description">Description</Label>
                  <Input
                    id="create-description"
                    value={createFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, description: e.target.value || null }))
                    }
                    placeholder="Product description"
                  />
                </div>
                <div>
                  <Label htmlFor="create-category">Category</Label>
                  <Input
                    id="create-category"
                    value={createFormData.category || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, category: e.target.value || null }))
                    }
                    placeholder="e.g., RAM, SSD, Screen"
                  />
                </div>
                <div>
                  <Label htmlFor="create-min-stock">Min Stock Level *</Label>
                  <Input
                    id="create-min-stock"
                    type="number"
                    min="0"
                    value={createFormData.min_stock_level}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-purchase-price">Purchase Price *</Label>
                  <Input
                    id="create-purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createFormData.purchase_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-selling-price">Selling Price *</Label>
                  <Input
                    id="create-selling-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createFormData.selling_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-stock">Stock Quantity *</Label>
                  <Input
                    id="create-stock"
                    type="number"
                    min="0"
                    value={createFormData.stock_quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Product'}
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
            placeholder="Search products by name, SKU, or description..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category: string | null) => 
              category ? (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ) : null
            )}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                ? 'No products match your filters.' 
                : 'No products yet. Add one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {product.category && (
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      )}
                      {product.sku && (
                        <span className="text-xs text-gray-500">{product.sku}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {product.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Box className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{product.stock_quantity} units</span>
                    <Badge variant={getStockBadgeVariant(product)} className="text-xs">
                      {getStockStatus(product)}
                    </Badge>
                  </div>
                  {product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0 && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-gray-500">Purchase: </span>
                    <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Selling: </span>
                    <span className="font-medium text-green-600">{formatCurrency(product.selling_price)}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Min: {product.min_stock_level}</span>
                  <span>Updated: {product.updated_at.toLocaleDateString()}</span>
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
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProduct}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Product name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-sku">SKU</Label>
                <Input
                  id="edit-sku"
                  value={editFormData.sku || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, sku: e.target.value || null }))
                  }
                  placeholder="SKU-001"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Product description"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editFormData.category || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, category: e.target.value || null }))
                  }
                  placeholder="e.g., RAM, SSD, Screen"
                />
              </div>
              <div>
                <Label htmlFor="edit-min-stock">Min Stock Level *</Label>
                <Input
                  id="edit-min-stock"
                  type="number"
                  min="0"
                  value={editFormData.min_stock_level}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-purchase-price">Purchase Price *</Label>
                <Input
                  id="edit-purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.purchase_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-selling-price">Selling Price *</Label>
                <Input
                  id="edit-selling-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.selling_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-stock">Stock Quantity *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  value={editFormData.stock_quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}