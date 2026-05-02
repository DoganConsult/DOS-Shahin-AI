import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordsAdminComponent } from './records-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RecordsAdminComponent', () => {
  let component: RecordsAdminComponent;
  let fixture: ComponentFixture<RecordsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RecordsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
