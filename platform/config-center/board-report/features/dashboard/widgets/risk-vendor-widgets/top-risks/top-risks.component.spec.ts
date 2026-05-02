import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TopRisksComponent } from './top-risks.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TopRisksComponent', () => {
  let component: TopRisksComponent;
  let fixture: ComponentFixture<TopRisksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopRisksComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TopRisksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
