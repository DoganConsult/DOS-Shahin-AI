var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeSnippetModule } from 'carbon-components-angular';
/**
 * Carbon-backed code snippet. Three display modes:
 *   • inline    — short keyword
 *   • single    — single-line code with copy button
 *   • multi     — multi-line code with show-more / copy
 */
let DosCarbonCodeSnippetComponent = class DosCarbonCodeSnippetComponent {
    code = '';
    display = 'single';
    theme = 'light';
    skeleton = false;
    hideCopyButton = false;
    feedback = 'Copied!';
    feedbackTimeout = 2000;
    wrapText = false;
    copied = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "code", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonCodeSnippetComponent.prototype, "display", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonCodeSnippetComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "hideCopyButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "feedback", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "feedbackTimeout", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "wrapText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonCodeSnippetComponent.prototype, "copied", void 0);
DosCarbonCodeSnippetComponent = __decorate([
    Component({
        selector: 'dos-carbon-code-snippet',
        standalone: true,
        imports: [CommonModule, CodeSnippetModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-code-snippet
      [display]="display"
      [theme]="theme"
      [skeleton]="skeleton"
      [hideCopyButton]="hideCopyButton"
      [feedbackText]="feedback"
      [feedbackTimeout]="feedbackTimeout"
      [wrapText]="wrapText"
      (copyCode)="copied.emit($event)"
    >{{ code }}</cds-code-snippet>
  `,
    })
], DosCarbonCodeSnippetComponent);
export { DosCarbonCodeSnippetComponent };
//# sourceMappingURL=dos-carbon-code-snippet.component.js.map