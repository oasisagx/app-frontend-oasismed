import { useContext } from 'react';
import { PatientContext, PatientContextValue } from './PatientContext';

export const usePatients = (): PatientContextValue => {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return ctx;
};


