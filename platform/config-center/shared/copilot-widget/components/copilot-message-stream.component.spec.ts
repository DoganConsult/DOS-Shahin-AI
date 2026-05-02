import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotMessageStreamComponent } from './copilot-message-stream.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotMessageStreamComponent', () => {
  let component: CopilotMessageStreamComponent;
  let fixture: ComponentFixture<CopilotMessageStreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotMessageStreamComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotMessageStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
