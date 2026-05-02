var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosChallengeCardComponent = class DosChallengeCardComponent {
    category = '';
    title = '';
    description = '';
    acceptLabel = 'Accept';
    dismissLabel = 'Dismiss';
    accept = new EventEmitter();
    dismiss = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "category", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "acceptLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "dismissLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "accept", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosChallengeCardComponent.prototype, "dismiss", void 0);
DosChallengeCardComponent = __decorate([
    Component({
        selector: 'dos-challenge-card',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <article class="dos-metric-card">
      <span class="dos-metric-card__label">{{ category }}</span>
      <strong class="dos-metric-card__value">{{ title }}</strong>
      <p class="dos-page-header__description">{{ description }}</p>
      <div class="dos-stack-h">
        <button type="button" class="dos-command-bar__btn" (click)="dismiss.emit()">{{ dismissLabel }}</button>
        <button type="button" class="dos-command-bar__btn dos-command-bar__btn--primary" (click)="accept.emit()">
          {{ acceptLabel }}
        </button>
      </div>
    </article>
  `,
    })
], DosChallengeCardComponent);
export { DosChallengeCardComponent };
//# sourceMappingURL=challenge-card.component.js.map