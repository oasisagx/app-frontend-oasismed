import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { listMyPatients, deletePatient as deletePatientApi } from '../lib/storageApi';

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  dateOfBirth: string;
  tag: string;
}

export interface PatientContextValue {
  patients: Patient[];
  selectedPatientIds: string[];
  isLoading: boolean;
  error: Error | null;
  reloadPatients: () => Promise<void>;
  addPatient: (data: Omit<Patient, 'id'>) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  selectPatients: (ids: string[]) => void;
  togglePatientSelection: (id: string) => void;
  clearSelection: () => void;
  removePatients: (ids: string[]) => Promise<void>; // Now async
}

export const PatientContext = createContext<PatientContextValue | undefined>(undefined);

const SELECTED_PATIENTS_KEY = 'oasis_selected_patients';

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load selected patient IDs from localStorage (preserved across reloads)
  useEffect(() => {
    try {
      const storedSelected = localStorage.getItem(SELECTED_PATIENTS_KEY);
      if (storedSelected) {
        setSelectedPatientIds(JSON.parse(storedSelected));
      }
    } catch {
      // ignore parsing issues
    }
  }, []);

  // Persist selected patient IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_PATIENTS_KEY, JSON.stringify(selectedPatientIds));
    } catch {
      // ignore
    }
  }, [selectedPatientIds]);

  // Load patients from API
  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await listMyPatients();
      const patientsList = response.patients || [];

      // Convert API response to Patient format
      // Map all fields from database to Patient interface
      const mappedPatients: Patient[] = patientsList.map((apiPatient) => ({
        id: apiPatient.id,
        name: apiPatient.full_name || '',
        email: apiPatient.email || '',
        phone: apiPatient.phone || '',
        cpf: apiPatient.cpf || '',
        dateOfBirth: apiPatient.birth_date || '',
        // case_description is the database field, description is an alias
        tag: apiPatient.case_description || apiPatient.description || '',
      }));

      setPatients(mappedPatients);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar pacientes');
      setError(error);
      console.error('[PatientContext] Error loading patients:', error);
      // Don't clear patients on error - keep existing data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load patients on mount and listen for patient creation events
  useEffect(() => {
    loadPatients();

    // Listen for patient creation/deletion events to reload list
    const handlePatientCreated = () => {
      loadPatients();
    };
    
    const handlePatientDeleted = () => {
      loadPatients();
    };

    window.addEventListener('patientCreated', handlePatientCreated);
    window.addEventListener('patientDeleted', handlePatientDeleted);
    return () => {
      window.removeEventListener('patientCreated', handlePatientCreated);
      window.removeEventListener('patientDeleted', handlePatientDeleted);
    };
  }, [loadPatients]);

  const reloadPatients = useCallback(async () => {
    await loadPatients();
  }, [loadPatients]);

  const addPatient = useCallback((data: Omit<Patient, 'id'>): Patient => {
    // This function is now mainly for immediate UI update
    // The real patient is already created via API, and reloadPatients will sync
    const newPatient: Patient = {
      id: data.id || `patient-${Date.now()}`, // Use provided ID if available (from API)
      ...data,
    };
    
    // Optimistically add to list (will be replaced by reloadPatients)
    setPatients((prev) => {
      // Avoid duplicates
      if (prev.some(p => p.id === newPatient.id)) {
        return prev;
      }
      return [newPatient, ...prev];
    });
    
    // Não seleciona o paciente novo por padrão
    return newPatient;
  }, []);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((patient) => (patient.id === id ? { ...patient, ...updates } : patient))
    );
  }, []);

  const togglePatientSelection = useCallback((id: string) => {
    setSelectedPatientIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const selectPatients = useCallback((ids: string[]) => {
    setSelectedPatientIds(Array.from(new Set(ids)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPatientIds([]);
  }, []);

  const removePatients = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    
    // Delete each patient via API (multi-tenant: removes relationship, not patient record)
    const deletePromises = ids.map(async (patientId) => {
      try {
        await deletePatientApi(patientId);
        return { success: true, id: patientId };
      } catch (error) {
        console.error(`[PatientContext] Error deleting patient ${patientId}:`, error);
        return { success: false, id: patientId, error };
      }
    });
    
    const results = await Promise.all(deletePromises);
    const successfulIds = results.filter(r => r.success).map(r => r.id);
    const failedIds = results.filter(r => !r.success).map(r => r.id);
    
    // Remove successful deletions from local state immediately
    if (successfulIds.length > 0) {
      setPatients((prev) => prev.filter((p) => !successfulIds.includes(p.id)));
      setSelectedPatientIds((prev) => prev.filter((id) => !successfulIds.includes(id)));
      
      // Dispatch event to notify other components (like Conhecimento page)
      successfulIds.forEach((patientId) => {
        window.dispatchEvent(new CustomEvent('patientDeleted', { 
          detail: { patientId } 
        }));
      });
      
      // Reload patients list from API to ensure sync
      await loadPatients();
    }
    
    // If some deletions failed, throw error
    if (failedIds.length > 0) {
      const errorMessage = failedIds.length === 1
        ? `Erro ao remover paciente`
        : `Erro ao remover ${failedIds.length} pacientes`;
      throw new Error(errorMessage);
    }
  }, [loadPatients]);

  const value: PatientContextValue = {
    patients,
    selectedPatientIds,
    isLoading,
    error,
    reloadPatients,
    addPatient,
    updatePatient,
    selectPatients,
    togglePatientSelection,
    clearSelection,
    removePatients,
  };

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
};

