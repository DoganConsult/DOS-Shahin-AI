import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodConflictsTableComponent } from './sod-conflicts-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SodConflictsTableComponent', () => {
  let component: SodConflictsTableComponent;
  let fixture: ComponentFixture<SodConflictsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SodConflictsTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SodConflictsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
