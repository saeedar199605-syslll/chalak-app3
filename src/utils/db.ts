/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Centralized Database & Real-Time Cloudflare KV Synchronization Engine
 * 
 * Features:
 * - Real-Time Multi-User Auto-Sync across Cloudflare Pages & Workers
 * - Fast background version polling & visibility-change sync
 * - Complete coverage of all organizational data (OKRs, 1-on-1s, Kudos, Passwords, RBAC, Targets)
 * - Safe conflict-free optimistic updates with reactive listeners
 * - Offline-first resilient fallback
 */

import { Criterion, JobProfile, Employee, Evaluation, OKRGoal, OneOnOneMeeting, PraiseKudos } from '../types';
import { SEED_CRITERIA, SEED_PROFILES, SEED_EMPLOYEES, SEED_EVALUATIONS } from '../seedData';
import { INITIAL_OKRS, INITIAL_ONE_ON_ONES, INITIAL_KUDOS } from '../data/latticeKickidlerSeed';

export const STORAGE_KEYS = {
  EMPLOYEES: 'pe_employees',
  CRITERIA: 'pe_criteria',
  PROFILES: 'pe_profiles',
  EVALUATIONS: 'pe_evaluations',
  ARCHIVED_EVALUATIONS: 'pe_archived_evaluations',
  THEME: 'pe_theme',
  USER_PASSWORDS: 'pe_user_passwords',
  ADMIN_PASSWORD: 'pe_admin_password',
  ADMIN_PASSWORD_UPDATED_AT: 'pe_admin_password_updated_at',
  ROLE_PERMISSIONS: 'pe_role_permissions',
  USER_CUSTOM_PERMISSIONS: 'pe_user_custom_permissions',
  ROUTE_RULES: 'pe_route_rules',
  MANUAL_ACCESS_POLICY: 'pe_manual_access_policy',
  LOCKED_USERS: 'pe_locked_users',
  SYSTEM_LOGS: 'pe_system_logs',
  ACTIVE_PERIOD: 'pe_active_period',
  BACKUP_TIMESTAMP: 'pe_last_backup_ts',
  OKRS: 'pe_lattice_okrs',
  ONE_ON_ONES: 'pe_lattice_one_on_ones',
  KUDOS: 'pe_lattice_kudos',
  WORKSHOP_TARGETS: 'pe_workshop_targets',
  KICKIDLER_LIVE: 'pe_kickidler_live',
  KICKIDLER_RECORDS: 'pe_kickidler_records',
  KICKIDLER_VIOLATIONS: 'pe_kickidler_violations',
  APP_VERSION: 'pe_app_version',
  LAST_SYNC_TS: 'pe_last_sync_timestamp'
} as const;

export const CURRENT_ACTIVE_PERIOD = 'دوره بهار ۱۴۰۳';

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  version: number;
  hasCloudKV: boolean;
}

class AppDatabase {
  private syncTimeout: any = null;
  private pollInterval: any = null;
  private isCloudAvailable: boolean = true;
  private isInitialized: boolean = false;
  private hasCloudKV: boolean = true;
  private isSyncing: boolean = false;
  private localVersion: number = 0;
  private lastSyncTime: Date | null = null;
  private listeners: Set<(key: string, data: any) => void> = new Set();
  private syncStatusListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.localVersion = Number(localStorage.getItem(STORAGE_KEYS.APP_VERSION)) || 0;
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TS);
    if (lastSync) this.lastSyncTime = new Date(lastSync);

    // Setup window focus and visibility change triggers
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkServerForUpdates().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        this.checkServerForUpdates().catch(() => {});
      });
    }
  }

  /**
   * Subscribe to real-time database mutations
   */
  public subscribe(listener: (key: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to real-time Cloudflare Sync status
   */
  public subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.add(listener);
    listener(this.getSyncStatus());
    return () => this.syncStatusListeners.delete(listener);
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getSyncStatus(): SyncStatus {
    return {
      isConnected: this.isCloudAvailable,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      version: this.localVersion,
      hasCloudKV: this.hasCloudKV
    };
  }

  private notifySyncStatus(): void {
    const status = this.getSyncStatus();
    this.syncStatusListeners.forEach(fn => {
      try { fn(status); } catch (e) { console.error('Error in sync status listener:', e); }
    });
  }

  public notifyChange(key: string, data: any): void {
    this.listeners.forEach(fn => {
      try { fn(key, data); } catch (e) { console.error('Error in db listener:', e); }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pe_db_updated', { detail: { key, data } }));
    }
  }

  // Safe JSON getter
  private getItem<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  // Safe JSON setter with synchronous notification
  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notifyChange(key, value);
      this.triggerCloudSyncDebounced();
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // --- EMPLOYEES ---
  public getEmployees(): Employee[] {
    const data = this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
    if (!data || data.length === 0) {
      if (this.isInitialized) {
        this.setItem(STORAGE_KEYS.EMPLOYEES, SEED_EMPLOYEES);
      }
      return SEED_EMPLOYEES;
    }
    return data;
  }

  public saveEmployees(employees: Employee[]): void {
    this.setItem(STORAGE_KEYS.EMPLOYEES, employees);
  }

  public addEmployee(empData: Omit<Employee, 'id'>): { employee: Employee; evaluation: Evaluation | null } {
    const employees = this.getEmployees();
    
    // Generate clean username if empty
    let username = (empData.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!username) {
      const cleanCode = (empData.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      username = `user_${cleanCode || Math.random().toString(36).substring(2, 7)}`;
    }

    // Ensure unique username
    let finalUsername = username;
    let counter = 1;
    while (employees.some(e => e.username.toLowerCase() === finalUsername.toLowerCase())) {
      finalUsername = `${username}_${counter}`;
      counter++;
    }

    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: finalUsername,
      code: empData.code.trim().toUpperCase()
    };

    const updatedEmployees = [...employees, newEmp];
    this.saveEmployees(updatedEmployees);

    // Automatically create an active evaluation for this employee so they appear in reports and cards
    let createdEval: Evaluation | null = null;
    try {
      const profiles = this.getProfiles();
      const matchedProfile = profiles.find(p => p.id === newEmp.profileId) || profiles[0];
      if (matchedProfile) {
        const evals = this.getEvaluations();
        const initialScores = (matchedProfile.items || []).map(item => ({
          cid: item.cid,
          weight: item.weight,
          value: 0,
          self: 0,
          doc: ''
        }));

        createdEval = {
          id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          empId: newEmp.id,
          profileId: matchedProfile.id,
          period: CURRENT_ACTIVE_PERIOD,
          status: 'draft',
          stage: 'self_review',
          currentAssigneeId: newEmp.id,
          currentAssigneeName: newEmp.name,
          currentAssigneeRole: newEmp.role,
          scores: initialScores,
          created: Date.now()
        };
        this.saveEvaluations([...evals, createdEval]);
      }
    } catch (err) {
      console.warn('Could not auto-generate initial evaluation for employee:', err);
    }

    return { employee: newEmp, evaluation: createdEval };
  }

  public updateEmployee(id: string, empData: Omit<Employee, 'id'>): Employee | null {
    const employees = this.getEmployees();
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) return null;

    const updated: Employee = {
      ...empData,
      id,
      code: empData.code.trim().toUpperCase(),
      username: empData.username.trim().toLowerCase()
    };
    employees[index] = updated;
    this.saveEmployees(employees);
    return updated;
  }

  public deleteEmployee(id: string): boolean {
    const employees = this.getEmployees();
    const target = employees.find(e => e.id === id);
    if (!target) return false;

    // Protect main admin
    if (target.role === 'admin' && (target.username === 'admin' || target.code === 'ADMIN-001')) {
      return false;
    }

    const filtered = employees.filter(e => e.id !== id);
    this.saveEmployees(filtered);

    // Cascade delete evaluations
    const evals = this.getEvaluations();
    const filteredEvals = evals.filter(ev => ev.empId !== id);
    this.saveEvaluations(filteredEvals);

    // Clean password mapping if exists
    try {
      const pwMap = this.getItem<Record<string, string>>(STORAGE_KEYS.USER_PASSWORDS, {});
      if (pwMap[target.username.toLowerCase()]) {
        delete pwMap[target.username.toLowerCase()];
        localStorage.setItem(STORAGE_KEYS.USER_PASSWORDS, JSON.stringify(pwMap));
      }
    } catch {}

    return true;
  }

  public deleteEmployeesBatch(ids: string[]): { success: boolean; deletedCount: number } {
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0 };
    const idSet = new Set(ids);
    const employees = this.getEmployees();
    
    const targetsToDelete = employees.filter(e => idSet.has(e.id) && !(e.role === 'admin' && (e.username === 'admin' || e.code === 'ADMIN-001')));
    if (targetsToDelete.length === 0) return { success: true, deletedCount: 0 };

    const validDeleteIds = new Set(targetsToDelete.map(e => e.id));
    const remainingEmployees = employees.filter(e => !validDeleteIds.has(e.id));
    this.saveEmployees(remainingEmployees);

    // Cascade delete evaluations
    const evals = this.getEvaluations();
    const remainingEvals = evals.filter(ev => !validDeleteIds.has(ev.empId));
    this.saveEvaluations(remainingEvals);

    // Clean password mapping
    try {
      const pwMap = this.getItem<Record<string, string>>(STORAGE_KEYS.USER_PASSWORDS, {});
      targetsToDelete.forEach(t => {
        if (pwMap[t.username.toLowerCase()]) {
          delete pwMap[t.username.toLowerCase()];
        }
      });
      localStorage.setItem(STORAGE_KEYS.USER_PASSWORDS, JSON.stringify(pwMap));
    } catch {}

    return { success: true, deletedCount: targetsToDelete.length };
  }

  // --- CRITERIA (PARAMETERS) ---
  public getCriteria(): Criterion[] {
    const data = this.getItem<Criterion[]>(STORAGE_KEYS.CRITERIA, []);
    if (!data || data.length === 0) {
      if (this.isInitialized) {
        this.setItem(STORAGE_KEYS.CRITERIA, SEED_CRITERIA);
      }
      return SEED_CRITERIA;
    }
    return data;
  }

  public saveCriteria(criteria: Criterion[]): void {
    this.setItem(STORAGE_KEYS.CRITERIA, criteria);
  }

  public addCriterion(critData: Omit<Criterion, 'id'>): Criterion {
    const criteria = this.getCriteria();
    const newCrit: Criterion = {
      ...critData,
      id: `crit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: critData.code.trim().toUpperCase()
    };
    this.saveCriteria([...criteria, newCrit]);
    return newCrit;
  }

  public updateCriterion(id: string, critData: Omit<Criterion, 'id'>): Criterion | null {
    const criteria = this.getCriteria();
    const index = criteria.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updated: Criterion = {
      ...critData,
      id,
      code: critData.code.trim().toUpperCase()
    };
    criteria[index] = updated;
    this.saveCriteria(criteria);
    return updated;
  }

  public deleteCriterion(id: string): { success: boolean; affectedProfiles: number; affectedEvaluations: number } {
    const criteria = this.getCriteria();
    const target = criteria.find(c => c.id === id);
    if (!target) return { success: false, affectedProfiles: 0, affectedEvaluations: 0 };

    const updatedCriteria = criteria.filter(c => c.id !== id);
    this.saveCriteria(updatedCriteria);

    const profiles = this.getProfiles();
    let affectedProfiles = 0;
    const updatedProfiles = profiles.map(profile => {
      const hasItem = profile.items.some(item => item.cid === id);
      if (hasItem) {
        affectedProfiles++;
        return {
          ...profile,
          items: profile.items.filter(item => item.cid !== id)
        };
      }
      return profile;
    });
    if (affectedProfiles > 0) {
      this.saveProfiles(updatedProfiles);
    }

    const evals = this.getEvaluations();
    let affectedEvaluations = 0;
    const updatedEvals = evals.map(evaluation => {
      const hasScore = evaluation.scores.some(s => s.cid === id);
      if (hasScore) {
        affectedEvaluations++;
        return {
          ...evaluation,
          scores: evaluation.scores.filter(s => s.cid !== id)
        };
      }
      return evaluation;
    });
    if (affectedEvaluations > 0) {
      this.saveEvaluations(updatedEvals);
    }

    return { success: true, affectedProfiles, affectedEvaluations };
  }

  public deleteCriteriaBatch(ids: string[]): { success: boolean; affectedProfiles: number; affectedEvaluations: number; deletedCount: number } {
    if (!ids || ids.length === 0) return { success: true, affectedProfiles: 0, affectedEvaluations: 0, deletedCount: 0 };
    const idSet = new Set(ids);
    const criteria = this.getCriteria();
    const remainingCriteria = criteria.filter(c => !idSet.has(c.id));
    const deletedCount = criteria.length - remainingCriteria.length;
    if (deletedCount === 0) return { success: true, affectedProfiles: 0, affectedEvaluations: 0, deletedCount: 0 };

    this.saveCriteria(remainingCriteria);

    const profiles = this.getProfiles();
    let affectedProfiles = 0;
    const updatedProfiles = profiles.map(profile => {
      const hasItem = profile.items.some(item => idSet.has(item.cid));
      if (hasItem) {
        affectedProfiles++;
        return {
          ...profile,
          items: profile.items.filter(item => !idSet.has(item.cid))
        };
      }
      return profile;
    });
    if (affectedProfiles > 0) {
      this.saveProfiles(updatedProfiles);
    }

    const evals = this.getEvaluations();
    let affectedEvaluations = 0;
    const updatedEvals = evals.map(evaluation => {
      const hasScore = evaluation.scores.some(s => idSet.has(s.cid));
      if (hasScore) {
        affectedEvaluations++;
        return {
          ...evaluation,
          scores: evaluation.scores.filter(s => !idSet.has(s.cid))
        };
      }
      return evaluation;
    });
    if (affectedEvaluations > 0) {
      this.saveEvaluations(updatedEvals);
    }

    return { success: true, affectedProfiles, affectedEvaluations, deletedCount };
  }

  // --- JOB PROFILES ---
  public getProfiles(): JobProfile[] {
    const data = this.getItem<JobProfile[]>(STORAGE_KEYS.PROFILES, []);
    if (!data || data.length === 0) {
      if (this.isInitialized) {
        this.setItem(STORAGE_KEYS.PROFILES, SEED_PROFILES);
      }
      return SEED_PROFILES;
    }
    return data;
  }

  public saveProfiles(profiles: JobProfile[]): void {
    this.setItem(STORAGE_KEYS.PROFILES, profiles);
  }

  public addProfile(profData: Omit<JobProfile, 'id'>): JobProfile {
    const profiles = this.getProfiles();
    const newProf: JobProfile = {
      ...profData,
      id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    this.saveProfiles([...profiles, newProf]);
    return newProf;
  }

  public updateProfile(id: string, profData: Omit<JobProfile, 'id'>): JobProfile | null {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updated: JobProfile = {
      ...profData,
      id
    };
    profiles[index] = updated;
    this.saveProfiles(profiles);
    return updated;
  }

  public deleteProfile(id: string, force = true): { success: boolean; error?: string; affectedEmployees?: number } {
    const employees = this.getEmployees();
    const assignedEmployees = employees.filter(e => e.profileId === id);
    
    if (assignedEmployees.length > 0 && !force) {
      return { success: false, error: `این پروفایل به ${assignedEmployees.length} کارمند تخصیص داده شده است.` };
    }
    if (assignedEmployees.length > 0 && force) {
      const updatedEmployees = employees.map(e => e.profileId === id ? { ...e, profileId: '' } : e);
      this.saveEmployees(updatedEmployees);
    }

    const profiles = this.getProfiles();
    this.saveProfiles(profiles.filter(p => p.id !== id));
    return { success: true, affectedEmployees: assignedEmployees.length };
  }

  public deleteProfilesBatch(ids: string[]): { success: boolean; deletedCount: number; affectedEmployees: number } {
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0, affectedEmployees: 0 };
    const idSet = new Set(ids);
    const employees = this.getEmployees();
    let affectedEmployees = 0;
    const updatedEmployees = employees.map(e => {
      if (idSet.has(e.profileId)) {
        affectedEmployees++;
        return { ...e, profileId: '' };
      }
      return e;
    });
    if (affectedEmployees > 0) {
      this.saveEmployees(updatedEmployees);
    }
    const profiles = this.getProfiles();
    const remaining = profiles.filter(p => !idSet.has(p.id));
    const deletedCount = profiles.length - remaining.length;
    this.saveProfiles(remaining);
    return { success: true, deletedCount, affectedEmployees };
  }

  // --- EVALUATIONS ---
  public getEvaluations(): Evaluation[] {
    const data = this.getItem<Evaluation[]>(STORAGE_KEYS.EVALUATIONS, []);
    if (!data || data.length === 0) {
      if (this.isInitialized) {
        this.setItem(STORAGE_KEYS.EVALUATIONS, SEED_EVALUATIONS);
      }
      return SEED_EVALUATIONS;
    }
    return data;
  }

  public saveEvaluations(evaluations: Evaluation[]): void {
    this.setItem(STORAGE_KEYS.EVALUATIONS, evaluations);
  }

  public deleteEvaluation(id: string): boolean {
    const evals = this.getEvaluations();
    const filtered = evals.filter(e => e.id !== id);
    if (filtered.length === evals.length) return false;
    this.saveEvaluations(filtered);
    return true;
  }

  public deleteEvaluationsBatch(ids: string[]): { success: boolean; deletedCount: number } {
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0 };
    const idSet = new Set(ids);
    const evals = this.getEvaluations();
    const filtered = evals.filter(e => !idSet.has(e.id));
    const deletedCount = evals.length - filtered.length;
    if (deletedCount > 0) {
      this.saveEvaluations(filtered);
    }
    return { success: true, deletedCount };
  }

  public getArchivedEvaluations(): Evaluation[] {
    return this.getItem<Evaluation[]>(STORAGE_KEYS.ARCHIVED_EVALUATIONS, []);
  }

  public saveArchivedEvaluations(archived: Evaluation[]): void {
    this.setItem(STORAGE_KEYS.ARCHIVED_EVALUATIONS, archived);
  }

  public updateEvaluation(id: string, updatedEv: Evaluation): Evaluation {
    const evals = this.getEvaluations();
    // Match by ID OR by same employee + period to prevent parallel ghost draft evaluations
    const index = evals.findIndex(e => e.id === id || (e.empId === updatedEv.empId && e.period === updatedEv.period));
    let nextList: Evaluation[];
    if (index >= 0) {
      nextList = [...evals];
      nextList[index] = { ...nextList[index], ...updatedEv };
    } else {
      nextList = [...evals, updatedEv];
    }
    this.saveEvaluations(nextList);
    return updatedEv;
  }

  // --- OKRS & GOALS MANAGEMENT ---
  public getOkrs(): OKRGoal[] {
    const data = this.getItem<OKRGoal[]>(STORAGE_KEYS.OKRS, []);
    if (!data || data.length === 0) {
      if (this.isInitialized) {
        this.setItem(STORAGE_KEYS.OKRS, INITIAL_OKRS);
      }
      return INITIAL_OKRS;
    }
    return data;
  }

  public saveOkrs(okrs: OKRGoal[]): void {
    this.setItem(STORAGE_KEYS.OKRS, okrs);
  }

  public addOkr(okrData: Omit<OKRGoal, 'id'>): OKRGoal {
    const okrs = this.getOkrs();
    const newOkr: OKRGoal = {
      ...okrData,
      id: `okr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    this.saveOkrs([newOkr, ...okrs]);
    return newOkr;
  }

  public deleteOkr(id: string): boolean {
    const okrs = this.getOkrs();
    const filtered = okrs.filter(o => o.id !== id);
    if (filtered.length === okrs.length) return false;
    this.saveOkrs(filtered);
    return true;
  }

  // --- WORKSHOP TARGETS ---
  public getWorkshopTargets<T = any>(fallback: T[] = []): T[] {
    return this.getItem<T[]>(STORAGE_KEYS.WORKSHOP_TARGETS, fallback);
  }

  public saveWorkshopTargets<T = any>(targets: T[]): void {
    this.setItem(STORAGE_KEYS.WORKSHOP_TARGETS, targets);
  }

  // --- BATCH CRITERIA MERGE ---
  public saveCriteriaBatch(
    newCriteria: Array<Omit<Criterion, 'id'> & { id?: string }>,
    mode: 'merge' | 'replace' | 'skip_existing' = 'merge'
  ): { addedCount: number; updatedCount: number; totalCount: number; criteria: Criterion[] } {
    let currentCriteria = this.getCriteria();
    let addedCount = 0;
    let updatedCount = 0;

    if (mode === 'replace') {
      const formatted = newCriteria.map((c, idx) => ({
        ...c,
        id: c.id || `crit-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        code: c.code.trim().toUpperCase()
      } as Criterion));
      this.saveCriteria(formatted);
      return { addedCount: formatted.length, updatedCount: 0, totalCount: formatted.length, criteria: formatted };
    }

    const updatedList = [...currentCriteria];
    newCriteria.forEach((critCandidate, idx) => {
      const cleanCode = critCandidate.code.trim().toUpperCase();
      const existingIdx = updatedList.findIndex(c => c.code.trim().toUpperCase() === cleanCode);
      if (existingIdx >= 0) {
        if (mode === 'merge') {
          const existing = updatedList[existingIdx];
          updatedList[existingIdx] = {
            ...existing,
            ...critCandidate,
            id: existing.id,
            code: cleanCode
          };
          updatedCount++;
        }
      } else {
        const newCrit: Criterion = {
          ...critCandidate,
          id: critCandidate.id || `crit-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          code: cleanCode
        };
        updatedList.push(newCrit);
        addedCount++;
      }
    });

    this.saveCriteria(updatedList);
    return { addedCount, updatedCount, totalCount: updatedList.length, criteria: updatedList };
  }

  // --- REAL-TIME CLOUDFLARE SYNC ENGINE ---

  /**
   * Initializes real-time background sync:
   * 1. Fetches cloud state from Cloudflare KV.
   * 2. Starts periodic polling (every 3.5s) of /api/state?version_only=true.
   */
  public async initializeCloudSync(): Promise<boolean> {
    try {
      this.isSyncing = true;
      this.notifySyncStatus();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/state', {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isCloudAvailable = true;
        const cloudState = await res.json();
        
        if (cloudState && typeof cloudState === 'object' && Object.keys(cloudState).length > 0) {
          // Cloud has real state -> Apply it directly over local storage
          this.applyCloudState(cloudState);
        } else {
          // Server state was completely empty -> Seed server with initial state
          await this.pushStateToCloud();
        }
        return true;
      } else {
        this.isCloudAvailable = false;
        return false;
      }
    } catch (e) {
      console.warn('Initial cloud sync notice:', e);
      this.isCloudAvailable = false;
      return false;
    } finally {
      this.isInitialized = true;
      this.isSyncing = false;
      this.lastSyncTime = new Date();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TS, this.lastSyncTime.toISOString());
      this.notifySyncStatus();
      this.startContinuousPolling();
    }
  }

  /**
   * Starts non-blocking, lightweight background polling (every 3.5 seconds)
   */
  private startContinuousPolling(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.checkServerForUpdates().catch(() => {});
    }, 3500);
  }

  /**
   * Fast check for server version changes. If server has a newer version, pulls and applies it.
   */
  public async checkServerForUpdates(): Promise<boolean> {
    if (this.isSyncing) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/state?version_only=true', {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        this.isCloudAvailable = false;
        this.notifySyncStatus();
        return false;
      }

      this.isCloudAvailable = true;
      const meta = await res.json();
      const serverVersion = Number(meta.version) || 0;

      if (serverVersion > this.localVersion) {
        console.log(`[Cloudflare Sync] New server version detected (${serverVersion} > ${this.localVersion}). Pulling state...`);
        return await this.pullStateFromCloud();
      }

      return false;
    } catch {
      this.isCloudAvailable = false;
      this.notifySyncStatus();
      return false;
    }
  }

  /**
   * Pulls complete state from Cloudflare KV and updates local storage and listeners
   */
  public async pullStateFromCloud(): Promise<boolean> {
    try {
      this.isSyncing = true;
      this.notifySyncStatus();

      const res = await fetch('/api/state', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        this.isCloudAvailable = false;
        return false;
      }

      this.isCloudAvailable = true;
      const cloudState = await res.json();
      if (cloudState && typeof cloudState === 'object' && Object.keys(cloudState).length > 0) {
        this.applyCloudState(cloudState);
        this.lastSyncTime = new Date();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TS, this.lastSyncTime.toISOString());
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to pull state from Cloudflare:', e);
      this.isCloudAvailable = false;
      return false;
    } finally {
      this.isSyncing = false;
      this.notifySyncStatus();
    }
  }

  /**
   * Applies state received from server to local storage and alerts components
   */
  private applyCloudState(cloudState: Record<string, any>): void {
    let hasChanges = false;

    // Keys that should be synced across all users and devices
    const syncKeys = [
      STORAGE_KEYS.EMPLOYEES,
      STORAGE_KEYS.CRITERIA,
      STORAGE_KEYS.PROFILES,
      STORAGE_KEYS.EVALUATIONS,
      STORAGE_KEYS.ARCHIVED_EVALUATIONS,
      STORAGE_KEYS.OKRS,
      STORAGE_KEYS.ONE_ON_ONES,
      STORAGE_KEYS.KUDOS,
      STORAGE_KEYS.WORKSHOP_TARGETS,
      STORAGE_KEYS.USER_PASSWORDS,
      STORAGE_KEYS.ADMIN_PASSWORD,
      STORAGE_KEYS.ADMIN_PASSWORD_UPDATED_AT,
      STORAGE_KEYS.ROLE_PERMISSIONS,
      STORAGE_KEYS.USER_CUSTOM_PERMISSIONS,
      STORAGE_KEYS.ROUTE_RULES,
      STORAGE_KEYS.MANUAL_ACCESS_POLICY,
      STORAGE_KEYS.LOCKED_USERS,
      STORAGE_KEYS.SYSTEM_LOGS,
      STORAGE_KEYS.KICKIDLER_LIVE,
      STORAGE_KEYS.KICKIDLER_RECORDS,
      STORAGE_KEYS.KICKIDLER_VIOLATIONS
    ];

    for (const key of syncKeys) {
      if (cloudState[key] !== undefined) {
        const currentLocalRaw = localStorage.getItem(key);
        const incomingCloudRaw = typeof cloudState[key] === 'string' 
          ? cloudState[key] 
          : JSON.stringify(cloudState[key]);

        if (currentLocalRaw !== incomingCloudRaw) {
          localStorage.setItem(key, incomingCloudRaw);
          const parsed = typeof cloudState[key] === 'string' 
            ? JSON.parse(cloudState[key]) 
            : cloudState[key];
          this.notifyChange(key, parsed);
          hasChanges = true;
        }
      }
    }

    if (cloudState._version) {
      this.localVersion = Number(cloudState._version);
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, String(this.localVersion));
    }

    if (hasChanges && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pe_cloud_data_synced', { 
        detail: { version: this.localVersion, timestamp: new Date() } 
      }));
    }
  }

  private triggerCloudSyncDebounced(): void {
    if (!this.isInitialized) {
      // Guard: Never auto-push local seed data before server state is retrieved
      return;
    }
    clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.pushStateToCloud().catch(() => {});
    }, 500);
  }

  public syncToCloudNow(): Promise<boolean> {
    clearTimeout(this.syncTimeout);
    return this.pushStateToCloud();
  }

  public async forceSyncNow(): Promise<boolean> {
    await this.checkServerForUpdates();
    return await this.pushStateToCloud();
  }

  /**
   * Pushes full organizational state to Cloudflare KV
   */
  public async pushStateToCloud(): Promise<boolean> {
    try {
      this.isSyncing = true;
      this.notifySyncStatus();

      const newVersion = Date.now();
      const payload: Record<string, any> = {
        _version: newVersion,
        _updatedAt: new Date().toISOString(),
        [STORAGE_KEYS.EMPLOYEES]: this.getEmployees(),
        [STORAGE_KEYS.CRITERIA]: this.getCriteria(),
        [STORAGE_KEYS.PROFILES]: this.getProfiles(),
        [STORAGE_KEYS.EVALUATIONS]: this.getEvaluations(),
        [STORAGE_KEYS.ARCHIVED_EVALUATIONS]: this.getArchivedEvaluations(),
        [STORAGE_KEYS.OKRS]: this.getOkrs(),
        [STORAGE_KEYS.ONE_ON_ONES]: this.getItem(STORAGE_KEYS.ONE_ON_ONES, INITIAL_ONE_ON_ONES),
        [STORAGE_KEYS.KUDOS]: this.getItem(STORAGE_KEYS.KUDOS, INITIAL_KUDOS),
        [STORAGE_KEYS.WORKSHOP_TARGETS]: this.getWorkshopTargets(),
        [STORAGE_KEYS.USER_PASSWORDS]: this.getItem(STORAGE_KEYS.USER_PASSWORDS, {}),
        [STORAGE_KEYS.ADMIN_PASSWORD]: localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || 'admin',
        [STORAGE_KEYS.ADMIN_PASSWORD_UPDATED_AT]: localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD_UPDATED_AT) || '',
        [STORAGE_KEYS.ROLE_PERMISSIONS]: this.getItem(STORAGE_KEYS.ROLE_PERMISSIONS, []),
        [STORAGE_KEYS.USER_CUSTOM_PERMISSIONS]: this.getItem(STORAGE_KEYS.USER_CUSTOM_PERMISSIONS, {}),
        [STORAGE_KEYS.ROUTE_RULES]: this.getItem(STORAGE_KEYS.ROUTE_RULES, []),
        [STORAGE_KEYS.MANUAL_ACCESS_POLICY]: this.getItem(STORAGE_KEYS.MANUAL_ACCESS_POLICY, {}),
        [STORAGE_KEYS.LOCKED_USERS]: this.getItem(STORAGE_KEYS.LOCKED_USERS, []),
        [STORAGE_KEYS.SYSTEM_LOGS]: this.getItem(STORAGE_KEYS.SYSTEM_LOGS, []),
        [STORAGE_KEYS.KICKIDLER_LIVE]: this.getItem(STORAGE_KEYS.KICKIDLER_LIVE, []),
        [STORAGE_KEYS.KICKIDLER_RECORDS]: this.getItem(STORAGE_KEYS.KICKIDLER_RECORDS, []),
        [STORAGE_KEYS.KICKIDLER_VIOLATIONS]: this.getItem(STORAGE_KEYS.KICKIDLER_VIOLATIONS, [])
      };

      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.isCloudAvailable = true;
        this.localVersion = newVersion;
        this.lastSyncTime = new Date();
        localStorage.setItem(STORAGE_KEYS.APP_VERSION, String(this.localVersion));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TS, this.lastSyncTime.toISOString());
        return true;
      } else {
        this.isCloudAvailable = false;
        return false;
      }
    } catch {
      this.isCloudAvailable = false;
      return false;
    } finally {
      this.isSyncing = false;
      this.notifySyncStatus();
    }
  }

  // --- BACKUP & RESTORE ---
  public exportBackupJSON(): string {
    const backupData = {
      meta: {
        app: 'سامانه مدیریت عملکرد و مربیگری اصفهان چالاک',
        version: '4.1.0-Cloudflare-Enterprise',
        exportedAt: new Date().toISOString()
      },
      employees: this.getEmployees(),
      criteria: this.getCriteria(),
      profiles: this.getProfiles(),
      evaluations: this.getEvaluations(),
      archivedEvaluations: this.getArchivedEvaluations(),
      okrs: this.getOkrs(),
      oneOnOnes: this.getItem(STORAGE_KEYS.ONE_ON_ONES, INITIAL_ONE_ON_ONES),
      kudos: this.getItem(STORAGE_KEYS.KUDOS, INITIAL_KUDOS),
      workshopTargets: this.getWorkshopTargets()
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importBackupJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'ساختار فایل معتبر نیست.' };
      }
      if (Array.isArray(data.employees)) this.saveEmployees(data.employees);
      if (Array.isArray(data.criteria)) this.saveCriteria(data.criteria);
      if (Array.isArray(data.profiles)) this.saveProfiles(data.profiles);
      if (Array.isArray(data.evaluations)) this.saveEvaluations(data.evaluations);
      if (Array.isArray(data.archivedEvaluations)) this.saveArchivedEvaluations(data.archivedEvaluations);
      if (Array.isArray(data.okrs)) this.saveOkrs(data.okrs);
      if (Array.isArray(data.workshopTargets)) this.saveWorkshopTargets(data.workshopTargets);
      this.syncToCloudNow().catch(() => {});
      return { success: true, message: 'اطلاعات با موفقیت بازیابی و با سرور همگام شد.' };
    } catch (e: any) {
      return { success: false, message: `خطا در بازیابی: ${e?.message || 'فرمت نامعتبر'}` };
    }
  }

  public resetToFactoryDefaults(): void {
    this.saveEmployees(SEED_EMPLOYEES);
    this.saveCriteria(SEED_CRITERIA);
    this.saveProfiles(SEED_PROFILES);
    this.saveEvaluations(SEED_EVALUATIONS);
    this.saveArchivedEvaluations([]);
    this.saveOkrs(INITIAL_OKRS);
    localStorage.removeItem(STORAGE_KEYS.USER_PASSWORDS);
    this.syncToCloudNow().catch(() => {});
  }
}

export const db = new AppDatabase();
