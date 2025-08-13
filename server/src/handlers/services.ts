import { db } from '../db';
import { servicesTable, customersTable } from '../db/schema';
import { type Service, type CreateServiceInput, type UpdateServiceInput } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function createService(input: CreateServiceInput): Promise<Service> {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // Insert service record
    const result = await db.insert(servicesTable)
      .values({
        customer_id: input.customer_id,
        device_type: input.device_type,
        device_model: input.device_model || null,
        device_serial: input.device_serial || null,
        problem_description: input.problem_description,
        repair_notes: input.repair_notes || null,
        estimated_cost: input.estimated_cost?.toString() || null, // Convert number to string for numeric column
        final_cost: null,
        status: 'received'
      })
      .returning()
      .execute();

    const service = result[0];
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
}

export async function getServices(): Promise<Service[]> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .execute();

    return results.map(service => ({
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    }));
  } catch (error) {
    console.error('Get services failed:', error);
    throw error;
  }
}

export async function getService(id: number): Promise<Service | null> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const service = results[0];
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    };
  } catch (error) {
    console.error('Get service failed:', error);
    throw error;
  }
}

export async function updateService(input: UpdateServiceInput): Promise<Service> {
  try {
    // Check if service exists
    const existingService = await getService(input.id);
    if (!existingService) {
      throw new Error(`Service with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};

    if (input.device_type !== undefined) {
      updateData['device_type'] = input.device_type;
    }
    if (input.device_model !== undefined) {
      updateData['device_model'] = input.device_model;
    }
    if (input.device_serial !== undefined) {
      updateData['device_serial'] = input.device_serial;
    }
    if (input.problem_description !== undefined) {
      updateData['problem_description'] = input.problem_description;
    }
    if (input.repair_notes !== undefined) {
      updateData['repair_notes'] = input.repair_notes;
    }
    if (input.estimated_cost !== undefined) {
      updateData['estimated_cost'] = input.estimated_cost?.toString() || null;
    }
    if (input.final_cost !== undefined) {
      updateData['final_cost'] = input.final_cost?.toString() || null;
    }
    if (input.status !== undefined) {
      updateData['status'] = input.status;
    }
    if (input.completed_date !== undefined) {
      updateData['completed_date'] = input.completed_date;
    }

    // Update the record
    const result = await db.update(servicesTable)
      .set(updateData)
      .where(eq(servicesTable.id, input.id))
      .returning()
      .execute();

    const service = result[0];
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    };
  } catch (error) {
    console.error('Service update failed:', error);
    throw error;
  }
}

export async function getServicesByStatus(status: string): Promise<Service[]> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.status, status as any))
      .execute();

    return results.map(service => ({
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    }));
  } catch (error) {
    console.error('Get services by status failed:', error);
    throw error;
  }
}

export async function getServicesByCustomer(customerId: number): Promise<Service[]> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.customer_id, customerId))
      .execute();

    return results.map(service => ({
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      final_cost: service.final_cost ? parseFloat(service.final_cost) : null,
      received_date: new Date(service.received_date),
      completed_date: service.completed_date ? new Date(service.completed_date) : null
    }));
  } catch (error) {
    console.error('Get services by customer failed:', error);
    throw error;
  }
}