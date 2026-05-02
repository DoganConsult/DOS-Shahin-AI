import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntityWorkflowPanelComponent } from './entity-workflow-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EntityWorkflowPanelComponent', () => {
  let component: EntityWorkflowPanelComponent;
  let fixture: ComponentFixture<EntityWorkflowPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityWorkflowPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EntityWorkflowPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
