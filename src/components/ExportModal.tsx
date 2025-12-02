import React from 'react';
import Modal from './ui/Modal';
import './ui/visually-hidden.css';
import { Button } from './ui/button';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: string;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transcription,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      {/* Título acessível oculto para screen readers */}
  <h2 className="visually-hidden" id="export-modal-title">
        Enviar ou Exportar
      </h2>
      <div className="px-5 py-2.5 space-y-4" aria-labelledby="export-modal-title" aria-describedby="export-modal-description">
        <p id="export-modal-description" className="visually-hidden">
          Modal para exportar ou enviar transcrição por e-mail ou arquivo.
        </p>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Enviar ou Exportar</h2>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-60 overflow-y-auto scrollbar-thin">
          <div 
            className="text-sm max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: transcription.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="recipient-email" className="text-sm font-bold text-foreground">
              Enviar por e-mail
            </label>
            <div className="flex items-center">
              <input
                id="recipient-email"
                type="email"
                className="flex-1 px-3 py-[7px] bg-background border border-slate-300 rounded-l-md text-sm focus:outline-none focus:ring-0 focus:border-slate-300 focus-visible:outline-none [&:focus]:shadow-none"
                placeholder="medico@clinica.com"
              />
              <Button className="rounded-l-none border border-slate-300 py-1.5">
                <span className="font-semibold">Enviar</span>
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">
              Exportar como arquivo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-slate-300">
                Arquivo de Texto
              </Button>
              <Button variant="outline" className="border-slate-300">
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
