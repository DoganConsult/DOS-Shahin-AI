import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraThreatIntelComponent } from './dora-threat-intel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraThreatIntelComponent', () => {
  let component: DoraThreatIntelComponent;
  let fixture: ComponentFixture<DoraThreatIntelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraThreatIntelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraThreatIntelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
