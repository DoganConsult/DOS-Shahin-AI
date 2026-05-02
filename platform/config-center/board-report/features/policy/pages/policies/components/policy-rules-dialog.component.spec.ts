import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyRulesDialogComponent } from './policy-rules-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PolicyRulesDialogComponent', () => {
  let component: PolicyRulesDialogComponent;
  let fixture: ComponentFixture<PolicyRulesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyRulesDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PolicyRulesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
