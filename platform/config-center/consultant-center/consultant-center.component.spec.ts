import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConsultantCenterComponent } from './consultant-center.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConsultantCenterComponent', () => {
  let component: ConsultantCenterComponent;
  let fixture: ComponentFixture<ConsultantCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultantCenterComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConsultantCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
