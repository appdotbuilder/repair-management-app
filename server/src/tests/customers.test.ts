import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { createCustomer, getCustomers, getCustomer, updateCustomer, deleteCustomer } from '../handlers/customers';
import { eq } from 'drizzle-orm';

// Test data
const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main Street, Anytown, USA'
};

const minimalCustomerInput: CreateCustomerInput = {
  name: 'Jane Smith'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testCustomerInput);

    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.address).toEqual('123 Main Street, Anytown, USA');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields', async () => {
    const result = await createCustomer(minimalCustomerInput);

    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testCustomerInput);

    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].phone).toEqual('+1-555-0123');
    expect(customers[0].address).toEqual('123 Main Street, Anytown, USA');
    expect(customers[0].created_at).toBeInstanceOf(Date);
  });
});

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const customers = await getCustomers();
    expect(customers).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    await createCustomer(testCustomerInput);
    await createCustomer(minimalCustomerInput);

    const customers = await getCustomers();

    expect(customers).toHaveLength(2);
    expect(customers.find(c => c.name === 'John Doe')).toBeDefined();
    expect(customers.find(c => c.name === 'Jane Smith')).toBeDefined();
  });

  it('should return customers with all fields populated correctly', async () => {
    await createCustomer(testCustomerInput);

    const customers = await getCustomers();

    expect(customers).toHaveLength(1);
    const customer = customers[0];
    expect(customer.name).toEqual('John Doe');
    expect(customer.email).toEqual('john.doe@example.com');
    expect(customer.phone).toEqual('+1-555-0123');
    expect(customer.address).toEqual('123 Main Street, Anytown, USA');
    expect(customer.created_at).toBeInstanceOf(Date);
  });
});

describe('getCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when customer does not exist', async () => {
    const customer = await getCustomer(999);
    expect(customer).toBeNull();
  });

  it('should return customer when it exists', async () => {
    const created = await createCustomer(testCustomerInput);
    const customer = await getCustomer(created.id);

    expect(customer).toBeDefined();
    expect(customer!.id).toEqual(created.id);
    expect(customer!.name).toEqual('John Doe');
    expect(customer!.email).toEqual('john.doe@example.com');
    expect(customer!.phone).toEqual('+1-555-0123');
    expect(customer!.address).toEqual('123 Main Street, Anytown, USA');
    expect(customer!.created_at).toBeInstanceOf(Date);
  });
});

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all customer fields', async () => {
    const created = await createCustomer(minimalCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: created.id,
      name: 'Jane Updated',
      email: 'jane.updated@example.com',
      phone: '+1-555-9876',
      address: '456 Oak Avenue, Newtown, USA'
    };

    const updated = await updateCustomer(updateInput);

    expect(updated.id).toEqual(created.id);
    expect(updated.name).toEqual('Jane Updated');
    expect(updated.email).toEqual('jane.updated@example.com');
    expect(updated.phone).toEqual('+1-555-9876');
    expect(updated.address).toEqual('456 Oak Avenue, Newtown, USA');
    expect(updated.created_at).toEqual(created.created_at);
  });

  it('should update only provided fields', async () => {
    const created = await createCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: created.id,
      name: 'John Updated'
    };

    const updated = await updateCustomer(updateInput);

    expect(updated.id).toEqual(created.id);
    expect(updated.name).toEqual('John Updated');
    expect(updated.email).toEqual(created.email);
    expect(updated.phone).toEqual(created.phone);
    expect(updated.address).toEqual(created.address);
  });

  it('should set fields to null when explicitly provided', async () => {
    const created = await createCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: created.id,
      email: null,
      phone: null
    };

    const updated = await updateCustomer(updateInput);

    expect(updated.id).toEqual(created.id);
    expect(updated.name).toEqual(created.name);
    expect(updated.email).toBeNull();
    expect(updated.phone).toBeNull();
    expect(updated.address).toEqual(created.address);
  });

  it('should save updates to database', async () => {
    const created = await createCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: created.id,
      name: 'John Updated'
    };

    await updateCustomer(updateInput);

    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, created.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Updated');
  });

  it('should throw error when customer does not exist', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 999,
      name: 'Non-existent Customer'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/not found/i);
  });
});

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete existing customer', async () => {
    const created = await createCustomer(testCustomerInput);

    await deleteCustomer(created.id);

    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, created.id))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should throw error when customer does not exist', async () => {
    await expect(deleteCustomer(999)).rejects.toThrow(/not found/i);
  });

  it('should not affect other customers', async () => {
    const customer1 = await createCustomer(testCustomerInput);
    const customer2 = await createCustomer(minimalCustomerInput);

    await deleteCustomer(customer1.id);

    const remainingCustomers = await getCustomers();
    expect(remainingCustomers).toHaveLength(1);
    expect(remainingCustomers[0].id).toEqual(customer2.id);
    expect(remainingCustomers[0].name).toEqual('Jane Smith');
  });
});