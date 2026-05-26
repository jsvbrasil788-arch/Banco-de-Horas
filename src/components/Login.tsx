/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Key, 
  AlertCircle, 
  Mail, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
} from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  // Navigation between accessing vs registering
  const [isRegister, setIsRegister] = useState<boolean>(false);
  
  // Registration Type: by email or cell phone number
  const [registerType, setRegisterType] = useState<'email' | 'cellphone'>('email');

  // Login inputs
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration inputs
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  
  // OTP Verification Simulator
  const [verificationSent, setVerificationSent] = useState<boolean>(false);
  const [simulatedCode, setSimulatedCode] = useState<string>('');
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);

  // Legacy default user prefill check
  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const savedUser = localStorage.getItem('conv_banco_horas_user') || 'admin';
    const savedPass = localStorage.getItem('conv_banco_horas_pass') || '123456';

    const cleanUsername = username.trim().toLowerCase();
    const cleanSavedUser = savedUser.trim().toLowerCase();

    if (cleanUsername === cleanSavedUser && password === savedPass) {
      onLogin(username);
    } else {
      setLoginError('Usuários ou credenciais incorretas. Caso tenha criado um novo usuário agora, use o e-mail/celular e a senha cadastrados.');
    }
  };

  // Preset default user log in
  const handleUseDefaults = () => {
    const savedUser = localStorage.getItem('conv_banco_horas_user') || 'admin';
    const savedPass = localStorage.getItem('conv_banco_horas_pass') || '123456';
    setUsername(savedUser);
    setPassword(savedPass);
    setLoginError(null);
  };

  // Phase 1: Request Verification Code (Simulated email or cell phone message carrier)
  const handleRequestVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const targetContact = registerType === 'email' ? regEmail.trim() : regPhone.trim();
    if (!regName.trim()) {
      setRegisterError('Por favor, informe seu nome completo.');
      return;
    }
    if (!targetContact) {
      setRegisterError(
        registerType === 'email' 
          ? 'Por favor, digite um endereço de e-mail válido.' 
          : 'Por favor, digite seu número de celular com DDD.'
      );
      return;
    }
    if (regPassword.length < 4) {
      setRegisterError('A senha de segurança precisa ter no mínimo 4 dígitos.');
      return;
    }

    // Generate a random 6-digit interactive code to surprise and delight
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedCode(randomCode);
    setVerificationSent(true);
  };

  // Phase 2: Confirm OTP & Store credentials local ledger
  const handleConfirmRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (enteredCode !== simulatedCode) {
      setRegisterError('Código de confirmação inválido. Digite o código de 6 dígitos exibido na simulação abaixo.');
      return;
    }

    const finalUsername = registerType === 'email' ? regEmail.trim().toLowerCase() : regPhone.trim();

    // 1. Save standard credential keys so Login checks can authenticate them
    localStorage.setItem('conv_banco_horas_user', finalUsername);
    localStorage.setItem('conv_banco_horas_pass', regPassword);

    // 2. Generate and override Profile details directly so they see their name in premium layouts
    const newProfile = {
      name: regName.trim(),
      role: 'Colaborador Registrado',
      admissionDate: new Date().toISOString().split('T')[0],
      initialBalanceMinutes: 0,
      scheme: 'balanced5day',
      customTargets: [
        { dayOfWeek: 1, targetMinutes: 528 }, // seg (8h48m)
        { dayOfWeek: 2, targetMinutes: 528 }, // ter
        { dayOfWeek: 3, targetMinutes: 528 }, // qua
        { dayOfWeek: 4, targetMinutes: 528 }, // qui
        { dayOfWeek: 5, targetMinutes: 528 }, // sex
        { dayOfWeek: 6, targetMinutes: 0 },   // sab
        { dayOfWeek: 0, targetMinutes: 0 },   // dom
      ]
    };
    localStorage.setItem('conv_banco_horas_profile_v1', JSON.stringify(newProfile));

    // Success transition
    setRegisterSuccess(true);
    setTimeout(() => {
      // Auto logins them immediately
      onLogin(finalUsername);
    }, 1800);
  };

  // Phone number formatter helper for typing convenience
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegPhone(formatPhoneNumber(e.target.value));
  };

  return (
    <div id="login-screen" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30 font-sans overflow-hidden relative">
      {/* Background gradients and floating dust */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/25 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full bg-blue-500/15 blur-[120px] pointer-events-none" />

      {/* Elegant alignment design lines resembling high-end modern interfaces */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent pointer-events-none" />

      {/* Futuristic accent ring */}
      <div className="absolute w-[600px] h-[600px] rounded-full border border-indigo-500/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-[800px] h-[800px] rounded-full border border-dashed border-violet-500/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-spin [animation-duration:120s]" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand visual header */}
        <div className="text-center mb-6 select-none relative">
          <div className="relative inline-flex mb-3">
            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-md opacity-40 animate-pulse" />
            <div className="relative inline-flex w-12 h-12 bg-indigo-600 rounded-2xl items-center justify-center shadow-lg rotate-12 transition-transform hover:rotate-0">
              <div className="w-5 h-5 border-2 border-white rounded-md rotate-45" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-mono">
            MEU <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_12px_rgba(129,140,248,0.3)]">HORÁRIO</span>
          </h1>
          <p className="text-xs text-indigo-400 mt-1 uppercase tracking-widest font-mono font-bold">Registro de Ponto & Banco de Horas</p>
        </div>

        {/* Dynamic Action Box Form Container with glassmorphic layout and borders */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden p-8 space-y-6 relative hover:border-indigo-500/30 transition-all duration-300">
          
          
          {/* Header tabs toggle to select Access vs Create */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 select-none">
            <button
              onClick={() => {
                setIsRegister(false);
                setLoginError(null);
                setRegisterSuccess(false);
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                !isRegister 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Acessar Ponto
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setRegisterError(null);
                setVerificationSent(false);
                setRegisterSuccess(false);
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                isRegister 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Usuário
            </button>
          </div>

          {/* SUCCESS OVERLAY TRIGGER */}
          {registerSuccess ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex w-14 h-14 bg-emerald-950/50 rounded-full border border-emerald-500/30 items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Usuário Criado com Sucesso!</h3>
              <p className="text-xxs text-slate-400 leading-normal max-w-xs mx-auto uppercase tracking-wide font-bold">
                Iniciando sessão corporativa de banco de horas...
              </p>
            </div>
          ) : !isRegister ? (
            
            /* ================= LOGIN MODE ================= */
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-bold text-white">Acesse sua Conta</h2>
                <p className="text-xxs text-slate-400 uppercase tracking-widest font-bold mt-1">Insira suas credenciais cadastradas</p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex gap-2.5 items-start text-xxs text-rose-300 leading-normal animate-pulse">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 select-none">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Usuário, E-mail ou Celular
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: admin ou seu celular/email"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-semibold font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Senha de Segurança
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha corporativa"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-mono font-semibold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer transform active:scale-98 uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4 text-indigo-200" /> Entrar no Meu Horário
                </button>
              </form>

              {/* Quick Access Helper Box & Default indicators */}
              <div className="pt-4 border-t border-slate-800 text-center space-y-3">
                <span className="text-[10px] text-slate-400 block font-semibold">Conta Administrativa de Teste:</span>
                
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl transition-all text-left">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase text-slate-350 tracking-wider">Acesso Master Padrão:</h4>
                      <p className="text-xxs text-slate-400 mt-1 font-mono leading-relaxed">
                        Usuário: <strong className="text-indigo-300 font-bold select-all">admin</strong> / 
                        Senha: <strong className="text-indigo-300 font-bold select-all">123456</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDefaults}
                    className="mt-2.5 w-full py-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/50 text-indigo-300 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Preencher Acesso de Teste
                  </button>
                </div>
              </div>
            </div>
          ) : (
            
            /* ================= REGISTER MODE ================= */
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-bold text-white">Crie seu Usuário de Ponto</h2>
                <p className="text-xxs text-slate-400 uppercase tracking-widest font-bold mt-1">Selecione o método de registro desejado</p>
              </div>

              {registerError && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex gap-2.5 items-start text-xxs text-rose-300 leading-normal">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{registerError}</span>
                </div>
              )}

              {/* Select method layout tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterType('email');
                    setVerificationSent(false);
                    setRegisterError(null);
                  }}
                  className={`py-2 text-[10px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerType === 'email' 
                      ? 'bg-indigo-600 text-white shadow-3xs' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Por E-mail
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setRegisterType('cellphone');
                    setVerificationSent(false);
                    setRegisterError(null);
                  }}
                  className={`py-2 text-[10px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerType === 'cellphone' 
                      ? 'bg-indigo-600 text-white shadow-3xs' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Por Celular
                </button>
              </div>

              {!verificationSent ? (
                
                /* PHASE 1: SUBMIT BASIC CONTACT INFO */
                <form onSubmit={handleRequestVerification} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                      Nome do Colaborador (Completo)
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Exemplo de Nome"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-semibold"
                      required
                    />
                  </div>

                  {registerType === 'email' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                        Endereço de E-mail
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nome@empresa.com.br"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-mono font-semibold"
                        required={registerType === 'email'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                        Número de Celular
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={handlePhoneChange}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-mono font-semibold"
                        required={registerType === 'cellphone'}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                      Crie sua Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo de 4 dígitos"
                        className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950 transition-all font-mono font-semibold"
                        required
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    Enviar Código de Confirmação <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                
                /* PHASE 2: VERIFY CODE RECEIVED */
                <form onSubmit={handleConfirmRegistration} className="space-y-4">
                  <div className="p-3.5 bg-indigo-950/50 border border-indigo-900 rounded-xl space-y-1 text-center font-sans select-none">
                    <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">Código de Confirmação Gerado:</span>
                    <p className="text-sm font-black font-mono tracking-widest text-indigo-300">{simulatedCode}</p>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Insira o código de segurança simulado acima enviado por {registerType === 'email' ? 'e-mail' : 'mensagem de celular'}.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none">
                      Digite o Código de 6 dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: ******"
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-base tracking-widest font-mono font-black text-white focus:outline-hidden focus:border-indigo-500 focus:bg-slate-950"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <ShieldCheck className="w-4 h-4" /> Confirmar e Criar Conta
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationSent(false)}
                    className="w-full text-center text-[10px] text-indigo-400 hover:underline cursor-pointer py-1 font-bold"
                  >
                    Voltar e Corrigir Dados
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Legal clt and safety disclaimer footer */}
        <p className="text-center text-[10px] text-slate-500 mt-6 select-none font-medium leading-relaxed max-w-sm mx-auto">
          Este é um sistema offline corporativo corporado à LGPD. Seus dados de ponto e credenciais são criptografados localmente no seu dispositivo.
        </p>

      </div>
    </div>
  );
}
