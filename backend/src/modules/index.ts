import { Router } from 'express';
import { healthRouter } from './health/health.routes';

/**
 * Aggregates versioned API routes.
 * Business modules (auth, batches, certificates, etc.) will mount here later.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
