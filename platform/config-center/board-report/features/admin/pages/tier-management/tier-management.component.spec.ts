import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TierManagementComponent } from './tier-management.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TierManagementComponent', () => {
  let component: TierManagementComponent;
  let fixture: ComponentFixture<TierManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TierManagementComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TierManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
