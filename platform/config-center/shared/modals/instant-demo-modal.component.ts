import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-instant-demo-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div tabindex="0" role="button" (keyup.enter)="close()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="close()">
        <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-play text-blue-600 text-2xl"></i>
            </div>

            <h2 class="text-2xl font-bold text-gray-900 mb-3">
              {{ i18n.translate('instantDemo.title') }}
            </h2>

            <p class="text-gray-500 mb-6">
              {{ i18n.translate('instantDemo.description') }}
            </p>

            <div class="flex flex-col gap-3">
              <a
                href="/demo"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <i class="pi pi-external-link"></i>
                {{ i18n.translate('instantDemo.launch') }}
              </a>
              <button
                type="button"
                (click)="close()"
                class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {{ i18n.translate('common.close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class InstantDemoModalComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  i18n = inject(I18nService);

  close(): void {
    this.visibleChange.emit(false);
  }
}
