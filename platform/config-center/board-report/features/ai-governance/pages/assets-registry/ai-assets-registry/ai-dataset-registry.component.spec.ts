import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDatasetRegistryComponent } from './ai-dataset-registry.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiDatasetRegistryComponent', () => {
  let component: AiDatasetRegistryComponent;
  let fixture: ComponentFixture<AiDatasetRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDatasetRegistryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiDatasetRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
