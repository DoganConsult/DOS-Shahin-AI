import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowChainsTabComponent } from './workflow-chains-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WorkflowChainsTabComponent', () => {
  let component: WorkflowChainsTabComponent;
  let fixture: ComponentFixture<WorkflowChainsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowChainsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WorkflowChainsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
