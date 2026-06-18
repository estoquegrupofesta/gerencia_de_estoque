import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ShoppingCart, Users, Trash2, Zap, 
  BrainCircuit, Search, RefreshCw 
} from 'lucide-react';

export function PlanejamentoDiario() {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  
  const [buscaProduto, setBuscaProduto] = useState('');
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<any[]>([]);

  useEffect(() => {
    fetchDados();
  }, []);

  async function fetchDados() {
    // Voltando para a tabela 'produtos' conforme solicitado
    const { data: prod } = await supabase.from('produtos').select('*').order('nome');
    const { data: free } = await supabase.from('freelancers').select('*').eq('status', 'ativo').order('nome');
    if (prod) setProdutos(prod);
    if (free) setFreelancers(free);
  }

  const adicionarAoCarrinho = (item: any) => {
    if (carrinho.find(i => i.id === item.id)) return;
    setCarrinho([...carrinho, { ...item, qtd_planejada: 1 }]);
    setBuscaProduto(''); 
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const alternarFreelancer = (free: any) => {
    const existe = selecionados.find(f => f.id === free.id);
    if (existe) {
      setSelecionados(selecionados.filter(f => f.id !== free.id));
    } else {
      setSelecionados([...selecionados, free]);
    }
  };

  async function gerarEscalaInteligente() {
    if (carrinho.length === 0 || selecionados.length === 0) return;
    
    setLoading(true);

    try {
      const dataHoje = new Date().toISOString().split('T')[0];
      let poolDeItens = [...carrinho];
      
      // Embaralhar para distribuição Sj
      poolDeItens.sort(() => Math.random() - 0.5);

      const inserts = selecionados.map(free => {
        const capacidade = free.capacidade || 6; 
        const itensDoColaborador = poolDeItens.splice(0, capacidade);

        if (itensDoColaborador.length > 0) {
          return {
            freelancer_id: free.id,
            data: dataHoje,
            itens_json: itensDoColaborador.map(i => ({
              produto_id: i.id, // Referência ao produto
              nome: i.nome,
              qtd: Number(i.qtd_planejada) || 0 // Garantia de tipagem numérica
            })),
            status: 'pendente'
          };
        }
        return null;
      }).filter(Boolean);

      // Inserção na tabela escala_diaria
      const { error: errorSupa } = await supabase.from('escala_diaria').insert(inserts as any[]);
      if (errorSupa) throw errorSupa;

      // Webhook n8n para processar a baixa dos insumos automaticamente
      try {
        await fetch('https://comprasgrupofesta.app.n8n.cloud/webhook-test/cc593eb8-58df-4e25-8eaf-3f36ee54a5df', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            acao: "PLANEJAMENTO_PRODUTOS_GERADO", 
            dados: inserts 
          })
        });
      } catch (e) { console.warn("Webhook n8n não respondeu, mas dados salvos no banco."); }

      alert("🚀 Cartões de Produtos Gerados!");
      setCarrinho([]);
      setSelecionados([]);

    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 p-4">
      <header>
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
          <BrainCircuit className="text-purple-600" size={32} /> Planejamento Diário
        </h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Produtos & Unitarização</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BUSCA DE PRODUTOS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
          <h3 className="font-black text-gray-800 uppercase text-xs flex items-center gap-2 tracking-widest">
            <ShoppingCart size={18} className="text-purple-500" /> 1. Selecionar Produtos
          </h3>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar produtos para planejar..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-200 transition-all"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {produtos
              .filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))
              .slice(0, 4)
              .map(p => (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} className="flex items-center justify-between p-3 bg-purple-50/30 hover:bg-purple-100 border border-purple-100 rounded-xl transition-all">
                  <span className="text-[10px] font-bold text-purple-900 uppercase truncate">{p.nome}</span>
                  <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black">Estoque: {p.estoque_producao || 0}</span>
                </button>
            ))}
          </div>

          {/* LISTA DE PLANEJAMENTO (COM DELETE) */}
          <div className="space-y-3 pt-6 border-t border-gray-100">
            {carrinho.map((item, index) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-white border-gray-100 shadow-sm">
                <div className="flex-1">
                  <p className="text-[11px] font-black text-gray-800 uppercase">{item.nome}</p>
                </div>
                <input 
                  type="number" 
                  min="1"
                  className="w-16 py-2 bg-gray-50 rounded-xl font-black text-sm text-center outline-none"
                  value={item.qtd_planejada}
                  onChange={(e) => {
                    const novos = [...carrinho];
                    // Conversão imediata no input para evitar strings indesejadas
                    novos[index].qtd_planejada = Math.max(1, parseInt(e.target.value) || 1);
                    setCarrinho(novos);
                  }}
                />
                <button onClick={() => removerDoCarrinho(item.id)} className="text-gray-300 hover:text-red-500 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* EQUIPE E GERAR */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6 flex flex-col">
          <h3 className="font-black text-gray-800 uppercase text-xs flex items-center gap-2 tracking-widest">
            <Users size={18} className="text-purple-500" /> 2. Freelancers
          </h3>

          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[400px]">
            {freelancers.map(f => {
              const selecionado = selecionados.find(s => s.id === f.id);
              return (
                <button 
                  key={f.id} 
                  onClick={() => alternarFreelancer(f)} 
                  className={`p-4 rounded-2xl border-2 transition-all ${selecionado ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-inner' : 'border-gray-50 bg-gray-50 text-gray-400 opacity-60'}`}
                >
                  <span className="text-[10px] font-black uppercase">{f.nome}</span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={gerarEscalaInteligente}
            disabled={loading || carrinho.length === 0 || selecionados.length === 0}
            className="w-full py-5 bg-black text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-purple-950 transition-all shadow-2xl"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <Zap size={18} className="text-yellow-400" />}
            {loading ? "Processando..." : "Gerar Escala de Production"}
          </button>
        </div>
      </div>
    </div>
  );
}