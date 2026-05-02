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
import { FileUploaderModule } from 'carbon-components-angular';
/**
 * Carbon-backed file uploader (single + multi). Accepts a list of
 * already-uploaded files via [files] and emits added/removed events.
 */
let DosCarbonFileUploaderComponent = class DosCarbonFileUploaderComponent {
    title = 'Upload files';
    description = '';
    buttonText = 'Add file';
    accept = [];
    multiple = false;
    files = new Set();
    size = 'md';
    theme = 'light';
    disabled = false;
    skeleton = false;
    filesChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "buttonText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonFileUploaderComponent.prototype, "accept", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "multiple", void 0);
__decorate([
    Input(),
    __metadata("design:type", Set)
], DosCarbonFileUploaderComponent.prototype, "files", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonFileUploaderComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonFileUploaderComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "skeleton", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonFileUploaderComponent.prototype, "filesChange", void 0);
DosCarbonFileUploaderComponent = __decorate([
    Component({
        selector: 'dos-carbon-file-uploader',
        standalone: true,
        imports: [CommonModule, FileUploaderModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-file-uploader
      [title]="title"
      [description]="description"
      [size]="size"
      [buttonText]="buttonText"
      [accept]="accept"
      [multiple]="multiple"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [files]="files"
      (filesChange)="filesChange.emit($event)"
    ></cds-file-uploader>
  `,
    })
], DosCarbonFileUploaderComponent);
export { DosCarbonFileUploaderComponent };
//# sourceMappingURL=dos-carbon-file-uploader.component.js.map