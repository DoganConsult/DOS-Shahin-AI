import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalKnowledgeRetrievalComponent } from './local-knowledge-retrieval.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LocalKnowledgeRetrievalComponent', () => {
  let component: LocalKnowledgeRetrievalComponent;
  let fixture: ComponentFixture<LocalKnowledgeRetrievalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalKnowledgeRetrievalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LocalKnowledgeRetrievalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
