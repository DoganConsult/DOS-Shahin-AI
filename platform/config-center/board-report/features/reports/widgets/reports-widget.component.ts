import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({ selector: 'app-reports-widget', standalone: true, imports: [CommonModule], template: `<div class="reports-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>` })
export class ReportsWidgetComponent { @Input() title = 'Reports'; }
