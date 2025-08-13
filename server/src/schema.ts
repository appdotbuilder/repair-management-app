import { z } from 'zod';

// Enums
export const serviceStatusEnum = z.enum(['received', 'in_progress', 'ready_for_pickup', 'completed']);
export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

export const transactionTypeEnum = z.enum(['purchase', 'sale']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid', 'cancelled']);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

// Customer schemas
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Supplier schemas
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

// Product/Inventory schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  category: z.string().nullable(),
  purchase_price: z.number(),
  selling_price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_level: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  purchase_price: z.number().min(0),
  selling_price: z.number().min(0),
  stock_quantity: z.number().int().min(0),
  min_stock_level: z.number().int().min(0).optional()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  purchase_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  min_stock_level: z.number().int().min(0).optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Service schemas
export const serviceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  device_type: z.string(),
  device_model: z.string().nullable(),
  device_serial: z.string().nullable(),
  problem_description: z.string(),
  repair_notes: z.string().nullable(),
  estimated_cost: z.number().nullable(),
  final_cost: z.number().nullable(),
  status: serviceStatusEnum,
  received_date: z.coerce.date(),
  completed_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  customer_id: z.number(),
  device_type: z.string().min(1),
  device_model: z.string().nullable().optional(),
  device_serial: z.string().nullable().optional(),
  problem_description: z.string().min(1),
  repair_notes: z.string().nullable().optional(),
  estimated_cost: z.number().min(0).nullable().optional()
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

export const updateServiceInputSchema = z.object({
  id: z.number(),
  device_type: z.string().min(1).optional(),
  device_model: z.string().nullable().optional(),
  device_serial: z.string().nullable().optional(),
  problem_description: z.string().min(1).optional(),
  repair_notes: z.string().nullable().optional(),
  estimated_cost: z.number().min(0).nullable().optional(),
  final_cost: z.number().min(0).nullable().optional(),
  status: serviceStatusEnum.optional(),
  completed_date: z.coerce.date().nullable().optional()
});

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;

// Transaction schemas
export const transactionSchema = z.object({
  id: z.number(),
  type: transactionTypeEnum,
  supplier_id: z.number().nullable(),
  customer_id: z.number().nullable(),
  total_amount: z.number(),
  transaction_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  type: transactionTypeEnum,
  supplier_id: z.number().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  total_amount: z.number().min(0),
  transaction_date: z.coerce.date().optional(),
  notes: z.string().nullable().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Transaction Items schemas
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

export const createTransactionItemInputSchema = z.object({
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0)
});

export type CreateTransactionItemInput = z.infer<typeof createTransactionItemInputSchema>;

// Service Items schemas (parts used in repairs)
export const serviceItemSchema = z.object({
  id: z.number(),
  service_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type ServiceItem = z.infer<typeof serviceItemSchema>;

export const createServiceItemInputSchema = z.object({
  service_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0)
});

export type CreateServiceItemInput = z.infer<typeof createServiceItemInputSchema>;

// Invoice schemas
export const invoiceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  service_id: z.number().nullable(),
  transaction_id: z.number().nullable(),
  invoice_number: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  status: invoiceStatusEnum,
  issue_date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  paid_date: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceInputSchema = z.object({
  customer_id: z.number(),
  service_id: z.number().nullable().optional(),
  transaction_id: z.number().nullable().optional(),
  invoice_number: z.string().min(1),
  subtotal: z.number().min(0),
  tax_amount: z.number().min(0).optional(),
  due_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export const updateInvoiceInputSchema = z.object({
  id: z.number(),
  status: invoiceStatusEnum.optional(),
  paid_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

// Report schemas
export const reportPeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type ReportPeriod = z.infer<typeof reportPeriodEnum>;

export const reportRequestSchema = z.object({
  period: reportPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional()
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export const serviceReportSchema = z.object({
  total_services: z.number().int(),
  completed_services: z.number().int(),
  in_progress_services: z.number().int(),
  total_revenue: z.number(),
  average_service_cost: z.number(),
  period: reportPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type ServiceReport = z.infer<typeof serviceReportSchema>;

export const inventoryReportSchema = z.object({
  total_products: z.number().int(),
  low_stock_products: z.number().int(),
  total_inventory_value: z.number(),
  total_purchases: z.number(),
  total_sales: z.number(),
  period: reportPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type InventoryReport = z.infer<typeof inventoryReportSchema>;