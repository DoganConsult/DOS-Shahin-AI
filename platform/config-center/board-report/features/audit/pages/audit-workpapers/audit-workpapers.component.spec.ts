import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditWorkpapersComponent } from './audit-workpapers.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditWorkpapersComponent', () => {
  let component: AuditWorkpapersComponent;
  let fixture: ComponentFixture<AuditWorkpapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditWorkpapersComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditWorkpapersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
