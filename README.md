# Moodle Provisioner — frontend

React + TypeScript + Vite single-page app for the Moodle Provisioner. It talks
to the backend API under `/api`.

```bash
npm install
npm run dev      # http://127.0.0.1:5173, proxies /api to http://localhost:8000
npm run build    # dist/ — committed, and served by nginx on the servers
```

The project documentation (local, acceptance and production setup,
configuration) lives in the backend repository:
[bmbrands/theme_boost_union_test_envs → docs/](https://github.com/bmbrands/theme_boost_union_test_envs/tree/production/docs).

![Preview of the frontend](./docs/images/frontend-preview.png "Preview of the frontend")
