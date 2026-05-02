import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobileTabBarComponent } from './mobile-tab-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MobileTabBarComponent', () => {
  let component: MobileTabBarComponent;
  let fixture: ComponentFixture<MobileTabBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileTabBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MobileTabBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
