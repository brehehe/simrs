import axios from 'axios';
import { LabResultsIngestInput } from '../validators/labValidator.js';

export class LabForwarderService {
  private yiiInternalUrl: string;
  private internalSecret: string;

  constructor() {
    this.yiiInternalUrl = process.env.YII_INTERNAL_LAB_URL || 'http://127.0.0.1:8080/internal-api/v1/lab-results';
    this.internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'simrs-service-secret-inova-2026';
  }

  /**
   * CRITICAL CASE 5: Pengiriman hasil lab ke Yii Core dengan Exponential Backoff Retry
   */
  async forwardToYiiCore(payload: LabResultsIngestInput, attempt: number = 1): Promise<any> {
    const maxAttempts = 4;
    const backoffMs = [1000, 2000, 4000, 8000];

    try {
      const response = await axios.post(this.yiiInternalUrl, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': this.internalSecret,
          'X-Idempotency-Key': payload.idempotency_key,
        },
      });

      return response.data;
    } catch (error: any) {
      console.warn(`[LabForwarder] Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxAttempts) {
        const delay = backoffMs[attempt - 1] || 2000;
        console.log(`[LabForwarder] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.forwardToYiiCore(payload, attempt + 1);
      }

      throw new Error(`Gagal meneruskan hasil lab ke Yii Core setelah ${maxAttempts} percobaan: ${error.message}`);
    }
  }
}
