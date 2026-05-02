import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RcsaCampaignsComponent } from './rcsa-campaigns.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RcsaCampaignsComponent', () => {
  let component: RcsaCampaignsComponent;
  let fixture: ComponentFixture<RcsaCampaignsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RcsaCampaignsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RcsaCampaignsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
