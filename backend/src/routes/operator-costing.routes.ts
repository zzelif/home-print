import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/database';
import { CostingCalculatorService } from '../services/costing-calculator.service';

export const operatorCostingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = getDatabase();
  const calculator = new CostingCalculatorService();

  // Get all products and catalog
  fastify.get('/api/operator/products', async (req, reply) => {
    const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
    const operationSettings = db.prepare('SELECT * FROM operation_settings').all();
    const materialCosts = db.prepare('SELECT * FROM material_costs').all();
    return reply.send({ products, operationSettings, materialCosts });
  });

  // Calculate costing dynamically (Two-Tier Model)
  fastify.post('/api/operator/costing/calculate', async (req, reply) => {
    const { materials, operations, labor, targetMarginPercent, bulkQuantity, bulkDiscountAmount, tier, standardRates } = req.body as any;

    if (tier === 'COMMODITY_DOCUMENT') {
      // Tier 1: Fixed Rate Document Printing
      const bwPages = standardRates?.bwPages || 0;
      const colorPages = standardRates?.colorPages || 0;
      const bwRate = standardRates?.bwRate || 3.0; // ₱3.00/page
      const colorRate = standardRates?.colorRate || 10.0; // ₱10.00/page

      const total = (bwPages * bwRate) + (colorPages * colorRate);
      return reply.send({
        tier: 'COMMODITY_DOCUMENT',
        totalPrice: Number(total.toFixed(2)),
        breakdown: { bwPages, bwRate, colorPages, colorRate },
      });
    }

    // Tier 2: Advanced Costing Matrix (Rush ID, Polaroid, Custom Photos)
    const result = calculator.calculateCosting(
      materials || [{ name: '4R Glossy 230gsm', qty: 1, unitPrice: 2.5 }],
      operations || [
        { item: 'Electricity', amount: 1.0 },
        { item: 'Ink Consumption', amount: 3.5 },
        { item: 'Maintenance Reserve', amount: 2.0 },
      ],
      labor || { ratePerHour: 90.0, hours: 0, minutes: 5 },
      targetMarginPercent || 50,
      bulkQuantity || 1,
      bulkDiscountAmount || 0
    );

    return reply.send({
      tier: 'ADVANCED_COSTING',
      ...result,
    });
  });
};
