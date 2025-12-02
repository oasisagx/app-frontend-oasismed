import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface UserContext {
  clinicId: string;
  clinicCode: string;
  doctorId: string;
  doctorCode: string;
  clinicUserId: string;
  crm?: string;
  name?: string;
}

interface AuthContextValue {
  context: UserContext | null;
  isLoading: boolean;
  error: Error | null;
  refreshContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function fetchUserContext(): Promise<UserContext> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não está configurada');
  }

  // Obter sessão e ID Token (mesmo método usado em auth.ts)
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    console.error('[AuthContext] Session sem idToken. tokens:', session.tokens);
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  // Log do prefixo do ID Token para comparar com auth.ts
  console.log('[AuthContext] idToken (prefixo):', idToken.slice(0, 30), '...');

  const url = `${API_BASE_URL}/me/context`;
  console.log('[AuthContext] Fazendo requisição para:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`, // ID Token (não accessToken)
    },
  });

  console.log('[AuthContext] Status da resposta:', response.status, response.statusText);

  if (!response.ok) {
    const text = await response.text();
    console.error('[AuthContext] /me/context error', response.status, text);
    let errorMessage = `Erro ao obter contexto do usuário: ${response.status}`;
    
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage += `\nResposta: ${text}`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[AuthContext] pegando o JSON de contexto normalmente:', data);
  
  return {
    clinicId: data.clinicId,
    clinicCode: data.clinicCode,
    doctorId: data.doctorId,
    doctorCode: data.doctorCode,
    clinicUserId: data.clinicUserId,
    crm: data.crm,
    name: data.name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshContext = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userContext = await fetchUserContext();
      setContext(userContext);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido ao obter contexto');
      setError(error);
      setContext(null);
      console.error('[AuthContext] Erro ao obter contexto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to fetch context on mount if we have a session
    // Only fetch if we have a valid ID Token (user is logged in)
    fetchAuthSession()
      .then(session => {
        const idToken = session.tokens?.idToken?.toString();
        if (idToken) {
          // Token está disponível, pode fazer a requisição
          console.log('[AuthContext] ID Token encontrado, buscando contexto...');
          refreshContext();
        } else {
          // Sem token, não está logado
          console.log('[AuthContext] Sem ID Token, usuário não está logado');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] Erro ao buscar sessão:', err);
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ context, isLoading, error, refreshContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

