import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentHubComponent } from './agent-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgentHubComponent', () => {
  let component: AgentHubComponent;
  let fixture: ComponentFixture<AgentHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgentHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
