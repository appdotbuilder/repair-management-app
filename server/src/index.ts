import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createSupplierInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createServiceInputSchema,
  updateServiceInputSchema,
  createTransactionInputSchema,
  createTransactionItemInputSchema,
  createServiceItemInputSchema,
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  reportRequestSchema,
  serviceStatusEnum,
  createPosTransactionInputSchema
} from './schema';

// Import handlers
import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
} from './handlers/customers';

import {
  createSupplier,
  getSuppliers,
  getSupplier,
  deleteSupplier
} from './handlers/suppliers';

import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from './handlers/products';

import {
  createService,
  getServices,
  getService,
  updateService,
  getServicesByStatus,
  getServicesByCustomer
} from './handlers/services';

import {
  createTransaction,
  getTransactions,
  getTransaction,
  getPurchaseTransactions,
  getSaleTransactions,
  createTransactionItem,
  getTransactionItems
} from './handlers/transactions';

import {
  createServiceItem,
  getServiceItems,
  deleteServiceItem
} from './handlers/service_items';

import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  getInvoicesByCustomer,
  getInvoicesByStatus,
  generateInvoiceFromService
} from './handlers/invoices';

import {
  generateServiceReport,
  generateInventoryReport,
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
  getYearlySummary
} from './handlers/reports';

import {
  generateServiceReceipt
} from './handlers/service_receipts';

import {
  createPosTransaction,
  getPosSummary
} from './handlers/pos';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Customer management routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .query(() => getCustomers()),

  getCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomer(input.id)),

  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  deleteCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCustomer(input.id)),

  // Supplier management routes
  createSupplier: publicProcedure
    .input(createSupplierInputSchema)
    .mutation(({ input }) => createSupplier(input)),

  getSuppliers: publicProcedure
    .query(() => getSuppliers()),

  getSupplier: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSupplier(input.id)),

  deleteSupplier: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSupplier(input.id)),

  // Product/Inventory management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProduct(input.id)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),

  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Service management routes
  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),

  getServices: publicProcedure
    .query(() => getServices()),

  getService: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getService(input.id)),

  updateService: publicProcedure
    .input(updateServiceInputSchema)
    .mutation(({ input }) => updateService(input)),

  getServicesByStatus: publicProcedure
    .input(z.object({ status: serviceStatusEnum }))
    .query(({ input }) => getServicesByStatus(input.status)),

  getServicesByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getServicesByCustomer(input.customerId)),

  // Transaction management routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .query(() => getTransactions()),

  getTransaction: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransaction(input.id)),

  getPurchaseTransactions: publicProcedure
    .query(() => getPurchaseTransactions()),

  getSaleTransactions: publicProcedure
    .query(() => getSaleTransactions()),

  createTransactionItem: publicProcedure
    .input(createTransactionItemInputSchema)
    .mutation(({ input }) => createTransactionItem(input)),

  getTransactionItems: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(({ input }) => getTransactionItems(input.transactionId)),

  // Service items routes
  createServiceItem: publicProcedure
    .input(createServiceItemInputSchema)
    .mutation(({ input }) => createServiceItem(input)),

  getServiceItems: publicProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(({ input }) => getServiceItems(input.serviceId)),

  deleteServiceItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteServiceItem(input.id)),

  // Invoice management routes
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),

  getInvoices: publicProcedure
    .query(() => getInvoices()),

  getInvoice: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getInvoice(input.id)),

  updateInvoice: publicProcedure
    .input(updateInvoiceInputSchema)
    .mutation(({ input }) => updateInvoice(input)),

  getInvoicesByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getInvoicesByCustomer(input.customerId)),

  getInvoicesByStatus: publicProcedure
    .input(z.object({ status: z.string() }))
    .query(({ input }) => getInvoicesByStatus(input.status)),

  generateInvoiceFromService: publicProcedure
    .input(z.object({ serviceId: z.number() }))
    .mutation(({ input }) => generateInvoiceFromService(input.serviceId)),

  // Reporting routes
  generateServiceReport: publicProcedure
    .input(reportRequestSchema)
    .query(({ input }) => generateServiceReport(input)),

  generateInventoryReport: publicProcedure
    .input(reportRequestSchema)
    .query(({ input }) => generateInventoryReport(input)),

  getDailySummary: publicProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(({ input }) => getDailySummary(input.date)),

  getWeeklySummary: publicProcedure
    .input(z.object({ startDate: z.coerce.date() }))
    .query(({ input }) => getWeeklySummary(input.startDate)),

  getMonthlySummary: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ input }) => getMonthlySummary(input.year, input.month)),

  getYearlySummary: publicProcedure
    .input(z.object({ year: z.number() }))
    .query(({ input }) => getYearlySummary(input.year)),

  // Service Receipt routes
  generateServiceReceipt: publicProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(({ input }) => generateServiceReceipt(input.serviceId)),

  // POS/Cashier routes
  createPosTransaction: publicProcedure
    .input(createPosTransactionInputSchema)
    .mutation(({ input }) => createPosTransaction(input)),

  getPosSummary: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(({ input }) => getPosSummary(input.transactionId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();