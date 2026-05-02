import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiFieldExplainerComponent } from './ai-field-explainer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiFieldExplainerComponent', () => {
  let component: AiFieldExplainerComponent;
  let fixture: ComponentFixture<AiFieldExplainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiFieldExplainerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiFieldExplainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
