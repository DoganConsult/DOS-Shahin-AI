import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformEmailApprovalsComponent } from './platform-email-approvals.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PlatformEmailApprovalsComponent', () => {
  let component: PlatformEmailApprovalsComponent;
  let fixture: ComponentFixture<PlatformEmailApprovalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformEmailApprovalsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PlatformEmailApprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
