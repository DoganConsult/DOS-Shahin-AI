import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrustBadgeComponent } from './trust-badge.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrustBadgeComponent', () => {
  let component: TrustBadgeComponent;
  let fixture: ComponentFixture<TrustBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustBadgeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrustBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
