import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivationMilestonesComponent } from './activation-milestones.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ActivationMilestonesComponent', () => {
  let component: ActivationMilestonesComponent;
  let fixture: ComponentFixture<ActivationMilestonesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivationMilestonesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ActivationMilestonesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
