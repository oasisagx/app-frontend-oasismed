import React from 'react';
import './PulsingMic.css';
import { Mic } from 'lucide-react';

interface PulsingMicProps {
  isRecording: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const PulsingMic: React.FC<PulsingMicProps> = ({
  isRecording,
  size = 'md',
  onClick,
  disabled = false,
  className = '',
}) => {
  const sizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full transition-colors duration-200 focus:outline-none ${
        isRecording
          ? 'bg-oasis-blue border-2 border-oasis-blue animate-pulse text-white'
          : 'bg-white text-oasis-blue hover:bg-oasis-blue-50 hover:text-oasis-blue-600'
      } ${sizeClass} ${className}`}
      aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
    >
      <Mic className={isRecording ? 'w-5 h-5 text-white' : 'w-5 h-5 text-oasis-blue'} />
    </button>
  );
};

export default PulsingMic;
