# Saelle — 3D walk-in beauty store

A walk-through 3D store for **Saelle**, a made-up beauty brand. You start on the street at night, the doors open, and you walk in. Inside there are four sections: skincare, the fragrance bar, makeup, and hair & body. You can pick products off the shelves into a basket and pay at the counter, which shows a receipt and confetti. Prices are in ₹, and no real payment is taken.

## Run it

Open `index.html` through any static server, because textures and models are loaded with `fetch`:

```bash
cd saelle-3d-store
npx serve .        # or: python3 -m http.server 8080
```

To publish it, push this folder to GitHub Pages, Netlify or Vercel. No build step is needed to host it.

Add `?low` to the URL for the light mode, which turns off ambient occlusion and reflections. Phones pick light mode on their own.

## Edit it

The code lives in `src/`. `index.html` is built from it:

```bash
npm install
npm run build      # writes index.html (minified); DEV=1 npm run build keeps it readable
```

| File | What it holds |
| --- | --- |
| `src/data.js` | Sections, the product list (names, sizes, ₹ prices, notes) and the guided tour order |
| `src/products.js` | Every product, modelled in code: droppers, jars, pumps, perfumes, lipsticks, palettes… |
| `src/world.js` | The store: facade, street, shelves, fragrance bar, counter, vanity |
| `src/app.js` | Renderer, lights, post-processing, camera walk, basket, receipt |
| `src/kit.js` | Materials, textures and small geometry helpers |
| `src/shell.html`, `src/ui.css` | Page markup and interface styles |

## Credits

The HDRIs, PBR textures and furniture/plant models come from [Poly Haven](https://polyhaven.com) under CC0. Rendering uses [three.js](https://threejs.org) r170 and animation uses [GSAP](https://gsap.com) 3.12.5, both loaded from a CDN.
