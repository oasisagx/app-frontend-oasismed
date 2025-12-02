import React, { useState } from 'react';
import { FileText, PencilLine, Trash2 } from 'lucide-react';
import Modal, {
  ModalHeader,
  ModalContent,
  ModalFooter,
} from './ui/Modal';
import { Button } from './ui/button';
import { useOverlay } from '../context/OverlayContext';

interface HistoryItem {
  id: string;
  createdAt: string;
  title: string;
}

interface RightBarProps {
  showHistory: boolean;
  onToggleHistory: () => void;
  history: HistoryItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void | Promise<void>;
}

const RightBar: React.FC<RightBarProps> = ({
  showHistory,
  onToggleHistory,
  history,
  activeConversationId,
  onSelectConversation,
  onUpdateTitle,
  onDeleteConversation,
}) => {
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
  const { hasOverlay } = useOverlay();

  // Debug: Log history prop
  React.useEffect(() => {
    console.log('[RightBar] History prop changed:', {
      historyLength: history.length,
      history: history.map(h => ({ id: h.id, title: h.title, createdAt: h.createdAt })),
      showHistory
    });
  }, [history, showHistory]);

  const renderedHistoryItems = history.map((item) => {
    const isActive = item.id === activeConversationId;
    return (
      <div
        key={item.id}
        className={`p-3 rounded-lg bg-white cursor-pointer transition-colors ${
          isActive
            ? 'border border-oasis-blue/60 shadow-sm'
            : 'border border-slate-200 hover:border-slate-300'
        }`}
        onClick={() => onSelectConversation(item.id)}
      >
        <p className="text-xs font-semibold text-slate-800 truncate mb-1" title={item.title}>
          {item.title}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {(() => {
              const d = new Date(item.createdAt);
              const date = d.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              const time = d.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return `${date} • ${time}`;
            })()}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setEditingHistoryId(item.id);
                setEditingTitle(item.title);
              }}
              aria-label="Editar título da conversa"
            >
              <PencilLine className="w-4 h-4" />
            </button>
            {onDeleteConversation && (
              <button
                type="button"
                className="text-slate-400 hover:text-red-600 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingHistoryId(item.id);
                }}
                aria-label="Deletar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <>
      {/* History Sidebar */}
      <div
        className={`absolute inset-y-0 right-0 border-l border-slate-200 bg-slate-50 transition-all duration-300 flex flex-col overflow-hidden z-30 w-64 ${
          hasOverlay ? 'pointer-events-none' : ''
        }`}
        style={{
          transform: showHistory ? 'translateX(0)' : 'translateX(calc(100% - 2.5rem))',
        }}
      >
        {/* Toggle button */}
        <button
          className="flex items-center justify-center sm:justify-start px-2 py-3 hover:bg-slate-100 transition-colors"
          onClick={onToggleHistory}
        >
          <FileText className="w-5 h-5 text-slate-600" />
          <span
            className="ml-2 text-sm font-medium text-slate-700"
            style={{
              opacity: showHistory ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            Histórico de conversas
          </span>
        </button>

        {/* History list */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 scrollbar-none"
          style={{
            pointerEvents: showHistory ? 'auto' : 'none',
            opacity: showHistory ? 1 : 0,
            transition: showHistory ? 'opacity 0.2s ease-in' : 'opacity 0.15s ease-out',
          }}
        >
          {/* Conteúdo estático; a barra apenas revela */}
          <div className="w-60 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 px-1 pt-2">
                Nenhuma conversa no histórico
              </p>
            ) : (
              renderedHistoryItems
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição de título do histórico */}
      <Modal
        isOpen={!!editingHistoryId}
        onClose={() => {
          setEditingHistoryId(null);
          setEditingTitle('');
        }}
        className="max-w-md"
      >
        <ModalHeader>Editar título da conversa</ModalHeader>
        <ModalContent>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Novo título
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            maxLength={120}
          />
          <p className="mt-2 text-xs text-slate-500">
            Dica: um título curto que identifique rapidamente o contexto.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setEditingHistoryId(null);
              setEditingTitle('');
            }}
            className="mr-2"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (editingHistoryId && editingTitle.trim()) {
                onUpdateTitle(editingHistoryId, editingTitle);
                setEditingHistoryId(null);
                setEditingTitle('');
              }
            }}
            disabled={!editingTitle.trim()}
          >
            Salvar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deletingHistoryId}
        onClose={() => setDeletingHistoryId(null)}
        className="max-w-md"
      >
        <ModalHeader>Deletar conversa</ModalHeader>
        <ModalContent>
          <p className="text-sm text-slate-600">
            Tem certeza de que deseja deletar esta conversa? Esta ação não pode ser desfeita.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setDeletingHistoryId(null)}
            className="mr-2"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deletingHistoryId && onDeleteConversation) {
                await onDeleteConversation(deletingHistoryId);
                setDeletingHistoryId(null);
              }
            }}
          >
            Deletar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default RightBar;


