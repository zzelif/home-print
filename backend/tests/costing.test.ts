import { describe, it, expect } from 'vitest';
import { CostingCalculatorService } from '../src/services/costing-calculator.service';

describe('CostingCalculatorService (Two-Tier Model & Margin Matrix)', () => {
  const calculator = new CostingCalculatorService();

  it('calculates total base cost accurately from materials, operations, and labor', () => {
    const materials = [
      { name: '4R Glossy 230gsm', qty: 1, unitPrice: 2.50 },
      { name: 'Plastic Sleeve', qty: 1, unitPrice: 1.00 },
    ];
    const operations = [
      { item: 'Electricity', amount: 1.00 },
      { item: 'Ink Consumption', amount: 3.50 },
      { item: 'Maintenance Reserve', amount: 2.00 },
    ];
    const labor = { ratePerHour: 90.0, hours: 0, minutes: 5 }; // 5 mins at ₱90/hr = ₱7.50

    const result = calculator.calculateCosting(materials, operations, labor, 50, 1, 0);

    expect(result.totalMaterialCost).toBe(3.50);
    expect(result.totalOperationCost).toBe(6.50);
    expect(result.totalLaborCost).toBe(7.50);
    expect(result.totalBaseCost).toBe(17.50);
  });

  it('generates the complete 5-tier margin matrix with exact markups', () => {
    const materials = [{ name: '4R Glossy', qty: 1, unitPrice: 10.00 }];
    const operations = [{ item: 'Power', amount: 5.00 }];
    const labor = { ratePerHour: 60.0, hours: 0, minutes: 5 }; // ₱5.00

    const result = calculator.calculateCosting(materials, operations, labor, 50, 1, 0);
    // Base cost = 10 + 5 + 5 = ₱20.00

    expect(result.totalBaseCost).toBe(20.00);

    const margin25 = result.marginMatrix.find(m => m.marginPercent === 25);
    expect(margin25?.profit).toBe(5.00);
    expect(margin25?.sellingPrice).toBe(25.00);

    const margin50 = result.marginMatrix.find(m => m.marginPercent === 50);
    expect(margin50?.profit).toBe(10.00);
    expect(margin50?.sellingPrice).toBe(30.00);

    const margin100 = result.marginMatrix.find(m => m.marginPercent === 100);
    expect(margin100?.profit).toBe(20.00);
    expect(margin100?.sellingPrice).toBe(40.00);
  });

  it('calculates bulk discounts correctly', () => {
    const materials = [{ name: 'A4 Photo', qty: 1, unitPrice: 20.00 }];
    const operations = [{ item: 'Ink', amount: 10.00 }];
    const labor = { ratePerHour: 60.0, hours: 0, minutes: 10 }; // ₱10.00
    // Base cost = ₱40.00, Margin = 50% => Target Price = ₱60.00

    const result = calculator.calculateCosting(materials, operations, labor, 50, 5, 20.00);
    // 5 copies * ₱60.00 - ₱20.00 discount = ₱280.00

    expect(result.targetSellingPrice).toBe(60.00);
    expect(result.bulkDiscountTotal).toBe(280.00);
  });
});
