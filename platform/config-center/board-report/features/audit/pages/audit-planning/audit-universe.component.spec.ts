import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditUniverseComponent } from './audit-universe.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditUniverseComponent', () => {
  let component: AuditUniverseComponent;
  let fixture: ComponentFixture<AuditUniverseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditUniverseComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditUniverseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
