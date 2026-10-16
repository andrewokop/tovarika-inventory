import { describe, expect, it } from 'vitest';

const total = (products, key) => products.reduce((sum, product) => sum + Number(product[key] || 0), 0);
const applyMovement = (product, type, qty) => ({ ...product, stock: product.stock + (type === 'sale' ? -qty : qty), sold: product.sold + (type === 'sale' ? qty : 0) });

describe('inventory calculations', () => {
  it('calculates inventory values from current products', () => {
    const products = [{ cost: 100, price: 200, stock: 3 }, { cost: 50, price: 80, stock: 2 }];
    expect(total(products.map(p => ({ value: p.cost * p.stock })), 'value')).toBe(400);
    expect(total(products.map(p => ({ value: p.price * p.stock })), 'value')).toBe(760);
  });

  it('decrements stock and increments sold units for a sale', () => {
    expect(applyMovement({ stock: 10, sold: 2 }, 'sale', 3)).toEqual({ stock: 7, sold: 5 });
  });

  it('increments stock without affecting sold units for a purchase', () => {
    expect(applyMovement({ stock: 10, sold: 2 }, 'purchase', 3)).toEqual({ stock: 13, sold: 2 });
  });
});
