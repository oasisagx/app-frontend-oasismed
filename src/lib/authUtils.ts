import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Get the ID token from the current Cognito session
 * Use this token in Authorization header for API Gateway requests
 * @returns Promise<string | null> - The ID token or null if not authenticated
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return null;
  }
}

/**
 * Get the access token from the current Cognito session
 * @returns Promise<string | null> - The access token or null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return null;
  }
}

/**
 * Helper function to make authenticated API calls
 * Automatically includes the ID token in the Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const idToken = await getIdToken();
  
  if (!idToken) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}

