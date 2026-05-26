/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Search, Plus, FileText, Trash2, Edit2, Download, Clock, Printer } from 'lucide-react';
import { TimePunchRecord, DailyHoursTarget } from '../types';
import { 
  formatFriendlyDate, 
  getPortugueseWeekday, 
  formatBalance, 
  formatMinutesToTime, 
  calculateWorkedMinutes 
} from '../utils/timeCalculations';

interface HistoryListProps {
  records: TimePunchRecord[];
  onSaveRecord: (record: TimePunchRecord) => void;
  onDeleteRecord: (id: string) => void;
  dailyTargetsByDay: DailyHoursTarget[];
}

export default function HistoryList({
  records,
  onSaveRecord,
  onDeleteRecord,
  dailyTargetsByDay,
}: HistoryListProps) {
  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'extra' | 'debit' | 'notes'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Extract unique months from all records to populate the month dropdown (e.g. "2026-05")
  const uniqueMonths = Array.from(
    new Set(records.map((r) => r.date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Count matches scoped to the selected month for tabs indicators
  const monthRecords = selectedMonth === 'all'
    ? records
    : records.filter((r) => r.date.substring(0, 7) === selectedMonth);

  // Manual past record entry fields
  const [manualDate, setManualDate] = useState<string>('');
  const [manualEntry, setManualEntry] = useState<string>('08:00');
  const [manualLunchStart, setManualLunchStart] = useState<string>('12:00');
  const [manualLunchEnd, setManualLunchEnd] = useState<string>('13:00');
  const [manualExit, setManualExit] = useState<string>('17:48'); // defaults to 8h48m limit
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualIsOff, setManualIsOff] = useState<boolean>(false);
  const [manualDayType, setManualDayType] = useState<'work' | 'sick' | 'holiday' | 'vacation'>('work');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Open modal prefilled or fresh
  const handleOpenAddModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setManualDate(todayStr);
    setManualEntry('08:00');
    setManualLunchStart('12:00');
    setManualLunchEnd('13:00');
    setManualExit('17:48');
    setManualNotes('');
    setManualIsOff(false);
    setManualDayType('work');
    setShowAddModal(true);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate) return;

    // Calculate daily target based on chosen date's day of week
    const dateObj = new Date(manualDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const defaultTarget = dailyTargetsByDay.find((t) => t.dayOfWeek === dayOfWeek)?.targetMinutes || 0;
    
    // If it's a declared day-off, holiday, vacation or sick, target work is 0
    const isSpecial = manualDayType !== 'work';
    const targetMin = isSpecial ? 0 : defaultTarget;

    const workedMin = isSpecial ? 0 : calculateWorkedMinutes(
      manualEntry,
      manualLunchStart || undefined,
      manualLunchEnd || undefined,
      manualExit || undefined
    );

    const newRecord: TimePunchRecord = {
      id: editingId || `record-${manualDate}-${Date.now()}`,
      date: manualDate,
      entry: isSpecial ? '' : manualEntry,
      lunchStart: (isSpecial || !manualLunchStart) ? undefined : manualLunchStart,
      lunchEnd: (isSpecial || !manualLunchEnd) ? undefined : manualLunchEnd,
      exit: (isSpecial || !manualExit) ? undefined : manualExit,
      notes: manualNotes || undefined,
      targetMinutes: targetMin,
      workedMinutes: workedMin,
      balanceMinutes: workedMin - targetMin,
      isHolidayOrOff: isSpecial,
      specialDayType: manualDayType,
    };

    onSaveRecord(newRecord);
    setShowAddModal(false);
    setEditingId(null);
  };

  const handleEditRecord = (rec: TimePunchRecord) => {
    setEditingId(rec.id);
    setManualDate(rec.date);
    setManualEntry(rec.entry || '');
    setManualLunchStart(rec.lunchStart || '');
    setManualLunchEnd(rec.lunchEnd || '');
    setManualExit(rec.exit || '');
    setManualNotes(rec.notes || '');
    setManualIsOff(rec.isHolidayOrOff);
    setManualDayType(rec.specialDayType || (rec.isHolidayOrOff ? 'holiday' : 'work'));
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string, date: string) => {
    if (confirm(`Deseja realmente excluir permanentemente o registro de data [ ${date} ]?`)) {
      onDeleteRecord(id);
    }
  };

  // CSV Export for employee convenience
  const handleExportCSV = () => {
    if (records.length === 0) return;
    let csvContent = '\uFEFF'; // BOM to support Excel PT-BR accented characters
    csvContent += 'Data;Dia;Entrada;Almoco Saida;Almoco Retorno;Saida;Meta (Minutos);Trabalhado (Minutos);Saldo (Minutos);Observacoes\n';

    records.forEach((r) => {
      const weekday = getPortugueseWeekday(r.date);
      csvContent += `${r.date};${weekday};${r.entry};${r.lunchStart || ''};${r.lunchEnd || ''};${r.exit || ''};${r.targetMinutes};${r.workedMinutes};${r.balanceMinutes};${r.notes || ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `banco_de_horas_44h_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter records based on active tab, selected month, and search query
  const filteredRecords = records.filter((rec) => {
    // Month Filter
    if (selectedMonth !== 'all' && rec.date.substring(0, 7) !== selectedMonth) return false;

    // Tab Filter
    if (activeTab === 'extra' && rec.balanceMinutes <= 0) return false;
    if (activeTab === 'debit' && rec.balanceMinutes >= 0) return false;
    if (activeTab === 'notes' && !rec.notes) return false;

    // Search Query (find in date, day name or notes)
    if (searchQuery) {
      const lowQuery = searchQuery.toLowerCase();
      const weekday = getPortugueseWeekday(rec.date).toLowerCase();
      const notes = (rec.notes || '').toLowerCase();
      const date = rec.date;
      return weekday.includes(lowQuery) || notes.includes(lowQuery) || date.includes(lowQuery);
    }
    return true;
  });

  return (
    <div id="history-container" className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xs p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Action toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Consolidated Logs</h2>
          <h1 className="text-xl font-bold text-white mt-1">Histórico de Marcações</h1>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            id="btn-print-pdf"
            onClick={() => window.print()}
            disabled={records.length === 0}
            className="px-4 py-2.5 text-xs font-bold text-slate-350 bg-slate-950/40 hover:bg-slate-905 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-450" /> Gerar PDF (Imprimir)
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="px-4 py-2.5 text-xs font-bold text-slate-350 bg-slate-950/40 hover:bg-slate-905 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-450" /> Exportar Planilha
          </button>
          
          <button
            id="btn-add-past-record"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs border border-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-100" /> Lançamento Retroativo
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar row */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-slate-800/80 pb-4 select-none">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            id="tab-all-records"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Todos ({monthRecords.length})
          </button>
          <button
            id="tab-extra-records"
            onClick={() => setActiveTab('extra')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'extra' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Crédito ({monthRecords.filter(r => r.balanceMinutes > 0).length})
          </button>
          <button
            id="tab-debit-records"
            onClick={() => setActiveTab('debit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'debit' 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-[0_0_12px_rgba(239,68,68,0.15)]' 
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Débito ({monthRecords.filter(r => r.balanceMinutes < 0).length})
          </button>
          <button
            id="tab-notes-records"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notes' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Observações ({monthRecords.filter(r => r.notes).length})
          </button>
        </div>

        {/* Filters Group: Month Dropdown & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Month & Year quick selector */}
          <div className="relative shrink-0 w-full sm:w-48">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="select-month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950/45 border border-slate-800 hover:border-slate-705 border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer font-sans"
            >
              <option value="all" className="bg-slate-900 text-white font-sans text-xs">Todos os Meses</option>
              {uniqueMonths.map((ym) => {
                const [year, month] = ym.split('-');
                const monthNames = [
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ];
                const monthLabel = monthNames[parseInt(month) - 1] || month;
                return (
                  <option key={ym} value={ym} className="bg-slate-900 text-white font-sans text-xs">
                    {monthLabel} de {year}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[9px] select-none">
              ▼
            </div>
          </div>

          {/* Search input field */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 cursor-default" />
            <input
              type="text"
              placeholder="Filtrar por data, dia ou notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/45 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table responsive scroll list */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              <th className="py-4 px-4 font-bold select-none">Data / Dia</th>
              <th className="py-4 px-3 font-bold text-center select-none">Entrada</th>
              <th className="py-4 px-3 font-bold text-center select-none">Almoço Saída</th>
              <th className="py-4 px-3 font-bold text-center select-none">Almoço Retorno</th>
              <th className="py-4 px-3 font-bold text-center select-none">Saída Geral</th>
              <th className="py-4 px-3 font-bold text-center select-none">Jornada Alvo</th>
              <th className="py-4 px-3 font-bold text-center select-none font-bold">Expediente</th>
              <th className="py-4 px-3 font-bold text-right select-none">Saldo Diário</th>
              <th className="py-4 px-4 font-bold text-right select-none">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-xs">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((r) => {
                const isPositive = r.balanceMinutes > 0;
                const isNegative = r.balanceMinutes < 0;
                const balanceObject = formatBalance(r.balanceMinutes);
                
                return (
                  <tr key={r.id} className="hover:bg-slate-850/20 transition-colors group">
                    <td className="py-3.5 px-4 font-medium">
                      <span className="text-slate-200 block font-semibold text-xs">{formatFriendlyDate(r.date)}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 tracking-wider uppercase font-bold">{getPortugueseWeekday(r.date)}</span>
                      {r.notes && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-400 font-bold tracking-wide uppercase">
                          <FileText className="w-2.5 h-2.5" />
                          {r.notes}
                        </span>
                      )}
                      {r.specialDayType === 'sick' && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] text-rose-400 font-bold tracking-wide uppercase ml-1">
                          🩺 Atestado Médico
                        </span>
                      )}
                      {r.specialDayType === 'vacation' && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-[9px] text-sky-400 font-bold tracking-wide uppercase ml-1">
                          🏝️ Férias CLT
                        </span>
                      )}
                      {r.specialDayType === 'holiday' && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] text-purple-400 font-bold tracking-wide uppercase ml-1">
                          ⭐️ Feriado / Folga
                        </span>
                      )}
                      {r.isHolidayOrOff && !r.specialDayType && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] text-indigo-400 font-bold tracking-wide uppercase ml-1">
                          Folga / Feriado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-mono select-all">
                      {r.entry}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-450 font-mono select-all">
                      {r.lunchStart || '--:--'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-450 font-mono select-all">
                      {r.lunchEnd || '--:--'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-mono select-all font-semibold">
                      {r.exit || '--:--'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-500 font-mono select-none">
                      {formatMinutesToTime(r.targetMinutes)}h
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-250 text-slate-205 text-white font-bold font-mono">
                      {formatMinutesToTime(r.workedMinutes)}h
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold select-all border ${
                        isPositive 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : isNegative 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50'
                      }`}>
                        {balanceObject.text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEditRecord(r)}
                          title="Ajustar essa marcação"
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(r.id, r.date)}
                          title="Remover essa marcação"
                          className="p-1.5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center">
                  <div className="max-w-xs mx-auto select-none">
                    <p className="text-sm font-bold text-slate-300">Nenhum registro encontrado</p>
                    <p className="text-xxs text-slate-455 mt-1.5 leading-relaxed text-slate-400">
                      Nenhum ponto lançado condiz com o filtro ou a busca ativa do banco de horas.
                    </p>
                    <button
                      id="btn-add-initial-record"
                      onClick={handleOpenAddModal}
                      className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-indigo-500/20"
                    >
                      Realizar Lançamento
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Retroactive Entry Modal */}
      {showAddModal && (
        <div id="add-record-modal" className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm select-none">
          <div className="bg-slate-900/95 backdrop-blur-lg rounded-3xl max-w-md w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-indigo-950/40 border-b border-slate-850 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">{editingId ? 'Ajustar Ponto Existente' : 'Lançamento Retroativo'}</h3>
                <p className="text-[10px] text-indigo-400 font-mono mt-0.5">Preencha os passos do expediente</p>
              </div>
              <button
                id="btn-close-record-modal"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer text-sm transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Selecionar Data do Ponto
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  disabled={!!editingId}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-40"
                  required
                />
              </div>

              {/* Day Type Selection Choices */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tipo de Dia / Ocorrência CLT</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualDayType('work');
                      setManualEntry('08:00');
                      setManualLunchStart('12:00');
                      setManualLunchEnd('13:00');
                      setManualExit('17:48');
                      setManualNotes('');
                    }}
                    className={`px-3 py-2.5 text-[10px] font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                      manualDayType === 'work'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'bg-slate-950/40 border-slate-805 border-slate-800 text-slate-400 hover:bg-slate-800/45'
                    }`}
                  >
                    💼 Dia Trabalhado
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualDayType('sick');
                      setManualEntry('');
                      setManualLunchStart('');
                      setManualLunchEnd('');
                      setManualExit('');
                      setManualNotes('Atestado Médico');
                    }}
                    className={`px-3 py-2.5 text-[10px] font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                      manualDayType === 'sick'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                        : 'bg-slate-950/40 border-slate-805 border-slate-800 text-slate-400 hover:bg-slate-800/45'
                    }`}
                  >
                    🩺 Atestado Médico
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualDayType('holiday');
                      setManualEntry('');
                      setManualLunchStart('');
                      setManualLunchEnd('');
                      setManualExit('');
                      setManualNotes('Feriado');
                    }}
                    className={`px-3 py-2.5 text-[10px] font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                      manualDayType === 'holiday'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                        : 'bg-slate-950/40 border-slate-805 border-slate-800 text-slate-400 hover:bg-slate-800/45'
                    }`}
                  >
                    ⭐️ Feriado / Folga
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualDayType('vacation');
                      setManualEntry('');
                      setManualLunchStart('');
                      setManualLunchEnd('');
                      setManualExit('');
                      setManualNotes('Férias');
                    }}
                    className={`px-3 py-2.5 text-[10px] font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                      manualDayType === 'vacation'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-[0_0_12px_rgba(14,165,243,0.15)]'
                        : 'bg-slate-950/40 border-slate-805 border-slate-800 text-slate-400 hover:bg-slate-800/45'
                    }`}
                  >
                    🏝️ Férias CLT
                  </button>
                </div>
              </div>

              {manualDayType === 'work' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">1. Entrada</label>
                    <input
                      type="time"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-505 focus:border-indigo-500"
                      required={manualDayType === 'work'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-light font-mono">2. Almoço Saída</label>
                    <input
                      type="time"
                      value={manualLunchStart}
                      onChange={(e) => setManualLunchStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-light font-mono">3. Almoço Retorno</label>
                    <input
                      type="time"
                      value={manualLunchEnd}
                      onChange={(e) => setManualLunchEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">4. Saída Geral</label>
                    <input
                      type="time"
                      value={manualExit}
                      onChange={(e) => setManualExit(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center select-none">
                  <span className="text-xs font-semibold text-indigo-400 block mb-1">
                    Meta de Horas Diárias Zerada (0h)
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                    Essa ocorrência suspende a cobrança de trabalho para o dia selecionado. Nenhum débito será lançado no seu saldo de banco.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Observações adicionais</label>
                <input
                  type="text"
                  placeholder="Exemplo: Home office, Visita externa, Viagem"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-350 text-slate-200 focus:outline-hidden focus:border-indigo-550 focus:border-indigo-500"
                />
              </div>

              {/* Informative calculated total for user */}
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl flex items-center justify-between font-sans">
                <span className="text-xxs text-slate-400 font-semibold uppercase tracking-wider font-mono">Total Calculado:</span>
                <span className="text-xs font-mono font-bold text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]">
                  {formatMinutesToTime(calculateWorkedMinutes(manualEntry, manualLunchStart, manualLunchEnd, manualExit))}h
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  id="btn-modal-cancel"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-modal-save"
                  className="flex-1 py-2.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-500/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
