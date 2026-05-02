import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditRegulatoryComponent } from './audit-regulatory.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditRegulatoryComponent', () => {
  let component: AuditRegulatoryComponent;
  let fixture: ComponentFixture<AuditRegulatoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditRegulatoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditRegulatoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
