import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsCertificationsComponent } from './controls-certifications.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsCertificationsComponent', () => {
  let component: ControlsCertificationsComponent;
  let fixture: ComponentFixture<ControlsCertificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsCertificationsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsCertificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
