import { getSessionUser, type SessionUser } from "@/lib/auth";

/** Returns the user only if they are an active admin. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const u = await getSessionUser();
  if (!u || !u.is_admin || u.status !== "active") return null;
  return u;
}

const FRIENDLY: Record<string, string> = {
  would_go_negative: "That would take the balance below zero",
  user_not_found: "Account not found",
  bet_not_found: "Bet not found",
  bet_not_open: "That bet is already settled",
  cannot_modify_admin: "You can't change another admin",
  cannot_modify_self: "You can't change your own account",
  bad_amount: "Enter an amount other than zero",
  bad_status: "Invalid status",
  bad_result: "Invalid result",
};

export function friendlyError(message: string): string {
  for (const k of Object.keys(FRIENDLY)) if (message.includes(k)) return FRIENDLY[k];
  return "Something went wrong";
}
