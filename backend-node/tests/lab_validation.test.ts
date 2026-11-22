import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LabResultsIngestSchema } from '../src/validators/labValidator.js';

describe('Supporting Service: Lab Gateway Zod Validation Matrix', () => {
  const validPayload = {
    idempotency_key: 'idemp-lab-test-20261122-0001',
    lab_order_id: '30000000-0000-0000-0000-000000000001',
    verified_by: 'Automated Hematology Analyzer Sysmex XN-550',
    results: [
      {
        lab_order_item_id: '40000000-0000-0000-0000-000000000001',
        result_value: '14.2',
        unit: 'g/dL',
        normal_range: '13.0 - 17.0',
        status: 'FINAL',
        notes: 'Hemoglobin dalam batas normal.',
      },
      {
        lab_order_item_id: '40000000-0000-0000-0000-000000000002',
        result_value: '7800',
        unit: '/uL',
        normal_range: '4000 - 10000',
        status: 'FINAL',
        notes: 'Leukosit normal.',
      },
    ],
  };

  test('1. Valid lab payload passes schema validation', () => {
    const res = LabResultsIngestSchema.safeParse(validPayload);
    assert.ok(res.success, 'Valid payload should succeed');
    if (res.success) {
      assert.equal(res.data.idempotency_key, validPayload.idempotency_key);
      assert.equal(res.data.results.length, 2);
    }
  });

  test('2. Rejects invalid UUID format for lab_order_id', () => {
    const invalid = { ...validPayload, lab_order_id: 'not-a-valid-uuid' };
    const res = LabResultsIngestSchema.safeParse(invalid);
    assert.equal(res.success, false, 'Invalid UUID should fail');
    if (!res.success) {
      const err = res.error.format();
      assert.ok(err.lab_order_id?._errors.length, 'Should contain lab_order_id error');
    }
  });

  test('3. Rejects empty results array', () => {
    const invalid = { ...validPayload, results: [] };
    const res = LabResultsIngestSchema.safeParse(invalid);
    assert.equal(res.success, false, 'Empty results array should fail');
  });

  test('4. Rejects short idempotency_key (< 8 chars)', () => {
    const invalid = { ...validPayload, idempotency_key: 'short' };
    const res = LabResultsIngestSchema.safeParse(invalid);
    assert.equal(res.success, false, 'Short idempotency key should fail');
  });

  test('5. Rejects missing result_value in lab item', () => {
    const invalid = {
      ...validPayload,
      results: [
        {
          lab_order_item_id: '40000000-0000-0000-0000-000000000001',
          result_value: '', // Empty
        },
      ],
    };
    const res = LabResultsIngestSchema.safeParse(invalid);
    assert.equal(res.success, false, 'Missing result_value should fail');
  });
});
