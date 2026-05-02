import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskWorkQueueComponent } from './risk-work-queue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskWorkQueueComponent', () => {
  let component: RiskWorkQueueComponent;
  let fixture: ComponentFixture<RiskWorkQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskWorkQueueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskWorkQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
