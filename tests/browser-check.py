from pathlib import Path
import base64
import json
import re
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html_source = (ROOT / 'index.html').read_text(encoding='utf-8')
css_source = (ROOT / 'styles.css').read_text(encoding='utf-8')
layout_css_source = (ROOT / 'layout-fix.css').read_text(encoding='utf-8')
js_source = (ROOT / 'app.js').read_text(encoding='utf-8')
performer_motion_source = (ROOT / 'performer-motion.js').read_text(encoding='utf-8')
performer_settings_source = (ROOT / 'performer-settings.js').read_text(encoding='utf-8')
scroll_scenes_source = (ROOT / 'scroll-scenes.js').read_text(encoding='utf-8')


def data_uri(path, mime='image/webp'):
    encoded = base64.b64encode(path.read_bytes()).decode('ascii')
    return f'data:{mime};base64,{encoded}'


for asset in (ROOT / 'assets' / 'sections').glob('*.webp'):
    html_source = html_source.replace(f'/assets/sections/{asset.name}', data_uri(asset))
dance_assets = {
    'monje-left-dance.webp': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-left-dance.webp'),
    'monje-left-poster.webp': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-left-poster.webp'),
    'monje-left-dance.gif': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-left-dance.gif', 'image/gif'),
    'monje-right-dance.webp': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-right-dance.webp'),
    'monje-right-poster.webp': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-right-poster.webp'),
    'monje-right-dance.gif': data_uri(ROOT / 'assets' / 'monks' / 'dance' / 'monje-right-dance.gif', 'image/gif'),
}
for name, uri in dance_assets.items():
    html_source = html_source.replace(f'/assets/monks/dance/{name}', uri)
og_uri = data_uri(ROOT / 'assets' / 'images' / 'monjes-frame.webp')
html_source = html_source.replace('/assets/images/monjes-frame.webp', og_uri)

html_source = html_source.replace('  <link rel="stylesheet" href="/styles.css">', '')
html_source = html_source.replace('  <link rel="stylesheet" href="/layout-fix.css">', '')
html_source = html_source.replace('  <script src="/app.js" defer></script>', '')
html_source = html_source.replace('  <script src="/performer-motion.js" defer></script>', '')
html_source = html_source.replace('  <script src="/performer-settings.js" defer></script>', '')
html_source = re.sub(r'^\s*<link rel="preconnect"[^>]*>\s*$', '', html_source, flags=re.MULTILINE)
html_source = re.sub(r'^\s*<link href="https://fonts\.googleapis\.com[^\n]+\n', '', html_source, flags=re.MULTILINE)
html_source = re.sub(r'^\s*<link rel="preload"[^>]*>\s*$', '', html_source, flags=re.MULTILINE)
html_source = re.sub(r'^\s*<link rel="icon"[^>]*>\s*$', '', html_source, flags=re.MULTILINE)

results = []
print('browser-check: starting Chromium regression suite', flush=True)
with sync_playwright() as p:
    chromium_path = shutil.which('chromium') or shutil.which('chromium-browser')
    launch_options = {'headless': True, 'args': ['--no-sandbox']}
    if chromium_path:
        launch_options['executable_path'] = chromium_path
    browser = p.chromium.launch(**launch_options)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html_source, wait_until='load', timeout=60000)
    page.add_style_tag(content=css_source + '\n' + layout_css_source)
    page.add_script_tag(content=scroll_scenes_source)
    page.add_script_tag(content=performer_motion_source)
    page.add_script_tag(content=performer_settings_source)
    page.add_script_tag(content=js_source)
    page.wait_for_timeout(200)

    for width, height in [(2048, 1134), (1440, 900), (1024, 768), (823, 523), (768, 900), (568, 320), (390, 844), (320, 740), (844, 390)]:
        print(f'browser-check: viewport {width}x{height}', flush=True)
        page.set_viewport_size({'width': width, 'height': height})
        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(100)
        reveal_items = page.locator('[data-reveal]')
        reveal_count = reveal_items.count()
        for i in range(reveal_count):
            item = reveal_items.nth(i)
            item.scroll_into_view_if_needed()
            page.wait_for_timeout(360)
            assert 'is-visible' in (item.get_attribute('class') or ''), f'reveal {i} failed at {width}px'

        page.wait_for_function(
            """() => {
              const imgs = [...document.querySelectorAll('.scene-media img, .format-card__media img')];
              return imgs.length === 8 && imgs.every(img => img.complete && img.naturalWidth > 0);
            }""",
            timeout=12000,
        )
        # Verify the rendered scroll-driven transform, not a potentially stale
        # animation.currentTime snapshot. Force instant scrolling and wait for the
        # actual scroll position before reading the computed style.
        page.evaluate("""() => {
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, 0);
        }""")
        page.wait_for_function("window.scrollY === 0", timeout=2000)
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        native_timeline_supported = page.evaluate("CSS.supports('view-timeline-name: --scene-view') && CSS.supports('animation-timeline: --scene-view') && CSS.supports('animation-range: entry 0% exit 100%')")
        timeline_start = page.evaluate("""() => {
          const image = document.querySelector('#inicio .scene-media img');
          const animation = [...image.getAnimations()].find(item =>
            String(item.animationName || '').startsWith('scene-scroll-depth')
          );
          return {
            transform: getComputedStyle(image).transform,
            animationName: animation ? animation.animationName : null,
            progress: animation ? animation.effect.getComputedTiming().progress : null
          };
        }""")
        max_scroll = page.evaluate("Math.max(0, document.documentElement.scrollHeight - window.innerHeight)")
        target_scroll = min(420, max_scroll)
        assert target_scroll > 0, {'maxScroll': max_scroll, 'width': width}
        page.evaluate("(target) => window.scrollTo(0, target)", target_scroll)
        page.wait_for_function(f"Math.abs(window.scrollY - {target_scroll}) < 2", timeout=2500)
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        timeline_later = page.evaluate("""() => {
          const image = document.querySelector('#inicio .scene-media img');
          const animation = [...image.getAnimations()].find(item =>
            String(item.animationName || '').startsWith('scene-scroll-depth')
          );
          return {
            transform: getComputedStyle(image).transform,
            animationName: animation ? animation.animationName : null,
            progress: animation ? animation.effect.getComputedTiming().progress : null
          };
        }""")
        if native_timeline_supported:
            assert (
                timeline_start['animationName'] is not None
                and timeline_later['animationName'] is not None
                and timeline_start['transform'] != timeline_later['transform']
            ), {
                'timelineStart': timeline_start,
                'timelineLater': timeline_later,
                'scrollY': page.evaluate('window.scrollY'),
                'targetScroll': target_scroll,
                'width': width,
            }
        else:
            assert page.evaluate("document.documentElement.classList.contains('no-scroll-timeline') && document.querySelector('#inicio').classList.contains('scene-in-view')"), 'IntersectionObserver fallback did not activate'

        theme_checks = []
        scene_targets = [
            ('#inicio', 'hero'),
            ('#manifiesto', 'manifesto'),
            ('#ritual', 'ritual'),
            ('#formatos', 'formats'),
            ('main > [data-scene=\"sound\"]', 'sound'),
            ('#booking', 'booking'),
        ]
        for selector, expected_scene in scene_targets:
            page.evaluate("""(selector) => {
              const element = document.querySelector(selector);
              const rect = element.getBoundingClientRect();
              const target = window.scrollY + rect.top + (rect.height / 2) - (window.innerHeight * 0.48);
              window.scrollTo({ top: target, behavior: 'instant' });
            }""", selector)
            page.wait_for_timeout(80)
            page.wait_for_function("expected => document.documentElement.dataset.activeScene === expected", arg=expected_scene, timeout=1500)
            theme = page.evaluate("""() => ({
              active: document.documentElement.dataset.activeScene,
              primary: getComputedStyle(document.documentElement).getPropertyValue('--ambient-primary').trim(),
              secondary: getComputedStyle(document.documentElement).getPropertyValue('--ambient-secondary').trim(),
              support: document.documentElement.classList.contains('has-scroll-timeline'),
              fallback: document.documentElement.classList.contains('no-scroll-timeline')
            })""")
            assert theme['active'] == expected_scene, {'expected': expected_scene, 'theme': theme, 'width': width}
            assert theme['primary'].startswith('#') and len(theme['primary']) == 7, theme
            assert theme['secondary'].startswith('#') and len(theme['secondary']) == 7, theme
            assert theme['support'] != theme['fallback'], theme
            theme_checks.append({'scene': expected_scene, 'primary': theme['primary'], 'secondary': theme['secondary']})
            if width == 1440:
                page.screenshot(
                    path=str(ROOT / 'docs' / f'phase3-ambient-{expected_scene}.jpg'),
                    type='jpeg', quality=88, full_page=False, timeout=30000
                )

        # The midpoint between Hero and Manifiesto must contain an interpolated color.
        midpoint = page.evaluate("""() => {
          const a = document.querySelector('#inicio').getBoundingClientRect();
          const b = document.querySelector('#manifiesto').getBoundingClientRect();
          const centerA = window.scrollY + a.top + a.height / 2;
          const centerB = window.scrollY + b.top + b.height / 2;
          window.scrollTo({ top: ((centerA + centerB) / 2) - (window.innerHeight * .48), behavior: 'instant' });
          return true;
        }""")
        page.wait_for_timeout(80)
        midpoint_color = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ambient-primary').trim()")
        assert midpoint_color not in ('#6e42d8', '#633b83'), {'midpoint': midpoint_color, 'width': width}
        hero_timeline_progress = page.evaluate("""() => {
          const image = document.querySelector('#inicio .scene-media img');
          const animation = image.getAnimations()[0];
          return animation && animation.currentTime ? animation.currentTime.value : null;
        }""")
        assert hero_timeline_progress is not None, {'timelineProgress': hero_timeline_progress, 'width': width}
        data = page.evaluate(
            """() => {
              const images = [...document.querySelectorAll('.scene-media img, .format-card__media img')];
              return {
                title: document.title,
                width: innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                bodyScrollWidth: document.body.scrollWidth,
                heroHeight: Math.round(document.querySelector('.hero').getBoundingClientRect().height),
                framePosition: getComputedStyle(document.querySelector('.performers')).position,
                frameOpacity: getComputedStyle(document.querySelector('.performers')).opacity,
                performerImagesAreDataUri: [...document.querySelectorAll('.performer__image')].length === 2 && [...document.querySelectorAll('.performer__image')].every(img => img.getAttribute('src').startsWith('data:image/') && img.complete && img.naturalWidth > 0),
                performerStates: window.MonjesPerformers ? window.MonjesPerformers.getSnapshot() : null,
                performerImages: [...document.querySelectorAll('.performer__image')].map(img => ({ width: img.naturalWidth, height: img.naturalHeight })),
                desktopNavVisible: getComputedStyle(document.querySelector('.desktop-nav')).display !== 'none',
                menuButtonVisible: getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none',
                revealCount: document.querySelectorAll('[data-reveal].is-visible').length,
                images: images.map(img => ({
                    width: img.naturalWidth,
                  height: img.naturalHeight,
                  loading: img.loading
                }))
              };
            }"""
        )
        data['themeChecks'] = theme_checks
        data['midpointColor'] = midpoint_color
        data['heroTimelineProgress'] = hero_timeline_progress
        data['nativeTimelineSupported'] = native_timeline_supported
        data['timelineStart'] = timeline_start
        data['timelineLater'] = timeline_later
        data['errors'] = errors[:]
        results.append(data)
        assert data['scrollWidth'] <= width, data
        assert data['bodyScrollWidth'] <= width, data
        layout_geometry = page.evaluate("""() => {
          const box = (selector) => {
            const element = document.querySelector(selector);
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
          };
          const sectionMetric = (sectionSelector, contentSelector) => {
            const section = document.querySelector(sectionSelector);
            const content = section.querySelector(contentSelector);
            const rect = section.getBoundingClientRect();
            const style = getComputedStyle(section);
            const px = (name) => parseFloat(style[name]) || 0;
            const requiredHeight = content.offsetHeight
              + px('paddingTop') + px('paddingBottom')
              + px('borderTopWidth') + px('borderBottomWidth');
            return {
              x: rect.x,
              width: rect.width,
              height: rect.height,
              viewportHeight: innerHeight,
              contentHeight: content.offsetHeight,
              requiredHeight,
              expectedHeight: Math.max(innerHeight, requiredHeight),
              clientHeight: section.clientHeight,
              scrollHeight: section.scrollHeight,
              verticalOverflow: section.scrollHeight - section.clientHeight
            };
          };
          return {
            viewport: window.innerWidth,
            viewportHeight: window.innerHeight,
            main: box('.page-shell'),
            hero: box('#inicio'),
            manifesto: box('#manifiesto'),
            ritual: box('#ritual'),
            formats: box('#formatos'),
            sound: box('.sound'),
            soundPanel: box('.sound-panel'),
            booking: box('#booking'),
            manifestoContent: box('#manifiesto .section-inner'),
            ritualContent: box('#ritual .section-inner'),
            formatsContent: box('#formatos .section-inner'),
            bookingContent: box('#booking .section-inner'),
            soundContent: box('.sound-panel__inner'),
            sectionHeights: {
              hero: sectionMetric('#inicio', '.hero-inner'),
              manifesto: sectionMetric('#manifiesto', '.section-inner'),
              ritual: sectionMetric('#ritual', '.section-inner'),
              formats: sectionMetric('#formatos', '.section-inner'),
              sound: sectionMetric('.sound', '.sound-panel'),
              booking: sectionMetric('#booking', '.section-inner')
            },
            sceneCoverage: {
              hero: box('#inicio .scene-media'),
              manifesto: box('#manifiesto .scene-media'),
              ritual: box('#ritual .scene-media'),
              sound: box('.sound-panel .scene-media'),
              booking: box('#booking .scene-media')
            },
            leftPerformer: box('.performer--left'),
            rightPerformer: box('.performer--right')
          };
        }""")
        for section_name in ['main', 'hero', 'manifesto', 'ritual', 'formats', 'sound', 'soundPanel', 'booking']:
            assert abs(layout_geometry[section_name]['width'] - width) <= 1.5, {
                'width': width, 'section': section_name, 'geometry': layout_geometry
            }
        for content_name in ['manifestoContent', 'ritualContent', 'formatsContent', 'bookingContent', 'soundContent']:
            content_width = layout_geometry[content_name]['width']
            assert content_width > 0 and content_width <= width, {
                'width': width, 'content': content_name, 'geometry': layout_geometry
            }
            if width >= 1024:
                assert content_width >= width * .65, {
                    'width': width, 'content': content_name, 'geometry': layout_geometry
                }
        for section_name, metrics in layout_geometry['sectionHeights'].items():
            assert metrics['height'] >= metrics['viewportHeight'] - 1.5, {
                'width': width, 'section': section_name, 'metrics': metrics
            }
            assert abs(metrics['height'] - metrics['expectedHeight']) <= 2.5, {
                'width': width, 'section': section_name, 'metrics': metrics
            }
            assert metrics['verticalOverflow'] <= 1.5, {
                'width': width, 'section': section_name, 'metrics': metrics
            }
        for scene_name, scene_box in layout_geometry['sceneCoverage'].items():
            # Sound artwork sits inside a bordered panel; compare against the
            # panel's border box, not the outer section's additional border.
            section_key = 'soundPanel' if scene_name == 'sound' else scene_name
            section_box = layout_geometry[section_key]
            assert abs(scene_box['height'] - section_box['height']) <= 2.5, {
                'width': width, 'scene': scene_name, 'sceneBox': scene_box, 'sectionBox': section_box
            }
        if width >= 1181:
            assert layout_geometry['leftPerformer']['right'] <= layout_geometry['manifestoContent']['x'] + 2, layout_geometry
            assert layout_geometry['rightPerformer']['x'] >= layout_geometry['manifestoContent']['right'] - 8, layout_geometry
        data['layoutGeometry'] = layout_geometry
        assert not errors, data
        assert data['revealCount'] == reveal_count, data
        assert data['performerImagesAreDataUri'], data
        assert data['performerStates'] and data['performerStates']['left']['effectiveState'] == 'dancing', data
        assert len(data['performerImages']) == 2 and all(image['width'] > 0 and image['height'] > 0 for image in data['performerImages']), data
        assert len(data['images']) == 8, data
        controller_result = page.evaluate("""() => {
          const api = window.MonjesPerformers;
          const element = document.querySelector('[data-performer=\"left\"]');
          const image = element.querySelector('img');
          const poster = image.dataset.posterSrc;
          const animation = image.dataset.animationSrc;
          api.setState('left', 'paused');
          const paused = image.getAttribute('src') === poster && api.getEffectiveState('left') === 'paused';
          api.setState('left', 'dancing');
          const dancing = (image.getAttribute('src') === animation || image.getAttribute('src') === image.dataset.animationFallbackSrc) && api.getEffectiveState('left') === 'dancing';
          api.setState('left', 'hidden');
          const hidden = element.hidden && api.getState('left') === 'hidden';
          api.setState('left', 'visible');
          const restored = !element.hidden && api.getState('left') === 'dancing';
          return { paused, dancing, hidden, restored };
        }""")
        assert all(controller_result.values()), controller_result

        # Settings panel is opened by the monk and by its persistent access button.
        settings_result = page.evaluate("""() => {
          const api = window.MonjesPerformers;
          const panel = document.querySelector('#performer-settings');
          const monk = document.querySelector('[data-performer="left"]');
          const toggle = document.querySelector('.performer-settings-toggle');
          monk.click();
          const openedFromMonk = !panel.hidden && toggle.getAttribute('aria-expanded') === 'true';
          const dance = panel.querySelector('[data-performer-action="dance"]');
          dance.click();
          const paused = window.MonjesPerformers.getEffectiveState('left') === 'paused';
          dance.click();
          const resumed = window.MonjesPerformers.getEffectiveState('left') === 'dancing';
          const visibility = panel.querySelector('[data-performer-action="visibility"]');
          visibility.click();
          const hidden = window.MonjesPerformers.getState('left') === 'hidden' && window.MonjesPerformers.getState('right') === 'hidden';
          visibility.click();
          const restored = window.MonjesPerformers.getState('left') !== 'hidden' && window.MonjesPerformers.getState('right') !== 'hidden';
          api.hideAll();
          api.playAll();
          const hiddenPreserved = api.getState('left') === 'hidden' && api.getState('right') === 'hidden';
          api.showAll();
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const closed = panel.hidden && toggle.getAttribute('aria-expanded') === 'false';
          return { openedFromMonk, paused, resumed, hidden, restored, hiddenPreserved, closed };
        }""")
        assert all(settings_result.values()), settings_result
        if width == 1440:
            page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
            page.wait_for_timeout(100)
            page.locator('.performer-settings-toggle').click()
            page.screenshot(path=str(ROOT / 'docs' / 'phase5-settings-panel.jpg'), type='jpeg', quality=92, full_page=False)
            page.keyboard.press('Escape')

        if width <= 640:
            assert data['framePosition'] == 'fixed', data
            assert all(image['width'] == 1080 and image['height'] == 1920 for image in data['images']), data
            button = page.locator('.menu-toggle')
            button.click()
            assert button.get_attribute('aria-expanded') == 'true'
            assert page.locator('#mobile-menu').is_visible()
            last_menu_link = page.locator('#mobile-menu a[href="#booking"]')
            last_menu_link.scroll_into_view_if_needed()
            menu_geometry = page.evaluate("""() => {
              const menu = document.querySelector('#mobile-menu');
              const link = menu.querySelector('a[href="#booking"]');
              const menuRect = menu.getBoundingClientRect();
              const linkRect = link.getBoundingClientRect();
              return {
                menuTop: menuRect.top,
                menuBottom: menuRect.bottom,
                menuHeight: menuRect.height,
                menuScrollHeight: menu.scrollHeight,
                menuClientHeight: menu.clientHeight,
                linkTop: linkRect.top,
                linkBottom: linkRect.bottom
              };
            }""")
            assert menu_geometry['menuTop'] >= -1 and menu_geometry['menuBottom'] <= height + 1, {
                'width': width, 'height': height, 'menu': menu_geometry
            }
            assert menu_geometry['linkTop'] >= menu_geometry['menuTop'] - 1
            assert menu_geometry['linkBottom'] <= menu_geometry['menuBottom'] + 1
            last_menu_link.click()
            assert button.get_attribute('aria-expanded') == 'false'
        else:
            assert data['framePosition'] == 'fixed', data
            assert all(image['width'] > image['height'] for image in data['images']), data

        if width == 2048:
            page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' }); if (document.activeElement instanceof HTMLElement) document.activeElement.blur()")
            page.wait_for_timeout(100)
            page.screenshot(path=str(ROOT / 'docs' / 'final-layout-preview-2048.jpg'), type='jpeg', quality=90, full_page=False)
        if width == 1440:
            fixed_before = page.locator('.performer--left').bounding_box()['y']
            page.evaluate("window.scrollTo({ top: 1350, behavior: 'instant' })")
            page.wait_for_timeout(100)
            fixed_after = page.locator('.performer--left').bounding_box()['y']
            assert abs(fixed_after - fixed_before) < 1.5, {'before': fixed_before, 'after': fixed_after}
            page.screenshot(path=str(ROOT / 'docs' / 'phase4-performers-scrolled.jpg'), type='jpeg', quality=90, full_page=False)

        page.evaluate("document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0, 0)")
        page.wait_for_timeout(100)
        page.screenshot(path=str(ROOT / 'docs' / f'phase4-preview-{width}.jpg'), type='jpeg', quality=88, full_page=True, timeout=30000)

    print('browser-check: reduced-motion checks', flush=True)
    page.emulate_media(reduced_motion='reduce')
    motion_duration = page.evaluate("getComputedStyle(document.querySelector('.corner-light')).animationDuration")
    assert motion_duration in ('1e-05s', '0.00001s', '0.01ms', '0s'), motion_duration
    reduced_color = page.evaluate("""() => {
      const a = document.querySelector('#inicio').getBoundingClientRect();
      const b = document.querySelector('#manifiesto').getBoundingClientRect();
      const centerA = window.scrollY + a.top + a.height / 2;
      const centerB = window.scrollY + b.top + b.height / 2;
      window.scrollTo({ top: ((centerA + centerB) / 2) - (window.innerHeight * .48), behavior: 'instant' });
      return true;
    }""")
    page.wait_for_timeout(80)
    reduced_color = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ambient-primary').trim()")
    assert reduced_color in ('#6e42d8', '#633b83'), reduced_color

    print('browser-check: reduced-motion poster fallback page', flush=True)
    reduced_page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    reduced_page.emulate_media(reduced_motion='reduce')
    reduced_html = """<!doctype html><html lang="es"><body><div class="performers">
      <button data-performer="left"><img src="poster-left" data-animation-src="animation-left" data-animation-fallback-src="fallback-left" data-poster-src="poster-left"></button>
      <button data-performer="right"><img src="poster-right" data-animation-src="animation-right" data-animation-fallback-src="fallback-right" data-poster-src="poster-right"></button>
    </div></body></html>"""
    reduced_page.set_content(reduced_html, wait_until='load', timeout=15000)
    print('browser-check: reduced page loaded', flush=True)
    reduced_page.add_script_tag(content=performer_motion_source)
    print('browser-check: performer controller injected', flush=True)
    reduced_page.wait_for_function("window.MonjesPerformers && window.MonjesPerformers.getEffectiveState('left') === 'paused'", timeout=5000)
    reduced_state = reduced_page.evaluate("""() => ({
      leftState: window.MonjesPerformers.getState('left'),
      leftEffective: window.MonjesPerformers.getEffectiveState('left'),
      leftUsesPoster: document.querySelector('[data-performer=\"left\"] img').getAttribute('src') === document.querySelector('[data-performer=\"left\"] img').dataset.posterSrc,
      rightEffective: window.MonjesPerformers.getEffectiveState('right')
    })""")
    assert reduced_state['leftState'] == 'dancing' and reduced_state['leftEffective'] == 'paused' and reduced_state['leftUsesPoster'] and reduced_state['rightEffective'] == 'paused', reduced_state
    reduced_page.close()
    print('browser-check: reduced-motion fallback passed', flush=True)

    print('browser-check: booking form check', flush=True)
    page.evaluate("""() => {
      Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } });
    }""")
    page.locator('select[name="eventType"]').select_option(label='Club / sala')
    print('browser-check: booking format selected', flush=True)
    page.locator('textarea[name="message"]').fill('Evento de prueba en Madrid')
    print('browser-check: booking message filled', flush=True)
    page.locator('#booking-form button[type="submit"]').click()
    print('browser-check: booking form submitted', flush=True)
    page.wait_for_timeout(250)
    form_status = page.locator('#form-status').inner_text()
    assert form_status, 'Booking form did not return status'
    results.append({'formStatus': form_status, 'reducedMotionDuration': motion_duration, 'reducedMotionPalette': reduced_color})

    print('browser-check: IntersectionObserver fallback source check', flush=True)
    assert 'IntersectionObserver' in scroll_scenes_source
    assert '.no-scroll-timeline [data-scene].scene-in-view .scene-media img' in css_source
    results.append({'fallbackSourceCheck': True})
    browser.close()
    print('browser-check: browser closed', flush=True)
    print('browser-check: Chromium closed; writing results', flush=True)

(ROOT / 'docs' / 'final-browser-results.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
print('PASS — Phase 2/3/4/5/6 Chromium checks: six viewport widths, full-bleed section geometry, eight scene images, scroll timelines, performer dance/pause/hide/restore states, reduced-motion poster fallback, mobile menu and booking form.')
