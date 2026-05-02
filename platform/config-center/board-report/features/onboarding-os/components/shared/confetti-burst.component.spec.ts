import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfettiBurstComponent } from './confetti-burst.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfettiBurstComponent', () => {
  let component: ConfettiBurstComponent;
  let fixture: ComponentFixture<ConfettiBurstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfettiBurstComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfettiBurstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
