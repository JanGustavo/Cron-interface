import { useAuthStore } from '../store/authStore';

export interface Entitlements {
  maxJobs: number;
  maxUsers: number;
  logsRetentionDays: number;
  workflowsEnabled: boolean;
  alertsWebhooksEnabled: boolean;
  multiProjectEnabled: boolean;
  isPro: boolean;
  currentJobsCount: number;
}

export const useEntitlements = (): Entitlements => {
  const { user } = useAuthStore();

  const currentJobsCount = user?.totalJobsCreated ?? 0;

  // Se o backend retornou os limites dinâmicos no perfil, essa é a fonte única de verdade
  if (user?.limits) {
    return {
      maxJobs: user.limits.maxJobs,
      maxUsers: user.limits.maxUsers,
      logsRetentionDays: user.limits.logsRetentionDays,
      workflowsEnabled: user.limits.workflowsEnabled,
      alertsWebhooksEnabled: user.limits.alertsWebhooksEnabled,
      multiProjectEnabled: user.limits.multiProjectEnabled,
      isPro: user.plan === 'pro',
      currentJobsCount,
    };
  }

  // Fallback estático caso o perfil ainda esteja carregando ou não tenha os limites
  const isPro = user?.plan === 'pro';
  if (isPro) {
    return {
      maxJobs: 50,
      maxUsers: 3,
      logsRetentionDays: 90,
      workflowsEnabled: true,
      alertsWebhooksEnabled: true,
      multiProjectEnabled: true,
      isPro: true,
      currentJobsCount,
    };
  }

  return {
    maxJobs: 5,
    maxUsers: 1,
    logsRetentionDays: 7,
    workflowsEnabled: false,
    alertsWebhooksEnabled: false,
    multiProjectEnabled: false,
    isPro: false,
    currentJobsCount,
  };
};
