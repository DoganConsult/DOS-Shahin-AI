import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsHomeComponent } from './controls-home.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsHomeComponent', () => {
  let component: ControlsHomeComponent;
  let fixture: ComponentFixture<ControlsHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsHomeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
