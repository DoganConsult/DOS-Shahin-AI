import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutonomousWorkflowComponent } from './autonomous-workflow.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutonomousWorkflowComponent', () => {
  let component: AutonomousWorkflowComponent;
  let fixture: ComponentFixture<AutonomousWorkflowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutonomousWorkflowComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutonomousWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
