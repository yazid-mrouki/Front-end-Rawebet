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
import { FaceAuthService } from '../../core/services/face-auth.service';
import { AuthService } from '../../core/services/auth.service';

type Step = 'idle' | 'capturing' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-face-register-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-register-modal.component.html',
})
export class FaceRegisterModalComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  step: Step = 'idle';
  errorMessage = '';

  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly faceAuth = inject(FaceAuthService);
  private readonly auth = inject(AuthService);

  ngOnDestroy(): void {
    this.stopCamera();
    this.videoEl?.remove();
    this.videoEl = null;
  }

  close(): void {
    this.stopCamera();
    this.closed.emit();
  }

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

      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = this.stream;
      this.videoEl.muted = true;
      this.videoEl.setAttribute('playsinline', '');
      this.videoEl.style.cssText =
        'width:100%;max-height:280px;object-fit:cover;border-radius:12px;display:block;';

      await this.videoEl.play();
      await this._waitForFrames(this.videoEl);

      const container = document.getElementById('face-register-video-container');
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
            ? "Accès à la caméra refusé. Autorisez l'accès dans votre navigateur."
            : "Impossible d'accéder à la caméra.";
        this.cdr.detectChanges();
      });
    }
  }

  async captureAndRegister(): Promise<void> {
    if (!this.videoEl || this.step !== 'capturing') return;

    const video = this.videoEl;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.step = 'error';
      this.errorMessage = 'Caméra non prête. Veuillez réessayer.';
      this.cdr.detectChanges();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.92);

    this.stopCamera();
    this.step = 'processing';
    this.cdr.detectChanges();

    const email = this.auth.getCurrentUserEmail();
    if (!email) {
      this.ngZone.run(() => {
        this.step = 'error';
        this.errorMessage = 'Email introuvable. Veuillez vous reconnecter.';
        this.cdr.detectChanges();
      });
      return;
    }

    try {
      await this.faceAuth.registerFace(email, imageBase64);
      this.ngZone.run(() => {
        this.step = 'success';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.registered.emit();
          this.closed.emit();
        }, 2000);
      });
    } catch (err: any) {
      this.ngZone.run(() => {
        this.step = 'error';
        this.errorMessage =
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Enregistrement échoué. Assurez-vous que votre visage est bien visible.';
        this.cdr.detectChanges();
      });
    }
  }

  retry(): void {
    this.step = 'idle';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

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
