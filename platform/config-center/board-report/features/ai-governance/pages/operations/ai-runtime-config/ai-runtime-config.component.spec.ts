import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRuntimeConfigComponent } from './ai-runtime-config.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRuntimeConfigComponent', () => {
  let component: AiRuntimeConfigComponent;
  let fixture: ComponentFixture<AiRuntimeConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRuntimeConfigComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRuntimeConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
