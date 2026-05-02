import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlCoverageSankeyComponent } from './control-coverage-sankey.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlCoverageSankeyComponent', () => {
  let component: ControlCoverageSankeyComponent;
  let fixture: ComponentFixture<ControlCoverageSankeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlCoverageSankeyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlCoverageSankeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
