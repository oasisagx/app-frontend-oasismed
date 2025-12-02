// src/auth.ts
// Note: This file uses Amplify v6 API (signUp, signIn, signOut, fetchAuthSession)
// The old Auth.* API is not available in v6
import { signUp, signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type SignupUserInput = {
  clinicCode: string;
  username: string;
  password: string;
};

export async function signupUser({
  clinicCode,
  username,
  password,
}: SignupUserInput): Promise<{ idToken: string }> {
  const fullUsername = `${clinicCode}#${username}`;

  // Ler dados dos perfis para atributos customizados
  const doctorProfileStr = localStorage.getItem('oasis_doctor_profile');
  const clinicProfileStr = localStorage.getItem('oasis_clinic_profile');
  const userProfileStr = localStorage.getItem('oasis_user_profile');
  
  let doctorProfile: any = {};
  let clinicId: string | null = null;
  let clinicUserId: string | null = null;
  let doctorId: string | null = null;
  
  // Ler doctor profile
  if (doctorProfileStr) {
    try {
      doctorProfile = JSON.parse(doctorProfileStr);
      doctorId = doctorProfile.id || doctorProfile.doctorId;
    } catch (err) {
      console.warn('[auth] Erro ao parsear doctor profile:', err);
    }
  }
  
  // Ler clinic profile
  if (clinicProfileStr) {
    try {
      const clinicProfile = JSON.parse(clinicProfileStr);
      clinicId = clinicProfile.id || clinicProfile.clinicId;
    } catch (err) {
      console.warn('[auth] Erro ao parsear clinic profile:', err);
    }
  }
  
  // Ler user profile (para clinicUserId)
  if (userProfileStr) {
    try {
      const userProfile = JSON.parse(userProfileStr);
      clinicUserId = userProfile.id || userProfile.clinicUserId;
    } catch (err) {
      console.warn('[auth] Erro ao parsear user profile:', err);
    }
  }
  
  // Fallback para localStorage antigo (compatibilidade)
  if (!clinicId) {
    clinicId = localStorage.getItem('oasis_clinic_id');
  }
  if (!clinicUserId) {
    clinicUserId = localStorage.getItem('oasis_clinic_user_id');
  }
  if (!doctorId) {
    doctorId = localStorage.getItem('oasis_doctor_id');
  }

  // 1) Signup
  try {
    console.log('[auth] SignUp iniciando para:', fullUsername);
    await signUp({
      username: fullUsername,
      password,
      options: {
        userAttributes: {
          email: doctorProfile.email || '',
          name: `${doctorProfile.firstName || doctorProfile.first_name || ''} ${doctorProfile.lastName || doctorProfile.last_name || ''}`.trim(),
          'custom:clinic_id': clinicId || '',
          'custom:clinic_code': clinicCode,
          'custom:clinic_user_id': clinicUserId || '',
          'custom:doctor_id': doctorId || '',
          'custom:crm': doctorProfile.crm || '',
        },
      },
    });
    console.log('[auth] SignUp concluído com sucesso');
  } catch (err: any) {
    if (err?.name === 'UsernameExistsException') {
      console.warn('[auth] Username já existe, seguindo para signIn...');
    } else {
      console.error('[auth] Erro no signUp:', err);
      throw err;
    }
  }

  // 2) SignIn
  try {
    console.log('[auth] SignIn iniciando para:', fullUsername);
    const signInResult = await signIn({
      username: fullUsername,
      password,
    });
    console.log('[auth] SignIn concluído. nextStep:', signInResult.nextStep);
    
    // Se o nextStep indica que precisa de confirmação, lançar erro específico
    if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      throw new Error('CONFIRMATION_REQUIRED: Usuário precisa ser confirmado. Verifique seu e-mail para o código de verificação.');
    }
  } catch (err: any) {
    console.error('[auth] Erro no signIn:', err);
    // Se for erro de confirmação, re-throw com mensagem específica
    if (err?.name === 'UserNotConfirmedException' || err?.message?.includes('CONFIRMATION_REQUIRED')) {
      throw new Error('CONFIRMATION_REQUIRED: Usuário precisa ser confirmado. Verifique seu e-mail para o código de verificação.');
    }
    throw err;
  }

  // 3) Buscar sessão e tokens
  const session = await fetchAuthSession();
  console.log('[auth] Session obtida:', session);

  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) {
    console.error('[auth] Session sem idToken. tokens:', session.tokens);
    throw new Error('Falha ao obter ID Token do Cognito');
  }

  console.log('[auth] idToken obtido (prefixo):', idToken.slice(0, 30), '...');
  
  // Registra último login no backend (após signup bem-sucedido)
  await updateLastLogin(idToken);
  
  // Marca local que o user foi criado (attach-cognito é feito pelo UserSign)
  localStorage.setItem('oasis_user_created', 'true');
  localStorage.setItem(
    'oasis_user_credentials',
    JSON.stringify({ clinicCode, username }),
  );

  return { idToken };
}

type LoginUserInput = {
  clinicCode: string;
  username: string;
  password: string;
};

export async function loginUser({
  clinicCode,
  username,
  password,
}: LoginUserInput): Promise<{ idToken: string }> {
  // 1) sempre limpar qualquer sessão antiga
  try {
    await signOut({ global: false });
    console.log('[auth] signOut antes do login (ok)');
  } catch (e) {
    console.warn('[auth] signOut antes do login falhou (ignorando):', e);
  }

  // 2) username REAL do Cognito = "<clinicCode>#<username>"
  const fullUsername = `${clinicCode}#${username.trim()}`;
  console.log('[auth] loginUser: tentando login como', fullUsername);

  // 3) signIn
  const signInResult = await signIn({
    username: fullUsername,
    password,
  });

  console.log('[auth] signInResult.nextStep:', signInResult.nextStep);

  // 4) pegar o ID Token
  const session = await fetchAuthSession();
  console.log('[auth] Session obtida no login:', session);

  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) {
    console.error('[auth] Session sem idToken. tokens:', session.tokens);
    throw new Error('Falha ao obter ID Token do Cognito');
  }

  console.log('[auth] idToken (prefixo):', idToken.slice(0, 30), '...');
  (window as any).lastIdToken = idToken; // pra debugar no console se quiser

  // Registra último login no backend
  await updateLastLogin(idToken);

  // guarda info útil localmente
  localStorage.setItem(
    'oasis_last_login',
    JSON.stringify({ clinicCode, username, timestamp: new Date().toISOString() }),
  );

  return { idToken };
}

/**
 * Update last login timestamp on backend
 * This function is called after successful login to track user activity
 */
export async function updateLastLogin(idToken: string): Promise<void> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  
  if (!API_BASE_URL) {
    console.warn('[auth] API_BASE_URL not configured, skipping update-last-login');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/clinic-users/update-last-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`, // ESSENCIAL: Token JWT no header
      },
      body: JSON.stringify({}), // Empty JSON body (backend may not use body, but sending empty object is safe)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[auth] update-last-login error', res.status, text);
      // Não falha o login se o registro de último login falhar (endpoint pode não existir ainda ou estar temporariamente indisponível)
    } else {
      console.log('[auth] Last login updated successfully');
    }
  } catch (err) {
    // Não falha o login se o registro de último login falhar (endpoint pode não existir ainda)
    console.warn('[auth] Failed to update last login:', err);
  }
}

