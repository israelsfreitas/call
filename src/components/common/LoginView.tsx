import React, { useState } from 'react';
import { useHubStore } from '../../stores/hubStore';
import { useUIStore } from '../../stores/uiStore';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck, Sun, Moon } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithName, authenticate } = useHubStore();
  const { theme, toggleTheme } = useUIStore();
  const cachedName = localStorage.getItem('call_user_name') || '';

  const [name, setName] = useState(cachedName);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Por favor, informe seu nome ou apelido para entrar.');
      return;
    }

    if (showPassword && password.trim()) {
      const success = authenticate(password.trim(), trimmedName);
      if (!success) {
        setError('Senha inválida. Deixe em branco para entrar sem senha ou use "call" / "1234".');
        return;
      }
    } else {
      const success = loginWithName(trimmedName);
      if (!success) {
        setError('Erro ao entrar. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F6F0] dark:bg-[#0F0F0E] text-[#171717] dark:text-[#F5F5F0] p-4 select-none selection:bg-[#171717] selection:text-white dark:selection:bg-[#B7FF2A] dark:selection:text-[#171717] transition-colors duration-200 relative">
      {/* Texture background */}
      <div className="fixed inset-0 bg-[radial-gradient(#DCDCD4_1px,transparent_1px)] dark:bg-[radial-gradient(#2A2A28_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none -z-10" />

      {/* Botão de Alternar Tema (Modo Escuro / Claro) */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        className="absolute top-6 right-6 p-2.5 rounded-[16px] bg-[#FFFFFF] dark:bg-[#181817] border border-[#E7E6DF] dark:border-[#2A2A28] text-[#171717] dark:text-[#F5F5F0] shadow-sm hover:scale-105 transition-all cursor-pointer tactile-btn"
      >
        {theme === 'dark' ? <Sun size={18} className="text-[#B7FF2A]" /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-[20px] bg-[#171717] dark:bg-[#B7FF2A] text-white dark:text-[#171717] flex items-center justify-center font-black text-2xl tracking-tight shadow-md">
            CALL
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[#171717] dark:text-[#F5F5F0] mt-1">
            CALL
          </h1>
          <p className="text-xs text-[#686861] dark:text-[#A3A39C] font-medium tracking-tight">
            Comunicação de voz, vídeo e tela em tempo real
          </p>
        </div>

        {/* Bento Box Card */}
        <div className="w-full bg-[#FFFFFF] dark:bg-[#181817] rounded-[24px] border border-[#E7E6DF] dark:border-[#2A2A28] shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] p-7 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E6DF] dark:border-[#2A2A28]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[14px] bg-[#EFEEE8] dark:bg-[#242422] text-[#171717] dark:text-[#F5F5F0] border border-[#E7E6DF] dark:border-[#2A2A28] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[#171717] dark:text-[#F5F5F0]">
                  Entrar na Chamada
                </h2>
                <p className="text-[11px] text-[#686861] dark:text-[#A3A39C] tracking-tight">
                  Apenas informe seu nome para começar
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFEEE8] dark:bg-[#242422] text-[#171717] dark:text-[#F5F5F0] border border-[#E7E6DF] dark:border-[#2A2A28] text-[10px] font-bold uppercase tracking-wider font-mono">
              Acesso Livre
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F0]">
                Seu nome ou apelido
              </label>
              <div className="flex items-center gap-3 bg-white dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] rounded-[18px] px-4 py-3 focus-within:border-[#171717] dark:focus-within:border-[#B7FF2A] focus-within:ring-4 focus-within:ring-[#B7FF2A]/20 transition-all">
                <User className="w-4 h-4 text-[#92928A] dark:text-[#73736C] shrink-0" />
                <input
                  type="text"
                  maxLength={24}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  placeholder="Como quer ser chamado?"
                  className="flex-1 outline-none bg-transparent text-sm text-[#171717] dark:text-[#F5F5F0] placeholder-[#92928A] dark:placeholder-[#73736C]"
                  autoFocus
                />
              </div>
            </div>

            {/* Opção para entrar com senha se desejar */}
            {showPassword ? (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F0]">
                    Senha do servidor (opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(false);
                      setPassword('');
                    }}
                    className="text-[11px] text-[#92928A] hover:text-[#171717] dark:hover:text-white underline cursor-pointer"
                  >
                    Ocultar senha
                  </button>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] rounded-[18px] px-4 py-3 focus-within:border-[#171717] dark:focus-within:border-[#B7FF2A] focus-within:ring-4 focus-within:ring-[#B7FF2A]/20 transition-all">
                  <Lock className="w-4 h-4 text-[#92928A] dark:text-[#73736C] shrink-0" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Digite a senha se configurada (ex: call)"
                    className="flex-1 outline-none bg-transparent text-sm text-[#171717] dark:text-[#F5F5F0] placeholder-[#92928A] dark:placeholder-[#73736C]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(true)}
                  className="text-[11px] text-[#92928A] hover:text-[#171717] dark:hover:text-[#F5F5F0] transition-colors cursor-pointer"
                >
                  Usar senha de servidor?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full mt-1 bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] font-semibold py-3.5 rounded-[16px] tactile-btn shadow-[0_4px_16px_rgba(183,255,42,0.35)] transition-all duration-200 text-sm tracking-tight flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Entrar no CALL</span>
            </button>
          </form>
        </div>

        {/* Informative footer tip */}
        <div className="text-center text-xs text-[#92928A] dark:text-[#73736C]">
          Sem necessidade de cadastro. Seu nome fica salvo no navegador para os próximos acessos.
        </div>
      </div>
    </div>
  );
};
