import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import Modal, { ModalHeader, ModalContent } from './ui/Modal';
import { useOverlay } from '../context/OverlayContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import { extractCustomAttributes } from '../lib/jwtUtils';

interface ClinicPopProps {
  isOpen: boolean;
  onClose: () => void;
  clinicNameState: string;
  setClinicNameState: (name: string) => void;
}

const BRAZIL_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',];

export const ClinicPop: React.FC<ClinicPopProps> = ({ isOpen, onClose, clinicNameState, setClinicNameState }) => {
  const [isEditingClinicName, setIsEditingClinicName] = useState(false);
  const [clinicNameError, setClinicNameError] = useState('');
  const [clinicCode, setClinicCode] = useState('');
  const [clinicCnpj, setClinicCnpj] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicPhoneError, setClinicPhoneError] = useState('');
  const [clinicState, setClinicState] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicAddressError, setClinicAddressError] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isLoadingClinic, setIsLoadingClinic] = useState(false);
  const [showClinicConfirm, setShowClinicConfirm] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement | null>(null);

  const { registerOverlay, unregisterOverlay } = useOverlay();

  useEffect(() => {
    if (!isOpen) {
      setClinicNameError('');
      setClinicPhoneError('');
      setClinicAddressError('');
      setIsEditingClinicName(false);
      setIsStateDropdownOpen(false);
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
    if (!showClinicConfirm) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showClinicConfirm, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!isEditingClinicName) {
      setIsStateDropdownOpen(false);
    }
  }, [isEditingClinicName]);

  // Buscar dados da clínica do banco quando o componente monta e quando o modal abrir
  const loadClinicData = async () => {
    setIsLoadingClinic(true);
    
    // First, try to load from localStorage as fallback
    try {
      const storedClinicProfile = localStorage.getItem('oasis_clinic_profile');
      if (storedClinicProfile) {
        const clinicProfile = JSON.parse(storedClinicProfile);
        console.log('[ClinicPop] Dados da clínica encontrados no localStorage:', clinicProfile);
        
        // Set initial values from localStorage
        // Database uses snake_case - prioritize snake_case, fallback to camelCase
        setClinicCode(clinicProfile.clinicCode || clinicProfile.clinic_code || '');
        setClinicCnpj(clinicProfile.cnpj || '');
        setClinicNameState(clinicProfile.name || '');  // Note: localStorage may have 'name', DB has 'clinic_name'
        setClinicPhone(clinicProfile.phone || '');
        setClinicState(clinicProfile.state || '');
        setClinicCity(clinicProfile.city || '');
        setClinicAddress(clinicProfile.address || '');
      }
    } catch (error) {
      console.warn('[ClinicPop] Erro ao carregar dados do localStorage:', error);
    }
    
    // Then try to fetch from API for up-to-date data
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        console.warn('[ClinicPop] Nenhum token encontrado, usando dados do localStorage');
        setIsLoadingClinic(false);
        return;
      }

      const customAttrs = extractCustomAttributes(idToken);
      const clinicCodeFromToken = customAttrs.clinic_code;

      if (!clinicCodeFromToken) {
        console.warn('[ClinicPop] clinic_code não encontrado no token, usando dados do localStorage');
        setIsLoadingClinic(false);
        return;
      }

      console.log('[ClinicPop] Buscando dados da clínica usando clinic_code:', clinicCodeFromToken);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${apiBaseUrl}/clinics/${clinicCodeFromToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const clinicData = await res.json();
        console.log('[ClinicPop] Dados da clínica carregados do banco:', clinicData);

        // Backend uses map_clinic_response() which converts snake_case to camelCase
        setClinicCode(clinicData.clinic_code || clinicData.clinicCode || '');
        setClinicCnpj(clinicData.cnpj || '');
        setClinicNameState(clinicData.name || clinicData.clinic_name || '');  // Backend maps clinic_name → name
        setClinicPhone(clinicData.phone || '');
        setClinicState(clinicData.state || clinicData.state_province || '');  // Backend maps state_province → state
        setClinicCity(clinicData.city || '');
        setClinicAddress(clinicData.address || clinicData.clinic_address || '');  // Backend maps clinic_address → address
        
        // Also update localStorage with fresh data
        const clinicProfile = {
          id: clinicData.id || clinicData.clinic_id || clinicData.clinicId,
          clinicId: clinicData.id || clinicData.clinic_id || clinicData.clinicId,
          clinicCode: clinicData.clinic_code || clinicData.clinicCode,
          // Backend uses map_clinic_response() which converts snake_case to camelCase
          name: clinicData.name || clinicData.clinic_name || '',  // Backend maps clinic_name → name
          cnpj: clinicData.cnpj || '',
          phone: clinicData.phone || '',
          state: clinicData.state || clinicData.state_province || '',  // Backend maps state_province → state
          city: clinicData.city || '',
          address: clinicData.address || clinicData.clinic_address || '',  // Backend maps clinic_address → address
        };
        localStorage.setItem('oasis_clinic_profile', JSON.stringify(clinicProfile));
        console.log('[ClinicPop] Dados atualizados no localStorage');
      } else {
        console.warn('[ClinicPop] Erro ao buscar dados da clínica do banco:', res.status, 'usando dados do localStorage');
      }
    } catch (error) {
      console.warn('[ClinicPop] Erro ao carregar dados da clínica do banco:', error, 'usando dados do localStorage');
    } finally {
      setIsLoadingClinic(false);
    }
  };

  // Carregar dados da clínica quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadClinicData();
    }
  }, [isOpen]);

  // Helper function to save clinic data
  const handleSaveClinic = async () => {
    const trimmed = clinicNameState.trim();
    const normalized = trimmed
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    setClinicNameState(normalized);
    setClinicNameError('');
    setClinicPhoneError('');
    setClinicAddressError('');
    setIsEditingClinicName(false);
    setShowClinicConfirm(false);

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        console.error('[ClinicPop] Nenhum token encontrado para salvar');
        return;
      }

      const customAttrs = extractCustomAttributes(idToken);
      const clinicCodeFromToken = customAttrs.clinic_code;

      if (!clinicCodeFromToken) {
        console.error('[ClinicPop] clinic_code não encontrado no token');
        return;
      }

      // API expects camelCase (backend converts to snake_case for database)
      const payload: any = {
        name: normalized,  // API expects camelCase (converts to clinic_name in DB)
        phone: clinicPhone.trim() || undefined,
        state: clinicState.trim() || undefined,  // API expects camelCase (converts to state_province in DB)
        city: clinicCity.trim() || undefined,
        address: clinicAddress.trim() || undefined,  // API expects camelCase (converts to clinic_address in DB)
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('[ClinicPop] Salvando dados da clínica:', payload);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${apiBaseUrl}/clinics/${clinicCodeFromToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedData = await res.json();
        console.log('[ClinicPop] Clínica atualizada com sucesso:', updatedData);
        
        // Backend uses map_clinic_response() which converts snake_case to camelCase
        setClinicNameState(updatedData.name || updatedData.clinic_name || normalized);  // Backend maps clinic_name → name
        setClinicPhone(updatedData.phone || '');
        setClinicState(updatedData.state || updatedData.state_province || '');  // Backend maps state_province → state
        setClinicCity(updatedData.city || '');
        setClinicAddress(updatedData.address || updatedData.clinic_address || '');  // Backend maps clinic_address → address
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('[ClinicPop] Erro ao salvar clínica:', errorData);
        setClinicNameError(errorData.message || 'Erro ao salvar dados da clínica');
      }
    } catch (error) {
      console.error('[ClinicPop] Erro ao salvar dados da clínica:', error);
      setClinicNameError('Erro ao salvar dados da clínica');
    }
  };

  return (
    <>
      {/* Clinic data modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-md mx-4"
        disableClose={isEditingClinicName}
        closeWarning="Confirme a edição antes de fechar"
      >
        <ModalHeader>Dados da clínica</ModalHeader>
        <ModalContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">ID da clínica</label>
            <input
              type="text"
              value={isLoadingClinic ? 'Carregando...' : clinicCode}
              readOnly
              aria-readonly="true"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-default"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">CNPJ</label>
            <input
              type="text"
              value={isLoadingClinic ? 'Carregando...' : clinicCnpj}
              readOnly
              aria-readonly="true"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-default"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Nome da clínica</label>
            <input
              type="text"
              value={clinicNameState}
              readOnly={!isEditingClinicName}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(e) => {
                if (!isEditingClinicName) return;
                setClinicNameState(e.target.value);
                if (clinicNameError) setClinicNameError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                isEditingClinicName
                  ? clinicNameError
                    ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
              }`}
            />
            {clinicNameError && (
              <p className="text-xs text-red-500 mt-1">{clinicNameError}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Telefone</label>
            <input
              type="tel"
              value={clinicPhone}
              readOnly={!isEditingClinicName}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(e) => {
                if (!isEditingClinicName) return;
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
                  } else if (digits.length <= 6) {
                    formatted = `(${digits.slice(0, 2)})${digits.slice(2)}`;
                  } else if (digits.length === 10) {
                    formatted = `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
                  } else if (digits.length === 11) {
                    formatted = `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
                  } else {
                    if (digits.length === 7) {
                      formatted = `(${digits.slice(0, 2)})${digits.slice(2)}`;
                    } else {
                      formatted = `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
                    }
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

                setClinicPhone(formatted);
                setClinicPhoneError('');

                requestAnimationFrame(() => {
                  if (input) {
                    input.selectionStart = newCursor;
                    input.selectionEnd = newCursor;
                  }
                });
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                isEditingClinicName
                  ? clinicPhoneError
                    ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
              }`}
            />
            {clinicPhoneError && (
              <p className="text-xs text-red-500 mt-1">{clinicPhoneError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="space-y-1 w-[3.4rem] relative" ref={stateDropdownRef}>
              <label className="text-xs font-medium text-slate-500">Estado</label>
              <button
                type="button"
                onClick={() => {
                  if (!isEditingClinicName) return;
                  setIsStateDropdownOpen((prev) => !prev);
                }}
                aria-disabled={!isEditingClinicName}
                className={`w-full px-2 py-2 border rounded-lg text-sm text-center focus:outline-none ${
                  isEditingClinicName
                    ? 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                }`}
              >
                {clinicState}
              </button>
              {isStateDropdownOpen && (
                <div className="absolute bottom-[calc(100%+0.25rem)] max-h-52 w-[4.5rem] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  <ul className="text-sm">
                    {BRAZIL_STATES.map((uf) => (
                      <li key={uf}>
                        <button
                          type="button"
                          onClick={() => {
                            setClinicState(uf);
                            setIsStateDropdownOpen(false);
                          }}
                          className={`w-full px-2 py-1 text-left hover:bg-oasis-blue/10 ${
                            clinicState === uf ? 'bg-oasis-blue/20 font-semibold text-oasis-blue' : 'text-slate-700'
                          }`}
                        >
                          {uf}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium text-slate-500">Cidade</label>
              <input
                type="text"
                value={clinicCity}
                readOnly={!isEditingClinicName}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="words"
                onChange={(e) => {
                  if (!isEditingClinicName) return;
                  setClinicCity(e.target.value);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  isEditingClinicName
                    ? 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Endereço</label>
            <input
              type="text"
              value={clinicAddress}
              readOnly={!isEditingClinicName}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(e) => {
                if (!isEditingClinicName) return;
                setClinicAddress(e.target.value);
                setClinicAddressError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                isEditingClinicName
                  ? clinicAddressError
                    ? 'bg-white border-red-500 focus:ring-2 focus:ring-red-500/40'
                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-oasis-blue/40'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
              }`}
            />
            {clinicAddressError && (
              <p className="text-xs text-red-500 mt-1">{clinicAddressError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setClinicNameError('');
                setClinicPhoneError('');
                setClinicAddressError('');
                setIsEditingClinicName(true);
              }}
              disabled={isEditingClinicName}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Editar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!isEditingClinicName) return;
                const trimmed = clinicNameState.trim();
                if (!trimmed) {
                  setClinicNameError('Nome da clínica é obrigatório');
                  return;
                }
                
                const trimmedAddress = clinicAddress.trim();
                if (!trimmedAddress) {
                  setClinicAddressError('Endereço é obrigatório');
                  return;
                }
                
                const phoneDigits = clinicPhone.replace(/\D/g, '');
                if (phoneDigits.length > 0 && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
                  setClinicPhoneError('Telefone deve ter 10 ou 11 dígitos');
                  return;
                }
                
                setShowClinicConfirm(true);
              }}
              disabled={!isEditingClinicName}
              className="bg-oasis-blue hover:bg-oasis-blue-600 text-white"
            >
              OK
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* Clinic confirmation modal */}
      {showClinicConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowClinicConfirm(false)}
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
                  onClick={() => setShowClinicConfirm(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Retornar
                </Button>
                <Button
                  onClick={handleSaveClinic}
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

