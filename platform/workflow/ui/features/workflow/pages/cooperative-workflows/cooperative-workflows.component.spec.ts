import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CooperativeWorkflowsComponent } from './cooperative-workflows.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CooperativeWorkflowsComponent', () => {
  let component: CooperativeWorkflowsComponent;
  let fixture: ComponentFixture<CooperativeWorkflowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CooperativeWorkflowsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CooperativeWorkflowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
