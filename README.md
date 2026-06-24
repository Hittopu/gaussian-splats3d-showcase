# GaussianSplats3D Showcase

Local GitHub Pages-ready viewer for the HITSZ main building and rocket 3DGS demos.

```bash
cd /Users/zhuangzhuangjia/Documents/HC_for/HC_for_3dgs/demos/gaussian_splats3d_showcase
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:8788/
```

Controls:

- `1` / `2`: switch between main building and rocket
- drag: orbit
- mouse wheel: zoom
- `F` or Walk button: first-person mode
- click canvas in Walk mode, then use `WASD`; `Space` ascends, `Control` or `Z` descends, `Shift` sprints
- `R`: reset camera

This viewer uses `@mkkellogg/gaussian-splats-3d` and local `.splat` assets.

## GitHub Pages

This project is already GitHub Pages-ready.

If this folder is used as the repository root:

1. Push it to a GitHub repo.
2. Go to `Settings -> Pages`.
3. Set `Build and deployment` to `GitHub Actions`.
4. The included `.github/workflows/deploy.yml` will build `dist/` and publish it.

For a project page such as `https://USER.github.io/REPO/`, no path edit is normally needed because Vite builds with relative asset paths. If you want an explicit base path, build with:

```bash
GITHUB_PAGES_BASE=/REPO/ npm run build
```
