import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// ==========================================
// 🔄 MAPEADORES ESTRITOS (PascalCase ⇄ camelCase)
// ==========================================

const pascalToCamel = (str: string): string => {
  // Casos especiais de siglas que o Go renderiza totalmente em maiúsculo
  if (str === 'ID') return 'id';
  if (str === 'URL') return 'url';
  if (str === 'HTTPMethod') return 'httpMethod';
  if (str === 'ProjectID') return 'projectId';
  if (str === 'NextRunAt') return 'nextRunAt';
  if (str === 'LastRunAt') return 'lastRunAt';
  if (str === 'ConsecutiveFailures') return 'consecutiveFailures';
  if (str === 'WebhookAlertURL') return 'webhookAlertUrl';
  if (str === 'CreatedAt') return 'createdAt';
  if (str === 'UpdatedAt') return 'updatedAt';
  if (str === 'JobID') return 'jobId';
  if (str === 'TriggeredAt') return 'triggeredAt';
  if (str === 'StartedAt') return 'startedAt';
  if (str === 'FinishedAt') return 'finishedAt';
  if (str === 'HTTPStatus') return 'httpStatus';
  if (str === 'DurationMs') return 'durationMs';
  if (str === 'ResponseBody') return 'responseBody';
  if (str === 'AttemptNumber') return 'attemptNumber';

  return str.charAt(0).toLowerCase() + str.slice(1);
};

const camelToPascal = (str: string): string => {
  if (str === 'id') return 'ID';
  if (str === 'url') return 'URL';
  if (str === 'httpMethod') return 'HTTPMethod';
  if (str === 'projectId') return 'ProjectID';
  if (str === 'nextRunAt') return 'NextRunAt';
  if (str === 'lastRunAt') return 'LastRunAt';
  if (str === 'consecutiveFailures') return 'ConsecutiveFailures';
  if (str === 'webhookAlertUrl') return 'WebhookAlertURL';
  if (str === 'createdAt') return 'CreatedAt';
  if (str === 'updatedAt') return 'UpdatedAt';
  if (str === 'jobId') return 'JobID';
  if (str === 'triggeredAt') return 'TriggeredAt';
  if (str === 'startedAt') return 'StartedAt';
  if (str === 'finishedAt') return 'FinishedAt';
  if (str === 'httpStatus') return 'HTTPStatus';
  if (str === 'durationMs') return 'DurationMs';
  if (str === 'responseBody') return 'ResponseBody';
  if (str === 'attemptNumber') return 'AttemptNumber';

  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ==========================================
// 🌲 FUNÇÕES RECURSIVAS TIPO-SEGURO (SEM ANY)
// ==========================================

export const keysToCamel = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const record = obj as Record<string, unknown>;
    return Object.keys(record).reduce<Record<string, unknown>>((result, key) => {
      const camelKey = pascalToCamel(key);
      // Ignora chaves internas de dicionários configurados pelo usuário (como Headers ou Payload JSON)
      if (key.toLowerCase() === 'headers' || key.toLowerCase() === 'payload') {
        result[camelKey] = record[key];
      } else {
        result[camelKey] = keysToCamel(record[key]);
      }
      return result;
    }, {});
  }
  return obj;
};

export const keysToPascal = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToPascal(v));
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const record = obj as Record<string, unknown>;
    return Object.keys(record).reduce<Record<string, unknown>>((result, key) => {
      const pascalKey = camelToPascal(key);
      if (key === 'headers' || key === 'payload') {
        result[pascalKey] = record[key];
      } else {
        result[pascalKey] = keysToPascal(record[key]);
      }
      return result;
    }, {});
  }
  return obj;
};

// ==========================================
// 📡 CONFIGURAÇÃO DO INSTÂNCIA DO AXIOS
// ==========================================

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisições
api.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const token = state.token?.accessToken || localStorage.getItem('cf_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Transforma o payload de camelCase para o PascalCase estrutural do Go
    if (config.data && !(config.data instanceof FormData)) {
      config.data = keysToPascal(config.data);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respostas
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = keysToCamel(response.data);
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response && error.response.data) {
      error.response.data = keysToCamel(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;