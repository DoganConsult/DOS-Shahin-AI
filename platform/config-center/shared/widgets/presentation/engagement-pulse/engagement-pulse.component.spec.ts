import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EngagementPulseComponent } from './engagement-pulse.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EngagementPulseComponent', () => {
  let component: EngagementPulseComponent;
  let fixture: ComponentFixture<EngagementPulseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngagementPulseComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EngagementPulseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
