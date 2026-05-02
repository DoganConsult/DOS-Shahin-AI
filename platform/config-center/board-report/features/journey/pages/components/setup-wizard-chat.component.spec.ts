import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SetupWizardChatComponent } from './setup-wizard-chat.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SetupWizardChatComponent', () => {
  let component: SetupWizardChatComponent;
  let fixture: ComponentFixture<SetupWizardChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupWizardChatComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SetupWizardChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
