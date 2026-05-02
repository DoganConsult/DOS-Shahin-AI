import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApprovalCenterComponent } from './approval-center.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ApprovalCenterComponent', () => {
  let component: ApprovalCenterComponent;
  let fixture: ComponentFixture<ApprovalCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalCenterComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ApprovalCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
