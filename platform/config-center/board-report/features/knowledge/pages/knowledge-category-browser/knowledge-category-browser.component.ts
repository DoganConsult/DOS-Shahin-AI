import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knowledge-category-browser',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="category-browser-container p-6">
      <h1 class="text-2xl font-bold mb-4">Category Browser</h1>
      <p class="text-gray-600">Browse knowledge articles by category taxonomy.</p>
    </div>
  `
})
export class KnowledgeCategoryBrowserComponent {}
