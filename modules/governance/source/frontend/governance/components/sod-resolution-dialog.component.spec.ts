import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodResolutionDialogComponent } from './sod-resolution-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SodResolutionDialogComponent', () => {
  let component: SodResolutionDialogComponent;
  let fixture: ComponentFixture<SodResolutionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SodResolutionDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SodResolutionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
