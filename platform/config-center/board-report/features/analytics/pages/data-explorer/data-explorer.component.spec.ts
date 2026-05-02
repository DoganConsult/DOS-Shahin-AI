import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataExplorerComponent } from './data-explorer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DataExplorerComponent', () => {
  let component: DataExplorerComponent;
  let fixture: ComponentFixture<DataExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataExplorerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DataExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
