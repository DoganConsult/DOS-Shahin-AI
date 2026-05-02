import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDataLineageComponent } from './ai-data-lineage.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiDataLineageComponent', () => {
  let component: AiDataLineageComponent;
  let fixture: ComponentFixture<AiDataLineageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDataLineageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiDataLineageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
