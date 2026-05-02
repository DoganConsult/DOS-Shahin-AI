import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsMappingComponent } from './controls-mapping.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsMappingComponent', () => {
  let component: ControlsMappingComponent;
  let fixture: ComponentFixture<ControlsMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsMappingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
