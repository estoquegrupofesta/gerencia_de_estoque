import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  PlusCircle, 
  Tag, 
  Package, 
  AlertCircle, 
  Check, 
  Loader2,
  Layers,
  MapPin,
  Building2,
  FileText,
  DollarSign
} from 'lucide-react';

// Interfaces para os Selects Dinâmicos
interface CategoriaOpcao { id: string; nome: string; }
interface LocalOpcao { id: string; nome: string; }
interface FornecedorOpcao { id: string; nome: string; }
interface EmbalagemOpcao { id: string; plastico: string; }

export function CadastroProduto() {
  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState<'produto_encarte' | 'embalagem'>('produto_encarte');
  
  // Estados de Carregamento e Feedback
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados para os Selects (Dados do Banco)
  const [listaCategorias, setListaCategorias] = useState<CategoriaOpcao[]>([]);
  const [listaLocais, setListaLocais] = useState<LocalOpcao[]>([]);
  const [listaFornecedores, setListaFornecedores] = useState<FornecedorOpcao[]>([]);
  const [listaEmbalagens, setListaEmbalagens] = useState<EmbalagemOpcao[]>([]);

  // =========================================================
  // ESTADOS DO FORMULÁRIO UNIFICADO (PRODUTO + ENCARTE)
  // =========================================================
  const [prodNome, setProdNome] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodTamanho, setProdTamanho] = useState('');
  const [prodNivelDificuldade, setProdNivelDificuldade] = useState('');
  const [prodEstoqueProducao, setProdEstoqueProducao] = useState<number>(0);
  const [prodEstoqueUnitarizado, setProdEstoqueUnitarizado] = useState<number>(0);
  const [prodQtdPadrao, setProdQtdPadrao] = useState<number>(50);
  const [prodPreco, setProdPreco] = useState<number>(0); 
  const [prodCategoriaId, setProdCategoriaId] = useState('');
  const [prodLocalId, setProdLocalId] = useState('');
  const [prodFornecedorId, setProdFornecedorId] = useState('');

  // Dados do Encarte Vinculado (encSku removido pois herdará do produto)
  const [encNome, setEncNome] = useState('');
  const [encEstoqueProducao, setEncEstoqueProducao] = useState<number>(0);
  const [encLocalId, setEncLocalId] = useState('');
  const [encPlasticoId, setEncPlasticoId] = useState(''); 

  // =========================================================
  // ESTADOS DA ABA EMBALAGEM
  // =========================================================
  const [embPlastico, setEmbPlastico] = useState('');
  const [embEstoqueProducao, setEmbEstoqueProducao] = useState<number>(0);
  const [embUnidadeMedida, setEmbUnidadeMedida] = useState('un');
  const [embLocalId, setEmbLocalId] = useState('');

  // =========================================================
  // CARREGAMENTO DOS SELECTS
  // =========================================================
  useEffect(() => {
    fetchAuxiliares();
  }, []);

  async function fetchAuxiliares() {
    setCarregandoOpcoes(true);
    try {
      const [catRes, locRes, fornRes, embRes] = await Promise.all([
        supabase.from('categorias').select('id, nome').order('nome'),
        supabase.from('locais').select('id, nome').order('nome'),
        supabase.from('fornecedores').select('id, nome').order('nome'),
        supabase.from('embalagem').select('id, plastico').order('plastico')
      ]);

      if (catRes.data) setListaCategorias(catRes.data);
      if (locRes.data) setListaLocais(locRes.data);
      if (fornRes.data) setListaFornecedores(fornRes.data);
      if (embRes.data) setListaEmbalagens(embRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados dos selects:", err);
      setErro("Não foi possível carregar as listas operacionais.");
    } finally {
      setCarregandoOpcoes(false);
    }
  }

  const limparFormularios = () => {
    setProdNome(''); setProdSku(''); setProdBarcode(''); setProdTamanho('');
    setProdNivelDificuldade(''); setProdEstoqueProducao(0); setProdEstoqueUnitarizado(0);
    setProdQtdPadrao(50); setProdPreco(0); setProdCategoriaId(''); setProdLocalId(''); setProdFornecedorId('');
    
    setEncNome(''); setEncEstoqueProducao(0); setEncLocalId(''); setEncPlasticoId('');
    
    setEmbPlastico(''); setEmbEstoqueProducao(0); setEmbUnidadeMedida('un'); setEmbLocalId('');
  };

  // =========================================================
  // PROCESSAMENTO DO CADASTRO (SUBMIT)
  // =========================================================
  async function lidarComCadastro(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);

    try {
      if (abaAtiva === 'produto_encarte') {
        if (!prodNome || !prodLocalId) throw new Error("Nome do Produto e Localização do Produto são obrigatórios!");
        if (!encNome || !encLocalId) throw new Error("Nome do Encarte e Localização do Encarte são obrigatórios!");

        // PASSO 1: Inserir o encarte salvando diretamente o prodSku na coluna sku do encarte
        const { data: encarteCriado, error: encError } = await supabase
          .from('encarte')
          .insert([{
            nome: encNome.toUpperCase(),
            // Copia diretamente o valor digitado no SKU do produto
            sku: prodSku ? (isNaN(Number(prodSku)) ? null : Number(prodSku)) : null,
            estoque_producao: encEstoqueProducao,
            local_id: encLocalId,
            plastico_id: encPlasticoId || null 
          }])
          .select('id')
          .single();

        if (encError) throw encError;
        if (!encarteCriado) throw new Error("Falha ao gerar o ID do encarte.");

        // PASSO 2: Inserir o produto vinculando o encarte_id gerado
        const { error: prodError } = await supabase.from('produtos').insert([{
          nome: prodNome.toUpperCase(),
          sku: prodSku || null,
          barcode: prodBarcode || null,
          tamanho: prodTamanho || null,
          nivel_dificuldade: prodNivelDificuldade || null,
          estoque_producao: prodEstoqueProducao,
          estoque_unitarizado: prodEstoqueUnitarizado,
          qtd_padrao: prodQtdPadrao,
          preco: prodPreco, 
          categoria_id: prodCategoriaId || null,
          local_id: prodLocalId,
          fornecedor_id: prodFornecedorId || null,
          encarte_id: encarteCriado.id 
        }]);

        if (prodError) throw prodError;
        setSucesso("Produto e Encarte integrados e amarrados com sucesso!");
        fetchAuxiliares();

      } else if (abaAtiva === 'embalagem') {
        if (!embPlastico || !embLocalId) throw new Error("Identificação do Plástico e Localização são obrigatórios!");

        const { error } = await supabase.from('embalagem').insert([{
          plastico: embPlastico.toUpperCase(),
          estoque_producao: embEstoqueProducao,
          unidade_medida: embUnidadeMedida,
          local_id: embLocalId
        }]);

        if (error) throw error;
        setSucesso("Nova Embalagem de plástico cadastrada!");
        fetchAuxiliares();
      }

      limparFormularios();
    } catch (err: any) {
      console.error(err);
      setErro(err.message || "Erro interno ao realizar o cadastro.");
    } finally {
      setEnviando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden font-sans max-w-4xl mx-auto">
      
      {/* HEADER DE ABAS */}
      <div className="bg-gray-900 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
              <PlusCircle className="text-blue-500" size={22} /> Central de Cadastro
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Gerenciamento inteligente e amarrado de estoque</p>
          </div>

          <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 w-full md:w-auto overflow-x-auto">
            <button 
              type="button"
              onClick={() => { setAbaAtiva('produto_encarte'); setErro(null); setSucesso(null); }} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${abaAtiva === 'produto_encarte' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Tag size={15} /> PRODUTO + ENCARTE VINCULADO
            </button>
            <button 
              type="button"
              onClick={() => { setAbaAtiva('embalagem'); setErro(null); setSucesso(null); }} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${abaAtiva === 'embalagem' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Package size={15} /> CADASTRO EMBALAGEM
            </button>
          </div>
        </div>
      </div>

      {/* ALERTAS */}
      {erro && <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-200"><AlertCircle size={18} /> {erro}</div>}
      {sucesso && <div className="m-6 p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-200"><Check size={18} /> {sucesso}</div>}

      {carregandoOpcoes ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Carregando tabelas operacionais...</p>
        </div>
      ) : (
        <form onSubmit={lidarComCadastro} className="p-6 md:p-8 space-y-6">
          
          {/* ========================================================= */}
          {/* ABA 1: PRODUTO + ENCARTE INTEGRADOS */}
          {/* ========================================================= */}
          {abaAtiva === 'produto_encarte' && (
            <div className="space-y-6">
              
              {/* SUB-SEÇÃO: DADOS DO PRODUTO */}
              <div className="border-b border-gray-100 pb-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-5 bg-blue-600 rounded-full"></span>
                  <h3 className="font-black text-xs text-gray-800 uppercase tracking-wider">Passo 1: Dados do Produto Bruto</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nome do Produto <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Ex: BALÃO FESTA AMARELO N9" value={prodNome} onChange={(e) => setProdNome(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">SKU do Produto (Será espelhado no encarte)</label>
                    <input type="text" placeholder="Ex: 50212" value={prodSku} onChange={(e) => setProdSku(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Código de Barras (EAN)</label>
                    <input type="text" placeholder="Ex: 7891234567890" value={prodBarcode} onChange={(e) => setProdBarcode(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 flex items-center gap-0.5"><DollarSign size={11} className="text-green-600" /> Preço do Produto</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={prodPreco} onChange={(e) => setProdPreco(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none text-gray-800" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Tamanho / Dimensões</label>
                    <input type="text" placeholder="Ex: G, 9 POLEGADAS" value={prodTamanho} onChange={(e) => setProdTamanho(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nível de Dificuldade</label>
                    <select value={prodNivelDificuldade} onChange={(e) => setProdNivelDificuldade(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none">
                      <option value="">Selecione...</option>
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                      <option value="Difícil">Difícil</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Quantidade Padrão Alvo</label>
                    <input type="number" min="0" value={prodQtdPadrao} onChange={(e) => setProdQtdPadrao(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none" />
                  </div>

                  {/* Estoques Iniciais */}
                  <div className="md:col-span-2 lg:col-span-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-blue-900 uppercase block mb-1">Estoque Produção / Bruto Inicial</label>
                      <input type="number" min="0" value={prodEstoqueProducao} onChange={(e) => setProdEstoqueProducao(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-black text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-blue-900 uppercase block mb-1">Estoque Unitarizado / Final Inicial</label>
                      <input type="number" min="0" value={prodEstoqueUnitarizado} onChange={(e) => setProdEstoqueUnitarizado(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-black text-sm bg-white" />
                    </div>
                  </div>

                  {/* Selects Humanos do Produto */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 flex items-center gap-1"><Layers size={11} /> Categoria</label>
                    <select value={prodCategoriaId} onChange={(e) => setProdCategoriaId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none">
                      <option value="">Nenhuma Categoria...</option>
                      {listaCategorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 flex items-center gap-1"><MapPin size={11} /> Local / Galpão Produto <span className="text-red-500">*</span></label>
                    <select required value={prodLocalId} onChange={(e) => setProdLocalId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none">
                      <option value="">Selecione um local...</option>
                      {listaLocais.map(loc => <option key={loc.id} value={loc.id}>{loc.nome.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 flex items-center gap-1"><Building2 size={11} /> Fornecedor</label>
                    <select value={prodFornecedorId} onChange={(e) => setProdFornecedorId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-blue-500 outline-none">
                      <option value="">Nenhum Fornecedor...</option>
                      {listaFornecedores.map(forn => <option key={forn.id} value={forn.id}>{forn.nome.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SUB-SEÇÃO: DADOS DO ENCARTE E EMBALAGEM AMARRADA */}
              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-5 bg-amber-600 rounded-full"></span>
                  <h3 className="font-black text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} /> Passo 2: Dados do Encarte Vinculado
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">Nome do Encarte <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Ex: ENCARTE BALÃO AMARELO MODELO PADRÃO" value={encNome} onChange={(e) => setEncNome(e.target.value)} className="w-full px-3 py-2.5 border border-amber-200 rounded-xl font-bold text-xs uppercase bg-white focus:border-amber-500 outline-none" />
                  </div>

                  {/* Informamos visualmente ao usuário que o SKU do encarte será herdado */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">SKU do Encarte</label>
                    <div className="w-full px-3 py-2.5 bg-amber-100/60 border border-amber-200 text-amber-900 rounded-xl text-xs font-mono font-bold select-none">
                      {prodSku ? `VAI COPIAR: ${prodSku}` : "Preencha o SKU do produto acima"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">Estoque Inicial do Encarte</label>
                    <input type="number" min="0" value={encEstoqueProducao} onChange={(e) => setEncEstoqueProducao(Number(e.target.value))} className="w-full px-3 py-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-white focus:border-amber-500 outline-none" />
                  </div>

                  {/* SELECT HUMANO: QUAL EMBALAGEM / PLÁSTICO ESSE ENCARTE VAI UTILIZAR */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-800 block mb-1 flex items-center gap-1"><Package size={11} /> Embalagem / Plástico Vinculado</label>
                    <select value={encPlasticoId} onChange={(e) => setEncPlasticoId(e.target.value)} className="w-full px-3 py-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-white focus:border-amber-500 outline-none">
                      <option value="">Selecione a embalagem correspondente...</option>
                      {listaEmbalagens.map(emb => <option key={emb.id} value={emb.id}>{emb.plastico.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-800 block mb-1 flex items-center gap-1"><MapPin size={11} /> Local / Galpão do Encarte <span className="text-red-500">*</span></label>
                    <select required value={encLocalId} onChange={(e) => setEncLocalId(e.target.value)} className="w-full px-3 py-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-white focus:border-amber-500 outline-none">
                      <option value="">Selecione o local do encarte...</option>
                      {listaLocais.map(loc => <option key={loc.id} value={loc.id}>{loc.nome.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: EMBALAGEM INDEPENDENTE */}
          {/* ========================================================= */}
          {abaAtiva === 'embalagem' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-purple-800 block mb-1">Identificação / Tipo do Plástico <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="Ex: PLÁSTICO PP TRANSPARENTE 15X25" value={embPlastico} onChange={(e) => setEmbPlastico(e.target.value)} className="w-full px-3 py-2.5 border border-purple-200 rounded-xl font-bold text-xs uppercase bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-purple-800 block mb-1">Unidade de Estoque</label>
                <select value={embUnidadeMedida} onChange={(e) => setEmbUnidadeMedida(e.target.value)} className="w-full px-3 py-2.5 border border-purple-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none">
                  <option value="un">UNIDADE (UN)</option>
                  <option value="kg">QUILOGRAMA (KG)</option>
                  <option value="pct">PACOTE (PCT)</option>
                  <option value="m">METRO (M)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-purple-800 block mb-1">Estoque Produção Inicial</label>
                <input type="number" min="0" value={embEstoqueProducao} onChange={(e) => setEmbEstoqueProducao(Number(e.target.value))} className="w-full px-3 py-2.5 border border-purple-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-purple-800 block mb-1 flex items-center gap-1"><MapPin size={11} /> Localização / Galpão Alvo <span className="text-red-500">*</span></label>
                <select required value={embLocalId} onChange={(e) => setEmbLocalId(e.target.value)} className="w-full px-3 py-2.5 border border-purple-200 rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none">
                  <option value="">Selecione um local...</option>
                  {listaLocais.map(loc => <option key={loc.id} value={loc.id}>{loc.nome.toUpperCase()}</option>)}
                </select>
              </div>

            </div>
          )}

          {/* BOTÕES DE SALVAMENTO */}
          <div className="flex gap-2 pt-4 border-t border-gray-100 justify-end">
            <button 
              type="button" 
              onClick={limparFormularios} 
              className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 cursor-pointer transition-all"
            >
              Limpar Tudo
            </button>
            <button 
              type="submit" 
              disabled={enviando} 
              className={`px-6 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all
                ${abaAtiva === 'produto_encarte' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Amarrando e Gravando...
                </>
              ) : (
                <>
                  <PlusCircle size={14} />
                  Salvar Cadastro Integrado
                </>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}