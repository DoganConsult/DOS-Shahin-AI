import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEuClassificationComponent } from './ai-eu-classification.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiEuClassificationComponent', () => {
  let component: AiEuClassificationComponent;
  let fixture: ComponentFixture<AiEuClassificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEuClassificationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiEuClassificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
