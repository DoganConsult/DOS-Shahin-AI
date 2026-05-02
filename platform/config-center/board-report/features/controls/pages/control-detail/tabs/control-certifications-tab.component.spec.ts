import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlCertificationsTabComponent } from './control-certifications-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlCertificationsTabComponent', () => {
  let component: ControlCertificationsTabComponent;
  let fixture: ComponentFixture<ControlCertificationsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlCertificationsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlCertificationsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
