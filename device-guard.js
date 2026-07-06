// =========================================
// DEVICE GUARD — include this on every game page
// =========================================
// This is the same phone/tablet/iPad/fridge detection used on the hub
// (index.html), pulled out into its own file so every game page can
// share one source of truth instead of duplicating the logic.
//
// HOW TO INCLUDE:
//   Put this as the FIRST <script> in <head>, with no "async" or
//   "defer" attribute, so it runs and can redirect before the rest of
//   the game's assets start loading:
//
//     <script src="../device-guard.js"></script>
//
//   (Path is "../device-guard.js" because every game's HTML file sits
//   one folder below the site root, e.g. whack-a-meme/whack-a-meme.html)
//
// If a banned device is detected, this immediately redirects back to
// index.html in the root of the site, where the existing ban screen
// in script.js takes over.
// =========================================

(function () {
    function getDeviceType() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';

        // Smart fridges (Samsung Family Hub, LG InstaView ThinQ, etc.) run
        // embedded Tizen/webOS browsers. There's no single standardized UA
        // token for "this is a fridge" the way there is for phones, so this
        // is a best-effort match against the strings these panels are known
        // to expose in the wild, rather than a guaranteed catch-all.
        const isFridgeUA = /family\s*hub|smartfridge|smart\s*fridge|instaview|refrigerator/i.test(ua)
            || (/Tizen/i.test(ua) && /fridge|refrigerator|kitchen/i.test(ua));
        if (isFridgeUA) return 'fridge';

        // Modern iPadOS (13+) reports itself as "Macintosh" in the UA string,
        // so a real Mac has to be told apart from an iPad using touch support.
        // maxTouchPoints isn't always reliably populated by browser device-emulation
        // tools though (e.g. Chrome's Device Toolbar can leave it at 0 even when
        // simulating an iPad Air/Pro), so as a second, independent signal we also
        // check the screen dimensions against the known fixed CSS viewport sizes
        // Apple uses for each iPad model (checked in both orientations).
        const IPAD_VIEWPORT_SIZES = [
            [768, 1024],   // iPad Mini / older 9.7"-10.2" iPads
            [810, 1080],   // iPad (10.9", 10th gen)
            [820, 1180],   // iPad Air (10.9")
            [834, 1194],   // iPad Pro 11"
            [834, 1112],   // iPad Air (10.5")
            [1024, 1366],  // iPad Pro 12.9"
        ];
        const matchesIpadViewport = () => {
            const w = window.screen.width, h = window.screen.height;
            return IPAD_VIEWPORT_SIZES.some(([a, b]) => (w === a && h === b) || (w === b && h === a));
        };

        const isIpad = /iPad/i.test(ua)
            || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints > 1 || matchesIpadViewport()));
        if (isIpad) return 'ipad';

        const isPhoneUA = /iPhone|iPod|BlackBerry|BB10|IEMobile|Opera Mini|Windows Phone|Mobile.*Firefox/i.test(ua)
            || (/Android/i.test(ua) && /Mobile/i.test(ua));
        if (isPhoneUA) return 'phone';

        const isTabletUA = /Tablet|PlayBook|Kindle|Silk|KFAPWI/i.test(ua)
            || (/Android/i.test(ua) && !/Mobile/i.test(ua));
        if (isTabletUA) return 'tablet';

        return null;
    }

    // =========================================
    // "REQUEST DESKTOP SITE" SPOOF DETECTION
    // Desktop-mode swaps navigator.userAgent for a desktop string, so the
    // regex checks above can miss it entirely. But it can't fake how the
    // primary input actually behaves, or the device's real physical panel
    // resolution:
    //   - pointer:coarse + hover:none means the primary input is a touch
    //     finger, not a mouse/trackpad — true regardless of what the UA
    //     string claims.
    //   - window.screen.width/height is the device's real screen panel
    //     size. This is deliberately NOT window.innerWidth/innerHeight,
    //     since desktop-mode DOES distort the reported viewport — but it
    //     can't shrink the physical monitor/panel itself.
    // Both signals have to agree before this fires, so a touchscreen
    // laptop (mouse/trackpad as primary input, desktop-sized panel) won't
    // get caught by mistake.
    // =========================================
    function getSpoofedDeviceType() {
        const touchPrimary = window.matchMedia
            && window.matchMedia('(pointer: coarse)').matches
            && window.matchMedia('(hover: none)').matches;
        if (!touchPrimary) return null;

        const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
        if (!hasTouch) return null;

        const shortEdge = Math.min(window.screen.width, window.screen.height);
        const longEdge = Math.max(window.screen.width, window.screen.height);

        // Real phone/tablet panels max out well under typical monitor
        // resolutions on at least one axis.
        if (shortEdge > 1024 || longEdge > 1366) return null;

        const IPAD_VIEWPORT_SIZES = [
            [768, 1024], [810, 1080], [820, 1180],
            [834, 1194], [834, 1112], [1024, 1366],
        ];
        const isIpadSized = IPAD_VIEWPORT_SIZES.some(
            ([a, b]) => (shortEdge === a && longEdge === b) || (shortEdge === b && longEdge === a)
        );
        if (isIpadSized) return 'ipad';

        return shortEdge <= 480 ? 'phone' : 'tablet';
    }

    const deviceType = getDeviceType() || getSpoofedDeviceType();

    if (deviceType !== null) {
        // Banned device on a game page — bounce straight back to the
        // hub's ban screen instead of letting the game load at all.
        // Every game HTML file lives one folder below the site root,
        // so "../index.html" always points back to the root page.
        window.location.replace('../index.html');
    }
})();
