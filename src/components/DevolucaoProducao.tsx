import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  ArchiveRestore, 
  PlusCircle,
  Search,
  Save,
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  User
} from 'lucide-react';

interface OrdemPendente {
  id: string;
  data_saida: string;
  freelancer_id: string;
  freelancers: { nome: string };
  itens_ordem: {
    id: string;
    produto_id: string;
    qtd_entregue: number;
    produtos: { 
      nome: string; 
      estoque_producao: number;
      estoque_unitarizado: number; 
    };
  }[];
}

export function DevolucaoProducao() {
  const [loading, setLoading] = useState(false);
  const [ordens, setOrdens] = useState<OrdemPendente[]>([]);
  const [filtroFreelancer, setFiltroFreelancer] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [inputs, setInputs] = useState<Record<string, {
    ok: number, defeito: number, faltante: number, excedente: number
  }>>({});

  useEffect(() => {
    carregarOrdens();
  }, []);

  async function carregarOrdens() {
    const { data, error } = await supabase
      .from('ordens_producao')
      .select(`
        id, data_saida, freelancer_id, status,
        freelancers!inner ( nome ),
        itens_ordem (
          id, produto_id, qtd_entregue,
          produtos ( nome, estoque_producao, estoque_unitarizado )
        )
      `)
      .eq('status', 'pendente')
      .order('data_saida', { ascending: false });

    if (error) {
      console.error("Erro ao carregar ordens:", error.message);
      return;
    }
    if (data) setOrdens(data as any);
  }

  const handleInputChange = (itemId: string, campo: string, valor: number) => {
    setInputs(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { ok: 0, defeito: 0, faltante: 0, excedente: 0 }),
        [campo]: valor
      }
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  async function finalizarDevolucao(ordem: OrdemPendente) {
    setLoading(true);

    try {
      for (const item of ordem.itens_ordem) {
        const res = inputs[item.id] || { ok: 0, defeito: 0, faltante: 0, excedente: 0 };
        const totalConferido = res.ok + res.defeito + res.faltante;

        if (totalConferido !== item.qtd_entregue) {
          alert(`⚠️ Conta não fecha para ${item.produtos.nome}.\nConferido: ${totalConferido} | Saída: ${item.qtd_entregue}`);
          setLoading(false);
          return;
        }

        await supabase
          .from('itens_ordem')
          .update({
            qtd_devolvida_ok: res.ok,
            qtd_defeito: res.defeito,
            qtd_faltante: res.faltante
          })
          .eq('id', item.id);

        const totalParaEntrar = res.ok + res.excedente;
        const novoSaldoUnitarizado = (item.produtos.estoque_unitarizado || 0) + totalParaEntrar;

        await supabase
          .from('produtos')
          .update({ estoque_unitarizado: novoSaldoUnitarizado })
          .eq('id', item.produto_id);
      }

      await supabase
        .from('ordens_producao')
        .update({ 
          status: 'finalizado',
          data_retorno: new Date().toISOString()
        })
        .eq('id', ordem.id);

      alert("✅ Devolução concluída! Estoque unitarizado atualizado.");
      setInputs({});
      setExpandedId(null);
      carregarOrdens();
    } catch (err) {
      console.error("Erro no processamento:", err);
      alert("Erro ao finalizar devolução.");
    } finally {
      setLoading(false);
    }
  }

  const ordensFiltradas = ordens.filter(o => 
    o.freelancers?.nome.toLowerCase().includes(filtroFreelancer.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <History className="text-orange-600" size={32} /> Retorno de Produção
          </h2>
          <p className="text-gray-500 font-medium">Conferência e entrada no estoque unitarizado.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar freelancer..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all shadow-sm"
            value={filtroFreelancer}
            onChange={e => setFiltroFreelancer(e.target.value)}
          />
        </div>
      </header>

      <div className="space-y-4">
        {ordensFiltradas.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Package size={48} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 font-bold uppercase text-sm tracking-widest">Nenhuma ordem pendente.</p>
          </div>
        )}

        {ordensFiltradas.map(ordem => (
          <div key={ordem.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
            
            {/* CABEÇALHO DO ACORDEÃO */}
            <div 
              onClick={() => toggleExpand(ordem.id)}
              className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${expandedId === ordem.id ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white border border-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-tight text-lg">{ordem.freelancers.nome}</h3>
                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mt-1">
                    <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
                      <Calendar size={12} className="text-orange-500" /> {new Date(ordem.data_saida).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
                      <Clock size={12} className="text-orange-500" /> {new Date(ordem.data_saida).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right mr-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Itens no Kit</p>
                  <p className="text-sm font-black text-orange-600">{ordem.itens_ordem.length} tipos</p>
                </div>
                {expandedId === ordem.id ? <ChevronUp className="text-orange-500" /> : <ChevronDown className="text-gray-300" />}
              </div>
            </div>

            {/* CORPO DO ACORDEÃO (DETALHES) */}
            {expandedId === ordem.id && (
              <div className="p-6 border-t border-orange-100 bg-white space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-4">
                  {ordem.itens_ordem.map(item => {
                    const val = inputs[item.id] || { ok: 0, defeito: 0, faltante: 0, excedente: 0 };
                    const totalConferido = val.ok + val.defeito + val.faltante;
                    const saldoRestante = item.qtd_entregue - totalConferido;

                    return (
                      <div key={item.id} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <span className="font-black text-gray-700 uppercase text-sm tracking-tight">{item.produtos.nome}</span>
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Saída: {item.qtd_entregue} un
                          </span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1.5 px-1">
                              <CheckCircle2 size={12} /> OK (Prontos)
                            </label>
                            <input type="number" className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-green-500 font-bold transition-all text-sm" 
                              placeholder="0" value={val.ok || ''} onChange={e => handleInputChange(item.id, 'ok', Number(e.target.value))} />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1.5 px-1">
                              <AlertTriangle size={12} /> Defeito
                            </label>
                            <input type="number" className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-red-500 font-bold transition-all text-sm" 
                              placeholder="0" value={val.defeito || ''} onChange={e => handleInputChange(item.id, 'defeito', Number(e.target.value))} />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-orange-500 uppercase flex items-center gap-1.5 px-1">
                              <ArchiveRestore size={12} /> Faltante
                            </label>
                            <input type="number" className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-orange-500 font-bold transition-all text-sm" 
                              placeholder="0" value={val.faltante || ''} onChange={e => handleInputChange(item.id, 'faltante', Number(e.target.value))} />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-1.5 px-1">
                              <PlusCircle size={12} /> Excedente
                            </label>
                            <input type="number" className="w-full bg-purple-50/50 border-2 border-purple-100 p-3 rounded-xl outline-none focus:border-purple-500 font-bold transition-all text-sm" 
                              placeholder="0" value={val.excedente || ''} onChange={e => handleInputChange(item.id, 'excedente', Number(e.target.value))} />
                          </div>
                        </div>
                        
                        {/* ALERTAS DE CONFERÊNCIA */}
                        <div className="flex gap-2">
                          {saldoRestante !== 0 ? (
                            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight">
                              <AlertTriangle size={14} /> Falta conferir {Math.abs(saldoRestante)} unidades
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight">
                              <CheckCircle2 size={14} /> Conferência bateu!
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => finalizarDevolucao(ordem)}
                    disabled={loading}
                    className="w-full md:w-auto bg-gray-900 text-white px-12 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : <><Save size={20} /> FINALIZAR CONFERÊNCIA E RETORNO</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}