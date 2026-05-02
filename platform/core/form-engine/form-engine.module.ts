import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicFormComponent } from './dynamic-form.component';

@NgModule({
  imports: [
    CommonModule,
    DynamicFormComponent // It's standalone
  ],
  exports: [
    DynamicFormComponent
  ]
})
export class FormEngineModule { }
