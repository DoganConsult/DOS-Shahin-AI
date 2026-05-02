import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotWidgetComponent } from './copilot-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotWidgetComponent', () => {
  let component: CopilotWidgetComponent;
  let fixture: ComponentFixture<CopilotWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
