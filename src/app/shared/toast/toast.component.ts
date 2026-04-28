import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium min-w-[280px] max-w-sm animate-slide-in"
        [class.bg-green-600]="toast.type === 'success'"
        [class.bg-red-600]="toast.type === 'error'"
        [class.bg-gray-800]="toast.type === 'info'"
        style="color: white"
      >
        <span *ngIf="toast.type === 'success'">✓</span>
        <span *ngIf="toast.type === 'error'">⚠</span>
        <span *ngIf="toast.type === 'info'">ℹ</span>
        <span class="flex-1">{{ toast.message }}</span>
        <button
          (click)="toastService.dismiss(toast.id)"
          class="opacity-70 hover:opacity-100 ml-2 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .animate-slide-in {
        animation: slide-in 0.25s ease-out;
      }
    `,
  ],
})
export class ToastComponent {
  toastService = inject(ToastService);
}
