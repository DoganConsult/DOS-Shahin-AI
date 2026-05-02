import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataStartModeComponent } from './data-start-mode.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DataStartModeComponent', () => {
  let component: DataStartModeComponent;
  let fixture: ComponentFixture<DataStartModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataStartModeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DataStartModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
