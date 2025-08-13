import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Supplier, type CreateSupplierInput } from '../schema';

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  try {
    const result = await db.insert(suppliersTable)
      .values({
        name: input.name,
        contact_person: input.contact_person || null,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const result = await db.select()
      .from(suppliersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    throw error;
  }
}

export async function getSupplier(id: number): Promise<Supplier | null> {
  try {
    const result = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch supplier:', error);
    throw error;
  }
}

export async function deleteSupplier(id: number): Promise<void> {
  try {
    await db.delete(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .execute();
  } catch (error) {
    console.error('Failed to delete supplier:', error);
    throw error;
  }
}