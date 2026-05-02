import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PriorityIssuesPanelComponent } from './priority-issues-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PriorityIssuesPanelComponent', () => {
  let component: PriorityIssuesPanelComponent;
  let fixture: ComponentFixture<PriorityIssuesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityIssuesPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PriorityIssuesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
