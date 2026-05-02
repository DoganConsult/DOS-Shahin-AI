import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiProfilingComponent } from './ai-profiling.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiProfilingComponent', () => {
  let component: AiProfilingComponent;
  let fixture: ComponentFixture<AiProfilingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiProfilingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiProfilingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
