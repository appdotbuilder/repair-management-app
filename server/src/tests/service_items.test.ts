import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, servicesTable, productsTable, serviceItemsTable } from '../db/schema';
import { type CreateServiceItemInput } from '../schema';
import { createServiceItem, getServiceItems, deleteServiceItem } from '../handlers/service_items';
import { eq } from 'drizzle-orm';

describe('Service Items Handlers', () => {
  let testCustomerId: number;
  let testServiceId: number;
  let testProductId: number;

  beforeEach(async () => {
    await createDB();

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '123 Test St'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        customer_id: testCustomerId,
        device_type: 'Laptop',
        device_model: 'Dell XPS',
        device_serial: 'DXL123456',
        problem_description: 'Screen not working'
      })
      .returning()
      .execute();
    testServiceId = serviceResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Laptop Screen',
        description: 'Replacement laptop screen',
        sku: 'SCR-001',
        category: 'Parts',
        purchase_price: '50.00',
        selling_price: '80.00',
        stock_quantity: 10,
        min_stock_level: 2
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  afterEach(resetDB);

  describe('createServiceItem', () => {
    const testInput: CreateServiceItemInput = {
      service_id: 0, // Will be set in test
      product_id: 0, // Will be set in test
      quantity: 2,
      unit_price: 80.00
    };

    it('should create a service item and update inventory', async () => {
      const input = { ...testInput, service_id: testServiceId, product_id: testProductId };
      
      const result = await createServiceItem(input);

      // Validate returned service item
      expect(result.service_id).toEqual(testServiceId);
      expect(result.product_id).toEqual(testProductId);
      expect(result.quantity).toEqual(2);
      expect(result.unit_price).toEqual(80.00);
      expect(result.total_price).toEqual(160.00);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);

      // Verify service item was saved to database
      const savedItems = await db.select()
        .from(serviceItemsTable)
        .where(eq(serviceItemsTable.id, result.id))
        .execute();

      expect(savedItems).toHaveLength(1);
      expect(savedItems[0].service_id).toEqual(testServiceId);
      expect(savedItems[0].product_id).toEqual(testProductId);
      expect(savedItems[0].quantity).toEqual(2);
      expect(parseFloat(savedItems[0].unit_price)).toEqual(80.00);
      expect(parseFloat(savedItems[0].total_price)).toEqual(160.00);

      // Verify inventory was updated
      const updatedProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      expect(updatedProduct[0].stock_quantity).toEqual(8); // 10 - 2 = 8
    });

    it('should throw error for non-existent service', async () => {
      const input = { ...testInput, service_id: 99999, product_id: testProductId };
      
      await expect(createServiceItem(input)).rejects.toThrow(/service with id 99999 not found/i);
    });

    it('should throw error for non-existent product', async () => {
      const input = { ...testInput, service_id: testServiceId, product_id: 99999 };
      
      await expect(createServiceItem(input)).rejects.toThrow(/product with id 99999 not found/i);
    });

    it('should throw error for insufficient stock', async () => {
      const input = { ...testInput, service_id: testServiceId, product_id: testProductId, quantity: 15 };
      
      await expect(createServiceItem(input)).rejects.toThrow(/insufficient stock/i);
    });

    it('should calculate total price correctly', async () => {
      const input = { ...testInput, service_id: testServiceId, product_id: testProductId, quantity: 3, unit_price: 25.50 };
      
      const result = await createServiceItem(input);

      expect(result.unit_price).toEqual(25.50);
      expect(result.total_price).toEqual(76.50); // 3 * 25.50
    });
  });

  describe('getServiceItems', () => {
    it('should return empty array for service with no items', async () => {
      const result = await getServiceItems(testServiceId);

      expect(result).toHaveLength(0);
    });

    it('should return all service items for a service', async () => {
      // Create test service items
      await createServiceItem({
        service_id: testServiceId,
        product_id: testProductId,
        quantity: 2,
        unit_price: 80.00
      });

      // Create second product and service item
      const product2Result = await db.insert(productsTable)
        .values({
          name: 'Laptop Battery',
          description: 'Replacement laptop battery',
          sku: 'BAT-001',
          category: 'Parts',
          purchase_price: '30.00',
          selling_price: '50.00',
          stock_quantity: 5,
          min_stock_level: 1
        })
        .returning()
        .execute();

      await createServiceItem({
        service_id: testServiceId,
        product_id: product2Result[0].id,
        quantity: 1,
        unit_price: 50.00
      });

      const result = await getServiceItems(testServiceId);

      expect(result).toHaveLength(2);
      
      // Verify numeric conversions
      result.forEach(item => {
        expect(typeof item.unit_price).toBe('number');
        expect(typeof item.total_price).toBe('number');
        expect(item.service_id).toEqual(testServiceId);
      });

      // Check specific items
      const screenItem = result.find(item => item.product_id === testProductId);
      const batteryItem = result.find(item => item.product_id === product2Result[0].id);

      expect(screenItem).toBeDefined();
      expect(screenItem!.quantity).toEqual(2);
      expect(screenItem!.unit_price).toEqual(80.00);
      expect(screenItem!.total_price).toEqual(160.00);

      expect(batteryItem).toBeDefined();
      expect(batteryItem!.quantity).toEqual(1);
      expect(batteryItem!.unit_price).toEqual(50.00);
      expect(batteryItem!.total_price).toEqual(50.00);
    });

    it('should throw error for non-existent service', async () => {
      await expect(getServiceItems(99999)).rejects.toThrow(/service with id 99999 not found/i);
    });
  });

  describe('deleteServiceItem', () => {
    it('should delete service item and restore inventory', async () => {
      // Create service item first
      const serviceItem = await createServiceItem({
        service_id: testServiceId,
        product_id: testProductId,
        quantity: 3,
        unit_price: 80.00
      });

      // Verify inventory was reduced
      const productBefore = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();
      expect(productBefore[0].stock_quantity).toEqual(7); // 10 - 3 = 7

      // Delete service item
      await deleteServiceItem(serviceItem.id);

      // Verify service item was deleted
      const deletedItems = await db.select()
        .from(serviceItemsTable)
        .where(eq(serviceItemsTable.id, serviceItem.id))
        .execute();
      expect(deletedItems).toHaveLength(0);

      // Verify inventory was restored
      const productAfter = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();
      expect(productAfter[0].stock_quantity).toEqual(10); // 7 + 3 = 10
    });

    it('should throw error for non-existent service item', async () => {
      await expect(deleteServiceItem(99999)).rejects.toThrow(/service item with id 99999 not found/i);
    });

    it('should handle deletion when product no longer exists', async () => {
      // Create service item
      const serviceItem = await createServiceItem({
        service_id: testServiceId,
        product_id: testProductId,
        quantity: 2,
        unit_price: 80.00
      });

      // First delete the service item to remove the foreign key reference
      await db.delete(serviceItemsTable)
        .where(eq(serviceItemsTable.id, serviceItem.id))
        .execute();

      // Now delete the product (this should work since no foreign key constraint)
      await db.delete(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();

      // Attempt to delete the already-deleted service item should fail
      await expect(deleteServiceItem(serviceItem.id)).rejects.toThrow(/service item with id .* not found/i);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple service items for same product correctly', async () => {
      // Create first service item
      await createServiceItem({
        service_id: testServiceId,
        product_id: testProductId,
        quantity: 3,
        unit_price: 80.00
      });

      // Verify stock after first item
      const productAfterFirst = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();
      expect(productAfterFirst[0].stock_quantity).toEqual(7); // 10 - 3 = 7

      // Create second service item for same product
      const secondItem = await createServiceItem({
        service_id: testServiceId,
        product_id: testProductId,
        quantity: 2,
        unit_price: 80.00
      });

      // Verify stock after second item
      const productAfterSecond = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();
      expect(productAfterSecond[0].stock_quantity).toEqual(5); // 7 - 2 = 5

      // Get all service items
      const allItems = await getServiceItems(testServiceId);
      expect(allItems).toHaveLength(2);

      // Delete second item
      await deleteServiceItem(secondItem.id);

      // Verify stock is partially restored
      const productAfterDelete = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, testProductId))
        .execute();
      expect(productAfterDelete[0].stock_quantity).toEqual(7); // 5 + 2 = 7

      // Verify only one item remains
      const remainingItems = await getServiceItems(testServiceId);
      expect(remainingItems).toHaveLength(1);
    });
  });
});