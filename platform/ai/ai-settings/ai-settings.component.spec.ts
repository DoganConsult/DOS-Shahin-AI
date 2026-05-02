import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSettingsComponent } from './ai-settings.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSettingsComponent', () => {
  let component: AiSettingsComponent;
  let fixture: ComponentFixture<AiSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSettingsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
