import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, UserPlus, Stethoscope } from 'lucide-react';
import { Button } from './ui/button';
import Modal, { ModalHeader, ModalContent } from './ui/Modal';
import { useOverlay } from '../context/OverlayContext';
import { PatientPop } from './PatientPop';
import { ClinicPop } from './ClinicPop';
import { DoctorPop } from './DoctorPop';
import { fetchAuthSession } from 'aws-amplify/auth';
import { extractCustomAttributes } from '../lib/jwtUtils';

interface TopBarProps {
  doctorName?: string;
  clinicName?: string;
  doctorTreatment?: string;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ doctorName: _doctorName, clinicName, doctorTreatment, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Load clinic name immediately from localStorage (synchronous, no lag)
  const getInitialClinicName = () => {
    // First check prop
    if (clinicName) return clinicName;
    
    // Then check localStorage synchronously
    try {
      const storedClinicProfile = localStorage.getItem('oasis_clinic_profile');
      if (storedClinicProfile) {
        const clinicProfile = JSON.parse(storedClinicProfile);
        if (clinicProfile.name) {
          return clinicProfile.name;
        }
      }
    } catch (error) {
      console.warn('[TopBar] Erro ao carregar nome da clínica do localStorage:', error);
    }
    
    return '';
  };

  // Load doctor data immediately from localStorage (synchronous, no lag)
  const getInitialDoctorData = () => {
    try {
      const storedDoctor = localStorage.getItem('oasis_doctor_profile');
      console.log('[TopBar] getInitialDoctorData - localStorage value:', storedDoctor ? 'exists' : 'empty');
      if (storedDoctor) {
        const doctorProfile = JSON.parse(storedDoctor);
        console.log('[TopBar] getInitialDoctorData - parsed profile:', doctorProfile);
        const firstName = doctorProfile.firstName || doctorProfile.first_name || '';
        const treatment = doctorProfile.treatment || '';
        let treatmentState: 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' | 'Nenhum' = 'Nenhum';
        if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
          treatmentState = treatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.';
        } else if (doctorTreatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(doctorTreatment)) {
          treatmentState = doctorTreatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.';
        }
        console.log('[TopBar] getInitialDoctorData - returning:', { firstName, treatmentState });
        return { firstName, treatmentState };
      }
    } catch (error) {
      console.warn('[TopBar] Erro ao carregar dados do médico do localStorage:', error);
    }
    // Fallback to prop if available
    const treatmentState = (doctorTreatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(doctorTreatment)) 
      ? doctorTreatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' 
      : 'Nenhum';
    console.log('[TopBar] getInitialDoctorData - no localStorage, returning fallback:', { firstName: '', treatmentState });
    return { firstName: '', treatmentState };
  };

  // Carregar dados reais do localStorage/API
  const [clinicNameState, setClinicNameState] = useState(getInitialClinicName);
  const initialDoctorData = getInitialDoctorData();
  const [doctorFirstName, setDoctorFirstName] = useState(initialDoctorData.firstName);
  const [doctorTreatmentState, setDoctorTreatmentState] = useState<'Dr.' | 'Dra.' | 'Sr.' | 'Sra.' | 'Nenhum'>(initialDoctorData.treatmentState);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const { registerOverlay, unregisterOverlay } = useOverlay();

  // Function to load doctor data from localStorage
  const loadDoctorData = useCallback(() => {
    try {
      const storedDoctor = localStorage.getItem('oasis_doctor_profile');
      if (storedDoctor) {
        const doctorProfile = JSON.parse(storedDoctor);
        const firstName = doctorProfile.firstName || doctorProfile.first_name || '';
        const treatment = doctorProfile.treatment || '';
        
        console.log('[TopBar] Loading doctor data from localStorage:', { firstName, treatment, doctorProfile });
        
        if (firstName) {
          setDoctorFirstName(firstName);
        }
        
        if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
          setDoctorTreatmentState(treatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.');
        } else if (treatment === '' || !treatment) {
          // Only set to 'Nenhum' if treatment is explicitly empty, don't overwrite if it's already set
          // This preserves the initial state if localStorage doesn't have treatment
        }
      } else {
        console.log('[TopBar] No doctor profile found in localStorage');
      }
    } catch (error) {
      console.error('[TopBar] Erro ao carregar dados do médico:', error);
    }
  }, []);

  // Carregar dados do médico do localStorage quando montar (only if not already loaded)
  useEffect(() => {
    // Only reload if we don't have firstName yet (initial load might have failed)
    if (!doctorFirstName) {
      console.log('[TopBar] Initial load had no firstName, trying to load from localStorage');
      loadDoctorData();
    } else {
      console.log('[TopBar] Doctor data already loaded on initial render:', { doctorFirstName, doctorTreatmentState });
    }
  }, [loadDoctorData, doctorFirstName]);

  // Reload doctor data when profile modal closes (in case it was updated)
  useEffect(() => {
    if (!showProfileModal) {
      // Small delay to ensure localStorage is updated
      const timer = setTimeout(() => {
        loadDoctorData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showProfileModal, loadDoctorData]);

  // Listen for storage changes (in case localStorage is updated from another component)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'oasis_doctor_profile') {
        loadDoctorData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDoctorData]);

  // Listen for custom event when doctor profile is updated
  useEffect(() => {
    const handleProfileUpdate = () => {
      loadDoctorData();
    };
    
    window.addEventListener('doctorProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('doctorProfileUpdated', handleProfileUpdate);
  }, [loadDoctorData]);

  // Carregar nome da clínica do banco quando montar (atualizar se necessário)
  // Nota: O nome já foi carregado do localStorage sincronamente acima, então isso é apenas para atualização
  useEffect(() => {
    const loadClinicName = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (!idToken) {
          console.warn('[TopBar] Nenhum token encontrado, usando nome do localStorage');
          return;
        }

        const customAttrs = extractCustomAttributes(idToken);
        const clinicCodeFromToken = customAttrs.clinic_code;

        if (!clinicCodeFromToken) {
          console.warn('[TopBar] clinic_code não encontrado no token, usando nome do localStorage');
          return;
        }

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
          // Database uses clinic_name (snake_case)
          // Backend uses map_clinic_response() which converts clinic_name → name
          const clinicName = clinicData.name || clinicData.clinic_name;
          console.log('[TopBar] Nome da clínica atualizado do banco:', clinicName);
          if (clinicName) {
            setClinicNameState(clinicName);
            // Also update localStorage for next time
            try {
              const storedClinicProfile = localStorage.getItem('oasis_clinic_profile');
              if (storedClinicProfile) {
                const clinicProfile = JSON.parse(storedClinicProfile);
                clinicProfile.name = clinicName;
                localStorage.setItem('oasis_clinic_profile', JSON.stringify(clinicProfile));
              }
            } catch (localStorageError) {
              console.warn('[TopBar] Erro ao atualizar localStorage:', localStorageError);
            }
          }
        } else {
          console.warn('[TopBar] Erro ao buscar nome da clínica do banco, usando do localStorage');
        }
      } catch (error) {
        console.warn('[TopBar] Erro ao carregar nome da clínica do banco, usando do localStorage:', error);
      }
    };

    loadClinicName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Atualizar clinicName quando prop mudar
  useEffect(() => {
    if (clinicName) {
      setClinicNameState(clinicName);
    }
  }, [clinicName]);
  
  // Atualizar doctorTreatment quando prop mudar
  useEffect(() => {
    if (doctorTreatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(doctorTreatment)) {
      setDoctorTreatmentState(doctorTreatment as 'Dr.' | 'Dra.' | 'Sr.' | 'Sra.');
    }
  }, [doctorTreatment]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      // Add event listener when menu is open
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // Remove event listener when menu closes or component unmounts
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setShowMenu(false);
    onLogout();
  };

  // Track overlays for global dimming
  useEffect(() => {
    if (!showLogoutConfirm) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [showLogoutConfirm, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showHelpModal) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showHelpModal, registerOverlay, unregisterOverlay]);

  return (
    <div className="h-14 px-6 flex items-center justify-between bg-slate-50 relative">
      {/* Right side - controls */}
      <div className="flex items-center space-x-2 ml-auto relative" ref={profileRef}>
        <button
          className="flex items-center space-x-2 p-2.5 hover:bg-white rounded-lg transition-colors group cursor-pointer"
          aria-label="Selecionar pacientes"
          onClick={() => setShowPatientModal(true)}
        >
          <UserPlus className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
          <span className="text-sm text-slate-700 font-medium hidden sm:inline">
            Pacientes
          </span>
        </button>

        {/* Clinic button */}
        <button
          className="flex items-center space-x-2 p-2.5 hover:bg-white rounded-lg transition-colors group cursor-pointer"
          aria-label="Dados da clínica"
          onClick={() => setShowClinicModal(true)}
        >
          <span className="text-lg text-slate-500 group-hover:text-slate-700" aria-hidden="true">
            ✚
          </span>
          <span className="text-sm text-slate-700 font-medium hidden sm:inline">
            {clinicNameState}
          </span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <button 
          className="flex items-center space-x-2 p-2.5 hover:bg-white rounded-lg transition-colors group cursor-pointer"
          aria-label="User profile"
          onClick={() => setShowMenu((prev) => !prev)}
        >
          <div className="w-7 h-7 bg-oasis-blue rounded-full flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          {doctorFirstName && (
            <span className="text-sm text-slate-700 font-medium">
              {doctorTreatmentState !== 'Nenhum' ? `${doctorTreatmentState} ${doctorFirstName}` : doctorFirstName}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-12 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-40">
            <button
              className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              onClick={() => {
                setShowProfileModal(true);
                setShowMenu(false);
              }}
            >
              <span className="font-semibold">Perfil</span>
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              onClick={() => {
                setShowHelpModal(true);
                setShowMenu(false);
              }}
            >
              <span className="font-semibold">Suporte</span>
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowLogoutConfirm(false);
            setShowMenu(false);
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Deseja sair?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Você se desconectará da sessão atual.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    setShowMenu(false);
                  }}
                  className="border-oasis-blue text-oasis-blue hover:bg-oasis-blue-50 hover:text-oasis-blue-600"
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirmLogout}>
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        className="max-w-md mx-4"
      >
        <ModalHeader>Suporte</ModalHeader>
        <ModalContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Em caso de dúvida ou necessidade de suporte, entre em contato conosco pelo e-mail:
          </p>
          <p className="text-base font-semibold text-slate-900">hello@oasisagx.com</p>
        </ModalContent>
      </Modal>

      {/* Patient Popup */}
      <PatientPop
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onOpenEdit={() => setShowPatientModal(true)}
      />

      {/* Clinic Popup */}
      <ClinicPop
        isOpen={showClinicModal}
        onClose={() => setShowClinicModal(false)}
        clinicNameState={clinicNameState}
        setClinicNameState={setClinicNameState}
      />

      {/* Doctor Popup */}
      <DoctorPop
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        doctorFirstName={doctorFirstName}
        setDoctorFirstName={setDoctorFirstName}
        doctorTreatmentState={doctorTreatmentState}
        setDoctorTreatmentState={setDoctorTreatmentState}
      />
    </div>
  );
};

export default TopBar;
