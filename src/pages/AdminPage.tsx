import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import Swal from 'sweetalert2';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'pro';
  role: string;
  isVerified: boolean;
  totalJobs: number;
  aiQueriesUsed: number;
  billingCycle?: 'monthly' | 'yearly' | 'none' | string;
  currentPeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  subscriptionStatus?: string;
  billingProvider?: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  asaasUrl?: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalJobs: number;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubs: number;
  canceledSubs: number;
  churnRate: number;
  ltv: number;
  planDistribution?: Record<string, number>;
}

interface GrowthPoint {
  date: string;
  total: number;
  free: number;
  pro: number;
}

interface JobTrendPoint {
  date: string;
  total: number;
  success: number;
  failed: number;
  timeout: number;
  success_rate: number;
  avg_duration: number;
  max_duration: number;
}

interface JobAnalytics {
  period: string;
  data: JobTrendPoint[];
  totals: {
    total_executions: number;
    total_success: number;
    total_failed: number;
    success_rate: number;
  };
}

interface SystemHealth {
  database: { status: string; latency: number };
  redis: { status: string; latency: number };
  queue: { size: number; active: number };
  ai: Record<string, string>;
  timestamp: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: string;
  timestamp: string;
}

interface TopUser {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'pro';
  mrr: number;
  totalJobs: number;
  lastActivity: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatExpirationDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getDaysRemaining = (value?: string | null) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

export const AdminPage: React.FC = () => {
  const { showToast, setActiveTab } = useUiStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
  const [jobAnalytics, setJobAnalytics] = useState<JobAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const handleOpenUserModal = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setShowUserModal(true);
  }, []);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

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

  const fetchCEOData = useCallback(async (selectedPeriod: '7d' | '30d' | '90d' = period) => {
    setMetricsLoading(true);
    try {
      const [revenueRes, growthRes, jobsRes, healthRes] = await Promise.all([
        api.get('/v1/admin/metrics/revenue'),
        api.get(`/v1/admin/metrics/users/growth?period=${selectedPeriod}`),
        api.get(`/v1/admin/metrics/jobs?period=${selectedPeriod}`),
        api.get('/v1/admin/metrics/system/health'),
      ]);

      setRevenueMetrics(revenueRes.data);
      setGrowthData(Array.isArray(growthRes.data?.data) ? growthRes.data.data : []);
      setJobAnalytics(jobsRes.data);
      setSystemHealth(healthRes.data);
    } catch (err) {
      console.error('Erro ao carregar métricas de CEO:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, [period]);

  // Check Admin security status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await api.get('/v1/admin/me');
        if (res.data?.isAdmin) {
          setIsAdmin(true);
          void fetchAdminData();
          void fetchCEOData(period);
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
    void fetchTopUsers();
    void fetchAuditLogs();
  }, [fetchAdminData, fetchCEOData, period, setActiveTab, showToast]);

  const fetchTopUsers = useCallback(async () => {
    try {
      const res = await api.get('/v1/admin/users');
      const users = res.data?.users || [];
      const proUsers = users
        .filter((u: AdminUser) => u.plan === 'pro')
        .sort((a: AdminUser, b: AdminUser) => (b.totalJobs ?? 0) - (a.totalJobs ?? 0))
        .slice(0, 10)
        .map((u: AdminUser) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName || 'Sem Nome',
          plan: u.plan,
          mrr: u.plan === 'pro' ? 97 : 0,
          totalJobs: u.totalJobs ?? 0,
          lastActivity: u.createdAt,
        }));
      setTopUsers(proUsers);
    } catch (err) {
      console.error('Erro ao buscar top usuários:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/v1/admin/audit-logs');
      setAuditLogs(res.data?.data || []);
    } catch (err) {
      console.error('Erro ao carregar audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const exportUsersCSV = useCallback(async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/v1/admin/export/users', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Exportação CSV iniciada! 📊', 'success');
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      showToast('Erro ao exportar CSV', 'error');
    } finally {
      setExportLoading(false);
    }
  }, [showToast]);

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
    const result = await Swal.fire({
      title: 'Excluir Usuário Permanentemente?',
      html: `Tem certeza que deseja excluir a conta de <b>${user.email}</b>?<br/><span style="color:#f43f5e;font-size:11.5px;margin-top:6px;display:block;">⚠️ Esta ação é irreversível e excluirá permanentemente todos os jobs e dados vinculados.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, Excluir Usuário',
      cancelButtonText: 'Cancelar',
      background: '#080b18',
      color: '#cbd5e1',
      iconColor: '#f43f5e',
      customClass: {
        popup: 'swal2-dark-custom rounded-3xl border border-rose-950/60 bg-[#090c15] text-slate-100 p-6',
        title: 'text-rose-400 font-extrabold text-base',
        htmlContainer: 'text-slate-400 text-xs leading-relaxed mt-2',
        confirmButton: 'px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.35)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/50',
        cancelButton: 'px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-indigo-950/80 rounded-xl transition-all cursor-pointer focus:outline-none ml-2',
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

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

  const growthDelta = useMemo(() => {
    if (growthData.length < 2) return 0;
    const last = growthData[growthData.length - 1]?.total ?? 0;
    const previous = growthData[growthData.length - 2]?.total ?? 0;
    return last - previous;
  }, [growthData]);

  const planEntries = useMemo(() => {
    const distribution = revenueMetrics?.planDistribution ?? { free: stats?.freeUsers ?? 0, pro: stats?.proUsers ?? 0 };
    const total = Math.max(Object.values(distribution).reduce((sum, value) => sum + Number(value || 0), 0), 1);

    return Object.entries(distribution).map(([plan, count]) => ({
      plan,
      count: Number(count || 0),
      percentage: (Number(count || 0) / total) * 100,
    }));
  }, [revenueMetrics, stats]);

  const productSuccessRate = jobAnalytics?.totals.success_rate ?? 0;
  const totalUsersCount = stats?.totalUsers ?? users.length ?? 0;
  const proUsersCount = stats?.proUsers ?? revenueMetrics?.planDistribution?.pro ?? 0;
  const freeUsersCount = stats?.freeUsers ?? revenueMetrics?.planDistribution?.free ?? 0;
  const proShare = totalUsersCount > 0 ? (proUsersCount / totalUsersCount) * 100 : 0;
  const freeShare = totalUsersCount > 0 ? (freeUsersCount / totalUsersCount) * 100 : 0;
  const conversionTarget = 45;
  const targetGap = proShare - conversionTarget;

  return (
    <>
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

        <button
          type="button"
          onClick={exportUsersCSV}
          disabled={exportLoading}
          className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 text-xs font-bold hover:bg-emerald-900/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>{exportLoading ? 'Exportando...' : '📊 Exportar CSV'}</span>
        </button>

        <button
          type="button"
          onClick={() => { setShowAuditModal(true); void fetchAuditLogs(); }}
          disabled={auditLoading}
          className="px-3.5 py-2 rounded-xl bg-violet-950/60 border border-violet-500/25 text-violet-300 text-xs font-bold hover:bg-violet-900/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>{auditLoading ? 'Carregando...' : '📋 Audit Logs'}</span>
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

      {/* CEO Dashboard Section */}
      <div className="bg-[#070913]/95 rounded-2xl border border-cyan-950/60 p-5 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="text-cyan-300">CEO Dashboard</span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                EXECUTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">Resumo financeiro, crescimento e saúde da operação.</p>
          </div>

          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPeriod(option);
                  void fetchCEOData(option);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  period === option
                    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-950/30'
                    : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:border-cyan-500/20 hover:text-cyan-300'
                }`}
              >
                {option}
              </button>
            ))}

            <button
              type="button"
              onClick={() => void fetchCEOData(period)}
              disabled={metricsLoading}
              className="px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold hover:bg-cyan-900/60 transition-all disabled:opacity-50"
            >
              {metricsLoading ? 'Atualizando...' : 'Atualizar KPI'}
            </button>
          </div>
        </div>

        {revenueMetrics || jobAnalytics || systemHealth ? (
          <>
            {/* Health Score Hero Card */}
            <div className="relative rounded-3xl border border-cyan-600/50 bg-gradient-to-br from-cyan-950/40 to-cyan-950/20 p-6 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🏥</span>
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Saúde Operacional</h2>
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded border ${productSuccessRate >= 95 ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : productSuccessRate >= 90 ? 'bg-yellow-950/80 border-yellow-500/40 text-yellow-300' : 'bg-rose-950/80 border-rose-500/40 text-rose-300'}`}>
                      {productSuccessRate.toFixed(1)}% Online
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <div className="text-4xl font-black text-cyan-300 font-mono tracking-tighter">{productSuccessRate.toFixed(0)}</div>
                      <span className="text-sm text-slate-400 font-mono">Taxa de Sucesso</span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-md">Métrica combinada de disponibilidade de sistema, processamento de jobs e saúde de banco de dados.</p>
                  </div>
                </div>
                <div className="lg:flex-none flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                    <div className="absolute inset-1 rounded-full border-2 border-cyan-500/30" />
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Health</div>
                      <div className="text-3xl font-black text-cyan-300 font-mono">{Math.min(100, productSuccessRate + 5).toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Revenue KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="group rounded-2xl border border-cyan-600/40 bg-gradient-to-br from-cyan-950/30 to-cyan-950/10 p-5 hover:border-cyan-500/60 transition-all hover:shadow-lg hover:shadow-cyan-950/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-black">MRR</span>
                  <span className="text-lg group-hover:scale-110 transition-transform">💰</span>
                </div>
                <div className="text-2xl font-black text-cyan-200 font-mono leading-tight">{currencyFormatter.format(revenueMetrics?.mrr ?? 0)}</div>
                <div className="mt-2 text-[9px] text-cyan-400/60 font-mono">Receita Recorrente Mensal</div>
              </div>
              <div className="group rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950/30 to-emerald-950/10 p-5 hover:border-emerald-500/60 transition-all hover:shadow-lg hover:shadow-emerald-950/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-black">ARR</span>
                  <span className="text-lg group-hover:scale-110 transition-transform">📈</span>
                </div>
                <div className="text-2xl font-black text-emerald-200 font-mono leading-tight">{currencyFormatter.format(revenueMetrics?.arr ?? 0)}</div>
                <div className="mt-2 text-[9px] text-emerald-400/60 font-mono">Receita Anual</div>
              </div>
              <div className="group rounded-2xl border border-purple-600/40 bg-gradient-to-br from-purple-950/30 to-purple-950/10 p-5 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-950/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-purple-400 font-black">Assinantes</span>
                  <span className="text-lg group-hover:scale-110 transition-transform">👥</span>
                </div>
                <div className="text-2xl font-black text-purple-200 font-mono leading-tight">{revenueMetrics?.activeSubs ?? 0}</div>
                <div className={`mt-2 text-[9px] font-mono ${growthDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {growthDelta >= 0 ? '↗ +' : '↘ '}{growthDelta} este período
                </div>
              </div>
              <div className="group rounded-2xl border border-amber-600/40 bg-gradient-to-br from-amber-950/30 to-amber-950/10 p-5 hover:border-amber-500/60 transition-all hover:shadow-lg hover:shadow-amber-950/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black">Churn</span>
                  <span className="text-lg group-hover:scale-110 transition-transform">⚠️</span>
                </div>
                <div className="text-2xl font-black text-amber-200 font-mono leading-tight">{(revenueMetrics?.churnRate ?? 0).toFixed(1)}%</div>
                <div className="mt-2 text-[9px] text-amber-400/60 font-mono">{revenueMetrics?.canceledSubs ?? 0} cancelamentos</div>
              </div>
              <div className="group rounded-2xl border border-fuchsia-600/40 bg-gradient-to-br from-fuchsia-950/30 to-fuchsia-950/10 p-5 hover:border-fuchsia-500/60 transition-all hover:shadow-lg hover:shadow-fuchsia-950/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-fuchsia-400 font-black">LTV</span>
                  <span className="text-lg group-hover:scale-110 transition-transform">💎</span>
                </div>
                <div className="text-2xl font-black text-fuchsia-200 font-mono leading-tight">{currencyFormatter.format(revenueMetrics?.ltv ?? 0)}</div>
                <div className="mt-2 text-[9px] text-fuchsia-400/60 font-mono">Valor do Ciclo de Vida</div>
              </div>
            </div>

            {/* Business Metrics & Conversion */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gradient-to-r border-cyan-600/40 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">🎯 Mix de Clientes</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-300 font-bold">Plano PRO</span>
                      <span className="text-xl font-black text-cyan-300 font-mono">{proShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{width: `${proShare}%`}} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">Plano FREE</span>
                      <span className="text-xl font-black text-slate-300 font-mono">{freeShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-slate-500 to-slate-400 rounded-full" style={{width: `${freeShare}%`}} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-600/40 bg-gradient-to-br from-purple-950/30 to-purple-950/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-purple-300">📊 Conversão PRO</span>
                  <span className={`px-2 py-1 rounded text-[8px] font-black border ${proShare >= conversionTarget ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-yellow-950/80 border-yellow-500/40 text-yellow-300'}`}>
                    {proShare >= conversionTarget ? '✓ No Alvo' : 'Expandir'}
                  </span>
                </div>
                <div className="text-4xl font-black text-purple-300 font-mono mb-2">{proShare.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div>{proUsersCount} usuários PRO</div>
                  <div>de {totalUsersCount} totais</div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950/30 to-emerald-950/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-300">🚀 Meta de Expansão</span>
                </div>
                <div className="text-4xl font-black text-emerald-300 font-mono mb-2">+{Math.max(0, targetGap).toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div>pontos percentuais</div>
                  <div>para atingir {conversionTarget.toFixed(0)}%</div>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-950/40 text-[9px] text-emerald-400/70 font-mono">
                  {Math.max(0, Math.ceil((conversionTarget - proShare) / 100 * totalUsersCount))} conversões necessárias
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid xl:grid-cols-[1.6fr_0.9fr] gap-4">
              <div className="rounded-2xl border border-indigo-600/40 bg-gradient-to-br from-indigo-950/30 to-indigo-950/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Crescimento de Usuários</h4>
                  <span className="text-[10px] text-indigo-400 font-mono">Últimos 30 dias</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData.length ? growthData : [{ date: 'N/A', total: 0, free: 0, pro: 0 }]}
                      margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={18} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#060b18',
                          border: '1px solid rgba(59,130,246,0.4)',
                          borderRadius: '14px',
                          color: '#e2e8f0',
                        }}
                        formatter={(value, name) => {
                          const safeValue = typeof value === 'number' || typeof value === 'string' ? value : 0;
                          return [safeValue, name === 'total' ? 'Total' : name === 'pro' ? 'PRO' : 'FREE'];
                        }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} fill="url(#growthFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-600/40 bg-gradient-to-br from-indigo-950/30 to-indigo-950/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Distribuição de Planos</h4>
                  <span className="text-[10px] text-indigo-400 font-mono">Usuários Ativos</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planEntries.map(({ plan, count }) => ({ name: plan, value: count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {planEntries.map(({ plan }, index) => (
                          <Cell key={`${plan}-${index}`} fill={plan === 'pro' ? '#a78bfa' : '#22d3ee'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [typeof value === 'number' || typeof value === 'string' ? value : 0, 'Usuários']}
                        contentStyle={{ backgroundColor: '#060b18', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '14px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5 text-[10px] text-slate-300">
                  {planEntries.map(({ plan, count, percentage }) => (
                    <div key={plan} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full ${plan === 'pro' ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                        <span className="uppercase">{plan}</span>
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-bold">{count}</span>
                        <span className="text-slate-400">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid xl:grid-cols-[1.4fr_1fr] gap-4">
              <div className="rounded-2xl border border-indigo-600/40 bg-gradient-to-br from-indigo-950/30 to-indigo-950/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Execuções de Jobs</h4>
                  <span className="text-[10px] text-indigo-400 font-mono">Últimos 30 dias</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobAnalytics?.data ?? []} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={18} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#060b18', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '14px' }}
                      />
                      <Bar dataKey="success" fill="#34d399" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="failed" fill="#f87171" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-600/40 bg-gradient-to-br from-indigo-950/30 to-indigo-950/10 p-5">
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-2">
                    <span>🔧 Infraestrutura</span>
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2.5 transition-all hover:border-emerald-700/60">
                    <span className="text-emerald-300 font-medium">📦 Banco de dados</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[9px] ${systemHealth?.database.status === 'healthy' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'}`}>
                      {systemHealth?.database.status === 'healthy' ? '✓ OK' : '⚠ Alerta'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-3 py-2.5 transition-all hover:border-cyan-700/60">
                    <span className="text-cyan-300 font-medium">⚡ Redis</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[9px] ${systemHealth?.redis.status === 'healthy' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'}`}>
                      {systemHealth?.redis.status === 'healthy' ? '✓ OK' : '⚠ Alerta'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-purple-800/40 bg-purple-950/20 px-3 py-2.5 transition-all hover:border-purple-700/60">
                    <span className="text-purple-300 font-medium">📋 Fila</span>
                    <span className="font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded text-[9px] font-mono">{systemHealth?.queue.size ?? 0} itens</span>
                  </div>
                  <div className="pt-2.5 mt-2.5 border-t border-indigo-950/50">
                    <div className="text-[9px] text-indigo-400/70 font-mono">↻ {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString('pt-BR') : 'Tempo real'}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Carregando métricas do executivo...
          </div>
        )}
      </div>

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
                  <th className="p-3 font-bold">Plano</th>
                  <th className="p-3 font-bold">Ciclo</th>
                  <th className="p-3 font-bold">Data Limite</th>
                  <th className="p-3 font-bold">Fatura / Asaas</th>
                  <th className="p-3 font-bold">Role</th>
                  <th className="p-3 font-bold">Jobs</th>
                  <th className="p-3 font-bold">Uso IA</th>
                  <th className="p-3 font-bold">Verificado</th>
                  <th className="p-3 font-bold text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-950/30 text-slate-300">
                {filteredUsers.map((u, idx) => {
                  const isUserPro = u.plan === 'pro';
                  const isAdminRole = u.role === 'admin';
                  const daysRemaining = getDaysRemaining(u.currentPeriodEnd);
                  const isYearly = u.billingCycle === 'yearly';

                  // Alternância de tons (zebra striping) + bordas douradas para PRO
                  const rowBg = isUserPro
                    ? (idx % 2 === 0 ? 'bg-amber-500/[0.04]' : 'bg-amber-500/[0.02]')
                    : (idx % 2 === 0 ? 'bg-slate-950/60' : 'bg-slate-900/30');

                  const borderClass = isUserPro
                    ? 'border-l-4 border-l-amber-400/90 shadow-[inset_0_0_15px_rgba(245,158,11,0.04)] hover:bg-amber-500/[0.08]'
                    : 'border-l-4 border-l-transparent hover:bg-indigo-950/20';

                  return (
                    <tr
                      key={u.id}
                      className={`${rowBg} ${borderClass} transition-colors cursor-pointer`}
                      onClick={() => handleOpenUserModal(u)}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">{u.fullName || 'Sem Nome'}</div>
                        <div className="text-[10.5px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="p-3">
                        {isUserPro ? (
                          <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                            <span>PRO ✨</span>
                            <span className="text-amber-400 font-bold text-[10px]">∞</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[8.5px] font-bold uppercase rounded bg-slate-900 text-slate-400 border border-slate-800">
                            FREE
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {isUserPro ? (
                          isYearly ? (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                              Anual 🌟
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                              Mensal 📅
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      <td className="p-3">
                        {isUserPro ? (
                          u.currentPeriodEnd ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-bold text-slate-200">
                                {formatExpirationDate(u.currentPeriodEnd)}
                              </div>
                              {daysRemaining !== null && (
                                <div className={`text-[9.5px] font-bold ${daysRemaining > 0 ? (daysRemaining <= 5 ? 'text-amber-400' : 'text-emerald-400') : 'text-rose-400'}`}>
                                  {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expirado'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded bg-amber-950/50 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <span className="text-xs">∞</span> Vitalício
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-600">Ilimitado (Free)</span>
                        )}
                      </td>

                      <td className="p-3">
                        {u.asaasUrl ? (
                          <div className="space-y-1">
                            <a
                              href={u.asaasUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 rounded-lg transition-all shadow-sm group cursor-pointer"
                              title="Abrir assinaturas no Asaas (requer estar logado no sandbox.asaas.com)"
                            >
                              <span>💳 Painel Asaas</span>
                              <span className="group-hover:translate-x-0.5 transition-transform text-[8px]">↗</span>
                            </a>
                            {u.providerSubscriptionId && (
                              <div
                                onClick={() => {
                                  navigator.clipboard.writeText(u.providerSubscriptionId || '');
                                  showToast('ID da assinatura copiado! 📋', 'success');
                                }}
                                className="text-[8.5px] text-slate-500 font-mono hover:text-cyan-300 cursor-pointer flex items-center gap-0.5 transition-colors"
                                title="Clique para copiar o ID da assinatura"
                              >
                                <span>ID:</span>
                                <span>{u.providerSubscriptionId.slice(0, 12)}...</span>
                              </div>
                            )}
                          </div>
                        ) : isUserPro ? (
                          <span className="text-[9.5px] text-slate-500 font-mono">Manual</span>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">-</span>
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
                        {isUserPro ? (
                          <span className="font-black text-amber-400 flex items-center gap-1 text-xs" title={`Uso ilimitado no Plano PRO (${u.aiQueriesUsed} chamadas realizadas)`}>
                            <span className="text-base leading-none">∞</span>
                            <span className="text-[9px] text-slate-400 font-normal font-mono">({u.aiQueriesUsed})</span>
                          </span>
                        ) : (
                          <span className={`font-bold ${u.aiQueriesUsed >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {u.aiQueriesUsed}/3
                          </span>
                        )}
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

  {/* Audit Logs Modal */}
  {showAuditModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060c]/90 backdrop-blur-sm">
      <div className="bg-[#070913]/95 border border-violet-500/30 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-violet-950/40 flex justify-between items-center bg-violet-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-violet-300">📋</div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Logs de Auditoria</h3>
              <p className="text-xs text-slate-400">Histórico de ações administrativas no sistema</p>
            </div>
          </div>
          <button
            onClick={() => setShowAuditModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-violet-950/40 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {auditLoading ? (
            <div className="py-12 text-center text-slate-500 font-mono animate-pulse">Carregando logs de auditoria...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono">
              <div className="text-4xl mb-3">📋</div>
              <p>Nenhum log de auditoria encontrado</p>
              <p className="text-xs mt-1">As ações administrativas aparecerão aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-violet-950/30 text-slate-400 uppercase text-[9px] tracking-wider border-b border-violet-950/40">
                    <th className="p-3 font-bold">Data/Hora</th>
                    <th className="p-3 font-bold">Admin</th>
                    <th className="p-3 font-bold">Ação</th>
                    <th className="p-3 font-bold">Usuário Alvo</th>
                    <th className="p-3 font-bold">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-950/20">
                  {auditLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        idx % 2 === 0 ? 'bg-[#070a1a]/60 hover:bg-violet-950/30' : 'bg-[#0e132e]/70 hover:bg-violet-950/40'
                      }`}
                    >
                      <td className="p-3 text-slate-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="p-3 text-slate-300 font-medium">{log.adminEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[8px] font-bold rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">{log.targetUserEmail || '-'}</td>
                      <td className="p-3 text-slate-500 text-[10px] max-w-xs truncate">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-violet-950/40 bg-violet-950/20 flex justify-end">
          <button
            onClick={() => setShowAuditModal(false)}
            className="px-5 py-2.5 text-xs font-bold text-white bg-violet-650/80 hover:bg-violet-200/80 rounded-xl border border-violet-500/60 transition-all shadow-[0_0_20px_rgba(139,92,246,0.25)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}

  {/* User Detail Modal */}
  {showUserModal && selectedUser && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060c]/90 backdrop-blur-sm">
      <div className="bg-[#070913]/95 border border-indigo-500/30 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-indigo-950/40 flex justify-between items-center bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-300">👤</div>
            <div>
              <h3 className="text-lg font-black text-slate-100">{selectedUser.fullName || 'Sem Nome'}</h3>
              <p className="text-xs text-slate-400">{selectedUser.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUserModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/40 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-indigo-950/40 bg-indigo-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">ID</div>
              <div className="mt-1 text-sm font-mono text-slate-300 break-all">{selectedUser.id}</div>
            </div>
            <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Plano</div>
              <div className="mt-1 font-bold">
                {selectedUser.plan === 'pro' ? (
                  <span className="text-emerald-300">PRO ✨</span>
                ) : (
                  <span className="text-slate-400">FREE</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-cyan-950/40 bg-cyan-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Jobs</div>
              <div className="mt-1 text-2xl font-black text-cyan-300 font-mono">{selectedUser.totalJobs}</div>
            </div>
            <div className="rounded-xl border border-amber-950/40 bg-amber-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Uso IA</div>
              <div className="mt-1 text-2xl font-black text-amber-300 font-mono">
                {selectedUser.plan === 'pro' ? `∞ (${selectedUser.aiQueriesUsed} usadas)` : `${selectedUser.aiQueriesUsed}/3`}
              </div>
            </div>
            <div className="rounded-xl border border-purple-950/40 bg-purple-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Role</div>
              <div className="mt-1 font-bold">
                {selectedUser.role === 'admin' ? (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">ADMIN</span>
                ) : (
                  <span className="text-slate-500">USER</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Criado em</div>
              <div className="mt-1 text-sm text-slate-300">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('pt-BR') : '-'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-950/40 bg-indigo-950/10 p-4">
            <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-3">Ações Rápidas</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowUserModal(false); handleTogglePlan(selectedUser!); }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
              >
                {selectedUser.plan === 'pro' ? 'Reverter FREE' : '⚡ Ativar PRO'}
              </button>
              <button
                onClick={() => { setShowUserModal(false); handleResetAI(selectedUser!); }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs border border-indigo-500/30 bg-indigo-950/30 text-cyan-300 hover:bg-indigo-900/40 cursor-pointer"
              >
                🔄 Reset IA
              </button>
              <button
                onClick={() => { setShowUserModal(false); handleToggleVerify(selectedUser!); }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
              >
                {selectedUser.isVerified ? '✉️ Desverificar' : '✉️ Verificar E-mail'}
              </button>
              <button
                onClick={() => { if(selectedUser.role !== 'admin') { setShowUserModal(false); handleDeleteUser(selectedUser!); } }}
                disabled={selectedUser.role === 'admin'}
                className="px-4 py-2.5 rounded-xl font-bold text-xs border border-red-500/30 bg-red-950/30 text-red-300 hover:bg-red-900/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-indigo-950/40 bg-indigo-950/20 flex justify-end gap-3">
          <button
            onClick={() => setShowUserModal(false)}
            className="w-full px-5 py-2.5 text-xs font-bold text-white bg-indigo-650/80 hover:bg-indigo-200/80 rounded-xl border border-indigo-500/60 transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Top Users Leaderboard Modal */}
  {topUsers.length > 0 && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060c]/90 backdrop-blur-sm">
      <div className="bg-[#070913]/95 border border-amber-500/30 rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-amber-950/40 flex justify-between items-center bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-300">🏆</div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Top Usuários PRO</h3>
              <p className="text-xs text-slate-400">Ranking por volume de jobs</p>
            </div>
          </div>
          <button onClick={() => setShowAuditModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-amber-950/40 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {topUsers.map((u, idx) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-amber-300 bg-amber-950/40">{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 truncate">{u.fullName}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-amber-300 font-mono">{u.totalJobs} jobs</div>
                <div className="text-[9px] text-slate-500">{u.plan === 'pro' ? 'PRO ✨' : 'FREE'}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-amber-950/40 bg-amber-950/20 flex justify-end">
          <button onClick={() => setShowAuditModal(false)} className="w-full px-5 py-2.5 text-xs font-bold text-white bg-amber-650/80 hover:bg-amber-200/80 rounded-xl border border-amber-500/60 transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}
  </>

  );
};
