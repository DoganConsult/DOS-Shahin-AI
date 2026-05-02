import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworkRadarComponent } from './framework-radar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworkRadarComponent', () => {
  let component: FrameworkRadarComponent;
  let fixture: ComponentFixture<FrameworkRadarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkRadarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworkRadarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
