import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditCapaEffectivenessComponent } from './audit-capa-effectiveness.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditCapaEffectivenessComponent', () => {
  let component: AuditCapaEffectivenessComponent;
  let fixture: ComponentFixture<AuditCapaEffectivenessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditCapaEffectivenessComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditCapaEffectivenessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
