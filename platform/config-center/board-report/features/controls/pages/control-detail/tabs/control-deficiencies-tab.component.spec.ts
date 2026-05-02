import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlDeficienciesTabComponent } from './control-deficiencies-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlDeficienciesTabComponent', () => {
  let component: ControlDeficienciesTabComponent;
  let fixture: ComponentFixture<ControlDeficienciesTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlDeficienciesTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlDeficienciesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
