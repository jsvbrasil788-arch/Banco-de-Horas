/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkWeekScheme = 'balanced5day' | 'classic6day' | 'custom';

export interface DailyHoursTarget {
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  targetMinutes: number;
  label: string;
}

export interface EmployeeProfile {
  name: string;
  role: string;
  admissionDate: string;
  initialBalanceMinutes: number;
  scheme: WorkWeekScheme;
  customTargets: DailyHoursTarget[];
}

export interface TimePunchRecord {
  id: string;
  date: string; // YYYY-MM-DD
  entry: string; // HH:MM
  lunchStart?: string; // HH:MM
  lunchEnd?: string; // HH:MM
  exit?: string; // HH:MM
  notes?: string;
  targetMinutes: number; // calculated from profile scheme at log time
  workedMinutes: number; // computed
  balanceMinutes: number; // workedMinutes - targetMinutes
  isHolidayOrOff: boolean;
  specialDayType?: 'work' | 'sick' | 'holiday' | 'vacation';
}

export interface MonthSummary {
  year: number;
  month: number; // 0-11
  totalWorkedMinutes: number;
  totalTargetMinutes: number;
  totalBalanceMinutes: number;
}
