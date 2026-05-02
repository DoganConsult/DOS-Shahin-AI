import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalKnowledgeIngestionComponent } from './local-knowledge-ingestion.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LocalKnowledgeIngestionComponent', () => {
  let component: LocalKnowledgeIngestionComponent;
  let fixture: ComponentFixture<LocalKnowledgeIngestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalKnowledgeIngestionComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LocalKnowledgeIngestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
