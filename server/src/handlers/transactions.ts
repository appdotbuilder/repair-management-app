import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable, suppliersTable, customersTable } from '../db/schema';
import { type Transaction, type CreateTransactionInput, type TransactionItem, type CreateTransactionItemInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Validate foreign key references
    if (input.supplier_id) {
      const supplier = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, input.supplier_id))
        .execute();
      
      if (supplier.length === 0) {
        throw new Error(`Supplier with ID ${input.supplier_id} not found`);
      }
    }

    if (input.customer_id) {
      const customer = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();
      
      if (customer.length === 0) {
        throw new Error(`Customer with ID ${input.customer_id} not found`);
      }
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        type: input.type,
        supplier_id: input.supplier_id || null,
        customer_id: input.customer_id || null,
        total_amount: input.total_amount.toString(),
        transaction_date: (input.transaction_date || new Date()).toISOString().split('T')[0],
        notes: input.notes || null
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const transaction = result[0];
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .execute();

    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const transaction = results[0];
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at)
    };
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    throw error;
  }
}

export async function getPurchaseTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.type, 'purchase'))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch purchase transactions:', error);
    throw error;
  }
}

export async function getSaleTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.type, 'sale'))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch sale transactions:', error);
    throw error;
  }
}

export async function createTransactionItem(input: CreateTransactionItemInput): Promise<TransactionItem> {
  try {
    // Validate foreign key references
    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();
    
    if (transaction.length === 0) {
      throw new Error(`Transaction with ID ${input.transaction_id} not found`);
    }

    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();
    
    if (product.length === 0) {
      throw new Error(`Product with ID ${input.product_id} not found`);
    }

    const totalPrice = input.quantity * input.unit_price;

    // Insert transaction item record
    const result = await db.insert(transactionItemsTable)
      .values({
        transaction_id: input.transaction_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(),
        total_price: totalPrice.toString()
      })
      .returning()
      .execute();

    // Update product stock based on transaction type
    const transactionType = transaction[0].type;
    const productRecord = product[0];
    
    let newStockQuantity: number;
    if (transactionType === 'purchase') {
      // Purchase increases stock
      newStockQuantity = productRecord.stock_quantity + input.quantity;
    } else {
      // Sale decreases stock
      newStockQuantity = productRecord.stock_quantity - input.quantity;
      if (newStockQuantity < 0) {
        throw new Error(`Insufficient stock for product ID ${input.product_id}. Available: ${productRecord.stock_quantity}, Requested: ${input.quantity}`);
      }
    }

    await db.update(productsTable)
      .set({ stock_quantity: newStockQuantity })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const transactionItem = result[0];
    return {
      ...transactionItem,
      unit_price: parseFloat(transactionItem.unit_price),
      total_price: parseFloat(transactionItem.total_price),
      created_at: new Date(transactionItem.created_at)
    };
  } catch (error) {
    console.error('Transaction item creation failed:', error);
    throw error;
  }
}

export async function getTransactionItems(transactionId: number): Promise<TransactionItem[]> {
  try {
    const results = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price),
      created_at: new Date(item.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch transaction items:', error);
    throw error;
  }
}