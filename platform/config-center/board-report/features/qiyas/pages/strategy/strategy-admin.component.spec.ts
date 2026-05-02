import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StrategyAdminComponent } from './strategy-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StrategyAdminComponent', () => {
  let component: StrategyAdminComponent;
  let fixture: ComponentFixture<StrategyAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StrategyAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
