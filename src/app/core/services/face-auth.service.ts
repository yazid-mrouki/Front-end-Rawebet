import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class FaceAuthService {
  private readonly api = environment.apiUrl.replace(/\/$/, '');
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  // ─────────────────────────────────────────
  //  Vérifie si la webcam est disponible
  // ─────────────────────────────────────────
  isSupported(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  // ─────────────────────────────────────────
  //  Capture une photo depuis la webcam
  //  Retourne un base64 (data:image/jpeg;base64,...)
  // ─────────────────────────────────────────
  async captureFromWebcam(): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('Webcam non disponible sur ce navigateur');
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', '');
      document.body.appendChild(video);

      await video.play();

      // Attendre que de vrais pixels soient disponibles
      await this._waitForFrames(video);

      // Triple RAF pour garantir que le GPU a rendu la frame
      const base64 = await new Promise<string>((resolve, reject) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                resolve(dataUrl);
              } catch (err) {
                reject(err);
              }
            }),
          ),
        );
      });

      document.body.removeChild(video);
      return base64;
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }

  // ─────────────────────────────────────────
  //  Login par visage → retourne JWT Spring
  // ─────────────────────────────────────────
  async loginWithFace(imageBase64: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.api}/auth/face/login`, {
        image: imageBase64,
      }),
    );
    // Réutilise exactement le même mécanisme que le login classique
    this.auth.completeAuthSession(response);
  }

  // ─────────────────────────────────────────
  //  Enregistrement du visage (depuis le profil)
  // ─────────────────────────────────────────
  async registerFace(email: string, imageBase64: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ message: string }>(`${this.api}/auth/face/register`, {
        email,
        image: imageBase64,
      }),
    );
    return response.message;
  }

  // ─────────────────────────────────────────
  //  Helper : attend les premiers pixels vidéo
  // ─────────────────────────────────────────
  private _waitForFrames(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      const maxWait = 8000;
      const step = 100;
      let elapsed = 0;
      const check = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
          return;
        }
        elapsed += step;
        if (elapsed >= maxWait) {
          resolve();
          return;
        }
        setTimeout(check, step);
      };
      check();
    });
  }
}
