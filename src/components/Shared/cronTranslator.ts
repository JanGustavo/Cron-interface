export const translateSchedule = (schedule: string): string => {
  if (!schedule) return '';
  schedule = schedule.trim();
  if (schedule.startsWith('every:')) {
    const parts = schedule.split(':');
    if (parts.length < 2) return '';
    const val = parts[1];
    const num = parseInt(val, 10);
    const unit = val.replace(/[0-9]/g, '');
    if (isNaN(num)) return `A cada intervalo (${val})`;
    switch (unit) {
      case 'm': return `A cada ${num} minuto${num > 1 ? 's' : ''}`;
      case 'h': return `A cada ${num} hora${num > 1 ? 's' : ''}`;
      case 'd': return `A cada ${num} dia${num > 1 ? 's' : ''}`;
      default: return `A cada ${num} ${unit}`;
    }
  }
  
  const cronParts = schedule.split(/\s+/);
  if (cronParts.length !== 5) return 'Expressão cron personalizada';
  
  const [min, hour, dom, month, dow] = cronParts;
  
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'A cada minuto';
  }
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const step = min.split('/')[1];
    const stepNum = parseInt(step, 10);
    return `A cada ${step} minuto${stepNum > 1 ? 's' : ''}`;
  }
  if (hour.startsWith('*/') && min === '0' && dom === '*' && month === '*' && dow === '*') {
    const step = hour.split('/')[1];
    return `A cada ${step} horas no minuto zero`;
  }
  if (min.indexOf('*') === -1 && hour.indexOf('*') === -1 && dom === '*' && month === '*' && dow === '*') {
    return `Diariamente às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (min.indexOf('*') === -1 && hour.indexOf('*') === -1 && dom === '*' && month === '*' && dow !== '*') {
    const daysMap: Record<string, string> = {
      '0': 'domingos', '7': 'domingos', '1': 'segundas-feiras', '2': 'terças-feiras',
      '3': 'quartas-feiras', '4': 'quintas-feiras', '5': 'sextas-feiras', '6': 'sábados',
      '1-5': 'dias úteis (segunda a sexta)'
    };
    const dowStr = daysMap[dow] || `dia(s) ${dow} da semana`;
    return `Toda ${dowStr} às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  
  return 'Expressão cron personalizada';
};

export const parseCurl = (curl: string) => {
  curl = curl.trim();
  if (!curl.startsWith('curl')) return null;
  
  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let payload: Record<string, unknown> | string | undefined = undefined;
  
  const urlMatch = curl.match(/(?:https?:\/\/[^\s"'`]+)/);
  if (urlMatch) {
    url = urlMatch[0];
  }
  
  const methodMatch = curl.match(/(?:-X|--request)\s+([A-Z]+)/);
  if (methodMatch) {
    method = methodMatch[1];
  } else if (curl.includes('-d') || curl.includes('--data') || curl.includes('--data-raw')) {
    method = 'POST';
  }
  
  const headerMatches = curl.matchAll(/(?:-H|--header)\s+["']([^"']+)["']/g);
  for (const match of headerMatches) {
    const headerStr = match[1];
    const parts = headerStr.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      headers[key] = val;
    }
  }
  
  const dataMatch = curl.match(/(?:-d|--data|--data-raw)\s+['"]({[^']+})['"]/);
  if (dataMatch) {
    try {
      payload = JSON.parse(dataMatch[1]);
    } catch {
      payload = dataMatch[1];
    }
  } else {
    const simpleDataMatch = curl.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
    if (simpleDataMatch) {
      try {
        payload = JSON.parse(simpleDataMatch[1]);
      } catch {
        payload = simpleDataMatch[1];
      }
    }
  }
  
  let hostname = 'Imported';
  try {
    if (url) {
      hostname = new URL(url).hostname;
    }
  } catch {
    // Ignore URL constructor error
  }
  
  return {
    name: `Importado de ${hostname}`,
    schedule: 'every:1h',
    url,
    httpMethod: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    payload: payload || undefined,
  };
};
