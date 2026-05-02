import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleWorkflowRibbonComponent } from './module-workflow-ribbon.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleWorkflowRibbonComponent', () => {
  let component: ModuleWorkflowRibbonComponent;
  let fixture: ComponentFixture<ModuleWorkflowRibbonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleWorkflowRibbonComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleWorkflowRibbonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
