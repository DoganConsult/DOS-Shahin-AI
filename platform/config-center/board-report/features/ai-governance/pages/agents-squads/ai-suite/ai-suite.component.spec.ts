import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSuiteComponent } from './ai-suite.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSuiteComponent', () => {
  let component: AiSuiteComponent;
  let fixture: ComponentFixture<AiSuiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSuiteComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSuiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
