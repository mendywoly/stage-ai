import { supabase } from "./supabase";

/**
 * Get Authorization header with current user's JWT
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Fetch wrapper that automatically includes auth headers
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });
}
