import { db } from '../db';
import { servicesTable, customersTable, serviceItemsTable, productsTable } from '../db/schema';
import { type ServiceReceipt } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateServiceReceipt(serviceId: number): Promise<ServiceReceipt | null> {
  try {
    // Get service with customer information
    const serviceResults = await db.select()
      .from(servicesTable)
      .innerJoin(customersTable, eq(servicesTable.customer_id, customersTable.id))
      .where(eq(servicesTable.id, serviceId))
      .execute();

    if (serviceResults.length === 0) {
      return null;
    }

    const serviceData = serviceResults[0];
    
    // Transform service data
    const service = {
      ...serviceData.services,
      estimated_cost: serviceData.services.estimated_cost ? parseFloat(serviceData.services.estimated_cost) : null,
      final_cost: serviceData.services.final_cost ? parseFloat(serviceData.services.final_cost) : null,
      received_date: new Date(serviceData.services.received_date),
      completed_date: serviceData.services.completed_date ? new Date(serviceData.services.completed_date) : null,
      created_at: new Date(serviceData.services.created_at),
      updated_at: new Date(serviceData.services.updated_at)
    };

    const customer = {
      ...serviceData.customers,
      created_at: new Date(serviceData.customers.created_at)
    };

    // Get service items with product information
    const serviceItemResults = await db.select()
      .from(serviceItemsTable)
      .innerJoin(productsTable, eq(serviceItemsTable.product_id, productsTable.id))
      .where(eq(serviceItemsTable.service_id, serviceId))
      .execute();

    const serviceItems = serviceItemResults.map(result => ({
      id: result.service_items.id,
      service_id: result.service_items.service_id,
      product_id: result.service_items.product_id,
      quantity: result.service_items.quantity,
      unit_price: parseFloat(result.service_items.unit_price),
      total_price: parseFloat(result.service_items.total_price),
      created_at: new Date(result.service_items.created_at),
      product: {
        ...result.products,
        purchase_price: parseFloat(result.products.purchase_price),
        selling_price: parseFloat(result.products.selling_price),
        created_at: new Date(result.products.created_at),
        updated_at: new Date(result.products.updated_at)
      }
    }));

    // Calculate total parts cost
    const totalPartsCost = serviceItems.reduce((sum, item) => sum + item.total_price, 0);

    return {
      service,
      customer,
      service_items: serviceItems,
      total_parts_cost: totalPartsCost
    };
  } catch (error) {
    console.error('Generate service receipt failed:', error);
    throw error;
  }
}