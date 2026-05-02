import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ShellRendererComponent } from './shell-renderer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ShellRendererComponent', () => {
  let component: ShellRendererComponent;
  let fixture: ComponentFixture<ShellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellRendererComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ShellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
