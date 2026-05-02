import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LayoutGridComponent } from './layout-grid.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LayoutGridComponent', () => {
  let component: LayoutGridComponent;
  let fixture: ComponentFixture<LayoutGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutGridComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LayoutGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
