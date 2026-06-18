import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Printer, Ticket, User, 
  CheckCircle2, RefreshCw, AlertCircle 
} from 'lucide-react';

export function CartoesDistribuicao() {
  const [loading, setLoading] = useState(true);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEscala();
  }, [dataFiltro]);

  async function fetchEscala() {
    setLoading(true);
    const { data, error } = await supabase
      .from('escala_diaria')
      .select(`
        *,
        freelancers (nome)
      `)
      .eq('data', dataFiltro);

    if (error) console.error(error);
    else setEscalas(data || []);
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* HEADER - OCULTO NA IMPRESSÃO */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <Ticket className="text-purple-600" size={32} /> Cartões de Produção
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Impressão para entrega de materiais</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="date" 
            className="p-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none shadow-sm"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
          />
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <Printer size={18} /> Imprimir Todos
          </button>
        </div>
      </header>

      {/* GRID DE CARTÕES */}
      {loading ? (
        <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-purple-600" /></div>
      ) : escalas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:block">
          {escalas.map((escala) => (
            <div 
              key={escala.id} 
              className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all print:border-black print:rounded-none print:shadow-none print:mb-8 print:break-inside-avoid"
            >
              {/* TOPO DO CARTÃO */}
              <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-start print:bg-white print:border-black">
                <div>
                  <div className="flex items-center gap-2 text-purple-600 mb-1 print:text-black">
                    <User size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Freelancer</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 uppercase print:text-2xl">
                    {escala.freelancers?.nome || 'Não identificado'}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">{escala.data}</p>
                  <span className="text-[9px] font-bold text-gray-300">#{escala.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* LISTA DE ITENS (O CORAÇÃO DO CARTÃO) */}
              <div className="p-6 space-y-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase text-left border-b border-gray-50 print:border-black">
                      <th className="pb-2">Item</th>
                      <th className="pb-2 text-right">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 print:divide-black">
                    {escala.itens_json.map((item: any, idx: number) => (
                      <tr key={idx} className="group">
                        <td className="py-3 pr-2">
                          <p className="font-bold text-gray-700 uppercase text-xs print:text-sm">{item.nome}</p>
                          <p className="text-[9px] text-gray-400 font-bold print:hidden">Dificuldade: {item.dificuldade || '-'}</p>
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-block bg-gray-900 text-white px-3 py-1 rounded-lg font-black text-sm print:bg-white print:text-black print:border print:border-black print:text-xl">
                            {item.qtd}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RODAPÉ DO CARTÃO */}
              {/* RODAPÉ DO CARTÃO COM ASSINATURA DUPLA */}
<div className="p-6 bg-gray-50/50 border-t border-gray-50 space-y-4 print:bg-white print:border-black">
  <div className="grid grid-cols-2 gap-4">
    {/* Campo do Funcionário */}
    <div className="space-y-2">
      <div className="h-px bg-gray-300 print:bg-black w-full mt-4"></div>
      <div className="flex items-center gap-1">
        <CheckCircle2 size={12} className="text-gray-400 print:hidden" />
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">
          Saída (Funcionário)
        </span>
      </div>
    </div>

    {/* Campo do Freelancer */}
    <div className="space-y-2">
      <div className="h-px bg-gray-300 print:bg-black w-full mt-4"></div>
      <div className="flex items-center gap-1">
        <User size={12} className="text-gray-400 print:hidden" />
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">
          Recebido (Freelancer)
        </span>
      </div>
    </div>
  </div>
  
  {/* Aviso de Conferência - Apenas para a Impressão */}
  <p className="hidden print:block text-[7px] text-center font-bold uppercase text-gray-500">
    Ao assinar, o parceiro confirma a conferência de todas as quantidades acima.
  </p>
</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 text-center flex flex-col items-center">
          <AlertCircle size={40} className="text-gray-200 mb-4" />
          <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
            Nenhuma escala encontrada para {dataFiltro}
          </p>
        </div>
      )}

      {/* ESTILOS DE IMPRESSÃO CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
          }
          header, button, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}