import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScopeFilterBarComponent } from './scope-filter-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ScopeFilterBarComponent', () => {
  let component: ScopeFilterBarComponent;
  let fixture: ComponentFixture<ScopeFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScopeFilterBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ScopeFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
