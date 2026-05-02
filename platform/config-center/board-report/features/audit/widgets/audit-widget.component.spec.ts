import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditWidgetComponent } from './audit-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditWidgetComponent', () => {
  let component: AuditWidgetComponent;
  let fixture: ComponentFixture<AuditWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
