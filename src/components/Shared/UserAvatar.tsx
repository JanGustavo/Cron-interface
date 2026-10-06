import React, { useState } from 'react';

interface Props { url?: string; initials: string; className?: string }
export const UserAvatar: React.FC<Props> = ({ url = '', initials, className = '' }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let valid = false;
  try { const parsed = new URL(url); valid = parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { /* Use initials for an empty or invalid URL. */ }
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[inherit] ${className}`}>
    {valid && failedUrl !== url ? <img src={url} alt="Foto de perfil" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} /> : <span aria-label="Iniciais do perfil">{initials}</span>}
  </span>;
};
