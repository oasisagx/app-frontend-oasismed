import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { confirmSignUp } from 'aws-amplify/auth';
import { signupUser } from '../auth';

const UserSign: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [cognitoUsername, setCognitoUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Password validation requirements
  const passwordRequirements = useMemo(() => {
    if (!password) {
      return {
        hasMinLength: false,
        hasNumber: false,
        hasSpecialChar: false,
        hasUppercase: false,
        hasLowercase: false,
      };
    }

    return {
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
    };
  }, [password]);

  // Check if passwords match
  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // Carregar dados existentes do usuário do localStorage e banco (padrão similar ao doctor e clinic)
  useEffect(() => {
    const loadUserData = async () => {
      console.log('[UserSign] useEffect - Carregando dados do localStorage e banco...');
      
      // Primeiro, tentar carregar do oasis_user_profile (padrão similar ao doctor e clinic)
      const storedUserProfile = localStorage.getItem('oasis_user_profile');
      if (storedUserProfile) {
        try {
          const userProfile = JSON.parse(storedUserProfile);
          console.log('[UserSign] Usuário encontrado no oasis_user_profile:', userProfile);
          
          if (userProfile.username) {
            setUsername(userProfile.username);
          }
          
          // Se temos clinicUserId, buscar dados atualizados do banco
          if (userProfile.clinicUserId || userProfile.id) {
            const clinicUserId = userProfile.clinicUserId || userProfile.id;
            console.log('[UserSign] Buscando dados atualizados do banco usando clinic_user_id:', clinicUserId);
            
            try {
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
              // Get JWT token for authentication
              const { fetchAuthSession } = await import('aws-amplify/auth');
              let idToken: string | undefined;
              try {
                const session = await fetchAuthSession();
                idToken = session.tokens?.idToken?.toString();
              } catch {
                // Token may not be available during initial signup
                console.log('[UserSign] Token não disponível (signup inicial)');
              }

              const headers: HeadersInit = { 'Content-Type': 'application/json' };
              if (idToken) {
                headers['Authorization'] = `Bearer ${idToken}`;
              }

              const res = await fetch(`${apiBaseUrl}/clinic-users/${clinicUserId}`, {
                method: 'GET',
                headers,
              });

              if (res.ok) {
                const userData = await res.json();
                console.log('[UserSign] Dados atualizados do banco:', userData);
                
                if (userData.username) {
                  setUsername(userData.username);
                }
                
                // Atualizar profile com dados do banco
                const updatedProfile = {
                  ...userProfile,
                  id: userData.id || userProfile.id,
                  clinicUserId: userData.id || userProfile.clinicUserId,
                  userCode: userData.user_code || userData.userCode || userProfile.userCode,
                  username: userData.username || userProfile.username,
                };
                localStorage.setItem('oasis_user_profile', JSON.stringify(updatedProfile));
              } else {
                console.warn('[UserSign] Não foi possível buscar do banco, usando dados do profile');
              }
            } catch (err) {
              console.error('[UserSign] Erro ao buscar dados do banco:', err);
            }
          }
          return; // Já carregamos do profile, não precisa continuar
        } catch (err) {
          console.warn('[UserSign] Erro ao parsear oasis_user_profile:', err);
        }
      }

      // Fallback: tentar carregar do localStorage antigo (compatibilidade)
      const clinicUserId = localStorage.getItem('oasis_clinic_user_id');
      const storedCredentials = localStorage.getItem('oasis_user_credentials');
      
      if (clinicUserId) {
        // Se temos clinic_user_id, buscar do banco usando o ID
        console.log('[UserSign] Buscando dados do banco usando clinic_user_id:', clinicUserId);
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
          // Get JWT token for authentication
          const { fetchAuthSession } = await import('aws-amplify/auth');
          let idToken: string | undefined;
          try {
            const session = await fetchAuthSession();
            idToken = session.tokens?.idToken?.toString();
          } catch {
            // Token may not be available during initial signup
            console.log('[UserSign] Token não disponível (signup inicial)');
          }

          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
          }

          const res = await fetch(`${apiBaseUrl}/clinic-users/${clinicUserId}`, {
            method: 'GET',
            headers,
          });

          if (res.ok) {
            const userData = await res.json();
            console.log('[UserSign] Dados do usuário carregados do banco:', userData);
            
            if (userData.username) {
              setUsername(userData.username);
            }
          } else {
            console.warn('[UserSign] Não foi possível buscar do banco. Status:', res.status);
            // Fallback: usar dados do localStorage
            if (storedCredentials) {
              const credentials = JSON.parse(storedCredentials);
              if (credentials.username) {
                setUsername(credentials.username);
              }
            }
          }
        } catch (error) {
          console.error('[UserSign] Erro ao buscar dados do banco:', error);
          // Fallback: usar dados do localStorage
          if (storedCredentials) {
            try {
              const credentials = JSON.parse(storedCredentials);
              if (credentials.username) {
                setUsername(credentials.username);
              }
            } catch {
              // ignore
            }
          }
        }
      } else if (storedCredentials) {
        // Fallback: usar apenas dados do localStorage
        try {
          const credentials = JSON.parse(storedCredentials);
          console.log('[UserSign] Carregando dados do localStorage:', credentials);
          if (credentials.username) {
            setUsername(credentials.username);
          }
        } catch (error) {
          console.error('[UserSign] Erro ao carregar dados do usuário:', error);
        }
      }
    };

    loadUserData();
  }, [location.pathname]); // Reload when route changes (e.g., when clicking "Editar")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[UserSign] handleSubmit chamado!');
    
    setError('');
    
    if (!username.trim() || !password.trim()) {
      console.log('[UserSign] Validação falhou: username ou password vazios');
      setError('Informe usuário e senha.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Always use VITE_API_BASE_URL if set, otherwise fallback to /api
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      console.log('[UserSign] API Base URL:', apiBaseUrl);
      console.log('[UserSign] Modo desenvolvimento:', import.meta.env.DEV);

      // (1) Ler contexto dos perfis (padrão similar ao doctor e clinic)
      const doctorProfileStr = localStorage.getItem('oasis_doctor_profile');
      const clinicProfileStr = localStorage.getItem('oasis_clinic_profile');
      
      let doctor: any = {};
      let clinicId: string | null = null;
      let clinicCode: string | null = null;
      
      // Ler doctor profile
      if (doctorProfileStr) {
        try {
          doctor = JSON.parse(doctorProfileStr);
          console.log('[UserSign] Doctor profile carregado:', doctor);
        } catch (err) {
          console.warn('[UserSign] Erro ao parsear doctor profile:', err);
        }
      }
      
      // Fallback para localStorage antigo (compatibilidade)
      if (!doctor.doctorId && !doctor.id) {
        const storedDoctorId = localStorage.getItem('oasis_doctor_id');
        if (storedDoctorId) {
          doctor.doctorId = storedDoctorId;
          doctor.id = storedDoctorId;
        }
      }
      
      // Ler clinic profile
      if (clinicProfileStr) {
        try {
          const clinicProfile = JSON.parse(clinicProfileStr);
          clinicId = clinicProfile.id || clinicProfile.clinicId;
          clinicCode = clinicProfile.clinicCode;
          console.log('[UserSign] Clinic profile carregado:', clinicProfile);
        } catch (err) {
          console.warn('[UserSign] Erro ao parsear clinic profile:', err);
        }
      }
      
      // Fallback para localStorage antigo (compatibilidade)
      if (!clinicId) {
        clinicId = localStorage.getItem('oasis_clinic_id');
      }
      if (!clinicCode) {
        clinicCode = localStorage.getItem('oasis_clinic_code');
      }

      // Validar que temos todos os dados necessários
      const doctorId = doctor.doctorId || doctor.id;
      if (!doctorId) {
        setError('Dados do médico não encontrados. Por favor, complete o cadastro do médico primeiro.');
        setIsSubmitting(false);
        return;
      }
      if (!clinicId) {
        setError('Dados da clínica não encontrados. Por favor, complete o cadastro da clínica primeiro.');
        setIsSubmitting(false);
        return;
      }
      if (!clinicCode) {
        setError('Código da clínica não encontrado. Por favor, complete o cadastro da clínica primeiro.');
        setIsSubmitting(false);
        return;
      }

      console.log('[UserSign] Contexto carregado:', {
        doctorId,
        clinicId,
        clinicCode,
      });

      // Helper function to get ID token (following the example pattern)
      async function getIdToken(): Promise<string> {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        
        if (!tokens || !tokens.idToken) {
          console.error('[UserSign] tokens from fetchAuthSession:', tokens);
          throw new Error('ID Token não encontrado na sessão. Usuário precisa estar autenticado.');
        }
        
        return tokens.idToken.toString();
      }

      // (2) Cognito sign up + sign in FIRST (user must be signed in before creating clinic_user)
      // Username Cognito = "<clinicCode>#<username>"
      const fullCognitoUsername = `${clinicCode}#${username.trim()}`;
      setCognitoUsername(fullCognitoUsername);
      console.log('[UserSign] Criando usuário no Cognito com username:', fullCognitoUsername);
      
      let idToken: string;
      try {
        const signupResult = await signupUser({
          clinicCode,
          username: username.trim(),
          password: password,
        });

        idToken = signupResult.idToken || '';
        console.log('[UserSign] Cognito signup + signin concluído. ID Token obtido.');

        if (!idToken || idToken.trim() === '') {
          // If signupUser didn't return token, try to get it from session
          idToken = await getIdToken();
        }
      } catch (err: any) {
        // Verificar se é erro de confirmação necessária
        if (err?.message?.includes('CONFIRMATION_REQUIRED') || err?.message?.includes('confirmation') || err?.name === 'UserNotConfirmedException') {
          console.log('[UserSign] Usuário precisa ser confirmado. Aguardando código de verificação...');
          setNeedsVerification(true);
          setError('');
          setIsSubmitting(false);
          return;
        }
        // Outros erros, re-throw
        throw err;
      }

      // (3) Now that user is signed in, get ID token and create clinic_user
      console.log('[UserSign] Criando clinic_user...');
      
      // Ensure we have a valid token
      if (!idToken) {
        idToken = await getIdToken();
      }
      
      // API expects camelCase (backend converts to snake_case for database)
      const createUserPayload = {
        clinicId: clinicId,  // API expects camelCase (converts to clinic_id in DB)
        doctorId: doctorId,  // API expects camelCase (converts to doctor_id in DB)
        username: username.trim(),
        role: 'DOCTOR',  // API expects camelCase (converts to user_role in DB)
      };
      
      console.log('[UserSign] Payload POST /clinic-users:', createUserPayload);
      
      const url = `${apiBaseUrl}/clinic-users`;
      console.log('[UserSign] URL completa:', url);
      
      let createUserRes: Response;
      try {
        createUserRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,  // <<<<<< MUST BE HERE
          },
          body: JSON.stringify(createUserPayload),
        });
      } catch (fetchError: any) {
        console.error('[UserSign] Erro na requisição fetch:', fetchError);
        
        // Erro de CORS ou rede
        if (fetchError.message?.includes('Failed to fetch') || fetchError.name === 'TypeError') {
          const errorMessage = 
            'Erro de conexão com o servidor. Verifique:\n' +
            '1. Se o servidor está online\n' +
            '2. Se há problemas de CORS (Cross-Origin)\n' +
            '3. Sua conexão com a internet';
          setError(errorMessage);
        } else {
          setError(`Erro ao conectar com o servidor: ${fetchError.message || 'Erro desconhecido'}`);
        }
        
        setIsSubmitting(false);
        return;
      }
      
      console.log('[UserSign] POST /clinic-users concluído. Status:', createUserRes.status);
      const userData = await createUserRes.json().catch(() => null);
      console.log('[UserSign] Resposta POST /clinic-users:', createUserRes.status, userData);

      if (!createUserRes.ok || !userData) {
        const errorText = await createUserRes.text().catch(() => '');
        console.error('[UserSign] Erro POST /clinic-users:', createUserRes.status, errorText);
        throw new Error(
          userData?.message ||
            'Erro ao criar usuário na clínica. Verifique os dados e tente novamente.',
        );
      }

      // 🔥 PONTO CRÍTICO: Criar objeto completo do perfil do usuário (similar ao doctor e clinic)
      // Backend uses map_clinic_user_response() which converts user_role → role
      // Other fields remain snake_case (clinic_id, doctor_id, user_code)
      const userProfile = {
        id: userData.id || userData.clinic_user_id, // UUID do banco
        clinicUserId: userData.id || userData.clinic_user_id, // UUID do banco (alias)
        userCode: userData.user_code || userData.userCode, // user_code in DB (4 dígitos)
        username: username.trim(),
        clinicId, // UUID da clínica
        doctorId, // UUID do médico
        clinicCode, // código da clínica (6 dígitos)
        role: userData.role || userData.user_role || 'DOCTOR',  // Backend maps user_role → role
      };

      console.log('[UserSign] Perfil do usuário final (salvando no localStorage):', userProfile);

      // Salvar tudo no localStorage como oasis_user_profile (similar ao oasis_doctor_profile e oasis_clinic_profile)
      localStorage.setItem('oasis_user_profile', JSON.stringify(userProfile));
      // Também salvar separadamente para compatibilidade
      if (userProfile.clinicUserId) {
        localStorage.setItem('oasis_clinic_user_id', userProfile.clinicUserId);
      }
      if (userProfile.userCode) {
        localStorage.setItem('oasis_user_code', userProfile.userCode);
      }
      // Manter compatibilidade com código existente
      localStorage.setItem('oasis_user_credentials', JSON.stringify({
        username: username.trim(),
        clinicCode,
      }));
      localStorage.setItem('oasis_user_created', 'true');

      console.log('[UserSign] Salvos no localStorage:', {
        userProfile: JSON.parse(localStorage.getItem('oasis_user_profile') || '{}'),
        clinicUserId: localStorage.getItem('oasis_clinic_user_id'),
        userCode: localStorage.getItem('oasis_user_code'),
        userCreated: localStorage.getItem('oasis_user_created'),
      });

      // (4) Attach Cognito - user is already signed in, so we have the token
      await proceedWithAttachCognito(idToken, username.trim(), userProfile.clinicUserId);

      // Esta função será chamada após confirmação ou se não precisar de confirmação
      async function proceedWithAttachCognito(idToken: string, finalUsername: string, clinicUserId: string) {
        // (4) Attach Cognito - só chama se tiver token válido
        console.log('[UserSign] Chamando /clinic-users/attach-cognito...');
        
        // Always use VITE_API_BASE_URL
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiBaseUrl) {
          throw new Error('VITE_API_BASE_URL não está configurada');
        }
        
        const attachUrl = `${apiBaseUrl}/clinic-users/attach-cognito`;
        console.log('[UserSign] URL completa:', attachUrl);
        
        let attachRes: Response;
        try {
          attachRes = await fetch(attachUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              clinicUserId, // this must come from your previous step
            }),
          });
        } catch (fetchError: any) {
          console.error('[UserSign] Erro na requisição fetch:', fetchError);
          throw new Error(`Erro ao conectar com o servidor: ${fetchError.message || 'Erro desconhecido'}`);
        }

        const attachData = await attachRes.json().catch(() => null);
        console.log('[UserSign] Resposta /clinic-users/attach-cognito:', attachRes.status, attachData);

        if (!attachRes.ok) {
          const errorMessage = attachData?.message || attachRes.statusText || 'Unknown error';
          throw new Error(`Falha ao vincular usuário Cognito: ${errorMessage}`);
        }

        console.log('[UserSign] Cognito attached com sucesso!');
        console.log('[UserSign] User created + attached. ID Token:', idToken);
        
        setIsSubmitting(false);
        navigate('/signup', { 
          state: { 
            userCreated: true, 
            username: finalUsername 
          } 
        });
      }
    } catch (err: any) {
      console.error('[UserSign] Erro:', err);
      setIsSubmitting(false);
      setError(err.message || 'Erro ao criar usuário');
    }
  };

  // Função para confirmar código de verificação
  const handleConfirmVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!verificationCode.trim()) {
      setError('Por favor, insira o código de verificação.');
      return;
    }

    if (!cognitoUsername) {
      setError('Erro: username do Cognito não encontrado. Por favor, recomece o cadastro.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[UserSign] Confirmando código de verificação para:', cognitoUsername);
      
      // Confirmar código no Cognito
      await confirmSignUp({
        username: cognitoUsername,
        confirmationCode: verificationCode.trim(),
      });

      console.log('[UserSign] Código confirmado com sucesso. Fazendo signin...');

      // Após confirmação, fazer signin e obter token
      const { signIn, fetchAuthSession } = await import('aws-amplify/auth');
      
      await signIn({
        username: cognitoUsername,
        password: password,
      });

      // Helper function to get ID token (following the example pattern)
      async function getIdToken(): Promise<string> {
        const { tokens } = await fetchAuthSession();
        
        if (!tokens || !tokens.idToken) {
          console.error('[UserSign] tokens from fetchAuthSession:', tokens);
          throw new Error('ID Token não encontrado na sessão. Usuário precisa estar autenticado.');
        }
        
        return tokens.idToken.toString();
      }

      const idToken = await getIdToken();

      console.log('[UserSign] ID Token obtido após confirmação (prefixo):', idToken.slice(0, 30), '...');

      // After confirmation, we need to create clinic_user (if not already created)
      // Get context from localStorage
      const doctorProfileStr = localStorage.getItem('oasis_doctor_profile');
      const clinicProfileStr = localStorage.getItem('oasis_clinic_profile');
      
      let doctor: any = {};
      let clinicId: string | null = null;
      let clinicCode: string | null = null;
      
      if (doctorProfileStr) {
        try {
          doctor = JSON.parse(doctorProfileStr);
        } catch (err) {
          console.warn('[UserSign] Erro ao parsear doctor profile:', err);
        }
      }
      
      if (clinicProfileStr) {
        try {
          const clinicProfile = JSON.parse(clinicProfileStr);
          clinicId = clinicProfile.id || clinicProfile.clinicId;
          clinicCode = clinicProfile.clinicCode;
        } catch (err) {
          console.warn('[UserSign] Erro ao parsear clinic profile:', err);
        }
      }
      
      const doctorId = doctor.doctorId || doctor.id;
      
      // Check if clinic_user already exists
      const existingUserProfile = localStorage.getItem('oasis_user_profile');
      let userProfile: any = null;
      
      if (!existingUserProfile && doctorId && clinicId && clinicCode) {
        // Create clinic_user now that we have the token
        console.log('[UserSign] Criando clinic_user após confirmação...');
        
        // Always use VITE_API_BASE_URL
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiBaseUrl) {
          throw new Error('VITE_API_BASE_URL não está configurada');
        }
        
        const createUserPayload = {
          clinicId: clinicId,
          doctorId: doctorId,
          username: username.trim(),
          role: 'DOCTOR',
        };
        
        const createUserRes = await fetch(`${apiBaseUrl}/clinic-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(createUserPayload),
        });
        
        if (!createUserRes.ok) {
          const errorText = await createUserRes.text().catch(() => '');
          console.error('[UserSign] Erro POST /clinic-users:', createUserRes.status, errorText);
          throw new Error('Erro ao criar usuário na clínica após confirmação.');
        }
        
        const userData = await createUserRes.json();
        
        userProfile = {
          id: userData.id || userData.clinic_user_id,
          clinicUserId: userData.id || userData.clinic_user_id,
          userCode: userData.user_code || userData.userCode,
          username: username.trim(),
          clinicId,
          doctorId,
          clinicCode,
          role: userData.role || userData.user_role || 'DOCTOR',
        };
        
        localStorage.setItem('oasis_user_profile', JSON.stringify(userProfile));
        if (userProfile.clinicUserId) {
          localStorage.setItem('oasis_clinic_user_id', userProfile.clinicUserId);
        }
        if (userProfile.userCode) {
          localStorage.setItem('oasis_user_code', userProfile.userCode);
        }
        localStorage.setItem('oasis_user_credentials', JSON.stringify({
          username: username.trim(),
          clinicCode,
        }));
        localStorage.setItem('oasis_user_created', 'true');
      } else if (existingUserProfile) {
        userProfile = JSON.parse(existingUserProfile);
      }

      // Continuar com attach-cognito
      console.log('[UserSign] Chamando /clinic-users/attach-cognito...');
      
      // Get clinicUserId from userProfile (created above or from localStorage)
      const clinicUserId = userProfile?.clinicUserId || userProfile?.id;
      
      if (!clinicUserId) {
        throw new Error('clinicUserId não encontrado. Não é possível vincular ao Cognito.');
      }
      
      // Always use VITE_API_BASE_URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('VITE_API_BASE_URL não está configurada');
      }
      
      const attachUrl = `${apiBaseUrl}/clinic-users/attach-cognito`;
      console.log('[UserSign] URL completa:', attachUrl);
      
      let attachRes: Response;
      try {
        attachRes = await fetch(attachUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            clinicUserId, // this must come from your previous step
          }),
        });
      } catch (fetchError: any) {
        console.error('[UserSign] Erro na requisição fetch:', fetchError);
        
        // Erro de CORS ou rede
        if (fetchError.message?.includes('Failed to fetch') || fetchError.name === 'TypeError') {
          const errorMessage = 
            'Erro de conexão com o servidor. Verifique:\n' +
            '1. Se o servidor está online\n' +
            '2. Se há problemas de CORS (Cross-Origin)\n' +
            '3. Sua conexão com a internet';
          setError(errorMessage);
        } else {
          setError(`Erro ao conectar com o servidor: ${fetchError.message || 'Erro desconhecido'}`);
        }
        
        setIsSubmitting(false);
        return;
      }

      const attachData = await attachRes.json().catch(() => null);
      console.log('[UserSign] Resposta /clinic-users/attach-cognito:', attachRes.status, attachData);

      if (!attachRes.ok) {
        const errorMessage = attachData?.message || attachRes.statusText || 'Unknown error';
        throw new Error(`Falha ao vincular usuário Cognito: ${errorMessage}`);
      }

      console.log('[UserSign] Cognito attached com sucesso!');
      
      setIsSubmitting(false);
      navigate('/signup', { 
        state: { 
          userCreated: true, 
          username: username.trim() 
        } 
      });
    } catch (err: any) {
      console.error('[UserSign] Erro ao confirmar código:', err);
      setIsSubmitting(false);
      setError(err.message || 'Código de verificação inválido. Verifique e tente novamente.');
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-oasis-blue/10 via-white to-oasis-blue/5 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-strong border border-white/60 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 text-sm font-medium text-oasis-blue hover:text-oasis-blue-dark"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o cadastro
          </button>
          <h1 className="text-4xl font-bold text-gray-900 ml-auto">Cadastro do usuário</h1>
        </header>

        {!needsVerification ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                  />
                  {/* Password requirements list - always visible */}
                  <ul className="mt-3 space-y-1.5">
                    <li className={`flex items-center gap-2 text-sm ${passwordRequirements.hasMinLength ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordRequirements.hasMinLength ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                      )}
                      Contém pelo menos 8 caracteres
                    </li>
                    <li className={`flex items-center gap-2 text-sm ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordRequirements.hasNumber ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                      )}
                      Contém pelo menos 1 número
                    </li>
                    <li className={`flex items-center gap-2 text-sm ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordRequirements.hasSpecialChar ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                      )}
                      Contém pelo menos 1 caractere especial
                    </li>
                    <li className={`flex items-center gap-2 text-sm ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordRequirements.hasUppercase ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                      )}
                      Contém pelo menos 1 letra maiúscula
                    </li>
                    <li className={`flex items-center gap-2 text-sm ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordRequirements.hasLowercase ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                      )}
                      Contém pelo menos 1 letra minúscula
                    </li>
                  </ul>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                  />
                  {/* Password match confirmation - show when both fields have content */}
                  {password && confirmPassword && (
                    <p className={`mt-2 text-sm flex items-center gap-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordsMatch && <CheckCircle2 className="w-4 h-4" />}
                      {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              onClick={() => console.log('[UserSign] Botão clicado!')}
              className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-white bg-oasis-blue hover:bg-oasis-blue-dark disabled:opacity-50 transition shadow-strong"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmVerification} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">
                Código de verificação
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Digite o código enviado por e-mail"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                maxLength={6}
              />
              <p className="text-sm text-oasis-blue mt-2">
                Insira o código de verificação enviado no e-mail para finalizar a criação da sua conta.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-white bg-oasis-blue hover:bg-oasis-blue-dark disabled:opacity-50 transition shadow-strong"
            >
              {isSubmitting ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default UserSign;

