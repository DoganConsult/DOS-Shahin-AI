import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationAuditComponent } from './foundation-audit.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationAuditComponent', () => {
  let component: FoundationAuditComponent;
  let fixture: ComponentFixture<FoundationAuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationAuditComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
