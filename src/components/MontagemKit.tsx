import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ClipboardList, Barcode, 
  Trash2, UserCheck, Layers, 
  Plus,  ShieldCheck, 
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  barcode: string;
  estoque_producao: number; // Saldo mestre na tabela produtos
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}

interface Freelancer {
  id: string;
  nome: string;
}

interface ItemCarrinho {
  produto: Produto;
  totalBips: number;
  unidadesPorBip: number;
}

export function MontagemKit() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [produtosMestre, setProdutosMestre] = useState<Produto[]>([]);
  
  const [buscaBarcode, setBuscaBarcode] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [freelancerId, setFreelancerId] = useState('');

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [qtdLote, setQtdLote] = useState<number>(50);
  const inputBarcodeRef = useRef<HTMLInputElement>(null);

  const unidadesPredefinidas = [50, 40, 30, 20, 10];

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: f } = await supabase.from('funcionarios').select('id, nome, cargo').eq('cargo', 'EQUIPE PRODUÇÃO').order('nome');
    const { data: free } = await supabase.from('freelancers').select('id, nome').order('nome');
    const { data: p } = await supabase.from('produtos').select('id, nome, barcode, estoque_producao');
    
    if (f) setFuncionarios(f);
    if (free) setFreelancers(free);
    if (p) setProdutosMestre(p);
  }

  const handleBarcodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const barcodeLido = formData.get('barcodeInput')?.toString().trim();

    if (!barcodeLido) return;

    // Busca no cadastro mestre
    const produtoEncontrado = produtosMestre.find(p => p.barcode === barcodeLido);
    
    if (produtoEncontrado) {
      setCarrinho(prev => {
        const existe = prev.find(item => item.produto.id === produtoEncontrado.id && item.unidadesPorBip === qtdLote);
        if (existe) {
          return prev.map(item => (item.produto.id === produtoEncontrado.id && item.unidadesPorBip === qtdLote) 
            ? { ...item, totalBips: item.totalBips + 1 } : item
          );
        }
        return [...prev, { produto: produtoEncontrado, totalBips: 1, unidadesPorBip: qtdLote }];
      });
      setBuscaBarcode('');
      form.reset();
    } else {
      alert(`Produto não cadastrado! Código: ${barcodeLido}`);
      setBuscaBarcode('');
      form.reset();
    }
  };

  async function salvarMontagem() {
    if (!funcionarioId || !freelancerId || carrinho.length === 0) {
      alert("Selecione o Operador, o Freelancer e adicione itens!");
      return;
    }

    setLoading(true);
    try {
      // 1. Criar Ordem de Produção
      const { data: ordem, error: errOrdem } = await supabase
        .from('ordens_producao')
        .insert([{ 
          freelancer_id: freelancerId,
          funcionario_id: funcionarioId, // Coluna corrigida conforme sua estrutura
          status: 'montado', 
          data_montagem: new Date().toISOString() 
        }])
        .select().single();

      if (errOrdem) throw errOrdem;

      for (const item of carrinho) {
        const qtdTotalParaBaixar = item.totalBips * item.unidadesPorBip;

        // 2. Registrar na itens_ordem
        await supabase.from('itens_ordem').insert([{
          ordem_id: ordem.id,
          produto_id: item.produto.id,
          qtd_entregue: qtdTotalParaBaixar
        }]);

        // 3. ATUALIZAÇÃO TABELA PRODUTOS (Estoque Mestre)
        const novoSaldoMestre = (item.produto.estoque_producao || 0) - qtdTotalParaBaixar;
        await supabase
          .from('produtos')
          .update({ estoque_producao: novoSaldoMestre })
          .eq('id', item.produto.id);

        // 4. ATUALIZAÇÃO TABELA ESTOQUE_INSUMOS (Estoque por Local)
        const { data: posicoes } = await supabase
          .from('estoque_insumos')
          .select('id, quantidade')
          .eq('insumo_id', item.produto.id)
          .order('quantidade', { ascending: false });

        let saldoDevedor = qtdTotalParaBaixar;

        if (posicoes && posicoes.length > 0) {
          for (const pos of posicoes) {
            if (saldoDevedor <= 0) break;
            const baixarDestaPosicao = Math.min(pos.quantidade, saldoDevedor);
            await supabase
              .from('estoque_insumos')
              .update({ quantidade: pos.quantidade - baixarDestaPosicao })
              .eq('id', pos.id);
            saldoDevedor -= baixarDestaPosicao;
          }
        }

        // Se ainda sobrar saldo (itens sem local ou estoque insuficiente no local)
        if (saldoDevedor > 0) {
          if (posicoes && posicoes.length > 0) {
            // Negativa o saldo na primeira posição encontrada
            const { data: pAtu } = await supabase.from('estoque_insumos').select('quantidade').eq('id', posicoes[0].id).single();
            await supabase.from('estoque_insumos').update({ quantidade: (pAtu?.quantidade || 0) - saldoDevedor }).eq('id', posicoes[0].id);
          } else {
            // Cria um registro básico se o produto não tiver localização vinculada
            const { data: locPadrao } = await supabase.from('locais').select('id').limit(1).single();
            await supabase.from('estoque_insumos').insert([{
              insumo_id: item.produto.id,
              local_id: locPadrao?.id,
              quantidade: -saldoDevedor
            }]);
          }
        }
      }

      alert("✅ Sucesso! Estoque mestre e posições atualizadas.");
      setCarrinho([]);
      setFuncionarioId('');
      setFreelancerId('');
      carregarDados(); // Recarrega para atualizar os saldos na tela
    } catch (error: any) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      <header>
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
          <Barcode className="text-blue-600" size={32} /> Bipagem de Kit
        </h2>
        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Controle Dual: Mestre + Localização</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Operador</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500" value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)}>
                  <option value="">Selecione quem está bipando...</option>
                  {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Freelancer</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-purple-500" value={freelancerId} onChange={e => setFreelancerId(e.target.value)}>
                  <option value="">Para quem vai o material?</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidades/Bip</label>
              <div className="grid grid-cols-5 gap-2">
                {unidadesPredefinidas.map(u => (
                  <button key={u} onClick={() => setQtdLote(u)} className={`py-2 rounded-xl font-black text-xs transition-all ${qtdLote === u ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{u}</button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <form onSubmit={handleBarcodeSubmit}>
                <input 
                  name="barcodeInput"
                  ref={inputBarcodeRef}
                  disabled={!funcionarioId || !freelancerId}
                  type="text"
                  autoComplete="off"
                  placeholder="Bipar material..."
                  className="w-full p-6 bg-gray-900 text-white rounded-2xl font-mono text-2xl text-center outline-none border-4 border-blue-500/20 focus:border-blue-500 shadow-2xl transition-all"
                  value={buscaBarcode}
                  onChange={e => setBuscaBarcode(e.target.value)}
                />
              </form>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col min-h-[550px]">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Itens no Kit
            </div>

            <div className="flex-1 p-6 space-y-3 overflow-y-auto">
              {carrinho.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                  <div>
                    <p className="font-black text-gray-800 uppercase text-xs">{item.produto.nome}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                      {item.totalBips} x {item.unidadesPorBip} uni (Disp: {item.produto.estoque_producao})
                    </p>
                  </div>
                  <button onClick={() => setCarrinho(carrinho.filter((_, i) => i !== index))} className="p-2 text-gray-300 hover:text-red-500">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-gray-100">
              <button 
                onClick={salvarMontagem}
                disabled={loading || carrinho.length === 0 || !funcionarioId || !freelancerId}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-blue-700 disabled:opacity-20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                {loading ? "PROCESSANDO..." : <><ShieldCheck size={22} /> Confirmar e Baixar Estoque</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}