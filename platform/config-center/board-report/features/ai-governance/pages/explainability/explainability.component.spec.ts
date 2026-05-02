import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExplainabilityComponent } from './explainability.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ExplainabilityComponent', () => {
  let component: ExplainabilityComponent;
  let fixture: ComponentFixture<ExplainabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplainabilityComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ExplainabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
