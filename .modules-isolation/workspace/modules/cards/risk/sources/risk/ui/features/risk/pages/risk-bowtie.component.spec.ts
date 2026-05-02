import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskBowtieComponent } from './risk-bowtie.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskBowtieComponent', () => {
  let component: RiskBowtieComponent;
  let fixture: ComponentFixture<RiskBowtieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskBowtieComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskBowtieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
