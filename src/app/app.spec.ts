import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from './core/services/analytics/analytics.service';
import { AppUpdateService } from './core/services/app-update/app-update.service';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AppNoticesComponent } from './shared/components/app-notices/app-notices.component';

@Component({ selector: 'app-bottom-nav', template: '' })
class NavStub {}
@Component({ selector: 'app-notices', template: '' })
class NoticesStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: AnalyticsService, useValue: { initialize: jasmine.createSpy('analyticsInitialize') } },
        { provide: AppUpdateService, useValue: { initialize: jasmine.createSpy('updateInitialize') } }
      ]
    }).overrideComponent(App, {
      remove: { imports: [BottomNavComponent, AppNoticesComponent] },
      add: { imports: [NavStub, NoticesStub] }
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the application shell and initializes the optional services', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-bottom-nav')).not.toBeNull();
    expect(compiled.querySelector('app-notices')).not.toBeNull();
    expect(TestBed.inject(AnalyticsService).initialize).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(AppUpdateService).initialize).toHaveBeenCalledTimes(1);
  });
});
