import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceAiAdminComponent } from './governance-ai-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GovernanceAiAdminComponent', () => {
  let component: GovernanceAiAdminComponent;
  let fixture: ComponentFixture<GovernanceAiAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernanceAiAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GovernanceAiAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
