import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelVersionTableComponent } from './ai-model-version-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelVersionTableComponent', () => {
  let component: AiModelVersionTableComponent;
  let fixture: ComponentFixture<AiModelVersionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelVersionTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelVersionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
