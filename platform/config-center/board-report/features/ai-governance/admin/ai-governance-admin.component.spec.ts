import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceAdminComponent } from './ai-governance-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiGovernanceAdminComponent', () => {
  let component: AiGovernanceAdminComponent;
  let fixture: ComponentFixture<AiGovernanceAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiGovernanceAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiGovernanceAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
