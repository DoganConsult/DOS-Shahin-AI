import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScoringPreviewComponent } from './scoring-preview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScoringPreviewComponent', () => {
  let component: ScoringPreviewComponent;
  let fixture: ComponentFixture<ScoringPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoringPreviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScoringPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
