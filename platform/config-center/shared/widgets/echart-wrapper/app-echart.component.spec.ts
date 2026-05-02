import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppEchartComponent } from './app-echart.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AppEchartComponent', () => {
  let component: AppEchartComponent;
  let fixture: ComponentFixture<AppEchartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppEchartComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AppEchartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
