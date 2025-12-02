import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ClinicFormState {
  name: string;
  cnpj: string;
  phone: string;
  state: string;
  city: string;
  address: string;
}

const ClinicSignup: React.FC = () => {
  const [form, setForm] = useState<ClinicFormState>({
    name: '',
    cnpj: '',
    phone: '',
    state: '',
    city: '',
    address: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingClinic, setHasExistingClinic] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Carregar dados existentes da clínica do localStorage quando o componente montar ou quando a rota mudar
  useEffect(() => {
    try {
      // Primeiro, tentar carregar do oasis_clinic_profile (padrão similar ao doctor)
      const storedClinicProfile = localStorage.getItem('oasis_clinic_profile');
      if (storedClinicProfile) {
        try {
          const clinicProfile = JSON.parse(storedClinicProfile);
          console.log('[ClinicSignup] Clínica encontrada no oasis_clinic_profile:', clinicProfile);
          
          // Se temos clinicCode, buscar dados atualizados do banco
          if (clinicProfile.clinicCode) {
            const fetchClinicData = async () => {
              try {
                const apiBaseUrl = import.meta.env.DEV
                  ? '/api'
                  : (import.meta.env.VITE_API_BASE_URL || '/api');
                // Get JWT token for authentication (opcional durante signup inicial)
                const { fetchAuthSession } = await import('aws-amplify/auth');
                let idToken: string | undefined;
                try {
                  const session = await fetchAuthSession();
                  idToken = session.tokens?.idToken?.toString();
                } catch {
                  console.log('[ClinicSignup] Token não disponível (signup inicial), usando dados do localStorage');
                }

                // Se não houver token, usar dados do profile diretamente
                if (!idToken) {
                  console.log('[ClinicSignup] Usando dados do profile (token não disponível)');
                  setForm({
                    name: clinicProfile.name || '',
                    cnpj: clinicProfile.cnpj || '',
                    phone: clinicProfile.phone || '',
                    state: clinicProfile.state || '',
                    city: clinicProfile.city || '',
                    address: clinicProfile.address || '',
                  });
                  setAgreed(true);
                  setHasExistingClinic(true);
                  return;
                }

                const res = await fetch(`${apiBaseUrl}/clinics/${clinicProfile.clinicCode}`, {
                  method: 'GET',
                  headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                  },
                });

                if (res.ok) {
                  const clinicData = await res.json();
                  console.log('[ClinicSignup] Dados atualizados do banco:', clinicData);
                  
                  // Backend uses map_clinic_response() which converts snake_case to camelCase
                  setForm({
                    name: clinicData.name || clinicData.clinic_name || clinicProfile.name || '',  // Backend maps clinic_name → name
                    cnpj: clinicData.cnpj || clinicProfile.cnpj || '',
                    phone: clinicData.phone || clinicProfile.phone || '',
                    state: clinicData.state || clinicData.state_province || clinicProfile.state || '',  // Backend maps state_province → state
                    city: clinicData.city || clinicProfile.city || '',
                    address: clinicData.address || clinicData.clinic_address || clinicProfile.address || '',  // Backend maps clinic_address → address
                  });
                  setAgreed(true);
                  setHasExistingClinic(true); // Mark as editing existing clinic
                } else {
                  // Se não conseguir buscar do banco, usar dados do profile
                  console.warn('[ClinicSignup] Não foi possível buscar dados do banco, usando dados do profile');
                  setForm({
                    name: clinicProfile.name || '',
                    cnpj: clinicProfile.cnpj || '',
                    phone: clinicProfile.phone || '',
                    state: clinicProfile.state || '',
                    city: clinicProfile.city || '',
                    address: clinicProfile.address || '',
                  });
                  setAgreed(true);
                  setHasExistingClinic(true); // Mark as editing existing clinic
                }
              } catch (err) {
                console.error('[ClinicSignup] Erro ao buscar dados da clínica:', err);
                // Se não conseguir buscar do banco, usar dados do profile
                setForm({
                  name: clinicProfile.name || '',
                  cnpj: clinicProfile.cnpj || '',
                  phone: clinicProfile.phone || '',
                  state: clinicProfile.state || '',
                  city: clinicProfile.city || '',
                  address: clinicProfile.address || '',
                });
                setAgreed(true);
                setHasExistingClinic(true); // Mark as editing existing clinic
              }
            };

            fetchClinicData();
          } else {
            // Se não tem clinicCode, usar dados do profile diretamente
            setForm({
              name: clinicProfile.name || '',
              cnpj: clinicProfile.cnpj || '',
              phone: clinicProfile.phone || '',
              state: clinicProfile.state || '',
              city: clinicProfile.city || '',
              address: clinicProfile.address || '',
            });
            setAgreed(true);
            setHasExistingClinic(true); // Mark as editing existing clinic
          }
          return; // Já carregamos do profile, não precisa continuar
        } catch (err) {
          console.warn('[ClinicSignup] Erro ao parsear oasis_clinic_profile:', err);
        }
      }

      // Fallback: tentar carregar do localStorage antigo (compatibilidade)
      const clinicCode = localStorage.getItem('oasis_clinic_code');
      const clinicCnpj = localStorage.getItem('oasis_clinic_cnpj');
      
      if (clinicCode) {
        console.log('[ClinicSignup] Clínica já existe, buscando dados do banco pelo código:', clinicCode);
        
        // Buscar dados completos da clínica do banco usando clinic_code
        const fetchClinicData = async () => {
          try {
            const apiBaseUrl = import.meta.env.DEV
              ? '/api'
              : (import.meta.env.VITE_API_BASE_URL || '/api');
            // Get JWT token for authentication (opcional durante signup inicial)
            const { fetchAuthSession } = await import('aws-amplify/auth');
            let idToken: string | undefined;
            try {
              const session = await fetchAuthSession();
              idToken = session.tokens?.idToken?.toString();
            } catch {
              console.log('[ClinicSignup] Token não disponível (signup inicial), usando CNPJ do localStorage');
            }

            // Se não houver token, usar apenas CNPJ do localStorage
            if (!idToken) {
              if (clinicCnpj) {
                setForm(prev => ({ ...prev, cnpj: clinicCnpj }));
                setHasExistingClinic(true);
              }
              return;
            }

            const res = await fetch(`${apiBaseUrl}/clinics/${clinicCode}`, {
              method: 'GET',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
            });

            if (res.ok) {
              const clinicData = await res.json();
              console.log('[ClinicSignup] Dados da clínica carregados:', clinicData);
              
              // Backend uses map_clinic_response() which converts snake_case to camelCase
              setForm({
                name: clinicData.name || clinicData.clinic_name || '',  // Backend maps clinic_name → name
                cnpj: clinicData.cnpj || clinicCnpj || '',
                phone: clinicData.phone || '',
                state: clinicData.state || clinicData.state_province || '',  // Backend maps state_province → state
                city: clinicData.city || '',
                address: clinicData.address || clinicData.clinic_address || '',  // Backend maps clinic_address → address
              });
              setAgreed(true);
              setHasExistingClinic(true); // Mark as editing existing clinic
            } else {
              console.warn('[ClinicSignup] Não foi possível buscar dados do banco, usando CNPJ do localStorage');
              if (clinicCnpj) {
                setForm(prev => ({ ...prev, cnpj: clinicCnpj }));
                setHasExistingClinic(true); // Mark as editing existing clinic
              }
            }
          } catch (err) {
            console.error('[ClinicSignup] Erro ao buscar dados da clínica:', err);
            if (clinicCnpj) {
              setForm(prev => ({ ...prev, cnpj: clinicCnpj }));
              setHasExistingClinic(true); // Mark as editing existing clinic
            }
          }
        };

        fetchClinicData();
      } else if (clinicCnpj) {
        // Se não tem clinic_code, mas tem CNPJ no localStorage, usar pelo menos o CNPJ
        setForm(prev => ({ ...prev, cnpj: clinicCnpj }));
        setHasExistingClinic(true); // Mark as editing existing clinic
      }
    } catch (error) {
      console.error('[ClinicSignup] Erro ao carregar dados da clínica:', error);
    }
  }, [location.pathname]); // Reload when route changes (e.g., when clicking "Editar")

  const handleChange = (field: keyof ClinicFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Validação dos campos obrigatórios
    if (!form.name.trim()) {
      setError('Nome da clínica é obrigatório.');
      return;
    }
    if (!form.cnpj.trim()) {
      setError('CNPJ é obrigatório.');
      return;
    }
    if (!form.state.trim()) {
      setError('Estado é obrigatório.');
      return;
    }
    if (form.state.trim().length !== 2) {
      setError('Estado deve ter 2 caracteres (ex: SP, RJ).');
      return;
    }
    if (!form.city.trim()) {
      setError('Cidade é obrigatória.');
      return;
    }
    if (!agreed) {
      setError('Você precisa concordar com os termos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Durante desenvolvimento, usar /api (proxy do Vite) para evitar CORS
      // Em produção, usar VITE_API_BASE_URL diretamente
      const apiBaseUrl = import.meta.env.DEV
        ? '/api'
        : (import.meta.env.VITE_API_BASE_URL || '/api');

      // API expects camelCase (backend converts to snake_case for database)
      const payload: any = {
        name: form.name.trim(),  // API expects camelCase (converts to clinic_name in DB)
        cnpj: form.cnpj.trim(),
        phone: form.phone.trim() || undefined,
        state: form.state.trim().toUpperCase(),  // API expects camelCase (converts to state_province in DB)
        city: form.city.trim(),
        address: form.address.trim() || undefined,  // API expects camelCase (converts to clinic_address in DB)
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('[ClinicSignup] Enviando payload:', payload);
      console.log('[ClinicSignup] API Base URL:', apiBaseUrl);
      console.log('[ClinicSignup] Modo desenvolvimento:', import.meta.env.DEV);

      // Get JWT token for authentication (if available, for edit operations)
      // Note: For initial clinic creation, token may not be available yet
      const { fetchAuthSession } = await import('aws-amplify/auth');
      let idToken: string | undefined;
      try {
        const session = await fetchAuthSession();
        idToken = session.tokens?.idToken?.toString();
      } catch {
        // Token may not be available during initial signup - backend should handle this
        console.log('[ClinicSignup] Token não disponível (signup inicial)');
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      // Always use POST /clinics - backend does upsert by CNPJ
      const url = `${apiBaseUrl}/clinics`;
      const method: 'POST' = 'POST';
      
      console.log('[ClinicSignup] URL completa:', url);
      console.log('[ClinicSignup] Método:', method);
      console.log('[ClinicSignup] É edição?', hasExistingClinic);

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(payload),
        });
      } catch (fetchError: any) {
        console.error('[ClinicSignup] Erro na requisição fetch:', fetchError);
        
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

      const data = await res.json().catch(() => null);
      console.log('[ClinicSignup] Resposta /clinics:', res.status, data);

      if (!res.ok || !data) {
        setError(
          data?.message ||
            'Erro ao criar clínica. Verifique os dados e tente novamente.',
        );
        setIsSubmitting(false);
        return;
      }

      // Database uses snake_case - prioritize snake_case, fallback to camelCase for compatibility
      const clinicIdFromResponse =
        data.id || data.clinic_id || data.clinicId;           // UUID
      const clinicCodeFromResponse =
        data.clinic_code || data.clinicCode;                  // código 6 dígitos
      const clinicCnpjFromResponse =
        data.cnpj || form.cnpj.trim();
      const clinicNameFromResponse =
        data.clinic_name || data.name || form.name.trim();    // clinic_name in DB
      const stateFromResponse =
        data.state_province || data.state || form.state.trim().toUpperCase();  // state_province in DB
      const addressFromResponse =
        data.clinic_address || data.address || form.address.trim() || '';  // clinic_address in DB

      console.log('[ClinicSignup] Parsed response:', {
        clinicIdFromResponse,
        clinicCodeFromResponse,
        clinicCnpjFromResponse,
        clinicNameFromResponse,
        raw: data,
      });

      if (!clinicIdFromResponse || !clinicCodeFromResponse) {
        console.error('[ClinicSignup] Resposta sem id/clinic_code normalizados:', data);
        setError('Servidor não retornou os dados da clínica (id/código).');
        setIsSubmitting(false);
        return;
      }

      // 🔥 PONTO CRÍTICO: Criar objeto completo do perfil da clínica (similar ao oasis_doctor_profile)
      const clinicProfile = {
        id: clinicIdFromResponse, // UUID do banco
        clinicId: clinicIdFromResponse, // UUID do banco (alias)
        clinicCode: clinicCodeFromResponse, // código da clínica (6 dígitos)
        name: clinicNameFromResponse,  // Use clinic_name from DB
        cnpj: clinicCnpjFromResponse,
        phone: data.phone || form.phone.trim() || '',
        state: stateFromResponse,  // Use state_province from DB
        city: data.city || form.city.trim(),
        address: addressFromResponse,  // Use clinic_address from DB
      };

      console.log('[ClinicSignup] Perfil da clínica final (salvando no localStorage):', clinicProfile);

      // Salvar tudo no localStorage como oasis_clinic_profile (similar ao oasis_doctor_profile)
      localStorage.setItem('oasis_clinic_profile', JSON.stringify(clinicProfile));
      // Também salvar clinic_code separadamente para facilitar busca
      if (clinicProfile.clinicCode) {
        localStorage.setItem('oasis_clinic_code', clinicProfile.clinicCode);
      }
      if (clinicProfile.id || clinicProfile.clinicId) {
        localStorage.setItem('oasis_clinic_id', clinicProfile.id || clinicProfile.clinicId);
      }
      // Manter compatibilidade com código existente
      localStorage.setItem('oasis_clinic_cnpj', clinicCnpjFromResponse);
      localStorage.setItem('oasis_clinic_created', 'true');

      console.log('[ClinicSignup] Salvos no localStorage:', {
        clinicId: localStorage.getItem('oasis_clinic_id'),
        clinicCode: localStorage.getItem('oasis_clinic_code'),
        clinicCreated: localStorage.getItem('oasis_clinic_created'),
      });

      // Voltar pro /signup com state consistente
      setIsSubmitting(false);
      navigate('/signup', {
        state: {
          clinicCreated: true,
          clinicCnpj: clinicCnpjFromResponse,
          clinicId: clinicIdFromResponse,
          clinicCode: clinicCodeFromResponse,
        },
      });
    } catch (err: any) {
      console.error('[ClinicSignup] Erro no submit:', err);
      setError('Erro ao comunicar com o servidor. Tente novamente.');
      setIsSubmitting(false);
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
            Voltar para a página anterior
          </button>
          <h1 className="text-4xl font-bold text-gray-900 ml-auto">Cadastro da clínica</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">
                Nome da clínica
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name')(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">CNPJ</label>
              <input
                type="text"
                required
                value={form.cnpj}
                onChange={(e) => handleChange('cnpj')(e.target.value)}
                disabled={hasExistingClinic}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none ${
                  hasExistingClinic ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''
                }`}
                title={hasExistingClinic ? 'CNPJ não pode ser alterado após o cadastro inicial.' : ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone')(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-[1fr_3fr] gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Estado <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => handleChange('state')(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none uppercase"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => handleChange('city')(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600 mb-2 block">Endereço</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address')(e.target.value)}
                placeholder="Opcional"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-oasis-blue focus:ring-oasis-blue"
            />
            <span>
              Declaro que as informações acima são verdadeiras e autorizo o uso desses dados para o registro da clínica
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-white bg-oasis-blue hover:bg-oasis-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition shadow-strong"
          >
            {isSubmitting ? 'Processando...' : 'Confirmar'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ClinicSignup;

