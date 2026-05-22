import { BASE_MODEL_PRICING, PRICING_CONFIG } from "@lattice/shared/config";
import { TokenUsage } from "@lattice/shared/types";

export interface CostBreakdown {
  totalCost: number;
  baseCost: number;
  margin: number;
  inputTokens: number;
  outputTokens: number;
  modelName: string;
}

export function calculateCost(tokenUsage: TokenUsage): CostBreakdown {
  const { modelName, inputTokens, outputTokens } = tokenUsage;

  // Find pricing for the model (handle variations in model names if needed)
  const pricingKey = Object.keys(BASE_MODEL_PRICING).find((key) => modelName.includes(key)) as
    | keyof typeof BASE_MODEL_PRICING
    | undefined;
  const pricing = pricingKey ? BASE_MODEL_PRICING[pricingKey] : undefined;

  if (!pricing) {
    console.warn(`No pricing information for model: ${modelName}`);
    return {
      totalCost: 0,
      baseCost: 0,
      margin: 0,
      inputTokens,
      outputTokens,
      modelName,
    };
  }

  // Calculate base cost
  const baseInputCost = inputTokens * pricing.input;
  const baseOutputCost = outputTokens * pricing.output;
  const totalBaseCost = baseInputCost + baseOutputCost;

  // Apply margin
  const marginAmount = totalBaseCost * PRICING_CONFIG.MARGIN_PERCENTAGE;
  const totalCostWithMargin = totalBaseCost + marginAmount;

  return {
    totalCost: totalCostWithMargin,
    baseCost: totalBaseCost,
    margin: marginAmount,
    inputTokens,
    outputTokens,
    modelName,
  };
}

export function convertCostToCredits(costInUSD: number): number {
  const credits = costInUSD * PRICING_CONFIG.CREDITS_PER_USD;
  return Math.max(credits, PRICING_CONFIG.MINIMUM_CREDIT_CHARGE);
}
