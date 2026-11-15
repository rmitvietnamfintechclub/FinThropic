import "server-only";

export type Role = "member" | "ebmb" | "admin";

export interface Session {
  userId: string;
  role: Role;
}

/** The only door into the auth module. */
export interface AuthService {
  getSession(request: Request): Promise<Session | null>;
  requireRole(request: Request, allowed: Role[]): Promise<Session>;
}
