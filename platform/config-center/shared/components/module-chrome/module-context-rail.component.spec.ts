import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleContextRailComponent } from './module-context-rail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleContextRailComponent', () => {
  let component: ModuleContextRailComponent;
  let fixture: ComponentFixture<ModuleContextRailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleContextRailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleContextRailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
