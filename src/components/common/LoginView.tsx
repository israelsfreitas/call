import React, { useState } from 'react';
import { useHubStore } from '../../stores/hubStore';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { authenticate } = useHubStore();
  const cachedName = localStorage.getItem('call_user_name') || '';

  const [password, setPassword] = useState('');
  const [name, setName] = useState(cachedName);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'password' | 'name'>('password');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'call' || password.trim() === '1234') {
      setError('');
      setStep('name');
    } else {
      setError('Senha inválida. Use a senha de acesso (ex: "call" ou "1234").');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome para entrar.');
      return;
    }
    const success = authenticate(password || 'call', name.trim());
    if (!success) {
      setError('Erro ao autenticar. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F6F0] p-4 select-none selection:bg-[#171717] selection:text-white">
      {/* Texture background */}
      <div className="fixed inset-0 bg-[radial-gradient(#DCDCD4_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none -z-10" />

      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-[20px] bg-[#171717] text-white flex items-center justify-center font-black text-2xl tracking-tight shadow-md">
            CALL
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[#171717] mt-1">
            CALL
          </h1>
          <p className="text-xs text-[#686861] font-medium tracking-tight">
            Comunicação de voz, vídeo e tela em tempo real
          </p>
        </div>

        {/* Bento Box Card */}
        <div className="w-full bg-[#FFFFFF] rounded-[24px] border border-[#E7E6DF] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-7 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E6DF]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[14px] bg-[#EFEEE8] text-[#171717] border border-[#E7E6DF] flex items-center justify-center shrink-0">
                {step === 'password' ? <Lock className="w-4 h-4 stroke-[2]" /> : <User className="w-4 h-4 stroke-[2]" />}
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[#171717]">
                  {step === 'password' ? 'Acesso com Senha' : 'Escolha seu Nome'}
                </h2>
                <p className="text-[11px] text-[#686861] tracking-tight">
                  {step === 'password' ? 'Informe a senha única do servidor' : 'Seu nome ficará salvo no navegador'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFEEE8] text-[#171717] border border-[#E7E6DF] text-[10px] font-bold uppercase tracking-wider font-mono">
              {step === 'password' ? 'Etapa 1/2' : 'Etapa 2/2'}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#171717]">
                  Senha única de acesso
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#E7E6DF] rounded-[18px] px-4 py-3 focus-within:border-[#171717] focus-within:ring-4 focus-within:ring-[#B7FF2A]/20 transition-all">
                  <Lock className="w-4 h-4 text-[#92928A] shrink-0" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Digite a senha (ex: call ou 1234)"
                    className="flex-1 outline-none bg-transparent text-sm text-[#171717] placeholder-[#92928A]"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!password.trim()}
                className="w-full mt-2 bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] font-semibold py-3.5 rounded-[16px] tactile-btn shadow-[0_4px_16px_rgba(183,255,42,0.35)] transition-all duration-200 text-sm tracking-tight flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#171717]">
                  Seu nome ou apelido
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#E7E6DF] rounded-[18px] px-4 py-3 focus-within:border-[#171717] focus-within:ring-4 focus-within:ring-[#B7FF2A]/20 transition-all">
                  <User className="w-4 h-4 text-[#92928A] shrink-0" />
                  <input
                    type="text"
                    maxLength={24}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="Como quer ser chamado?"
                    className="flex-1 outline-none bg-transparent text-sm text-[#171717] placeholder-[#92928A]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="px-4 py-3.5 rounded-[16px] bg-[#EFEEE8] hover:bg-[#E7E6DF] text-[#171717] border border-[#E7E6DF] text-xs font-semibold tracking-tight transition-all tactile-btn cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] font-semibold py-3.5 rounded-[16px] tactile-btn shadow-[0_4px_16px_rgba(183,255,42,0.35)] transition-all duration-200 text-sm tracking-tight flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Entrar no CALL</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Informative footer tip */}
        <div className="text-center text-xs text-[#92928A]">
          Senha compartilhada da comunidade. Uma vez autenticado, seu acesso fica salvo neste navegador.
        </div>
      </div>
    </div>
  );
};
