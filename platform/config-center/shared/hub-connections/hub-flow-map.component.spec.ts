import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HubFlowMapComponent } from './hub-flow-map.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('HubFlowMapComponent', () => {
  let component: HubFlowMapComponent;
  let fixture: ComponentFixture<HubFlowMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubFlowMapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(HubFlowMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
