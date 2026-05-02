import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MaturitySpiderComponent } from './maturity-spider.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MaturitySpiderComponent', () => {
  let component: MaturitySpiderComponent;
  let fixture: ComponentFixture<MaturitySpiderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaturitySpiderComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MaturitySpiderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
