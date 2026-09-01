import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GA4_SETTINGS, Ga4Transport } from './ga4-transport.service';

describe('Ga4Transport', () => {
  it('loads one script after enable, configures privacy and stops on disable', () => {
    const win: Record<string, any> = {};
    const script: Record<string, unknown> = {};
    const append = jasmine.createSpy('append');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: DOCUMENT, useValue: { defaultView: win, createElement: () => script, head: { appendChild: append } } },
      { provide: GA4_SETTINGS, useValue: { enabled: true, measurementId: 'G-TEST' } }
    ] });
    const transport = TestBed.inject(Ga4Transport);
    expect(append).not.toHaveBeenCalled();
    transport.enable({ page_location: 'https://www.zisify.com/home' });
    transport.enable({}); expect(append).toHaveBeenCalledTimes(1);
    const commands = win['dataLayer'].map((args: IArguments) => Array.from(args));
    expect(commands.find((args: unknown[]) => args[0] === 'config')[2]).toEqual(jasmine.objectContaining({
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false
    }));
    transport.disable(); expect(win['ga-disable-G-TEST']).toBeTrue();
  });
});
