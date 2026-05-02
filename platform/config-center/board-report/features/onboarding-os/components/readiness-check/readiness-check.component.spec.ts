import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReadinessCheckComponent } from './readiness-check.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReadinessCheckComponent', () => {
  let component: ReadinessCheckComponent;
  let fixture: ComponentFixture<ReadinessCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadinessCheckComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReadinessCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
