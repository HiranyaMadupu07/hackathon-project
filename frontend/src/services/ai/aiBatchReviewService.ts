import { Batch } from '../../types';
import { AiBatchReview } from '../../types/ai';
import { AiEndpointUnavailableError, requestAiEndpoint } from './aiApiClient';
import { aiMockEngine } from './aiMockEngine';

export const aiBatchReviewService = {
  async getReview(batch: Batch): Promise<AiBatchReview | null> {
    try {
      return await requestAiEndpoint<AiBatchReview>(
        `/api/v1/ai/batches/${encodeURIComponent(batch.id)}/review`,
        { method: 'GET' }
      );
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.getBatchReview(batch);
      }
      throw error;
    }
  },

  async analyzeBatch(batch: Batch): Promise<AiBatchReview> {
    try {
      return await requestAiEndpoint<AiBatchReview>(
        `/api/v1/ai/batches/${encodeURIComponent(batch.id)}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ batchVersion: batch.version }),
        }
      );
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.analyzeBatchReview(batch);
      }
      throw error;
    }
  },
};
