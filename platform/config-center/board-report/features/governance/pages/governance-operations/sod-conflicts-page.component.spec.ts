import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodConflictsPageComponent } from './sod-conflicts-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SodConflictsPageComponent', () => {
  let component: SodConflictsPageComponent;
  let fixture: ComponentFixture<SodConflictsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SodConflictsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SodConflictsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
