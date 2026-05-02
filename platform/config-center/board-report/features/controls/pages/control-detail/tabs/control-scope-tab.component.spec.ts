import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlScopeTabComponent } from './control-scope-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlScopeTabComponent', () => {
  let component: ControlScopeTabComponent;
  let fixture: ComponentFixture<ControlScopeTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlScopeTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlScopeTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
