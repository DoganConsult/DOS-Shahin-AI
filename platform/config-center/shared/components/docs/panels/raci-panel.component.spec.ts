import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RaciPanelComponent } from './raci-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RaciPanelComponent', () => {
  let component: RaciPanelComponent;
  let fixture: ComponentFixture<RaciPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaciPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RaciPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
