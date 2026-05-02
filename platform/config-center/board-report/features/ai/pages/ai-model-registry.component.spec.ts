import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelRegistryComponent } from './ai-model-registry.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelRegistryComponent', () => {
  let component: AiModelRegistryComponent;
  let fixture: ComponentFixture<AiModelRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelRegistryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
