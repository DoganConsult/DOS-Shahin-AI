import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRegulatoryChangesComponent } from './ai-regulatory-changes.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRegulatoryChangesComponent', () => {
  let component: AiRegulatoryChangesComponent;
  let fixture: ComponentFixture<AiRegulatoryChangesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRegulatoryChangesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRegulatoryChangesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
