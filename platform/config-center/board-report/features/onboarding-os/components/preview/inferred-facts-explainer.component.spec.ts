import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InferredFactsExplainerComponent } from './inferred-facts-explainer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InferredFactsExplainerComponent', () => {
  let component: InferredFactsExplainerComponent;
  let fixture: ComponentFixture<InferredFactsExplainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InferredFactsExplainerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InferredFactsExplainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
