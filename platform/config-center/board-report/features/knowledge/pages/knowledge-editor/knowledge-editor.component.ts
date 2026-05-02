import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knowledge-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="knowledge-editor-container p-6">
      <h1 class="text-2xl font-bold mb-4">Knowledge Editor</h1>
      <p class="text-gray-600">Create or edit a knowledge article.</p>
    </div>
  `
})
export class KnowledgeEditorComponent {}
