import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuantumMigrationPlansComponent } from './quantum-migration-plans.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuantumMigrationPlansComponent', () => {
  let component: QuantumMigrationPlansComponent;
  let fixture: ComponentFixture<QuantumMigrationPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuantumMigrationPlansComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuantumMigrationPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
