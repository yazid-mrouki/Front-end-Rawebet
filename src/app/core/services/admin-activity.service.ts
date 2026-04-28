import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LiveActivity {
  id: string;
  type:
    | 'user_register'
    | 'user_login'
    | 'face_login'
    | 'user_ban'
    | 'suspect_login'
    | 'loyalty_upgrade'
    | 'loyalty_points';
  message: string;
  detail?: string;
  timestamp: Date;
  icon: string;
  color: string;
}

const STORAGE_KEY = 'rawabet_live_feed';
const MAX_STORED = 50;

@Injectable({ providedIn: 'root' })
export class AdminActivityService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private client: any = null;
  private connected = false;

  private activitiesSubject = new BehaviorSubject<LiveActivity[]>(this.loadFromStorage());
  activities$ = this.activitiesSubject.asObservable();

  private unreadSubject = new BehaviorSubject<number>(0);
  unread$ = this.unreadSubject.asObservable();

  // ─────────────────────────────────────────
  //  Connexion WebSocket réelle (STOMP/SockJS)
  // ─────────────────────────────────────────
  connect(token: string | null): void {
    if (this.connected || !isPlatformBrowser(this.platformId)) return;

    if (typeof (window as any).global === 'undefined') {
      (window as any).global = window;
    }

    Promise.all([
      import('@stomp/stompjs').then((m) => m.Client),
      import('sockjs-client').then((m) => m.default || m),
    ])
      .then(([StompClient, SockJS]) => {
        this.client = new StompClient({
          webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
          connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          reconnectDelay: 5000,
          onConnect: () => {
            this.connected = true;
            this.client.subscribe('/topic/admin/activity', (frame: any) => {
              try {
                const event = JSON.parse(frame.body);
                this.addActivity(this.mapEvent(event));
              } catch {
                // ignore
              }
            });
          },
          onDisconnect: () => {
            this.connected = false;
          },
          onStompError: () => {
            this.connected = false;
          },
        });
        this.client.activate();
      })
      .catch(() => {
        console.warn('[AdminActivity] WebSocket non disponible');
      });
  }

  disconnect(): void {
    if (this.client?.active) this.client.deactivate();
    this.connected = false;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  markAllRead(): void {
    this.unreadSubject.next(0);
  }

  addActivity(activity: LiveActivity): void {
    const current = this.activitiesSubject.getValue();
    const updated = [activity, ...current].slice(0, MAX_STORED);
    this.activitiesSubject.next(updated);
    this.unreadSubject.next(this.unreadSubject.getValue() + 1);
    this.saveToStorage(updated);
  }

  // Simulation désactivée — uniquement vrais événements WebSocket
  startSimulation(): void {}

  // ─────────────────────────────────────────
  //  Persistence sessionStorage
  // ─────────────────────────────────────────
  private saveToStorage(activities: LiveActivity[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch {
      /* quota dépassé — ignorer */
    }
  }

  private loadFromStorage(): LiveActivity[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LiveActivity[];
      // Rehydrater les dates (JSON.parse renvoie des strings)
      return parsed.map((a) => ({ ...a, timestamp: new Date(a.timestamp) }));
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────
  //  Mapping event depuis WebSocket
  // ─────────────────────────────────────────
  private mapEvent(raw: any): LiveActivity {
    const typeMap: Record<string, { icon: string; color: string }> = {
      user_register: { icon: '🟢', color: 'bg-green-50 border-green-200 text-green-700' },
      user_login: { icon: '👤', color: 'bg-gray-50 border-gray-200 text-gray-700' },
      face_login: { icon: '📸', color: 'bg-blue-50 border-blue-200 text-blue-700' },
      user_ban: { icon: '🚫', color: 'bg-red-50 border-red-200 text-red-700' },
      suspect_login: { icon: '🔴', color: 'bg-red-50 border-red-200 text-red-700' },
      loyalty_upgrade: { icon: '🥇', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
      loyalty_points: { icon: '⭐', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    };
    const meta = typeMap[raw.type] || {
      icon: '📌',
      color: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return {
      id: raw.id || Date.now().toString(),
      type: raw.type,
      message: raw.message || 'Activité',
      detail: raw.detail,
      timestamp: new Date(raw.timestamp || Date.now()),
      ...meta,
    };
  }
}
