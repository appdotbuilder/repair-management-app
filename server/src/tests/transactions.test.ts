import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, transactionItemsTable, suppliersTable, customersTable, productsTable } from '../db/schema';
import { type CreateTransactionInput, type CreateTransactionItemInput } from '../schema';
import { 
  createTransaction, 
  getTransactions, 
  getTransaction, 
  getPurchaseTransactions, 
  getSaleTransactions,
  createTransactionItem,
  getTransactionItems 
} from '../handlers/transactions';
import { eq } from 'drizzle-orm';

// Test inputs
const testPurchaseInput: CreateTransactionInput = {
  type: 'purchase',
  supplier_id: 1,
  customer_id: null,
  total_amount: 150.00,
  transaction_date: new Date('2023-01-15'),
  notes: 'Purchase from supplier'
};

const testSaleInput: CreateTransactionInput = {
  type: 'sale',
  supplier_id: null,
  customer_id: 1,
  total_amount: 99.99,
  transaction_date: new Date('2023-01-16'),
  notes: 'Sale to customer'
};

const testTransactionItemInput: CreateTransactionItemInput = {
  transaction_id: 1,
  product_id: 1,
  quantity: 2,
  unit_price: 25.50
};

describe('Transaction Handlers', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test supplier
    await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_person: 'John Doe',
        email: 'supplier@test.com',
        phone: '123-456-7890',
        address: '123 Supplier St'
      })
      .execute();

    // Create test customer
    await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '987-654-3210',
        address: '456 Customer Ave'
      })
      .execute();

    // Create test product
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        sku: 'TEST-001',
        category: 'Electronics',
        purchase_price: '20.00',
        selling_price: '30.00',
        stock_quantity: 50,
        min_stock_level: 10
      })
      .execute();
  });

  afterEach(resetDB);

  describe('createTransaction', () => {
    it('should create a purchase transaction', async () => {
      const result = await createTransaction(testPurchaseInput);

      expect(result.type).toBe('purchase');
      expect(result.supplier_id).toBe(1);
      expect(result.customer_id).toBe(null);
      expect(result.total_amount).toBe(150.00);
      expect(typeof result.total_amount).toBe('number');
      expect(result.transaction_date).toEqual(new Date('2023-01-15'));
      expect(result.notes).toBe('Purchase from supplier');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a sale transaction', async () => {
      const result = await createTransaction(testSaleInput);

      expect(result.type).toBe('sale');
      expect(result.supplier_id).toBe(null);
      expect(result.customer_id).toBe(1);
      expect(result.total_amount).toBe(99.99);
      expect(typeof result.total_amount).toBe('number');
      expect(result.transaction_date).toEqual(new Date('2023-01-16'));
      expect(result.notes).toBe('Sale to customer');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save transaction to database', async () => {
      const result = await createTransaction(testPurchaseInput);

      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, result.id))
        .execute();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('purchase');
      expect(transactions[0].supplier_id).toBe(1);
      expect(parseFloat(transactions[0].total_amount)).toBe(150.00);
    });

    it('should create transaction without optional fields', async () => {
      const minimalInput: CreateTransactionInput = {
        type: 'purchase',
        total_amount: 100.00
      };

      const result = await createTransaction(minimalInput);

      expect(result.type).toBe('purchase');
      expect(result.supplier_id).toBe(null);
      expect(result.customer_id).toBe(null);
      expect(result.total_amount).toBe(100.00);
      expect(result.transaction_date).toBeInstanceOf(Date);
      expect(result.notes).toBe(null);
    });

    it('should throw error for invalid supplier_id', async () => {
      const invalidInput: CreateTransactionInput = {
        ...testPurchaseInput,
        supplier_id: 999
      };

      await expect(createTransaction(invalidInput)).rejects.toThrow(/Supplier with ID 999 not found/i);
    });

    it('should throw error for invalid customer_id', async () => {
      const invalidInput: CreateTransactionInput = {
        ...testSaleInput,
        customer_id: 999
      };

      await expect(createTransaction(invalidInput)).rejects.toThrow(/Customer with ID 999 not found/i);
    });
  });

  describe('getTransactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const result = await getTransactions();
      expect(result).toEqual([]);
    });

    it('should return all transactions', async () => {
      await createTransaction(testPurchaseInput);
      await createTransaction(testSaleInput);

      const result = await getTransactions();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('purchase');
      expect(result[0].total_amount).toBe(150.00);
      expect(typeof result[0].total_amount).toBe('number');
      expect(result[1].type).toBe('sale');
      expect(result[1].total_amount).toBe(99.99);
      expect(typeof result[1].total_amount).toBe('number');
    });
  });

  describe('getTransaction', () => {
    it('should return null for non-existent transaction', async () => {
      const result = await getTransaction(999);
      expect(result).toBe(null);
    });

    it('should return specific transaction by id', async () => {
      const created = await createTransaction(testPurchaseInput);
      const result = await getTransaction(created.id);

      expect(result).not.toBe(null);
      expect(result!.id).toBe(created.id);
      expect(result!.type).toBe('purchase');
      expect(result!.total_amount).toBe(150.00);
      expect(typeof result!.total_amount).toBe('number');
    });
  });

  describe('getPurchaseTransactions', () => {
    it('should return only purchase transactions', async () => {
      await createTransaction(testPurchaseInput);
      await createTransaction(testSaleInput);

      const result = await getPurchaseTransactions();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('purchase');
      expect(result[0].total_amount).toBe(150.00);
      expect(typeof result[0].total_amount).toBe('number');
    });

    it('should return empty array when no purchase transactions exist', async () => {
      await createTransaction(testSaleInput);
      
      const result = await getPurchaseTransactions();
      expect(result).toEqual([]);
    });
  });

  describe('getSaleTransactions', () => {
    it('should return only sale transactions', async () => {
      await createTransaction(testPurchaseInput);
      await createTransaction(testSaleInput);

      const result = await getSaleTransactions();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('sale');
      expect(result[0].total_amount).toBe(99.99);
      expect(typeof result[0].total_amount).toBe('number');
    });

    it('should return empty array when no sale transactions exist', async () => {
      await createTransaction(testPurchaseInput);
      
      const result = await getSaleTransactions();
      expect(result).toEqual([]);
    });
  });

  describe('createTransactionItem', () => {
    it('should create transaction item for purchase (increases stock)', async () => {
      // Create a purchase transaction first
      const transaction = await createTransaction(testPurchaseInput);
      
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id
      };

      const result = await createTransactionItem(itemInput);

      expect(result.transaction_id).toBe(transaction.id);
      expect(result.product_id).toBe(1);
      expect(result.quantity).toBe(2);
      expect(result.unit_price).toBe(25.50);
      expect(typeof result.unit_price).toBe('number');
      expect(result.total_price).toBe(51.00);
      expect(typeof result.total_price).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify stock was increased (was 50, should now be 52)
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, 1))
        .execute();
      
      expect(products[0].stock_quantity).toBe(52);
    });

    it('should create transaction item for sale (decreases stock)', async () => {
      // Create a sale transaction first
      const transaction = await createTransaction(testSaleInput);
      
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id
      };

      const result = await createTransactionItem(itemInput);

      expect(result.transaction_id).toBe(transaction.id);
      expect(result.product_id).toBe(1);
      expect(result.quantity).toBe(2);
      expect(result.unit_price).toBe(25.50);
      expect(result.total_price).toBe(51.00);

      // Verify stock was decreased (was 50, should now be 48)
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, 1))
        .execute();
      
      expect(products[0].stock_quantity).toBe(48);
    });

    it('should save transaction item to database', async () => {
      const transaction = await createTransaction(testPurchaseInput);
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id
      };

      const result = await createTransactionItem(itemInput);

      const items = await db.select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.id, result.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].transaction_id).toBe(transaction.id);
      expect(items[0].product_id).toBe(1);
      expect(items[0].quantity).toBe(2);
      expect(parseFloat(items[0].unit_price)).toBe(25.50);
      expect(parseFloat(items[0].total_price)).toBe(51.00);
    });

    it('should throw error for insufficient stock on sale', async () => {
      const transaction = await createTransaction(testSaleInput);
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id,
        quantity: 100 // More than available stock (50)
      };

      await expect(createTransactionItem(itemInput)).rejects.toThrow(/Insufficient stock for product ID 1/i);
    });

    it('should throw error for invalid transaction_id', async () => {
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: 999
      };

      await expect(createTransactionItem(itemInput)).rejects.toThrow(/Transaction with ID 999 not found/i);
    });

    it('should throw error for invalid product_id', async () => {
      const transaction = await createTransaction(testPurchaseInput);
      const itemInput: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id,
        product_id: 999
      };

      await expect(createTransactionItem(itemInput)).rejects.toThrow(/Product with ID 999 not found/i);
    });
  });

  describe('getTransactionItems', () => {
    it('should return empty array for transaction with no items', async () => {
      const transaction = await createTransaction(testPurchaseInput);
      const result = await getTransactionItems(transaction.id);
      expect(result).toEqual([]);
    });

    it('should return all items for a transaction', async () => {
      const transaction = await createTransaction(testPurchaseInput);
      
      const itemInput1: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id
      };
      
      const itemInput2: CreateTransactionItemInput = {
        ...testTransactionItemInput,
        transaction_id: transaction.id,
        quantity: 1,
        unit_price: 10.00
      };

      await createTransactionItem(itemInput1);
      await createTransactionItem(itemInput2);

      const result = await getTransactionItems(transaction.id);

      expect(result).toHaveLength(2);
      expect(result[0].transaction_id).toBe(transaction.id);
      expect(result[0].quantity).toBe(2);
      expect(result[0].unit_price).toBe(25.50);
      expect(typeof result[0].unit_price).toBe('number');
      expect(result[0].total_price).toBe(51.00);
      expect(typeof result[0].total_price).toBe('number');
      
      expect(result[1].transaction_id).toBe(transaction.id);
      expect(result[1].quantity).toBe(1);
      expect(result[1].unit_price).toBe(10.00);
      expect(result[1].total_price).toBe(10.00);
    });

    it('should return empty array for non-existent transaction', async () => {
      const result = await getTransactionItems(999);
      expect(result).toEqual([]);
    });
  });
});