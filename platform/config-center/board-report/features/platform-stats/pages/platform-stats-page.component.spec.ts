import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformStatsPageComponent } from './platform-stats-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PlatformStatsPageComponent', () => {
  let component: PlatformStatsPageComponent;
  let fixture: ComponentFixture<PlatformStatsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformStatsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PlatformStatsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
