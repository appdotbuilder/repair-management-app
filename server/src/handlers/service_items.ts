import { db } from '../db';
import { serviceItemsTable, productsTable, servicesTable } from '../db/schema';
import { type ServiceItem, type CreateServiceItemInput } from '../schema';
import { eq, SQL } from 'drizzle-orm';

export async function createServiceItem(input: CreateServiceItemInput): Promise<ServiceItem> {
  try {
    // Verify service exists
    const service = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, input.service_id))
      .execute();
    
    if (service.length === 0) {
      throw new Error(`Service with id ${input.service_id} not found`);
    }

    // Verify product exists and has sufficient stock
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();
    
    if (product.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    if (product[0].stock_quantity < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${product[0].stock_quantity}, Requested: ${input.quantity}`);
    }

    // Calculate total price
    const totalPrice = input.quantity * input.unit_price;

    // Insert service item
    const result = await db.insert(serviceItemsTable)
      .values({
        service_id: input.service_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(),
        total_price: totalPrice.toString()
      })
      .returning()
      .execute();

    // Update product stock quantity
    await db.update(productsTable)
      .set({
        stock_quantity: product[0].stock_quantity - input.quantity
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Convert numeric fields back to numbers
    const serviceItem = result[0];
    return {
      ...serviceItem,
      unit_price: parseFloat(serviceItem.unit_price),
      total_price: parseFloat(serviceItem.total_price)
    };
  } catch (error) {
    console.error('Service item creation failed:', error);
    throw error;
  }
}

export async function getServiceItems(serviceId: number): Promise<ServiceItem[]> {
  try {
    // Verify service exists
    const service = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();
    
    if (service.length === 0) {
      throw new Error(`Service with id ${serviceId} not found`);
    }

    const result = await db.select()
      .from(serviceItemsTable)
      .where(eq(serviceItemsTable.service_id, serviceId))
      .execute();

    // Convert numeric fields back to numbers
    return result.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));
  } catch (error) {
    console.error('Service items retrieval failed:', error);
    throw error;
  }
}

export async function deleteServiceItem(id: number): Promise<void> {
  try {
    // Get service item to restore stock
    const serviceItems = await db.select()
      .from(serviceItemsTable)
      .where(eq(serviceItemsTable.id, id))
      .execute();
    
    if (serviceItems.length === 0) {
      throw new Error(`Service item with id ${id} not found`);
    }

    const serviceItem = serviceItems[0];

    // Get current product stock
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, serviceItem.product_id))
      .execute();
    
    if (products.length === 0) {
      throw new Error(`Product with id ${serviceItem.product_id} not found`);
    }

    // Restore product stock quantity
    await db.update(productsTable)
      .set({
        stock_quantity: products[0].stock_quantity + serviceItem.quantity
      })
      .where(eq(productsTable.id, serviceItem.product_id))
      .execute();

    // Delete service item
    await db.delete(serviceItemsTable)
      .where(eq(serviceItemsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Service item deletion failed:', error);
    throw error;
  }
}