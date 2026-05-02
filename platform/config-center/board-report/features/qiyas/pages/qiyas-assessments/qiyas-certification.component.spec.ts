import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasCertificationComponent } from './qiyas-certification.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasCertificationComponent', () => {
  let component: QiyasCertificationComponent;
  let fixture: ComponentFixture<QiyasCertificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasCertificationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasCertificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
