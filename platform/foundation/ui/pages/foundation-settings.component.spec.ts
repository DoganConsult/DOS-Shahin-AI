import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationSettingsComponent } from './foundation-settings.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationSettingsComponent', () => {
  let component: FoundationSettingsComponent;
  let fixture: ComponentFixture<FoundationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationSettingsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
