import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditCapaComponent } from './audit-capa.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditCapaComponent', () => {
  let component: AuditCapaComponent;
  let fixture: ComponentFixture<AuditCapaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditCapaComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditCapaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
