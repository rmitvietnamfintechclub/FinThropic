import "server-only";

export interface AccountsService {
  createAccount(input: {
    email: string;
    role: "member" | "ebmb" | "admin";
  }): Promise<{ id: string }>;
  deactivateAccount(id: string): Promise<void>;
  recordConsent(userId: string): Promise<void>;
}
