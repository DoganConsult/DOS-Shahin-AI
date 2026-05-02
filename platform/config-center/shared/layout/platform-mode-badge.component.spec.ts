import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformModeBadgeComponent } from './platform-mode-badge.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PlatformModeBadgeComponent', () => {
  let component: PlatformModeBadgeComponent;
  let fixture: ComponentFixture<PlatformModeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformModeBadgeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PlatformModeBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
