import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  paper_size: string;
  default_price: number;
}

export const useCostingStore = defineStore('costingStore', () => {
  const products = ref<ProductItem[]>([]);
  const selectedProduct = ref<ProductItem | null>(null);

  // Two-Tier Costing State
  const costingTier = ref<'COMMODITY_DOCUMENT' | 'ADVANCED_COSTING'>('ADVANCED_COSTING');

  // Commodity Document State
  const bwPages = ref(1);
  const colorPages = ref(0);
  const bwRate = ref(3.0); // ₱3.00/page standard
  const colorRate = ref(10.0); // ₱10.00/page standard

  // Advanced Costing State
  const targetMarginPercent = ref(50);
  const copies = ref(1);
  const discountAmount = ref(0);

  const materials = ref([
    { name: '4R Glossy 230gsm', qty: 1, unitPrice: 2.50 },
    { name: 'Plastic Sleeve (Optional)', qty: 0, unitPrice: 1.00 },
  ]);

  const operations = ref([
    { item: 'Electricity', amount: 1.00 },
    { item: 'Ink Consumption', amount: 3.50 },
    { item: 'Maintenance Reserve', amount: 2.00 },
  ]);

  const labor = ref({ ratePerHour: 90.0, hours: 0, minutes: 5 });

  // Computed Base Cost
  const totalBaseCost = computed(() => {
    const mat = materials.value.reduce((sum, m) => sum + (m.qty * m.unitPrice), 0);
    const op = operations.value.reduce((sum, o) => sum + o.amount, 0);
    const lab = (labor.value.ratePerHour / 60) * ((labor.value.hours * 60) + labor.value.minutes);
    return Number((mat + op + lab).toFixed(2));
  });

  // Computed 5-Tier Margin Matrix
  const marginMatrix = computed(() => {
    return [25, 50, 75, 100, 150].map(margin => {
      const profit = totalBaseCost.value * (margin / 100);
      const sellingPrice = totalBaseCost.value + profit;
      return {
        marginPercent: margin,
        baseCost: totalBaseCost.value,
        profit: Number(profit.toFixed(2)),
        sellingPrice: Number(sellingPrice.toFixed(2)),
      };
    });
  });

  // Final Price based on Tier
  const calculatedFinalPrice = computed(() => {
    if (costingTier.value === 'COMMODITY_DOCUMENT') {
      const docTotal = (bwPages.value * bwRate.value) + (colorPages.value * colorRate.value);
      return Number(docTotal.toFixed(2));
    }
    const unitPrice = totalBaseCost.value * (1 + targetMarginPercent.value / 100);
    const total = (unitPrice * copies.value) - discountAmount.value;
    return Number(Math.max(0, total).toFixed(2));
  });

  return {
    products,
    selectedProduct,
    costingTier,
    bwPages,
    colorPages,
    bwRate,
    colorRate,
    targetMarginPercent,
    copies,
    discountAmount,
    materials,
    operations,
    labor,
    totalBaseCost,
    marginMatrix,
    calculatedFinalPrice,
  };
});
