import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TornadoSensitivityComponent } from './tornado-sensitivity.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TornadoSensitivityComponent', () => {
  let component: TornadoSensitivityComponent;
  let fixture: ComponentFixture<TornadoSensitivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TornadoSensitivityComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TornadoSensitivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
