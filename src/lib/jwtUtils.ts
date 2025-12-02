/**
 * Utility functions to decode and extract data from JWT tokens
 */

/**
 * Decode JWT token without verification (for client-side use)
 * Note: This does NOT verify the signature. For production, always verify on backend.
 */
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract custom attributes from Cognito ID token
 */
export function extractCustomAttributes(token: string): {
  clinic_id?: string;
  clinic_code?: string;
  clinic_user_id?: string;
  doctor_id?: string;
  crm?: string;
} {
  const decoded = decodeJWT(token);
  if (!decoded) return {};

  return {
    clinic_id: decoded['custom:clinic_id'],
    clinic_code: decoded['custom:clinic_code'],
    clinic_user_id: decoded['custom:clinic_user_id'],
    doctor_id: decoded['custom:doctor_id'],
    crm: decoded['custom:crm'],
  };
}

/**
 * Extract user info from Cognito ID token
 */
export function extractUserInfo(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  username?: string;
  customAttributes?: ReturnType<typeof extractCustomAttributes>;
} {
  const decoded = decodeJWT(token);
  if (!decoded) return {};

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    username: decoded['cognito:username'],
    customAttributes: extractCustomAttributes(token),
  };
}

