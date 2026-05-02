import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocalKnowledgeApiService } from '../../services/local-knowledge-api.service';

@Component({
  selector: 'app-local-knowledge-retrieval',
  templateUrl: './local-knowledge-retrieval.component.html',
  styleUrls: ['./local-knowledge-retrieval.component.scss']
})
export class LocalKnowledgeRetrievalComponent implements OnInit {
  searchForm: FormGroup;
  loading = false;
  searchResults: any[] = [];
  searchTime = 0;
  totalFound = 0;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: LocalKnowledgeApiService
  ) {
    this.searchForm = this.fb.group({
      query: [''],
      topK: [10],
      minScore: [0.1],
      sourceIds: [[]],
      tags: [[]],
      languageCode: ['en'],
      includeHighlights: [true],
      includeContext: [true]
    });
  }

  ngOnInit(): void {
    // Set up search with debouncing
    this.searchForm.get('query')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        if (query && query.length >= 3) {
          this.performSearch();
        } else {
          this.searchResults = [];
          this.totalFound = 0;
        }
      });
  }

  async performSearch(): Promise<void> {
    const query = this.searchForm.get('query')?.value;
    if (!query || query.length < 3) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const searchRequest = this.searchForm.value;
      const result = await this.apiService.searchKnowledge(searchRequest);
      
      this.searchResults = result.results;
      this.totalFound = result.totalFound;
      this.searchTime = result.searchTime;

    } catch (err) {
      this.error = 'Search failed';
      console.error('Search error:', err);
    } finally {
      this.loading = false;
    }
  }

  clearSearch(): void {
    this.searchForm.patchValue({ query: '' });
    this.searchResults = [];
    this.totalFound = 0;
  }

  exportResults(): void {
    if (this.searchResults.length === 0) {
      return;
    }

    const csvContent = this.convertToCSV(this.searchResults);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-search-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any[]): string {
    const headers = ['Document Title', 'Content', 'Score', 'Document ID'];
    const csvRows = [headers.join(',')];

    for (const result of data) {
      const row = [
        `"${result.documentTitle}"`,
        `"${result.content.replace(/"/g, '""')}"`,
        result.score,
        result.documentId
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  viewDocument(documentId: string): void {
    // Navigate to document view
  }
}
