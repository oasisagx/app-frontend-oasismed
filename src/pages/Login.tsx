import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../auth';
import { extractUserInfo } from '../lib/jwtUtils';
import type { AuthUser } from './SignUp';
import { clearSignupData } from './SignUp';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [clinicId, setClinicId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { refreshContext } = useAuth();
  const invalidMessage = 'Credenciais inválidas, verifique novamente.';

  const handleLogin = async () => {
    setError('');
    
    // Validate clinic ID is 6 digits
    const clinicIdDigits = clinicId.trim().replace(/\D/g, '');
    if (clinicIdDigits.length !== 6) {
      setError(invalidMessage);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError(invalidMessage);
      return;
    }

    try {
      const { idToken } = await loginUser({
        clinicCode: clinicIdDigits,
        username: username.trim(),
        password: password,
      });

      console.log('Login OK. ID Token:', idToken);

      // Extract user info from JWT token
      const userInfo = extractUserInfo(idToken);
      const customAttrs = userInfo.customAttributes || {};

      // Fetch clinic name from API if needed (optional)
      // const res = await fetch(`${API_BASE_URL}/clinics/${customAttrs.clinic_id}`, {
      //   headers: { Authorization: `Bearer ${idToken}` },
      // });
      // const clinicData = await res.json();

      // Buscar dados reais do banco
      let clinicName = '';
      let doctorTreatment = '';
      
      // Buscar nome da clínica usando clinic_code
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
          console.warn('[Login] Erro ao buscar nome da clínica:', err);
        }
      }
      
      // Buscar tratamento do médico
      if (customAttrs.doctor_id) {
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
          const doctorRes = await fetch(`${apiBaseUrl}/doctors/${customAttrs.doctor_id}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (doctorRes.ok) {
            const doctorData = await doctorRes.json();
            doctorTreatment = doctorData.treatment || '';
          }
        } catch (err) {
          console.warn('[Login] Erro ao buscar tratamento do médico:', err);
        }
      }

      // Fetch user context from backend (single source of truth)
      // Don't block login if this fails - it can be retried later
      try {
        await refreshContext();
      } catch (contextError) {
        console.warn('[Login] Erro ao atualizar contexto do usuário (não bloqueante):', contextError);
        // Continue with login even if context refresh fails
      }

      // Clear MedChat state from sessionStorage on login to start fresh
      try {
        sessionStorage.removeItem('medchat_state');
        console.log('[Login] MedChat state cleared from sessionStorage');
      } catch (err) {
        console.warn('[Login] Error clearing MedChat state:', err);
      }

      // Extract user info from token (for backward compatibility)
      onLogin({
        clinicId: customAttrs.clinic_code || clinicIdDigits,
        clinicName: clinicName, // Apenas o nome real do banco, sem fallback para código
        doctorId: customAttrs.doctor_id || username.trim(),
        doctorName: userInfo.name || username.trim(),
        doctorTreatment: doctorTreatment,
      });
    } catch (err: any) {
      console.error(err);
      setError('Erro ao fazer login');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-oasis-blue/30 via-gray-100 to-oasis-blue/25 px-4">
      <div className="relative z-10 max-w-md mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white p-8 rounded-2xl shadow-strong border border-gray-200/80">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acesse sua conta</h2>
          
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                ID da clínica
              </label>
              <input
                type="text"
                placeholder="ID de 6 dígitos da clínica"
                value={clinicId}
                onChange={(e) => {
                  // Only allow digits and limit to 6 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setClinicId(value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Usuário</label>
              <input
                type="text"
                placeholder="Seu usuário nesta clínica"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Senha</label>
              <input
                type="password"
                placeholder="Sua senha de acesso nesta clínica"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-oasis-blue/50 transition-all"
              />
            </div>
            
            {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}

            <button
              onClick={handleLogin}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-oasis-blue hover:bg-oasis-blue-dark text-white font-semibold rounded-lg transition-all duration-300 font-body text-base shadow-medium hover:shadow-strong transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                clearSignupData();
                navigate('/signup');
              }}
              className="w-full text-sm font-medium text-oasis-blue hover:text-oasis-blue-dark mt-3"
            >
              Não possui cadastro? Cadastre-se aqui
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

