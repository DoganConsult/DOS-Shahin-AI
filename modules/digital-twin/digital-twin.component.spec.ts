import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DigitalTwinComponent } from './digital-twin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DigitalTwinComponent', () => {
  let component: DigitalTwinComponent;
  let fixture: ComponentFixture<DigitalTwinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DigitalTwinComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DigitalTwinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
