import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { availableShippingServices, sandboxQuoteInput, sandboxQuotePayload } from '../lib/melhor-envio-quote.ts';

test('monta a cotação do Sandbox com CEP de origem fixo e unidades corretas', () => {
  const input = sandboxQuoteInput.parse({ destinationCep: '01001000', weightGrams: 250, heightCm: 10, widthCm: 12, lengthCm: 16, insuranceCents: 5990 });
  assert.deepEqual(sandboxQuotePayload(input), {
    from: { postal_code: '29070530' }, to: { postal_code: '01001000' },
    volumes: [{ height: 10, width: 12, length: 16, weight: 0.25, insurance: 59.9 }],
  });
});

test('rejeita CEP e medidas inválidos antes de chamar o provedor', () => {
  assert.equal(sandboxQuoteInput.safeParse({ destinationCep: '01001-000', weightGrams: 0, heightCm: 10, widthCm: 12, lengthCm: 16, insuranceCents: 5990 }).success, false);
});

test('mostra somente serviços cotados e ordena por preço', () => {
  const services = availableShippingServices([
    { id: 1, name: 'PAC', price: '27.48', custom_price: '25.00', custom_delivery_time: 10, company: { name: 'Correios' } },
    { id: 2, name: 'SEDEX', price: '18.90', delivery_time: 4, company: { name: 'Correios' } },
    { id: 3, name: 'Indisponível', error: 'Serviço indisponível' },
  ]);
  assert.equal(services.length, 2);
  assert.equal(services[0].priceCents, 1890);
  assert.equal(services[1].priceCents, 2500);
  assert.equal(services[1].deliveryDays, 10);
});
