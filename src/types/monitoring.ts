export interface MonitorRule {
  id: string;
  jobId?: string | null;
  name: string;
  key: string;
  operator: string;
  thresholdValue: string;
  mode: 'observe' | 'require_success';
  valueType: 'legacy' | 'number' | 'string' | 'boolean' | 'null';
  alertEmail: boolean;
  webhookUrl?: string | null;
  isEnabled: boolean;
}

export interface ResponseField {
  path: string;
  label: string;
  type: Exclude<MonitorRule['valueType'], 'legacy'>;
  value: string;
}

// JSON Pointer keeps literal dots, slashes and empty property names unambiguous.
export function responseFields(body: string): ResponseField[] {
  const fields: ResponseField[] = [];
  const visit = (value: unknown, segments: string[], labels: string[]) => {
    if (fields.length >= 500 || segments.length > 32) return;
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        visit(child, [...segments, key.replace(/~/g, '~0').replace(/\//g, '~1')], [...labels, key]);
        if (fields.length >= 500) break;
      }
    } else if (segments.length) {
      const type = value === null ? 'null' : typeof value;
      if (type !== 'null' && type !== 'number' && type !== 'string' && type !== 'boolean') return;
      const path = `/${segments.join('/')}`;
      if (path.length > 100) return;
      fields.push({ path, label: labels.map((key) => JSON.stringify(key)).join(' → '), type, value: type === 'string' ? String(value) : JSON.stringify(value) });
    }
  };
  visit(JSON.parse(body), [], []);
  return fields;
}
