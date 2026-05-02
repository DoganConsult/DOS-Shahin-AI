import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlEffectivenessBoxplotComponent } from './control-effectiveness-boxplot.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlEffectivenessBoxplotComponent', () => {
  let component: ControlEffectivenessBoxplotComponent;
  let fixture: ComponentFixture<ControlEffectivenessBoxplotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlEffectivenessBoxplotComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlEffectivenessBoxplotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
