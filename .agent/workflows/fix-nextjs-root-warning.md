---
description: Fix Next.js Workspace Root Warning
---

This workflow fixes the "Next.js inferred your workspace root" warning by explicitly setting the `turbopack.root` in the Next.js configuration.

1. Open `frontend/next.config.ts`.
2. Add `import path from "path";` if it's not already there.
3. Update the `nextConfig` object to include the following:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      root: path.resolve(__dirname, ".."),
    },
  },
  // ... other config
};
```
4. Restart the development server in the `frontend` directory:
```bash
npm run dev
```
5. Verify that the warning is gone.
