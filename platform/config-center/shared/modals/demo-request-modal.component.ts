import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-demo-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible) {
      <div tabindex="0" role="button" (keyup.enter)="close()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="close()">
        <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl p-8 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">
            {{ i18n.translate('demoRequest.title') }}
          </h2>

          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ i18n.translate('demoRequest.fullName') }}
              </label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                [placeholder]="i18n.translate('demoRequest.enterName')" [attr.aria-label]="i18n.translate('demoRequest.enterName')"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ i18n.translate('demoRequest.email') }}
              </label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                [placeholder]="i18n.translate('demoRequest.enterEmail')" [attr.aria-label]="i18n.translate('demoRequest.enterEmail')"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ i18n.translate('demoRequest.preferredTime') }}
              </label>
              <input
                type="datetime-local"
                [(ngModel)]="preferredTime"
                name="preferredTime"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {{ i18n.translate('demoRequest.submit') }}
              </button>
              <button
                type="button"
                (click)="close()"
                class="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {{ i18n.translate('common.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class DemoRequestModalComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  i18n = inject(I18nService);

  name = '';
  email = '';
  preferredTime = '';

  close(): void {
    this.visibleChange.emit(false);
  }

  submit(): void {
    this.visibleChange.emit(false);
  }
}
