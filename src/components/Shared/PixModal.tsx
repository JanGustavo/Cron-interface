import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useUiStore } from '../../store/uiStore';

interface SugestaoValor {
	label: string;
	valor: string;
}

interface PixModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface Particle {
	id: number;
	left: string;
	background: string;
	duration: string;
	delay: string;
	size: string;
}

interface Confetti {
	id: number;
	left: string;
	top: string;
	background: string;
	width: string;
	height: string;
	borderRadius: string;
	duration: string;
	delay: string;
}

const COLORS = ['#6200EE', '#9c42f5', '#c084fc', '#818cf8', '#00BCD4', '#f472b6', '#facc15', '#34d399', '#60a5fa'];

export const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose }) => {
	const { showToast } = useUiStore();
	const [valores, setValores] = useState<SugestaoValor[]>([]);
	const [currentValor, setCurrentValor] = useState('1.00');
	const [loadingQR, setLoadingQR] = useState(false);
	const [qrB64, setQrB64] = useState('');
	const [payload, setPayload] = useState('');
	const [showThanks, setShowThanks] = useState(false);
	const [loadingValores, setLoadingValores] = useState(false);
	const [thanksEmoji, setThanksEmoji] = useState('🎉');

	// Partículas e Confetes gerados dinamicamente
	const [particles, setParticles] = useState<Particle[]>([]);
	const [confettis, setConfettis] = useState<Confetti[]>([]);

	const generateParticles = useCallback(() => {
		const newParticles: Particle[] = [];
		for (let i = 0; i < 18; i++) {
			newParticles.push({
				id: i,
				left: `${Math.random() * 100}%`,
				background: COLORS[Math.floor(Math.random() * COLORS.length)],
				duration: `${4 + Math.random() * 6}s`,
				delay: `${Math.random() * 4}s`,
				size: `${4 + Math.random() * 6}px`
			});
		}
		setParticles(newParticles);
	}, []);

	const generateConfetti = useCallback(() => {
		const newConfetti: Confetti[] = [];
		for (let i = 0; i < 60; i++) {
			newConfetti.push({
				id: i,
				left: `${Math.random() * 100}%`,
				top: `${-10 - Math.random() * 20}px`,
				background: COLORS[Math.floor(Math.random() * COLORS.length)],
				width: `${6 + Math.random() * 8}px`,
				height: `${6 + Math.random() * 8}px`,
				borderRadius: Math.random() > 0.5 ? '50%' : '2px',
				duration: `${1.2 + Math.random() * 1.5}s`,
				delay: `${Math.random() * 0.8}s`
			});
		}
		setConfettis(newConfetti);
	}, []);

	const [customValue, setCustomValue] = useState('');
	const [activeTab, setActiveTab] = useState<'suggested' | 'custom'>('suggested');

	const loadValores = useCallback(async () => {
		setLoadingValores(true);
		try {
			const res = await api.get('/v1/pix/valores');
			const data = res.data as SugestaoValor[];
			setValores(data);
			if (data.length > 0) {
				setCurrentValor(data[0].valor);
			}
		} catch (err) {
			console.error('Failed to load PIX values, using fallback', err);
			setValores([
				{ label: '☕ Café', valor: '5.00' },
				{ label: '🍺 Breja', valor: '10.00' },
				{ label: '🍕 Pizza', valor: '20.00' }
			]);
			setCurrentValor('5.00');
		} finally {
			setLoadingValores(false);
		}
	}, []);

	const loadQR = useCallback(async (valor: string) => {
		const num = parseFloat(valor);
		if (isNaN(num) || num <= 0) return;
		setLoadingQR(true);
		try {
			const res = await api.get(`/v1/pix/qr?valor=${valor}`);
			const data = res.data as { qrCode?: string; qr_code?: string; payload: string };
			setQrB64(data.qrCode || data.qr_code || '');
			setPayload(data.payload);
		} catch (err) {
			console.error(err);
			showToast('Erro ao gerar QR Code PIX.', 'error');
		} finally {
			setLoadingQR(false);
		}
	}, [showToast]);

	const initAudio = () => {
		try {
			const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				const ctx = new AudioContextClass();
				const playNote = (freq: number, start: number, duration: number, gain = 0.3) => {
					const osc = ctx.createOscillator();
					const gainNode = ctx.createGain();
					osc.connect(gainNode);
					gainNode.connect(ctx.destination);
					osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
					gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
					gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.05);
					gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
					osc.type = 'sine';
					osc.start(ctx.currentTime + start);
					osc.stop(ctx.currentTime + start + duration);
				};

				// Acorde de vitória
				playNote(523.25, 0.0, 0.3);  // C5
				playNote(659.25, 0.12, 0.3);  // E5
				playNote(783.99, 0.24, 0.3);  // G5
				playNote(1046.5, 0.36, 0.6);  // C6
			}
		} catch (err) {
			console.error('AudioContext error:', err);
		}
	};

	const handleConfirmPayment = () => {
		setShowThanks(true);
		generateConfetti();
		initAudio();

		// Animação do emoji
		const emojis = ['🎉', '💜', '🚀', '✨', '🙏'];
		let i = 0;
		const interval = setInterval(() => {
			setThanksEmoji(emojis[i % emojis.length]);
			i++;
			if (i >= emojis.length * 2) clearInterval(interval);
		}, 300);
	};

	const handleCopyPayload = () => {
		if (payload) {
			navigator.clipboard.writeText(payload);
			showToast('Código PIX Copia e Cola copiado! 📋', 'success');
		}
	};

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
			const timer = setTimeout(() => {
				setShowThanks(false);
				loadValores();
				generateParticles();
			}, 0);
			return () => {
				clearTimeout(timer);
				document.body.style.overflow = '';
			};
		} else {
			document.body.style.overflow = '';
		}
	}, [isOpen, loadValores, generateParticles]);

	useEffect(() => {
		if (isOpen && currentValor) {
			const timer = setTimeout(() => {
				loadQR(currentValor);
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [isOpen, currentValor, loadQR]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
			{/* Partículas de fundo */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{particles.map((p) => (
					<span
						key={p.id}
						className="absolute rounded-full opacity-40 animate-[float-particle_linear_infinite]"
						style={{
							left: p.left,
							background: p.background,
							animationDuration: p.duration,
							animationDelay: p.delay,
							width: p.size,
							height: p.size,
							bottom: '-20px'
						}}
					/>
				))}
			</div>

			{!showThanks ? (
				<div className="relative w-full max-w-[420px] rounded-3xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-6 md:p-8 shadow-[0_0_50px_rgba(99,102,241,0.25)] text-center transition-all duration-300">
					{/* Cabeçalho */}
					<button
						onClick={onClose}
						className="absolute top-4 right-4 bg-slate-800/60 hover:bg-slate-850 hover:text-white border border-slate-700/50 rounded-full w-8 h-8 flex items-center justify-center text-xs text-slate-400 cursor-pointer focus:outline-none transition-colors"
						title="Fechar"
					>
						✕
					</button>

					<div className="mb-5">
						<span className="inline-block text-4xl mb-2 animate-[pulse-heart_1.8s_ease-in-out_infinite] select-none">💜</span>
						<h2 className="text-xl font-bold tracking-wide bg-linear-to-r from-purple-400 via-indigo-400 to-indigo-500 bg-clip-text text-transparent">
							Apoie o CronFlow
						</h2>
						<p className="text-xs text-slate-400 leading-relaxed mt-2.5">
							O CronFlow é feito com amor e código open-source.<br />
							Qualquer contribuição Pix mantém os servidores e a API ativos!
						</p>
					</div>

					{/* Tabs Seletoras */}
					<div className="flex border-b border-indigo-950/20 mb-5 font-mono text-[10px] uppercase font-bold tracking-wider">
						<button
							onClick={() => {
								setActiveTab('suggested');
								setQrB64('');
								setPayload('');
								setCurrentValor('5.00');
							}}
							className={`flex-1 pb-2 border-b-2 transition-colors cursor-pointer ${
								activeTab === 'suggested' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 hover:text-slate-400 border-transparent'
							}`}
						>
							Sugeridos
						</button>
						<button
							onClick={() => {
								setActiveTab('custom');
								setQrB64('');
								setPayload('');
								setCurrentValor('');
							}}
							className={`flex-1 pb-2 border-b-2 transition-colors cursor-pointer ${
								activeTab === 'custom' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 hover:text-slate-400 border-transparent'
							}`}
						>
							Outro Valor
						</button>
					</div>

					{/* Layout dos valores sugeridos */}
					{activeTab === 'suggested' ? (
						<div className="grid grid-cols-3 gap-2.5 mb-5 animate-in fade-in duration-200">
							{loadingValores ? (
								<div className="col-span-3 py-4 text-xs text-slate-500 border border-dashed border-indigo-950/40 rounded-xl bg-indigo-950/5">
									Carregando valores...
								</div>
							) : (
								valores.map((item) => {
									const isSelected = item.valor === currentValor;
									return (
										<button
											key={item.valor}
											onClick={() => setCurrentValor(item.valor)}
											className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
												isSelected
													? 'bg-indigo-650/20 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
													: 'bg-[#080a17]/80 hover:bg-indigo-955/20 border-indigo-950/80 hover:border-indigo-900/60'
											}`}
										>
											<span className="text-lg">{item.label.split(' ')[0]}</span>
											<span className="text-[10px] text-slate-450 mt-1 uppercase font-semibold">
												{item.label.split(' ').slice(1).join(' ') || 'Apoio'}
											</span>
											<span className="text-xs font-bold text-slate-200 mt-0.5">
												{Number(item.valor).toLocaleString('pt-BR', {
													style: 'currency',
													currency: 'BRL'
												})}
											</span>
										</button>
									);
								})
							)}
						</div>
					) : (
						/* Layout de valor personalizado */
						<div className="space-y-2 mb-5 text-left animate-in fade-in duration-200">
							<label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
								Digite o valor desejado (BRL)
							</label>
							<div className="relative">
								<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-450 font-mono">
									R$
								</span>
								<input
									type="text"
									placeholder="0,00"
									value={customValue}
									onChange={(e) => {
										// Apenas números e separadores de decimais básicos
										const clean = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
										setCustomValue(clean);
										// Agenda atualização ao parar de digitar
										const parsed = parseFloat(clean);
										if (!isNaN(parsed) && parsed > 0) {
											setCurrentValor(parsed.toFixed(2));
										}
									}}
									className="w-full pl-10 pr-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs font-bold text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 font-mono transition-all"
								/>
							</div>
						</div>
					)}

					{/* QR Code */}
					<div className="flex items-center justify-center min-h-[170px] mb-5">
						{loadingQR ? (
							<div className="flex flex-col items-center gap-2 text-slate-500 text-xs animate-pulse">
								<div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
								<span>Gerando QR Code...</span>
							</div>
						) : (
							qrB64 && (
								<img
									src={qrB64}
									alt="QR Code PIX"
									className="w-44 h-44 rounded-xl p-2 bg-white shadow-md animate-[qr-appear_0.4s_ease]"
								/>
							)
						)}
					</div>

					{/* Botão Copia e Cola */}
					{payload && (
						<button
							onClick={handleCopyPayload}
							className="mb-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-950/30 border border-indigo-500/25 rounded-lg text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-200 transition-colors cursor-pointer"
						>
							<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
							</svg>
							Copiar PIX Copia e Cola
						</button>
					)}

					{/* Instrução */}
					<p className="text-[10px] text-slate-450 leading-relaxed max-w-70 mx-auto mb-6">
						Abra o app do seu banco → <strong>Pix</strong> → <strong>Ler QR Code</strong> ou cole o código acima.
					</p>

					{/* Botão Confirmação */}
					<button
						onClick={handleConfirmPayment}
						className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
					>
						✅ Já contribuí!
					</button>
				</div>
			) : (
				/* TELA DE AGRADECIMENTO */
				<div className="relative w-full max-w-90 rounded-3xl border border-indigo-500/40 bg-[#0a0d1d]/95 p-8 text-center shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-[thanks-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden">
					{/* Confetes caindo */}
					<div className="absolute inset-0 pointer-events-none overflow-hidden">
						{confettis.map((c) => (
							<span
								key={c.id}
								className="absolute rounded-[2px] animate-[confetti-fall_linear_forwards]"
								style={{
									left: c.left,
									top: c.top,
									background: c.background,
									width: c.width,
									height: c.height,
									borderRadius: c.borderRadius,
									animationDuration: c.duration,
									animationDelay: c.delay
								}}
							/>
						))}
					</div>

					<div className="relative z-10 flex flex-col items-center">
						<span className="text-6xl mb-4 animate-[bounce-in_0.6s_cubic-bezier(0.34,1.56,0.64,1)_0.1s_both]">{thanksEmoji}</span>
						<h2 className="text-2xl font-black bg-linear-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
							Muito obrigado!
						</h2>
						<p className="text-xs text-slate-400 leading-relaxed my-4 max-w-70">
							Sua contribuição é combustível para continuarmos melhorando o CronFlow.<br />
							Você é incrível! 💜
						</p>
						<button
							onClick={onClose}
							className="mt-2 px-6 py-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 hover:border-indigo-400/50 rounded-full text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
						>
							Continuar
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
