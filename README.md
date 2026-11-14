# Radhakrishna Lodge: static website

A single-page website for Radhakrishna Lodge, Kakinada. It is plain HTML, CSS and JavaScript: there is no server, no database and nothing to install. Fonts and photos are included in the folder, so the site makes no third-party requests.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub, for example `radhakrishna-lodge`.
2. Upload **the contents of this folder** (not the folder itself), so that `index.html` is at the top level of the repository. Include the `.nojekyll` file.
3. In the repository, open **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After a minute the site is live at `https://<your-username>.github.io/radhakrishna-lodge/`.

To use your own domain, add it under **Settings → Pages → Custom domain** and follow GitHub's DNS instructions.

To preview on your computer, open `index.html` in a browser.

## Change the details

| What | Where |
|---|---|
| Rates used by the estimate, and the WhatsApp number | Top of `assets/js/main.js` (`RATES`, `WHATSAPP_NUMBER`) |
| Rates and phone numbers shown on the page | `index.html` (search for `1,700`, `1,500`, `300`, `2375036`, `97097`) |
| Photos | Replace files in `assets/photos/` (keep the same names), or edit the `<figure>` list in the gallery section of `index.html` |
| Colours and fonts | Variables at the top of `assets/css/style.css` |

## What the 3D parts are

- **Hero sea:** tide lines drawn with WebGL. It pauses when off screen, shows a still frame if the visitor has "reduce motion" switched on, and falls back to a plain background where WebGL is unavailable.
- **Photo ring:** a CSS 3D carousel. Drag, swipe, or use the arrow buttons or keyboard arrows. Without JavaScript it becomes a swipeable strip.
- **Tariff cards and hero photos:** tilt toward the mouse on desktop.
