import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotActionCardComponent } from './copilot-action-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotActionCardComponent', () => {
  let component: CopilotActionCardComponent;
  let fixture: ComponentFixture<CopilotActionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotActionCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotActionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
