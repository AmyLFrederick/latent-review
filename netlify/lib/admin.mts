import type { SupabaseClient } from '@supabase/supabase-js';

// Admin gate for the Editors' Desk functions: the caller must present a valid
// Supabase Auth JWT (Authorization: Bearer <access_token>) AND that token's
// email must be the human editor's. RLS enforces the same rule at the database
// layer; this check exists so the functions fail fast and never spend a token
// of Anthropic budget on an unauthenticated request.

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(req: Request, supabase: SupabaseClient): Promise<string> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    // requireEnv should have caught this at cold start; belt and braces.
    throw new AdminAuthError('ADMIN_EMAIL is not configured', 500);
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (!token) {
    throw new AdminAuthError('Missing Authorization: Bearer token', 401);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new AdminAuthError('Invalid or expired session', 401);
  }

  const email = data.user.email?.trim().toLowerCase() ?? '';
  if (email !== adminEmail) {
    // Same shape as the 401 — no oracle for which addresses are admins.
    throw new AdminAuthError('Invalid or expired session', 403);
  }
  return email;
}
