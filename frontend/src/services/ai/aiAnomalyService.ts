import { Batch } from '../../types';
import {
  AnomalyReviewStatus,
  CandidateAnomalyReport,
} from '../../types/ai';
import { AiEndpointUnavailableError, requestAiEndpoint } from './aiApiClient';
import { aiMockEngine } from './aiMockEngine';

export const aiAnomalyService = {
  async getAnomalies(batch: Batch): Promise<CandidateAnomalyReport | null> {
    try {
      return await requestAiEndpoint<CandidateAnomalyReport>(
        `/api/v1/ai/batches/${encodeURIComponent(batch.id)}/anomalies`,
        { method: 'GET' }
      );
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.getBatchAnomalies(batch);
      }
      throw error;
    }
  },

  async analyzeAnomalies(batch: Batch): Promise<CandidateAnomalyReport> {
    try {
      return await requestAiEndpoint<CandidateAnomalyReport>(
        `/api/v1/ai/batches/${encodeURIComponent(batch.id)}/anomalies`,
        {
          method: 'POST',
          body: JSON.stringify({ batchVersion: batch.version }),
        }
      );
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.analyzeBatchAnomalies(batch);
      }
      throw error;
    }
  },

  async updateReviewStatus(
    batch: Batch,
    anomalyId: string,
    reviewStatus: AnomalyReviewStatus,
    reviewerName: string
  ): Promise<CandidateAnomalyReport | null> {
    try {
      return await requestAiEndpoint<CandidateAnomalyReport>(
        `/api/v1/ai/batches/${encodeURIComponent(batch.id)}/anomalies/${encodeURIComponent(anomalyId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ reviewStatus }),
        }
      );
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.updateAnomalyStatus(
          batch,
          anomalyId,
          reviewStatus,
          reviewerName
        );
      }
      throw error;
    }
  },
};
