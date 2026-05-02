import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulatoryDeltaImpactTableComponent } from './regulatory-delta-impact-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegulatoryDeltaImpactTableComponent', () => {
  let component: RegulatoryDeltaImpactTableComponent;
  let fixture: ComponentFixture<RegulatoryDeltaImpactTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegulatoryDeltaImpactTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegulatoryDeltaImpactTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
