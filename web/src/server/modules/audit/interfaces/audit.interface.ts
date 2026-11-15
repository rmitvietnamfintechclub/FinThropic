import "server-only";

export interface AuditService {
  record(event: { actorId: string; action: string; target: string }): Promise<void>;
}
