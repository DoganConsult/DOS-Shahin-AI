import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlMappingTabComponent } from './control-mapping-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlMappingTabComponent', () => {
  let component: ControlMappingTabComponent;
  let fixture: ComponentFixture<ControlMappingTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlMappingTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlMappingTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
