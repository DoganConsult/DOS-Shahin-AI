import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraOverviewComponent } from './dora-overview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraOverviewComponent', () => {
  let component: DoraOverviewComponent;
  let fixture: ComponentFixture<DoraOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraOverviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
