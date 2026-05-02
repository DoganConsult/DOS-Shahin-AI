import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecentActivityTableComponent } from './recent-activity-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RecentActivityTableComponent', () => {
  let component: RecentActivityTableComponent;
  let fixture: ComponentFixture<RecentActivityTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentActivityTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RecentActivityTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
