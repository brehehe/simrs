import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DashboardService } from './services/dashboardService.js';
import { LabForwarderService } from './services/labForwarder.js';
import { LabResultsIngestSchema } from './validators/labValidator.js';
import { dbPool } from './config/database.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

const dashboardService = new DashboardService();
const labForwarder = new LabForwarderService();

// Health Check
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await dbPool.query('SELECT 1 AS alive');
    res.json({
      status: 'UP',
      service: 'simrs-supporting-node',
      timestamp: new Date().toISOString(),
      database: dbRes.rows[0]?.alive === 1 ? 'CONNECTED' : 'DISCONNECTED',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      error: err.message,
    });
  }
});

// Dashboard Read-Only Endpoints
app.get('/api/v1/dashboard/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/dashboard/visits-by-poly', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getVisitsByPoly();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/dashboard/revenue-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const data = await dashboardService.getRevenueTrend(days);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/dashboard/medicine-usage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getMedicineUsage();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// External Lab Results Webhook Ingestion (Gateway with Zod Validation)
app.post('/api/v1/integrations/lab-results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Zod Validation
    const validationResult = LabResultsIngestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(422).json({
        success: false,
        message: 'Validasi data hasil laboratorium eksternal gagal',
        code: 'VALIDATION_ERROR',
        errors: validationResult.error.format(),
      });
      return;
    }

    const payload = validationResult.data;

    // 2. Forward to Yii Core Internal API with Retry & Idempotency
    const yiiResponse = await labForwarder.forwardToYiiCore(payload);

    res.status(200).json({
      success: true,
      message: 'Hasil laboratorium berhasil diterima dan diteruskan ke SIMRS Core',
      data: yiiResponse?.data || { idempotency_key: payload.idempotency_key },
    });
  } catch (err) {
    next(err);
  }
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`[SIMRS Node Supporting Service] Running on http://localhost:${port}`);
  });
}

export default app;
