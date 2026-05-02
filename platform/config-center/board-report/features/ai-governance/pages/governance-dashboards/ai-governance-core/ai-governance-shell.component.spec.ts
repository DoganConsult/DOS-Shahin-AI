import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceShellComponent } from './ai-governance-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiGovernanceShellComponent', () => {
  let component: AiGovernanceShellComponent;
  let fixture: ComponentFixture<AiGovernanceShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiGovernanceShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiGovernanceShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
