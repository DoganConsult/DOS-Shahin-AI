import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotChannelsComponent } from './copilot-channels.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotChannelsComponent', () => {
  let component: CopilotChannelsComponent;
  let fixture: ComponentFixture<CopilotChannelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotChannelsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotChannelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
