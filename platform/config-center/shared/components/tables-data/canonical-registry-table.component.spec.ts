import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CanonicalRegistryTableComponent } from './canonical-registry-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CanonicalRegistryTableComponent', () => {
  let component: CanonicalRegistryTableComponent;
  let fixture: ComponentFixture<CanonicalRegistryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanonicalRegistryTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CanonicalRegistryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
