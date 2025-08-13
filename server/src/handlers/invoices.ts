import { db } from '../db';
import { invoicesTable, customersTable, servicesTable, serviceItemsTable, productsTable } from '../db/schema';
import { type Invoice, type CreateInvoiceInput, type UpdateInvoiceInput, type InvoiceStatus } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

// Helper function to format date for database (YYYY-MM-DD string)
const formatDateForDB = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

// Helper function to parse date from database
const parseDateFromDB = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString + 'T00:00:00.000Z'); // Ensure UTC interpretation
};

// Helper function to convert database invoice to typed invoice
const convertInvoice = (invoice: any): Invoice => ({
  ...invoice,
  subtotal: parseFloat(invoice.subtotal),
  tax_amount: parseFloat(invoice.tax_amount),
  total_amount: parseFloat(invoice.total_amount),
  issue_date: parseDateFromDB(invoice.issue_date)!,
  due_date: parseDateFromDB(invoice.due_date),
  paid_date: parseDateFromDB(invoice.paid_date)
});

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with id ${input.customer_id} does not exist`);
    }

    // Verify service exists if service_id is provided
    if (input.service_id) {
      const service = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, input.service_id))
        .execute();

      if (service.length === 0) {
        throw new Error(`Service with id ${input.service_id} does not exist`);
      }
    }

    const taxAmount = input.tax_amount || 0;
    const totalAmount = input.subtotal + taxAmount;

    const result = await db.insert(invoicesTable)
      .values({
        customer_id: input.customer_id,
        service_id: input.service_id || null,
        transaction_id: input.transaction_id || null,
        invoice_number: input.invoice_number,
        subtotal: input.subtotal.toString(),
        tax_amount: taxAmount.toString(),
        total_amount: totalAmount.toString(),
        due_date: formatDateForDB(input.due_date || null),
        notes: input.notes || null
      })
      .returning()
      .execute();

    return convertInvoice(result[0]);
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const results = await db.select()
      .from(invoicesTable)
      .execute();

    return results.map(convertInvoice);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  try {
    const results = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return convertInvoice(results[0]);
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    throw error;
  }
}

export async function updateInvoice(input: UpdateInvoiceInput): Promise<Invoice> {
  try {
    // Verify invoice exists
    const existingInvoice = await getInvoice(input.id);
    if (!existingInvoice) {
      throw new Error(`Invoice with id ${input.id} does not exist`);
    }

    const result = await db.update(invoicesTable)
      .set({
        status: input.status,
        paid_date: formatDateForDB(input.paid_date || null),
        notes: input.notes,
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    return convertInvoice(result[0]);
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
}

export async function getInvoicesByCustomer(customerId: number): Promise<Invoice[]> {
  try {
    const results = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.customer_id, customerId))
      .execute();

    return results.map(convertInvoice);
  } catch (error) {
    console.error('Failed to fetch invoices by customer:', error);
    throw error;
  }
}

export async function getInvoicesByStatus(status: string): Promise<Invoice[]> {
  try {
    // Validate status is a valid InvoiceStatus
    const validStatuses = ['draft', 'sent', 'paid', 'cancelled'] as const;
    if (!validStatuses.includes(status as InvoiceStatus)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const results = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.status, status as InvoiceStatus))
      .execute();

    return results.map(convertInvoice);
  } catch (error) {
    console.error('Failed to fetch invoices by status:', error);
    throw error;
  }
}

export async function generateInvoiceFromService(serviceId: number): Promise<Invoice> {
  try {
    // Verify service exists and get service details
    const serviceResults = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();

    if (serviceResults.length === 0) {
      throw new Error(`Service with id ${serviceId} does not exist`);
    }

    const service = serviceResults[0];

    // Calculate subtotal from service items (parts used)
    const serviceItemResults = await db.select({
      totalPrice: sum(serviceItemsTable.total_price)
    })
    .from(serviceItemsTable)
    .where(eq(serviceItemsTable.service_id, serviceId))
    .execute();

    const partsTotal = serviceItemResults[0]?.totalPrice ? parseFloat(serviceItemResults[0].totalPrice) : 0;
    const laborCost = service.final_cost ? parseFloat(service.final_cost) : 0;
    const subtotal = partsTotal + laborCost;

    // Generate unique invoice number
    const invoiceNumber = `INV-SRV-${serviceId}-${Date.now()}`;

    // Create invoice with 0 tax by default
    const invoiceInput: CreateInvoiceInput = {
      customer_id: service.customer_id,
      service_id: serviceId,
      invoice_number: invoiceNumber,
      subtotal: subtotal,
      tax_amount: 0,
      notes: `Auto-generated invoice for service #${serviceId}`
    };

    return await createInvoice(invoiceInput);
  } catch (error) {
    console.error('Failed to generate invoice from service:', error);
    throw error;
  }
}