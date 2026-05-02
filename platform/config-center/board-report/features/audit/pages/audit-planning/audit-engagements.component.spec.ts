import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditEngagementsComponent } from './audit-engagements.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditEngagementsComponent', () => {
  let component: AuditEngagementsComponent;
  let fixture: ComponentFixture<AuditEngagementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditEngagementsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditEngagementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
