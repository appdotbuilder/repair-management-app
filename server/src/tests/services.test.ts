import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, customersTable } from '../db/schema';
import { type CreateServiceInput, type UpdateServiceInput } from '../schema';
import { 
  createService, 
  getServices, 
  getService, 
  updateService, 
  getServicesByStatus, 
  getServicesByCustomer 
} from '../handlers/services';
import { eq } from 'drizzle-orm';

// Test data
const testCustomer = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456-7890',
  address: '123 Main St'
};

const testServiceInput: CreateServiceInput = {
  customer_id: 1, // Will be set after creating customer
  device_type: 'Smartphone',
  device_model: 'iPhone 13',
  device_serial: 'ABC123456789',
  problem_description: 'Screen is cracked and touch not working',
  repair_notes: 'Customer mentioned device was dropped',
  estimated_cost: 150.00
};

describe('services handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createService', () => {
    it('should create a service successfully', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const input = { ...testServiceInput, customer_id: customerId };
      const result = await createService(input);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toEqual(customerId);
      expect(result.device_type).toEqual('Smartphone');
      expect(result.device_model).toEqual('iPhone 13');
      expect(result.device_serial).toEqual('ABC123456789');
      expect(result.problem_description).toEqual('Screen is cracked and touch not working');
      expect(result.repair_notes).toEqual('Customer mentioned device was dropped');
      expect(result.estimated_cost).toEqual(150.00);
      expect(typeof result.estimated_cost).toBe('number');
      expect(result.final_cost).toBeNull();
      expect(result.status).toEqual('received');
      expect(result.received_date).toBeInstanceOf(Date);
      expect(result.completed_date).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a service with minimal required fields', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const minimalInput: CreateServiceInput = {
        customer_id: customerId,
        device_type: 'Laptop',
        problem_description: 'Won\'t start'
      };

      const result = await createService(minimalInput);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toEqual(customerId);
      expect(result.device_type).toEqual('Laptop');
      expect(result.device_model).toBeNull();
      expect(result.device_serial).toBeNull();
      expect(result.problem_description).toEqual('Won\'t start');
      expect(result.repair_notes).toBeNull();
      expect(result.estimated_cost).toBeNull();
      expect(result.status).toEqual('received');
    });

    it('should save service to database', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const input = { ...testServiceInput, customer_id: customerId };
      const result = await createService(input);

      const services = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, result.id))
        .execute();

      expect(services).toHaveLength(1);
      expect(services[0].device_type).toEqual('Smartphone');
      expect(services[0].problem_description).toEqual('Screen is cracked and touch not working');
      expect(parseFloat(services[0].estimated_cost!)).toEqual(150.00);
    });

    it('should throw error when customer does not exist', async () => {
      const input = { ...testServiceInput, customer_id: 999 };
      
      expect(createService(input)).rejects.toThrow(/Customer with ID 999 not found/);
    });
  });

  describe('getServices', () => {
    it('should return empty array when no services exist', async () => {
      const result = await getServices();
      expect(result).toEqual([]);
    });

    it('should return all services', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      // Create multiple services
      const service1Input = { ...testServiceInput, customer_id: customerId, device_type: 'Phone' };
      const service2Input = { ...testServiceInput, customer_id: customerId, device_type: 'Tablet' };

      await createService(service1Input);
      await createService(service2Input);

      const result = await getServices();

      expect(result).toHaveLength(2);
      expect(result[0].device_type).toEqual('Phone');
      expect(result[1].device_type).toEqual('Tablet');
      expect(typeof result[0].estimated_cost).toBe('number');
      expect(typeof result[1].estimated_cost).toBe('number');
    });
  });

  describe('getService', () => {
    it('should return null when service does not exist', async () => {
      const result = await getService(999);
      expect(result).toBeNull();
    });

    it('should return service by id', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const input = { ...testServiceInput, customer_id: customerId };
      const createdService = await createService(input);

      const result = await getService(createdService.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(createdService.id);
      expect(result!.device_type).toEqual('Smartphone');
      expect(result!.estimated_cost).toEqual(150.00);
      expect(typeof result!.estimated_cost).toBe('number');
    });
  });

  describe('updateService', () => {
    it('should update service fields', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const input = { ...testServiceInput, customer_id: customerId };
      const createdService = await createService(input);

      const updateInput: UpdateServiceInput = {
        id: createdService.id,
        device_type: 'Updated Phone',
        repair_notes: 'Updated repair notes',
        final_cost: 175.50,
        status: 'in_progress',
        completed_date: new Date('2024-01-15')
      };

      const result = await updateService(updateInput);

      expect(result.id).toEqual(createdService.id);
      expect(result.device_type).toEqual('Updated Phone');
      expect(result.repair_notes).toEqual('Updated repair notes');
      expect(result.final_cost).toEqual(175.50);
      expect(typeof result.final_cost).toBe('number');
      expect(result.status).toEqual('in_progress');
      expect(result.completed_date).toEqual(new Date('2024-01-15'));
    });

    it('should update only provided fields', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const input = { ...testServiceInput, customer_id: customerId };
      const createdService = await createService(input);

      const updateInput: UpdateServiceInput = {
        id: createdService.id,
        status: 'completed'
      };

      const result = await updateService(updateInput);

      expect(result.status).toEqual('completed');
      expect(result.device_type).toEqual('Smartphone'); // Should remain unchanged
      expect(result.problem_description).toEqual('Screen is cracked and touch not working'); // Should remain unchanged
    });

    it('should throw error when service does not exist', async () => {
      const updateInput: UpdateServiceInput = {
        id: 999,
        status: 'completed'
      };

      expect(updateService(updateInput)).rejects.toThrow(/Service with ID 999 not found/);
    });
  });

  describe('getServicesByStatus', () => {
    it('should return services with specific status', async () => {
      // Create prerequisite customer
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      // Create services with different statuses
      const service1Input = { ...testServiceInput, customer_id: customerId, device_type: 'Phone1' };
      const service2Input = { ...testServiceInput, customer_id: customerId, device_type: 'Phone2' };

      const service1 = await createService(service1Input);
      const service2 = await createService(service2Input);

      // Update one service to have different status
      await updateService({ id: service2.id, status: 'in_progress' });

      const receivedServices = await getServicesByStatus('received');
      const inProgressServices = await getServicesByStatus('in_progress');

      expect(receivedServices).toHaveLength(1);
      expect(receivedServices[0].device_type).toEqual('Phone1');
      expect(receivedServices[0].status).toEqual('received');

      expect(inProgressServices).toHaveLength(1);
      expect(inProgressServices[0].device_type).toEqual('Phone2');
      expect(inProgressServices[0].status).toEqual('in_progress');
    });

    it('should return empty array when no services match status', async () => {
      const result = await getServicesByStatus('completed');
      expect(result).toEqual([]);
    });
  });

  describe('getServicesByCustomer', () => {
    it('should return services for specific customer', async () => {
      // Create two customers
      const customer1Result = await db.insert(customersTable)
        .values({ ...testCustomer, name: 'Customer 1' })
        .returning()
        .execute();
      const customer2Result = await db.insert(customersTable)
        .values({ ...testCustomer, name: 'Customer 2' })
        .returning()
        .execute();

      const customer1Id = customer1Result[0].id;
      const customer2Id = customer2Result[0].id;

      // Create services for both customers
      const service1Input = { ...testServiceInput, customer_id: customer1Id, device_type: 'Phone1' };
      const service2Input = { ...testServiceInput, customer_id: customer1Id, device_type: 'Phone2' };
      const service3Input = { ...testServiceInput, customer_id: customer2Id, device_type: 'Phone3' };

      await createService(service1Input);
      await createService(service2Input);
      await createService(service3Input);

      const customer1Services = await getServicesByCustomer(customer1Id);
      const customer2Services = await getServicesByCustomer(customer2Id);

      expect(customer1Services).toHaveLength(2);
      expect(customer1Services[0].customer_id).toEqual(customer1Id);
      expect(customer1Services[1].customer_id).toEqual(customer1Id);

      expect(customer2Services).toHaveLength(1);
      expect(customer2Services[0].customer_id).toEqual(customer2Id);
      expect(customer2Services[0].device_type).toEqual('Phone3');
    });

    it('should return empty array when customer has no services', async () => {
      // Create customer but no services
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();
      const customerId = customerResult[0].id;

      const result = await getServicesByCustomer(customerId);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent customer', async () => {
      const result = await getServicesByCustomer(999);
      expect(result).toEqual([]);
    });
  });
});