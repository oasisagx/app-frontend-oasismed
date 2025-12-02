import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, ChevronLeft, Brain, Mic } from 'lucide-react';
import { useOverlay } from '../context/OverlayContext';

const Sidebar: React.FC = () => {
  const { hasOverlay } = useOverlay();
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Controla apenas a exibição dos textos dos itens
  const [showLabels, setShowLabels] = useState(true);
  const toggleTimerRef = useRef<number | null>(null);

  const handleToggle = () => {
    // Evita timers acumulados
    if (toggleTimerRef.current) {
      window.clearTimeout(toggleTimerRef.current);
      toggleTimerRef.current = null;
    }

    if (!isCollapsed) {
      // Colapsando: esconde apenas os textos
      setShowLabels(false);
      setIsCollapsed(true);
    } else {
      // Expandindo: já cria/mostra os textos e a largura da barra apenas os revela
      setIsCollapsed(false);
      setShowLabels(true);
    }
  };

  useEffect(() => {
    return () => {
      if (toggleTimerRef.current) {
        window.clearTimeout(toggleTimerRef.current);
      }
    };
  }, []);

  const navItems = [
    { to: '/main', label: 'MedChat', icon: MessageCircle },
    { to: '/conhecimento', label: 'Conhecimento', icon: Brain },
    { to: '/transcricao', label: 'Transcrição', icon: Mic, disabled: true },
  ];

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-48'} bg-slate-50 flex flex-col transition-all duration-300 ease-in-out`}>
      <nav className="flex-1 px-2 pt-8 space-y-1">
        {navItems.map((item, index) => {
          const linkContent = (
            <>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {showLabels && !isCollapsed && (
                <span className="ml-3 opacity-100">
                  {item.label}
                </span>
              )}
              {isCollapsed && (
                <div className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </>
          );

          const linkClassName = ({ isActive }: { isActive: boolean }) =>
            `group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg overflow-hidden transition-colors duration-200 ${
              hasOverlay
                ? 'text-slate-500'
                : isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`;

          if (index === 0) {
            return (
              <div key={item.to} className="relative">
                <NavLink to={item.to} className={linkClassName}>
                  {linkContent}
                </NavLink>
                <button
                  onClick={handleToggle}
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="absolute top-1/2 mt-[1px] -translate-y-1/2 right-[-15px] translate-x-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10 group"
                >
                  <ChevronLeft
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-all duration-300 ${
                      isCollapsed ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            );
          }

          // Handle disabled items (like Transcrição)
          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg overflow-hidden opacity-40 cursor-not-allowed"
                title="Funcionalidade temporariamente desativada"
              >
                <item.icon className="w-5 h-5 flex-shrink-0 text-slate-400" />
                {showLabels && !isCollapsed && (
                  <span className="ml-3 text-slate-400">
                    {item.label}
                  </span>
                )}
                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                    {item.label} (Desativado)
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink key={item.to} to={item.to} className={linkClassName}>
              {linkContent}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
