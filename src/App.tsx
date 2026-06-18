import { useState } from 'react';
import {  
  Package, 
  PlusCircle, 
  Truck, 
  Users, 
  UserPlus, 
  ArrowUpRight, 
  ArrowDownLeft,
  BarChart3,
  LineChart,
  Banknote,
  ClipboardIcon,
  Contact,
  Menu, // Ícone para abrir
  X     // Ícone para fechar
} from 'lucide-react';

import { EstoqueManager } from './components/EstoqueManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('estoque_entrada');
  // Estado para controlar a visibilidade da sidebar no mobile
  const [sidebarAberta, setSidebarAberta] = useState(false);

  // Estrutura de Menu
  const menuSections = [
    {
      title: "Gerência de Estoque",
      items: [
        { id: 'estoque_entrada', label: 'Gerência de Estoque', icon: <Package size={18} />, component: <EstoqueManager /> },
      ]
    },
  ];

  const renderContent = () => {
    let activeComponent = null;
    menuSections.forEach(section => {
      const found = section.items.find(item => item.id === activeTab);
      if (found) activeComponent = found.component;
    });
    return activeComponent || <div className="p-10">Erro ao carregar componente.</div>;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans relative">
      
      {/* BOTÃO FLUTUANTE PARA MOBILE (Aparece apenas em telas menores que 'lg') */}
      <button 
        onClick={() => setSidebarAberta(!sidebarAberta)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
        title="Menu"
      >
        {sidebarAberta ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* SOMBREAMENTO DE FUNDO (BACKDROP) NO MOBILE */}
      {sidebarAberta && (
        <div 
          onClick={() => setSidebarAberta(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        />
      )}
      
      {/* SIDEBAR RESPONSIVA */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 flex flex-col h-screen shadow-sm transition-transform duration-300 transform
        lg:translate-x-0 lg:sticky lg:top-0
        ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* LOGO GRUPO FESTA */}
        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 border border-gray-100">
              <img 
                src="/src/assets/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://ui-avatars.com/api/?name=Grupo+Festa&background=ef4444&color=fff";
                }}
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none text-gray-800">
                Grupo <span className="text-red-600">Festa</span>
              </h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                Gestão de Produção
              </p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-4 py-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                {section.title}
              </h3>
              
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarAberta(false); // Fecha o menu automaticamente no mobile ao clicar
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer group ${
                    activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Servidor Ativo</span>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL (Ganha padding lateral menor em telas pequenas) */}
      <main className="flex-1 overflow-y-auto h-screen w-full">
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

    </div>
  );
}