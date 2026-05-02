import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiOptOutSettingsComponent } from './ai-opt-out-settings.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiOptOutSettingsComponent', () => {
  let component: AiOptOutSettingsComponent;
  let fixture: ComponentFixture<AiOptOutSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiOptOutSettingsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiOptOutSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
