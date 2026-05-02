import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TraceDetailComponent } from './trace-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TraceDetailComponent', () => {
  let component: TraceDetailComponent;
  let fixture: ComponentFixture<TraceDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraceDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TraceDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
