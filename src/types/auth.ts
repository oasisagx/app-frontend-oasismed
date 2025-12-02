export interface DoctorProfile {
  doctorId?: string; // UUID do banco (pode vir como 'id' do backend)
  id?: string; // UUID do banco (formato alternativo)
  doctorCode?: string; // 8 dígitos (human-facing)
  crm: string;
  email: string;
  firstName?: string; // Pode vir como first_name do backend
  first_name?: string; // Formato do backend
  lastName?: string; // Pode vir como last_name do backend
  last_name?: string; // Formato do backend
  specialty?: string;
  phone?: string;
  treatment?: string; // "Dr.", "Dra.", "Sr.", "Sra." ou "" (nenhum)
}

