import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput } from '../schema';
import { 
  createProduct, 
  getProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct, 
  getLowStockProducts 
} from '../handlers/products';
import { eq } from 'drizzle-orm';

// Test input data
const testProductInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  sku: 'TEST-001',
  category: 'Electronics',
  purchase_price: 19.99,
  selling_price: 29.99,
  stock_quantity: 100,
  min_stock_level: 10
};

const lowStockProductInput: CreateProductInput = {
  name: 'Low Stock Product',
  description: 'Product with low stock',
  sku: 'LOW-001',
  category: 'Electronics',
  purchase_price: 5.50,
  selling_price: 12.75,
  stock_quantity: 5,
  min_stock_level: 20
};

describe('Product Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createProduct', () => {
    it('should create a product with all fields', async () => {
      const result = await createProduct(testProductInput);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual('Test Product');
      expect(result.description).toEqual('A product for testing');
      expect(result.sku).toEqual('TEST-001');
      expect(result.category).toEqual('Electronics');
      expect(result.purchase_price).toEqual(19.99);
      expect(result.selling_price).toEqual(29.99);
      expect(result.stock_quantity).toEqual(100);
      expect(result.min_stock_level).toEqual(10);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify numeric types
      expect(typeof result.purchase_price).toBe('number');
      expect(typeof result.selling_price).toBe('number');
      expect(typeof result.stock_quantity).toBe('number');
      expect(typeof result.min_stock_level).toBe('number');
    });

    it('should create a product with minimal fields', async () => {
      const minimalInput: CreateProductInput = {
        name: 'Minimal Product',
        purchase_price: 10.00,
        selling_price: 15.00,
        stock_quantity: 50
      };

      const result = await createProduct(minimalInput);

      expect(result.name).toEqual('Minimal Product');
      expect(result.description).toBeNull();
      expect(result.sku).toBeNull();
      expect(result.category).toBeNull();
      expect(result.purchase_price).toEqual(10.00);
      expect(result.selling_price).toEqual(15.00);
      expect(result.stock_quantity).toEqual(50);
      expect(result.min_stock_level).toEqual(0); // Default value
    });

    it('should save product to database', async () => {
      const result = await createProduct(testProductInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      expect(products[0].name).toEqual('Test Product');
      expect(parseFloat(products[0].purchase_price)).toEqual(19.99);
      expect(parseFloat(products[0].selling_price)).toEqual(29.99);
      expect(products[0].stock_quantity).toEqual(100);
      expect(products[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getProducts', () => {
    it('should return empty array when no products exist', async () => {
      const result = await getProducts();
      expect(result).toEqual([]);
    });

    it('should return all products', async () => {
      // Create multiple products
      await createProduct(testProductInput);
      await createProduct({
        ...testProductInput,
        name: 'Second Product',
        sku: 'TEST-002'
      });

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Test Product');
      expect(result[1].name).toEqual('Second Product');
      
      // Verify numeric conversions
      result.forEach(product => {
        expect(typeof product.purchase_price).toBe('number');
        expect(typeof product.selling_price).toBe('number');
      });
    });
  });

  describe('getProduct', () => {
    it('should return null when product does not exist', async () => {
      const result = await getProduct(999);
      expect(result).toBeNull();
    });

    it('should return specific product by id', async () => {
      const created = await createProduct(testProductInput);
      const result = await getProduct(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Product');
      expect(result!.purchase_price).toEqual(19.99);
      expect(result!.selling_price).toEqual(29.99);
      
      // Verify numeric types
      expect(typeof result!.purchase_price).toBe('number');
      expect(typeof result!.selling_price).toBe('number');
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const created = await createProduct(testProductInput);
      
      const updateInput: UpdateProductInput = {
        id: created.id,
        name: 'Updated Product Name',
        purchase_price: 25.50,
        selling_price: 35.75,
        stock_quantity: 150
      };

      const result = await updateProduct(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Product Name');
      expect(result.purchase_price).toEqual(25.50);
      expect(result.selling_price).toEqual(35.75);
      expect(result.stock_quantity).toEqual(150);
      expect(result.description).toEqual(testProductInput.description || null); // Unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update only specified fields', async () => {
      const created = await createProduct(testProductInput);
      
      const updateInput: UpdateProductInput = {
        id: created.id,
        name: 'Partial Update'
      };

      const result = await updateProduct(updateInput);

      expect(result.name).toEqual('Partial Update');
      expect(result.purchase_price).toEqual(19.99); // Unchanged
      expect(result.selling_price).toEqual(29.99); // Unchanged
      expect(result.stock_quantity).toEqual(100); // Unchanged
    });

    it('should throw error when product does not exist', async () => {
      const updateInput: UpdateProductInput = {
        id: 999,
        name: 'Non-existent Product'
      };

      expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should save updated data to database', async () => {
      const created = await createProduct(testProductInput);
      
      const updateInput: UpdateProductInput = {
        id: created.id,
        name: 'Database Update Test',
        purchase_price: 99.99
      };

      await updateProduct(updateInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, created.id))
        .execute();

      expect(products).toHaveLength(1);
      expect(products[0].name).toEqual('Database Update Test');
      expect(parseFloat(products[0].purchase_price)).toEqual(99.99);
    });
  });

  describe('deleteProduct', () => {
    it('should delete existing product', async () => {
      const created = await createProduct(testProductInput);

      await deleteProduct(created.id);

      // Verify product is deleted
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, created.id))
        .execute();

      expect(products).toHaveLength(0);
    });

    it('should throw error when product does not exist', async () => {
      expect(deleteProduct(999)).rejects.toThrow(/not found/i);
    });

    it('should not affect other products', async () => {
      const product1 = await createProduct(testProductInput);
      const product2 = await createProduct({
        ...testProductInput,
        name: 'Keep This Product',
        sku: 'KEEP-001'
      });

      await deleteProduct(product1.id);

      // Verify product2 still exists
      const remaining = await getProduct(product2.id);
      expect(remaining).not.toBeNull();
      expect(remaining!.name).toEqual('Keep This Product');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return empty array when no low stock products', async () => {
      await createProduct(testProductInput); // stock_quantity (100) > min_stock_level (10)

      const result = await getLowStockProducts();
      expect(result).toEqual([]);
    });

    it('should return products with stock below minimum level', async () => {
      // Create product with normal stock
      await createProduct(testProductInput);
      
      // Create product with low stock
      const lowStock = await createProduct(lowStockProductInput);

      const result = await getLowStockProducts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(lowStock.id);
      expect(result[0].name).toEqual('Low Stock Product');
      expect(result[0].stock_quantity).toEqual(5);
      expect(result[0].min_stock_level).toEqual(20);
      
      // Verify numeric conversions
      expect(typeof result[0].purchase_price).toBe('number');
      expect(typeof result[0].selling_price).toBe('number');
    });

    it('should return multiple low stock products', async () => {
      // Create multiple low stock products
      await createProduct(lowStockProductInput);
      await createProduct({
        ...lowStockProductInput,
        name: 'Another Low Stock',
        sku: 'LOW-002',
        stock_quantity: 3,
        min_stock_level: 15
      });
      
      // Create normal stock product
      await createProduct(testProductInput);

      const result = await getLowStockProducts();

      expect(result).toHaveLength(2);
      result.forEach(product => {
        expect(product.stock_quantity).toBeLessThan(product.min_stock_level);
      });
    });

    it('should handle edge case where stock equals minimum level', async () => {
      // Create product with stock equal to minimum (should not be included)
      await createProduct({
        ...testProductInput,
        stock_quantity: 10,
        min_stock_level: 10
      });

      const result = await getLowStockProducts();
      expect(result).toHaveLength(0);
    });
  });
});