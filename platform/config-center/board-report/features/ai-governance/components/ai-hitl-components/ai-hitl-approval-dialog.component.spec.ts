import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiHitlApprovalDialogComponent } from './ai-hitl-approval-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiHitlApprovalDialogComponent', () => {
  let component: AiHitlApprovalDialogComponent;
  let fixture: ComponentFixture<AiHitlApprovalDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHitlApprovalDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiHitlApprovalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
