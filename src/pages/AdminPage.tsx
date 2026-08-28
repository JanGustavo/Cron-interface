import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'pro';
  role: string;
  isVerified: boolean;
  totalJobs: number;
  aiQueriesUsed: number;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalJobs: number;
}

export const AdminPage: React.FC = () => {
  const { showToast, setActiveTab } = useUiStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/v1/admin/stats'),
        api.get('/v1/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
      showToast('Erro ao carregar painel administrativo.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Check Admin security status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await api.get('/v1/admin/me');
        if (res.data?.isAdmin) {
          setIsAdmin(true);
          fetchAdminData();
        } else {
          setIsAdmin(false);
          showToast('Acesso negado: Rota exclusiva para Administradores.', 'error');
          setActiveTab('dashboard');
        }
      } catch (err) {
        console.error('Falha ao verificar autorização ADM:', err);
        setIsAdmin(false);
        showToast('Acesso restrito. Redirecionando...', 'error');
        setActiveTab('dashboard');
      }
    };

    checkAdmin();
  }, [fetchAdminData, setActiveTab, showToast]);

  const handleTogglePlan = async (user: AdminUser) => {
    const targetPlan = user.plan === 'pro' ? 'free' : 'pro';
    setUpdatingUserId(user.id);
    try {
      await api.put(`/v1/admin/users/${user.id}/plan`, { plan: targetPlan });
      showToast(`Plano de ${user.email} alterado para ${targetPlan.toUpperCase()} com sucesso! ✨`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(`Erro ao alterar plano: ${err.response?.data?.error || 'falha na requisição'}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleResetAI = async (user: AdminUser) => {
    setUpdatingUserId(user.id);
    try {
      await api.post(`/v1/admin/users/${user.id}/reset-ai`);
      showToast(`Cota de IA de ${user.email} resetada para 0 (3 testes grátis renovados)! 🔄`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(`Erro ao resetar IA: ${err.response?.data?.error || 'falha na requisição'}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleVerify = async (user: AdminUser) => {
    setUpdatingUserId(user.id);
    const nextVerifyState = !user.isVerified;
    try {
      await api.post(`/v1/admin/users/${user.id}/verify`, { verified: nextVerifyState });
      showToast(nextVerifyState ? `E-mail de ${user.email} verificado com sucesso! ✉️` : `Verificação de ${user.email} desmarcada.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(`Erro ao alterar verificação: ${err.response?.data?.error || 'falha na requisição'}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`⚠️ Tem certeza absoluta que deseja excluir a conta de "${user.email}"?\n\nEsta ação é irreversível e excluirá permanentemente todos os jobs e dados vinculados.`)) {
      return;
    }
    setUpdatingUserId(user.id);
    try {
      await api.delete(`/v1/admin/users/${user.id}`);
      showToast(`Conta de ${user.email} excluída com sucesso! 🗑️`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(`Erro ao excluir conta: ${err.response?.data?.error || 'falha na requisição'}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-red-400">Acesso Restrito ao Sistema</h2>
        <p className="text-xs text-slate-400 mt-1">Você não possui permissões administrativas para visualizar este painel.</p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0d1d]/80 p-5 rounded-2xl border border-purple-900/40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 shadow-inner">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Painel de Controle Administrador</span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                ADM Master
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerenciamento global de contas, concessão de planos PRO e renovação de cotas de IA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAdminData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/25 text-cyan-300 text-xs font-bold hover:bg-indigo-900/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>🔄 Atualizar Dados</span>
        </button>
      </div>

      {/* System Telemetry Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-indigo-950/50 bg-[#070913]/90 shadow-lg space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">Total Usuários</span>
            <div className="text-2xl font-black text-slate-100 font-mono">{stats.totalUsers}</div>
          </div>
          <div className="p-4 rounded-2xl border border-emerald-950/40 bg-[#070913]/90 shadow-lg space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold font-mono">Assinantes PRO ✨</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.proUsers}</div>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-[#070913]/90 shadow-lg space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">Usuários Free</span>
            <div className="text-2xl font-black text-slate-300 font-mono">{stats.freeUsers}</div>
          </div>
          <div className="p-4 rounded-2xl border border-cyan-950/40 bg-[#070913]/90 shadow-lg space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold font-mono">Jobs no Sistema</span>
            <div className="text-2xl font-black text-cyan-400 font-mono">{stats.totalJobs}</div>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <div className="bg-[#070913]/95 rounded-2xl border border-indigo-950/60 p-5 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Contas de Usuários Cadastrados ({filteredUsers.length})
            </h3>
            <p className="text-xs text-slate-400">Altere planos instantaneamente ou renovações de IA.</p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0a0d1d] border border-indigo-950/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
            Carregando usuários do sistema...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Nenhum usuário encontrado com a busca "{search}".
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-indigo-950/40">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-indigo-950/30 text-slate-400 uppercase text-[9px] tracking-wider border-b border-indigo-950/50">
                  <th className="p-3 font-bold">Usuário / E-mail</th>
                  <th className="p-3 font-bold">Plano Atual</th>
                  <th className="p-3 font-bold">Role</th>
                  <th className="p-3 font-bold">Jobs</th>
                  <th className="p-3 font-bold">Uso IA</th>
                  <th className="p-3 font-bold">Verificado</th>
                  <th className="p-3 font-bold text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-950/30 text-slate-300">
                {filteredUsers.map((u) => {
                  const isUserPro = u.plan === 'pro';
                  const isAdminRole = u.role === 'admin';
                  return (
                    <tr key={u.id} className="hover:bg-indigo-950/15 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">{u.fullName || 'Sem Nome'}</div>
                        <div className="text-[10.5px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="p-3">
                        {isUserPro ? (
                          <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                            PRO ✨
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[8.5px] font-bold uppercase rounded bg-slate-900 text-slate-400 border border-slate-800">
                            FREE
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {isAdminRole ? (
                          <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                            ADMIN
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">USER</span>
                        )}
                      </td>

                      <td className="p-3 font-bold text-slate-200">{u.totalJobs}</td>

                      <td className="p-3">
                        <span className={`font-bold ${u.aiQueriesUsed >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {u.aiQueriesUsed}/3
                        </span>
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          disabled={updatingUserId === u.id}
                          onClick={() => handleToggleVerify(u)}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                            u.isVerified
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-500/30'
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-emerald-950/40 hover:text-emerald-300 font-extrabold'
                          }`}
                          title={u.isVerified ? "Clique para desmarcar verificação" : "Clique para verificar e-mail manualmente"}
                        >
                          {u.isVerified ? '✓ Sim' : '⚡ Ativar E-mail'}
                        </button>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleToggleVerify(u)}
                            className={`px-2.5 py-1 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                              u.isVerified
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40'
                                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 font-black shadow-md shadow-emerald-500/10'
                            }`}
                            title="Ativar verificação de e-mail manualmente"
                          >
                            {u.isVerified ? '✉️ Verificado' : '✉️ Ativar E-mail'}
                          </button>

                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleTogglePlan(u)}
                            className={`px-2.5 py-1 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                              isUserPro
                                ? 'bg-amber-950/30 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
                                : 'bg-purple-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-900/60 shadow-md shadow-purple-500/10'
                            }`}
                          >
                            {isUserPro ? 'Reverter FREE' : '⚡ Ativar Plano PRO'}
                          </button>

                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleResetAI(u)}
                            className="px-2.5 py-1 rounded text-[9.5px] font-bold bg-indigo-950/40 border border-indigo-500/30 text-cyan-300 hover:bg-indigo-900/60 transition-all cursor-pointer"
                            title="Resetar cota de IA do usuário para 0"
                          >
                            🔄 Reset IA
                          </button>

                          <button
                            type="button"
                            disabled={updatingUserId === u.id || isAdminRole}
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1 rounded text-[9.5px] font-bold bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/60 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isAdminRole ? "Não é possível excluir contas ADM" : "Excluir conta permanentemente"}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
