/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Sparkles, User, RefreshCw, Layers, Save, HelpCircle } from 'lucide-react';
import { EmployeeProfile, WorkWeekScheme, DailyHoursTarget } from '../types';
import { formatMinutesToTime, getDefaultTargets } from '../utils/timeCalculations';

interface ConfigPanelProps {
  profile: EmployeeProfile;
  onSaveProfile: (profile: EmployeeProfile) => void;
  onClearDatabase: () => void;
  onLoadSamples: () => void;
}

export default function ConfigPanel({
  profile,
  onSaveProfile,
  onClearDatabase,
  onLoadSamples,
}: ConfigPanelProps) {
  // Local profile states
  const [name, setName] = useState<string>(profile.name);
  const [role, setRole] = useState<string>(profile.role);
  const [admissionDate, setAdmissionDate] = useState<string>(profile.admissionDate);
  const [scheme, setScheme] = useState<WorkWeekScheme>(profile.scheme);

  // Initial balance offsets (user types in hours and minutes)
  const [initialHours, setInitialHours] = useState<number>(Math.floor(Math.abs(profile.initialBalanceMinutes) / 60));
  const [initialMins, setInitialMins] = useState<number>(Math.abs(profile.initialBalanceMinutes) % 60);
  const [initialSign, setInitialSign] = useState<'+' | '-'>((profile.initialBalanceMinutes || 0) >= 0 ? '+' : '-');

  // Custom targets array (cloned)
  const [customTargets, setCustomTargets] = useState<DailyHoursTarget[]>([]);

  // Security credentials state
  const [localUser, setLocalUser] = useState<string>(() => localStorage.getItem('conv_banco_horas_user') || 'admin');
  const [localPass, setLocalPass] = useState<string>(() => localStorage.getItem('conv_banco_horas_pass') || '123456');

  // Sync state if profile prop changes
  useEffect(() => {
    setName(profile.name);
    setRole(profile.role);
    setAdmissionDate(profile.admissionDate);
    setScheme(profile.scheme);
    
    const absMin = Math.abs(profile.initialBalanceMinutes || 0);
    setInitialHours(Math.floor(absMin / 60));
    setInitialMins(absMin % 60);
    setInitialSign((profile.initialBalanceMinutes || 0) >= 0 ? '+' : '-');
    
    setCustomTargets(profile.customTargets || getDefaultTargets(profile.scheme));
  }, [profile]);

  // If scheme changes, reload default targets for visual feedback
  const handleSchemeChange = (newScheme: WorkWeekScheme) => {
    setScheme(newScheme);
    setCustomTargets(getDefaultTargets(newScheme));
  };

  // Live sum of targets (in minutes & formatted in hours)
  const currentTotalMinutes = customTargets.reduce((sum, tag) => sum + tag.targetMinutes, 0);
  const currentTotalHours = (currentTotalMinutes / 60).toFixed(1);
  const expectedMinutes = 44 * 60; // 44 hours = 2640 minutes
  const isExactly44h = currentTotalMinutes === expectedMinutes;

  // Handle saving
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Reconstruct initial balance in minutes
    let finalInitialMinutes = initialHours * 60 + initialMins;
    if (initialSign === '-') {
      finalInitialMinutes = -finalInitialMinutes;
    }

    const updatedProfile: EmployeeProfile = {
      name: name || 'Funcionário padrão',
      role: role || 'Colaborador',
      admissionDate: admissionDate || new Date().toISOString().split('T')[0],
      scheme,
      initialBalanceMinutes: finalInitialMinutes,
      customTargets: customTargets,
    };

    onSaveProfile(updatedProfile);
    alert('Configurações salvas e aplicadas com sucesso!');
  };

  // Adjust time of a specific day in custom targets
  const handleCustomTargetTimeChange = (dayOfWeek: number, timeStr: string) => {
    if (!timeStr) return;
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m;

    setCustomTargets(prev =>
      prev.map(target =>
        target.dayOfWeek === dayOfWeek
          ? { ...target, targetMinutes: totalMins }
          : target
      )
    );
  };

  return (
    <div id="config-panel-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Configuration Form Column */}
      <form onSubmit={handleSaveSubmit} className="lg:col-span-8 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 lg:p-8 space-y-6 select-none">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-slate-800/85 pb-5">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 font-mono">AJUSTES DO PERFIL</h2>
          </div>
          <button
            type="submit"
            id="btn-save-configs"
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-500/20 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4 text-indigo-300" /> Salvar Ajustes
          </button>
        </div>

        {/* Section 1: Employee Metadata */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-slate-400" /> Identificação do Colaborador
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Exemplo: Ana Rodrigues"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Cargo / Setor contratual</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Exemplo: Engenheira de Software Pleno"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Data de Admissão</label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all font-semibold"
                required
              />
            </div>

            {/* Legacy Time-Bank Balance offset */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">Saldo Anterior (Consolidado Legado)</label>
              <div className="flex rounded-xl overflow-hidden bg-slate-950/60 border border-slate-800 select-all font-semibold">
                <select
                  value={initialSign}
                  onChange={(e) => setInitialSign(e.target.value as '+' | '-')}
                  className="px-3 bg-slate-900 border-r border-slate-800 text-xs text-slate-305 text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="+">(+) Crédito</option>
                  <option value="-">(-) Devedoras</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  placeholder="Horas"
                  value={initialHours || ''}
                  onChange={(e) => setInitialHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-2.5 py-2.5 bg-transparent text-xs text-center text-white font-mono focus:outline-hidden"
                />
                <span className="self-center text-slate-500 text-xs font-semibold select-none">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Minutos"
                  value={initialMins || ''}
                  onChange={(e) => setInitialMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-20 px-2.5 py-2.5 bg-transparent text-xs text-center text-white font-mono focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 44-Hour Weekly Scheme Selection */}
        <div className="space-y-4 pt-6 border-t border-slate-800/80">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-slate-405 text-slate-400" /> Carga Semanal Obrigatória (Limites Semanais)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => handleSchemeChange('balanced5day')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                scheme === 'balanced5day'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)] text-indigo-400'
                  : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40 hover:text-slate-205'
              }`}
            >
              <input
                type="radio"
                name="scheme"
                checked={scheme === 'balanced5day'}
                onChange={() => handleSchemeChange('balanced5day')}
                className="absolute top-4 right-4 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <h4 className={`text-xs font-bold ${scheme === 'balanced5day' ? 'text-indigo-400' : 'text-slate-300'}`}>Seg a Sex (8h 48m)</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-light">
                Esquema clássico de Segunda a Sexta com <strong>8h48 diárias</strong> de compensação de banco de horas semanal de 44h. Finais de semana livres.
              </p>
            </div>

            <div
              onClick={() => handleSchemeChange('classic6day')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                scheme === 'classic6day'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)] text-indigo-400'
                  : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40 hover:text-slate-205'
              }`}
            >
              <input
                type="radio"
                name="scheme"
                checked={scheme === 'classic6day'}
                onChange={() => handleSchemeChange('classic6day')}
                className="absolute top-4 right-4 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <h4 className={`text-xs font-bold ${scheme === 'classic6day' ? 'text-indigo-400' : 'text-slate-300'}`}>Seg a Sex 8h + Sáb 4h</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-light">
                Jornada clássica comercial. Meta diária de Segunda a Sexta de <strong>8 horas</strong> e Sábado de <strong>4 horas</strong>. Somas completas de 44h.
              </p>
            </div>

            <div
              onClick={() => handleSchemeChange('custom')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                scheme === 'custom'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)] text-indigo-400'
                  : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40 hover:text-slate-205'
              }`}
            >
              <input
                type="radio"
                name="scheme"
                checked={scheme === 'custom'}
                onChange={() => handleSchemeChange('custom')}
                className="absolute top-4 right-4 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <h4 className={`text-xs font-bold ${scheme === 'custom' ? 'text-indigo-400' : 'text-slate-300'}`}>Customizado CLT</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-light">
                Configure metas individualizadas para cada dia da semana. Atende a contratos específicos de turno.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Visualizer and custom input of daily objectives */}
        <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-slate-300">Painel Detalhado de Alvos Diários</h4>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isExactly44h 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              Meta Total: {currentTotalHours}h/semana {isExactly44h ? '(Exato 44h)' : '(Irregular)'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5">
            {customTargets.map((tag) => {
              const showInput = scheme === 'custom';
              
              return (
                <div key={tag.dayOfWeek} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider font-mono">
                    {tag.label.slice(0, 3)}
                  </span>
                  
                  {showInput ? (
                    <input
                      type="time"
                      value={formatMinutesToTime(tag.targetMinutes)}
                      onChange={(e) => handleCustomTargetTimeChange(tag.dayOfWeek, e.target.value)}
                      className="w-full text-center text-xs font-semibold font-mono bg-slate-955 bg-slate-950 text-white focus:outline-hidden"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-white block mt-1">
                      {formatMinutesToTime(tag.targetMinutes)}h
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {!isExactly44h && (
            <div className="flex items-center gap-2 text-[10px] text-amber-400 mt-2 select-text bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/15 leading-normal">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>A soma semanal está em <strong>{currentTotalHours}h</strong>. Por garantia legal, as metas devem atingir exatamente <strong>44h</strong> semanais para não desbalancear a escala compensatória!</span>
            </div>
          )}
        </div>

      </form>

      {/* Database control panel column */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Helper Box */}
        <div className="p-6 bg-slate-950 border border-slate-800 text-white rounded-3xl relative overflow-hidden select-none">
          <HelpCircle className="w-12 h-12 text-slate-850 absolute right-4 bottom-4 pointer-events-none" />
          <h3 className="font-bold text-sm tracking-wide">Banco de Horas de 44h</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-2.5 font-light">
            No Brasil, a escala compensatória estipula 44h semanais. Todo tempo trabalhado além do limite do dia alimenta automaticamente créditos de banco, que podem ser compensados com folgas acordadas sob convenção de regime CLT.
          </p>
        </div>

        {/* Database management tools */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 space-y-4 select-none animate-in fade-in duration-300">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
            <RefreshCw className="w-4 h-4 text-slate-400" /> Backup e Administração
          </h3>

          <p className="text-xxs text-slate-400 leading-relaxed">
            Seus dados de ponto são salvos com segurança de forma 100% offline no armazenamento do seu próprio navegador (LocalStorage).
          </p>

          <div className="space-y-2 pt-2">
            {/* Seed Mockup Data */}
            <button
              type="button"
              id="btn-seed-data"
              onClick={onLoadSamples}
              className="w-full py-2.5 px-3.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" /> Seeding Simulação (18 dias)
            </button>

            {/* Clear Database */}
            <button
              type="button"
              id="btn-clear-db"
              onClick={onClearDatabase}
              className="w-full py-2.5 px-3.5 text-xs font-bold text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all font-semibold"
            >
              Apagar Todo o Histórico
            </button>
          </div>
        </div>

        {/* Credentials Manager Panel */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 space-y-4 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
            <User className="w-4 h-4 text-slate-400" /> Credenciais de Acesso (Login/Senha)
          </h3>

          <p className="text-xxs text-slate-400 leading-relaxed font-light">
            Edite os dados de login e senha do controle individual de jornada do seu dispositivo.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none text-slate-400 font-mono">
                Usuário Geral
              </label>
              <input
                type="text"
                value={localUser}
                onChange={(e) => {
                  const val = e.target.value.trim().toLowerCase();
                  setLocalUser(val);
                  localStorage.setItem('conv_banco_horas_user', val);
                }}
                className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-505 focus:border-indigo-500 font-semibold transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none text-slate-400 font-mono">
                Senha de Segurança
              </label>
              <input
                type="password"
                value={localPass}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalPass(val);
                  localStorage.setItem('conv_banco_horas_pass', val);
                }}
                className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-505 focus:border-indigo-500 font-semibold transition-all"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
