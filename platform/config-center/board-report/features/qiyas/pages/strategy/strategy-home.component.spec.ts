import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StrategyHomeComponent } from './strategy-home.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StrategyHomeComponent', () => {
  let component: StrategyHomeComponent;
  let fixture: ComponentFixture<StrategyHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyHomeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StrategyHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
