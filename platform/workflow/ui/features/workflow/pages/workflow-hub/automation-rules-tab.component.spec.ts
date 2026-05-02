import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutomationRulesTabComponent } from './automation-rules-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutomationRulesTabComponent', () => {
  let component: AutomationRulesTabComponent;
  let fixture: ComponentFixture<AutomationRulesTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomationRulesTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutomationRulesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
