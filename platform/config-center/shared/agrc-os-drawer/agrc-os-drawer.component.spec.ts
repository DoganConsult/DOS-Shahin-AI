import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgrcOsDrawerComponent } from './agrc-os-drawer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AgrcOsDrawerComponent', () => {
  let component: AgrcOsDrawerComponent;
  let fixture: ComponentFixture<AgrcOsDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgrcOsDrawerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AgrcOsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
