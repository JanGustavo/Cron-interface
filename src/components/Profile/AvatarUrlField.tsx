import React, { useState } from 'react';
import { UserAvatar } from '../Shared/UserAvatar';

interface Props { value: string; onChange: (value: string) => void; initials: string }
export const AvatarUrlField: React.FC<Props> = ({ value, onChange, initials }) => {
  const [previewUrl, setPreviewUrl] = useState(value);
  return <section aria-label="Foto de perfil" className="rounded-2xl border border-indigo-950/40 bg-slate-950/20 p-4">
    <div className="flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-lg font-bold text-indigo-200"><UserAvatar url={previewUrl} initials={initials} className="h-full w-full" /></div>
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="profile-avatar-url" className="block text-xs font-semibold text-slate-300">URL da foto de perfil</label>
        <input id="profile-avatar-url" type="url" pattern="https://.*" maxLength={2048} value={value} onChange={event => onChange(event.target.value)} placeholder="https://exemplo.com/minha-foto.jpg" className="w-full min-w-0 rounded-xl border border-indigo-950/40 bg-slate-950/40 px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40" />
        <p className="text-xs leading-relaxed text-slate-500">Use um link HTTPS direto para a imagem. Se ela não carregar, suas iniciais aparecem. Salve os dados para aplicar a alteração.</p>
        <div className="flex flex-wrap gap-4"><button type="button" onClick={() => setPreviewUrl(value.trim())} className="text-xs font-semibold text-indigo-300">Pré-visualizar</button><button type="button" onClick={() => { onChange(''); setPreviewUrl(''); }} className="text-xs text-slate-400">Remover foto</button></div>
      </div>
    </div>
  </section>;
};
