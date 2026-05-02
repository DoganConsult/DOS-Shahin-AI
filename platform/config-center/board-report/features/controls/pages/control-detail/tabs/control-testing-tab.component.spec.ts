import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlTestingTabComponent } from './control-testing-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlTestingTabComponent', () => {
  let component: ControlTestingTabComponent;
  let fixture: ComponentFixture<ControlTestingTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlTestingTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlTestingTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
