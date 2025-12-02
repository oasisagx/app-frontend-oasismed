import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../auth';
import { extractUserInfo } from '../lib/jwtUtils';
import { DoctorProfile } from '../types/auth';
import Modal, { ModalHeader, ModalContent, ModalFooter } from '../components/ui/Modal';

export interface AuthUser {
  clinicId: string;
  clinicName: string;
  doctorId: string;
  doctorName: string;
  doctorTreatment?: string;
}

interface SignUpProps {
  doctor?: DoctorProfile | null;
  onResetDoctor?: () => void;
  onLogin?: (user: AuthUser) => void;
}

// Function to clear all signup-related localStorage
export const clearSignupData = () => {
  const keys = [
    'oasis_doctor_profile',
    'oasis_doctor_id',
    'oasis_doctor_code',
    'oasis_doctor_confirmed',
    'oasis_clinic_profile',
    'oasis_clinic_id',
    'oasis_clinic_code',
    'oasis_clinic_created',
    'oasis_clinic_cnpj',
    'oasis_clinic_confirmed',
    'oasis_user_profile',
    'oasis_clinic_user_id',
    'oasis_user_code',
    'oasis_user_created',
    'oasis_user_credentials',
  ];

  keys.forEach((key) => localStorage.removeItem(key));
};

const SignUp: React.FC<SignUpProps> = ({ doctor, onResetDoctor, onLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const clinicCreatedFromState = Boolean(location.state?.clinicCreated);
  const doctorReady = Boolean(location.state?.doctorReady);
  const userCreatedFromState = Boolean(location.state?.userCreated);
  
  // Check localStorage for clinic created status - must have real data (clinic_id and clinic_code)
  const getClinicCreated = () => {
    try {
      // Verificar se existe dados reais da clínica, não apenas o flag
      const clinicId = localStorage.getItem('oasis_clinic_id');
      const clinicCode = localStorage.getItem('oasis_clinic_code');
      const hasRealData = clinicId && clinicCode;
      
      // Só considerar criado se tiver dados reais OU se acabou de criar agora
      return (hasRealData && localStorage.getItem('oasis_clinic_created') === 'true') || clinicCreatedFromState;
    } catch {
      return clinicCreatedFromState;
    }
  };
  
  // Check localStorage for user created status - must have real data (credentials)
  const getUserCreated = () => {
    try {
      // Verificar se existe dados reais do usuário, não apenas o flag
      const credentials = localStorage.getItem('oasis_user_credentials');
      const hasRealData = !!credentials;
      
      // Só considerar criado se tiver dados reais OU se acabou de criar agora
      return (hasRealData && localStorage.getItem('oasis_user_created') === 'true') || userCreatedFromState;
    } catch {
      return userCreatedFromState;
    }
  };
  
  const [clinicCreated, setClinicCreated] = useState(getClinicCreated);
  const [userCreated, setUserCreated] = useState(getUserCreated);
  
  const [step, setStep] = useState(() => {
    if (getUserCreated()) return 2;
    if (getClinicCreated()) return 2;
    return 1;
  });
  const [clinicId, setClinicId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  // Get clinic CNPJ from localStorage or state (prioritize oasis_clinic_profile)
  const getClinicCnpj = () => {
    try {
      // Primeiro tentar do oasis_clinic_profile (padrão similar ao doctor)
      const storedProfile = localStorage.getItem('oasis_clinic_profile');
      if (storedProfile) {
        const clinicProfile = JSON.parse(storedProfile);
        if (clinicProfile.cnpj) {
          return clinicProfile.cnpj;
        }
      }
      // Fallback para localStorage antigo
      const stored = localStorage.getItem('oasis_clinic_cnpj');
      return stored || location.state?.clinicCnpj || '';
    } catch {
      return location.state?.clinicCnpj || '';
    }
  };
  const [clinicCnpj, setClinicCnpj] = useState(getClinicCnpj);
  // Get created username from localStorage or state
  const getCreatedUsername = () => {
    try {
      const credentials = localStorage.getItem('oasis_user_credentials');
      if (credentials) {
        const parsed = JSON.parse(credentials);
        return parsed.username || location.state?.username || '';
      }
      return location.state?.username || '';
    } catch {
      return location.state?.username || '';
    }
  };
  const [createdUsername, setCreatedUsername] = useState(getCreatedUsername);
  
  // Get doctor confirmed status from localStorage
  const getDoctorConfirmed = () => {
    try {
      const stored = localStorage.getItem('oasis_doctor_confirmed');
      return stored === 'true';
    } catch {
      return false;
    }
  };
  
  const [doctorConfirmed, setDoctorConfirmed] = useState(getDoctorConfirmed);
  const [doctorFromDb, setDoctorFromDb] = useState<DoctorProfile | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(false);
  
  // Consider doctor as done if doctor exists AND confirmed in database OR if we just came from doctor signup
  const hasDoctor = useMemo(() => {
    const result = (Boolean(doctor) && doctorConfirmed) || doctorReady;
    console.log('[SignUp] hasDoctor:', {
      hasDoctor: Boolean(doctor),
      doctorConfirmed,
      doctorReady,
      result,
    });
    return result;
  }, [doctor, doctorConfirmed, doctorReady]);
  
  // Get clinic confirmed status from localStorage (similar to doctor)
  const getClinicConfirmed = () => {
    try {
      const stored = localStorage.getItem('oasis_clinic_confirmed');
      return stored === 'true';
    } catch {
      return false;
    }
  };
  
  const [clinicConfirmed, setClinicConfirmed] = useState(getClinicConfirmed);
  const [clinicFromDb, setClinicFromDb] = useState<any>(null);
  const [_isLoadingClinic, setIsLoadingClinic] = useState(false);
  
  // Check if clinic has real data - busca do banco usando clinic_code (similar to doctor)
  const [_hasClinicData, setHasClinicData] = useState(false);
  
  // Usar clínica do banco se disponível (declarar antes de usar no useMemo)
  const displayClinic = clinicFromDb;
  
  // Clinic is only considered done if:
  // 1. Doctor is done (hasDoctor)
  // 2. Clinic exists in database AND is confirmed (clinicConfirmed)
  // 3. clinicCreated flag is true OR clinic exists in DB
  const effectiveClinicCreated = useMemo(() => {
    // Se temos clínica confirmada no banco e médico confirmado, a clínica está válida
    const result = clinicConfirmed && hasDoctor && displayClinic;
    console.log('[SignUp] effectiveClinicCreated:', {
      clinicCreated,
      clinicConfirmed,
      hasDoctor,
      hasDisplayClinic: !!displayClinic,
      result,
    });
    return result;
  }, [clinicCreated, clinicConfirmed, hasDoctor, displayClinic]);
  
  // Check if user has real data (credentials exist)
  const hasUserData = useMemo(() => {
    try {
      const credentials = localStorage.getItem('oasis_user_credentials');
      return !!credentials;
    } catch {
      return false;
    }
  }, [userCreated, location.pathname]);
  
  // User is only considered done if:
  // 1. All previous blocks are done (hasDoctor and effectiveClinicCreated)
  // 2. User has real data (credentials exist)
  // 3. userCreated flag is true
  const hasUser = useMemo(() => {
    return userCreated && effectiveClinicCreated && hasDoctor && hasUserData;
  }, [userCreated, effectiveClinicCreated, hasDoctor, hasUserData]);

  // Check if all 3 steps are complete (doctor, clinic, and user)
  const allStepsComplete = useMemo(() => {
    return hasDoctor && effectiveClinicCreated && hasUser;
  }, [hasDoctor, effectiveClinicCreated, hasUser]);

  // Persist clinicCreated to localStorage when it changes and update state
  useEffect(() => {
    if (clinicCreatedFromState) {
      console.log('[SignUp] clinicCreatedFromState é true, salvando dados...');
      localStorage.setItem('oasis_clinic_created', 'true');
      setClinicCreated(true);
      if (location.state?.clinicCnpj) {
        localStorage.setItem('oasis_clinic_cnpj', location.state.clinicCnpj);
        setClinicCnpj(location.state.clinicCnpj);
      }
      if (location.state?.clinicId) {
        // clinicId é o UUID
        console.log('[SignUp] Salvando clinicId (UUID):', location.state.clinicId);
        localStorage.setItem('oasis_clinic_id', location.state.clinicId);
      }
      if (location.state?.clinicCode) {
        // clinicCode é o código de 6 dígitos para exibição
        console.log('[SignUp] Salvando clinicCode (6 dígitos):', location.state.clinicCode);
        localStorage.setItem('oasis_clinic_code', location.state.clinicCode);
      }
    } else {
      // Se não veio do state, verificar localStorage diretamente
      const clinicId = localStorage.getItem('oasis_clinic_id');
      const clinicCode = localStorage.getItem('oasis_clinic_code');
      const clinicCreatedFlag = localStorage.getItem('oasis_clinic_created');
      
      if (clinicId && clinicCode && clinicCreatedFlag === 'true' && !clinicCreated) {
        console.log('[SignUp] Dados encontrados no localStorage, atualizando clinicCreated');
        setClinicCreated(true);
      }
    }
  }, [clinicCreatedFromState, location.state, clinicCreated]);

  // Persist userCreated to localStorage when it changes and update state
  useEffect(() => {
    if (userCreatedFromState) {
      localStorage.setItem('oasis_user_created', 'true');
      setUserCreated(true);
      if (location.state?.username) {
        setCreatedUsername(location.state.username);
      }
    }
  }, [userCreatedFromState, location.state]);

  // Limpar flags inválidos na montagem (se não houver dados reais)
  useEffect(() => {
    // Verificar clinic - se não tiver dados reais, limpar flag
    const clinicId = localStorage.getItem('oasis_clinic_id');
    const clinicCode = localStorage.getItem('oasis_clinic_code');
    const hasRealClinicData = !!(clinicId && clinicCode);
    
    if (!hasRealClinicData) {
      localStorage.removeItem('oasis_clinic_created');
      setClinicCreated(false);
    } else {
      // Se tiver dados reais, garantir que o flag está setado
      const storedClinic = getClinicCreated();
      setClinicCreated(storedClinic);
    }
    
    // Verificar user - se não tiver dados reais, limpar flag
    const credentials = localStorage.getItem('oasis_user_credentials');
    const hasRealUserData = !!credentials;
    
    if (!hasRealUserData) {
      localStorage.removeItem('oasis_user_created');
      setUserCreated(false);
    } else {
      // Se tiver dados reais, garantir que o flag está setado
      const storedUser = getUserCreated();
      setUserCreated(storedUser);
    }
  }, []); // Executar apenas na montagem
  
  // Also check localStorage on mount and when location changes
  useEffect(() => {
    const storedCnpj = getClinicCnpj();
    if (storedCnpj) {
      setClinicCnpj(storedCnpj);
    }
    const storedUsername = getCreatedUsername();
    if (storedUsername) {
      setCreatedUsername(storedUsername);
    }
    // Atualizar clinicCreated se tiver dados reais
    const clinicId = localStorage.getItem('oasis_clinic_id');
    const clinicCode = localStorage.getItem('oasis_clinic_code');
    const clinicCreatedFlag = localStorage.getItem('oasis_clinic_created');
    
    console.log('[SignUp] Verificando dados da clínica:', {
      clinicId,
      clinicCode,
      clinicCreatedFlag,
      hasBoth: !!(clinicId && clinicCode),
    });
    
    if (clinicId && clinicCode && clinicCreatedFlag === 'true') {
      console.log('[SignUp] Atualizando clinicCreated para true');
      setClinicCreated(true);
    }
  }, [location.pathname, clinicCreatedFromState, userCreatedFromState]);

  useEffect(() => {
    if (userCreated) {
      setStep(2);
      navigate(location.pathname, { replace: true });
    } else if (clinicCreated) {
      setStep(2);
      navigate(location.pathname, { replace: true });
    } else if (!hasDoctor) {
      setStep(1);
    }
  }, [userCreated, clinicCreated, hasDoctor, navigate, location.pathname]);

  useEffect(() => {
    if (doctorReady && location.state?.doctorReady) {
      navigate(location.pathname, { replace: true });
    }
  }, [doctorReady, location.pathname, location.state, navigate]);

  // Quando doctorReady é true (acabou de registrar), confirmar imediatamente
  useEffect(() => {
    if (doctorReady && !doctorConfirmed) {
      console.log('[SignUp] Médico acabou de ser registrado, confirmando imediatamente');
      setDoctorConfirmed(true);
      localStorage.setItem('oasis_doctor_confirmed', 'true');
      // Carregar dados do localStorage
      try {
        const storedDoctor = localStorage.getItem('oasis_doctor_profile');
        if (storedDoctor) {
          const doctorProfile = JSON.parse(storedDoctor) as DoctorProfile;
          setDoctorFromDb(doctorProfile);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao carregar médico do localStorage:', error);
      }
    }
  }, [doctorReady, doctorConfirmed]);
  
  // Carregar dados do médico do localStorage quando a página carrega
  useEffect(() => {
    if (doctorConfirmed && !doctorFromDb) {
      try {
        const storedDoctor = localStorage.getItem('oasis_doctor_profile');
        if (storedDoctor) {
          const doctorProfile = JSON.parse(storedDoctor) as DoctorProfile;
          setDoctorFromDb(doctorProfile);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao carregar médico do localStorage:', error);
      }
    }
  }, [doctorConfirmed, doctorFromDb]);

  // Buscar e confirmar médico no banco de dados quando a página carregar
  useEffect(() => {
    const confirmDoctorInDatabase = async () => {
      // Se já temos um médico confirmado, não precisa buscar novamente
      if (doctorConfirmed) return;
      
      // Se acabou de registrar (doctorReady), não buscar agora (já foi confirmado no useEffect anterior)
      if (doctorReady) {
        return;
      }
      
      // Verificar se há dados do médico no localStorage
      try {
        const storedDoctor = localStorage.getItem('oasis_doctor_profile');
        if (!storedDoctor) {
          console.log('[SignUp] Nenhum médico encontrado no localStorage');
          return;
        }

        const doctorProfile = JSON.parse(storedDoctor) as DoctorProfile;
        const doctorCode = doctorProfile.doctorCode;

        if (!doctorCode) {
          console.log('[SignUp] Médico sem doctorCode para buscar no banco');
          return;
        }

        setIsLoadingDoctor(true);
        console.log('[SignUp] Buscando médico no banco de dados para confirmar registro...');
        console.log('[SignUp] Doctor Code:', doctorCode);

        // Buscar dados do médico no banco de dados usando doctorCode
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiBaseUrl) {
          throw new Error('VITE_API_BASE_URL não está configurada');
        }
        const fetchUrl = `${apiBaseUrl}/doctors/${doctorCode}`;

        console.log('[SignUp] Buscando em:', fetchUrl);

        // Get JWT token for authentication
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) {
          console.error('[SignUp] Nenhum token encontrado para buscar dados do médico');
          return;
        }

        const res = await fetch(fetchUrl, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (res.ok) {
          const dbData = await res.json();
          console.log('[SignUp] Médico confirmado no banco de dados:', dbData);
          
          // Database uses snake_case - prioritize snake_case, fallback to camelCase
          const confirmedDoctor: DoctorProfile = {
            id: dbData.id, // UUID - required field
            doctorCode: dbData.doctor_code || dbData.doctorCode,  // Prioritize snake_case
            crm: dbData.crm,
            treatment: dbData.treatment || '',
            firstName: dbData.first_name || dbData.firstName,  // Prioritize snake_case
            lastName: dbData.last_name || dbData.lastName,  // Prioritize snake_case
            email: dbData.email,
            specialty: dbData.specialty,
            phone: dbData.phone,
            // Legacy fields for compatibility
            doctorId: dbData.id,
          };

          // Atualizar localStorage com dados confirmados do banco
          localStorage.setItem('oasis_doctor_profile', JSON.stringify(confirmedDoctor));
          localStorage.setItem('oasis_doctor_confirmed', 'true');
          
          setDoctorFromDb(confirmedDoctor);
          setDoctorConfirmed(true);
          console.log('[SignUp] Médico confirmado e estado atualizado');
        } else {
          console.warn('[SignUp] Médico não encontrado no banco de dados. Status:', res.status);
          // Se não encontrou no banco, não confirmar
          setDoctorConfirmed(false);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao buscar médico no banco:', error);
        setDoctorConfirmed(false);
      } finally {
        setIsLoadingDoctor(false);
      }
    };

    confirmDoctorInDatabase();
  }, [doctorConfirmed, doctorReady]);

  // Usar médico do banco se disponível, senão usar o prop doctor
  const displayDoctor = doctorFromDb || doctor;

  // Se acabou de criar a clínica (clinicCreatedFromState), confirmar imediatamente
  useEffect(() => {
    if (clinicCreatedFromState && !clinicConfirmed) {
      console.log('[SignUp] Clínica acabou de ser registrada, confirmando imediatamente');
      setClinicConfirmed(true);
      localStorage.setItem('oasis_clinic_confirmed', 'true');
      // Carregar dados do localStorage
      try {
        const storedClinic = localStorage.getItem('oasis_clinic_profile');
        if (storedClinic) {
          const clinicProfile = JSON.parse(storedClinic);
          setClinicFromDb(clinicProfile);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao carregar clínica do localStorage:', error);
      }
    }
  }, [clinicCreatedFromState, clinicConfirmed]);
  
  // Carregar dados da clínica do localStorage quando a página carrega
  useEffect(() => {
    if (clinicConfirmed && !clinicFromDb) {
      try {
        const storedClinic = localStorage.getItem('oasis_clinic_profile');
        if (storedClinic) {
          const clinicProfile = JSON.parse(storedClinic);
          setClinicFromDb(clinicProfile);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao carregar clínica do localStorage:', error);
      }
    }
  }, [clinicConfirmed, clinicFromDb]);

  // Limpeza automática: deletar dados incompletos do banco quando usuário realmente sai
  // IMPORTANTE: Só limpa quando o usuário fecha a aba/navegador, não durante navegação interna
  useEffect(() => {
    // Função para limpar dados incompletos
    const cleanup = () => {
      // Só limpa se o cadastro não estiver completo
      if (!allStepsComplete) {
        console.log('[SignUp] Usuário saiu com cadastro incompleto, limpando dados do banco...');
        deleteIncompleteSignupFromDB(false).catch((e) => {
          console.error('[SignUp] Erro na limpeza automática:', e);
        });
      } else {
        console.log('[SignUp] Cadastro completo, não limpando dados');
      }
    };

    // Listener para quando o usuário fecha a aba/navegador
    // Este é o único momento em que realmente limpamos automaticamente
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // NÃO limpar ao desmontar - isso acontece durante navegação normal entre /signup e /signup/clinic
      // Só limpar quando o usuário realmente sair (beforeunload)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStepsComplete]);

  // Buscar e confirmar clínica no banco de dados quando a página carregar (similar ao médico)
  useEffect(() => {
    const confirmClinicInDatabase = async () => {
      // Se já temos uma clínica confirmada, não precisa buscar novamente
      if (clinicConfirmed) return;
      
      // Se acabou de registrar (clinicCreatedFromState), não buscar agora (já foi confirmado no useEffect anterior)
      if (clinicCreatedFromState) {
        return;
      }
      
      // Verificar se há dados da clínica no localStorage
      try {
        const storedClinic = localStorage.getItem('oasis_clinic_profile');
        if (!storedClinic) {
          console.log('[SignUp] Nenhuma clínica encontrada no localStorage');
          return;
        }

        const clinicProfile = JSON.parse(storedClinic);
        const clinicCode = clinicProfile.clinicCode;

        if (!clinicCode) {
          console.log('[SignUp] Clínica sem clinicCode para buscar no banco');
          return;
        }

        setIsLoadingClinic(true);
        console.log('[SignUp] Buscando clínica no banco de dados para confirmar registro...');
        console.log('[SignUp] Clinic Code:', clinicCode);

        // Buscar dados da clínica no banco de dados usando clinicCode
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const fetchUrl = `${apiBaseUrl}/clinics/${clinicCode}`;

        console.log('[SignUp] Buscando clínica em:', fetchUrl);

        // Get JWT token for authentication
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) {
          console.error('[SignUp] Nenhum token encontrado para buscar dados da clínica');
          return;
        }

        const res = await fetch(fetchUrl, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (res.ok) {
          const dbData = await res.json();
          console.log('[SignUp] Clínica confirmada no banco de dados:', dbData);
          
          // Backend uses map_clinic_response() which converts snake_case to camelCase
          // So responses come as: name, state, address (camelCase)
          const confirmedClinic = {
            id: dbData.id,
            clinicId: dbData.id,
            clinicCode: dbData.clinic_code || dbData.clinicCode,
            name: dbData.name || dbData.clinic_name || '',  // Backend maps clinic_name → name
            cnpj: dbData.cnpj,
            phone: dbData.phone || '',
            state: dbData.state || dbData.state_province || '',  // Backend maps state_province → state
            city: dbData.city || '',
            address: dbData.address || dbData.clinic_address || '',  // Backend maps clinic_address → address
          };

          // Atualizar localStorage com dados confirmados do banco
          localStorage.setItem('oasis_clinic_profile', JSON.stringify(confirmedClinic));
          localStorage.setItem('oasis_clinic_confirmed', 'true');
          // Manter compatibilidade
          localStorage.setItem('oasis_clinic_id', confirmedClinic.id);
          localStorage.setItem('oasis_clinic_code', confirmedClinic.clinicCode);
          localStorage.setItem('oasis_clinic_cnpj', confirmedClinic.cnpj);
          localStorage.setItem('oasis_clinic_created', 'true');
          
          setClinicFromDb(confirmedClinic);
          setClinicConfirmed(true);
          setHasClinicData(true);
          if (dbData.cnpj) {
            setClinicCnpj(dbData.cnpj);
          }
          console.log('[SignUp] Clínica confirmada e estado atualizado');
        } else {
          console.warn('[SignUp] Clínica não encontrada no banco de dados. Status:', res.status);
          // Se não encontrou no banco, não confirmar
          setClinicConfirmed(false);
          setHasClinicData(false);
        }
      } catch (error) {
        console.error('[SignUp] Erro ao buscar clínica no banco:', error);
        setClinicConfirmed(false);
        setHasClinicData(false);
      } finally {
        setIsLoadingClinic(false);
      }
    };

    confirmClinicInDatabase();
  }, [clinicConfirmed, clinicCreatedFromState]);

  const steps = useMemo(
    () => [
      {
        label: 'MÉDICO',
        description: hasDoctor && displayDoctor
          ? `${displayDoctor.firstName || displayDoctor.first_name} ${displayDoctor.lastName || displayDoctor.last_name}`
          : 'Cadastro do(a) médico(a)',
      },
      {
        label: 'CLÍNICA',
        description: effectiveClinicCreated && displayClinic?.clinicCode 
          ? `ID da clínica ${displayClinic.clinicCode}` 
          : 'Cadastro da clínica',
      },
      {
        label: 'USUÁRIO',
        description: hasUser && createdUsername ? createdUsername : 'Cadastro do usuário',
      },
    ],
    [displayDoctor, hasDoctor, hasUser, effectiveClinicCreated, displayClinic, createdUsername]
  );

  const clinicIdDigits = clinicId.trim().replace(/\D/g, '');

  const validateClinicStep = () => {
    if (clinicIdDigits.length !== 6) {
      setError('O ID da clínica deve ter exatamente 6 dígitos.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    if (!clinicId.trim() || clinicId.replace(/\D/g, '').length !== 6) {
      setError('Informe um ID de clínica válido (6 dígitos).');
      return;
    }
    if (!username.trim()) {
      setError('Informe o usuário.');
      return;
    }
    if (!password.trim()) {
      setError('Informe a senha.');
      return;
    }
    
    try {
      const clinicCode = clinicId.replace(/\D/g, '').slice(0, 6);
      const { idToken } = await loginUser({
        clinicCode,
        username: username.trim(),
        password: password,
      });

      // idToken disponível para chamadas de API autenticadas
      console.log('Login OK. ID Token:', idToken);

      // Extract user info from JWT token
      const userInfo = extractUserInfo(idToken);
      const customAttrs = userInfo.customAttributes || {};

      if (onLogin) {
        // Extract user info from token and doctor profile
        const currentDoctor = displayDoctor || doctor;
        const doctorName = (currentDoctor?.firstName || currentDoctor?.first_name) && (currentDoctor?.lastName || currentDoctor?.last_name)
          ? `${currentDoctor.firstName || currentDoctor.first_name} ${currentDoctor.lastName || currentDoctor.last_name}` 
          : userInfo.name || username.trim();

        // Buscar nome da clínica do banco usando clinic_code
        let clinicName = '';
        if (customAttrs.clinic_code) {
          try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
            const clinicRes = await fetch(`${apiBaseUrl}/clinics/${customAttrs.clinic_code}`, {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (clinicRes.ok) {
              const clinicData = await clinicRes.json();
              // Backend uses map_clinic_response() which converts clinic_name → name
              clinicName = clinicData.name || clinicData.clinic_name || '';
            }
          } catch (err) {
            console.warn('[SignUp] Erro ao buscar nome da clínica:', err);
          }
        }

        onLogin({
          clinicId: customAttrs.clinic_code || clinicCode,
          clinicName: clinicName, // Apenas o nome real do banco, sem fallback para código
          doctorId: customAttrs.doctor_id || username.trim(),
          doctorName: doctorName,
          doctorTreatment: currentDoctor?.treatment || '',
        });
      }

      // Redirecionar para a página principal após login bem-sucedido
      navigate('/main');
    } catch (err: any) {
      console.error('[SignUp] Erro no loginUser:', err);

      const name = err?.name || '';
      if (name === 'NotAuthorizedException') {
        setError('Senha incorreta. Verifique e tente novamente.');
      } else if (name === 'UserNotFoundException') {
        setError('Usuário não encontrado para esse ID de clínica.');
      } else if (name === 'UserNotConfirmedException') {
        setError('Usuário ainda não confirmado. Verifique seu e-mail.');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
    }
  };

  const handleContinue = () => {
    setError('');
    // If user is created, always try to login
    if (hasUser) {
      handleLogin();
      return;
    }
    // Otherwise, follow the signup flow
    if (step === 1) {
      if (!hasDoctor) {
        handleDoctorSignUp(false); // Create new, don't reset
        return;
      }
      if (validateClinicStep()) {
        navigate('/clinics/create');
      }
      return;
    }
    if (step === 2) {
      navigate('/signup/user');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleContinue();
    }
  };

  const handleDoctorSignUp = (reset: boolean = false) => {
    if (reset) {
      onResetDoctor?.();
      try {
        // Clear doctor-related localStorage only if resetting
        localStorage.removeItem('oasis_doctor_profile');
        localStorage.removeItem('oasis_doctor_confirmed');
        localStorage.removeItem('oasis_doctor_code');
      } catch (e) {
        console.warn('[SignUp] Erro limpando localStorage do doctor:', e);
      }
    }
    // If reset is false, don't clear anything - just navigate to edit
    navigate('/signup/doctor');
  };

  const handleClinicSignUp = async (reset: boolean = false) => {
    if (reset) {
      try {
        // Clear clinic-related localStorage only if resetting
        localStorage.removeItem('oasis_clinic_profile');
        localStorage.removeItem('oasis_clinic_confirmed');
        localStorage.removeItem('oasis_clinic_id');
        localStorage.removeItem('oasis_clinic_code');
        localStorage.removeItem('oasis_clinic_cnpj');
        localStorage.removeItem('oasis_clinic_created');
      } catch (e) {
        console.warn('[SignUp] Erro limpando localStorage da clínica:', e);
      }
    }
    // If reset is false, don't clear anything - just navigate to edit
    // Durante signup inicial, token pode não estar disponível - navegar direto
    const clinicCode = localStorage.getItem('oasis_clinic_code');
    if (clinicCode && !reset) {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        // Se não houver token, navegar direto (signup inicial)
        if (!idToken) {
          console.log('[SignUp] Token não disponível (signup inicial), navegando direto para edição');
          navigate('/clinics/create');
          return;
        }

        // Se houver token, validar se clínica existe no banco (opcional)
        const apiBaseUrl = import.meta.env.DEV
          ? '/api'
          : (import.meta.env.VITE_API_BASE_URL || '/api');
        const res = await fetch(`${apiBaseUrl}/clinics/${clinicCode}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          // Clínica existe, navegar para edição
          navigate('/clinics/create');
          return;
        }
      } catch (error) {
        console.error('[SignUp] Erro ao verificar clínica:', error);
        // Em caso de erro, navegar mesmo assim (o próprio formulário validará)
      }
    }
    // Navegar para criação/edição
    navigate('/clinics/create');
  };
  
  const handleUserSignUp = async (reset: boolean = false) => {
    if (reset) {
      try {
        // Clear user-related localStorage only if resetting
        localStorage.removeItem('oasis_user_profile');
        localStorage.removeItem('oasis_user_credentials');
        localStorage.removeItem('oasis_user_created');
        localStorage.removeItem('oasis_clinic_user_id');
        localStorage.removeItem('oasis_user_code');
      } catch (e) {
        console.warn('[SignUp] Erro limpando localStorage do usuário:', e);
      }
    }
    // If reset is false, don't clear anything - just navigate to edit
    // Validar que clinic e doctor existem no banco antes de navegar
    const clinicCode = localStorage.getItem('oasis_clinic_code');
    const doctorCode = localStorage.getItem('oasis_doctor_code') || 
                       JSON.parse(localStorage.getItem('oasis_doctor_profile') || '{}').doctorCode;
    
    if (!clinicCode || !doctorCode) {
      setError('Por favor, complete os cadastros anteriores primeiro.');
      return;
    }
    
    // Validar que ambos existem no banco (opcional - apenas se houver token)
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      // Se não houver token, apenas navegar (durante signup o usuário pode não estar autenticado ainda)
      if (!idToken) {
        console.log('[SignUp] Nenhum token encontrado, navegando diretamente para signup de usuário');
        navigate('/signup/user');
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      
      const [clinicRes, doctorRes] = await Promise.all([
        fetch(`${apiBaseUrl}/clinics/${clinicCode}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }),
        fetch(`${apiBaseUrl}/doctors/${doctorCode}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }),
      ]);
      
      if (!clinicRes.ok) {
        setError('Clínica não encontrada no banco de dados. Por favor, cadastre a clínica primeiro.');
        return;
      }
      if (!doctorRes.ok) {
        setError('Médico não encontrado no banco de dados. Por favor, cadastre o médico primeiro.');
        return;
      }
      
      // Ambos existem, pode prosseguir
      navigate('/signup/user');
    } catch (error) {
      console.error('[SignUp] Erro ao validar dados:', error);
      // Em caso de erro, ainda assim navegar para signup (o próprio signup validará)
      navigate('/signup/user');
    }
  };

  const handleResetCadastro = () => {
    setShowResetModal(true);
  };

  // Função helper para deletar dados do banco (reutilizável)
  const deleteIncompleteSignupFromDB = useCallback(async (forceDeleteAll: boolean = false) => {
    // Se todos os 3 passos estão completos e não é forceDeleteAll, não deletar
    if (!forceDeleteAll && allStepsComplete) {
      console.log('[SignUp] Cadastro completo, não deletando do banco');
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('VITE_API_BASE_URL não está configurada');
      }

      // Helper para pegar ID de forma robusta:
      const getIdFromStorage = (
        idKey: string,
        profileKey: string,
        profileField: string
      ): string | null => {
        let id = localStorage.getItem(idKey);
        if (id) return id;

        const profileStr = localStorage.getItem(profileKey);
        if (!profileStr) return null;

        try {
          const profile = JSON.parse(profileStr);
          return (
            (profile[profileField] as string) ||
            (profile.id as string) ||
            null
          );
        } catch {
          return null;
        }
      };

      // IDs que vamos tentar deletar (sempre UUID)
      const clinicUserId = getIdFromStorage(
        'oasis_clinic_user_id',
        'oasis_user_profile',
        'clinicUserId'
      );
      const clinicId = getIdFromStorage(
        'oasis_clinic_id',
        'oasis_clinic_profile',
        'clinicId'
      );
      const doctorId = getIdFromStorage(
        'oasis_doctor_id',
        'oasis_doctor_profile',
        'doctorId'
      );

      // Se forceDeleteAll, deleta tudo. Senão, só deleta o que está incompleto
      const shouldDeleteClinicUser = forceDeleteAll || !hasUser;
      const shouldDeleteClinic = forceDeleteAll || !effectiveClinicCreated;
      const shouldDeleteDoctor = forceDeleteAll || !hasDoctor;

      console.log('[SignUp] Verificando dados incompletos para deletar:', {
        clinicUserId: shouldDeleteClinicUser ? clinicUserId : '(não deletar - completo)',
        clinicId: shouldDeleteClinic ? clinicId : '(não deletar - completo)',
        doctorId: shouldDeleteDoctor ? doctorId : '(não deletar - completo)',
        forceDeleteAll,
      });

      // Token (opcional)
      let idToken: string | undefined;
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        idToken = session.tokens?.idToken?.toString();
      } catch {
        // Token não disponível, mas curl funciona sem
      }

      const headers: HeadersInit = {};
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const safeDelete = async (path: string | null, label: string) => {
        if (!path) return;

        const url = `${apiBaseUrl}${path}`;
        try {
          const res = await fetch(url, { method: 'DELETE', headers });
          if (res.ok) {
            console.log(`[SignUp] ✅ ${label} deletado do banco`);
          } else {
            console.warn(`[SignUp] ⚠️ ${label} não deletado (status: ${res.status})`);
          }
        } catch (e) {
          console.error(`[SignUp] Erro ao deletar ${label}:`, e);
        }
      };

      // ORDEM IMPORTANTE (FK inversa):
      if (shouldDeleteClinicUser && clinicUserId) {
        await safeDelete(`/clinic-users/${clinicUserId}`, 'clinic_user');
      }
      if (shouldDeleteClinic && clinicId) {
        await safeDelete(`/clinics/${clinicId}`, 'clinic');
      }
      if (shouldDeleteDoctor && doctorId) {
        await safeDelete(`/doctors/${doctorId}`, 'doctor');
      }
    } catch (e) {
      console.error('[SignUp] Erro ao deletar dados incompletos do banco:', e);
    }
  }, [allStepsComplete, hasUser, effectiveClinicCreated, hasDoctor]);

  const confirmResetCadastro = async () => {
    setIsResetting(true);

    try {
      // Always use VITE_API_BASE_URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('VITE_API_BASE_URL não está configurada');
      }

      // Pegar idToken se existir (o endpoint exige JWT)
      let idToken: string | undefined;
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        idToken = session.tokens?.idToken?.toString();
      } catch {
        console.log('[SignUp] Token não disponível para /signup/reset');
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      console.log('[SignUp] Chamando POST /signup/reset');
      console.log('[SignUp] API Base URL:', apiBaseUrl);
      console.log('[SignUp] Token disponível:', !!idToken);

      const res = await fetch(`${apiBaseUrl}/signup/reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}), // sem body relevante, backend usa claims
      });

      const text = await res.text();
      console.log('[SignUp] Resposta /signup/reset:', res.status, text);

      if (res.ok) {
        console.log('[SignUp] ✅ Reset de cadastro concluído (lado servidor)');
      } else {
        console.warn('[SignUp] ⚠️ Reset retornou status não-OK:', res.status, text);
      }

      // Mesmo se der 404/500, vamos limpar localStorage pra deixar a UI consistente
    } catch (err) {
      console.error('[SignUp] Erro ao chamar /signup/reset:', err);
      // Mesmo com erro, vamos limpar localStorage
    } finally {
      // SEMPRE zerar tudo e voltar pro início, mesmo se algum DELETE falhar
      
      // Sign out from Amplify/Cognito to clear the session
      try {
        const { signOut } = await import('aws-amplify/auth');
        await signOut({ global: true }); // Clear session globally
        console.log('[SignUp] ✅ SignOut do Amplify concluído');
      } catch (e) {
        console.warn('[SignUp] ⚠️ Erro ao fazer signOut do Amplify:', e);
        // Continue anyway - we'll clear localStorage and redirect
      }
      
      clearSignupData();
      setShowResetModal(false);
      setIsResetting(false);
      window.location.href = '/signup';
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-oasis-blue/30 via-gray-100 to-oasis-blue/25 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-strong border border-white/60 p-8 md:p-10 backdrop-blur">
          <header className="mb-8 text-center">
            <h1 className="text-xl font-bold text-gray-900">Bem-vindo(a) ao seu cadastro</h1>
            <p className="text-gray-500 mt-2">
              Por favor, siga os 3 passos abaixo
            </p>
          </header>

          <ol className="space-y-5">
            {steps.map((item, index) => {
              const isDone = 
                index === 0 ? hasDoctor : 
                index === 1 ? effectiveClinicCreated : 
                index === 2 ? hasUser : 
                false;
              // Block 2 is disabled if block 1 is not done
              // Block 3 is disabled if block 2 is not done
              const isDisabled = 
                index === 1 ? !hasDoctor :
                index === 2 ? !effectiveClinicCreated :
                false;
              return (
                <li
                  key={item.label}
                  className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-3 transition-all ${
                    isDone ? 'border-oasis-blue bg-oasis-blue/5' : 'border-gray-300'
                  } ${isDisabled ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-semibold ${
                      isDone
                        ? 'bg-oasis-blue text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isDone ? '✔' : index + 1}
                  </div>
                  <div className={`flex-1 flex items-center justify-between ${isDisabled ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col justify-center space-y-1">
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      {index === 1 && effectiveClinicCreated && displayClinic?.clinicCode ? (
                        <p className="text-base text-gray-600">
                          ID da clínica <span className="font-bold">{displayClinic.clinicCode}</span>
                        </p>
                      ) : index === 2 && hasUser && createdUsername ? (
                        <p className="text-base text-gray-600">
                          <span className="font-bold">{createdUsername}</span>
                        </p>
                      ) : (
                        <p className="text-base text-gray-600">{item.description}</p>
                      )}
                      {index === 0 && hasDoctor && displayDoctor && (
                        <>
                          <p className="text-sm text-gray-500">CRM {displayDoctor.crm}</p>
                          {isLoadingDoctor && (
                            <p className="text-xs text-gray-400">Confirmando registro no banco...</p>
                          )}
                        </>
                      )}
                      {index === 0 && !hasDoctor && (
                        <button
                          type="button"
                          onClick={() => handleDoctorSignUp(false)} // Create new, don't reset
                          className="text-sm font-medium text-oasis-blue hover:text-oasis-blue-dark"
                        >
                          Não possui perfil médico? Crie aqui
                        </button>
                      )}
                      {index === 1 && effectiveClinicCreated && displayClinic && (
                        <p className="text-sm text-gray-500">CNPJ {displayClinic.cnpj || clinicCnpj}</p>
                      )}
                      {index === 1 && !effectiveClinicCreated && (
                        <button
                          type="button"
                          onClick={() => handleClinicSignUp(false)} // Create new, don't reset
                          disabled={isDisabled}
                          className={`text-sm font-medium ${
                            isDisabled 
                              ? 'text-gray-400 ![cursor:default]' 
                              : 'text-oasis-blue hover:text-oasis-blue-dark'
                          }`}
                        >
                          Sem clínica registrada? Crie aqui
                        </button>
                      )}
                      {index === 2 && !hasUser && (
                        <button
                          type="button"
                          onClick={() => handleUserSignUp(false)} // Create new, don't reset
                          disabled={isDisabled}
                          className={`text-sm font-medium ${
                            isDisabled 
                              ? 'text-gray-400 ![cursor:default]' 
                              : 'text-oasis-blue hover:text-oasis-blue-dark'
                          }`}
                        >
                          Não possui usuário? Crie aqui
                        </button>
                      )}
                    </div>
                    {(index === 0 && hasDoctor && displayDoctor) || 
                     (index === 1 && effectiveClinicCreated && displayClinic) ? (
                      <button
                        type="button"
                        onClick={
                          index === 0 ? () => handleDoctorSignUp(false) : // Edit, don't reset
                          () => handleClinicSignUp(false) // Edit, don't reset
                        }
                        className="text-sm font-medium text-oasis-blue hover:text-oasis-blue-dark ml-4 flex-shrink-0"
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleResetCadastro}
              className="w-full px-4 py-3 rounded-xl border border-red-400 text-red-500 bg-white font-semibold hover:bg-red-50 transition"
            >
              Resetar cadastro
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-strong border border-white/60 p-8 md:p-10 backdrop-blur">
          <header className="mb-8 text-center">
            <h1 className="text-xl font-bold text-gray-900">Após o cadastro, acesse</h1>
          </header>
          <div className="space-y-5">
            <div>
              <label className={`text-sm font-medium mb-1 block ${
                !allStepsComplete ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ID da clínica
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ID da clínica recebido no 2º passo"
                value={clinicId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setClinicId(value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                disabled={!allStepsComplete}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all ${
                  !allStepsComplete ? 'bg-gray-100 opacity-60' : ''
                }`}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-1 block ${
                !allStepsComplete ? 'text-gray-400' : 'text-gray-600'
              }`}>Usuário</label>
              <input
                type="text"
                placeholder="Usuário definido no 3º passo"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                disabled={!allStepsComplete}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all ${
                  !allStepsComplete ? 'bg-gray-100 opacity-60' : ''
                }`}
              />
            </div>
            <div>
              <label className={`text-sm font-medium mb-1 block ${
                !allStepsComplete ? 'text-gray-400' : 'text-gray-600'
              }`}>Senha</label>
              <input
                type="password"
                placeholder="Senha definida no 3º passo"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                disabled={!allStepsComplete}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all ${
                  !allStepsComplete ? 'bg-gray-100 opacity-60' : ''
                }`}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="button"
                onClick={handleContinue}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-white transition shadow-medium hover:shadow-strong ${
                  hasUser ? 'bg-oasis-blue-dark' : 'bg-oasis-blue hover:bg-oasis-blue-dark'
                }`}
              >
                {hasUser ? 'Entrar' : 'Continuar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSignupData();
                  navigate('/login');
                }}
                disabled={hasDoctor}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition shadow-medium ${
                  hasDoctor
                    ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60'
                    : 'text-gray-700 bg-white border border-gray-300 hover:shadow-strong hover:bg-gray-50'
                }`}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => !isResetting && setShowResetModal(false)}
        className="max-w-md"
      >
        <ModalHeader>Resetar cadastro</ModalHeader>
        <ModalContent>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja resetar seu cadastro?
          </p>
        </ModalContent>
        <ModalFooter>
          <div className="flex items-center justify-end gap-4 w-full">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              disabled={isResetting}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Não
            </button>
            <button
              type="button"
              onClick={confirmResetCadastro}
              disabled={isResetting}
              className="px-4 py-2 rounded-xl border border-red-400 text-red-500 bg-white hover:bg-red-50 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? 'Resetando...' : 'Resetar'}
            </button>
          </div>
        </ModalFooter>
      </Modal>
    </section>
  );
};

export default SignUp;

