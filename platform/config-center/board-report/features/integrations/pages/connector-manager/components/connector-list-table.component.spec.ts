import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectorListTableComponent } from './connector-list-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConnectorListTableComponent', () => {
  let component: ConnectorListTableComponent;
  let fixture: ComponentFixture<ConnectorListTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectorListTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConnectorListTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
