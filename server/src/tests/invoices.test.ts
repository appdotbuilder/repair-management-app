import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, servicesTable, serviceItemsTable, productsTable, invoicesTable } from '../db/schema';
import { type CreateInvoiceInput, type UpdateInvoiceInput } from '../schema';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  getInvoicesByCustomer,
  getInvoicesByStatus,
  generateInvoiceFromService
} from '../handlers/invoices';
import { eq } from 'drizzle-orm';

describe('Invoice Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test customer
  async function createTestCustomer() {
    const result = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-0100',
        address: '123 Test St'
      })
      .returning()
      .execute();
    return result[0];
  }

  // Helper function to create test service
  async function createTestService(customerId: number) {
    const result = await db.insert(servicesTable)
      .values({
        customer_id: customerId,
        device_type: 'Smartphone',
        device_model: 'iPhone 12',
        problem_description: 'Screen replacement',
        final_cost: '150.00'
      })
      .returning()
      .execute();
    return result[0];
  }

  // Helper function to create test product
  async function createTestProduct() {
    const result = await db.insert(productsTable)
      .values({
        name: 'iPhone 12 Screen',
        purchase_price: '80.00',
        selling_price: '120.00',
        stock_quantity: 10,
        min_stock_level: 2
      })
      .returning()
      .execute();
    return result[0];
  }

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const customer = await createTestCustomer();
      
      const input: CreateInvoiceInput = {
        customer_id: customer.id,
        invoice_number: 'INV-001',
        subtotal: 100.00,
        tax_amount: 10.00,
        due_date: new Date('2024-12-31'),
        notes: 'Test invoice'
      };

      const result = await createInvoice(input);

      expect(result.customer_id).toEqual(customer.id);
      expect(result.invoice_number).toEqual('INV-001');
      expect(result.subtotal).toEqual(100.00);
      expect(result.tax_amount).toEqual(10.00);
      expect(result.total_amount).toEqual(110.00);
      expect(result.status).toEqual('draft');
      expect(result.due_date).toEqual(new Date('2024-12-31T00:00:00.000Z'));
      expect(result.notes).toEqual('Test invoice');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create invoice with default tax amount of 0', async () => {
      const customer = await createTestCustomer();
      
      const input: CreateInvoiceInput = {
        customer_id: customer.id,
        invoice_number: 'INV-002',
        subtotal: 50.00
      };

      const result = await createInvoice(input);

      expect(result.tax_amount).toEqual(0);
      expect(result.total_amount).toEqual(50.00);
    });

    it('should create invoice linked to a service', async () => {
      const customer = await createTestCustomer();
      const service = await createTestService(customer.id);
      
      const input: CreateInvoiceInput = {
        customer_id: customer.id,
        service_id: service.id,
        invoice_number: 'INV-003',
        subtotal: 150.00
      };

      const result = await createInvoice(input);

      expect(result.service_id).toEqual(service.id);
      expect(result.customer_id).toEqual(customer.id);
    });

    it('should save invoice to database', async () => {
      const customer = await createTestCustomer();
      
      const input: CreateInvoiceInput = {
        customer_id: customer.id,
        invoice_number: 'INV-004',
        subtotal: 75.00
      };

      const result = await createInvoice(input);

      const invoices = await db.select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, result.id))
        .execute();

      expect(invoices).toHaveLength(1);
      expect(invoices[0].invoice_number).toEqual('INV-004');
      expect(parseFloat(invoices[0].subtotal)).toEqual(75.00);
    });

    it('should throw error for non-existent customer', async () => {
      const input: CreateInvoiceInput = {
        customer_id: 9999,
        invoice_number: 'INV-ERROR',
        subtotal: 100.00
      };

      await expect(createInvoice(input)).rejects.toThrow(/Customer with id 9999 does not exist/);
    });

    it('should throw error for non-existent service', async () => {
      const customer = await createTestCustomer();
      
      const input: CreateInvoiceInput = {
        customer_id: customer.id,
        service_id: 9999,
        invoice_number: 'INV-ERROR',
        subtotal: 100.00
      };

      await expect(createInvoice(input)).rejects.toThrow(/Service with id 9999 does not exist/);
    });
  });

  describe('getInvoices', () => {
    it('should return empty array when no invoices exist', async () => {
      const result = await getInvoices();
      expect(result).toHaveLength(0);
    });

    it('should return all invoices', async () => {
      const customer = await createTestCustomer();
      
      await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-001',
        subtotal: 100.00
      });

      await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-002',
        subtotal: 200.00
      });

      const result = await getInvoices();

      expect(result).toHaveLength(2);
      expect(result[0].subtotal).toEqual(100.00);
      expect(result[1].subtotal).toEqual(200.00);
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by id', async () => {
      const customer = await createTestCustomer();
      
      const created = await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-001',
        subtotal: 100.00
      });

      const result = await getInvoice(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.invoice_number).toEqual('INV-001');
      expect(result!.subtotal).toEqual(100.00);
    });

    it('should return null for non-existent invoice', async () => {
      const result = await getInvoice(9999);
      expect(result).toBeNull();
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice status', async () => {
      const customer = await createTestCustomer();
      
      const created = await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-001',
        subtotal: 100.00
      });

      const paidDate = new Date('2024-01-15');
      const input: UpdateInvoiceInput = {
        id: created.id,
        status: 'paid',
        paid_date: paidDate,
        notes: 'Payment received'
      };

      const result = await updateInvoice(input);

      expect(result.status).toEqual('paid');
      expect(result.paid_date).toEqual(new Date('2024-01-15T00:00:00.000Z'));
      expect(result.notes).toEqual('Payment received');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent invoice', async () => {
      const input: UpdateInvoiceInput = {
        id: 9999,
        status: 'paid'
      };

      await expect(updateInvoice(input)).rejects.toThrow(/Invoice with id 9999 does not exist/);
    });
  });

  describe('getInvoicesByCustomer', () => {
    it('should return invoices for specific customer', async () => {
      const customer1 = await createTestCustomer();
      const customer2 = await db.insert(customersTable)
        .values({ name: 'Customer 2' })
        .returning()
        .execute()
        .then(r => r[0]);

      await createInvoice({
        customer_id: customer1.id,
        invoice_number: 'INV-001',
        subtotal: 100.00
      });

      await createInvoice({
        customer_id: customer2.id,
        invoice_number: 'INV-002',
        subtotal: 200.00
      });

      await createInvoice({
        customer_id: customer1.id,
        invoice_number: 'INV-003',
        subtotal: 300.00
      });

      const result = await getInvoicesByCustomer(customer1.id);

      expect(result).toHaveLength(2);
      expect(result.every(inv => inv.customer_id === customer1.id)).toBe(true);
    });

    it('should return empty array for customer with no invoices', async () => {
      const customer = await createTestCustomer();
      const result = await getInvoicesByCustomer(customer.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getInvoicesByStatus', () => {
    it('should return invoices filtered by status', async () => {
      const customer = await createTestCustomer();
      
      const draftInvoice = await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-001',
        subtotal: 100.00
      });

      const sentInvoice = await createInvoice({
        customer_id: customer.id,
        invoice_number: 'INV-002',
        subtotal: 200.00
      });

      // Update one to sent status
      await updateInvoice({
        id: sentInvoice.id,
        status: 'sent'
      });

      const draftResults = await getInvoicesByStatus('draft');
      const sentResults = await getInvoicesByStatus('sent');

      expect(draftResults).toHaveLength(1);
      expect(draftResults[0].id).toEqual(draftInvoice.id);
      expect(sentResults).toHaveLength(1);
      expect(sentResults[0].id).toEqual(sentInvoice.id);
    });

    it('should return empty array for status with no invoices', async () => {
      const result = await getInvoicesByStatus('paid');
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid status', async () => {
      await expect(getInvoicesByStatus('invalid_status'))
        .rejects.toThrow(/Invalid status: invalid_status/);
    });
  });

  describe('generateInvoiceFromService', () => {
    it('should generate invoice from service with parts', async () => {
      const customer = await createTestCustomer();
      const service = await createTestService(customer.id);
      const product = await createTestProduct();

      // Add service item (part used in repair)
      await db.insert(serviceItemsTable)
        .values({
          service_id: service.id,
          product_id: product.id,
          quantity: 1,
          unit_price: '120.00',
          total_price: '120.00'
        })
        .execute();

      const result = await generateInvoiceFromService(service.id);

      expect(result.customer_id).toEqual(customer.id);
      expect(result.service_id).toEqual(service.id);
      expect(result.invoice_number).toContain(`INV-SRV-${service.id}`);
      // 120 (parts) + 150 (labor from final_cost)
      expect(result.subtotal).toEqual(270.00);
      expect(result.tax_amount).toEqual(0);
      expect(result.total_amount).toEqual(270.00);
      expect(result.notes).toContain(`Auto-generated invoice for service #${service.id}`);
    });

    it('should generate invoice from service without parts', async () => {
      const customer = await createTestCustomer();
      const service = await createTestService(customer.id);

      const result = await generateInvoiceFromService(service.id);

      expect(result.customer_id).toEqual(customer.id);
      expect(result.service_id).toEqual(service.id);
      // Only labor cost (150)
      expect(result.subtotal).toEqual(150.00);
    });

    it('should generate invoice from service without final cost', async () => {
      const customer = await createTestCustomer();
      
      // Create service without final_cost
      const service = await db.insert(servicesTable)
        .values({
          customer_id: customer.id,
          device_type: 'Laptop',
          problem_description: 'Diagnosis needed',
          final_cost: null
        })
        .returning()
        .execute()
        .then(r => r[0]);

      const result = await generateInvoiceFromService(service.id);

      expect(result.subtotal).toEqual(0);
      expect(result.customer_id).toEqual(customer.id);
      expect(result.service_id).toEqual(service.id);
    });

    it('should throw error for non-existent service', async () => {
      await expect(generateInvoiceFromService(9999))
        .rejects.toThrow(/Service with id 9999 does not exist/);
    });
  });
});