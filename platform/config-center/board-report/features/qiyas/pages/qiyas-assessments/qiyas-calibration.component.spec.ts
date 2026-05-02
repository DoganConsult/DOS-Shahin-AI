import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasCalibrationComponent } from './qiyas-calibration.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasCalibrationComponent', () => {
  let component: QiyasCalibrationComponent;
  let fixture: ComponentFixture<QiyasCalibrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasCalibrationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasCalibrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
