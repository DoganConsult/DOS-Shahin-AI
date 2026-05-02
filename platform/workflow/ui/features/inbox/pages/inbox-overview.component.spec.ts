import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InboxOverviewComponent } from './inbox-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InboxOverviewComponent', () => {
  let component: InboxOverviewComponent;
  let fixture: ComponentFixture<InboxOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InboxOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
