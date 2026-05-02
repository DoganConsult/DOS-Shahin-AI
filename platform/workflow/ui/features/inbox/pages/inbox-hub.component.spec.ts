import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InboxHubComponent } from './inbox-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InboxHubComponent', () => {
  let component: InboxHubComponent;
  let fixture: ComponentFixture<InboxHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InboxHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
