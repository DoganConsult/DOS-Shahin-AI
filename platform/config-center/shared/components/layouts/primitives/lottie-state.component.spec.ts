import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LottieStateComponent } from './lottie-state.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LottieStateComponent', () => {
  let component: LottieStateComponent;
  let fixture: ComponentFixture<LottieStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LottieStateComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LottieStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
