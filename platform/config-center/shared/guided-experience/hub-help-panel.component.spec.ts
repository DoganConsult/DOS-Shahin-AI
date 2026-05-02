import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HubHelpPanelComponent } from './hub-help-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('HubHelpPanelComponent', () => {
  let component: HubHelpPanelComponent;
  let fixture: ComponentFixture<HubHelpPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubHelpPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(HubHelpPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
