import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelDriftComponent } from './ai-model-drift.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelDriftComponent', () => {
  let component: AiModelDriftComponent;
  let fixture: ComponentFixture<AiModelDriftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelDriftComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelDriftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
