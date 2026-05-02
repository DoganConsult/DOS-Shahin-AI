import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutonomyComponent } from './autonomy.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutonomyComponent', () => {
  let component: AutonomyComponent;
  let fixture: ComponentFixture<AutonomyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutonomyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutonomyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
