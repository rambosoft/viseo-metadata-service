import type { AuthContext } from "../../core/auth/types.js";

export interface AuthValidationPort {
  validateToken(token: string): Promise<AuthContext>;
}
