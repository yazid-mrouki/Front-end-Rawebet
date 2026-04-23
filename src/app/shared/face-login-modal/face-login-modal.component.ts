import {
  Component,
  EventEmitter,
  Output,
  OnDestroy,
  inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FaceAuthService } from '../../core/services/face-auth.service';
import { AuthService } from '../../core/services/auth.service';

type Step = 'idle' | 'capturing' | 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-face-login-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-login-modal.component.html',
})
export class FaceLoginModalComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();

  step: Step = 'idle';
  errorMessage = '';

  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly faceAuth = inject(FaceAuthService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // ─────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────
  ngOnDestroy(): void {
    this.stopCamera();
    this.videoEl?.remove();
    this.videoEl = null;
  }

  close(): void {
    this.stopCamera();
    this.closed.emit();
  }

  // ─────────────────────────────────────────
  //  Démarrer le flux caméra
  // ─────────────────────────────────────────
  async startCamera(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.step = 'capturing';
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      // Créer la vidéo et l'injecter dans le conteneur
      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = this.stream;
      this.videoEl.muted = true;
      this.videoEl.setAttribute('playsinline', '');
      this.videoEl.style.cssText =
        'width:100%;max-height:280px;object-fit:cover;border-radius:12px;display:block;';

      await this.videoEl.play();

      const container = document.getElementById('face-video-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(this.videoEl);
      }

      this.cdr.detectChanges();
    } catch (err: any) {
      this.ngZone.run(() => {
        this.step = 'error';
        this.errorMessage =
          err.name === 'NotAllowedError'
            ? "Accès à la caméra refusé. Veuillez autoriser l'accès dans votre navigateur."
            : "Impossible d'accéder à la caméra.";
        this.cdr.detectChanges();
      });
    }
  }

  // ─────────────────────────────────────────
  //  Capturer & authentifier
  // ─────────────────────────────────────────
  async captureAndLogin(): Promise<void> {
    if (!this.videoEl || this.step !== 'capturing') return;

    const video = this.videoEl;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.step = 'error';
      this.errorMessage = 'Caméra non prête. Veuillez réessayer.';
      this.cdr.detectChanges();
      return;
    }

    // Capture la frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.92);

    this.stopCamera();
    this.step = 'verifying';
    this.cdr.detectChanges();

    try {
      await this.faceAuth.loginWithFace(imageBase64);

      this.ngZone.run(() => {
        this.step = 'success';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(this.auth.isAdmin() ? ['/admin'] : ['/home']);
        }, 1200);
      });
    } catch (err: any) {
      this.ngZone.run(() => {
        this.step = 'error';
        this.errorMessage =
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Visage non reconnu. Veuillez réessayer.';
        this.cdr.detectChanges();
      });
    }
  }

  // ─────────────────────────────────────────
  //  Réessayer
  // ─────────────────────────────────────────
  retry(): void {
    this.step = 'idle';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────
  //  Stop caméra
  // ─────────────────────────────────────────
  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
