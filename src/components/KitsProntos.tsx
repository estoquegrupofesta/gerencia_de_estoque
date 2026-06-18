import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  PackageCheck, 
  Truck, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  PlayCircle,
  RefreshCcw,
  Clock,
  PackageOpen
} from 'lucide-react';

interface KitPronto {
  id: string;
  data_montagem: string;
  freelancer_id: string;
  freelancers: { nome: string };
  itens_ordem: {
    qtd_entregue: number;
    produtos: { nome: string };
  }[];
}

export function KitsProntos() {
  const [kits, setKits] = useState<KitPronto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    carregarKitsProntos();
  }, []);

  async function carregarKitsProntos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens_producao')
      .select(`
        id, data_montagem, freelancer_id,
        freelancers ( nome ),
        itens_ordem (
          qtd_entregue,
          produtos ( nome )
        )
      `)
      .eq('status', 'montado')
      .order('data_montagem', { ascending: true });

    if (error) {
      console.error("Erro ao carregar kits:", error.message);
    } else {
      setKits(data as any);
    }
    setLoading(false);
  }

  async function registrarEntrega(kitId: string) {
    const confirmar = window.confirm("Confirmar que o freelancer está levando o kit agora?");
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('ordens_producao')
        .update({ 
          status: 'pendente', 
          data_saida: new Date().toISOString() // MARCA O INÍCIO DA PRODUÇÃO REAL
        })
        .eq('id', kitId);

      if (error) throw error;

      alert("🚀 Kit entregue! O tempo de produção começou a contar.");
      carregarKitsProntos(); // Recarrega a lista
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar a entrega.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <PackageCheck className="text-green-600" size={32} /> Kits para Retirada
          </h2>
          <p className="text-gray-500 font-medium font-sans">Aguardando freelancers buscarem o material montado.</p>
        </div>
        <button 
          onClick={carregarKitsProntos}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-green-600 hover:shadow-md transition-all cursor-pointer"
        >
          <RefreshCcw size={20} />
        </button>
      </header>

      {loading ? (
        <div className="text-center py-20 animate-pulse">
          <p className="text-gray-300 font-black uppercase tracking-widest">Buscando kits na prateleira...</p>
        </div>
      ) : kits.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] py-24 text-center">
          <Truck size={64} className="mx-auto text-gray-100 mb-4" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum kit aguardando retirada.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {kits.map(kit => (
            <div key={kit.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
              
              {/* HEADER DO CARD (Clicável) */}
              <div 
                onClick={() => setExpandedId(expandedId === kit.id ? null : kit.id)}
                className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${expandedId === kit.id ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white border border-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 uppercase tracking-tight text-lg leading-tight">{kit.freelancers.nome}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-green-500" /> {new Date(kit.data_montagem).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-green-500" /> {new Date(kit.data_montagem).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Status</p>
                    <p className="text-xs font-black text-green-600 uppercase">Pronto para Coleta</p>
                  </div>
                  {expandedId === kit.id ? <ChevronUp className="text-green-500" /> : <ChevronDown className="text-gray-300" />}
                </div>
              </div>

              {/* CONTEÚDO EXPANSÍVEL */}
              {expandedId === kit.id && (
                <div className="px-6 pb-6 border-t border-green-50 bg-green-50/10 animate-in slide-in-from-top-2 duration-300">
                  <div className="py-6 space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <PackageOpen size={14} /> Itens contidos neste kit:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {kit.itens_ordem.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <span className="font-bold text-gray-700 uppercase text-xs">{item.produtos.nome}</span>
                          <span className="font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg text-xs">
                            {item.qtd_entregue} un
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      registrarEntrega(kit.id);
                    }}
                    className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 hover:bg-green-600 transition-all cursor-pointer shadow-xl shadow-gray-200 active:scale-[0.98]"
                  >
                    <PlayCircle size={20} /> Registrar Entrega (Sair com Kit)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}