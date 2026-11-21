# Shaikh's Sphere Enterprises — website

Plain HTML/CSS/JS. No build step. Open `index.html` in a browser.

- Contact details (phone, WhatsApp, email, address, hours, demo bar on/off): `assets/js/config.js`
- Text and sections: `index.html`
- Colours and fonts: top of `assets/css/style.css`
- Estimator numbers and WhatsApp enquiry: `assets/js/main.js`

Search for `PLACEHOLDER` to find everything that must be confirmed or replaced before handover
(phone, address, services list, sample projects and photos, brand names, AMC inclusions, service promises).
The email aaquib@shaikhssphere.com is real.

Hosting: upload the folder to any static host (Netlify Drop, Vercel, GitHub Pages, Hostinger, cPanel).

## 3D walk-in showroom (`showroom.html`)

A walk-through showroom in 3D: an evening street view, the doors open, and a guided tour runs through
three numbered aisles (split and cassette, VRF and ventilation, ducting and cold rooms). Visitors put
products in a trolley and send the list on WhatsApp from the enquiry desk.

- Products, descriptions and specs: `assets/js/showroom/data.js`
- WhatsApp number and email: `assets/js/config.js` (same file as the main site)
- Product models (drawn in code): `assets/js/showroom/products.js`; building and signs: `world.js`; camera, tour and trolley: `app.js`
- Textures, evening sky (HDRI) and some models are from Poly Haven (CC0): `assets/showroom/`
- Libraries, kept locally so no CDN is needed: three.js r170 (MIT) and GSAP 3.12 in `assets/js/vendor/`
- `showroom.html?low` forces the lighter quality used on phones; without WebGL the page opens a plain list view.

The page must be served over http(s) (any static host, or `python3 -m http.server`); opening the file
directly from disk blocks the 3D modules.
