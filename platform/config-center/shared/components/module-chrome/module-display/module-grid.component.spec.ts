import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleGridComponent } from './module-grid.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleGridComponent', () => {
  let component: ModuleGridComponent;
  let fixture: ComponentFixture<ModuleGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleGridComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
