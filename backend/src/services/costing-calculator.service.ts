import { PageColorAnalysis } from './document-converter.service';
import { getPricingConfig } from '../config/pricing-tiers.config';

export interface MaterialItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface OperationItem {
  item: string;
  amount: number;
}

export interface LaborParameters {
  ratePerHour: number;
  hours: number;
  minutes: number;
}

export interface MarginMatrixRow {
  marginPercent: number;
  baseCost: number;
  profit: number;
  sellingPrice: number;
}

export interface CostingCalculationResult {
  totalMaterialCost: number;
  totalOperationCost: number;
  totalLaborCost: number;
  totalBaseCost: number;
  marginMatrix: MarginMatrixRow[];
  targetSellingPrice: number;
  bulkDiscountTotal?: number;
}

export interface AdaptiveDocumentCostingResult {
  pageBreakdown: PageColorAnalysis[];
  totalPages: number;
  copies: number;
  subtotal: number;
  discount: number;
  finalTotal: number;
  monochromeCount: number;
  accentColorCount: number;
  mediumColorCount: number;
  heavyColorCount: number;
  flatColorTotal: number;
  customerSavings: number;
}

export class CostingCalculatorService {
  /**
   * Computes standard unit costing and 5-tier margin matrix.
   */
  calculateCosting(
    materials: MaterialItem[],
    operations: OperationItem[],
    labor: LaborParameters,
    targetMarginPercent: number = 50,
    bulkQuantity: number = 1,
    bulkDiscountAmount: number = 0
  ): CostingCalculationResult {
    // 1. Material Cost
    const totalMaterialCost = materials.reduce((sum, m) => sum + (m.qty * m.unitPrice), 0);

    // 2. Operation Cost (Overhead, Electricity, Packaging)
    const totalOperationCost = operations.reduce((sum, op) => sum + op.amount, 0);

    // 3. Labor Cost: (rate / 60) * minutes + (rate * hours)
    const laborMinutes = (labor.hours * 60) + labor.minutes;
    const totalLaborCost = (labor.ratePerHour / 60) * laborMinutes;

    // 4. Base Cost
    const totalBaseCost = totalMaterialCost + totalOperationCost + totalLaborCost;

    // 5. Margin Matrix: [5%, 25%, 50%, 75%, 100%, 150%]
    const standardMargins = [5, 25, 50, 75, 100, 150];
    const marginMatrix: MarginMatrixRow[] = standardMargins.map((margin) => {
      const profit = totalBaseCost * (margin / 100);
      const sellingPrice = totalBaseCost + profit;
      return {
        marginPercent: margin,
        baseCost: Number(totalBaseCost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        sellingPrice: Number(sellingPrice.toFixed(2)),
      };
    });

    // 6. Target Price
    const targetProfit = totalBaseCost * (targetMarginPercent / 100);
    const targetSellingPrice = Number((totalBaseCost + targetProfit).toFixed(2));

    // 7. Bulk Order Total
    const bulkDiscountTotal = Number(((targetSellingPrice * bulkQuantity) - bulkDiscountAmount).toFixed(2));

    return {
      totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
      totalOperationCost: Number(totalOperationCost.toFixed(2)),
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
      totalBaseCost: Number(totalBaseCost.toFixed(2)),
      marginMatrix,
      targetSellingPrice,
      bulkDiscountTotal,
    };
  }

  /**
   * Calculates adaptive mixed-page pricing for multi-page documents based on page-by-page color tiers.
   */
  calculateAdaptiveDocumentPrice(
    pageBreakdown: PageColorAnalysis[],
    copies: number = 1,
    discountAmount: number = 0
  ): AdaptiveDocumentCostingResult {
    const singleCopyTotal = pageBreakdown.reduce((sum, p) => sum + p.unitPrice, 0);
    const subtotal = singleCopyTotal * Math.max(1, copies);
    const finalTotal = Math.max(0, subtotal - discountAmount);

    const totalPages = pageBreakdown.length;
    const flatColorPrice = getPricingConfig().prices.tier3;
    const flatColorTotal = totalPages * flatColorPrice * Math.max(1, copies);
    const customerSavings = Math.max(0, flatColorTotal - finalTotal);

    return {
      pageBreakdown,
      totalPages,
      copies,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
      monochromeCount: pageBreakdown.filter(p => p.tier === 0).length,
      accentColorCount: pageBreakdown.filter(p => p.tier === 1).length,
      mediumColorCount: pageBreakdown.filter(p => p.tier === 2).length,
      heavyColorCount: pageBreakdown.filter(p => p.tier === 3).length,
      flatColorTotal: Number(flatColorTotal.toFixed(2)),
      customerSavings: Number(customerSavings.toFixed(2)),
    };
  }
}
