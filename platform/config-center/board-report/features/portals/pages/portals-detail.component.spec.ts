import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalsDetailComponent } from './portals-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PortalsDetailComponent', () => {
  let component: PortalsDetailComponent;
  let fixture: ComponentFixture<PortalsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalsDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PortalsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
