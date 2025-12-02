import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import Modal, { ModalHeader, ModalContent } from './ui/Modal';
import { useOverlay } from '../context/OverlayContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import { extractCustomAttributes, extractUserInfo } from '../lib/jwtUtils';

interface DoctorPopProps {
  isOpen: boolean;
  onClose: () => void;
  doctorFirstName: string;
  setDoctorFirstName: (name: string) => void;
  doctorTreatmentState: 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' | 'Nenhum';
  setDoctorTreatmentState: (treatment: 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' | 'Nenhum') => void;
}

export const DoctorPop: React.FC<DoctorPopProps> = ({
  isOpen,
  onClose,
  doctorFirstName,
  setDoctorFirstName,
  doctorTreatmentState,
  setDoctorTreatmentState,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [doctorLastName, setDoctorLastName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorCode, setDoctorCode] = useState('');
  const [doctorCrmState, setDoctorCrmState] = useState('');
  const [doctorCrm, setDoctorCrm] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [clinicUserUsername, setClinicUserUsername] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);

  const { registerOverlay, unregisterOverlay } = useOverlay();

  // Extract only the name from username (remove clinicCode# and any numbers/hashtags)
  const extractUsernameName = useCallback((username: string): string => {
    if (!username) return '';
    
    // If username contains '#', extract the part after it (e.g., "123456#joao" -> "joao")
    if (username.includes('#')) {
      const parts = username.split('#');
      return parts[parts.length - 1]; // Get the last part after #
    }
    
    // If no '#', return as is (might already be just the name)
    return username;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setFirstNameError('');
      setLastNameError('');
      setEmailError('');
      setPhoneError('');
      setIsEditingProfile(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [isOpen, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showProfileConfirm) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showProfileConfirm, registerOverlay, unregisterOverlay]);

  // Carregar dados do localStorage primeiro como fallback
  useEffect(() => {
    if (!isOpen) return;

    // Carregar dados do localStorage como fallback
    try {
      const storedDoctor = localStorage.getItem('oasis_doctor_profile');
      if (storedDoctor) {
        const doctorProfile = JSON.parse(storedDoctor);
        setDoctorCode(doctorProfile.doctorCode || doctorProfile.doctor_code || '');
        setDoctorFirstName(doctorProfile.firstName || doctorProfile.first_name || '');
        setDoctorLastName(doctorProfile.lastName || doctorProfile.last_name || '');
        setDoctorEmail(doctorProfile.email || '');
        setDoctorPhone(doctorProfile.phone || '');
        setDoctorSpecialty(doctorProfile.specialty || '');
        const treatment = doctorProfile.treatment || '';
        if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
          setDoctorTreatmentState(treatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.');
        }
        if (doctorProfile.crm) {
          const crmStr = String(doctorProfile.crm).toUpperCase();
          const lettersMatch = crmStr.match(/^([A-Z]{2})/);
          const letters = lettersMatch ? lettersMatch[1] : '';
          const numbers = crmStr.replace(/\D/g, '');
          setDoctorCrmState(letters);
          setDoctorCrm(numbers);
        }
      }

      const storedUserProfile = localStorage.getItem('oasis_user_profile');
      if (storedUserProfile) {
        const userProfile = JSON.parse(storedUserProfile);
        // Prefer displayName if available, otherwise extract from username
        const username = userProfile.displayName || userProfile.username || '';
        const usernameName = userProfile.displayName || extractUsernameName(username);
        if (usernameName) {
          setClinicUserUsername(usernameName);
        }
      }
    } catch (error) {
      console.error('[DoctorPop] Erro ao carregar dados do localStorage:', error);
    }
  }, [isOpen, setDoctorTreatmentState, extractUsernameName]);

  // Helper function to load username from localStorage or token
  const loadUsernameFallback = useCallback((usernameFromToken: string) => {
    // Try localStorage first
    const storedUserProfile = localStorage.getItem('oasis_user_profile');
    if (storedUserProfile) {
      try {
        const userProfile = JSON.parse(storedUserProfile);
        const username = userProfile.displayName || userProfile.username || '';
        if (username) {
          const usernameName = userProfile.displayName || extractUsernameName(username);
          if (usernameName) {
            setClinicUserUsername(usernameName);
            console.log('[DoctorPop] Username carregado do localStorage (fallback):', usernameName);
            return;
          }
        }
      } catch (error) {
        console.error('[DoctorPop] Erro ao carregar username do localStorage:', error);
      }
    }
    
    // Fallback to token
    if (usernameFromToken) {
      const usernameName = extractUsernameName(usernameFromToken);
      setClinicUserUsername(usernameName);
      console.log('[DoctorPop] Username carregado do token (fallback):', usernameName);
      
      // Save to localStorage for future use
      try {
        const existingUserProfile = storedUserProfile ? JSON.parse(storedUserProfile) : {};
        const updatedUserProfile = {
          ...existingUserProfile,
          username: usernameFromToken,
          displayName: usernameName,
        };
        localStorage.setItem('oasis_user_profile', JSON.stringify(updatedUserProfile));
      } catch (error) {
        console.error('[DoctorPop] Erro ao salvar username do token no localStorage:', error);
      }
    }
  }, [extractUsernameName]);

  // Buscar dados do médico e do usuário do banco quando o modal abrir
  useEffect(() => {
    const loadProfileData = async () => {
      if (!isOpen) return;

      setIsLoadingProfile(true);
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) {
          console.error('[DoctorPop] Nenhum token encontrado');
          setIsLoadingProfile(false);
          return;
        }

        const customAttrs = extractCustomAttributes(idToken);
        const userInfo = extractUserInfo(idToken);
        const doctorIdFromToken = customAttrs.doctor_id;
        const clinicUserIdFromToken = customAttrs.clinic_user_id;
        
        // Get username from token as fallback
        const usernameFromToken = userInfo.username || userInfo.email || '';

        if (!doctorIdFromToken) {
          console.error('[DoctorPop] doctor_id não encontrado no token');
          setIsLoadingProfile(false);
          return;
        }

        console.log('[DoctorPop] Buscando dados do médico usando doctor_id:', doctorIdFromToken);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        
        const doctorRes = await fetch(`${apiBaseUrl}/doctors/${doctorIdFromToken}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (doctorRes.ok) {
          const doctorData = await doctorRes.json();
          console.log('[DoctorPop] Dados do médico carregados:', doctorData);

          setDoctorCode(doctorData.doctor_code || '');
          setDoctorFirstName(doctorData.first_name || '');
          setDoctorLastName(doctorData.last_name || '');
          setDoctorEmail(doctorData.email || '');
          setDoctorPhone(doctorData.phone || '');
          setDoctorSpecialty(doctorData.specialty || '');
          
          const treatment = doctorData.treatment || '';
          if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
            setDoctorTreatmentState(treatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.');
          } else {
            setDoctorTreatmentState('Nenhum');
          }

          if (doctorData.crm) {
            const crmStr = String(doctorData.crm).toUpperCase();
            const lettersMatch = crmStr.match(/^([A-Z]{2})/);
            const letters = lettersMatch ? lettersMatch[1] : '';
            const numbers = crmStr.replace(/\D/g, '');
            
            setDoctorCrmState(letters);
            setDoctorCrm(numbers);
          }

          // Save to localStorage so TopBar can use it on refresh
          try {
            const storedDoctor = localStorage.getItem('oasis_doctor_profile');
            const existingProfile = storedDoctor ? JSON.parse(storedDoctor) : {};
            const updatedProfile = {
              ...existingProfile,
              firstName: doctorData.first_name || existingProfile.firstName || existingProfile.first_name,
              first_name: doctorData.first_name || existingProfile.first_name || existingProfile.firstName,
              lastName: doctorData.last_name || existingProfile.lastName || existingProfile.last_name,
              last_name: doctorData.last_name || existingProfile.last_name || existingProfile.lastName,
              email: doctorData.email || existingProfile.email,
              phone: doctorData.phone || existingProfile.phone,
              specialty: doctorData.specialty || existingProfile.specialty,
              treatment: treatment || existingProfile.treatment || '',
              crm: doctorData.crm || existingProfile.crm,
              doctorCode: doctorData.doctor_code || existingProfile.doctorCode || existingProfile.doctor_code,
              doctor_code: doctorData.doctor_code || existingProfile.doctor_code || existingProfile.doctorCode,
            };
            localStorage.setItem('oasis_doctor_profile', JSON.stringify(updatedProfile));
            console.log('[DoctorPop] localStorage atualizado com dados da API');
            
            // Dispatch custom event to notify TopBar
            window.dispatchEvent(new CustomEvent('doctorProfileUpdated'));
          } catch (error) {
            console.error('[DoctorPop] Erro ao salvar dados da API no localStorage:', error);
          }
        } else {
          console.error('[DoctorPop] Erro ao buscar dados do médico:', doctorRes.status);
        }

        // Try to fetch username from API
        if (clinicUserIdFromToken) {
          try {
            const userRes = await fetch(`${apiBaseUrl}/clinic-users/${clinicUserIdFromToken}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
            });

            if (userRes.ok) {
              const userData = await userRes.json();
              const fullUsername = userData.username || '';
              const usernameName = extractUsernameName(fullUsername);
              console.log('[DoctorPop] Username recebido da API:', fullUsername, '-> Nome extraído:', usernameName);
              setClinicUserUsername(usernameName);
              
              // Save to localStorage for future use
              try {
                const storedUserProfile = localStorage.getItem('oasis_user_profile');
                const existingUserProfile = storedUserProfile ? JSON.parse(storedUserProfile) : {};
                const updatedUserProfile = {
                  ...existingUserProfile,
                  username: fullUsername,
                  displayName: usernameName,
                };
                localStorage.setItem('oasis_user_profile', JSON.stringify(updatedUserProfile));
                console.log('[DoctorPop] Username salvo no localStorage:', usernameName);
              } catch (error) {
                console.error('[DoctorPop] Erro ao salvar username no localStorage:', error);
              }
            } else {
              console.error('[DoctorPop] Erro ao buscar dados do usuário:', userRes.status);
              // Fallback to localStorage or token
              loadUsernameFallback(usernameFromToken);
            }
          } catch (error) {
            console.error('[DoctorPop] Erro ao buscar dados do usuário:', error);
            // Fallback to localStorage or token
            loadUsernameFallback(usernameFromToken);
          }
        } else {
          console.warn('[DoctorPop] clinic_user_id não encontrado no token, usando fallback');
          // Fallback to localStorage or token
          loadUsernameFallback(usernameFromToken);
        }
      } catch (error) {
        console.error('[DoctorPop] Erro ao carregar dados do perfil:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfileData();
  }, [isOpen, setDoctorFirstName, setDoctorTreatmentState, extractUsernameName, loadUsernameFallback]);

  // Helper function to save profile data
  const handleSaveProfile = async () => {
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPhoneError('');
    setIsEditingProfile(false);
    setShowProfileConfirm(false);

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        console.error('[DoctorPop] Nenhum token encontrado para salvar');
        return;
      }

      const customAttrs = extractCustomAttributes(idToken);
      const doctorIdFromToken = customAttrs.doctor_id;

      if (!doctorIdFromToken) {
        console.error('[DoctorPop] doctor_id não encontrado no token');
        return;
      }

      const crmFull = doctorCrmState && doctorCrm ? `${doctorCrmState}${doctorCrm}` : doctorCrm || '';

      // API expects camelCase (backend converts to snake_case for database)
      const payload: any = {
        firstName: doctorFirstName.trim(),  // API expects camelCase
        lastName: doctorLastName.trim(),    // API expects camelCase
        email: doctorEmail.trim(),
        phone: doctorPhone.replace(/\D/g, '') || undefined,
        specialty: doctorSpecialty.trim() || undefined,
        treatment: doctorTreatmentState !== 'Nenhum' ? doctorTreatmentState : '',
        crm: crmFull || undefined,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('[DoctorPop] Salvando dados do médico:', payload);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${apiBaseUrl}/doctors/${doctorIdFromToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedData = await res.json();
        console.log('[DoctorPop] Médico atualizado com sucesso:', updatedData);
        
        setDoctorFirstName(updatedData.first_name || doctorFirstName);
        setDoctorLastName(updatedData.last_name || doctorLastName);
        setDoctorEmail(updatedData.email || doctorEmail);
        setDoctorPhone(updatedData.phone || doctorPhone);
        setDoctorSpecialty(updatedData.specialty || doctorSpecialty);
        
        const treatment = updatedData.treatment || '';
        if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
          setDoctorTreatmentState(treatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.');
        } else {
          setDoctorTreatmentState('Nenhum');
        }

        if (updatedData.crm) {
          const crmStr = String(updatedData.crm).toUpperCase();
          const lettersMatch = crmStr.match(/^([A-Z]{2})/);
          const letters = lettersMatch ? lettersMatch[1] : '';
          const numbers = crmStr.replace(/\D/g, '');
          
          setDoctorCrmState(letters);
          setDoctorCrm(numbers);
        }

        // Update localStorage with the new data
        try {
          const storedDoctor = localStorage.getItem('oasis_doctor_profile');
          if (storedDoctor) {
            const doctorProfile = JSON.parse(storedDoctor);
            const updatedProfile = {
              ...doctorProfile,
              firstName: updatedData.first_name || doctorProfile.firstName || doctorProfile.first_name,
              first_name: updatedData.first_name || doctorProfile.first_name || doctorProfile.firstName,
              lastName: updatedData.last_name || doctorProfile.lastName || doctorProfile.last_name,
              last_name: updatedData.last_name || doctorProfile.last_name || doctorProfile.lastName,
              email: updatedData.email || doctorProfile.email,
              phone: updatedData.phone || doctorProfile.phone,
              specialty: updatedData.specialty || doctorProfile.specialty,
              treatment: treatment || doctorProfile.treatment || '',
              crm: updatedData.crm || doctorProfile.crm,
            };
            localStorage.setItem('oasis_doctor_profile', JSON.stringify(updatedProfile));
            console.log('[DoctorPop] localStorage atualizado com sucesso');
            
            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('doctorProfileUpdated'));
          }
        } catch (error) {
          console.error('[DoctorPop] Erro ao atualizar localStorage:', error);
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('[DoctorPop] Erro ao salvar médico:', errorData);
        setFirstNameError(errorData.message || 'Erro ao salvar dados do médico');
      }
    } catch (error) {
      console.error('[DoctorPop] Erro ao salvar dados do médico:', error);
      setFirstNameError('Erro ao salvar dados do médico');
    }
  };

  return (
    <>
      {/* Profile data modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-md mx-4"
        disableClose={isEditingProfile}
        closeWarning="Confirme a edição antes de fechar"
      >
        <ModalHeader>Perfil do médico</ModalHeader>
        <ModalContent className="space-y-4">
          {isLoadingProfile ? (
            <div className="text-center py-4 text-sm text-slate-500">
              Carregando dados do perfil...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">ID do médico</label>
                  <input
                    type="text"
                    value={doctorCode}
                    readOnly
                    aria-readonly="true"
                    maxLength={8}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-default"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Usuário</label>
                  <input
                    type="text"
                    value={clinicUserUsername}
                    readOnly
                    aria-readonly="true"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-default"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Tratamento</label>
            <div className="flex items-center gap-3">
              {[
                { label: 'Dr.', value: 'Dr.' },
                { label: 'Dra.', value: 'Dra.' },
                { label: 'Sr.', value: 'Sr.' },
                { label: 'Sra.', value: 'Sra.' },
                { label: 'nenhum', value: 'Nenhum' },
              ].map((option) => {
                const selected = doctorTreatmentState === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!isEditingProfile}
                    onClick={() => {
                      if (!isEditingProfile) return;
                      setDoctorTreatmentState(option.value as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' | 'Nenhum');
                    }}
                    className={`flex items-center gap-1.5 text-xs ${
                      isEditingProfile
                        ? 'text-slate-700 hover:text-slate-900'
                        : 'text-slate-400 cursor-default'
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        selected ? 'bg-oasis-blue border-oasis-blue' : 'border-slate-300 bg-white'
                      }`}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Nome</label>
              <input
                type="text"
                value={doctorFirstName}
                readOnly={!isEditingProfile}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                onChange={(e) => {
                  if (!isEditingProfile) return;
                  setDoctorFirstName(e.target.value);
                  if (firstNameError) setFirstNameError('');
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  isEditingProfile
                    ? firstNameError
                      ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                }`}
              />
              {firstNameError && (
                <p className="text-xs text-red-500 mt-1">{firstNameError}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Sobrenome</label>
              <input
                type="text"
                value={doctorLastName}
                readOnly={!isEditingProfile}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                onChange={(e) => {
                  if (!isEditingProfile) return;
                  setDoctorLastName(e.target.value);
                  if (lastNameError) setLastNameError('');
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  isEditingProfile
                    ? lastNameError
                      ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                }`}
              />
              {lastNameError && (
                <p className="text-xs text-red-500 mt-1">{lastNameError}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">E-mail</label>
            <input
              type="email"
              value={doctorEmail}
              readOnly={!isEditingProfile}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(e) => {
                if (!isEditingProfile) return;
                setDoctorEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                isEditingProfile
                  ? emailError
                    ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
              }`}
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Telefone</label>
              <input
                type="tel"
                value={doctorPhone}
                readOnly={!isEditingProfile}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                onChange={(e) => {
                  if (!isEditingProfile) return;
                  const input = e.target;
                  const raw = input.value;
                  const cursor = input.selectionStart ?? raw.length;

                  const digits = raw.replace(/\D/g, '').slice(0, 11);

                  let digitIndex = 0;
                  for (let i = 0; i < cursor; i++) {
                    if (/\d/.test(raw[i] ?? '')) {
                      digitIndex++;
                    }
                  }

                  let formatted = '';
                  if (digits.length > 0) {
                    if (digits.length <= 2) {
                      formatted = `(${digits}`;
                    } else if (digits.length <= 7) {
                      formatted = `(${digits.slice(0, 2)})${digits.slice(2)}`;
                    } else {
                      formatted = `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
                    }
                  }

                  let newCursor = formatted.length;
                  if (digitIndex === 0) {
                    newCursor = 0;
                  } else {
                    let seen = 0;
                    for (let i = 0; i < formatted.length; i++) {
                      if (/\d/.test(formatted[i] ?? '')) {
                        seen++;
                      }
                      if (seen === digitIndex) {
                        newCursor = i + 1;
                        break;
                      }
                    }
                  }

                  setDoctorPhone(formatted);
                  if (phoneError) setPhoneError('');

                  requestAnimationFrame(() => {
                    if (input) {
                      input.selectionStart = newCursor;
                      input.selectionEnd = newCursor;
                    }
                  });
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  isEditingProfile
                    ? phoneError
                      ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                }`}
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">CRM</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={doctorCrmState}
                  readOnly
                  aria-readonly="true"
                  maxLength={2}
                  className="w-11 px-2 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 text-center cursor-default"
                  placeholder="UF"
                />
                <input
                  type="text"
                  value={doctorCrm}
                  readOnly
                  aria-readonly="true"
                  className="w-[8.75rem] px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-default"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Especialidade</label>
            <input
              type="text"
              value={doctorSpecialty}
              readOnly={!isEditingProfile}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(e) => {
                if (!isEditingProfile) return;
                setDoctorSpecialty(e.target.value);
              }}
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none ${
                isEditingProfile
                  ? 'bg-white focus:ring-2 focus:ring-oasis-blue/40'
                  : 'bg-slate-50 text-slate-400 cursor-default'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFirstNameError('');
                setLastNameError('');
                setEmailError('');
                setPhoneError('');
                setIsEditingProfile(true);
              }}
              disabled={isEditingProfile}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Editar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!isEditingProfile) return;
                const trimmedFirstName = doctorFirstName.trim();
                const trimmedLastName = doctorLastName.trim();
                const trimmedEmail = doctorEmail.trim();
                const trimmedPhone = doctorPhone.trim();
                const phoneDigits = trimmedPhone.replace(/\D/g, '');
                
                let hasError = false;
                if (!trimmedFirstName) {
                  setFirstNameError('Nome é obrigatório');
                  hasError = true;
                }
                if (!trimmedLastName) {
                  setLastNameError('Sobrenome é obrigatório');
                  hasError = true;
                }
                if (!trimmedEmail) {
                  setEmailError('E-mail é obrigatório');
                  hasError = true;
                } else if (!/.+@.+\..+/.test(trimmedEmail)) {
                  setEmailError('E-mail inválido');
                  hasError = true;
                }
                if (!trimmedPhone || phoneDigits.length === 0) {
                  setPhoneError('Telefone é obrigatório');
                  hasError = true;
                } else if (phoneDigits.length !== 11) {
                  setPhoneError('Este telefone deve ter 11 dígitos');
                  hasError = true;
                }
                
                if (hasError) return;
                
                setShowProfileConfirm(true);
              }}
              disabled={!isEditingProfile}
              className="bg-oasis-blue hover:bg-oasis-blue-600 text-white"
            >
              OK
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* Profile confirmation modal */}
      {showProfileConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowProfileConfirm(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirmar edição</h3>
              <p className="text-sm text-slate-600 mb-6">
                Deseja confirmar as edições feitas ou retornar ao editor?
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowProfileConfirm(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Retornar
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  className="bg-oasis-blue hover:bg-oasis-blue-600 text-white"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

