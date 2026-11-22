import { queryReadOnly } from '../config/database.js';

export class DashboardService {
  /**
   * CRITICAL CASE 6: Agregasi performa tinggi via native PostgreSQL
   * Satu query teroptimasi, menghindari N+1 dan kalkulasi berat di aplikasi.
   */
  async getSummary() {
    const today = new Date().toISOString().split('T')[0];

    // 1. Visit Status Summary
    const visitSummary = await queryReadOnly(`
      SELECT 
        COUNT(id) AS total_visits,
        COUNT(id) FILTER (WHERE status = 'WAITING') AS waiting_patients,
        COUNT(id) FILTER (WHERE status = 'IN_EXAMINATION') AS in_examination,
        COUNT(id) FILTER (WHERE status = 'READY_FOR_BILLING') AS ready_for_billing,
        COUNT(id) FILTER (WHERE status = 'COMPLETED') AS completed_visits
      FROM visits
      WHERE visit_date = $1
    `, [today]);

    // 2. Financial Summary
    const finSummary = await queryReadOnly(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_invoiced,
        COALESCE(SUM(paid_amount), 0) AS today_revenue,
        COALESCE(SUM(outstanding_balance), 0) AS today_receivables,
        COUNT(id) FILTER (WHERE status = 'PAID') AS count_paid,
        COUNT(id) FILTER (WHERE status = 'UNPAID') AS count_unpaid
      FROM invoices
      WHERE created_at >= CURRENT_DATE
    `);

    // 3. Low Stock Medicines Alert (< minimum_stock)
    const stockAlert = await queryReadOnly(`
      SELECT COUNT(id) AS low_stock_count
      FROM medicine_stocks
      WHERE current_stock <= minimum_stock
    `);

    const vs = visitSummary[0] || {};
    const fs = finSummary[0] || {};
    const sa = stockAlert[0] || {};

    return {
      date: today,
      today_visits: parseInt(vs.total_visits || '0', 10),
      waiting_patients: parseInt(vs.waiting_patients || '0', 10),
      in_examination: parseInt(vs.in_examination || '0', 10),
      ready_for_billing: parseInt(vs.ready_for_billing || '0', 10),
      completed_visits: parseInt(vs.completed_visits || '0', 10),
      today_revenue: parseFloat(fs.today_revenue || '0'),
      today_receivables: parseFloat(fs.today_receivables || '0'),
      low_stock_medicines_count: parseInt(sa.low_stock_count || '0', 10),
    };
  }

  async getVisitsByPoly() {
    const today = new Date().toISOString().split('T')[0];
    return queryReadOnly(`
      SELECT p.code, p.name AS polyclinic_name, p.queue_prefix,
             COUNT(v.id) AS visit_count
      FROM polyclinics p
      LEFT JOIN visits v ON v.polyclinic_id = p.id AND v.visit_date = $1 AND v.status != 'CANCELLED'
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.code, p.name, p.queue_prefix
      ORDER BY visit_count DESC
    `, [today]);
  }

  async getRevenueTrend(days: number = 7) {
    return queryReadOnly(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(paid_amount), 0) AS revenue,
        COALESCE(SUM(total_amount), 0) AS billed_total
      FROM invoices
      WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `, [days]);
  }

  async getMedicineUsage() {
    return queryReadOnly(`
      SELECT m.id, m.code, m.name, m.unit,
             COALESCE(SUM(ABS(sm.quantity_change)), 0) AS total_dispensed
      FROM medicines m
      JOIN stock_movements sm ON sm.medicine_id = m.id AND sm.reference_type = 'DISPENSATION'
      GROUP BY m.id, m.code, m.name, m.unit
      ORDER BY total_dispensed DESC
      LIMIT 10
    `);
  }
}
