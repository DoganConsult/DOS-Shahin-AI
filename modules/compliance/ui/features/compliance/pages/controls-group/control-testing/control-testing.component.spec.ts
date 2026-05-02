import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlTestingComponent } from './control-testing.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlTestingComponent', () => {
  let component: ControlTestingComponent;
  let fixture: ComponentFixture<ControlTestingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlTestingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlTestingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
