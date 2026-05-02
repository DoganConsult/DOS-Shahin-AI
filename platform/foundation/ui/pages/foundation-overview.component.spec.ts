import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOverviewComponent } from './foundation-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOverviewComponent', () => {
  let component: FoundationOverviewComponent;
  let fixture: ComponentFixture<FoundationOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
