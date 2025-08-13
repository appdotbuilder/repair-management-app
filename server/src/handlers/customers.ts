import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer, type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const customers = await db.select()
      .from(customersTable)
      .execute();

    return customers;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

export async function getCustomer(id: number): Promise<Customer | null> {
  try {
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    throw error;
  }
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // Build update object only with provided fields
    const updateData: Partial<CreateCustomerInput> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;

    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}

export async function deleteCustomer(id: number): Promise<void> {
  try {
    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with id ${id} not found`);
    }
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}