import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knowledge-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="knowledge-hub-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <h1 class="text-2xl font-bold mb-4">Knowledge Hub</h1>
      <p class="text-gray-600 mb-6">Search and discover knowledge articles across the organization.</p>
      
      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-10 w-full animate-pulse bg-gray-50 rounded">
        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="ms-3 text-indigo-600 font-medium">Loading knowledge articles...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-start">
        <i class="feather icon-alert-triangle text-xl me-3 mt-1"></i>
        <div>
          <h3 class="font-bold">Failed to load articles</h3>
          <p>{{ error }}</p>
          <button (click)="loadArticles()" class="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors">Retry</button>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && !error && articles.length === 0" class="text-center py-16 bg-gray-50 border border-gray-100 rounded-lg">
        <i class="feather icon-book-open text-4xl text-gray-300 mb-3"></i>
        <h3 class="text-xl font-medium text-gray-700">No articles found</h3>
        <p class="text-gray-500 mt-2">The knowledge base is currently empty or no articles match your criteria.</p>
        <button class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition">Create First Article</button>
      </div>

      <!-- Data State -->
      <div *ngIf="!isLoading && !error && articles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let article of articles" class="card bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded uppercase tracking-wider">{{ article.status }}</span>
            <span class="text-xs text-gray-400">{{ article.createdAt | date:'shortDate' }}</span>
          </div>
          <h2 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{{ article.title }}</h2>
          <p class="text-sm text-gray-600 mb-4 flex-grow line-clamp-3">Preview content for the article will appear here...</p>
          <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <span class="text-xs text-gray-500 font-medium">Version {{ article.version }}</span>
            <button class="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition">Read Article &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class KnowledgeHubComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  articles: any[] = [];

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles() {
    this.isLoading = true;
    this.error = null;
    
    // Simulate API call representing the actual integration point
    setTimeout(() => {
      this.isLoading = false;
      // Flip this boolean to simulate different states
      const simulateError = false;
      const simulateEmpty = false;
      
      if (simulateError) {
        this.error = "Connection to the knowledge base timed out.";
      } else if (simulateEmpty) {
        this.articles = [];
      } else {
        this.articles = [
          { id: '1', title: 'Enterprise Access Control Policies', status: 'published', version: 2, createdAt: new Date() },
          { id: '2', title: 'Onboarding Guide for New Security Vendors', status: 'in_review', version: 1, createdAt: new Date() },
          { id: '3', title: 'Q3 Financial Audit Preparation Steps', status: 'published', version: 4, createdAt: new Date(Date.now() - 86400000) }
        ];
      }
    }, 800);
  }
}
