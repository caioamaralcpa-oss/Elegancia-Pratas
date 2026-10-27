import { z } from 'zod';

export const sandboxQuoteInput = z.object({
  destinationCep: z.string().regex(/^\d{8}$/),
  weightGrams: z.number().int().min(1).max(30000),
  heightCm: z.number().min(0.1).max(200),
  widthCm: z.number().min(0.1).max(200),
  lengthCm: z.number().min(0.1).max(200),
  insuranceCents: z.number().int().min(100).max(2000000),
}).strict();

export type SandboxQuoteInput = z.infer<typeof sandboxQuoteInput>;

export function sandboxQuotePayload(input: SandboxQuoteInput) {
  return {
    from: { postal_code: '29070530' },
    to: { postal_code: input.destinationCep },
    volumes: [{
      height: input.heightCm, width: input.widthCm, length: input.lengthCm,
      weight: input.weightGrams / 1000, insurance: input.insuranceCents / 100,
    }],
  };
}

export function availableShippingServices(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Resposta de cotação inválida');
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const service = item as Record<string, unknown>;
    const rawPrice = service.custom_price ?? service.price;
    if ((typeof rawPrice !== 'string' && typeof rawPrice !== 'number') || !/^\d+(?:\.\d{1,2})?$/.test(String(rawPrice))) return [];
    const priceCents = Math.round(Number(rawPrice) * 100);
    if (!Number.isSafeInteger(priceCents) || priceCents < 0) return [];
    const company = service.company && typeof service.company === 'object' ? service.company as Record<string, unknown> : {};
    const days = service.custom_delivery_time ?? service.delivery_time;
    return [{
      id: typeof service.id === 'number' ? service.id : null,
      name: typeof service.name === 'string' ? service.name.slice(0, 80) : 'Serviço de envio',
      carrier: typeof company.name === 'string' ? company.name.slice(0, 80) : 'Transportadora',
      priceCents,
      deliveryDays: typeof days === 'number' && Number.isSafeInteger(days) && days >= 0 ? days : null,
    }];
  }).sort((a, b) => a.priceCents - b.priceCents);
}
