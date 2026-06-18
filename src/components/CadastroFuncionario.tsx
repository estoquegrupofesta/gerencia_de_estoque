import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  UserPlus, User, Phone, Briefcase, 
  Trash2, Ban, UserMinus, UserCheck, Search, ShieldCheck, Edit2, Save, X 
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  telefone: string;
  cargo: string;
  status: 'ativo' | 'inativo' | 'afastado';
}

export function CadastroFuncionario() {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pesquisa, setPesquisa] = useState('');
  
  // Estados para Edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: '', telefone: '', cargo: '' });

  const [formData, setFormData] = useState({ nome: '', telefone: '', cargo: '' });

  async function loadFuncionarios() {
    const { data } = await supabase.from('funcionarios').select('*').order('nome');
    if (data) setFuncionarios(data as Funcionario[]);
  }

  useEffect(() => { loadFuncionarios(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('funcionarios').insert([{ ...formData, status: 'ativo' }]);
      if (error) throw error;
      setSucesso(true);
      setFormData({ nome: '', telefone: '', cargo: '' });
      loadFuncionarios();
      setTimeout(() => setSucesso(false), 3000);
    } catch (error: any) {
      alert('Erro ao cadastrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const iniciarEdicao = (f: Funcionario) => {
    setEditandoId(f.id);
    setEditFormData({ nome: f.nome, telefone: f.telefone, cargo: f.cargo });
  };

  async function salvarEdicao(id: string) {
    const { error } = await supabase.from('funcionarios')
      .update({ nome: editFormData.nome, telefone: editFormData.telefone, cargo: editFormData.cargo })
      .eq('id', id);
    if (error) alert(error.message);
    else { setEditandoId(null); loadFuncionarios(); }
  }

  async function updateStatus(id: string, novoStatus: string) {
    const { error } = await supabase.from('funcionarios').update({ status: novoStatus }).eq('id', id);
    if (error) alert(error.message);
    else loadFuncionarios();
  }

  async function removeFuncionario(id: string) {
    if (!confirm("Remover permanentemente?")) return;
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) alert(error.message);
    else loadFuncionarios();
  }

  const filtrados = funcionarios.filter(f => f.nome.toLowerCase().includes(pesquisa.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      
      {/* SEÇÃO 1: CADASTRO (DESIGN ORIGINAL) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck size={24} /> Novo Funcionário
            </h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Equipe Interna</p>
          </div>
          <UserPlus size={24} className="opacity-20" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input required type="text" placeholder="Nome completo" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-text"
                value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input required type="text" placeholder="(00) 00000-0000" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-text"
                value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Cargo</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input required type="text" placeholder="Função" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-text"
                value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="md:col-span-3 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all cursor-pointer active:scale-95 shadow-lg">
             {loading ? 'Processando...' : sucesso ? 'Cadastrado!' : 'Confirmar Cadastro'}
          </button>
        </form>
      </div>

      {/* SEÇÃO 2: GESTÃO (DESIGN ORIGINAL COM EDIÇÃO) */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Gestão de Equipe</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs font-bold outline-none"
              value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo / Contato</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(f => (
                <tr key={f.id} className="hover:bg-gray-50/30 transition-colors">
                  {editandoId === f.id ? (
                    /* MODO EDIÇÃO */
                    <>
                      <td className="px-6 py-4"><input className="w-full p-2 text-xs border rounded font-bold" value={editFormData.nome} onChange={e => setEditFormData({...editFormData, nome: e.target.value})} /></td>
                      <td className="px-6 py-4 space-y-1">
                        <input className="w-full p-1 text-[10px] border rounded text-blue-600 font-black uppercase" value={editFormData.cargo} onChange={e => setEditFormData({...editFormData, cargo: e.target.value})} />
                        <input className="w-full p-1 text-[10px] border rounded font-bold" value={editFormData.telefone} onChange={e => setEditFormData({...editFormData, telefone: e.target.value})} />
                      </td>
                      <td className="px-6 py-4">---</td>
                      <td className="px-6 py-4 text-center flex justify-center gap-2">
                        <button onClick={() => salvarEdicao(f.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer"><Save size={18}/></button>
                        <button onClick={() => setEditandoId(null)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><X size={18}/></button>
                      </td>
                    </>
                  ) : (
                    /* MODO VISUALIZAÇÃO ORIGINAL */
                    <>
                      <td className="px-6 py-4 font-bold text-gray-800 uppercase text-xs">{f.nome}</td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-blue-600 font-black uppercase">{f.cargo}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{f.telefone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                          f.status === 'ativo' ? 'bg-green-100 text-green-600' : 
                          f.status === 'inativo' ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-600'
                        }`}>{f.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {/* BOTÃO EDITAR ADICIONADO */}
                          <button onClick={() => iniciarEdicao(f)} title="Editar" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"><Edit2 size={16}/></button>
                          
                          {/* BOTÕES DE AÇÕES RÁPIDAS MANTIDOS */}
                          <button onClick={() => updateStatus(f.id, 'ativo')} title="Ativar" className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all cursor-pointer"><UserCheck size={16}/></button>
                          <button onClick={() => updateStatus(f.id, 'inativo')} title="Pausar" className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"><UserMinus size={16}/></button>
                          <button onClick={() => updateStatus(f.id, 'afastado')} title="Afastar" className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all cursor-pointer"><Ban size={16}/></button>
                          <div className="w-[1px] h-4 bg-gray-100 mx-1 self-center" />
                          <button onClick={() => removeFuncionario(f.id)} title="Excluir" className="p-2 text-gray-300 hover:text-red-600 rounded-lg transition-all cursor-pointer"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}