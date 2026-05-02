import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InterventionDialogComponent } from './intervention-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InterventionDialogComponent', () => {
  let component: InterventionDialogComponent;
  let fixture: ComponentFixture<InterventionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterventionDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InterventionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
