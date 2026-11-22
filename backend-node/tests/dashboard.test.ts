import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { DashboardService } from '../src/services/dashboardService.js';
import { dbPool } from '../src/config/database.js';

describe('Supporting Service: Dashboard Aggregation & Security Verification', () => {
  const service = new DashboardService();

  after(async () => {
    await dbPool.end();
  });

  test('1. Database connectivity check with read-only user', async () => {
    const res = await dbPool.query('SELECT 1 AS alive');
    assert.equal(res.rows[0].alive, 1, 'Database should be alive and accessible');
  });

  test('2. getSummary returns aggregated KPI metrics', async () => {
    const summary = await service.getSummary();
    assert.ok(summary, 'Summary object should exist');
    assert.equal(typeof summary.today_visits, 'number', 'today_visits must be a number');
    assert.equal(typeof summary.waiting_patients, 'number', 'waiting_patients must be a number');
    assert.equal(typeof summary.in_examination, 'number', 'in_examination must be a number');
    assert.equal(typeof summary.ready_for_billing, 'number', 'ready_for_billing must be a number');
    assert.equal(typeof summary.completed_visits, 'number', 'completed_visits must be a number');
    assert.equal(typeof summary.today_revenue, 'number', 'today_revenue must be a number');
    assert.equal(typeof summary.today_receivables, 'number', 'today_receivables must be a number');
    assert.equal(typeof summary.low_stock_medicines_count, 'number', 'low_stock_medicines_count must be a number');
  });

  test('3. getVisitsByPoly returns polyclinic queue breakdown', async () => {
    const list = await service.getVisitsByPoly();
    assert.ok(Array.isArray(list), 'Should return an array');
    assert.ok(list.length > 0, 'Should have polyclinic entries');
    const first = list[0];
    assert.ok(first.polyclinic_name, 'Polyclinic name should exist');
    assert.ok(first.queue_prefix, 'Queue prefix should exist');
    assert.ok('visit_count' in first, 'visit_count should exist');
  });

  test('4. getRevenueTrend returns recent revenue data points', async () => {
    const trend = await service.getRevenueTrend(7);
    assert.ok(Array.isArray(trend), 'Should return an array');
    assert.ok(trend.length >= 1, 'Should return at least 1 day data point from today');
    assert.ok(trend[0].date, 'Date should exist');
    assert.ok('revenue' in trend[0], 'Revenue should exist');
  });

  test('5. getMedicineUsage returns top pharmaceutical items', async () => {
    const usage = await service.getMedicineUsage();
    assert.ok(Array.isArray(usage), 'Should return an array');
  });

  test('6. SECURITY CONSTRAINT: Read-only user cannot execute INSERT/UPDATE on core tables', async () => {
    await assert.rejects(
      async () => {
        await dbPool.query(
          "INSERT INTO polyclinics (code, name, queue_prefix) VALUES ('TEST', 'Test Poli', 'T')"
        );
      },
      (err: any) => {
        // PostgreSQL error 42501: permission denied for table
        assert.ok(
          err.message.includes('permission denied') || err.code === '42501',
          `Expected permission denied error, got: ${err.message}`
        );
        return true;
      },
      'simrs_dashboard_ro should NOT have write permission on core SIMRS tables'
    );
  });
});
