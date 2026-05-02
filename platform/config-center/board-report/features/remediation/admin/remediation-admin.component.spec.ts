import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationAdminComponent } from './remediation-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationAdminComponent', () => {
  let component: RemediationAdminComponent;
  let fixture: ComponentFixture<RemediationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
