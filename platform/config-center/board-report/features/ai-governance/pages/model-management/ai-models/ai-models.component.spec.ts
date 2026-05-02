import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelsComponent } from './ai-models.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelsComponent', () => {
  let component: AiModelsComponent;
  let fixture: ComponentFixture<AiModelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
