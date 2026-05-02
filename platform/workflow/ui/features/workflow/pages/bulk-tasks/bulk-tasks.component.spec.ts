import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BulkTasksComponent } from './bulk-tasks.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BulkTasksComponent', () => {
  let component: BulkTasksComponent;
  let fixture: ComponentFixture<BulkTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkTasksComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BulkTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
