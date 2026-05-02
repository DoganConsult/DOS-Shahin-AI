import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentSandboxComponent } from './agent-sandbox.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgentSandboxComponent', () => {
  let component: AgentSandboxComponent;
  let fixture: ComponentFixture<AgentSandboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentSandboxComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgentSandboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
