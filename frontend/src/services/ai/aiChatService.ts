import { Batch, Certificate, DemoUser, UserRole } from '../../types';
import { AiChatResponse } from '../../types/ai';
import { AiEndpointUnavailableError, requestAiEndpoint } from './aiApiClient';
import { aiMockEngine } from './aiMockEngine';

export interface AiChatContextInput {
  message: string;
  user: DemoUser;
  batches: Batch[];
  certificates: Certificate[];
}

export const aiChatService = {
  async sendMessage(input: AiChatContextInput): Promise<AiChatResponse> {
    try {
      return await requestAiEndpoint<AiChatResponse>('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: input.message.trim(),
        }),
      });
    } catch (error) {
      if (error instanceof AiEndpointUnavailableError) {
        return aiMockEngine.sendChatQuery(input);
      }
      throw error;
    }
  },

  getSuggestedQuestions(role: UserRole): string[] {
    switch (role) {
      case 'TRAINING_CENTRE':
        return [
          'Why was this batch returned?',
          'How many batches are pending in my district?',
          'Show batches stuck for more than three days.',
        ];
      case 'DISTRICT_OFFICER':
        return [
          'How many batches are pending in my district?',
          'Show batches stuck for more than three days.',
          'Why was this batch returned?',
        ];
      case 'QUALITY_OFFICER':
        return [
          'Which batches are pending quality scrutiny?',
          'Which batches are waiting for state approval?',
          'Show batches stuck for more than three days.',
        ];
      case 'STATE_OFFICER':
        return [
          'Which batches are waiting for state approval?',
          'How many certificates were issued this month?',
          'Show batches stuck for more than three days.',
          'Which certificates have failed WhatsApp delivery?',
        ];
    }
  },
};
