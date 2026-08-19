import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../store/authStore';
import { useJobsStore } from '../store/jobsStore';
import type { Project } from '../types/auth';
import { useUiStore } from '../store/uiStore';
import api from '../services/api';
import { ProfileSettings } from '../components/Profile/ProfileSettings';
import { ProjectManager } from '../components/Profile/ProjectManager';
import { OnboardingSteps } from '../components/Profile/OnboardingSteps';
import { useEntitlements } from '../hooks/useEntitlements';
import { usePWAInstall } from '../hooks/usePWAInstall';

const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Nunca usado';

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return 'Ativo agora';
  if (diffSecs < 60) return `há ${diffSecs} segundos`;
  if (diffMins === 1) return 'há 1 minuto';
  if (diffMins < 60) return `há ${diffMins} minutos`;
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/*
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex items-center group ml-1.5">
    <button
      type="button"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-950/40 text-indigo-300 hover:text-white hover:bg-indigo-900/60 transition-colors"
      aria-label="Mais informações"
    >
      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    </button>
    <span className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-xl border border-indigo-500/20 bg-[#070913]/98 p-2.5 text-[10px] leading-normal text-slate-300 shadow-xl opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
      {text}
    </span>
  </span>
);
*/

export const ProfilePage: React.FC = () => {
  const { user, activeProject, projects, setActiveProject, setProjects } = useAuthStore();
  const { jobs, fetchJobs } = useJobsStore();
  const { setActiveTab, setCreateModalOpen, showToast, setDocsOpen, isPlansModalOpen, setPlansModalOpen } = useUiStore();
  const [securityTab, setSecurityTab] = useState<'keys' | 'webhooks' | 'sessions' | 'twoFactor'>('keys');
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);

  // Load custom profile details saved during onboarding
  const [profileFullName, setProfileFullName] = useState(() => localStorage.getItem('cf_user_name') || user?.fullName || '');
  const company = localStorage.getItem('cf_user_company') || '';
  const role = localStorage.getItem('cf_user_role') || '';
  const techStack = localStorage.getItem('cf_user_tech_stack') || 'Node.js / TypeScript';
  const timezone = localStorage.getItem('cf_user_timezone') || 'America/Sao_Paulo';

  const userEmail = user?.email || 'admin@cronflow.sh';
  const userHandle = userEmail.split('@')[0] || 'cronflow';
  
  // Custom avatar initials if full name exists
  const avatarLabel = profileFullName
    ? profileFullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : userHandle.slice(0, 2).toUpperCase();

  const memberSince = formatDate(user?.createdAt);
  const workspaceName = activeProject?.name || 'Projeto Pessoal';
  const { isPro, maxJobs } = useEntitlements();
  const isProPlan = isPro;
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  const handleInstallPWA = async () => {
    const success = await installApp();
    if (success) {
      showToast('CronFlow instalado com sucesso! 🚀', 'success');
    }
  };

  const [globalWebhook, setGlobalWebhook] = useState(() => localStorage.getItem('cf_global_webhook') || '');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const webhookConfigured = globalWebhook.trim().length > 0;

  // Email Preferences States
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const [profileTimezone, setProfileTimezone] = useState(() => localStorage.getItem('cf_user_timezone') || 'America/Sao_Paulo');
  const [digestHour, setDigestHour] = useState(18);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Project Creation States
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [totalJobsCreated, setTotalJobsCreated] = useState(() => Number(localStorage.getItem('cf_total_jobs_created') || '0'));
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  // API Keys Management states
  interface APIKeyItem {
    id: string;
    projectId: string;
    prefix: string;
    createdAt: string;
    lastUsedAt?: string | null;
  }
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const fetchAPIKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await api.get('/v1/keys');
      setApiKeys(res.data || []);
    } catch (err) {
      console.error('Failed to fetch API keys', err);
      showToast('Falha ao listar chaves de API.', 'error');
    } finally {
      setLoadingKeys(false);
    }
  }, [showToast]);

  const handleCreateAPIKey = async () => {
    try {
      const res = await api.post('/v1/keys');
      setNewlyCreatedKey(res.data.apiKey);
      showToast('Nova chave de API gerada com sucesso!', 'success');
      fetchAPIKeys();
    } catch (err) {
      console.error('Failed to create API key', err);
      showToast('Falha ao gerar nova chave de API.', 'error');
    }
  };

  const handleRevokeAPIKey = async (id: string) => {
    const result = await Swal.fire({
      title: 'Revogar Chave de API?',
      html: `Tem certeza que deseja revogar esta chave de API?<br/><span style="color:#e11d48;font-size:11px;margin-top:5px;display:block;">Todas as integrações utilizando esta chave deixarão de funcionar imediatamente!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, Revogar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal2-dark-custom rounded-3xl border border-indigo-950/60 bg-[#090c15] text-slate-100 p-6',
        title: 'text-slate-100 font-extrabold text-base',
        htmlContainer: 'text-slate-400 text-xs leading-relaxed mt-2',
        confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md',
        cancelButton: 'px-4 py-2 text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all ml-2',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/v1/keys/${id}`);
        showToast('Chave de API revogada com sucesso.', 'success');
        fetchAPIKeys();
      } catch (err) {
        console.error('Failed to revoke API key', err);
        showToast('Falha ao revogar chave de API.', 'error');
      }
    }
  };

  const [rotatingSecret, setRotatingSecret] = useState(false);

  const handleRotateWebhookSecret = async () => {
    const result = await Swal.fire({
      title: 'Rotacionar Chave de Assinatura?',
      html: `Tem certeza que deseja rotacionar a chave de assinatura?<br/><span style="color:#f59e0b;font-size:11px;margin-top:5px;display:block;">Todos os alertas de webhook enviados a partir de agora usarão a nova assinatura HMAC. Integrações antigas que não atualizarem o segredo falharão!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, Rotacionar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal2-dark-custom rounded-3xl border border-indigo-950/60 bg-[#090c15] text-slate-100 p-6',
        title: 'text-slate-100 font-extrabold text-base',
        htmlContainer: 'text-slate-400 text-xs leading-relaxed mt-2',
        confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-md',
        cancelButton: 'px-4 py-2 text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all ml-2',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      setRotatingSecret(true);
      try {
        const res = await api.post('/v1/projects/webhook-secret/rotate');
        const newSecret = res.data?.webhookSecret || res.data?.webhook_secret;
        if (newSecret && activeProject) {
          const updatedProject = { ...activeProject, webhookSecret: newSecret };
          setActiveProject(updatedProject);
          setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p));
        }
        showToast('Chave de assinatura rotacionada com sucesso!', 'success');
      } catch (err) {
        console.error('Failed to rotate webhook secret', err);
        showToast('Falha ao rotacionar chave de assinatura.', 'error');
      } finally {
        setRotatingSecret(false);
      }
    }
  };

  useEffect(() => {
    if (securityTab === 'keys') {
      const timer = setTimeout(() => {
        fetchAPIKeys();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [securityTab, fetchAPIKeys]);

  const getCodeSnippet = () => {
    const tz = timezone || 'America/Sao_Paulo';

    if (techStack.includes('Node.js')) {
      return `const apiKey = process.env.CRONFLOW_API_KEY;\nif (!apiKey) throw new Error("CRONFLOW_API_KEY ausente");\n\nfetch("https://cron.jangustavo.me/v1/jobs", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer " + apiKey,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    name: "Minha Tarefa Agendada",\n    schedule: "*/5 * * * *", // a cada 5m\n    http_method: "POST",\n    url: "https://minhaapi.com/webhooks/limpeza",\n    timezone: "${tz}"\n  })\n})\n.then(res => res.json())\n.then(data => console.log("Job cadastrado:", data.id));`;
    }
    if (techStack.includes('Go')) {
      return `package main\n\nimport (\n\t"bytes"\n\t"encoding/json"\n\t"net/http"\n\t"os"\n)\n\nfunc main() {\n\tapiKey := os.Getenv("CRONFLOW_API_KEY")\n\tif apiKey == "" {\n\t\tpanic("CRONFLOW_API_KEY ausente")\n\t}\n\n\tpayload := map[string]interface{}{\n\t\t"name":        "Minha Tarefa",\n\t\t"schedule":    "*/5 * * * *",\n\t\t"http_method": "POST",\n\t\t"url":         "https://minhaapi.com/webhooks/limpeza",\n\t\t"timezone":    "${tz}",\n\t}\n\tbody, _ := json.Marshal(payload)\n\n\treq, _ := http.NewRequest("POST", "https://cron.jangustavo.me/v1/jobs", bytes.NewBuffer(body))\n\treq.Header.Set("Authorization", "Bearer " + apiKey)\n\treq.Header.Set("Content-Type", "application/json")\n\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n}`;
    }
    if (techStack.includes('Python')) {
      return `import os\nimport requests\n\napiKey = os.environ.get("CRONFLOW_API_KEY")\nif not apiKey:\n    raise ValueError("CRONFLOW_API_KEY ausente")\n\nurl = "https://cron.jangustavo.me/v1/jobs"\nheaders = {\n    "Authorization": f"Bearer {apiKey}",\n    "Content-Type": "application/json"\n}\npayload = {\n    "name": "Minha Tarefa Agendada",\n    "schedule": "*/5 * * * *",\n    "http_method": "POST",\n    "url": "https://minhaapi.com/webhooks/limpeza",\n    "timezone": "${tz}"\n}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`;
    }
    if (techStack.includes('PHP')) {
      return `<?php\n$apiKey = getenv("CRONFLOW_API_KEY");\nif (!$apiKey) {\n    die("CRONFLOW_API_KEY ausente");\n}\n\n$ch = curl_init("https://cron.jangustavo.me/v1/jobs");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "Authorization: Bearer " . $apiKey,\n    "Content-Type: application/json"\n]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    "name" => "Minha Tarefa",\n    "schedule" => "*/5 * * * *",\n    "http_method" => "POST",\n    "url" => "https://minhaapi.com/webhooks/limpeza",\n    "timezone" => "${tz}"\n]));\n$resp = curl_exec($ch);`;
    }
    if (techStack.includes('C#')) {
      return `using System;\nusing System.Net.Http;\nusing System.Net.Http.Json;\n\nvar apiKey = Environment.GetEnvironmentVariable("CRONFLOW_API_KEY");\nif (string.IsNullOrEmpty(apiKey)) {\n    throw new Exception("CRONFLOW_API_KEY ausente");\n}\n\nusing var client = new HttpClient();\nclient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");\n\nvar payload = new {\n    name = "Minha Tarefa Agendada",\n    schedule = "*/5 * * * *",\n    http_method = "POST",\n    url = "https://minhaapi.com/webhooks/limpeza",\n    timezone = "${tz}"\n};\n\nawait client.PostAsJsonAsync("https://cron.jangustavo.me/v1/jobs", payload);`;
    }
    if (techStack.includes('Java')) {
      return `// Exemplo HTTP Client (Java 11+):\nString apiKey = System.getenv("CRONFLOW_API_KEY");\nif (apiKey == null || apiKey.isEmpty()) {\n    throw new RuntimeException("CRONFLOW_API_KEY ausente");\n}\n\nvar client = HttpClient.newHttpClient();\nvar req = HttpRequest.newBuilder()\n  .uri(URI.create("https://cron.jangustavo.me/v1/jobs"))\n  .header("Authorization", "Bearer " + apiKey)\n  .header("Content-Type", "application/json")\n  .POST(HttpRequest.BodyPublishers.ofString("{\\"name\\":\\"Tarefa\\",\\"schedule\\":\\"*/5 * * * *\\",\\"http_method\\":\\"POST\\",\\"url\\":\\"https://api.com\\",\\"timezone\\":\\"${tz}\\"}"))\n  .build();\nclient.send(req, HttpResponse.BodyHandlers.ofString());`;
    }

    return `# Defina a variável de ambiente: export CRONFLOW_API_KEY="cf_live_..."\ncurl -X POST "https://cron.jangustavo.me/v1/jobs" \\\n     -H "Authorization: Bearer $CRONFLOW_API_KEY" \\\n     -H "Content-Type: application/json" \\\n     -d '{\n       "name": "Minha Tarefa Agendada",\n       "schedule": "*/5 * * * *",\n       "http_method": "POST",\n       "url": "https://minhaapi.com/webhooks/limpeza",\n       "timezone": "${tz}"\n     }'`;
  };

  const handleUpdateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cf_global_webhook', globalWebhook.trim());
    setUpdateSuccess(true);
    showToast('Webhook atualizado com sucesso.', 'success');
    setTimeout(() => setUpdateSuccess(false), 2000);
  };

  /* eslint-disable-next-line react-hooks/preserve-manual-memoization */
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/v1/users/profile');
      if (res.data) {
        setEmailAlertsEnabled(res.data.emailAlertsEnabled);
        setDailyDigestEnabled(res.data.dailyDigestEnabled);
        if (res.data.fullName) {
          setProfileFullName(res.data.fullName);
          localStorage.setItem('cf_user_name', res.data.fullName);
        }
        if (res.data.plan) {
          localStorage.setItem('cf_user_plan', res.data.plan);
        }
        if (res.data.totalJobsCreated !== undefined) {
          setTotalJobsCreated(res.data.totalJobsCreated);
          localStorage.setItem('cf_total_jobs_created', String(res.data.totalJobsCreated));
          localStorage.setItem('cf_profile_active_jobs_count', String(jobs.length));
        }
        if (res.data.timezone) {
          setProfileTimezone(res.data.timezone);
          localStorage.setItem('cf_user_timezone', res.data.timezone);
        }
        setDigestHour(res.data.digestHour !== undefined ? res.data.digestHour : 18);

        // Atualiza os dados de limite e plano no Zustand global
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          useAuthStore.setState({
            user: {
              ...authStore.user,
              fullName: res.data.fullName,
              plan: res.data.plan,
              limits: res.data.limits,
              currentPeriodEnd: res.data.currentPeriodEnd
            }
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, [jobs.length]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfilePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/v1/users/profile', {
        emailAlertsEnabled,
        dailyDigestEnabled,
        timezone: profileTimezone,
        digestHour,
      });
      localStorage.setItem('cf_user_timezone', profileTimezone);
      showToast('Preferências de notificação salvas!', 'success');
    } catch (err) {
      const axiosError = err as { response?: { data?: { reason?: string; error?: string } } };
      const errorMsg = axiosError.response?.data?.reason || axiosError.response?.data?.error || 'Erro ao salvar preferências.';
      showToast(errorMsg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await api.post('/v1/projects', { name: newProjectName.trim() });
      if (res.data) {
        const updatedProjects = [...projects, res.data];
        setProjects(updatedProjects);
        showToast('Novo projeto criado com sucesso!', 'success');
        setNewProjectName('');
        setCreateProjectOpen(false);
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { reason?: string; error?: string } } };
      const errorMsg = axiosError.response?.data?.reason || axiosError.response?.data?.error || 'Erro ao criar projeto.';
      showToast(errorMsg, 'error');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleRenameProject = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!editingProjectName.trim()) return;
    try {
      await api.put(`/v1/projects/${projectId}`, { name: editingProjectName.trim() });
      const updatedProjects = projects.map((p) =>
        p.id === projectId ? { ...p, name: editingProjectName.trim() } : p
      );
      setProjects(updatedProjects);
      if (activeProject?.id === projectId) {
        setActiveProject({ ...activeProject, name: editingProjectName.trim() });
      }
      showToast('Projeto renomeado com sucesso!', 'success');
      setEditingProjectId(null);
    } catch (err) {
      const axiosError = err as { response?: { data?: { reason?: string; error?: string } } };
      const errorMsg = axiosError.response?.data?.reason || axiosError.response?.data?.error || 'Erro ao renomear projeto.';
      showToast(errorMsg, 'error');
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const result = await Swal.fire({
      title: 'Excluir Projeto?',
      html: `Tem certeza que deseja excluir o projeto <b>${projectName}</b>?<br/><span style="color:#e11d48;font-size:11px;margin-top:5px;display:block;">Aviso: Todos os jobs e logs deste projeto serão permanentemente excluídos!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, Excluir',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal2-dark-custom rounded-3xl border border-indigo-950/60 bg-[#090c15] text-slate-100 p-6',
        title: 'text-slate-100 font-extrabold text-base',
        htmlContainer: 'text-slate-400 text-xs leading-relaxed mt-2',
        confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md',
        cancelButton: 'px-4 py-2 text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all ml-2',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/v1/projects/${projectId}`);
        const updatedProjects = projects.filter((p) => p.id !== projectId);
        setProjects(updatedProjects);
        showToast('Projeto excluído com sucesso!', 'success');
        fetchProfile();
      } catch (err) {
        const axiosError = err as { response?: { data?: { reason?: string; error?: string } } };
        const errorMsg = axiosError.response?.data?.reason || axiosError.response?.data?.error || 'Erro ao excluir projeto.';
        showToast(errorMsg, 'error');
      }
    }
  };

  const handleSwitchProject = async (project: Project) => {
    setIsSwitchingProject(true);
    try {
      const res = await api.post(`/v1/projects/${project.id}/switch`);
      if (res.data && res.data.token) {
        setActiveProject(project, res.data.token);
        showToast(`Alternado para o workspace: ${project.name}`, 'success');
        await fetchJobs();
      }
    } catch {
      showToast('Erro ao alternar de workspace.', 'error');
    } finally {
      setIsSwitchingProject(false);
    }
  };

  const [upgrading, setUpgrading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async () => {
    if (upgrading) return;
    setUpgrading(true);
    try {
      showToast('Redirecionando para o checkout seguro da Stripe...', 'info');
      const res = await api.post('/v1/billing/checkout', { period: billingPeriod });
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        showToast('Erro ao obter link de checkout da Stripe.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao iniciar fluxo de pagamento. Tente novamente.', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      showToast('Redirecionando para o portal de faturamento da Stripe...', 'info');
      const res = await api.post('/v1/billing/portal', {});
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        showToast('Erro ao obter link do portal da Stripe.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar portal de faturamento. Tente novamente.', 'error');
    }
  };
  
  const memberDays = useMemo(() => {
    if (!user?.createdAt) return 0;
    const nowTime = new Date().getTime();
    const createdTime = new Date(user.createdAt).getTime();
    return Math.max(1, Math.floor((nowTime - createdTime) / 86400000));
  }, [user]);

  const workspaceJobs = activeProject
    ? jobs.filter((job) => job.projectId === activeProject.id)
    : jobs;

  const globalMaxLimit = maxJobs;
  const baselineActiveJobsCount = Number(localStorage.getItem('cf_profile_active_jobs_count') || '0');
  const diff = jobs.length - baselineActiveJobsCount;
  const currentTotalJobsCreated = totalJobsCreated + diff;
  const jobsUsagePercent = globalMaxLimit > 0 ? Math.min(100, Math.round((currentTotalJobsCreated / globalMaxLimit) * 100)) : 0;

  const handleCreateJob = () => {
    setActiveTab('jobs');
    setCreateModalOpen(true);
  };

  const handleOpenKeys = () => {
    setSecurityTab('keys');
    setTimeout(() => {
      document.getElementById('security-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  const handleOpenWebhooks = () => {
    setSecurityTab('webhooks');
    setTimeout(() => {
      document.getElementById('security-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  const handleOpenJobs = () => setActiveTab('jobs');
  const handleOpenLogs = () => setActiveTab('logs');
  const handleOpenDocs = () => setDocsOpen(true);

  const handleOpenSupport = () => {
    const email = 'jandersongustavo01@gmail.com';
    const subject = encodeURIComponent('[CronFlow] Suporte - Solicitação de Atendimento');
    const body = encodeURIComponent(
      'Olá Janderson,\n\n' +
      'Gostaria de solicitar suporte referente ao CronFlow.\n\n' +
      '[Descreva seu problema, dúvida ou sugestão aqui]\n\n' +
      'Atenciosamente,\n' +
      'Equipe CronFlow'
    );
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    const gmailUrl = `https://mail.google.com/mail/?extsrc=mailto&url=${encodeURIComponent(mailto)}`;
    window.open(gmailUrl, '_blank');
  };

  const onboardingSteps = [
    {
      id: 'connect-api',
      title: 'Conectar API Key',
      done: apiKeys.length > 0,
      detail: apiKeys.length > 0 ? `Chave de API configurada e ativa` : 'Autentique suas integrações programáticas com segurança.',
      action: {
        label: 'Ir para chaves',
        onClick: handleOpenKeys,
      },
    },
    {
      id: 'first-job',
      title: 'Criar primeira tarefa',
      done: workspaceJobs.length > 0,
      detail: workspaceJobs.length > 0 ? `${workspaceJobs.length} ${workspaceJobs.length === 1 ? 'tarefa cadastrada' : 'tarefas cadastradas'}` : 'Cadastre sua primeira rota/agendamento HTTP.',
      action: {
        label: 'Criar tarefa',
        onClick: handleCreateJob,
      },
    },
    {
      id: 'webhook',
      title: 'Configurar webhook',
      done: webhookConfigured,
      detail: webhookConfigured ? 'Notificações de falhas ativas!' : 'Receba alertas instantâneos no Discord/Slack se algum job falhar.',
      action: {
        label: 'Configurar',
        onClick: handleOpenWebhooks,
      },
    },
    {
      id: 'manual-trigger',
      title: 'Disparar execução manual',
      done: workspaceJobs.some((j) => j.lastRunAt != null),
      detail: workspaceJobs.some((j) => j.lastRunAt != null) ? 'Primeira execução concluída com sucesso!' : 'Valide o fluxo executando um job manualmente.',
      action: {
        label: 'Ir para tarefas',
        onClick: handleOpenJobs,
      },
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header section consistent with Dashboard & Logs */}
      <div>
        <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
          Painel de Controle
        </span>
        <h2 className="text-3xl font-extrabold mt-1 text-slate-100">
          Configurações da Conta
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Gerencie seu perfil de desenvolvedor, chaves de API, webhooks globais de observabilidade e sintonize seu workspace ativo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 w-full min-w-0">
        {/* LEFT COLUMN - Profile Card & Workspace Status */}
        <div className="lg:col-span-5 space-y-6 flex flex-col min-w-0">
          
          <ProfileSettings
            avatarLabel={avatarLabel}
            isProPlan={isProPlan}
            userHandle={userHandle}
            profileFullName={profileFullName}
            userEmail={userEmail}
            timezone={timezone}
            techStack={techStack}
            role={role}
            company={company}
            memberDays={memberDays}
            memberSince={memberSince}
            onOpenPlans={() => setPlansModalOpen(true)}
          />

          <ProjectManager
            isSwitchingProject={isSwitchingProject}
            workspaceName={workspaceName}
            jobsUsagePercent={jobsUsagePercent}
            isProPlan={isProPlan}
            projects={projects}
            globalMaxLimit={globalMaxLimit}
            currentTotalJobsCreated={currentTotalJobsCreated}
            createProjectOpen={createProjectOpen}
            setCreateProjectOpen={setCreateProjectOpen}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            creatingProject={creatingProject}
            handleCreateProject={handleCreateProject}
            editingProjectId={editingProjectId}
            setEditingProjectId={setEditingProjectId}
            editingProjectName={editingProjectName}
            setEditingProjectName={setEditingProjectName}
            handleRenameProject={handleRenameProject}
            handleSwitchProject={handleSwitchProject}
            handleDeleteProject={handleDeleteProject}
            activeProject={activeProject}
          />
        </div>

        {/* RIGHT COLUMN - Tabbed Security Settings & Roadmap */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          
          {/* TABBED SECURITY PANEL */}
          <div id="security-settings" className="rounded-3xl glass-panel border border-indigo-950/40 p-6 space-y-5 text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-indigo-950/30 pb-4">
              <div>
                <h4 className="text-base font-bold text-slate-250">Segurança & Integrações</h4>
                <p className="text-xs text-slate-400 mt-0.5">Gerencie os acessos, conexões externas e APIs do sistema.</p>
              </div>

              {/* Sleek Switcher Tabs */}
              <div className="flex gap-1.5 bg-[#05070e] p-1.5 rounded-xl border border-indigo-950/60 self-start sm:self-auto select-none overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
                {[
                  { id: 'keys', label: 'Chaves API' },
                  { id: 'webhooks', label: 'Alertas / Webhooks' },
                  { id: 'sessions', label: 'Sessões' },
                  { id: 'twoFactor', label: 'MFA' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSecurityTab(t.id as 'keys' | 'webhooks' | 'sessions' | 'twoFactor')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      securityTab === t.id
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 shadow-md'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="min-h-[300px]">
              
              {/* API KEYS TAB */}
              {securityTab === 'keys' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">API Keys de Integração</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">Utilize estas chaves para criar e monitorar tarefas através do SDK ou chamadas HTTP rest.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateAPIKey}
                      className="px-3 py-2 text-[10px] uppercase font-black tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                    >
                      + Nova Chave
                    </button>
                  </div>

                  {/* Secret copy warning box */}
                  {newlyCreatedKey && (
                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in slide-in-from-top-4 duration-300 select-text">
                      <div className="flex items-center gap-2 text-amber-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono">Guarde o Segredo Seguro!</span>
                      </div>
                      <p className="text-[10px] text-slate-350 leading-relaxed">
                        Esta chave de API será exibida <strong>apenas uma vez</strong>. Copie o valor abaixo e guarde-o em seu gerenciador de variáveis de ambiente.
                      </p>
                      <div className="flex items-center gap-2 bg-[#04060f] p-2.5 rounded-xl border border-amber-500/20 font-mono text-xs text-amber-250 select-all break-all relative pr-16">
                        <span className="break-all">{newlyCreatedKey}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newlyCreatedKey);
                            showToast('Chave copiada para a área de transferência! 📋', 'success');
                          }}
                          className="absolute right-2 top-2 px-2.5 py-1 text-[9px] font-bold text-amber-400 hover:text-white bg-amber-950/40 rounded border border-amber-900/30 transition-all cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewlyCreatedKey(null)}
                        className="w-full py-1.5 text-[9px] uppercase font-bold text-amber-200 hover:text-white bg-amber-950/20 hover:bg-amber-950/50 rounded-xl border border-amber-900/20 transition-all cursor-pointer"
                      >
                        Entendi, fechar aviso
                      </button>
                    </div>
                  )}

                  {/* Keys List */}
                  <div className="space-y-3.5">
                    {loadingKeys ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
                        <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
                        Listando chaves...
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center py-12 px-6 bg-[#05070e]/20 border border-indigo-950/30 rounded-2xl flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <h5 className="text-[11px] font-bold text-slate-300">Sem chaves ativas</h5>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[220px] leading-normal">Gere uma chave de API para integrar o CronFlow com seus scripts locais ou outros serviços.</p>
                      </div>
                    ) : (
                      apiKeys.map((key) => (
                        <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-indigo-950/40 bg-slate-950/40 transition-colors hover:bg-slate-950/60 text-left">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Chave Ativa</span>
                            <div className="text-xs font-mono font-bold text-indigo-300">
                              {key.prefix}••••••••••••••••••••••••
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-500 mt-1">
                              <span>ID: <code className="font-mono">{key.id.slice(0, 8)}</code></span>
                              <span>•</span>
                              <span>Gerada em: {formatDate(key.createdAt)}</span>
                              {key.lastUsedAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-400">Último uso: {formatRelativeTime(key.lastUsedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(key.prefix);
                                showToast('Prefixo identificador copiado!', 'info');
                              }}
                              title="Copia os caracteres iniciais (prefixo) para identificação da chave"
                              className="px-2.5 py-1.5 text-[9px] uppercase font-bold text-slate-350 hover:text-white bg-slate-900/60 rounded-xl border border-slate-800 transition-all cursor-pointer"
                            >
                              Copiar Prefixo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeAPIKey(key.id)}
                              className="px-2.5 py-1.5 text-[9px] uppercase font-bold text-rose-400 hover:text-white hover:bg-rose-950/30 rounded-xl border border-rose-950/40 hover:border-rose-900/60 transition-all cursor-pointer"
                            >
                              Revogar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Integration Snippet */}
                  <div className="pt-4 border-t border-indigo-950/30 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="uppercase tracking-wider text-slate-500">Exemplo de Código ({techStack})</span>
                      <span className="font-mono text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/10">POST /v1/jobs</span>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-indigo-950/80 bg-[#04060f]/90 p-4 font-mono text-[10px] leading-relaxed text-slate-300 w-full min-w-0">
                      <pre className="overflow-x-auto select-all whitespace-pre pr-14 text-left">
                        {getCodeSnippet()}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getCodeSnippet());
                          showToast('Código de integração copiado!', 'success');
                        }}
                        className="absolute right-3 top-3 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-white bg-slate-900 rounded border border-slate-800 transition-all cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* WEBHOOKS ALERTS TAB */}
              {securityTab === 'webhooks' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <form onSubmit={handleUpdateWebhook} className="space-y-5">
                    <div>
                      <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Notificações Globais</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">Webhook de alerta centralizado. O CronFlow enviará um POST com os detalhes caso alguma tarefa falhe 3 vezes.</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="url"
                        placeholder="https://sua-api.com/alertas-webhook"
                        value={globalWebhook}
                        onChange={(e) => setGlobalWebhook(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[#05070e] border border-indigo-950/60 rounded-2xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500/40 font-mono"
                      />
                      <button
                        type="submit"
                        className={`px-5 py-3 text-xs font-bold rounded-2xl transition-all shadow-md cursor-pointer shrink-0 ${
                          updateSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white neon-glow-primary'
                        }`}
                      >
                        {updateSuccess ? 'Salvo! ✓' : 'Salvar Webhook'}
                      </button>
                    </div>

                    <div className="grid gap-3.5 md:grid-cols-2">
                      <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Status do Webhook</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            webhookConfigured
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          }`}>
                            {webhookConfigured ? 'Ativo' : 'Pendente'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-indigo-300 break-all bg-[#04060f]/60 p-2.5 border border-indigo-950/40 rounded-xl">
                          {webhookConfigured ? globalWebhook : 'Nenhum webhook global ativo'}
                        </div>
                      </div>

                      {activeProject?.webhookSecret && (
                        <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Assinatura HMAC (webhook_secret)</span>
                            <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/15">HMAC-SHA256</span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 leading-normal">
                            Utilize o segredo abaixo para decodificar e atestar a integridade do remetente (CronFlow) no seu backend.
                          </p>
                          <div className="flex items-center justify-between gap-3 bg-[#04060f] p-2.5 rounded-xl border border-indigo-950/60 font-mono text-[10.5px] text-indigo-350 relative pr-36 select-all w-full min-w-0">
                            <span className="truncate">{activeProject.webhookSecret}</span>
                            <div className="absolute right-1.5 top-1.5 flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(activeProject.webhookSecret || '');
                                  showToast('Chave HMAC copiada!', 'success');
                                }}
                                className="px-2 py-1 text-[8px] font-bold text-indigo-400 hover:text-white bg-indigo-950/40 rounded border border-indigo-900/30 transition-all cursor-pointer"
                              >
                                Copiar
                              </button>
                              <button
                                type="button"
                                disabled={rotatingSecret}
                                onClick={handleRotateWebhookSecret}
                                className="px-2 py-1 text-[8px] font-bold text-amber-400 hover:text-white bg-amber-950/40 rounded border border-amber-900/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {rotatingSecret ? '...' : 'Rotacionar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>

                  {/* EMAIL ALERTS PREFERENCES SECTION */}
                  <div className="pt-6 border-t border-indigo-950/30">
                    <form onSubmit={handleUpdateProfilePreferences} className="space-y-5">
                      <div>
                        <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Notificações por E-mail</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">Configure como e quando você deseja receber alertas de falha no seu e-mail de cadastro.</p>
                      </div>

                      {loadingProfile ? (
                        <div className="text-xs text-slate-500 font-mono py-2">Carregando preferências...</div>
                      ) : (
                        <div className="space-y-4">
                          {/* Immediate Alerts Option - Paid Only */}
                          <div className="flex items-start justify-between p-4 rounded-2xl border border-indigo-950/40 bg-slate-950/20">
                            <div className="space-y-1 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">Alertas Imediatos</span>
                                {!isProPlan && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-[#ff006e]/10 border border-[#ff006e]/30 text-[#ff006e] tracking-wider">PRO</span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-500 leading-normal">
                                Envia um e-mail de aviso imediatamente no instante em que qualquer job falhar 3 vezes seguidas e for forçado a pausar.
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={emailAlertsEnabled}
                                disabled={!isProPlan}
                                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-[#0a0f1d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-650 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-disabled:opacity-45"></div>
                            </label>
                          </div>

                          {/* Daily Digest Option - Free Tier Option */}
                          <div className="flex items-start justify-between p-4 rounded-2xl border border-indigo-950/40 bg-slate-950/20">
                            <div className="space-y-1 pr-4">
                              <span className="text-xs font-bold text-slate-200">Resumo Diário (Daily Digest)</span>
                              <p className="text-[10.5px] text-slate-500 leading-normal">
                                Receba um único consolidado diário com todos os erros ocorridos em suas tarefas nas últimas 24 horas. Ideal para o plano Free.
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={dailyDigestEnabled}
                                onChange={(e) => setDailyDigestEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-[#0a0f1d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-650 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>

                          {/* Timezone and hour configuration fields */}
                          {dailyDigestEnabled && (
                            <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-2xl border border-indigo-950/60 bg-[#050811] animate-in slide-in-from-top-2 duration-200">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fuso Horário do Perfil</label>
                                <select
                                  value={profileTimezone}
                                  onChange={(e) => setProfileTimezone(e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-indigo-950/80 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500/40 cursor-pointer font-mono"
                                >
                                  <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                                  <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário do Disparo (Final do Dia)</label>
                                <select
                                  value={digestHour}
                                  onChange={(e) => setDigestHour(Number(e.target.value))}
                                  className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-indigo-950/80 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500/40 cursor-pointer font-mono"
                                >
                                  {Array.from({ length: 24 }).map((_, idx) => (
                                    <option key={idx} value={idx}>
                                      {idx.toString().padStart(2, '0')}:00 ({idx >= 18 ? 'Noite' : idx >= 12 ? 'Tarde' : 'Manhã'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white transition-all shadow-md cursor-pointer neon-glow-primary disabled:opacity-50"
                            >
                              {savingProfile ? 'Salvando...' : 'Salvar Preferências'}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* ACTIVE SESSIONS TAB */}
              {securityTab === 'sessions' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Sessões Ativas</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Gerencie os acessos de login autorizados para a sua conta.</p>
                  </div>

                  <div className="divide-y divide-indigo-950/30 rounded-2xl border border-indigo-950/40 bg-slate-950/40 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">Navegador Atual (Chrome/Linux)</span>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">Esta Sessão</span>
                        </div>
                        <p className="text-[10px] text-slate-500">IP: <code className="font-mono text-indigo-400">127.0.0.1 (Localhost)</code> • Última atividade: Agora</p>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between bg-indigo-950/5">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400">Integração API (Token de Acesso)</span>
                        <p className="text-[10px] text-slate-500">Chave base para requisições no endpoint REST • Status: Ativo</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2FA MULTIFACTOR TAB */}
              {securityTab === 'twoFactor' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Autenticação de Dois Fatores (MFA)</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Adicione uma camada extra de proteção exigindo um código TOTP no login.</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-250 block">MFA Avançado & TOTP</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        A proteção via aplicativos autenticadores (Google Authenticator, Microsoft Authenticator) requer o plano Enterprise.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="px-3.5 py-2 text-[9px] uppercase font-black text-slate-500 bg-slate-900 border border-slate-800 rounded-xl cursor-not-allowed shrink-0"
                    >
                      Em Breve (Enterprise)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <OnboardingSteps
            onboardingSteps={onboardingSteps}
            completedSteps={completedSteps}
            progressPercent={progressPercent}
          />

          {/* PWA INSTALLATION PROMPT */}
          {isInstallable && (
            <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-indigo-950/40 to-cyan-950/20 p-6 space-y-3.5 text-left animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>Instalar CronFlow App</span>
                  <span className="text-[8px] font-mono px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-full font-bold uppercase tracking-wider">PWA</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Adicione o CronFlow à sua tela inicial para obter acesso rápido, janela independente e desempenho aprimorado.</p>
              </div>
              <button
                type="button"
                onClick={handleInstallPWA}
                className="w-full py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-450 rounded-xl transition-all shadow-md shadow-cyan-500/15 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Instalar Aplicativo 📲
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="rounded-3xl border border-indigo-950/40 bg-slate-950/20 p-6 space-y-3 text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-350 flex items-center gap-2">
                  <span>CronFlow App Instalado</span>
                  <span className="text-[8px] font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold uppercase tracking-wider">Ativo</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Você está rodando o CronFlow como um Aplicativo Web Progressivo completo e otimizado.</p>
              </div>
            </div>
          )}

          {/* QUICK LINKS GRID */}
          <div className="rounded-3xl glass-panel border border-indigo-950/40 p-6 space-y-4 text-left">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Links de Atalho</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Acesse rapidamente outras telas e recursos do painel.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <button
                type="button"
                onClick={handleCreateJob}
                className="py-2.5 text-[9px] font-black uppercase tracking-wider text-indigo-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/50 rounded-xl border border-indigo-500/15 transition-all cursor-pointer"
              >
                Novo Job
              </button>
              <button
                type="button"
                onClick={handleOpenLogs}
                className="py-2.5 text-[9px] font-black uppercase tracking-wider text-cyan-300 hover:text-white bg-cyan-950/20 hover:bg-cyan-950/50 rounded-xl border border-cyan-500/15 transition-all cursor-pointer"
              >
                Logs
              </button>
              <button
                type="button"
                onClick={handleOpenDocs}
                className="py-2.5 text-[9px] font-black uppercase tracking-wider text-violet-300 hover:text-white bg-violet-950/20 hover:bg-violet-950/50 rounded-xl border border-violet-500/15 transition-all cursor-pointer"
              >
                Docs
              </button>
              <button
                type="button"
                onClick={handleOpenSupport}
                className="py-2.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 hover:text-white bg-emerald-950/20 hover:bg-emerald-950/50 rounded-xl border border-emerald-500/15 transition-all cursor-pointer col-span-1 sm:col-span-3"
              >
                Solicitar Suporte (Fale Conosco) ✉
              </button>
            </div>
          </div>

        </div>
      </div>

      {isPlansModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/75 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-indigo-500/20 bg-[#0a0d1d]/95 p-6 md:p-8 shadow-[0_0_60px_rgba(99,102,241,0.25)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 opacity-90" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-indigo-950/40 select-none">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-100 tracking-wide flex items-center gap-2">
                  <span>Planos e Assinaturas</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full font-bold uppercase tracking-wider">Monetização</span>
                </h3>
                <p className="text-xs text-slate-400">Escolha o plano ideal para a escala de agendamentos e integrações de sua infraestrutura.</p>
              </div>
              <button
                onClick={() => setPlansModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto py-6 pr-1 custom-scrollbar space-y-6">

              {/* Billing Period Toggle */}
              <div className="flex items-center justify-center gap-1 p-1 bg-slate-900/60 border border-indigo-950/40 rounded-2xl w-fit mx-auto select-none">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    billingPeriod === 'yearly'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Anual
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-md">
                    2 meses grátis
                  </span>
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. FREE PLAN (Left) */}
                <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  !isProPlan 
                    ? 'bg-[#0b0e22]/50 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]' 
                    : 'bg-slate-950/40 border-indigo-950/50'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Free</span>
                      {!isProPlan && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono">PLANO ATUAL</span>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-slate-100 flex items-baseline gap-1.5">
                      <span>R$ 0</span>
                      <span className="text-xs font-semibold text-slate-500">/ grátis</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Ideal para testar integrações, projetos pessoais e automatizar rotinas simples — sem cartão de crédito.
                    </p>

                    {/* Benefits List */}
                    <ul className="mt-6 space-y-3 text-xs text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Até <strong>5 jobs</strong> ativos — disparo a cada 30s</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Retentativas automáticas com backoff exponencial</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Histórico de execuções por <strong>7 dias</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Digest diário de falhas por <strong>e-mail</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Assinatura HMAC + proteção SSRF incluídas</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>API Key ilimitada + OAuth Google & GitHub</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                        <svg className="w-4 h-4 shrink-0 text-slate-600 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Alertas imediatos via Slack / Discord / Webhook</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                        <svg className="w-4 h-4 shrink-0 text-slate-600 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Workflows encadeados entre jobs</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                        <svg className="w-4 h-4 shrink-0 text-slate-600 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Flow AI Copilot — criação por linguagem natural</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl text-xs font-bold text-center text-slate-500 bg-slate-900 border border-indigo-950/30 cursor-not-allowed select-none"
                    >
                      {!isProPlan ? 'Seu Plano Ativo' : 'Plano Gratuito'}
                    </button>
                  </div>
                </div>

                {/* 2. PRO PLAN (Right) - Highly persuasive and premium */}
                <div className={`p-6 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isProPlan 
                    ? 'bg-gradient-to-br from-indigo-950/40 to-cyan-950/15 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]' 
                    : 'bg-gradient-to-br from-indigo-950/60 to-purple-950/20 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
                }`}>
                  {/* Decorative Glow */}
                  <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />
                  
                  {/* Popular Tag */}
                  <span className="absolute top-4 right-4 bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg select-none shadow-md">
                    RECOMENDADO ⭐
                  </span>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">PLANO PRO</span>
                      {isProPlan && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded font-mono">ATIVO 👑</span>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-slate-100 flex items-baseline gap-1.5">
                      <span>{billingPeriod === 'yearly' ? 'R$ 290' : 'R$ 29'}</span>
                      <span className="text-xs font-semibold text-slate-500">
                        {billingPeriod === 'yearly' ? '/ ano' : '/ mês'}
                      </span>
                      {billingPeriod === 'yearly' && (
                        <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-md">
                          −16%
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Para times e produtos em produção que não podem se dar ao luxo de falhas silenciosas.
                    </p>

                    {/* Benefits List */}
                    <ul className="mt-6 space-y-3 text-xs text-slate-200">
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Até <strong>50 jobs</strong> ativos — disparo a cada 30s</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Múltiplos projetos <strong>(workspaces)</strong> ativos</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Logs e auditoria por <strong>90 dias</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Alertas imediatos por e-mail na 3ª falha consecutiva</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Webhooks de alerta — <strong>Slack, Discord, ntfy</strong> e genérico</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Workflows encadeados — <strong>pipeline de jobs</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Flow AI Copilot</strong> — crie jobs por linguagem natural</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Assinatura HMAC + SSRF + API Keys ilimitadas</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Suporte prioritário por e-mail</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-slate-500">
                        <svg className="w-4 h-4 text-slate-600 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Exportação de logs CSV/JSON <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-400/10 text-amber-400/70 border border-amber-400/20 rounded ml-1">em breve</span></span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8">
                    {isProPlan ? (
                      <button
                        type="button"
                        onClick={handleManageSubscription}
                        className="w-full py-3.5 rounded-xl text-xs font-bold text-center text-cyan-400 hover:text-white bg-cyan-950/20 hover:bg-cyan-900 border border-cyan-500/30 transition-all cursor-pointer"
                      >
                        Gerenciar Assinatura ⚙️
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className="w-full py-3.5 rounded-xl text-xs font-black text-center text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-450 transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none"
                      >
                        <span>Fazer Upgrade para PRO 💎</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-indigo-950/40">
              <button
                onClick={() => setPlansModalOpen(false)}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-350 hover:text-white bg-slate-800/60 hover:bg-slate-800/90 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
