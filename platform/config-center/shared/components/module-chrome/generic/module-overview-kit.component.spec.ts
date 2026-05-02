import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleOverviewKitComponent } from './module-overview-kit.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleOverviewKitComponent', () => {
  let component: ModuleOverviewKitComponent;
  let fixture: ComponentFixture<ModuleOverviewKitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleOverviewKitComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleOverviewKitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
