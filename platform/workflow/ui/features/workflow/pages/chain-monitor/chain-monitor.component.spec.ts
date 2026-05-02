import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChainMonitorComponent } from './chain-monitor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ChainMonitorComponent', () => {
  let component: ChainMonitorComponent;
  let fixture: ComponentFixture<ChainMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainMonitorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ChainMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
