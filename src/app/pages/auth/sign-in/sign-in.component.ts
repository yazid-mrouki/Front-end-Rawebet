import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  PLATFORM_ID,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PasskeyService } from '../../../core/services/passkey.service';
import { FaceLoginModalComponent } from '../../../shared/face-login-modal/face-login-modal.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FaceLoginModalComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent implements OnInit, OnDestroy {
  model = { email: '', password: '' };
  error = '';
  passkeyError = '';
  passkeyLoading = false;
  passkeyMode: 'platform' | 'passkey' | null = null;
  supportsPasskey = false;
  showPassword = false;

  failedAttempts = 0;
  readonly MAX_ATTEMPTS = 5;

  // Caméra — géré entièrement en JS natif sans @ViewChild
  showCamera = false;
  cameraError = '';
  photoCapturing = false;
  photoSent = false;
  cameraReady = false;

  // Face Login Modal
  showFaceModal = false;

  private cameraStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private passkey: PasskeyService,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.supportsPasskey = this.passkey.isSupported();
    if (isPlatformBrowser(this.platformId)) {
      this.failedAttempts = parseInt(sessionStorage.getItem('login_attempts') ?? '0', 10);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.videoEl) {
      this.videoEl.remove();
      this.videoEl = null;
    }
    if (this.canvasEl) {
      this.canvasEl.remove();
      this.canvasEl = null;
    }
  }

  // ── Soumission formulaire ──────────────────────────────────────────────
  onSubmit() {
    this.error = '';
    this.passkeyError = '';

    this.auth.login(this.model).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem('login_attempts');
        this.failedAttempts = 0;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }
        this.router.navigate(this.auth.isAdmin() ? ['/admin'] : ['/home']);
      },
      error: (err) => {
        this.failedAttempts++;
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('login_attempts', String(this.failedAttempts));
        }

        this.error = this.extractErrorMessage(err);

        if (this.failedAttempts >= this.MAX_ATTEMPTS && !this.showCamera && !this.photoSent) {
          this.error =
            "Trop de tentatives — Votre caméra va s'activer pour des raisons de sécurité.";
          setTimeout(() => this.activateCamera(), 1500);
        }
      },
    });
  }

  // ── Caméra sécurité — création d'éléments DOM natifs ──────────────────
  async activateCamera() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.showCamera = true;
    this.cameraError = '';
    this.cameraReady = false;
    this.cdr.detectChanges();

    this.videoEl = document.createElement('video');
    this.canvasEl = document.createElement('canvas');

    this.videoEl.autoplay = true;
    this.videoEl.muted = true;
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.style.cssText =
      'width:100%;max-height:240px;object-fit:cover;border-radius:12px;display:block;';
    this.canvasEl.style.display = 'none';

    const container = document.getElementById('camera-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(this.videoEl);
      container.appendChild(this.canvasEl);
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      this.videoEl.srcObject = this.cameraStream;
      await this.videoEl.play();

      await this.waitForVideoFrames(this.videoEl);

      this.cameraReady = true;
      this.cdr.detectChanges();

      setTimeout(() => this.captureAndSend(), 1500);
    } catch (err: any) {
      this.ngZone.run(() => {
        this.cameraError =
          err.name === 'NotAllowedError'
            ? "Accès caméra refusé. L'incident est signalé."
            : "Caméra indisponible. L'incident est signalé.";
        this.cdr.detectChanges();
        this.sendAlert(null);
      });
    }
  }

  private waitForVideoFrames(video: HTMLVideoElement): Promise<void> {
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

  captureAndSend() {
    if (this.photoCapturing || this.photoSent) return;
    if (!this.videoEl || !this.canvasEl) {
      this.sendAlert(null);
      return;
    }

    const video = this.videoEl;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.stopCamera();
      this.sendAlert(null);
      return;
    }

    this.photoCapturing = true;
    this.cdr.detectChanges();

    const doCapture = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            try {
              const canvas = this.canvasEl!;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              let photo = canvas.toDataURL('image/jpeg', 0.92);
              if (!photo || photo === 'data:,' || photo.length < 2000) {
                photo = canvas.toDataURL('image/png');
              }

              this.stopCamera();

              if (photo && photo.startsWith('data:image') && photo.length > 2000) {
                this.sendAlert(photo);
              } else {
                this.sendAlert(null);
              }
            } catch (err) {
              this.stopCamera();
              this.sendAlert(null);
            }
          }),
        ),
      );
    };

    setTimeout(doCapture, 500);
  }

  private sendAlert(photoBase64: string | null) {
    const timestamp = new Date().toISOString();
    this.auth.sendSuspectAlert(this.model.email, photoBase64 ?? '', timestamp).subscribe({
      next: () =>
        this.ngZone.run(() => {
          this.photoSent = true;
          this.photoCapturing = false;
          this.showCamera = false;
          this.error = '🔒 Incident signalé. Contactez le support pour débloquer votre accès.';
          if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem('login_attempts');
          this.failedAttempts = 0;
          this.cdr.detectChanges();
        }),
      error: () =>
        this.ngZone.run(() => {
          this.photoCapturing = false;
          this.showCamera = false;
          this.error = '🔒 Trop de tentatives. Réessayez plus tard.';
          if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem('login_attempts');
          this.failedAttempts = 0;
          this.cdr.detectChanges();
        }),
    });
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
  }

  // ── Passkey / Face ID natif ────────────────────────────────────────────
  async useFaceId() {
    await this.usePasskeyWithMode('platform');
  }
  async usePasskey() {
    await this.usePasskeyWithMode('passkey');
  }

  private async usePasskeyWithMode(mode: 'platform' | 'passkey') {
    this.runInZone(() => {
      this.error = '';
      this.passkeyError = '';
      this.passkeyLoading = true;
      this.passkeyMode = mode;
    });
    try {
      await this.passkey.signInWithPasskey(this.model.email || undefined, mode);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (returnUrl) {
        await this.router.navigateByUrl(returnUrl);
        return;
      }
      await this.router.navigate(this.auth.isAdmin() ? ['/admin'] : ['/home']);
    } catch (error) {
      this.runInZone(() => {
        this.passkeyError = this.extractMessage(error, 'Impossible de vérifier la passkey.');
      });
    } finally {
      this.runInZone(() => {
        this.passkeyLoading = false;
        this.passkeyMode = null;
      });
    }
  }

  // ── Face Login Webcam (custom) ─────────────────────────────────────────
  openFaceLogin(): void {
    this.error = '';
    this.passkeyError = '';
    this.showFaceModal = true;
  }

  onFaceModalClosed(): void {
    this.showFaceModal = false;
  }

  // ── Getters ────────────────────────────────────────────────────────────
  get remainingAttempts(): number {
    return Math.max(0, this.MAX_ATTEMPTS - this.failedAttempts);
  }

  get showAttemptWarning(): boolean {
    return this.failedAttempts > 0 && this.failedAttempts < this.MAX_ATTEMPTS;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private extractErrorMessage(err: any): string {
    if (!err) return 'Email ou mot de passe incorrect';
    if (err?.error?.message && typeof err.error.message === 'string') return err.error.message;
    if (err?.error && typeof err.error === 'string') return err.error;
    if (err?.message && typeof err.message === 'string') return err.message;
    return 'Email ou mot de passe incorrect';
  }

  private extractMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const c = error as { error?: unknown; message?: unknown };
      if (typeof c.error === 'string' && c.error.trim()) return c.error;
      if (c.error && typeof c.error === 'object') {
        const n = c.error as { message?: unknown };
        if (typeof n.message === 'string' && n.message.trim()) return n.message;
      }
      if (typeof c.message === 'string' && c.message.trim()) return c.message;
    }
    return fallback;
  }

  private runInZone(action: () => void) {
    if (NgZone.isInAngularZone()) {
      action();
      return;
    }
    this.ngZone.run(action);
  }
}
