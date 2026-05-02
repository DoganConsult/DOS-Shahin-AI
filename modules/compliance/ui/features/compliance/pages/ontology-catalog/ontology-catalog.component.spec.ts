import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OntologyCatalogComponent } from './ontology-catalog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OntologyCatalogComponent', () => {
  let component: OntologyCatalogComponent;
  let fixture: ComponentFixture<OntologyCatalogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OntologyCatalogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OntologyCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
