import { Type } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe, LowerCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Pipes
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { DisplayValuePipe } from '@app/shared/pipes/display-value.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';


// Common UI
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';
import { ExportButtonComponent } from '@app/shared/components/export-button.component';

// Directives
import { HasPermissionDirective } from '@app/shared/directives/has-permission.directive';
import { CursorGlowDirective } from '@app/shared/directives/cursor-glow.directive';
import { FocusTrapDirective } from '@app/shared/directives/focus-trap.directive';

// Structural Layouts
import { PageHeaderComponent } from '@app/shared/components/page-chrome/page-header.component';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-tabs-bar.component';


/**
 * DOS-AIO Shared UI Tokens Array
 * Consolidates universally used Angular Structural and Formatting Elements
 * to prevent template import ghosting (TS-998113) and reduce component boilerplate.
 */

export const CORE_PIPES_TOKEN: Array<Type<any> | any> = [
  DatePipe,
  UpperCasePipe,
  LowerCasePipe,
  AppDatePipe,
  AppNumberPipe,
  DisplayValuePipe
];

export const CORE_UI_TOKEN: Array<Type<any> | any> = [
  CommonModule,
  StatusBadgeComponent,
  EmptyStateComponent,
  SkeletonLoaderComponent,
  ExportButtonComponent
];

export const CORE_DIRECTIVES_TOKEN: Array<Type<any> | any> = [
  HasPermissionDirective,
  CursorGlowDirective,
  FocusTrapDirective
];

export const LAYOUT_TOKEN: Array<Type<any> | any> = [
  PageHeaderComponent,
  PageShellComponent,
  ModuleTabsBarComponent
];

export const CORE_AGRC_IMPORTS: Array<Type<any> | any> = [
  ...CORE_PIPES_TOKEN,
  ...CORE_UI_TOKEN,
  ...CORE_DIRECTIVES_TOKEN,
  ...LAYOUT_TOKEN
];
