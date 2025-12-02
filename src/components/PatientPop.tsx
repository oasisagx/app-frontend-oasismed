import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import Modal, { ModalHeader, ModalContent } from './ui/Modal';
import { usePatients } from '../context/usePatients';
import { useOverlay } from '../context/OverlayContext';
import type { Patient } from '../context/PatientContext';
import { createPatient as createPatientApi, updatePatient as updatePatientApi } from '../lib/storageApi';

interface PatientPopProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit?: () => void;
}

export const PatientPop: React.FC<PatientPopProps> = ({ isOpen, onClose, onOpenEdit }) => {
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [removeConfirmText, setRemoveConfirmText] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showEditPatientsModal, setShowEditPatientsModal] = useState(false);
  const [editPatientsData, setEditPatientsData] = useState<Record<string, Patient>>({});
  const [editPatientsOriginal, setEditPatientsOriginal] = useState<Record<string, Patient>>({});
  const [editPatientsErrors, setEditPatientsErrors] = useState<
    Record<string, { name?: string; email?: string; phone?: string; cpf?: string; dateOfBirth?: string; tag?: string }>
  >({});
  const [editErrorsVisible, setEditErrorsVisible] = useState(false);
  const [showEditPatientsConfirm, setShowEditPatientsConfirm] = useState(false);
  const [showEditPatientsBackConfirm, setShowEditPatientsBackConfirm] = useState(false);
  const [isUpdatingPatients, setIsUpdatingPatients] = useState(false);

  const {
    patients,
    selectedPatientIds,
    isLoading: isLoadingPatients,
    error: patientsError,
    reloadPatients,
    addPatient,
    updatePatient,
    selectPatients,
    togglePatientSelection,
    clearSelection,
    removePatients,
  } = usePatients();

  const { registerOverlay, unregisterOverlay } = useOverlay();

  const normalizeText = React.useCallback((text: string) => {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }, []);

  const filteredPatients = React.useMemo(() => {
    const rawTerm = patientSearchTerm.trim();
    if (!rawTerm) {
      return [...patients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    const term = normalizeText(rawTerm);
    return patients
      .filter((patient) => {
        const nameMatches = normalizeText(patient.name).includes(term);
        const tagMatches =
          patient.tag && normalizeText(patient.tag).includes(term);
        return nameMatches || tagMatches;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [patients, patientSearchTerm, normalizeText]);

  const selectedPatientsSorted = React.useMemo(
    () =>
      patients
        .filter((p) => selectedPatientIds.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [patients, selectedPatientIds],
  );

  const allFilteredSelected =
    filteredPatients.length > 0 &&
    filteredPatients.every((patient) => selectedPatientIds.includes(patient.id));

  useEffect(() => {
    if (!isOpen) {
      setPatientSearchTerm('');
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
    if (!showRemoveConfirm) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [showRemoveConfirm, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showEditPatientsModal) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showEditPatientsModal, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showEditPatientsConfirm) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showEditPatientsConfirm, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showEditPatientsBackConfirm) return;
    registerOverlay();
    return () => unregisterOverlay();
  }, [showEditPatientsBackConfirm, registerOverlay, unregisterOverlay]);

  const formatPhoneValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
    return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpfValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatDateValue = (value: string) => {
    // If value is in YYYY-MM-DD format (from database), convert to DD/MM/YYYY
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    // Otherwise, format as DD/MM/YYYY from digits
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const isValidCPFValue = (value: string): boolean => {
    const cpfDigits = value.replace(/\D/g, '');
    if (cpfDigits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfDigits)) return false;
    const digits = cpfDigits.split('').map(Number);
    let sum1 = 0;
    for (let i = 0; i < 9; i++) sum1 += digits[i] * (10 - i);
    const dv1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
    if (digits[9] !== dv1) return false;
    let sum2 = 0;
    for (let i = 0; i < 10; i++) sum2 += digits[i] * (11 - i);
    const dv2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
    return digits[10] === dv2;
  };

  const getEditFieldError = (field: keyof Patient, value: string): string | undefined => {
    const trimmed = value.trim();
    if (field === 'name') {
      if (!trimmed) return 'Nome completo é obrigatório';
    }
    if (field === 'email') {
      if (trimmed && !/.+@.+\..+/.test(trimmed)) return 'E-mail inválido';
    }
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits && digits.length !== 10 && digits.length !== 11)
        return 'Telefone deve ter 10 ou 11 dígitos';
    }
    if (field === 'cpf') {
      if (trimmed && !isValidCPFValue(trimmed)) return 'CPF inválido';
    }
    if (field === 'dateOfBirth') {
      const digits = value.replace(/\D/g, '');
      if (digits) {
        if (digits.length !== 8) return 'Data inválida ou não DD/MM/AAAA';
        const day = parseInt(digits.slice(0, 2), 10);
        const month = parseInt(digits.slice(2, 4), 10);
        const year = parseInt(digits.slice(4, 8), 10);
        const date = new Date(year, month - 1, day);
        const isValidDate =
          date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
        if (!isValidDate || year < 1909) return 'Data inválida ou não DD/MM/AAAA';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() > today.getTime()) return 'Data inválida ou não DD/MM/AAAA';
      }
    }
    if (field === 'tag') {
      if (!trimmed) return 'Descrição breve do caso é obrigatória';
    }
    return undefined;
  };

  const handlePatientFieldChange = (id: string, field: keyof Patient, value: string) => {
    setEditPatientsData((prev) => ({
      ...prev,
      [id]: prev[id] ? { ...prev[id], [field]: value } : prev[id],
    }));
    if (
      editErrorsVisible &&
      (field === 'name' ||
        field === 'email' ||
        field === 'phone' ||
        field === 'cpf' ||
        field === 'dateOfBirth' ||
        field === 'tag')
    ) {
      setEditPatientsErrors((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [field]: getEditFieldError(field, value),
        },
      }));
    }
  };

  const handleFormattedInputChange = (
    id: string,
    field: 'phone' | 'cpf' | 'dateOfBirth',
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.target;
    const raw = input.value;
    const cursor = input.selectionStart ?? raw.length;

    let digits = raw.replace(/\D/g, '');
    if (field === 'phone' || field === 'cpf') {
      digits = digits.slice(0, 11);
    } else {
      digits = digits.slice(0, 8);
    }

    const formatted =
      field === 'phone'
        ? formatPhoneValue(digits)
        : field === 'cpf'
          ? formatCpfValue(digits)
          : formatDateValue(digits);

    let digitIndex = 0;
    for (let i = 0; i < cursor; i++) {
      if (/\d/.test(raw[i] ?? '')) digitIndex++;
    }
    if (digitIndex > digits.length) digitIndex = digits.length;

    let newCursor = formatted.length;
    if (digitIndex === 0) {
      newCursor = 0;
    } else {
      let seen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i] ?? '')) {
          seen++;
          if (seen === digitIndex) {
            newCursor = i + 1;
            break;
          }
        }
      }
    }

    handlePatientFieldChange(id, field, formatted);
    requestAnimationFrame(() => {
      input.selectionStart = newCursor;
      input.selectionEnd = newCursor;
    });
  };

  const resetEditPatientsState = () => {
    setEditPatientsData({});
    setEditPatientsOriginal({});
    setEditPatientsErrors({});
    setEditErrorsVisible(false);
    setShowEditPatientsConfirm(false);
    setShowEditPatientsBackConfirm(false);
    setIsUpdatingPatients(false);
  };

  const closeEditPatientsModal = (returnToPatients = false) => {
    setShowEditPatientsModal(false);
    setShowEditPatientsConfirm(false);
    setShowEditPatientsBackConfirm(false);
    setEditErrorsVisible(false);
    if (returnToPatients && onOpenEdit) {
      onOpenEdit();
    }
  };

  const computeEditErrors = () => {
    const nextErrors: typeof editPatientsErrors = {};
    let hasErrors = false;
    selectedPatientIds.forEach((id) => {
      const data = editPatientsData[id];
      if (!data) return;
      const entryErrors: typeof nextErrors[string] = {};
      (['name', 'email', 'phone', 'cpf', 'dateOfBirth', 'tag'] as const).forEach((field) => {
        const err = getEditFieldError(field, (data as any)[field] ?? '');
        if (err) {
          entryErrors[field] = err;
          hasErrors = true;
        }
      });
      nextErrors[id] = entryErrors;
    });
    return { nextErrors, hasErrors };
  };

  const handleConfirmEditPatients = async () => {
    setIsUpdatingPatients(true);
    try {
      // Update each patient in the database
      const updatePromises = Object.entries(editPatientsData).map(async ([id, data]) => {
        // Normalize phone and CPF (remove formatting)
        const phoneDigits = data.phone ? data.phone.replace(/\D/g, '') : '';
        const cpfDigits = data.cpf ? data.cpf.replace(/\D/g, '') : '';
        
        // Convert date from DD/MM/YYYY to YYYY-MM-DD format for API
        let birthDateFormatted: string | undefined = undefined;
        if (data.dateOfBirth) {
          const dobDigits = data.dateOfBirth.replace(/\D/g, '');
          if (dobDigits.length === 8) {
            const day = dobDigits.slice(0, 2);
            const month = dobDigits.slice(2, 4);
            const year = dobDigits.slice(4, 8);
            birthDateFormatted = `${year}-${month}-${day}`;
          }
        }

        // Call API to update patient in database
        await updatePatientApi(id, {
          full_name: data.name,
          email: data.email || undefined,
          phone: phoneDigits || undefined,
          cpf: cpfDigits || undefined,
          birth_date: birthDateFormatted,
          case_description: data.tag || undefined,
        });

        // Update local state after successful API call
        const normalized: Patient = {
          ...data,
          phone: phoneDigits,
          cpf: cpfDigits,
        };
        updatePatient(id, normalized);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Reload patients from API to ensure state is synchronized
      await reloadPatients();

      closeEditPatientsModal();
    } catch (error) {
      console.error('[PatientPop] Error updating patients:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao atualizar pacientes';
      alert(`Erro ao atualizar pacientes: ${errorMessage}`);
      // Don't close modal on error - let user see the error and try again
    } finally {
      setIsUpdatingPatients(false);
    }
  };

  const hasEditedChanges = selectedPatientIds.some((id) => {
    const original = editPatientsOriginal[id];
    const current = editPatientsData[id];
    if (!original || !current) return false;
    return JSON.stringify(original) !== JSON.stringify(current);
  });

  const attemptSaveEditedPatients = () => {
    if (!hasEditedChanges) return;
    setEditErrorsVisible(true);
    const { nextErrors, hasErrors } = computeEditErrors();
    setEditPatientsErrors(nextErrors);
    if (!hasErrors) {
      setShowEditPatientsConfirm(true);
    }
  };

  const isEditSaveDisabled =
    !hasEditedChanges ||
    Object.values(editPatientsErrors).some((errs) => Object.values(errs).some(Boolean));

  useEffect(() => {
    if (!showEditPatientsModal) {
      resetEditPatientsState();
      return;
    }
    const data: Record<string, Patient> = {};
    const originals: Record<string, Patient> = {};
    const errors: typeof editPatientsErrors = {};

    selectedPatientIds.forEach((id) => {
      const patient = patients.find((p) => p.id === id);
      if (patient) {
        const formattedPatient: Patient = {
          ...patient,
          phone: formatPhoneValue(patient.phone || ''),
          cpf: formatCpfValue(patient.cpf || ''),
          dateOfBirth: formatDateValue(patient.dateOfBirth || ''),
        };
        data[id] = formattedPatient;
        originals[id] = { ...formattedPatient };
        errors[id] = {};
      }
    });

    setEditPatientsData(data);
    setEditPatientsOriginal(originals);
    setEditPatientsErrors(errors);
    setEditErrorsVisible(false);
    setShowEditPatientsConfirm(false);
  }, [showEditPatientsModal, selectedPatientIds, patients]);

  return (
    <>
      {/* Patient selection modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with title */}
            <div className="p-6 pb-4 border-b border-slate-200 relative bg-slate-50 rounded-t-xl">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg group"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900">
                Pacientes
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoadingPatients ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">Carregando pacientes...</p>
                </div>
              ) : patientsError ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <p className="text-sm text-red-600">Erro ao carregar pacientes</p>
                  <p className="text-xs text-slate-500 text-center">
                    {patientsError.message}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => reloadPatients()}
                    className="text-xs py-1"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : patients.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum paciente ainda. Crie um paciente.
                </p>
              ) : (
                <>
                  {/* Patient search + clear selection in same row */}
                  <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou descrição..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-0 focus:border-slate-200 focus:shadow-none"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const ids = filteredPatients.map((patient) => patient.id);
                        if (!ids.length) return;
                        selectPatients(Array.from(new Set([...selectedPatientIds, ...ids])));
                      }}
                      disabled={filteredPatients.length === 0 || allFilteredSelected}
                      className={`border-slate-300 whitespace-nowrap ${
                        filteredPatients.length === 0 || allFilteredSelected
                          ? 'text-slate-300 cursor-default'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Selecionar todos
                    </Button>
                  </div>

                  {/* Patient list */}
                  <div className="max-h-60 overflow-y-auto mb-2 space-y-2">
                    {filteredPatients.map((patient) => {
                      const isSelected = selectedPatientIds.includes(patient.id);
                      return (
                        <button
                          key={patient.id}
                          type="button"
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left ${
                            isSelected
                              ? 'border-oasis-blue bg-oasis-blue/5'
                              : 'border-slate-200 hover:border-oasis-blue/60 hover:bg-slate-50'
                          }`}
                          onClick={() => togglePatientSelection(patient.id)}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {patient.name}
                            </p>
                            {patient.tag && (
                              <p className="mt-1 text-xs text-slate-500 truncate" title={patient.tag}>
                                {patient.tag}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                              isSelected
                                ? 'bg-oasis-blue border-oasis-blue'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <span className="h-2 w-2 rounded-sm bg-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {patients.length > 0 && (
                <div className="mb-4 flex w-full gap-2 px-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowRemoveConfirm(true)}
                    disabled={selectedPatientIds.length === 0}
                    className={`flex-1 text-xs py-2 border-slate-300 ${
                      selectedPatientIds.length === 0
                        ? 'text-red-200 cursor-default'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Remover paciente(s)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => clearSelection()}
                    disabled={selectedPatientIds.length === 0}
                    className={`flex-1 text-xs py-2 border-slate-300 ${
                      selectedPatientIds.length === 0
                        ? 'text-slate-300 cursor-default'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Limpar seleção
                  </Button>
                  <Button
                    onClick={() => {
                      onClose();
                      setShowEditPatientsModal(true);
                    }}
                    disabled={selectedPatientIds.length === 0}
                    className={`flex-1 text-xs py-2 ${
                      selectedPatientIds.length === 0
                        ? 'bg-oasis-blue/40 text-white cursor-default'
                        : 'bg-oasis-blue hover:bg-oasis-blue-600 text-white'
                    }`}
                  >
                    Editar/Visualizar
                  </Button>
                </div>
              )}

              {/* New patient form */}
              <NewPatientForm
                onCreate={async (data) => {
                  try {
                    // Create patient in database via API
                    // Backend will automatically create the S3 folder
                    const createdPatient = await createPatientApi({
                      full_name: data.name,
                      email: data.email,
                      phone: data.phone,
                      cpf: data.cpf,
                      birth_date: data.dateOfBirth,
                      tag: data.tag,
                    });
                    
                    // Add to local context with database ID (optimistic update)
                    addPatient({
                      id: createdPatient.id,
                      name: createdPatient.full_name,
                      email: data.email,
                      phone: data.phone,
                      cpf: data.cpf,
                      dateOfBirth: data.dateOfBirth,
                      tag: data.tag,
                    });

                    // Reload patients from API to get full synchronized list
                    await reloadPatients();

                    // Dispatch custom event to notify Conhecimento page to reload patients
                    window.dispatchEvent(new CustomEvent('patientCreated', { 
                      detail: { patientId: createdPatient.id } 
                    }));
                  } catch (error) {
                    console.error('[PatientPop] Error creating patient:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar paciente';
                    alert(`Erro ao criar paciente: ${errorMessage}`);
                  }
                }}
                hasTopBorder={patients.length > 0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Remove Patients Confirmation Modal */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowRemoveConfirm(false);
            setRemoveConfirmText('');
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 relative">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setRemoveConfirmText('');
                }}
                className="absolute top-4 right-4 p-1 rounded-lg group"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Remover paciente(s)
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Tem certeza de que deseja remover o(s) paciente(s) selecionado(s)?
              </p>
              {selectedPatientsSorted.length > 0 && (
                <div className="mb-4">
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {selectedPatientsSorted.map((patient) => (
                      <li key={patient.id}>{patient.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm text-slate-600 mb-4">
                Caso sim, digite <span className="font-semibold">remover permanentemente</span> e remova.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={removeConfirmText}
                  onChange={(e) => setRemoveConfirmText(e.target.value)}
                  placeholder="remover permanentemente"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40"
                />
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await removePatients(selectedPatientIds);
                      setShowRemoveConfirm(false);
                      setRemoveConfirmText('');
                    } catch (error) {
                      console.error('[PatientPop] Error removing patients:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover pacientes';
                      alert(`Erro ao remover pacientes: ${errorMessage}`);
                      // Don't close modal on error - let user try again
                    }
                  }}
                  disabled={removeConfirmText.trim() !== 'remover permanentemente'}
                  className={
                    removeConfirmText.trim() === 'remover permanentemente'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-100 text-red-300 cursor-default hover:bg-red-100'
                  }
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit patients modal */}
      <Modal
        isOpen={showEditPatientsModal}
        onClose={() => closeEditPatientsModal()}
        className="max-w-3xl mx-4"
      >
        <ModalHeader>Pacientes selecionados</ModalHeader>
        <ModalContent className="max-h-[70vh] flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {selectedPatientIds.length === 0 ? (
              <p className="text-sm text-slate-500">Selecione pacientes para editar.</p>
            ) : (
              selectedPatientIds.map((id) => {
                const data = editPatientsData[id];
                if (!data) return null;
                return (
                  <div key={id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Nome completo *</label>
                      <input
                        type="text"
                        placeholder="Nome completo *"
                        value={data.name}
                        onChange={(e) => handlePatientFieldChange(id, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
                          editErrorsVisible && editPatientsErrors[id]?.name
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.name && (
                        <p className="text-xs text-red-500 mt-1">{editPatientsErrors[id]?.name}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">E-mail</label>
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={data.email}
                        onChange={(e) => handlePatientFieldChange(id, 'email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
                          editErrorsVisible && editPatientsErrors[id]?.email
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.email && (
                        <p className="text-xs text-red-500 mt-1">{editPatientsErrors[id]?.email}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Telefone</label>
                      <input
                        type="tel"
                        placeholder="Telefone"
                        value={data.phone}
                        onChange={(e) => handleFormattedInputChange(id, 'phone', e)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
                          editErrorsVisible && editPatientsErrors[id]?.phone
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.phone && (
                        <p className="text-xs text-red-500 mt-1">{editPatientsErrors[id]?.phone}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">CPF</label>
                      <input
                        type="text"
                        placeholder="CPF"
                        value={data.cpf}
                        onChange={(e) => handleFormattedInputChange(id, 'cpf', e)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
                          editErrorsVisible && editPatientsErrors[id]?.cpf
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.cpf && (
                        <p className="text-xs text-red-500 mt-1">{editPatientsErrors[id]?.cpf}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Data de nascimento</label>
                      <input
                        type="text"
                        placeholder="Data de nascimento"
                        value={data.dateOfBirth}
                        onChange={(e) => handleFormattedInputChange(id, 'dateOfBirth', e)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
                          editErrorsVisible && editPatientsErrors[id]?.dateOfBirth
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.dateOfBirth && (
                        <p className="text-xs text-red-500 mt-1">
                          {editPatientsErrors[id]?.dateOfBirth}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-slate-500">
                        Descrição breve do caso *
                      </label>
                      <textarea
                        placeholder="Descrição breve do caso *"
                        value={data.tag}
                        onChange={(e) => handlePatientFieldChange(id, 'tag', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 resize-none ${
                          editErrorsVisible && editPatientsErrors[id]?.tag
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                        rows={3}
                      />
                      {editErrorsVisible && editPatientsErrors[id]?.tag && (
                        <p className="text-xs text-red-500 mt-1">{editPatientsErrors[id]?.tag}</p>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 italic sm:pl-6">
              Os campos com * são obrigatórios
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEditPatientsBackConfirm(true)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </Button>
              <Button
                onClick={attemptSaveEditedPatients}
                disabled={isEditSaveDisabled || isUpdatingPatients}
                className={
                  isEditSaveDisabled || isUpdatingPatients
                    ? 'bg-oasis-blue/40 text-white cursor-default'
                    : 'bg-oasis-blue hover:bg-oasis-blue-600 text-white'
                }
              >
                {isUpdatingPatients ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {showEditPatientsConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowEditPatientsConfirm(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Salvar edições</h3>
              <p className="text-sm text-slate-600 mb-6">Deseja salvar as edições feitas?</p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditPatientsConfirm(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmEditPatients}
                  disabled={isUpdatingPatients}
                  className={
                    isUpdatingPatients
                      ? 'bg-oasis-blue/40 text-white cursor-default'
                      : 'bg-oasis-blue hover:bg-oasis-blue-600 text-white'
                  }
                >
                  {isUpdatingPatients ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditPatientsBackConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowEditPatientsBackConfirm(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Voltar para a janela anterior</h3>
              <p className="text-sm text-slate-600 mb-6">
                Deseja abandonar a edição e voltar para a janela anterior?
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditPatientsBackConfirm(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => closeEditPatientsModal(true)}
                  className="bg-oasis-blue hover:bg-oasis-blue-600 text-white"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface NewPatientFormProps {
  onCreate: (data: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    dateOfBirth: string;
    tag: string;
  }) => Promise<void> | void; // Can be async now
  hasTopBorder?: boolean;
}

const NewPatientForm: React.FC<NewPatientFormProps> = ({ onCreate, hasTopBorder = true }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [tag, setTag] = useState('');
  const [tempTag, setTempTag] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [tagError, setTagError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const phoneRef = React.useRef<HTMLInputElement>(null);
  const cpfRef = React.useRef<HTMLInputElement>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');
  const dateRef = React.useRef<HTMLInputElement>(null);

  const isValidCPF = (value: string): boolean => {
    const cpfDigits = value.replace(/\D/g, '');
    if (cpfDigits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

    const digits = cpfDigits.split('').map(Number);

    let sum1 = 0;
    for (let i = 0; i < 9; i++) {
      sum1 += digits[i] * (10 - i);
    }
    let rest1 = sum1 % 11;
    const dv1 = rest1 < 2 ? 0 : 11 - rest1;
    if (digits[9] !== dv1) return false;

    let sum2 = 0;
    for (let i = 0; i < 10; i++) {
      sum2 += digits[i] * (11 - i);
    }
    let rest2 = sum2 % 11;
    const dv2 = rest2 < 2 ? 0 : 11 - rest2;
    if (digits[10] !== dv2) return false;

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const cleanFullName = fullName.trim();
    const cleanTag = tag.trim();
    
    if (!cleanTag) {
      setTagError('Descrição breve do caso é obrigatória');
      return;
    }

    const dobDigits = dateOfBirth.replace(/\D/g, '');
    if (dobDigits) {
      if (dobDigits.length !== 8) {
        setDateError('Data inválida ou não DD/MM/AAAA');
        return;
      }
      const day = parseInt(dobDigits.slice(0, 2), 10);
      const month = parseInt(dobDigits.slice(2, 4), 10);
      const year = parseInt(dobDigits.slice(4, 8), 10);
      const date = new Date(year, month - 1, day);
      const isValidDate =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

      if (!isValidDate) {
        setDateError('Data inválida ou não DD/MM/AAAA');
        return;
      }

      if (year < 1909) {
        setDateError('Data inválida ou não DD/MM/AAAA');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date.getTime() > today.getTime()) {
        setDateError('Data inválida ou não DD/MM/AAAA');
        return;
      }
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setPhoneError('Telefone deve ter 10 ou 11 dígitos');
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !/.+@.+\..+/.test(cleanEmail)) {
      setEmailError('E-mail inválido');
      return;
    }

    const cleanCpf = cpf.trim();
    if (cleanCpf) {
      if (!isValidCPF(cleanCpf)) {
        setCpfError('CPF inválido');
        return;
      }
    }

    // Reset form errors
    setEmailError('');
    setCpfError('');
    setPhoneError('');
    setDateError('');
    setTagError('');

    // onCreate will handle API call and folder creation via backend
    setIsSubmitting(true);
    try {
      await onCreate({
        name: cleanFullName,
        email: cleanEmail,
        phone: phoneDigits,
        cpf: cleanCpf,
        dateOfBirth,
        tag: cleanTag,
      });
      
      // Clear form only on success
      setFullName('');
      setEmail('');
      setPhone('');
      setCpf('');
      setDateOfBirth('');
      setTag('');
    } catch (error) {
      // Error is already handled in PatientPop's onCreate
      console.error('[NewPatientForm] Error in onCreate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} noValidate className={`${hasTopBorder ? 'border-t border-slate-200' : ''} pt-4 mt-2 space-y-3`}>
      <p className="text-sm font-medium text-slate-800" style={{ fontSize: '1.1em' }}>
        Novo paciente
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Nome completo *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 sm:col-span-2"
        />
        <div className="space-y-1">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
              emailError ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {emailError && (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={phoneRef}
            type="tel"
            placeholder="Telefone"
            value={phone}
            onChange={(e) => {
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

              setPhone(formatted);
              if (phoneError) setPhoneError('');

              requestAnimationFrame(() => {
                if (phoneRef.current) {
                  phoneRef.current.selectionStart = newCursor;
                  phoneRef.current.selectionEnd = newCursor;
                }
              });
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
              phoneError ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {phoneError && (
            <p className="text-xs text-red-500 mt-1">{phoneError}</p>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={cpfRef}
            type="text"
            placeholder="CPF"
            value={cpf}
            onChange={(e) => {
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
                if (digits.length <= 3) {
                  formatted = digits;
                } else if (digits.length <= 6) {
                  formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
                } else if (digits.length <= 9) {
                  formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
                } else {
                  formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
                    6,
                    9,
                  )}-${digits.slice(9)}`;
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

              setCpf(formatted);
              if (cpfError) setCpfError('');

              requestAnimationFrame(() => {
                if (cpfRef.current) {
                  cpfRef.current.selectionStart = newCursor;
                  cpfRef.current.selectionEnd = newCursor;
                }
              });
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
              cpfError ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {cpfError && (
            <p className="text-xs text-red-500 mt-1">{cpfError}</p>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={dateRef}
            type="text"
            placeholder="Data de nascimento"
            value={dateOfBirth}
            onChange={(e) => {
              const input = e.target;
              const raw = input.value;
              const cursor = input.selectionStart ?? raw.length;

              const digits = raw.replace(/\D/g, '').slice(0, 8);

              let digitIndex = 0;
              for (let i = 0; i < cursor; i++) {
                if (/\d/.test(raw[i] ?? '')) {
                  digitIndex++;
                }
              }

              let formatted = '';
              if (digits.length > 0) {
                if (digits.length <= 2) {
                  formatted = digits;
                } else if (digits.length <= 4) {
                  formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                } else {
                  formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
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

              setDateOfBirth(formatted);
              if (dateError) setDateError('');

              requestAnimationFrame(() => {
                if (dateRef.current) {
                  dateRef.current.selectionStart = newCursor;
                  dateRef.current.selectionEnd = newCursor;
                }
              });
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 ${
              dateError ? 'border-red-500' : 'border-slate-300'
            }`}
          />
          {dateError && (
            <p className="text-xs text-red-500 mt-1">{dateError}</p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-1">
          <button
            type="button"
            onClick={() => {
              setTempTag(tag);
              setShowDescriptionModal(true);
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 truncate ${
              tagError
                ? 'border-red-500 text-slate-400'
                : tag
                ? 'border-slate-300 text-slate-900'
                : 'border-slate-300 text-slate-400'
            }`}
          >
            {tag || 'Descrição breve do caso *'}
          </button>
          {tagError && (
            <p className="text-xs text-red-500 mt-1">{tagError}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 italic ml-4">
          Os campos com * são obrigatórios.
        </p>
        <Button
          type="submit"
          disabled={!fullName.trim() || !tag.trim() || isSubmitting}
          className={
            !fullName.trim() || !tag.trim() || isSubmitting
              ? 'bg-oasis-blue/40 text-white cursor-default'
              : 'bg-oasis-blue hover:bg-oasis-blue-600 text-white'
          }
        >
          {isSubmitting ? 'Criando...' : 'Criar paciente'}
        </Button>
      </div>

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setTempTag(tag);
            setShowDescriptionModal(false);
            if (tagError) setTagError('');
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 relative">
              <button
                onClick={() => {
                  setTempTag(tag);
                  setShowDescriptionModal(false);
                  if (tagError) setTagError('');
                }}
                className="absolute top-4 right-4 p-1 rounded-lg group"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 pr-8">
                Descrição breve do caso
              </h3>
              <div className="space-y-1 mb-4">
                <textarea
                  value={tempTag}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 300) {
                      setTempTag(value);
                      if (tagError) setTagError('');
                    }
                  }}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40 resize-none"
                  placeholder="Descrição breve do caso *"
                />
                <p className="text-xs text-slate-500">
                  300 caracteres no máximo ({tempTag.length}/300)
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => {
                    setTempTag('');
                    setTag('');
                    setShowDescriptionModal(false);
                    if (tagError) setTagError('');
                  }}
                  disabled={!tempTag.trim()}
                  className={
                    tempTag.trim()
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'border-slate-300 text-slate-300 cursor-default'
                  }
                  variant="outline"
                >
                  Limpar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTag(tempTag);
                    setShowDescriptionModal(false);
                    if (tagError) setTagError('');
                  }}
                  disabled={!tempTag.trim()}
                  className={
                    tempTag.trim()
                      ? 'bg-oasis-blue hover:bg-oasis-blue-600 text-white'
                      : 'bg-oasis-blue/40 text-white cursor-default'
                  }
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

