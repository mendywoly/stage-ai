import { supabase } from "./supabase";

/**
 * Ensure user is signed in (anonymously if needed)
 * Call this on app initialization or before making authenticated requests
 */
export async function ensureAuthenticated() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // No session exists, sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Failed to sign in anonymously:", error);
      throw error;
    }
    return data.user;
  }

  return session.user;
}

/**
 * Get current user ID (works for anonymous and authenticated)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Get current user (if exists)
 */
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

/**
 * Check if current user is anonymous
 */
export async function isAnonymousUser(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.is_anonymous || false;
}

/**
 * Convert anonymous user to full account
 */
export async function convertToFullAccount(
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    email,
    password,
  });

  if (error) throw error;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
