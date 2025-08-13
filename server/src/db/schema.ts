import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  pgEnum,
  date
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const serviceStatusEnum = pgEnum('service_status', ['received', 'in_progress', 'ready_for_pickup', 'completed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'sale']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'cancelled']);

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact_person: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Products/Inventory table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku'),
  category: text('category'),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  min_stock_level: integer('min_stock_level').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Services table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  device_type: text('device_type').notNull(),
  device_model: text('device_model'),
  device_serial: text('device_serial'),
  problem_description: text('problem_description').notNull(),
  repair_notes: text('repair_notes'),
  estimated_cost: numeric('estimated_cost', { precision: 10, scale: 2 }),
  final_cost: numeric('final_cost', { precision: 10, scale: 2 }),
  status: serviceStatusEnum('status').notNull().default('received'),
  received_date: date('received_date').notNull().defaultNow(),
  completed_date: date('completed_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table (purchases and sales)
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  type: transactionTypeEnum('type').notNull(),
  supplier_id: integer('supplier_id').references(() => suppliersTable.id),
  customer_id: integer('customer_id').references(() => customersTable.id),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  transaction_date: date('transaction_date').notNull().defaultNow(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaction items table (details of what was bought/sold)
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Service items table (parts used in repairs)
export const serviceItemsTable = pgTable('service_items', {
  id: serial('id').primaryKey(),
  service_id: integer('service_id').notNull().references(() => servicesTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  service_id: integer('service_id').references(() => servicesTable.id),
  transaction_id: integer('transaction_id').references(() => transactionsTable.id),
  invoice_number: text('invoice_number').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  issue_date: date('issue_date').notNull().defaultNow(),
  due_date: date('due_date'),
  paid_date: date('paid_date'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  services: many(servicesTable),
  transactions: many(transactionsTable),
  invoices: many(invoicesTable),
}));

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable),
  serviceItems: many(serviceItemsTable),
}));

export const servicesRelations = relations(servicesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [servicesTable.customer_id],
    references: [customersTable.id],
  }),
  serviceItems: many(serviceItemsTable),
  invoices: many(invoicesTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  supplier: one(suppliersTable, {
    fields: [transactionsTable.supplier_id],
    references: [suppliersTable.id],
  }),
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id],
  }),
  transactionItems: many(transactionItemsTable),
  invoices: many(invoicesTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const serviceItemsRelations = relations(serviceItemsTable, ({ one }) => ({
  service: one(servicesTable, {
    fields: [serviceItemsTable.service_id],
    references: [servicesTable.id],
  }),
  product: one(productsTable, {
    fields: [serviceItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [invoicesTable.customer_id],
    references: [customersTable.id],
  }),
  service: one(servicesTable, {
    fields: [invoicesTable.service_id],
    references: [servicesTable.id],
  }),
  transaction: one(transactionsTable, {
    fields: [invoicesTable.transaction_id],
    references: [transactionsTable.id],
  }),
}));

// Export all tables for drizzle queries
export const tables = {
  customers: customersTable,
  suppliers: suppliersTable,
  products: productsTable,
  services: servicesTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  serviceItems: serviceItemsTable,
  invoices: invoicesTable,
};