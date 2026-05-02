import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelProvenanceComponent } from './ai-model-provenance.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelProvenanceComponent', () => {
  let component: AiModelProvenanceComponent;
  let fixture: ComponentFixture<AiModelProvenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelProvenanceComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelProvenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
