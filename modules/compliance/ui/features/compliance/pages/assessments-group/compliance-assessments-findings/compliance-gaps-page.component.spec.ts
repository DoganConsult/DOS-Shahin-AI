import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceGapsPageComponent } from './compliance-gaps-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ComplianceGapsPageComponent', () => {
  let component: ComplianceGapsPageComponent;
  let fixture: ComponentFixture<ComplianceGapsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceGapsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ComplianceGapsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
