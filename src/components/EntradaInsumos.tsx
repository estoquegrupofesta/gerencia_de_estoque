import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, Archive,
  PackageSearch, MapPin, Layers,
  RefreshCw
} from 'lucide-react';

// Interfaces ajustadas para os JOINs do Supabase
interface Local { id: string; nome: string; }
interface Insumo { id: string; nome: string; unidade_medida: string; }

interface EstoquePosicao {
  id: string;
  insumo_id: string;
  local_id: string;
  quantidade: number;
  insumos: { 
    nome: string; 
    unidade_medida: string; 
  };
  locais: { 
    nome: string; 
  };
}

export function EntradaInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [saldosPorLocal, setSaldosPorLocal] = useState<EstoquePosicao[]>([]);
  
  const [busca, setBusca] = useState('');
  const [insumoSelecionadoId, setInsumoSelecionadoId] = useState('');
  const [quantidadeEntrada, setQuantidadeEntrada] = useState<string>('');
  const [localDestinoId, setLocalDestinoId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setRefreshing(true);
    try {
      // 1. Carrega lista de insumos para o Select
      const { data: ins } = await supabase.from('insumos').select('id, nome, unidade_medida').order('nome');
      
      // 2. Carrega lista de locais para o Select
      const { data: locs } = await supabase.from('locais').select('id, nome').order('nome');
      
      // 3. Carrega o Inventário Real (Saldos por Posição)
      const { data: saldos, error: errSaldos } = await supabase
        .from('estoque_insumos')
        .select(`
          id,
          insumo_id,
          local_id,
          quantidade,
          insumos ( nome, unidade_medida ),
          locais ( nome )
        `);

      if (errSaldos) throw errSaldos;

      if (ins) setInsumos(ins);
      if (locs) setLocais(locs);
      if (saldos) setSaldosPorLocal(saldos as any);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setRefreshing(false);
    }
  }

  async function registrarEntrada(e: React.FormEvent) {
    e.preventDefault();
    
    if (!insumoSelecionadoId || !quantidadeEntrada || !localDestinoId) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    setLoading(true);
    try {
      const qtd = Number(quantidadeEntrada);

      // Verifica se já existe esse insumo nesse local específico na tabela estoque_insumos
      const { data: existente, error: errBusca } = await supabase
        .from('estoque_insumos')
        .select('*')
        .eq('insumo_id', insumoSelecionadoId)
        .eq('local_id', localDestinoId)
        .maybeSingle();

      // TRATAMENTO DO ERRO DE BUSCA (Resolve o aviso do editor)
      if (errBusca) throw errBusca;

      if (existente) {
        // Se existe, soma a quantidade
        const { error: errUpd } = await supabase
          .from('estoque_insumos')
          .update({ quantidade: existente.quantidade + qtd })
          .eq('id', existente.id);
        if (errUpd) throw errUpd;
      } else {
        // Se não existe, cria a nova linha de estoque naquele local
        const { error: errIns } = await supabase
          .from('estoque_insumos')
          .insert([{ 
            insumo_id: insumoSelecionadoId, 
            local_id: localDestinoId, 
            quantidade: qtd 
          }]);
        if (errIns) throw errIns;
      }

      alert("✅ Entrada registrada com sucesso!");
      
      // Reseta campos e atualiza lista
      setInsumoSelecionadoId('');
      setLocalDestinoId('');
      setQuantidadeEntrada('');
      await carregarDados();
      
    } catch (error: any) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const saldosFiltrados = saldosPorLocal.filter(s => 
    s.insumos?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    s.locais?.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <Layers className="text-emerald-500" size={32} /> Inventário de Galpão
          </h2>
          <p className="text-gray-500 font-medium uppercase text-[10px] tracking-widest">Controle de Saldos Fracionados por Local</p>
        </div>
        <button 
          onClick={carregarDados} 
          className={`p-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={20} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LISTA DE SALDOS (LADO ESQUERDO) */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Pesquisar insumo ou local..."
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl font-bold text-sm outline-none shadow-sm focus:ring-2 ring-emerald-500"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {saldosFiltrados.length > 0 ? (
              saldosFiltrados.map((saldo) => (
                <div key={saldo.id} className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[2rem] hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Archive size={24} />
                    </div>
                    <div>
                      <p className="font-black text-gray-800 uppercase text-xs tracking-tight">{saldo.insumos?.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={12} className="text-red-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                          {saldo.locais?.nome}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900 leading-none">{saldo.quantidade}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{saldo.insumos?.unidade_medida}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                <PackageSearch size={60} />
                <p className="font-black uppercase text-xs mt-4">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* TERMINAL DE OPERAÇÃO (LADO DIREITO) */}
        <div className="lg:col-span-5">
          <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden h-full min-h-[600px] flex flex-col">
            <div className="relative z-10">
              <span className="bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">Carga de Mercadoria</span>
              <h3 className="text-2xl font-black uppercase tracking-tighter mt-4 mb-8">Entrada de Estoque</h3>
            </div>
            
            <form onSubmit={registrarEntrada} className="space-y-6 relative z-10 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* SELECT INSUMO */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Qual o material?</label>
                  <select 
                    required
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                    value={insumoSelecionadoId}
                    onChange={(e) => setInsumoSelecionadoId(e.target.value)}
                  >
                    <option value="" className="text-black">-- Selecionar Insumo --</option>
                    {insumos.map(i => <option key={i.id} value={i.id} className="text-black">{i.nome}</option>)}
                  </select>
                </div>

                {/* SELECT LOCAL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Onde vai ser guardado?</label>
                  <select 
                    required
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
                    value={localDestinoId}
                    onChange={(e) => setLocalDestinoId(e.target.value)}
                  >
                    <option value="" className="text-black">-- Selecionar Local --</option>
                    {locais.map(l => <option key={l.id} value={l.id} className="text-black">{l.nome}</option>)}
                  </select>
                </div>

                {/* INPUT QUANTIDADE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Quantidade Chegando</label>
                  <div className="flex items-center gap-4 bg-white/10 p-6 rounded-3xl border-2 border-white/5 focus-within:border-emerald-500 transition-all">
                    <input 
                      type="number"
                      placeholder="0"
                      min="0.01"
                      step="any"
                      className="bg-transparent text-5xl font-black outline-none w-full"
                      value={quantidadeEntrada}
                      onChange={e => setQuantidadeEntrada(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={loading || !insumoSelecionadoId || !localDestinoId || !quantidadeEntrada}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-6 rounded-2xl cursor-pointer font-black uppercase tracking-[0.2em] text-sm shadow-xl transition-all disabled:opacity-10 mt-8"
              >
                {loading ? "PROCESSANDO..." : "Confirmar Recebimento"}
              </button>
            </form>

            <Archive className="absolute -bottom-10 -right-10 text-white/[0.03]" size={300} />
          </div>
        </div>
      </div>
    </div>
  );
}