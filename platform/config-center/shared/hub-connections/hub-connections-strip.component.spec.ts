import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HubConnectionsStripComponent } from './hub-connections-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('HubConnectionsStripComponent', () => {
  let component: HubConnectionsStripComponent;
  let fixture: ComponentFixture<HubConnectionsStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubConnectionsStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(HubConnectionsStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
