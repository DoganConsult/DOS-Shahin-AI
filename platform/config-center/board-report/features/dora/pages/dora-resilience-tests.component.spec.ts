import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraResilienceTestsComponent } from './dora-resilience-tests.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraResilienceTestsComponent', () => {
  let component: DoraResilienceTestsComponent;
  let fixture: ComponentFixture<DoraResilienceTestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraResilienceTestsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraResilienceTestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
