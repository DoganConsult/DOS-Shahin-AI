import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EvidenceRequestsComponent } from './evidence-requests.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EvidenceRequestsComponent', () => {
  let component: EvidenceRequestsComponent;
  let fixture: ComponentFixture<EvidenceRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceRequestsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EvidenceRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
