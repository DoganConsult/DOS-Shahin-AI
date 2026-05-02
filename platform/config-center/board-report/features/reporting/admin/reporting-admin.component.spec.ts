import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportingAdminComponent } from './reporting-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportingAdminComponent', () => {
  let component: ReportingAdminComponent;
  let fixture: ComponentFixture<ReportingAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportingAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
