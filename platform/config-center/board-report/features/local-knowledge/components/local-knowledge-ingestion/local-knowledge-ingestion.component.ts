import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocalKnowledgeApiService } from '../../services/local-knowledge-api.service';

@Component({
  selector: 'app-local-knowledge-ingestion',
  templateUrl: './local-knowledge-ingestion.component.html',
  styleUrls: ['./local-knowledge-ingestion.component.scss']
})
export class LocalKnowledgeIngestionComponent implements OnInit {
  ingestionForm: FormGroup;
  loading = false;
  uploadProgress = 0;
  selectedFile: File | null = null;
  ingestionResult: any = null;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: LocalKnowledgeApiService
  ) {
    this.ingestionForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      sourceType: ['manual', Validators.required],
      languageCode: ['en', Validators.required],
      tags: [[]],
      chunkStrategy: ['paragraph', Validators.required],
      metadata: [{}]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.ingestionForm.patchValue({
        title: file.name.replace(/\.[^/.]+$/, ''),
        metadata: {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size
        }
      });
    }
  }

  async submitIngestion(): Promise<void> {
    if (this.ingestionForm.invalid || !this.selectedFile) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.uploadProgress = 0;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('title', this.ingestionForm.value.title);
      formData.append('sourceType', this.ingestionForm.value.sourceType);
      formData.append('languageCode', this.ingestionForm.value.languageCode);
      formData.append('tags', JSON.stringify(this.ingestionForm.value.tags));
      formData.append('chunkStrategy', this.ingestionForm.value.chunkStrategy);
      formData.append('metadata', JSON.stringify(this.ingestionForm.value.metadata));

      const result = await this.apiService.ingestDocument(formData);
      this.ingestionResult = result;
      this.resetForm();

    } catch (err) {
      this.error = 'Failed to ingest document';
      console.error('Ingestion error:', err);
    } finally {
      this.loading = false;
    }
  }

  resetForm(): void {
    this.ingestionForm.reset();
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.ingestionResult = null;
  }

  viewIngestionQueue(): void {
    // Navigate to ingestion queue
  }
}
