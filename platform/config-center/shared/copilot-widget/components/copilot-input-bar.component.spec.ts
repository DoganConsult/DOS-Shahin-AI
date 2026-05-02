import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotInputBarComponent } from './copilot-input-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotInputBarComponent', () => {
  let component: CopilotInputBarComponent;
  let fixture: ComponentFixture<CopilotInputBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotInputBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotInputBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
