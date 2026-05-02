import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceOpsComponent } from './ai-governance-ops.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiGovernanceOpsComponent', () => {
  let component: AiGovernanceOpsComponent;
  let fixture: ComponentFixture<AiGovernanceOpsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiGovernanceOpsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiGovernanceOpsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
