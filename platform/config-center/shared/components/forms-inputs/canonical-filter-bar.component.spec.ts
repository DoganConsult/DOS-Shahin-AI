import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CanonicalFilterBarComponent } from './canonical-filter-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CanonicalFilterBarComponent', () => {
  let component: CanonicalFilterBarComponent;
  let fixture: ComponentFixture<CanonicalFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanonicalFilterBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CanonicalFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
