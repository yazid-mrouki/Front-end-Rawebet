import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PasskeyService } from '../../core/services/passkey.service';
import { environment } from '../../../environments/environment';
import { FaceRegisterModalComponent } from '../../shared/face-register-modal/face-register-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FaceRegisterModalComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild('avatarFileInput') avatarFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLCanvasElement>;

  user = { fullName: '', email: '', avatarUrl: '', phone: '', joinDate: '', tier: '', points: 0 };
  editDraft = { fullName: '', email: '', phone: '' };

  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  showEditProfileModal = false;
  showChangePasswordModal = false;

  avatarUploading = false;
  showAvatarMenu = false;
  showAvatarViewer = false;

  showAvatarModal = false;
  avatarModalTab: 'gallery' | 'camera' = 'gallery';

  galleryFile: File | null = null;
  galleryPreview = '';
  croppedPreview = '';
  cropOffset = { x: 0, y: 0 };
  cropSize = 0;
  isDragging = false;
  dragStart = { x: 0, y: 0 };
  dragOrigin = { x: 0, y: 0 };
  naturalSize = { w: 0, h: 0 };

  cameraStream: MediaStream | null = null;
  cameraError = '';
  capturedImage = '';
  cameraReady = false;
  cameraLoading = false;

  supportsPasskey = false;
  passkeyLoading = false;
  passkeyMode: 'platform' | 'passkey' | null = null;
  passkeyError = '';
  passkeySuccess = '';
  hasPasskey = false;
  passkeyChecked = false;

  // Face Register Webcam
  showFaceRegisterModal = false;
  faceRegistered = false;

  stats = [
    { label: 'Events Attended', value: 23, icon: '🎭' },
    { label: 'Films Watched', value: 15, icon: '🎬' },
    { label: 'Clubs Joined', value: 3, icon: '👥' },
    { label: 'Tickets Purchased', value: 38, icon: '🎟️' },
  ];

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private toast: ToastService,
    private passkey: PasskeyService,
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.supportsPasskey = this.passkey.isSupported();
    this.bootstrapProfileFromToken();
    this.loadProfile();
    this.checkPasskeyStatus();
    this.checkFaceStatus(); // ← AJOUT : vérifie si visage déjà enregistré
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────
  private bootstrapProfileFromToken() {
    this.user.fullName = this.auth.getCurrentUserName() || '';
    this.user.email = this.auth.getCurrentUserEmail() || '';
    this.user.tier = 'SILVER';
    this.user.points = 0;
  }

  loadProfile() {
    this.userService.getMe().subscribe({
      next: (profile) => {
        const p = profile as unknown as Record<string, unknown>;
        this.user.fullName = String(
          p['nom'] || p['name'] || p['fullName'] || this.auth.getCurrentUserName() || '',
        );
        this.user.email = String(p['email'] || this.auth.getCurrentUserEmail() || '');
        this.user.avatarUrl = this.resolveAvatarUrl(p['avatarUrl']);
        this.user.tier = String(p['loyaltyLevel'] || 'SILVER').toUpperCase();
        this.user.points = Number(p['loyaltyPoints'] || 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.bootstrapProfileFromToken();
        this.toast.error('Impossible de charger le profil.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Passkey status ────────────────────────────────────────────────
  private checkPasskeyStatus() {
    if (!this.supportsPasskey) return;
    const api = environment.apiUrl.replace(/\/$/, '');
    this.http.get<{ hasPasskey: boolean }>(`${api}/auth/webauthn/my-credentials`).subscribe({
      next: (res) => {
        this.hasPasskey = res.hasPasskey;
        this.passkeyChecked = true;
      },
      error: () => {
        this.hasPasskey = false;
        this.passkeyChecked = true;
      },
    });
  }

  // ── Face status ── AJOUT ──────────────────────────────────────────
  private checkFaceStatus() {
    const email = this.auth.getCurrentUserEmail();
    if (!email) return;
    const api = environment.apiUrl.replace(/\/$/, '');
    this.http.get<{ registered: boolean }>(`${api}/auth/face/status?email=${email}`).subscribe({
      next: (res) => {
        this.faceRegistered = res.registered;
        this.cdr.markForCheck();
      },
      error: () => {
        this.faceRegistered = false;
      },
    });
  }

  // ── Avatar menu ───────────────────────────────────────────────────
  toggleAvatarMenu(event?: MouseEvent) {
    event?.stopPropagation();
    this.showAvatarMenu = !this.showAvatarMenu;
  }
  closeAvatarMenu() {
    this.showAvatarMenu = false;
  }
  openAvatarViewer() {
    if (!this.user.avatarUrl) return;
    this.showAvatarViewer = true;
    this.showAvatarMenu = false;
  }
  closeAvatarViewer() {
    this.showAvatarViewer = false;
  }

  // ── Avatar modal ──────────────────────────────────────────────────
  openAvatarModal(tab: 'gallery' | 'camera' = 'gallery') {
    this.showAvatarMenu = false;
    this.showAvatarModal = true;
    this.avatarModalTab = tab;
    this.galleryFile = null;
    this.galleryPreview = '';
    this.croppedPreview = '';
    this.capturedImage = '';
    this.cameraError = '';
    if (tab === 'camera') setTimeout(() => this.startCamera(), 100);
  }

  closeAvatarModal() {
    this.stopCamera();
    this.showAvatarModal = false;
    this.galleryPreview = '';
    this.croppedPreview = '';
    this.capturedImage = '';
    this.cameraError = '';
    this.galleryFile = null;
  }

  switchTab(tab: 'gallery' | 'camera') {
    this.avatarModalTab = tab;
    this.capturedImage = '';
    this.cameraError = '';
    if (tab === 'camera') {
      setTimeout(() => this.startCamera(), 100);
    } else {
      this.stopCamera();
    }
  }

  // ── Galerie + crop ────────────────────────────────────────────────
  onGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Veuillez sélectionner une image valide (PNG, JPG, WEBP).');
      return;
    }
    this.galleryFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.ngZone.run(() => {
        this.galleryPreview = e.target?.result as string;
        this.initCrop();
      });
    };
    reader.readAsDataURL(file);
  }

  private initCrop() {
    const img = new Image();
    img.onload = () => {
      this.ngZone.run(() => {
        this.naturalSize = { w: img.naturalWidth, h: img.naturalHeight };
        const size = Math.min(img.naturalWidth, img.naturalHeight);
        this.cropSize = size;
        this.cropOffset = {
          x: Math.floor((img.naturalWidth - size) / 2),
          y: Math.floor((img.naturalHeight - size) / 2),
        };
        this.updateCroppedPreview();
      });
    };
    img.src = this.galleryPreview;
  }

  private updateCroppedPreview() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        this.cropOffset.x,
        this.cropOffset.y,
        this.cropSize,
        this.cropSize,
        0,
        0,
        400,
        400,
      );
      this.ngZone.run(() => {
        this.croppedPreview = canvas.toDataURL('image/jpeg', 0.92);
        this.cdr.markForCheck();
      });
    };
    img.src = this.galleryPreview;
  }

  onCropMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragOrigin = { ...this.cropOffset };
    event.preventDefault();
  }

  onCropMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    const ratio = this.naturalSize.w / 320;
    const dx = (event.clientX - this.dragStart.x) * ratio;
    const dy = (event.clientY - this.dragStart.y) * ratio;
    this.cropOffset = {
      x: Math.max(0, Math.min(this.naturalSize.w - this.cropSize, this.dragOrigin.x - dx)),
      y: Math.max(0, Math.min(this.naturalSize.h - this.cropSize, this.dragOrigin.y - dy)),
    };
    this.updateCroppedPreview();
  }

  onCropMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.updateCroppedPreview();
    }
  }

  get cropBoxStyle() {
    if (!this.naturalSize.w || !this.naturalSize.h) return {};
    const displaySize = 320;
    const scale = displaySize / Math.max(this.naturalSize.w, this.naturalSize.h);
    const imgW = this.naturalSize.w * scale;
    const imgH = this.naturalSize.h * scale;
    const offX = (displaySize - imgW) / 2;
    const offY = (displaySize - imgH) / 2;
    return {
      left: offX + this.cropOffset.x * scale + 'px',
      top: offY + this.cropOffset.y * scale + 'px',
      width: this.cropSize * scale + 'px',
      height: this.cropSize * scale + 'px',
    };
  }

  confirmGallery() {
    if (!this.croppedPreview) return;
    const blob = this.dataUrlToBlob(this.croppedPreview);
    this.uploadFile(new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  // ── Caméra ────────────────────────────────────────────────────────
  async startCamera() {
    this.cameraReady = false;
    this.cameraLoading = true;
    this.cameraError = '';
    this.capturedImage = '';
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = this.videoEl?.nativeElement;
      if (video) {
        video.srcObject = this.cameraStream;
        video.onloadedmetadata = () => {
          video.play();
          this.ngZone.run(() => {
            this.cameraReady = true;
            this.cameraLoading = false;
          });
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.ngZone.run(() => {
        this.cameraLoading = false;
        this.cameraError = msg.toLowerCase().includes('permission')
          ? 'Accès à la caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
          : "Impossible d'accéder à la caméra.";
      });
    }
  }

  capturePhoto() {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(400, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
    this.capturedImage = canvas.toDataURL('image/jpeg', 0.92);
    this.stopCamera();
  }

  retakePhoto() {
    this.capturedImage = '';
    setTimeout(() => this.startCamera(), 100);
  }

  confirmCamera() {
    if (!this.capturedImage) return;
    const blob = this.dataUrlToBlob(this.capturedImage);
    this.uploadFile(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  private stopCamera() {
    this.cameraStream?.getTracks().forEach((t) => t.stop());
    this.cameraStream = null;
    this.cameraReady = false;
  }

  // ── Upload ────────────────────────────────────────────────────────
  private uploadFile(file: File) {
    this.avatarUploading = true;
    this.userService
      .uploadMyAvatar(file)
      .pipe(
        finalize(() => {
          this.avatarUploading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updated) => {
          this.user.avatarUrl = this.resolveAvatarUrl(updated.avatarUrl);
          this.cdr.markForCheck();
          this.toast.success('Photo de profil mise à jour avec succès.');
          setTimeout(() => this.closeAvatarModal(), 800);
        },
        error: (err) => {
          this.toast.error(
            err?.error?.error || err?.error?.message || 'Impossible de mettre à jour la photo.',
          );
        },
      });
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.uploadFile(file);
    input.value = '';
  }

  triggerAvatarPicker() {
    this.openAvatarModal('gallery');
  }

  // ── Profil ────────────────────────────────────────────────────────
  openEditProfileModal() {
    this.editDraft = {
      fullName: this.user.fullName,
      email: this.user.email,
      phone: this.user.phone,
    };
    this.showEditProfileModal = true;
  }

  closeEditProfileModal() {
    this.showEditProfileModal = false;
  }

  openChangePasswordModal() {
    this.passwordError = '';
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
    this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
  }

  onSubmit() {
    this.userService
      .updateMe({ nom: this.editDraft.fullName, email: this.editDraft.email })
      .subscribe({
        next: (updated) => {
          this.user.fullName = updated.nom;
          this.user.email = updated.email;
          this.user.phone = this.editDraft.phone;
          this.showEditProfileModal = false;
          this.toast.success('Profil mis à jour avec succès.');
        },
        error: (err) => {
          this.toast.error(
            err?.error?.error || err?.error?.message || 'Impossible de mettre à jour le profil.',
          );
        },
      });
  }

  changePassword() {
    this.passwordError = '';
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    this.userService
      .changePassword({
        oldPassword: this.passwordForm.oldPassword,
        newPassword: this.passwordForm.newPassword,
      })
      .pipe(finalize(() => {}))
      .subscribe({
        next: () => {
          this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
          this.showChangePasswordModal = false;
          this.toast.success('Mot de passe modifié avec succès.');
        },
        error: (err) => {
          this.passwordError =
            typeof err?.error === 'string' && err.error.trim()
              ? err.error
              : err?.error?.error || err?.error?.message || 'Ancien mot de passe incorrect.';
        },
      });
  }

  // ── Passkey ───────────────────────────────────────────────────────
  async enableFaceId() {
    await this.enablePasskeyWithMode('platform');
  }
  async enablePasskey() {
    await this.enablePasskeyWithMode('passkey');
  }

  private async enablePasskeyWithMode(mode: 'platform' | 'passkey') {
    this.runInZone(() => {
      this.passkeyError = '';
      this.passkeySuccess = '';
    });
    if (!this.supportsPasskey) {
      this.runInZone(
        () => (this.passkeyError = 'Ce navigateur ne prend pas en charge les passkeys.'),
      );
      return;
    }
    const username = (this.user.email || this.auth.getCurrentUserEmail() || '').trim();
    const displayName = (this.user.fullName || this.auth.getCurrentUserName() || username).trim();
    if (!username || !displayName) {
      this.runInZone(() => (this.passkeyError = 'Le profil doit contenir un nom et un email.'));
      return;
    }
    this.runInZone(() => {
      this.passkeyLoading = true;
      this.passkeyMode = mode;
    });
    try {
      await this.passkey.registerPasskey({ username, displayName }, mode);
      this.runInZone(() => {
        this.passkeySuccess =
          mode === 'platform' ? 'Face ID activé avec succès.' : 'Passkey activée avec succès.';
        this.hasPasskey = true;
        this.toast.success(this.passkeySuccess);
      });
    } catch (error) {
      this.runInZone(() => {
        const message = this.extractMessage(error, "Impossible d'activer.");
        const alreadyEnrolledPattern = /(deja|déjà|already|enregistr|cet appareil)/i;

        if (alreadyEnrolledPattern.test(message)) {
          this.passkeyError = '';
          this.passkeySuccess =
            mode === 'platform'
              ? 'Face ID déjà actif sur cet appareil. Utilisez la connexion Face ID.'
              : 'Passkey multi-appareils déjà active. Utilisez la connexion Passkey.';
          this.hasPasskey = true;
          this.toast.success(this.passkeySuccess);
          return;
        }

        this.passkeyError = message;
        this.toast.error(this.passkeyError);
      });
    } finally {
      this.runInZone(() => {
        this.passkeyLoading = false;
        this.passkeyMode = null;
      });
    }
  }

  // ── Face Register Webcam ──────────────────────────────────────────
  openFaceRegister(): void {
    this.showFaceRegisterModal = true;
  }

  onFaceRegisterClosed(): void {
    this.showFaceRegisterModal = false;
  }

  onFaceRegistered(): void {
    this.faceRegistered = true;
    this.toast.success('Visage enregistré ! Vous pouvez maintenant vous connecter par visage.');
  }

  // ── Badges (header fond sombre) ───────────────────────────────────
  get tierLabel(): string {
    if (this.auth.isAdmin()) return this.adminBadgeLabel;
    const t = (this.user.tier || 'SILVER').toUpperCase();
    if (t === 'VIP') return 'VIP';
    if (t === 'GOLD') return 'Gold';
    return 'Silver';
  }

  get tierIcon(): string {
    if (this.auth.isAdmin()) return this.adminBadgeIcon;
    const t = (this.user.tier || 'SILVER').toUpperCase();
    if (t === 'VIP') return '💎';
    if (t === 'GOLD') return '🥇';
    return '🥈';
  }

  get tierBadgeClass(): string {
    if (this.auth.isAdmin()) {
      const roles = this.auth.getRoles();
      if (roles.includes('SUPER_ADMIN'))
        return 'bg-amber-400/20 text-amber-200 border-amber-400/40 backdrop-blur-sm';
      if (roles.includes('ADMIN_CINEMA'))
        return 'bg-blue-400/20 text-blue-200 border-blue-400/40 backdrop-blur-sm';
      if (roles.includes('ADMIN_EVENT'))
        return 'bg-purple-400/20 text-purple-200 border-purple-400/40 backdrop-blur-sm';
      if (roles.includes('ADMIN_CLUB'))
        return 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40 backdrop-blur-sm';
      return 'bg-white/15 text-white border-white/30 backdrop-blur-sm';
    }
    const t = (this.user.tier || 'SILVER').toUpperCase();
    if (t === 'VIP')
      return 'bg-violet-400/25 text-violet-200 border-violet-400/40 backdrop-blur-sm';
    if (t === 'GOLD') return 'bg-amber-400/25 text-amber-200 border-amber-400/40 backdrop-blur-sm';
    return 'bg-white/15 text-white/80 border-white/25 backdrop-blur-sm';
  }

  get adminBadgeLabel(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) return 'Super Admin';
    if (roles.includes('ADMIN_CINEMA')) return 'Admin Cinéma';
    if (roles.includes('ADMIN_EVENT')) return 'Admin Events';
    if (roles.includes('ADMIN_CLUB')) return 'Admin Club';
    return 'Admin';
  }

  get adminBadgeIcon(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) return '👑';
    if (roles.includes('ADMIN_CINEMA')) return '🎬';
    if (roles.includes('ADMIN_EVENT')) return '🎭';
    if (roles.includes('ADMIN_CLUB')) return '👥';
    return '🛡️';
  }

  get adminBadgeClass(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (roles.includes('ADMIN_CINEMA')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (roles.includes('ADMIN_EVENT'))
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    if (roles.includes('ADMIN_CLUB'))
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  // ── Helpers ───────────────────────────────────────────────────────
  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  private resolveAvatarUrl(raw: unknown): string {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return '';
    if (value.startsWith('http')) return value;
    return `${environment.apiUrl.replace(/\/$/, '')}${value.startsWith('/') ? value : '/' + value}`;
  }

  private runInZone(action: () => void) {
    NgZone.isInAngularZone() ? action() : this.ngZone.run(action);
  }

  private extractMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const e = error as { error?: unknown; message?: unknown };
      if (typeof e.error === 'string' && e.error.trim()) return e.error;
      if (typeof e.message === 'string' && e.message.trim()) return e.message;
    }
    return fallback;
  }
}
