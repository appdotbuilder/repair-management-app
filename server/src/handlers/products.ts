import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product, type CreateProductInput, type UpdateProductInput } from '../schema';
import { eq, lt } from 'drizzle-orm';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Insert product record with numeric conversions for decimal fields
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        description: input.description || null,
        sku: input.sku || null,
        category: input.category || null,
        purchase_price: input.purchase_price.toString(), // Convert number to string for numeric column
        selling_price: input.selling_price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity, // Integer column - no conversion needed
        min_stock_level: input.min_stock_level || 0 // Integer column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      purchase_price: parseFloat(product.purchase_price), // Convert string back to number
      selling_price: parseFloat(product.selling_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers for all products
    return results.map(product => ({
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}

export async function getProduct(id: number): Promise<Product | null> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const product = results[0];
    return {
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    };
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  }
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  try {
    // Build update values with numeric conversions where needed
    const updateValues: any = {};
    
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.sku !== undefined) updateValues.sku = input.sku;
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.purchase_price !== undefined) updateValues.purchase_price = input.purchase_price.toString();
    if (input.selling_price !== undefined) updateValues.selling_price = input.selling_price.toString();
    if (input.stock_quantity !== undefined) updateValues.stock_quantity = input.stock_quantity;
    if (input.min_stock_level !== undefined) updateValues.min_stock_level = input.min_stock_level;
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    const result = await db.update(productsTable)
      .set(updateValues)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
}

export async function deleteProduct(id: number): Promise<void> {
  try {
    const result = await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product with id ${id} not found`);
    }
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    // Use drizzle-orm to compare stock_quantity with min_stock_level
    const results = await db.select()
      .from(productsTable)
      .where(lt(productsTable.stock_quantity, productsTable.min_stock_level))
      .execute();

    // Convert numeric fields back to numbers for all products
    return results.map(product => ({
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}