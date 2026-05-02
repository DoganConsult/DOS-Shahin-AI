import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlTestingDonutComponent } from './control-testing-donut.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlTestingDonutComponent', () => {
  let component: ControlTestingDonutComponent;
  let fixture: ComponentFixture<ControlTestingDonutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlTestingDonutComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlTestingDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
