import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DoctorProfile } from '../types/auth';

interface DoctorSignProps {
  onComplete: (profile: DoctorProfile) => void;
}

const DoctorSign: React.FC<DoctorSignProps> = ({ onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [crm, setCrm] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [treatment, setTreatment] = useState<string>(''); // "Dr.", "Dra.", "Sr.", "Sra." ou ""
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingDoctor, setHasExistingDoctor] = useState(false); // Track if editing existing doctor
  const navigate = useNavigate();
  const location = useLocation();

  // Carregar dados existentes do médico ao montar / ao clicar em "Editar"
  useEffect(() => {
    const loadDoctorData = async () => {
      try {
        const storedDoctor = localStorage.getItem('oasis_doctor_profile');
        if (!storedDoctor) {
          console.log('[DoctorSign] Nenhum médico encontrado no localStorage');
          return;
        }

        const doctor = JSON.parse(storedDoctor) as DoctorProfile;
        console.log('[DoctorSign] Médico encontrado no localStorage:', doctor);

        const doctorCode = doctor.doctorCode;

        // Se tiver doctorCode, tentar buscar o dado mais recente do backend
        if (doctorCode) {
          console.log('[DoctorSign] Buscando dados atualizados do banco usando doctorCode:', doctorCode);

          try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

            // Tenta pegar ID Token (se já houver login)
            const { fetchAuthSession } = await import('aws-amplify/auth');
            let idToken: string | undefined;
            try {
              const session = await fetchAuthSession();
              idToken = session.tokens?.idToken?.toString();
            } catch {
              console.log('[DoctorSign] Token não disponível (signup inicial)');
            }

            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (idToken) {
              headers['Authorization'] = `Bearer ${idToken}`;
            }

            const res = await fetch(`${apiBaseUrl}/doctors/${doctorCode}`, {
              method: 'GET',
              headers,
            });

            if (res.ok) {
              const dbData = await res.json();
              console.log('[DoctorSign] Dados atualizados do banco:', dbData);

              const firstNameValue = dbData.firstName || dbData.first_name || '';
              const lastNameValue = dbData.lastName || dbData.last_name || '';
              const crmValue = dbData.crm || '';
              const emailValue = dbData.email || '';
              const specialtyValue = dbData.specialty || '';
              const phoneValue = dbData.phone || '';
              const treatmentValue = dbData.treatment || '';

              setFirstName(firstNameValue);
              setLastName(lastNameValue);
              setCrm(crmValue);
              setEmail(emailValue);
              setSpecialty(specialtyValue);
              setPhone(phoneValue);
              setTreatment(treatmentValue);
              setAccepted(true);
              setHasExistingDoctor(true); // Mark as editing existing doctor

              const updatedDoctor: DoctorProfile = {
                doctorId: dbData.id,
                doctorCode: dbData.doctor_code || dbData.doctorCode,
                crm: crmValue,
                treatment: treatmentValue,
                firstName: firstNameValue,
                lastName: lastNameValue,
                email: emailValue,
                specialty: specialtyValue,
                phone: phoneValue,
              };
              localStorage.setItem('oasis_doctor_profile', JSON.stringify(updatedDoctor));
              console.log('[DoctorSign] localStorage atualizado:', updatedDoctor);
              return;
            } else {
              const errorText = await res.text();
              console.warn(
                '[DoctorSign] Não foi possível buscar do banco. Status:',
                res.status,
                'Response:',
                errorText,
              );
              // Continua com dados do localStorage
            }
          } catch (fetchError) {
            console.error('[DoctorSign] Erro ao buscar do banco:', fetchError);
            console.log('[DoctorSign] Usando dados do localStorage como fallback');
          }
        }

        // Fallback: usar apenas dados do localStorage
        console.log('[DoctorSign] Carregando dados do localStorage (fallback):', doctor);

        const firstNameValue = (doctor as any).firstName || (doctor as any).first_name || '';
        const lastNameValue = (doctor as any).lastName || (doctor as any).last_name || '';
        const crmValue = doctor.crm || '';
        const emailValue = doctor.email || '';
        const specialtyValue = doctor.specialty || '';
        const phoneValue = doctor.phone || '';
        const treatmentValue = doctor.treatment || '';

        setFirstName(firstNameValue);
        setLastName(lastNameValue);
        setCrm(crmValue);
        setEmail(emailValue);
        setSpecialty(specialtyValue);
        setPhone(phoneValue);
        setTreatment(treatmentValue);

        if (doctor.doctorId || (doctor as any).id || doctor.doctorCode) {
          setAccepted(true);
          setHasExistingDoctor(true); // Mark as editing existing doctor
        }

        console.log('[DoctorSign] Estados setados do localStorage');
      } catch (error) {
        console.error('[DoctorSign] Erro ao carregar dados do médico:', error);
      }
    };

    loadDoctorData();
  }, [location.pathname]);

  // Debug dos estados
  useEffect(() => {
    console.log('[DoctorSign] Estados atuais:', {
      firstName,
      lastName,
      crm,
      email,
      specialty,
      phone,
      treatment,
      accepted,
    });
  }, [firstName, lastName, crm, email, specialty, phone, treatment, accepted]);

  const validate = () => {
    if (!firstName || !lastName) {
      setError('Informe nome e sobrenome.');
      return false;
    }
    if (!crm.trim()) {
      setError('Informe o CRM utilizado no Cognito.');
      return false;
    }
    if (!email.includes('@')) {
      setError('Informe um e-mail válido.');
      return false;
    }
    if (!accepted) {
      setError('Você precisa concordar com os termos.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // Apenas para log / contexto de "edição", backend faz upsert por CRM
      const storedDoctor = localStorage.getItem('oasis_doctor_profile');
      let existingDoctorCode: string | null = null;

      if (storedDoctor) {
        try {
          const doctor = JSON.parse(storedDoctor) as DoctorProfile;
          existingDoctorCode = doctor.doctorCode || null;
          console.log('[DoctorSign] Médico existente encontrado, Code:', existingDoctorCode);
        } catch (err) {
          console.warn('[DoctorSign] Erro ao parsear médico existente:', err);
        }
      }

      // API expects camelCase (backend converts to snake_case for database)
      const payload = {
        crm: crm.trim().toUpperCase(),
        firstName: firstName.trim(),  // API expects camelCase
        lastName: lastName.trim(),    // API expects camelCase
        treatment: treatment.trim() || '',
        specialty: specialty.trim() || '',
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '',
      };

      console.log('[DoctorSign] Enviando payload:', payload);
      console.log('[DoctorSign] É edição?', !!existingDoctorCode);

      // Durante desenvolvimento, usar /api (proxy do Vite) para evitar CORS
      // Em produção, usar VITE_API_BASE_URL se definido
      const apiBaseUrl = import.meta.env.DEV 
        ? '/api' 
        : (import.meta.env.VITE_API_BASE_URL || '/api');

      // Always use POST /doctors/register – backend does upsert by CRM
      const url = `${apiBaseUrl}/doctors/register`;
      const method: 'POST' = 'POST';
      
      console.log('[DoctorSign] API Base URL:', apiBaseUrl);
      console.log('[DoctorSign] URL completa:', url);
      console.log('[DoctorSign] Modo desenvolvimento:', import.meta.env.DEV);

      // Token (se existir) – opcional; backend não depende dele para esse endpoint
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (idToken) {
          headers = {
            ...headers,
            Authorization: `Bearer ${idToken}`,
          };
        }
      } catch {
        console.log('[DoctorSign] Nenhum token encontrado (provavelmente antes do login)');
      }

      console.log('[DoctorSign] Fazendo requisição:', {
        url,
        method,
        headers,
        payload,
      });

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(payload),
        });
      } catch (fetchError: any) {
        console.error('[DoctorSign] Erro na requisição fetch:', fetchError);
        
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

      console.log('[DoctorSign] Status da resposta:', res.status);
      console.log('[DoctorSign] Headers da resposta:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch (e) {
          console.warn('[DoctorSign] Não foi possível ler o corpo da resposta de erro');
        }
        
        console.error('[DoctorSign] Erro da resposta:', {
          status: res.status,
          statusText: res.statusText,
          body: errText,
        });
        
        let err: any = { message: errText || res.statusText };
        try {
          if (errText) {
            err = JSON.parse(errText);
          }
        } catch {
          // Já temos a mensagem de erro
        }

        if (res.status === 409) {
          setError('CRM ou e-mail já cadastrado. Verifique os dados informados.');
        } else if (res.status === 0) {
          // Status 0 geralmente indica erro de CORS
          setError('Erro de CORS: O servidor não está permitindo requisições desta origem. Contate o administrador.');
        } else {
          setError(err?.message || `Erro ao registrar médico (Status: ${res.status})`);
        }

        setIsSubmitting(false);
        return;
      }

      // Processar resposta (sempre POST, backend faz upsert por CRM)
      const responseText = await res.text();
      console.log('[DoctorSign] Resposta completa (texto):', responseText);
      
      let doctorData: any;
      try {
        doctorData = JSON.parse(responseText);
        console.log('[DoctorSign] Resposta parseada:', doctorData);
      } catch (e) {
        console.error('[DoctorSign] Erro ao parsear JSON:', e);
        console.error('[DoctorSign] Resposta que falhou:', responseText);
        setError('Resposta inválida do servidor');
        setIsSubmitting(false);
        return;
      }

      // doctorData vem do backend com: id, doctor_code, crm, first_name, last_name, ...
      const doctorProfile: DoctorProfile = {
        id: doctorData.id || doctorData.doctorId,
        doctorId: doctorData.id || doctorData.doctorId,
        doctorCode: doctorData.doctor_code || doctorData.doctorCode,
        crm: doctorData.crm,
        firstName: doctorData.first_name || doctorData.firstName,
        lastName: doctorData.last_name || doctorData.lastName,
        email: doctorData.email,
        specialty: doctorData.specialty || '',
        phone: doctorData.phone || '',
        treatment: doctorData.treatment || '',
      };

      console.log('[DoctorSign] Perfil do médico final (salvando no localStorage):', doctorProfile);

      localStorage.setItem('oasis_doctor_profile', JSON.stringify(doctorProfile));
      if (doctorProfile.doctorCode) {
        localStorage.setItem('oasis_doctor_code', doctorProfile.doctorCode);
      }
      if (doctorProfile.id || doctorProfile.doctorId) {
        const doctorId = doctorProfile.id || doctorProfile.doctorId;
        if (doctorId) {
          localStorage.setItem('oasis_doctor_id', String(doctorId));
        }
      }

      onComplete(doctorProfile);
      setIsSubmitting(false);
      navigate('/signup', { state: { doctorReady: true } });
    } catch (err: any) {
      console.error('[DoctorSign] Erro no submit:', err);
      
      // Tratamento específico para diferentes tipos de erro
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        setError(
          'Erro de conexão com o servidor. Verifique sua conexão com a internet e se o servidor está online.'
        );
      } else if (err?.message) {
        setError(`Erro: ${err.message}`);
      } else {
        setError('Erro ao registrar médico. Tente novamente.');
      }
      
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
          <h1 className="text-4xl font-bold text-gray-900 ml-auto">Cadastro do(a) médico(a)</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Nome</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Sobrenome</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">CRM</label>
              <input
                type="text"
                value={crm}
                onChange={(e) => setCrm(e.target.value.toUpperCase())}
                disabled={hasExistingDoctor}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none uppercase ${
                  hasExistingDoctor ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                }`}
                title={hasExistingDoctor ? 'CRM não pode ser alterado após o cadastro' : ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Especialidade</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Tratamento</label>
              <select
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-oasis-blue/40 outline-none"
              >
                <option value="">Nenhum</option>
                <option value="Dr.">Dr.</option>
                <option value="Dra.">Dra.</option>
                <option value="Sr.">Sr.</option>
                <option value="Sra.">Sra.</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-oasis-blue focus:ring-oasis-blue"
            />
            <span>
              Declaro que sou o titular do CRM fornecido acima e autorizo o uso desses dados
              para o registro do perfil médico
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-white bg-oasis-blue hover:bg-oasis-blue-dark disabled:opacity-50 transition shadow-strong"
          >
            {isSubmitting ? 'Validando...' : 'Confirmar'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default DoctorSign;
