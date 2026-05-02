import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraTestResultsComponent } from './dora-test-results.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraTestResultsComponent', () => {
  let component: DoraTestResultsComponent;
  let fixture: ComponentFixture<DoraTestResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraTestResultsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraTestResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
