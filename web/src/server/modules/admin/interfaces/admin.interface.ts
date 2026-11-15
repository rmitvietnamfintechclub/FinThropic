import "server-only";

export interface AdminService {
  dashboard(): Promise<{ documents: number; failed: number; unansweredQuestions: number }>;
}
