import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworkScorecardComponent } from './framework-scorecard.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworkScorecardComponent', () => {
  let component: FrameworkScorecardComponent;
  let fixture: ComponentFixture<FrameworkScorecardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkScorecardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworkScorecardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
