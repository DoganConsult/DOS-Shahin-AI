import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditWorkingPapersComponent } from './audit-working-papers.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditWorkingPapersComponent', () => {
  let component: AuditWorkingPapersComponent;
  let fixture: ComponentFixture<AuditWorkingPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditWorkingPapersComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditWorkingPapersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
