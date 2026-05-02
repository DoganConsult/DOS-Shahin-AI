import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordsHubComponent } from './records-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RecordsHubComponent', () => {
  let component: RecordsHubComponent;
  let fixture: ComponentFixture<RecordsHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RecordsHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
