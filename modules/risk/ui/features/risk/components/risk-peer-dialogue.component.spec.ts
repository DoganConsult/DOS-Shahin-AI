import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskPeerDialogueComponent } from './risk-peer-dialogue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RiskPeerDialogueComponent', () => {
  let component: RiskPeerDialogueComponent;
  let fixture: ComponentFixture<RiskPeerDialogueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskPeerDialogueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RiskPeerDialogueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
