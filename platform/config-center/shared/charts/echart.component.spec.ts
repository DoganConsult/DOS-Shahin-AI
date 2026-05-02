import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EchartComponent } from './echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EchartComponent', () => {
  let component: EchartComponent;
  let fixture: ComponentFixture<EchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
