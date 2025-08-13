import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { createSupplier, getSuppliers, getSupplier, deleteSupplier } from '../handlers/suppliers';
import { eq } from 'drizzle-orm';

// Test input with all fields
const fullTestInput: CreateSupplierInput = {
  name: 'Tech Supply Co',
  contact_person: 'John Smith',
  email: 'john@techsupply.com',
  phone: '+1-555-0123',
  address: '123 Tech Street, Silicon Valley, CA 94000'
};

// Test input with minimal required fields
const minimalTestInput: CreateSupplierInput = {
  name: 'Minimal Supplier'
};

describe('createSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier with all fields', async () => {
    const result = await createSupplier(fullTestInput);

    expect(result.name).toEqual('Tech Supply Co');
    expect(result.contact_person).toEqual('John Smith');
    expect(result.email).toEqual('john@techsupply.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.address).toEqual('123 Tech Street, Silicon Valley, CA 94000');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a supplier with minimal fields', async () => {
    const result = await createSupplier(minimalTestInput);

    expect(result.name).toEqual('Minimal Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save supplier to database', async () => {
    const result = await createSupplier(fullTestInput);

    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Tech Supply Co');
    expect(suppliers[0].contact_person).toEqual('John Smith');
    expect(suppliers[0].email).toEqual('john@techsupply.com');
    expect(suppliers[0].phone).toEqual('+1-555-0123');
    expect(suppliers[0].address).toEqual('123 Tech Street, Silicon Valley, CA 94000');
    expect(suppliers[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly when undefined', async () => {
    const inputWithUndefined: CreateSupplierInput = {
      name: 'Test Supplier',
      contact_person: undefined,
      email: undefined,
      phone: undefined,
      address: undefined
    };

    const result = await createSupplier(inputWithUndefined);

    expect(result.name).toEqual('Test Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
  });
});

describe('getSuppliers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suppliers exist', async () => {
    const result = await getSuppliers();

    expect(result).toEqual([]);
  });

  it('should return all suppliers', async () => {
    // Create test suppliers
    const supplier1 = await createSupplier(fullTestInput);
    const supplier2 = await createSupplier(minimalTestInput);

    const result = await getSuppliers();

    expect(result).toHaveLength(2);
    expect(result.find(s => s.id === supplier1.id)).toBeDefined();
    expect(result.find(s => s.id === supplier2.id)).toBeDefined();
    expect(result.find(s => s.name === 'Tech Supply Co')).toBeDefined();
    expect(result.find(s => s.name === 'Minimal Supplier')).toBeDefined();
  });

  it('should return suppliers with correct data types', async () => {
    await createSupplier(fullTestInput);

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    expect(typeof result[0].id).toBe('number');
    expect(typeof result[0].name).toBe('string');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});

describe('getSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return supplier by id', async () => {
    const created = await createSupplier(fullTestInput);

    const result = await getSupplier(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.name).toEqual('Tech Supply Co');
    expect(result!.contact_person).toEqual('John Smith');
    expect(result!.email).toEqual('john@techsupply.com');
    expect(result!.phone).toEqual('+1-555-0123');
    expect(result!.address).toEqual('123 Tech Street, Silicon Valley, CA 94000');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent supplier', async () => {
    const result = await getSupplier(999);

    expect(result).toBeNull();
  });

  it('should return correct supplier when multiple exist', async () => {
    const supplier1 = await createSupplier(fullTestInput);
    const supplier2 = await createSupplier(minimalTestInput);

    const result = await getSupplier(supplier2.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(supplier2.id);
    expect(result!.name).toEqual('Minimal Supplier');
    expect(result!.id).not.toEqual(supplier1.id);
  });
});

describe('deleteSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete existing supplier', async () => {
    const created = await createSupplier(fullTestInput);

    // Verify supplier exists
    const beforeDelete = await getSupplier(created.id);
    expect(beforeDelete).not.toBeNull();

    // Delete supplier
    await deleteSupplier(created.id);

    // Verify supplier no longer exists
    const afterDelete = await getSupplier(created.id);
    expect(afterDelete).toBeNull();
  });

  it('should not affect other suppliers when deleting one', async () => {
    const supplier1 = await createSupplier(fullTestInput);
    const supplier2 = await createSupplier(minimalTestInput);

    // Delete first supplier
    await deleteSupplier(supplier1.id);

    // Verify second supplier still exists
    const remaining = await getSupplier(supplier2.id);
    expect(remaining).not.toBeNull();
    expect(remaining!.id).toEqual(supplier2.id);
    expect(remaining!.name).toEqual('Minimal Supplier');

    // Verify first supplier is gone
    const deleted = await getSupplier(supplier1.id);
    expect(deleted).toBeNull();
  });

  it('should handle deletion of non-existent supplier gracefully', async () => {
    // This should not throw an error
    await deleteSupplier(999);

    // Verify no suppliers were affected
    const allSuppliers = await getSuppliers();
    expect(allSuppliers).toHaveLength(0);
  });

  it('should remove supplier from database', async () => {
    const created = await createSupplier(fullTestInput);

    await deleteSupplier(created.id);

    // Direct database query to verify deletion
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, created.id))
      .execute();

    expect(suppliers).toHaveLength(0);
  });
});