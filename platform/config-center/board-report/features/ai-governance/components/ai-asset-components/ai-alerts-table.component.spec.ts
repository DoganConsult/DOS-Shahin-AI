import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAlertsTableComponent } from './ai-alerts-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAlertsTableComponent', () => {
  let component: AiAlertsTableComponent;
  let fixture: ComponentFixture<AiAlertsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAlertsTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAlertsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
