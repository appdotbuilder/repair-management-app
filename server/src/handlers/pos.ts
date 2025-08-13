import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable, customersTable, servicesTable } from '../db/schema';
import { type CreatePosTransactionInput, type PosTransactionSummary } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function createPosTransaction(input: CreatePosTransactionInput): Promise<PosTransactionSummary> {
  try {
    // Validate customer exists
    const customerResults = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customerResults.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }
    const customer = {
      ...customerResults[0],
      created_at: new Date(customerResults[0].created_at)
    };

    // Validate service exists if provided
    let service = null;
    let serviceCharge = 0;
    if (input.service_id) {
      const serviceResults = await db.select()
        .from(servicesTable)
        .where(and(
          eq(servicesTable.id, input.service_id),
          eq(servicesTable.customer_id, input.customer_id),
          eq(servicesTable.status, 'completed')
        ))
        .execute();

      if (serviceResults.length === 0) {
        throw new Error(`Completed service with ID ${input.service_id} not found for this customer`);
      }

      const serviceData = serviceResults[0];
      service = {
        ...serviceData,
        estimated_cost: serviceData.estimated_cost ? parseFloat(serviceData.estimated_cost) : null,
        final_cost: serviceData.final_cost ? parseFloat(serviceData.final_cost) : null,
        received_date: new Date(serviceData.received_date),
        completed_date: serviceData.completed_date ? new Date(serviceData.completed_date) : null,
        created_at: new Date(serviceData.created_at),
        updated_at: new Date(serviceData.updated_at)
      };

      serviceCharge = input.service_charge || (service.final_cost || 0);
    }

    // Validate and prepare product items
    const posItems = [];
    let subtotal = 0;

    for (const item of input.items) {
      // Validate product exists and has sufficient stock
      const productResults = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .execute();

      if (productResults.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      const product = productResults[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
      }

      const totalPrice = item.quantity * item.unit_price;
      subtotal += totalPrice;

      posItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: totalPrice
      });
    }

    // Calculate totals
    const totalBeforeServiceAndTax = subtotal + serviceCharge;
    const taxAmount = totalBeforeServiceAndTax * input.tax_rate;
    const totalAmount = totalBeforeServiceAndTax + taxAmount;

    // Create transaction
    const transactionResults = await db.insert(transactionsTable)
      .values({
        type: 'sale',
        customer_id: input.customer_id,
        supplier_id: null,
        total_amount: totalAmount.toString(),
        transaction_date: new Date().toISOString().split('T')[0],
        notes: input.notes || null
      })
      .returning()
      .execute();

    const transactionData = transactionResults[0];
    const transaction = {
      ...transactionData,
      total_amount: parseFloat(transactionData.total_amount),
      transaction_date: new Date(transactionData.transaction_date),
      created_at: new Date(transactionData.created_at)
    };

    // Create transaction items for products
    for (const item of input.items) {
      const totalPrice = item.quantity * item.unit_price;
      
      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: totalPrice.toString()
        })
        .execute();

      // Update product stock
      await db.update(productsTable)
        .set({
          stock_quantity: sql`stock_quantity - ${item.quantity}`
        })
        .where(eq(productsTable.id, item.product_id))
        .execute();
    }

    // Note: Service charges are included in the total_amount but not as separate transaction items
    // since we can't use a foreign key to a non-existent product for service charges
    // The service charge is tracked in the notes or could be handled via a separate service_transactions table

    return {
      transaction,
      customer,
      service: service || undefined,
      items: posItems,
      subtotal,
      service_charge: serviceCharge,
      tax_amount: taxAmount,
      total_amount: totalAmount
    };

  } catch (error) {
    console.error('POS transaction creation failed:', error);
    throw error;
  }
}

export async function getPosSummary(transactionId: number): Promise<PosTransactionSummary | null> {
  try {
    // Get transaction with customer
    const transactionResults = await db.select()
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .where(and(
        eq(transactionsTable.id, transactionId),
        eq(transactionsTable.type, 'sale')
      ))
      .execute();

    if (transactionResults.length === 0) {
      return null;
    }

    const result = transactionResults[0];
    const transaction = {
      ...result.transactions,
      total_amount: parseFloat(result.transactions.total_amount),
      transaction_date: new Date(result.transactions.transaction_date),
      created_at: new Date(result.transactions.created_at)
    };

    const customer = {
      ...result.customers,
      created_at: new Date(result.customers.created_at)
    };

    // Get transaction items
    const itemResults = await db.select()
      .from(transactionItemsTable)
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    const items = itemResults.map(item => ({
      product_id: item.products.id,
      product_name: item.products.name,
      product_sku: item.products.sku,
      quantity: item.transaction_items.quantity,
      unit_price: parseFloat(item.transaction_items.unit_price),
      total_price: parseFloat(item.transaction_items.total_price)
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

    return {
      transaction,
      customer,
      service: undefined,
      items,
      subtotal,
      service_charge: 0,
      tax_amount: transaction.total_amount - subtotal,
      total_amount: transaction.total_amount
    };

  } catch (error) {
    console.error('Get POS summary failed:', error);
    throw error;
  }
}