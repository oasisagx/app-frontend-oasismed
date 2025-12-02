// Classe utilitária para ocultar elementos visualmente, mas mantê-los acessíveis para screen readers
export const visuallyHiddenClass = 'visually-hidden';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  disableClose?: boolean;
  closeWarning?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className, disableClose = false, closeWarning }) => {
  const [showWarning, setShowWarning] = React.useState(false);
  
  if (!isOpen) return null;

  const handleClose = () => {
    if (disableClose) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
    } else {
      onClose();
    }
  };

  const handleBackdropClick = () => {
    if (!disableClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "relative bg-white rounded-xl border border-border shadow-xl w-full animate-in fade-in-0 zoom-in-95 overflow-hidden",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <div className="absolute top-3 right-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "text-muted-foreground group",
              disableClose ? "opacity-50 cursor-default hover:opacity-50 hover:bg-transparent hover:text-muted-foreground" : "hover:bg-transparent"
            )}
            onClick={handleClose}
          >
            <X className={cn(
              "w-4 h-4",
              disableClose ? "" : "transition-colors group-hover:text-slate-700"
            )} />
          </Button>
          {showWarning && closeWarning && (
            <div className="absolute top-10 right-0 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-lg z-50 whitespace-nowrap">
              <p className="text-xs text-red-600">{closeWarning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("p-6 pb-4 border-b border-border bg-slate-50 rounded-t-xl", className)}>
    <h2 className="text-lg font-semibold text-foreground">{children}</h2>
  </div>
);

export const ModalContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("p-6", className)}>{children}</div>
);

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("flex justify-end p-4 bg-white rounded-b-xl", className)}>
    {children}
  </div>
);

export default Modal;
