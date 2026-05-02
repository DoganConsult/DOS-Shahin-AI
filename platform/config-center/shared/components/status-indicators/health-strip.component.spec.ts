import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HealthStripComponent } from './health-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('HealthStripComponent', () => {
  let component: HealthStripComponent;
  let fixture: ComponentFixture<HealthStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(HealthStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
