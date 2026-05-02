import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileSettingsComponent } from './mobile-settings.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MobileSettingsComponent', () => {
  let component: MobileSettingsComponent;
  let fixture: ComponentFixture<MobileSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileSettingsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MobileSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
