import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TaxonomyComponent } from './taxonomy.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TaxonomyComponent', () => {
  let component: TaxonomyComponent;
  let fixture: ComponentFixture<TaxonomyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxonomyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TaxonomyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
