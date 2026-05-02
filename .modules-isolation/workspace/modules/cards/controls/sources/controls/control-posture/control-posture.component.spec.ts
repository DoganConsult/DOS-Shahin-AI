import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlPostureComponent } from './control-posture.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlPostureComponent', () => {
  let component: ControlPostureComponent;
  let fixture: ComponentFixture<ControlPostureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlPostureComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlPostureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
