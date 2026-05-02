import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotComponent } from './copilot.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotComponent', () => {
  let component: CopilotComponent;
  let fixture: ComponentFixture<CopilotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
